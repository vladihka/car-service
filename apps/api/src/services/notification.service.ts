/**
 * Сервис для работы с уведомлениями
 * Реализует бизнес-логику для отправки и управления уведомлениями
 */

import Notification, { INotification } from '../models/Notification';
import NotificationLog from '../models/NotificationLog';
import User from '../models/User';
import Client from '../models/Client';
import Appointment from '../models/Appointment';
import Car from '../models/Car';
import WorkOrder from '../models/WorkOrder';
import Invoice from '../models/Invoice';
import Branch from '../models/Branch';
import templateService from './template.service';
import emailTemplateService from './email-template.service';
import { ProductionEmailProvider, MockEmailProvider, EmailProvider } from './notification-providers/email.provider';
import config from '../config/env';
import { ProductionPushProvider, MockPushProvider, PushProvider } from './notification-providers/push.provider';
import pushNotificationService from './push-notification.service';
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
    // Инициализация провайдеров
    // Используем ProductionEmailProvider если email включен, иначе MockEmailProvider
    if (config.email.enabled) {
      this.emailProvider = new ProductionEmailProvider();
      logger.info('[NotificationService] Using ProductionEmailProvider (Nodemailer)');
    } else {
      this.emailProvider = new MockEmailProvider();
      logger.info('[NotificationService] Using MockEmailProvider (email disabled)');
    }

    // Инициализация push провайдера
    if (config.push.enabled) {
      this.pushProvider = new ProductionPushProvider();
      logger.info('[NotificationService] Using ProductionPushProvider (Web Push)');
    } else {
      this.pushProvider = new MockPushProvider();
      logger.info('[NotificationService] Using MockPushProvider (push disabled)');
    }
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
    
    // Для email канала используем email-template.service с Handlebars
    if (channel === NotificationChannel.EMAIL) {
      // Использовать email шаблоны с Handlebars
      title = template?.subject || this.getDefaultTitle(event.type);
      const htmlContent = emailTemplateService.render(event.type, {
        ...variables,
        subject: title,
      });
      message = htmlContent;
    } else if (template) {
      // Для других каналов используем обычные шаблоны
      title = templateService.renderTemplate(template.title, variables);
      message = templateService.renderTemplate(template.bodyText, variables);
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
   * Получает связанные данные из моделей для заполнения шаблонов
   */
  private async prepareVariables(event: DomainEvent): Promise<{ [key: string]: any }> {
    const variables: { [key: string]: any } = { ...event.data };

    // Получить пользователя (получатель уведомления)
    const user = await User.findById(event.userId);
    if (user) {
      variables.userName = `${user.firstName} ${user.lastName}`;
      variables.userEmail = user.email;
      variables.clientName = `${user.firstName} ${user.lastName}`; // Для совместимости с шаблонами
    }

    // Получить клиента, если есть clientId в данных
    if (event.data.clientId) {
      const client = await Client.findById(event.data.clientId);
      if (client) {
        variables.clientName = `${client.firstName} ${client.lastName}`;
        variables.clientEmail = client.email;
        variables.clientPhone = client.phone;
      }
    }

    // Получить запись (appointment), если есть appointmentId
    if (event.data.appointmentId) {
      const appointment = await Appointment.findById(event.data.appointmentId)
        .populate('clientId', 'firstName lastName email')
        .populate('services', 'name')
        .populate('assignedMechanicId', 'firstName lastName');
      
      if (appointment) {
        variables.appointmentDate = new Date(appointment.preferredDate).toLocaleString('ru-RU');
        variables.serviceName = (appointment.services as any[]).map((s: any) => s.name).join(', ');
        
        if (appointment.clientId) {
          const client = appointment.clientId as any;
          variables.clientName = `${client.firstName} ${client.lastName}`;
        }
      }
    }

    // Получить автомобиль, если есть carId
    if (event.data.carId) {
      const car = await Car.findById(event.data.carId);
      if (car) {
        variables.carMake = car.make;
        variables.carModel = car.model;
        variables.carYear = car.year;
        variables.carVin = car.vin;
        variables.carLicensePlate = car.licensePlate;
      }
    }

    // Получить заказ (work order), если есть workOrderId
    if (event.data.workOrderId) {
      const workOrder = await WorkOrder.findById(event.data.workOrderId)
        .populate('carId', 'make model year');
      
      if (workOrder) {
        variables.workOrderNumber = workOrder.workOrderNumber;
        variables.workOrderStatus = workOrder.status;
        
        if (workOrder.carId) {
          const car = workOrder.carId as any;
          variables.carMake = car.make;
          variables.carModel = car.model;
          variables.carYear = car.year;
        }
      }
    }

    // Получить счет, если есть invoiceId
    if (event.data.invoiceId) {
      const invoice = await Invoice.findById(event.data.invoiceId);
      if (invoice) {
        variables.invoiceNumber = invoice.invoiceNumber;
        variables.invoiceDate = invoice.createdAt.toLocaleDateString('ru-RU');
        variables.totalAmount = invoice.total;
        variables.currency = invoice.currency || 'USD';
        variables.dueDate = invoice.dueDate ? invoice.dueDate.toLocaleDateString('ru-RU') : undefined;
      }
    }

    // Получить филиал, если есть branchId
    if (event.branchId) {
      const branch = await Branch.findById(event.branchId);
      if (branch) {
        variables.branchName = branch.name;
        variables.branchAddress = branch.address ? `${branch.address.street}, ${branch.address.city}` : undefined;
      }
    }

    // Форматирование дат и сумм
    if (event.data.appointmentDate) {
      variables.appointmentDate = new Date(event.data.appointmentDate).toLocaleString('ru-RU');
    }
    if (event.data.paymentDate) {
      variables.paymentDate = new Date(event.data.paymentDate).toLocaleDateString('ru-RU');
    }
    if (event.data.amount) {
      variables.amount = event.data.amount;
    }
    if (event.data.totalAmount) {
      variables.totalAmount = event.data.totalAmount;
    }
    if (event.data.currency) {
      variables.currency = event.data.currency;
    }
    if (event.data.paymentMethod) {
      variables.paymentMethod = event.data.paymentMethod;
    }
    if (event.data.oldStatus) {
      variables.oldStatus = event.data.oldStatus;
    }
    if (event.data.newStatus) {
      variables.newStatus = event.data.newStatus;
    }
    if (event.data.notes) {
      variables.notes = event.data.notes;
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
          if (!user.email) {
            throw new Error(`User ${user._id} does not have an email address`);
          }
          
          // Генерация текстовой версии из HTML
          const textVersion = emailTemplateService.renderText(notification.message);
          
          result = await this.emailProvider.send({
            to: user.email,
            subject: notification.title,
            html: notification.message,
            text: textVersion,
          });
          provider = 'nodemailer';
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
   * Отметить все уведомления пользователя как прочитанные
   */
  async markAllAsRead(user: AuthRequest['user']): Promise<{ count: number }> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter: any = { userId: new mongoose.Types.ObjectId(user.userId) };

    // Tenant фильтрация
    if (user.organizationId) {
      filter.organizationId = new mongoose.Types.ObjectId(user.organizationId);
    }

    // Обновить все непрочитанные уведомления
    const result = await Notification.updateMany(
      { ...filter, readAt: { $exists: false } },
      { $set: { readAt: new Date() } }
    );

    logger.info(`Marked ${result.modifiedCount} notifications as read for user ${user.userId}`);

    return { count: result.modifiedCount || 0 };
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
      [NotificationType.WORK_STARTED]: 'Работа над вашим заказом начата.',
      [NotificationType.WORK_FINISHED]: 'Работа над вашим заказом завершена.',
      [NotificationType.PAYMENT_CREATED]: 'Платеж по вашему счету создан.',
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
      isRead: !!notification.readAt,
      readAt: notification.readAt,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      retryCount: notification.retryCount,
      error: notification.error,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  /**
   * Унифицированный метод для отправки уведомлений
   * Поддерживает множественные каналы (in-app, email, push)
   * Fire-and-forget подход - не блокирует основной flow
   */
  async sendNotification(params: {
    userId: string;
    type: NotificationType;
    channels?: NotificationChannel[];
    payload?: { [key: string]: any };
    organizationId?: string;
    branchId?: string;
  }): Promise<void> {
    const { userId, type, channels, payload = {}, organizationId, branchId } = params;

    // Получить пользователя
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`[NotificationService] User not found: ${userId}`);
      return;
    }

    // Определить каналы доставки
    const deliveryChannels: NotificationChannel[] = channels || [
      NotificationChannel.IN_APP,
    ];

    // Добавить email канал если у пользователя есть email и он не был исключен
    if (!channels && user.email) {
      deliveryChannels.push(NotificationChannel.EMAIL);
    } else if (channels?.includes(NotificationChannel.EMAIL) && !user.email) {
      logger.warn(`[NotificationService] User ${userId} requested email notification but has no email address`);
      // Убрать email из списка каналов
      const emailIndex = deliveryChannels.indexOf(NotificationChannel.EMAIL);
      if (emailIndex > -1) {
        deliveryChannels.splice(emailIndex, 1);
      }
    }

    // Добавить push канал если есть активные подписки и push включен
    if (!channels && config.push.enabled) {
      try {
        const subscriptions = await pushNotificationService.getUserSubscriptions(
          userId,
          { userId, role: user.role, organizationId: user.organizationId } as any
        );
        if (subscriptions.length > 0) {
          deliveryChannels.push(NotificationChannel.PUSH);
        }
      } catch (error) {
        // Игнорируем ошибки при проверке подписок
        logger.debug(`Error checking push subscriptions for user ${userId}:`, error);
      }
    } else if (channels?.includes(NotificationChannel.PUSH) && (!config.push.enabled)) {
      logger.warn(`[NotificationService] User ${userId} requested push notification but push is disabled`);
      // Убрать push из списка каналов
      const pushIndex = deliveryChannels.indexOf(NotificationChannel.PUSH);
      if (pushIndex > -1) {
        deliveryChannels.splice(pushIndex, 1);
      }
    }

    // Создать Domain Event для обработки
    const domainEvent: DomainEvent = {
      type,
      organizationId,
      branchId,
      userId,
      data: payload,
      timestamp: new Date(),
    };

    // Отправить уведомления через handleDomainEvent (async, fire-and-forget)
    this.handleDomainEvent(domainEvent).catch(error => {
      logger.error(`[NotificationService] Error sending notification to user ${userId}:`, error);
    });
  }

  /**
   * Создать уведомление программно (для системных событий)
   * Внутренний метод для интеграции с другими сервисами
   */
  async createNotification(data: {
    userId: string;
    organizationId?: string;
    branchId?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: { [key: string]: any };
    channels?: NotificationChannel[];
  }): Promise<void> {
    const channels = data.channels || [NotificationChannel.IN_APP];
    
    // Для каждого канала создаем отдельное уведомление
    for (const channel of channels) {
      const notification = new Notification({
        organizationId: data.organizationId ? new mongoose.Types.ObjectId(data.organizationId) : undefined,
        branchId: data.branchId ? new mongoose.Types.ObjectId(data.branchId) : undefined,
        userId: new mongoose.Types.ObjectId(data.userId),
        type: data.type,
        channel,
        status: NotificationStatus.PENDING,
        title: data.title,
        message: data.message,
        data: data.data || {},
      });

      await notification.save();

      logger.info(`System notification created: ${notification._id} for user ${data.userId} via ${channel}`);

      // Отправить уведомление асинхронно (fire-and-forget)
      this.sendNotificationToChannel(notification).catch(error => {
        logger.error(`Error sending notification ${notification._id}:`, error);
      });
    }
  }

  /**
   * Отправить уведомление через конкретный канал (внутренний метод)
   */
  private async sendNotificationToChannel(notification: INotification): Promise<void> {
    try {
      const user = await User.findById(notification.userId);
      if (!user) {
        throw new Error(`User not found: ${notification.userId}`);
      }

      let result: { messageId: string };
      let provider = 'internal';

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          if (!user.email) {
            throw new Error(`User ${user._id} does not have an email address`);
          }
          
          // Генерация текстовой версии из HTML
          const textVersion = emailTemplateService.renderText(notification.message);
          
          result = await this.emailProvider.send({
            to: user.email,
            subject: notification.title,
            html: notification.message,
            text: textVersion,
          });
          provider = 'nodemailer';
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
        provider: notification.channel === NotificationChannel.EMAIL ? 'nodemailer' : 'push',
        error: error.message,
        retryAttempt: notification.retryCount,
        sentAt: new Date(),
      });

      // Не пробрасываем ошибку дальше, чтобы не блокировать основной flow
      // Ошибки уже залогированы в NotificationLog
    }
  }
}

export default new NotificationService();
