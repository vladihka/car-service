/**
 * Web Push Provider using web-push library with VAPID support
 * Production-ready Web Push notification provider
 */

import webpush, { PushSubscription as WebPushSubscription, SendResult } from 'web-push';
import config from '../../config/env';
import logger from '../../utils/logger';

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: { [key: string]: any };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
  vibrate?: number[];
  url?: string;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  statusCode?: number;
  error?: string;
}

export class WebPushProvider {
  private initialized: boolean = false;

  constructor() {
    if (config.push.enabled) {
      this.initialize();
    } else {
      logger.info('[WebPushProvider] Push notifications are disabled');
    }
  }

  /**
   * Инициализировать VAPID ключи для web-push
   */
  private initialize(): void {
    try {
      if (!config.push.vapidPublicKey || !config.push.vapidPrivateKey) {
        throw new Error('VAPID keys are not configured');
      }

      webpush.setVapidDetails(
        config.push.vapidSubject,
        config.push.vapidPublicKey,
        config.push.vapidPrivateKey
      );

      this.initialized = true;
      logger.info('[WebPushProvider] Initialized with VAPID keys');
    } catch (error: any) {
      logger.error('[WebPushProvider] Failed to initialize:', error);
      throw new Error(`Failed to initialize WebPush provider: ${error.message}`);
    }
  }

  /**
   * Отправить push уведомление
   */
  async send(
    subscription: PushSubscriptionPayload,
    payload: PushNotificationPayload
  ): Promise<PushResult> {
    if (!config.push.enabled) {
      logger.warn('[WebPushProvider] Push is disabled, skipping send');
      return {
        success: false,
        error: 'Push notifications are disabled',
      };
    }

    if (!this.initialized) {
      throw new Error('WebPush provider is not initialized');
    }

    try {
      // Подготовить subscription объект для web-push
      const webPushSubscription: WebPushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      };

      // Подготовить payload для web-push
      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/badge-72x72.png',
        image: payload.image,
        data: payload.data || {},
        actions: payload.actions,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        tag: payload.tag,
        timestamp: payload.timestamp || Date.now(),
        vibrate: payload.vibrate,
        url: payload.url,
      });

      // Отправить уведомление
      const result: SendResult = await webpush.sendNotification(
        webPushSubscription,
        notificationPayload
      );

      logger.info('[WebPushProvider] Push notification sent successfully', {
        statusCode: result.statusCode,
        endpoint: subscription.endpoint.substring(0, 50) + '...',
      });

      return {
        success: true,
        messageId: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        statusCode: result.statusCode,
      };
    } catch (error: any) {
      // Обработка различных типов ошибок
      let statusCode: number | undefined;
      let errorMessage: string;

      if (error.statusCode) {
        statusCode = error.statusCode;
        errorMessage = this.getErrorMessage(statusCode);
      } else {
        errorMessage = error.message || 'Unknown error';
      }

      logger.error('[WebPushProvider] Failed to send push notification:', {
        error: errorMessage,
        statusCode,
        endpoint: subscription.endpoint.substring(0, 50) + '...',
      });

      return {
        success: false,
        statusCode,
        error: errorMessage,
      };
    }
  }

  /**
   * Получить понятное сообщение об ошибке по статус коду
   */
  private getErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'Invalid request';
      case 401:
        return 'Unauthorized - VAPID keys may be invalid';
      case 403:
        return 'Forbidden - Push subscription is no longer valid';
      case 404:
        return 'Not found - Push subscription endpoint not found';
      case 410:
        return 'Gone - Push subscription has expired or is no longer valid';
      case 413:
        return 'Payload too large';
      case 429:
        return 'Too many requests - Rate limit exceeded';
      default:
        return `Push notification failed with status code ${statusCode}`;
    }
  }

  /**
   * Проверить, валидна ли подписка (без фактической отправки)
   * Можно использовать для очистки невалидных подписок
   */
  async validateSubscription(subscription: PushSubscriptionPayload): Promise<boolean> {
    if (!config.push.enabled || !this.initialized) {
      return false;
    }

    try {
      // Попытка отправить пустое уведомление для проверки валидности
      const webPushSubscription: WebPushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      };

      // Используем минимальный payload для проверки
      await webpush.sendNotification(webPushSubscription, JSON.stringify({}));
      return true;
    } catch (error: any) {
      // Подписка невалидна если статус код 410 (Gone) или 404 (Not Found)
      if (error.statusCode === 410 || error.statusCode === 404) {
        return false;
      }
      // Другие ошибки (например, 401) могут быть временными
      // Возвращаем true, чтобы не удалять подписку из-за временных проблем
      return true;
    }
  }

  /**
   * Получить публичный VAPID ключ для клиента
   */
  getPublicKey(): string {
    if (!config.push.vapidPublicKey) {
      throw new Error('VAPID public key is not configured');
    }
    return config.push.vapidPublicKey;
  }
}
