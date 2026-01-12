/**
 * Сервис для работы с уведомлениями
 * Реализует бизнес-логику для отправки и управления уведомлениями
 */

import Notification, { INotification } from '../models/Notification';
import NotificationLog from '../models/NotificationLog';
import User from '../models/User';
import Client from '../models/Client';
import templateService from './template.service';
import { MockEmailProvider, EmailProvider } from './notification-providers/email.provider';
import { MockPushProvider, PushProvider } from './notification-providers/push.provider';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import {
  NotificationQueryDto,
  NotificationResponse,
  NotificationListResponse,
  CreateNotificationDto,
  CreateTestNotificationDto,
  DomainEvent,
} from '../types/notification.dto';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  UserRole,
} from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class NotificationService {
  private emailProvider: EmailProvider;
  private pushProvider: PushProvider;
  private maxRetries = 3;

  constructor() {
    // Инициализация провайдеров (в production заменить на реальные)
    this.emailProvider = new MockEmailProvider();
    this.pushProvider = new MockPushProvider();
  }

  /**
   * Создать и отправить уведомление из Domain Event
   */
  async handleDomainEvent(event: DomainEvent): Promise<void> {
    try {
      // Получить пользователя
      const user = await User.findById(event.userId);
      if (!user) {
        logger.warn(`User not found for notification: ${event.userId}`);
        return;
      }

      // Определить каналы доставки (можно настроить через preferences пользователя)
      const channels: NotificationChannel[] = [
        NotificationChannel.IN_APP, // Всегда отправляем in-app
        NotificationChannel.EMAIL, // По умолчанию email
        // NotificationChannel.PUSH, // Если настроен push token
      ];

      // Создать уведомления для каждого канала
      for (const channel of channels) {
        await this.createNotificationFromEvent(event, channel);
      }
    } catch (error) {
      logger.error(`Error handling domain event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Создать уведомление из Domain Event
   */
  private async createNotificationFromEvent(
    event: DomainEvent,
    channel: NotificationChannel
  ): Promise<INotification> {
    // Получить шаблон
    const template = await templateService.getTemplate(
      event.type,
      channel,
      'en', // TODO: получить из preferences пользователя
      event.organizationId
    );

    // Подготовить переменные для шаблона
    const variables = await this.prepareVariables(event);

    // Получить заголовок и сообщение
    let title: string;
    let message: string;
    
    if (template) {
      title = templateService.renderTemplate(template.title, variables);
      message = channel === NotificationChannel.EMAIL
        ? templateService.renderTemplate(template.bodyHtml, variables)
        : templateService.renderTemplate(template.bodyText, variables);
    } else {
      // Fallback на простые шаблоны
      title = this.getDefaultTitle(event.type);
      message = this.getDefaultMessage(event.type, variables);
    }

    // Создать уведомление
    const notification = new Notification({
      organizationId: event.organizationId ? new mongoose.Types.ObjectId(event.organizationId) : undefined,
      branchId: event.branchId ? new mongoose.Types.ObjectId(event.branchId) : undefined,
      userId: new mongoose.Types.ObjectId(event.userId),
      type: event.type,
      channel,
      status: NotificationStatus.PENDING,
      title,
      message,
      data: event.data,
    });

    await notification.save();

    // Отправить уведомление асинхронно (можно добавить в очередь)
    this.sendNotification(notification).catch(error => {
      logger.error(`Error sending notification ${notification._id}:`, error);
    });

    return notification;
  }

  /**
   * Подготовить переменные для шаблона из события
   */
  private async prepareVariables(event: DomainEvent): Promise<{ [key: string]: any }> {
    const variables: { [key: string]: any } = { ...event.data };

    // Получить пользователя
    const user = await User.findById(event.userId);
    if (user) {
      variables.userName = `${user.firstName} ${user.lastName}`;
      variables.userEmail = user.email;
    }

    // Добавить общие переменные
    variables.organizationId = event.organizationId;
    variables.branchId = event.branchId;

    return variables;
  }

  /**
   * Отправить уведомление
   */
  async sendNotification(notification: INotification): Promise<void> {
    try {
      const user = await User.findById(notification.userId);
      if (!user) {
        throw new Error(`User not found: ${notification.userId}`);
      }

      let result: { messageId: string };
      let provider = 'internal';

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          result = await this.emailProvider.send({
            to: user.email,
            subject: notification.title,
            html: notification.message,
            text: notification.message.replace(/<[^>]*>/g, ''), // Strip HTML
          });
          provider = 'email';
          break;

        case NotificationChannel.PUSH:
          // TODO: получить push token из User preferences
          const pushToken = (user as any).pushToken || 'mock-token';
          result = await this.pushProvider.send({
            token: pushToken,
            title: notification.title,
            body: notification.message,
            data: notification.data,
          });
          provider = 'push';
          break;

        case NotificationChannel.IN_APP:
          // In-app уведомления сохраняются в БД, отправка не требуется
          result = { messageId: `in-app-${notification._id}` };
          provider = 'in-app';
          break;

        default:
          throw new Error(`Unknown channel: ${notification.channel}`);
      }

      // Обновить статус уведомления
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await notification.save();

      // Создать лог
      await NotificationLog.create({
        notificationId: notification._id,
        organizationId: notification.organizationId,
        userId: notification.userId,
        type: notification.type,
        channel: notification.channel,
        status: NotificationStatus.SENT,
        provider,
        providerMessageId: result.messageId,
        retryAttempt: notification.retryCount,
        sentAt: new Date(),
      });

      logger.info(`Notification sent: ${notification._id} via ${provider}`);
    } catch (error: any) {
      logger.error(`Error sending notification ${notification._id}:`, error);

      // Обновить статус и счетчик повторов
      notification.retryCount += 1;
      notification.error = error.message;

      if (notification.retryCount >= this.maxRetries) {
        notification.status = NotificationStatus.FAILED;
      }

      await notification.save();

      // Создать лог ошибки
      await NotificationLog.create({
        notificationId: notification._id,
        organizationId: notification.organizationId,
        userId: notification.userId,
        type: notification.type,
        channel: notification.channel,
        status: NotificationStatus.FAILED,
        provider: notification.channel === NotificationChannel.EMAIL ? 'email' : 'push',
        error: error.message,
        retryAttempt: notification.retryCount,
        sentAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Получить список уведомлений
   */
  async findAll(query: NotificationQueryDto, user: AuthRequest['user']): Promise<NotificationListResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter: any = { userId: new mongoose.Types.ObjectId(user.userId) };

    // Client видит только свои уведомления
    // Mechanic видит только связанные с его заказами (фильтрация через data.workOrderId)
    if (user.role === UserRole.CLIENT || user.role === UserRole.MECHANIC) {
      // Фильтр уже установлен по userId
    } else {
      // Manager/Owner видят все в своей организации
      filter.organizationId = user.organizationId
        ? new mongoose.Types.ObjectId(user.organizationId)
        : undefined;
    }

    // Применить дополнительные фильтры
    if (query.status) {
      filter.status = query.status;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.channel) {
      filter.channel = query.channel;
    }
    if (query.read !== undefined) {
      if (query.read) {
        filter.readAt = { $exists: true };
      } else {
        filter.readAt = { $exists: false };
      }
    }

    // Пагинация
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Получить уведомления
    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return {
      data: notifications.map(n => this.mapToResponse(n as INotification)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получить уведомление по ID
   */
  async findById(id: string, user: AuthRequest['user']): Promise<NotificationResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Уведомление не найдено');
    }

    const filter: any = { _id: new mongoose.Types.ObjectId(id) };

    // Client видит только свои уведомления
    if (user.role === UserRole.CLIENT || user.role === UserRole.MECHANIC) {
      filter.userId = new mongoose.Types.ObjectId(user.userId);
    } else {
      // Manager/Owner видят все в своей организации
      filter.organizationId = user.organizationId
        ? new mongoose.Types.ObjectId(user.organizationId)
        : undefined;
    }

    const notification = await Notification.findOne(filter);
    if (!notification) {
      throw new NotFoundError('Уведомление не найдено');
    }

    return this.mapToResponse(notification);
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(id: string, user: AuthRequest['user']): Promise<NotificationResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Уведомление не найдено');
    }

    const filter: any = { _id: new mongoose.Types.ObjectId(id) };

    // Client видит только свои уведомления
    if (user.role === UserRole.CLIENT || user.role === UserRole.MECHANIC) {
      filter.userId = new mongoose.Types.ObjectId(user.userId);
    } else {
      // Manager/Owner видят все в своей организации
      filter.organizationId = user.organizationId
        ? new mongoose.Types.ObjectId(user.organizationId)
        : undefined;
    }

    const notification = await Notification.findOne(filter);
    if (!notification) {
      throw new NotFoundError('Уведомление не найдено');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }

    return this.mapToResponse(notification);
  }

  /**
   * Создать уведомление
   * Manager/Owner может создавать уведомления для пользователей своей организации
   * 
   * @param data - Данные для создания уведомления
   * @param user - Пользователь, создающий уведомление
   * @returns Созданное уведомление
   */
  async create(data: CreateNotificationDto, user: AuthRequest['user']): Promise<NotificationResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager, Owner и SuperAdmin могут создавать уведомления
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания уведомления');
    }
    
    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }
    
    // Проверить, что пользователь существует и принадлежит организации
    const targetUser = await User.findById(data.userId);
    if (!targetUser) {
      throw new NotFoundError('Пользователь не найден');
    }
    
    // Проверить, что пользователь принадлежит организации (для Manager/Owner)
    if (user.role !== UserRole.SUPER_ADMIN) {
      if (!targetUser.organizationId || targetUser.organizationId.toString() !== user.organizationId) {
        throw new ForbiddenError('Пользователь не принадлежит вашей организации');
      }
    }
    
    // Создать уведомление
    const notification = new Notification({
      organizationId: user.organizationId ? new mongoose.Types.ObjectId(user.organizationId) : undefined,
      branchId: user.branchId ? new mongoose.Types.ObjectId(user.branchId) : undefined,
      userId: new mongoose.Types.ObjectId(data.userId),
      type: data.type,
      channel: data.channel || NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
      title: data.title.trim(),
      message: data.message.trim(),
      data: data.data || {},
    });
    
    await notification.save();
    
    logger.info(`Notification created: ${notification._id} for user ${data.userId} by ${user.userId}`);
    
    // Отправить уведомление асинхронно (можно добавить в очередь)
    this.sendNotification(notification).catch(error => {
      logger.error(`Error sending notification ${notification._id}:`, error);
    });
    
    return this.mapToResponse(notification);
  }

  /**
   * Создать тестовое уведомление
   */
  async createTestNotification(data: CreateTestNotificationDto, user: AuthRequest['user']): Promise<NotificationResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Manager, Owner, SuperAdmin могут создавать тестовые уведомления
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания тестовых уведомлений');
    }

    const targetUserId = data.userId ? new mongoose.Types.ObjectId(data.userId) : new mongoose.Types.ObjectId(user.userId);

    const notification = new Notification({
      organizationId: user.organizationId ? new mongoose.Types.ObjectId(user.organizationId) : undefined,
      branchId: user.branchId ? new mongoose.Types.ObjectId(user.branchId) : undefined,
      userId: targetUserId,
      type: data.type,
      channel: data.channel,
      status: NotificationStatus.PENDING,
      title: data.title,
      message: data.message,
    });

    await notification.save();

    // Отправить уведомление
    await this.sendNotification(notification);

    return this.mapToResponse(notification);
  }

  /**
   * Получить заголовок по умолчанию
   */
  private getDefaultTitle(type: NotificationType): string {
    const titles: { [key in NotificationType]: string } = {
      [NotificationType.APPOINTMENT_CREATED]: 'Запись создана',
      [NotificationType.APPOINTMENT_CONFIRMED]: 'Запись подтверждена',
      [NotificationType.APPOINTMENT_CANCELLED]: 'Запись отменена',
      [NotificationType.MECHANIC_ASSIGNED]: 'Механик назначен',
      [NotificationType.WORK_ORDER_STATUS_CHANGED]: 'Статус заказа изменен',
      [NotificationType.VEHICLE_READY]: 'Автомобиль готов',
      [NotificationType.APPOINTMENT_REMINDER]: 'Напоминание о записи',
      [NotificationType.WORK_ORDER_OVERDUE]: 'Просроченный заказ',
    };
    return titles[type] || 'Уведомление';
  }

  /**
   * Получить сообщение по умолчанию
   */
  private getDefaultMessage(type: NotificationType, variables: { [key: string]: any }): string {
    const messages: { [key in NotificationType]: string } = {
      [NotificationType.APPOINTMENT_CREATED]: 'Ваша запись успешно создана.',
      [NotificationType.APPOINTMENT_CONFIRMED]: 'Ваша запись подтверждена.',
      [NotificationType.APPOINTMENT_CANCELLED]: 'Ваша запись отменена.',
      [NotificationType.MECHANIC_ASSIGNED]: 'Вам назначен механик для выполнения заказа.',
      [NotificationType.WORK_ORDER_STATUS_CHANGED]: 'Статус вашего заказа изменен.',
      [NotificationType.VEHICLE_READY]: 'Ваш автомобиль готов к выдаче.',
      [NotificationType.APPOINTMENT_REMINDER]: 'Напоминание: у вас запись через несколько часов.',
      [NotificationType.WORK_ORDER_OVERDUE]: 'Ваш заказ просрочен.',
    };
    return messages[type] || 'У вас новое уведомление.';
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(notification: INotification): NotificationResponse {
    return {
      id: notification._id.toString(),
      organizationId: notification.organizationId?.toString(),
      branchId: notification.branchId?.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      channel: notification.channel,
      status: notification.status,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      readAt: notification.readAt,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      retryCount: notification.retryCount,
      error: notification.error,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}

export default new NotificationService();
