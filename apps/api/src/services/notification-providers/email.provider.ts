/**
 * Email провайдер для уведомлений
 * Подготовка под SendGrid, SES, etc.
 */

import { NotificationType } from '../../types';
import logger from '../../utils/logger';

export interface EmailProvider {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

/**
 * Базовый email провайдер (mock для разработки)
 * В production заменяется на SendGrid, SES, etc.
 */
export class MockEmailProvider implements EmailProvider {
  async send(params: { to: string; subject: string; html: string; text: string }): Promise<{ messageId: string }> {
    // Mock реализация - в production заменить на реальный провайдер
    logger.info(`[MockEmailProvider] Sending email to ${params.to}`, {
      subject: params.subject,
    });
    
    // Имитация задержки
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

/**
 * SendGrid провайдер (подготовка)
 * Раскомментировать и настроить при интеграции SendGrid
 */
/*
import sgMail from '@sendgrid/mail';

export class SendGridProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    sgMail.setApiKey(apiKey);
  }

  async send(params: { to: string; subject: string; html: string; text: string }): Promise<{ messageId: string }> {
    const msg = {
      to: params.to,
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    const response = await sgMail.send(msg);
    return {
      messageId: response[0].headers['x-message-id'] || `sg-${Date.now()}`,
    };
  }
}
*/

/**
 * AWS SES провайдер (подготовка)
 * Раскомментировать и настроить при интеграции SES
 */
/*
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export class SESProvider implements EmailProvider {
  private client: SESClient;

  constructor(region: string = 'us-east-1') {
    this.client = new SESClient({ region });
  }

  async send(params: { to: string; subject: string; html: string; text: string }): Promise<{ messageId: string }> {
    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL || 'noreply@example.com',
      Destination: {
        ToAddresses: [params.to],
      },
      Message: {
        Subject: {
          Data: params.subject,
        },
        Body: {
          Html: {
            Data: params.html,
          },
          Text: {
            Data: params.text,
          },
        },
      },
    });

    const response = await this.client.send(command);
    return {
      messageId: response.MessageId || `ses-${Date.now()}`,
    };
  }
}
*/
