/**
 * Модель уведомлений (Notifications)
 * Хранит все уведомления системы
 */

import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType, NotificationChannel, NotificationStatus } from '../types';

export interface INotification extends Document {
  organizationId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Получатель уведомления
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: {
    // Метаданные уведомления (appointmentId, workOrderId, etc.)
    [key: string]: any;
  };
  readAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  retryCount: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
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
      default: NotificationStatus.PENDING,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    readAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    error: String,
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ organizationId: 1, branchId: 1, status: 1 });
NotificationSchema.index({ type: 1, status: 1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
