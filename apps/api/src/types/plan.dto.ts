/**
 * DTO (Data Transfer Objects) для тарифных планов (Plans)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { SubscriptionPlan } from './index';

// ==================== Request DTOs ====================

const PlanLimitsSchema = z.object({
  maxBranches: z.number().int().min(0).optional(),
  maxUsers: z.number().int().min(0).optional(),
  maxWorkOrdersPerMonth: z.number().int().min(0).optional(),
  maxStorageGB: z.number().int().min(0).optional(),
}).optional();

/**
 * DTO для создания тарифного плана
 */
export const CreatePlanDtoSchema = z.object({
  name: z.nativeEnum(SubscriptionPlan),
  priceMonthly: z.number().min(0, 'Месячная цена должна быть неотрицательной'),
  priceYearly: z.number().min(0, 'Годовая цена должна быть неотрицательной').optional(),
  currency: z.string().trim().min(1, 'Валюта обязательна').default('USD'),
  limits: PlanLimitsSchema,
  features: z.array(z.string().trim()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export type CreatePlanDto = z.infer<typeof CreatePlanDtoSchema>;

/**
 * DTO для обновления тарифного плана
 */
export const UpdatePlanDtoSchema = CreatePlanDtoSchema.partial();

export type UpdatePlanDto = z.infer<typeof UpdatePlanDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о тарифном плане
 */
export interface PlanResponse {
  id: string;
  name: SubscriptionPlan;
  priceMonthly: number;
  priceYearly?: number;
  currency: string;
  limits: {
    maxBranches?: number;
    maxUsers?: number;
    maxWorkOrdersPerMonth?: number;
    maxStorageGB?: number;
  };
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
