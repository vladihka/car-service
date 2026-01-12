/**
 * DTO (Data Transfer Objects) для налогов (Taxes)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';

// ==================== Request DTOs ====================

/**
 * DTO для создания налога
 */
export const CreateTaxDtoSchema = z.object({
  name: z.string().min(1, 'Название обязательно').trim(),
  rate: z.number().min(0, 'Ставка должна быть неотрицательной').max(100, 'Ставка не может превышать 100%'),
  isDefault: z.boolean().optional().default(false),
  description: z.string().trim().optional(),
});

export type CreateTaxDto = z.infer<typeof CreateTaxDtoSchema>;

/**
 * DTO для обновления налога
 */
export const UpdateTaxDtoSchema = CreateTaxDtoSchema.partial();

export type UpdateTaxDto = z.infer<typeof UpdateTaxDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о налоге
 */
export interface TaxResponse {
  id: string;
  organizationId: string;
  name: string;
  rate: number;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
