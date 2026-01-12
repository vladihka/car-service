/**
 * DTO (Data Transfer Objects) для счетов (Invoices)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { InvoiceStatus } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для создания счета
 * Manager может создавать счета
 */
export const CreateInvoiceDtoSchema = z.object({
  workOrderId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID заказа'
  ),
  clientId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID клиента'
  ),
  items: z.array(z.object({
    serviceId: z.string().optional().refine(
      (val) => !val || mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID услуги'
    ),
    partId: z.string().optional().refine(
      (val) => !val || mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID запчасти'
    ),
    name: z.string().min(1, 'Название обязательно').trim(),
    price: z.number().min(0, 'Цена должна быть неотрицательной'),
    quantity: z.number().int().min(1, 'Количество должно быть минимум 1'),
  })).min(1, 'Необходимо указать хотя бы одну позицию'),
  tax: z.number().min(0, 'Налог должен быть неотрицательным').optional(),
  currency: z.string().length(3, 'Валюта должна быть в формате ISO 4217 (3 символа)').default('USD'),
  notes: z.string().trim().optional(),
}).refine((data) => {
  // Вычислить subtotal и total для валидации
  const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = data.tax || 0;
  const total = subtotal + tax;
  return total > 0;
}, {
  message: 'Общая сумма должна быть больше нуля',
});

export type CreateInvoiceDto = z.infer<typeof CreateInvoiceDtoSchema>;

/**
 * DTO для обновления счета (пересчет)
 */
export const UpdateInvoiceDtoSchema = z.object({
  items: z.array(z.object({
    serviceId: z.string().optional().refine(
      (val) => !val || mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID услуги'
    ),
    partId: z.string().optional().refine(
      (val) => !val || mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID запчасти'
    ),
    name: z.string().min(1, 'Название обязательно').trim(),
    price: z.number().min(0, 'Цена должна быть неотрицательной'),
    quantity: z.number().int().min(1, 'Количество должно быть минимум 1'),
  })).optional(),
  tax: z.number().min(0, 'Налог должен быть неотрицательным').optional(),
  notes: z.string().trim().optional(),
});

export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceDtoSchema>;

/**
 * DTO для обновления статуса счета
 * Manager может обновлять статус
 */
export const UpdateInvoiceStatusDtoSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
});

export type UpdateInvoiceStatusDto = z.infer<typeof UpdateInvoiceStatusDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о счете
 */
export interface InvoiceResponse {
  id: string;
  organizationId: string;
  branchId: string;
  clientId: string;
  workOrderId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  items: Array<{
    serviceId?: string;
    partId?: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  paidAmount: number;
  issuedAt?: Date;
  paidAt?: Date;
  pdfUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
