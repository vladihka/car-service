/**
 * DTO (Data Transfer Objects) для заказов поставщикам (Purchase Orders)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { PurchaseOrderStatus } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для создания заказа поставщику
 */
export const CreatePurchaseOrderDtoSchema = z.object({
  supplierId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID поставщика'
  ),
  items: z.array(z.object({
    partId: z.string().refine(
      (val) => mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID запчасти'
    ),
    quantity: z.number().int().min(1, 'Количество должно быть минимум 1'),
    price: z.number().min(0, 'Цена должна быть неотрицательной'),
  })).min(1, 'Необходимо указать хотя бы одну позицию'),
  expectedDeliveryDate: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
});

export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderDtoSchema>;

/**
 * DTO для приёмки заказа
 */
export const ReceivePurchaseOrderDtoSchema = z.object({
  items: z.array(z.object({
    partId: z.string().refine(
      (val) => mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID запчасти'
    ),
    receivedQuantity: z.number().int().min(0, 'Полученное количество должно быть неотрицательным'),
  })).min(1, 'Необходимо указать хотя бы одну позицию'),
});

export type ReceivePurchaseOrderDto = z.infer<typeof ReceivePurchaseOrderDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о заказе поставщику
 */
export interface PurchaseOrderResponse {
  id: string;
  organizationId: string;
  branchId?: string;
  supplierId: string;
  supplierName?: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  items: Array<{
    partId: string;
    sku: string;
    name: string;
    quantity: number;
    price: number;
    receivedQuantity: number;
  }>;
  totalAmount: number;
  notes?: string;
  orderedAt?: Date;
  expectedDeliveryDate?: Date;
  receivedAt?: Date;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}
