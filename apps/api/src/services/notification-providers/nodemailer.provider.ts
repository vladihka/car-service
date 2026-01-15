/**
 * Production-ready Email Provider using Nodemailer
 * Supports SMTP configuration from environment variables
 * Includes retry logic, logging, and sandbox mode
 */

import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import config from '../../config/env';
import logger from '../../utils/logger';

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export class NodemailerProvider {
  private transporter: Transporter | null = null;
  private isSandbox: boolean;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor() {
    this.isSandbox = config.email.sandbox;
    this.maxRetries = config.email.retryAttempts;
    this.retryDelayMs = config.email.retryDelayMs;

    // Инициализировать transporter только если email включен и не sandbox
    if (config.email.enabled && !this.isSandbox) {
      this.initializeTransporter();
    } else if (this.isSandbox) {
      logger.info('[EmailProvider] Running in SANDBOX mode - emails will be logged to console');
    }
  }

  /**
   * Инициализировать Nodemailer transporter
   */
  private initializeTransporter(): void {
    try {
      const smtpConfig: nodemailer.TransportOptions = {
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      };

      this.transporter = nodemailer.createTransport(smtpConfig);

      // Проверить соединение (async, не блокируем запуск)
      this.transporter.verify().then(() => {
        logger.info('[EmailProvider] SMTP connection verified successfully');
      }).catch((error) => {
        logger.error('[EmailProvider] SMTP connection verification failed:', error);
      });

      logger.info(`[EmailProvider] Initialized with ${config.email.host}:${config.email.port}`);
    } catch (error) {
      logger.error('[EmailProvider] Failed to initialize transporter:', error);
      throw new Error('Failed to initialize email transporter');
    }
  }

  /**
   * Отправить email с retry логикой и exponential backoff
   */
  async send(params: EmailParams): Promise<EmailResult> {
    if (!config.email.enabled) {
      logger.warn('[EmailProvider] Email is disabled, skipping send');
      return {
        messageId: 'disabled',
        accepted: [],
        rejected: [],
      };
    }

    // Sandbox режим - логируем вместо реальной отправки
    if (this.isSandbox) {
      return this.sendSandbox(params);
    }

    if (!this.transporter) {
      throw new Error('Email transporter is not initialized');
    }

    // Retry логика с exponential backoff
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const mailOptions: SendMailOptions = {
          from: config.email.from,
          to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
          subject: params.subject,
          html: params.html,
          text: params.text || this.stripHtml(params.html),
          cc: params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : undefined,
          bcc: params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : undefined,
          replyTo: params.replyTo,
          attachments: params.attachments,
        };

        const info = await this.transporter.sendMail(mailOptions);

        logger.info(`[EmailProvider] Email sent successfully (attempt ${attempt}/${this.maxRetries})`, {
          messageId: info.messageId,
          to: params.to,
          subject: params.subject,
        });

        return {
          messageId: info.messageId || `email-${Date.now()}`,
          accepted: info.accepted || [],
          rejected: info.rejected || [],
        };
      } catch (error: any) {
        lastError = error;
        
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        
        if (attempt < this.maxRetries) {
          logger.warn(`[EmailProvider] Send attempt ${attempt}/${this.maxRetries} failed, retrying in ${delay}ms:`, error.message);
          await this.sleep(delay);
        } else {
          logger.error(`[EmailProvider] All ${this.maxRetries} send attempts failed:`, error);
        }
      }
    }

    // Все попытки провалились
    throw new Error(`Failed to send email after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Sandbox режим - логируем вместо реальной отправки
   */
  private async sendSandbox(params: EmailParams): Promise<EmailResult> {
    const messageId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('[EmailProvider] [SANDBOX] Email would be sent:', {
      messageId,
      from: config.email.from,
      to: params.to,
      subject: params.subject,
      html: params.html.substring(0, 100) + '...',
      text: params.text ? params.text.substring(0, 100) + '...' : undefined,
    });

    // Имитация задержки
    await this.sleep(100);

    return {
      messageId,
      accepted: Array.isArray(params.to) ? params.to : [params.to],
      rejected: [],
    };
  }

  /**
   * Утилита для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Убрать HTML теги из текста
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Проверить соединение с SMTP сервером
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('[EmailProvider] Connection verification failed:', error);
      return false;
    }
  }

  /**
   * Закрыть соединение
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      logger.info('[EmailProvider] Transporter closed');
    }
  }
}
