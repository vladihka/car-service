/**
 * Push провайдер для уведомлений
 * Production-ready Web Push с VAPID и Mock провайдер
 */

import logger from '../../utils/logger';
import config from '../../config/env';
import { WebPushProvider } from './webpush.provider';

export interface PushProvider {
  send(params: {
    token: string; // Для обратной совместимости, в WebPush это будет endpoint
    title: string;
    body: string;
    data?: { [key: string]: any };
  }): Promise<{ messageId: string }>;
}

/**
 * Production-ready Web Push провайдер с VAPID
 */
export class ProductionPushProvider implements PushProvider {
  private webPushProvider: WebPushProvider;

  constructor() {
    this.webPushProvider = new WebPushProvider();
  }

  async send(params: { 
    token: string; 
    title: string; 
    body: string; 
    data?: { [key: string]: any };
    subscription?: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    };
  }): Promise<{ messageId: string }> {
    // Если передан subscription, используем его
    // Иначе пытаемся использовать token как endpoint (для обратной совместимости)
    if (params.subscription) {
      const result = await this.webPushProvider.send(
        params.subscription,
        {
          title: params.title,
          body: params.body,
          data: params.data,
        }
      );

      if (result.success && result.messageId) {
        return { messageId: result.messageId };
      } else {
        throw new Error(result.error || 'Failed to send push notification');
      }
    } else {
      // Fallback для обратной совместимости (не рекомендуется)
      logger.warn('[ProductionPushProvider] Using token as endpoint (deprecated)');
      throw new Error('Subscription object is required for Web Push');
    }
  }
}

/**
 * Mock push провайдер (для разработки и тестов)
 */
export class MockPushProvider implements PushProvider {
  async send(params: { token: string; title: string; body: string; data?: { [key: string]: any } }): Promise<{ messageId: string }> {
    logger.info(`[MockPushProvider] Sending push to token ${params.token.substring(0, 10)}...`, {
      title: params.title,
      body: params.body,
    });
    
    // Имитация задержки
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      messageId: `push-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

/**
 * Firebase Cloud Messaging провайдер (подготовка)
 * Раскомментировать и настроить при интеграции FCM
 */
/*
import admin from 'firebase-admin';

export class FCMProvider implements PushProvider {
  private app: admin.app.App;

  constructor(serviceAccount: any) {
    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      this.app = admin.app();
    }
  }

  async send(params: { token: string; title: string; body: string; data?: { [key: string]: any } }): Promise<{ messageId: string }> {
    const message = {
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data || {},
      token: params.token,
    };

    const response = await admin.messaging().send(message);
    return {
      messageId: response,
    };
  }
}
*/
