/**
 * DTO (Data Transfer Objects) для подписок (Subscriptions)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { SubscriptionStatus } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для создания подписки
 */
export const CreateSubscriptionDtoSchema = z.object({
  planId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID тарифа'
  ),
  billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionDtoSchema>;

/**
 * DTO для смены тарифа
 */
export const ChangePlanDtoSchema = z.object({
  planId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID тарифа'
  ),
  billingPeriod: z.enum(['monthly', 'yearly']).optional(),
});

export type ChangePlanDto = z.infer<typeof ChangePlanDtoSchema>;

/**
 * DTO для отмены подписки
 */
export const CancelSubscriptionDtoSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о подписке
 */
export interface SubscriptionResponse {
  id: string;
  organizationId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingPeriod: 'monthly' | 'yearly';
  startedAt: Date;
  endsAt: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
