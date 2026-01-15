/**
 * Push Notification Service
 * Управление подписками на Web Push уведомления и отправка уведомлений
 */

import PushSubscription, { IPushSubscription } from '../models/PushSubscription';
import User from '../models/User';
import { WebPushProvider, PushSubscriptionPayload, PushNotificationPayload, PushResult } from './notification-providers/webpush.provider';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';
import config from '../config/env';

export interface SubscribePushDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    device?: string;
  };
}

export interface SendPushDto {
  title: string;
  body: string;
  data?: { [key: string]: any };
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export class PushNotificationService {
  private webPushProvider: WebPushProvider;
  private maxRetries: number;
  private maxFailureCount: number;

  constructor() {
    this.webPushProvider = new WebPushProvider();
    this.maxRetries = config.push.retryAttempts;
    this.maxFailureCount = config.push.maxFailureCount;
  }

  /**
   * Подписаться на push уведомления
   */
  async subscribe(
    data: SubscribePushDto,
    user: AuthRequest['user']
  ): Promise<IPushSubscription> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!config.push.enabled) {
      throw new BadRequestError('Push уведомления отключены');
    }

    // Проверить валидность подписки
    if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) {
      throw new BadRequestError('Невалидные данные подписки');
    }

    try {
      // Проверить, существует ли уже подписка с таким endpoint
      let subscription = await PushSubscription.findOne({
        endpoint: data.endpoint,
      });

      if (subscription) {
        // Обновить существующую подписку
        subscription.userId = new mongoose.Types.ObjectId(user.userId);
        subscription.organizationId = user.organizationId
          ? new mongoose.Types.ObjectId(user.organizationId)
          : undefined;
        subscription.keys = data.keys;
        subscription.deviceInfo = data.deviceInfo || subscription.deviceInfo;
        subscription.isActive = true;
        subscription.failureCount = 0;
        subscription.lastSentAt = undefined;

        await subscription.save();

        logger.info(`Push subscription updated: ${subscription._id} for user ${user.userId}`);
      } else {
        // Создать новую подписку
        subscription = new PushSubscription({
          userId: new mongoose.Types.ObjectId(user.userId),
          organizationId: user.organizationId
            ? new mongoose.Types.ObjectId(user.organizationId)
            : undefined,
          endpoint: data.endpoint,
          keys: data.keys,
          deviceInfo: data.deviceInfo,
          isActive: true,
          failureCount: 0,
        });

        await subscription.save();

        logger.info(`Push subscription created: ${subscription._id} for user ${user.userId}`);
      }

      return subscription;
    } catch (error: any) {
      logger.error(`Error subscribing to push notifications:`, error);
      throw new BadRequestError(`Ошибка при подписке на push уведомления: ${error.message}`);
    }
  }

  /**
   * Отписаться от push уведомлений
   */
  async unsubscribe(
    endpoint: string,
    user: AuthRequest['user']
  ): Promise<void> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const subscription = await PushSubscription.findOne({
      endpoint,
      userId: new mongoose.Types.ObjectId(user.userId),
    });

    if (!subscription) {
      throw new NotFoundError('Подписка не найдена');
    }

    // Проверить права доступа (только собственная подписка или Owner/Manager для организации)
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SUPER_ADMIN &&
      subscription.userId.toString() !== user.userId
    ) {
      throw new ForbiddenError('Нет доступа к этой подписке');
    }

    subscription.isActive = false;
    await subscription.save();

    logger.info(`Push subscription deactivated: ${subscription._id} for user ${user.userId}`);
  }

  /**
   * Отправить push уведомление конкретному пользователю
   * Отправляет на все активные устройства пользователя
   */
  async sendToUser(
    userId: string,
    payload: SendPushDto,
    organizationId?: string
  ): Promise<{ sent: number; failed: number }> {
    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    };

    if (organizationId) {
      filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    const subscriptions = await PushSubscription.find(filter);

    if (subscriptions.length === 0) {
      logger.info(`No active push subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    return this.sendToSubscriptions(subscriptions, payload);
  }

  /**
   * Отправить push уведомление всем пользователям с определенной ролью в организации
   */
  async sendToRole(
    role: UserRole,
    payload: SendPushDto,
    organizationId?: string
  ): Promise<{ sent: number; failed: number }> {
    // Найти всех пользователей с указанной ролью
    const userFilter: any = {
      role,
      isActive: true,
    };

    if (organizationId) {
      userFilter.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    const users = await User.find(userFilter).select('_id');

    if (users.length === 0) {
      logger.info(`No users found with role ${role} in organization ${organizationId || 'all'}`);
      return { sent: 0, failed: 0 };
    }

    const userIds = users.map((u) => u._id);

    // Найти все активные подписки для этих пользователей
    const subscriptionFilter: any = {
      userId: { $in: userIds },
      isActive: true,
    };

    if (organizationId) {
      subscriptionFilter.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    const subscriptions = await PushSubscription.find(subscriptionFilter);

    if (subscriptions.length === 0) {
      logger.info(`No active push subscriptions found for role ${role}`);
      return { sent: 0, failed: 0 };
    }

    return this.sendToSubscriptions(subscriptions, payload);
  }

  /**
   * Отправить push уведомление всем пользователям организации
   */
  async sendToOrganization(
    organizationId: string,
    payload: SendPushDto
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await PushSubscription.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      isActive: true,
    });

    if (subscriptions.length === 0) {
      logger.info(`No active push subscriptions found for organization ${organizationId}`);
      return { sent: 0, failed: 0 };
    }

    return this.sendToSubscriptions(subscriptions, payload);
  }

  /**
   * Отправить push уведомление на список подписок
   * Внутренний метод с retry логикой и обработкой ошибок
   */
  private async sendToSubscriptions(
    subscriptions: IPushSubscription[],
    payload: SendPushDto
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    const pushPayload: PushNotificationPayload = {
      title: payload.title,
      body: payload.body,
      data: payload.data,
      icon: payload.icon,
      badge: payload.badge,
      image: payload.image,
      url: payload.url,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
    };

    // Отправить на все подписки (можно сделать параллельно для лучшей производительности)
    const sendPromises = subscriptions.map(async (subscription) => {
      const subscriptionPayload: PushSubscriptionPayload = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      // Retry логика
      let lastError: PushResult | null = null;

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const result = await this.webPushProvider.send(subscriptionPayload, pushPayload);

          if (result.success) {
            // Успешная отправка
            subscription.lastSentAt = new Date();
            subscription.failureCount = 0;
            await subscription.save();

            sent++;
            logger.info(`Push notification sent successfully to subscription ${subscription._id}`);
            return;
          } else {
            // Ошибка отправки
            lastError = result;

            // Если подписка невалидна (410 Gone, 404 Not Found), прерываем retry
            if (result.statusCode === 410 || result.statusCode === 404) {
              logger.warn(`Push subscription ${subscription._id} is invalid (${result.statusCode}), marking as inactive`);
              
              subscription.isActive = false;
              subscription.failureCount += 1;
              await subscription.save();

              failed++;
              return;
            }

            // Для других ошибок продолжаем retry
            if (attempt < this.maxRetries) {
              const delay = 1000 * attempt; // Exponential backoff
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        } catch (error: any) {
          lastError = {
            success: false,
            error: error.message || 'Unknown error',
          };

          if (attempt < this.maxRetries) {
            const delay = 1000 * attempt;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // Все попытки провалились
      if (lastError) {
        subscription.failureCount += 1;

        // Если превышен лимит неудачных попыток, деактивировать подписку
        if (subscription.failureCount >= this.maxFailureCount) {
          subscription.isActive = false;
          logger.warn(`Push subscription ${subscription._id} deactivated after ${subscription.failureCount} failures`);
        }

        await subscription.save();
        failed++;

        logger.error(`Failed to send push notification to subscription ${subscription._id} after ${this.maxRetries} attempts:`, lastError.error);
      }
    });

    // Выполнить все отправки параллельно
    await Promise.allSettled(sendPromises);

    logger.info(`Push notifications sent: ${sent} successful, ${failed} failed out of ${subscriptions.length} total`);

    return { sent, failed };
  }

  /**
   * Получить VAPID публичный ключ
   */
  getVapidPublicKey(): string {
    return this.webPushProvider.getPublicKey();
  }

  /**
   * Очистить невалидные подписки (cron job)
   * Удаляет подписки с превышенным лимитом неудачных попыток
   */
  async cleanupInvalidSubscriptions(): Promise<number> {
    const subscriptions = await PushSubscription.find({
      isActive: false,
      failureCount: { $gte: this.maxFailureCount },
    });

    const count = subscriptions.length;

    if (count > 0) {
      await PushSubscription.deleteMany({
        _id: { $in: subscriptions.map((s) => s._id) },
      });

      logger.info(`Cleaned up ${count} invalid push subscriptions`);
    }

    return count;
  }

  /**
   * Получить все подписки пользователя
   */
  async getUserSubscriptions(
    userId: string,
    user: AuthRequest['user']
  ): Promise<IPushSubscription[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверить права доступа
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SUPER_ADMIN &&
      user.userId !== userId
    ) {
      throw new ForbiddenError('Нет доступа к подпискам этого пользователя');
    }

    return PushSubscription.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
  }
}

export default new PushNotificationService();
