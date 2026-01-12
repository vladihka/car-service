/**
 * Модель методов оплаты (Payment Methods)
 * Хранит информацию о доступных методах оплаты для организации
 */

import mongoose, { Schema, Document } from 'mongoose';
import { PaymentMethod as PaymentMethodType } from '../types';

export interface IPaymentMethod extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string; // Название метода оплаты
  type: PaymentMethodType; // Тип: CASH, CARD, TRANSFER (в типах), но можем добавить ONLINE
  isActive: boolean;
  settings?: {
    // Настройки для онлайн-оплаты (Stripe, PayPal и т.д.)
    provider?: string; // stripe, paypal, etc.
    apiKey?: string; // Зашифрованный ключ
    webhookSecret?: string; // Зашифрованный секрет для webhook
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(PaymentMethodType),
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

PaymentMethodSchema.index({ organizationId: 1, type: 1, isActive: 1 });
PaymentMethodSchema.index({ organizationId: 1, isActive: 1 });

export default mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);
