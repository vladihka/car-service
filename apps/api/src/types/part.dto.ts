/**
 * DTO (Data Transfer Objects) для запчастей (Parts)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';

// ==================== Request DTOs ====================

/**
 * DTO для создания запчасти
 */
export const CreatePartDtoSchema = z.object({
  name: z.string().min(1, 'Название обязательно').trim(),
  sku: z.string().min(1, 'Артикул обязателен').trim(),
  manufacturer: z.string().trim().optional(),
  category: z.string().trim().optional(),
  price: z.number().min(0, 'Цена должна быть неотрицательной'),
  cost: z.number().min(0, 'Себестоимость должна быть неотрицательной'),
  quantity: z.number().int().min(0, 'Количество должно быть неотрицательным').optional().default(0),
  minQuantity: z.number().int().min(0, 'Минимальный остаток должен быть неотрицательным').optional().default(0),
  unit: z.string().trim().optional().default('шт'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export type CreatePartDto = z.infer<typeof CreatePartDtoSchema>;

/**
 * DTO для обновления запчасти
 */
export const UpdatePartDtoSchema = CreatePartDtoSchema.partial();

export type UpdatePartDto = z.infer<typeof UpdatePartDtoSchema>;

/**
 * DTO для корректировки остатка
 */
export const AdjustStockDtoSchema = z.object({
  quantity: z.number().int().refine((val) => val !== 0, 'Количество не может быть нулевым'),
  reason: z.string().trim().optional(),
});

export type AdjustStockDto = z.infer<typeof AdjustStockDtoSchema>;

/**
 * DTO для резервирования запчастей под заказ
 */
export const ReservePartsDtoSchema = z.object({
  parts: z.array(z.object({
    partId: z.string().refine(
      (val) => mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID запчасти'
    ),
    quantity: z.number().int().min(1, 'Количество должно быть больше нуля'),
  })).min(1, 'Необходимо указать хотя бы одну запчасть'),
});

export type ReservePartsDto = z.infer<typeof ReservePartsDtoSchema>;

/**
 * DTO для освобождения резерва
 */
export const ReleasePartsDtoSchema = z.object({
  reason: z.string().trim().optional(),
});

export type ReleasePartsDto = z.infer<typeof ReleasePartsDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о запчасти
 */
export interface PartResponse {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  manufacturer?: string;
  category?: string;
  price: number;
  cost: number;
  quantity: number;
  minQuantity: number;
  reservedQuantity: number;
  availableQuantity: number; // quantity - reservedQuantity
  unit: string;
  location?: string;
  description?: string;
  isActive: boolean;
  isLowStock: boolean; // quantity <= minQuantity
  createdAt: Date;
  updatedAt: Date;
}
