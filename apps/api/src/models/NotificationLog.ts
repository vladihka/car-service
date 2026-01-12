/**
 * Модель логов уведомлений (Notification Logs)
 * Хранит историю отправки уведомлений для отладки и аудита
 */

import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType, NotificationChannel, NotificationStatus } from '../types';

export interface INotificationLog extends Document {
  notificationId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider?: string; // sendgrid, ses, firebase, etc.
  providerMessageId?: string; // ID сообщения от провайдера
  error?: string;
  retryAttempt: number;
  sentAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      required: true,
      index: true,
    },
    provider: String,
    providerMessageId: String,
    error: String,
    retryAttempt: {
      type: Number,
      default: 0,
      min: 0,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

NotificationLogSchema.index({ notificationId: 1, createdAt: -1 });
NotificationLogSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationLogSchema.index({ organizationId: 1, type: 1, createdAt: -1 });
NotificationLogSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
