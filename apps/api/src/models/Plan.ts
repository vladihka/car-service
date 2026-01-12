/**
 * Модель тарифных планов (Plans)
 * Хранит информацию о доступных тарифах
 */

import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionPlan } from '../types';

export interface IPlan extends Document {
  name: SubscriptionPlan;
  displayName: string;
  description: string;
  price: number; // Цена в месяц (в центах/копейках)
  currency: string; // USD, RUB, etc.
  interval: 'month' | 'year'; // Интервал оплаты
  trialDays: number; // Количество дней trial периода
  features: {
    maxOrganizations?: number;
    maxBranches?: number;
    maxUsers?: number;
    maxClients?: number;
    maxServices?: number;
    maxStorageGB?: number;
    advancedAnalytics?: boolean;
    customBranding?: boolean;
    apiAccess?: boolean;
    prioritySupport?: boolean;
  };
  isActive: boolean;
  stripeProductId?: string; // ID продукта в Stripe
  stripePriceId?: string; // ID цены в Stripe
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    interval: {
      type: String,
      enum: ['month', 'year'],
      default: 'month',
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    features: {
      maxOrganizations: Number,
      maxBranches: Number,
      maxUsers: Number,
      maxClients: Number,
      maxServices: Number,
      maxStorageGB: Number,
      advancedAnalytics: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    stripeProductId: String,
    stripePriceId: String,
  },
  {
    timestamps: true,
  }
);

PlanSchema.index({ isActive: 1, name: 1 });

export default mongoose.model<IPlan>('Plan', PlanSchema);
