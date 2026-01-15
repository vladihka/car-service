/**
 * Email провайдер для уведомлений
 * Production-ready реализация на базе Nodemailer
 */

import { NotificationType } from '../../types';
import logger from '../../utils/logger';
import { NodemailerProvider, EmailParams } from './nodemailer.provider';
import config from '../../config/env';

export interface EmailProvider {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

/**
 * Production-ready Email Provider на базе Nodemailer
 * Использует SMTP конфигурацию из environment variables
 */
export class ProductionEmailProvider implements EmailProvider {
  private nodemailerProvider: NodemailerProvider;

  constructor() {
    this.nodemailerProvider = new NodemailerProvider();
  }

  async send(params: { to: string; subject: string; html: string; text: string }): Promise<{ messageId: string }> {
    const emailParams: EmailParams = {
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    };

    const result = await this.nodemailerProvider.send(emailParams);
    
    return {
      messageId: result.messageId,
    };
  }
}

/**
 * Mock email провайдер (для тестов и fallback)
 */
export class MockEmailProvider implements EmailProvider {
  async send(params: { to: string; subject: string; html: string; text: string }): Promise<{ messageId: string }> {
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
