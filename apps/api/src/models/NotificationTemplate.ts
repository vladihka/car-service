/**
 * Модель шаблонов уведомлений (Notification Templates)
 * Хранит шаблоны для различных типов уведомлений
 */

import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType, NotificationChannel } from '../types';

export interface INotificationTemplate extends Document {
  organizationId?: mongoose.Types.ObjectId; // null = глобальный шаблон
  type: NotificationType;
  channel: NotificationChannel;
  locale: string; // en, ru, etc.
  subject: string; // Для email
  title: string; // Для push/in-app
  bodyHtml: string; // HTML версия
  bodyText: string; // Текстовая версия
  variables: string[]; // Список переменных в шаблоне (например: {{clientName}}, {{appointmentDate}})
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
      index: true,
    },
    locale: {
      type: String,
      default: 'en',
      index: true,
    },
    subject: String,
    title: {
      type: String,
      required: true,
    },
    bodyHtml: {
      type: String,
      required: true,
    },
    bodyText: {
      type: String,
      required: true,
    },
    variables: [String],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationTemplateSchema.index({ organizationId: 1, type: 1, channel: 1, locale: 1 }, { unique: true });
NotificationTemplateSchema.index({ type: 1, channel: 1, locale: 1, isActive: 1 });

export default mongoose.model<INotificationTemplate>('NotificationTemplate', NotificationTemplateSchema);
