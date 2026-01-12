/**
 * Модель подписок (Subscriptions)
 * Хранит информацию о подписках организаций
 */

import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionPlan, SubscriptionStatus } from '../types';

export interface ISubscription extends Document {
  organizationId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  planName: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean; // Отменить в конце периода
  stripeSubscriptionId?: string; // ID подписки в Stripe
  stripeCustomerId?: string; // ID клиента в Stripe
  stripePriceId?: string; // ID цены в Stripe
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true, // Одна организация = одна подписка
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    planName: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.TRIAL,
      index: true,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    trialStart: Date,
    trialEnd: Date,
    canceledAt: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    stripeSubscriptionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      index: true,
    },
    stripePriceId: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

SubscriptionSchema.index({ organizationId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
