/**
 * Email Template Service
 * Handles rendering of HTML email templates using Handlebars
 */

import * as handlebars from 'handlebars';
import { NotificationType } from '../types';
import logger from '../utils/logger';

export interface TemplateVariables {
  [key: string]: any;
}

/**
 * Базовый HTML шаблон для всех email
 */
const BASE_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #007bff;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #007bff;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #007bff;
      padding: 15px;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    table td {
      padding: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    table td:first-child {
      font-weight: bold;
      width: 40%;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Car Service</h1>
    </div>
    <div class="content">
      {{body}}
    </div>
    <div class="footer">
      <p>This is an automated message from Car Service. Please do not reply to this email.</p>
      <p>&copy; {{year}} Car Service. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * HTML шаблоны для различных типов уведомлений
 */
const EMAIL_TEMPLATES: Record<NotificationType, string> = {
  [NotificationType.APPOINTMENT_CREATED]: `
    <h2>Новая запись на обслуживание</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Ваша запись на обслуживание успешно создана.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Дата и время:</td>
          <td>{{appointmentDate}}</td>
        </tr>
        <tr>
          <td>Автомобиль:</td>
          <td>{{carMake}} {{carModel}} ({{carYear}})</td>
        </tr>
        <tr>
          <td>Услуга:</td>
          <td>{{serviceName}}</td>
        </tr>
        <tr>
          <td>Филиал:</td>
          <td>{{branchName}}</td>
        </tr>
      </table>
    </div>
    <p>Мы свяжемся с вами для подтверждения записи.</p>
  `,

  [NotificationType.APPOINTMENT_CONFIRMED]: `
    <h2>Запись подтверждена</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Ваша запись на обслуживание подтверждена.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Дата и время:</td>
          <td><strong>{{appointmentDate}}</strong></td>
        </tr>
        <tr>
          <td>Автомобиль:</td>
          <td>{{carMake}} {{carModel}}</td>
        </tr>
        <tr>
          <td>Филиал:</td>
          <td>{{branchName}}</td>
        </tr>
        <tr>
          <td>Адрес:</td>
          <td>{{branchAddress}}</td>
        </tr>
      </table>
    </div>
    <p>Ждем вас в назначенное время!</p>
  `,

  [NotificationType.WORK_ORDER_STATUS_CHANGED]: `
    <h2>Статус заказа изменен</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Статус вашего заказа на обслуживание был изменен.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Номер заказа:</td>
          <td><strong>#{{workOrderNumber}}</strong></td>
        </tr>
        <tr>
          <td>Старый статус:</td>
          <td>{{oldStatus}}</td>
        </tr>
        <tr>
          <td>Новый статус:</td>
          <td><strong>{{newStatus}}</strong></td>
        </tr>
        <tr>
          <td>Автомобиль:</td>
          <td>{{carMake}} {{carModel}}</td>
        </tr>
      </table>
    </div>
    {{#if notes}}
    <p><strong>Примечание:</strong> {{notes}}</p>
    {{/if}}
  `,

  [NotificationType.INVOICE_CREATED]: `
    <h2>Новый счет</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>По вашему заказу был создан счет.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Номер счета:</td>
          <td><strong>{{invoiceNumber}}</strong></td>
        </tr>
        <tr>
          <td>Сумма:</td>
          <td><strong>{{totalAmount}} {{currency}}</strong></td>
        </tr>
        <tr>
          <td>Дата выставления:</td>
          <td>{{invoiceDate}}</td>
        </tr>
        <tr>
          <td>Срок оплаты:</td>
          <td>{{dueDate}}</td>
        </tr>
      </table>
    </div>
    {{#if invoiceUrl}}
    <p><a href="{{invoiceUrl}}" class="button">Посмотреть счет</a></p>
    {{/if}}
  `,

  [NotificationType.PAYMENT_RECEIVED]: `
    <h2>Платеж получен</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Спасибо! Ваш платеж был успешно обработан.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Сумма платежа:</td>
          <td><strong>{{amount}} {{currency}}</strong></td>
        </tr>
        <tr>
          <td>Номер счета:</td>
          <td>{{invoiceNumber}}</td>
        </tr>
        <tr>
          <td>Дата платежа:</td>
          <td>{{paymentDate}}</td>
        </tr>
        <tr>
          <td>Способ оплаты:</td>
          <td>{{paymentMethod}}</td>
        </tr>
      </table>
    </div>
    <p>Чек отправлен на ваш email.</p>
  `,

  [NotificationType.PASSWORD_RESET]: `
    <h2>Сброс пароля</h2>
    <p>Здравствуйте, {{userName}}!</p>
    <p>Вы запросили сброс пароля для вашего аккаунта.</p>
    <p>Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
    {{#if resetUrl}}
    <p><a href="{{resetUrl}}" class="button">Сбросить пароль</a></p>
    {{/if}}
    <p>Ссылка действительна в течение {{expirationHours}} часов.</p>
    <p><strong>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</strong></p>
  `,

  // Шаблоны для других типов уведомлений
  [NotificationType.APPOINTMENT_CANCELLED]: `
    <h2>Запись отменена</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Ваша запись на обслуживание была отменена.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Дата записи:</td>
          <td>{{appointmentDate}}</td>
        </tr>
        <tr>
          <td>Причина:</td>
          <td>{{#if reason}}{{reason}}{{else}}Не указана{{/if}}</td>
        </tr>
      </table>
    </div>
  `,

  [NotificationType.MECHANIC_ASSIGNED]: `
    <h2>Механик назначен</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>К вашему заказу назначен механик.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Механик:</td>
          <td><strong>{{mechanicName}}</strong></td>
        </tr>
        <tr>
          <td>Номер заказа:</td>
          <td>#{{workOrderNumber}}</td>
        </tr>
      </table>
    </div>
  `,

  [NotificationType.WORK_STARTED]: `
    <h2>Работы начаты</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Работы по вашему заказу начаты.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Номер заказа:</td>
          <td>#{{workOrderNumber}}</td>
        </tr>
        <tr>
          <td>Автомобиль:</td>
          <td>{{carMake}} {{carModel}}</td>
        </tr>
      </table>
    </div>
  `,

  [NotificationType.WORK_FINISHED]: `
    <h2>Работы завершены</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Работы по вашему заказу завершены. Автомобиль готов к выдаче.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Номер заказа:</td>
          <td>#{{workOrderNumber}}</td>
        </tr>
        <tr>
          <td>Автомобиль:</td>
          <td>{{carMake}} {{carModel}}</td>
        </tr>
      </table>
    </div>
  `,

  [NotificationType.PAYMENT_CREATED]: `
    <h2>Платеж создан</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Был создан новый платеж по вашему счету.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Сумма:</td>
          <td><strong>{{amount}} {{currency}}</strong></td>
        </tr>
        <tr>
          <td>Статус:</td>
          <td>{{status}}</td>
        </tr>
      </table>
    </div>
  `,

  [NotificationType.VEHICLE_READY]: `
    <h2>Автомобиль готов</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Ваш автомобиль готов к выдаче!</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Автомобиль:</td>
          <td><strong>{{carMake}} {{carModel}}</strong></td>
        </tr>
        <tr>
          <td>Номер заказа:</td>
          <td>#{{workOrderNumber}}</td>
        </tr>
      </table>
    </div>
    <p>Вы можете забрать автомобиль в любое время в рабочее время.</p>
  `,

  [NotificationType.APPOINTMENT_REMINDER]: `
    <h2>Напоминание о записи</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Напоминаем о предстоящей записи на обслуживание.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Дата и время:</td>
          <td><strong>{{appointmentDate}}</strong></td>
        </tr>
        <tr>
          <td>Автомобиль:</td>
          <td>{{carMake}} {{carModel}}</td>
        </tr>
        <tr>
          <td>Филиал:</td>
          <td>{{branchName}}</td>
        </tr>
      </table>
    </div>
    <p>Ждем вас!</p>
  `,

  [NotificationType.WORK_ORDER_OVERDUE]: `
    <h2>Заказ просрочен</h2>
    <p>Здравствуйте, {{clientName}}!</p>
    <p>Ваш заказ на обслуживание просрочен на {{overdueDays}} дней.</p>
    <div class="info-box">
      <table>
        <tr>
          <td>Номер заказа:</td>
          <td>#{{workOrderNumber}}</td>
        </tr>
        <tr>
          <td>Автомобиль:</td>
          <td>{{carMake}} {{carModel}}</td>
        </tr>
      </table>
    </div>
    <p>Пожалуйста, свяжитесь с нами для уточнения сроков.</p>
  `,
};

export class EmailTemplateService {
  private baseTemplate: handlebars.TemplateDelegate;
  private templates: Map<NotificationType, handlebars.TemplateDelegate>;

  constructor() {
    // Скомпилировать базовый шаблон
    this.baseTemplate = handlebars.compile(BASE_TEMPLATE);
    
    // Скомпилировать все шаблоны
    this.templates = new Map();
    Object.entries(EMAIL_TEMPLATES).forEach(([type, content]) => {
      this.templates.set(type as NotificationType, handlebars.compile(content));
    });

    // Регистрация helpers для Handlebars
    this.registerHelpers();
  }

  /**
   * Регистрация Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper для форматирования даты
    handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (format === 'short') {
        return d.toLocaleDateString('ru-RU');
      }
      return d.toLocaleString('ru-RU');
    });

    // Helper для форматирования валюты
    handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currency,
      }).format(amount / 100); // Предполагаем, что сумма в центах
    });

    // Helper для условия if
    handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Рендерить email шаблон
   */
  render(type: NotificationType, variables: TemplateVariables): string {
    try {
      // Получить шаблон для типа уведомления
      const contentTemplate = this.templates.get(type);
      
      if (!contentTemplate) {
        logger.warn(`[EmailTemplateService] Template not found for type: ${type}, using default`);
        return this.renderDefault(variables);
      }

      // Рендерить контент
      const content = contentTemplate(variables);

      // Рендерить базовый шаблон с контентом
      const html = this.baseTemplate({
        subject: variables.subject || 'Уведомление от Car Service',
        body: content,
        year: new Date().getFullYear(),
      });

      return html;
    } catch (error: any) {
      logger.error(`[EmailTemplateService] Error rendering template for type ${type}:`, error);
      return this.renderDefault(variables);
    }
  }

  /**
   * Рендерить дефолтный шаблон (fallback)
   */
  private renderDefault(variables: TemplateVariables): string {
    const content = `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
    `;
    
    const contentTemplate = handlebars.compile(content);
    const renderedContent = contentTemplate(variables);

    return this.baseTemplate({
      subject: variables.subject || 'Уведомление от Car Service',
      body: renderedContent,
      year: new Date().getFullYear(),
    });
  }

  /**
   * Рендерить текстовую версию (без HTML)
   */
  renderText(html: string): string {
    // Упрощенная конвертация HTML в текст
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default new EmailTemplateService();
