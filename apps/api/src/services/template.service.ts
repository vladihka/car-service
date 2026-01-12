/**
 * Сервис для работы с шаблонами уведомлений
 * Обрабатывает шаблоны и заменяет переменные
 */

import NotificationTemplate from '../models/NotificationTemplate';
import { NotificationType, NotificationChannel } from '../types';
import mongoose from 'mongoose';

export class TemplateService {
  /**
   * Получить шаблон уведомления
   * Сначала ищет шаблон организации, затем глобальный
   */
  async getTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    locale: string = 'en',
    organizationId?: string
  ): Promise<INotificationTemplate | null> {
    // Сначала ищем шаблон организации
    if (organizationId) {
      const orgTemplate = await NotificationTemplate.findOne({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        type,
        channel,
        locale,
        isActive: true,
      });
      
      if (orgTemplate) {
        return orgTemplate;
      }
    }
    
    // Затем ищем глобальный шаблон
    const globalTemplate = await NotificationTemplate.findOne({
      organizationId: null,
      type,
      channel,
      locale,
      isActive: true,
    });
    
    return globalTemplate;
  }
  
  /**
   * Заменить переменные в шаблоне
   */
  renderTemplate(template: string, variables: { [key: string]: any }): string {
    let rendered = template;
    
    // Заменяем переменные в формате {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }
    
    return rendered;
  }
  
  /**
   * Создать шаблон (для инициализации)
   */
  async createTemplate(data: {
    organizationId?: string;
    type: NotificationType;
    channel: NotificationChannel;
    locale: string;
    subject?: string;
    title: string;
    bodyHtml: string;
    bodyText: string;
    variables: string[];
  }): Promise<INotificationTemplate> {
    const template = new NotificationTemplate({
      organizationId: data.organizationId ? new mongoose.Types.ObjectId(data.organizationId) : undefined,
      type: data.type,
      channel: data.channel,
      locale: data.locale,
      subject: data.subject,
      title: data.title,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText,
      variables: data.variables,
      isActive: true,
    });
    
    await template.save();
    return template;
  }
}

export default new TemplateService();
