/**
 * DTO (Data Transfer Objects) для биллинга и подписок
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { SubscriptionPlan, SubscriptionStatus } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для подписки на тариф
 */
export const SubscribeDtoSchema = z.object({
  planName: z.nativeEnum(SubscriptionPlan),
  paymentMethodId: z.string().optional(), // ID метода оплаты в Stripe (для будущей интеграции)
});

export type SubscribeDto = z.infer<typeof SubscribeDtoSchema>;

/**
 * DTO для отмены подписки
 */
export const CancelSubscriptionDtoSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(true), // Отменить в конце периода
});

export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionDtoSchema>;

/**
 * DTO для Stripe webhook
 */
export const StripeWebhookDtoSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

export type StripeWebhookDto = z.infer<typeof StripeWebhookDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о подписке
 */
export interface SubscriptionResponse {
  id: string;
  organizationId: string;
  planId: string;
  planName: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  plan: {
    name: SubscriptionPlan;
    displayName: string;
    description: string;
    price: number;
    currency: string;
    interval: string;
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
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ответ с информацией о счете (для биллинга)
 */
export interface BillingInvoiceResponse {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  subscriptionId?: string;
  status: string;
  amount: number;
  currency: string;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
}
