/**
 * DTO (Data Transfer Objects) для заказов на работу (Work Orders)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { WorkOrderStatus } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для создания заказа на работу
 * Manager может создавать заказы
 */
export const CreateWorkOrderDtoSchema = z.object({
  appointmentId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID записи'
  ),
  clientId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID клиента'
  ),
  carId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID автомобиля'
  ),
  mechanicId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID механика'
  ),
  description: z.string().min(1, 'Описание работы обязательно').trim(),
  diagnostics: z.string().trim().optional(),
  estimatedCost: z.number().min(0, 'Сметная стоимость должна быть неотрицательной').optional(),
});

export type CreateWorkOrderDto = z.infer<typeof CreateWorkOrderDtoSchema>;

/**
 * DTO для обновления заказа на работу
 * Mechanic может обновлять свои заказы
 */
export const UpdateWorkOrderDtoSchema = z.object({
  status: z.nativeEnum(WorkOrderStatus).optional(),
  diagnostics: z.string().trim().optional(),
  partsUsed: z.array(z.object({
    partId: z.string().refine(
      (val) => mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID детали'
    ),
    quantity: z.number().int().min(1, 'Количество должно быть минимум 1'),
    unitPrice: z.number().min(0, 'Цена должна быть неотрицательной'),
  })).optional(),
  finalPrice: z.number().min(0, 'Итоговая цена должна быть неотрицательной').optional(),
  notes: z.string().trim().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Должно быть указано хотя бы одно поле для обновления',
});

export type UpdateWorkOrderDto = z.infer<typeof UpdateWorkOrderDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о заказе на работу
 */
export interface WorkOrderResponse {
  id: string;
  organizationId: string;
  branchId: string;
  clientId: string;
  carId: string;
  appointmentId?: string;
  workOrderNumber: string;
  status: WorkOrderStatus;
  description: string;
  diagnostics?: string;
  estimatedCost?: number;
  actualCost?: number;
  finalPrice?: number;
  estimatedCompletion?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  assignedTo?: string;
  partsUsed: Array<{
    partId: string;
    quantity: number;
    unitPrice: number;
  }>;
  labor: Array<{
    description: string;
    hours: number;
    rate: number;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
