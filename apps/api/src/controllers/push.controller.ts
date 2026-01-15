/**
 * Контроллер для Web Push уведомлений
 * Обработка HTTP запросов для подписки и отправки push уведомлений
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import pushNotificationService from '../services/push-notification.service';
import {
  SubscribePushDto,
  UnsubscribePushDto,
  TestPushDto,
  PushSubscriptionResponse,
  PushSendResultResponse,
} from '../types/push.dto';
import { UserRole } from '../types';
import { ForbiddenError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

export class PushController {
  /**
   * GET /api/v1/push/vapid-public-key
   * Получить публичный VAPID ключ
   * Доступ: все аутентифицированные пользователи
   */
  async getVapidPublicKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const publicKey = pushNotificationService.getVapidPublicKey();

      res.status(200).json({
        success: true,
        data: {
          publicKey,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/push/subscribe
   * Подписаться на push уведомления
   * Доступ: все аутентифицированные пользователи
   */
  async subscribe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: SubscribePushDto = req.body;
      const subscription = await pushNotificationService.subscribe(data, req.user);

      const response: PushSubscriptionResponse = {
        id: subscription._id.toString(),
        userId: subscription.userId.toString(),
        organizationId: subscription.organizationId?.toString(),
        endpoint: subscription.endpoint,
        deviceInfo: subscription.deviceInfo,
        isActive: subscription.isActive,
        lastSentAt: subscription.lastSentAt,
        failureCount: subscription.failureCount,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      };

      res.status(201).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/push/unsubscribe
   * Отписаться от push уведомлений
   * Доступ: все аутентифицированные пользователи (только свои подписки)
   */
  async unsubscribe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: UnsubscribePushDto = req.body;
      await pushNotificationService.unsubscribe(data.endpoint, req.user);

      res.status(200).json({
        success: true,
        message: 'Отписка от push уведомлений выполнена успешно',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/push/test
   * Отправить тестовое push уведомление
   * Доступ: Manager, Owner, SuperAdmin
   */
  async sendTest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ForbiddenError('Требуется аутентификация');
      }

      // Только Manager, Owner, SuperAdmin могут отправлять тестовые уведомления
      if (
        req.user.role !== UserRole.MANAGER &&
        req.user.role !== UserRole.OWNER &&
        req.user.role !== UserRole.SUPER_ADMIN
      ) {
        throw new ForbiddenError('Недостаточно прав для отправки тестовых push уведомлений');
      }

      const data: TestPushDto = req.body;

      // Отправить тестовое уведомление себе
      const result = await pushNotificationService.sendToUser(
        req.user.userId,
        {
          title: data.title,
          body: data.body,
          data: data.data,
          icon: data.icon,
          badge: data.badge,
          image: data.image,
          url: data.url,
          tag: data.tag,
          requireInteraction: data.requireInteraction,
        },
        req.user.organizationId
      );

      const response: PushSendResultResponse = {
        sent: result.sent,
        failed: result.failed,
        total: result.sent + result.failed,
      };

      res.status(200).json({
        success: true,
        data: response,
        message: `Тестовое push уведомление отправлено: ${result.sent} успешно, ${result.failed} провалено`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/push/subscriptions
   * Получить все подписки пользователя
   * Доступ: все аутентифицированные пользователи (только свои подписки)
   */
  async getSubscriptions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ForbiddenError('Требуется аутентификация');
      }

      const userId = req.query.userId as string || req.user.userId;

      // Проверить права доступа
      if (
        req.user.role !== UserRole.OWNER &&
        req.user.role !== UserRole.SUPER_ADMIN &&
        req.user.userId !== userId
      ) {
        throw new ForbiddenError('Нет доступа к подпискам этого пользователя');
      }

      const subscriptions = await pushNotificationService.getUserSubscriptions(userId, req.user);

      const response: PushSubscriptionResponse[] = subscriptions.map((sub) => ({
        id: sub._id.toString(),
        userId: sub.userId.toString(),
        organizationId: sub.organizationId?.toString(),
        endpoint: sub.endpoint,
        deviceInfo: sub.deviceInfo,
        isActive: sub.isActive,
        lastSentAt: sub.lastSentAt,
        failureCount: sub.failureCount,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      }));

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PushController();
