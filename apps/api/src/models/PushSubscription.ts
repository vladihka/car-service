/**
 * Модель подписок на Web Push уведомления
 * Хранит подписки пользователей для отправки push уведомлений
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  endpoint: string; // Push subscription endpoint URL
  keys: {
    p256dh: string; // P256DH public key
    auth: string; // Authentication secret
  };
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    device?: string;
  };
  isActive: boolean;
  lastSentAt?: Date;
  failureCount: number; // Счетчик неудачных попыток отправки
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true, // Каждая подписка уникальна по endpoint
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    deviceInfo: {
      userAgent: String,
      platform: String,
      browser: String,
      device: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSentAt: Date,
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Индексы для оптимизации запросов
PushSubscriptionSchema.index({ userId: 1, isActive: 1 });
PushSubscriptionSchema.index({ organizationId: 1, isActive: 1 });
PushSubscriptionSchema.index({ userId: 1, organizationId: 1, isActive: 1 });
PushSubscriptionSchema.index({ failureCount: 1, isActive: 1 });

export default mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
