/**
 * DTO (Data Transfer Objects) для движений по складу (Stock Movements)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { StockMovementType } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для создания движения по складу
 */
export const CreateStockMovementDtoSchema = z.object({
  partId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID запчасти'
  ),
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().int().refine((val) => val !== 0, 'Количество не может быть нулевым'),
  reason: z.string().trim().optional(),
  relatedWorkOrderId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID заказа'
  ),
  relatedPurchaseOrderId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID заказа поставщику'
  ),
  reference: z.string().trim().optional(),
});

export type CreateStockMovementDto = z.infer<typeof CreateStockMovementDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о движении по складу
 */
export interface StockMovementResponse {
  id: string;
  organizationId: string;
  branchId?: string;
  partId: string;
  partName?: string;
  partSku?: string;
  type: StockMovementType;
  quantity: number;
  reason?: string;
  relatedWorkOrderId?: string;
  relatedPurchaseOrderId?: string;
  createdBy: string;
  createdByName?: string;
  reference?: string;
  createdAt: Date;
}
