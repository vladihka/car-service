/**
 * Модель логов транзакций (Transaction Logs)
 * Хранит историю всех транзакций для аудита и отладки
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionLog extends Document {
  organizationId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  type: 'subscription' | 'payment' | 'refund' | 'webhook';
  action: string; // created, updated, canceled, paid, failed, etc.
  amount?: number; // Сумма транзакции
  currency?: string;
  status: 'success' | 'pending' | 'failed';
  stripeEventId?: string; // ID события в Stripe
  stripeTransactionId?: string; // ID транзакции в Stripe
  metadata?: {
    [key: string]: any;
  };
  error?: string;
  createdAt: Date;
}

const TransactionLogSchema = new Schema<ITransactionLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      index: true,
    },
    type: {
      type: String,
      enum: ['subscription', 'payment', 'refund', 'webhook'],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    amount: Number,
    currency: String,
    status: {
      type: String,
      enum: ['success', 'pending', 'failed'],
      required: true,
      index: true,
    },
    stripeEventId: {
      type: String,
      unique: true,
      sparse: true,
      index: true, // Для идемпотентности
    },
    stripeTransactionId: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    error: String,
  },
  {
    timestamps: true,
  }
);

TransactionLogSchema.index({ organizationId: 1, createdAt: -1 });
TransactionLogSchema.index({ type: 1, status: 1, createdAt: -1 });
TransactionLogSchema.index({ createdAt: -1 });

export default mongoose.model<ITransactionLog>('TransactionLog', TransactionLogSchema);
