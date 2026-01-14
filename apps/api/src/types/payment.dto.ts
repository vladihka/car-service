/**
 * DTO (Data Transfer Objects) для платежей (Payments)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { PaymentMethod, PaymentStatus, PaymentProvider } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для создания платежа
 * Manager может создавать платежи
 */
export const CreatePaymentDtoSchema = z.object({
  invoiceId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID счета'
  ),
  workOrderId: z.string().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID заказа'
  ).optional(),
  amount: z.number().min(0.01, 'Сумма должна быть больше нуля'),
  currency: z.string().length(3, 'Валюта должна быть в формате ISO 4217 (3 символа)').default('USD'),
  method: z.nativeEnum(PaymentMethod),
  provider: z.nativeEnum(PaymentProvider).optional(),
  transactionId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentDtoSchema>;

/**
 * DTO для обновления статуса платежа
 */
export const UpdatePaymentStatusDtoSchema = z.object({
  status: z.nativeEnum(PaymentStatus),
  transactionId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type UpdatePaymentStatusDto = z.infer<typeof UpdatePaymentStatusDtoSchema>;

/**
 * DTO для возврата платежа
 */
export const RefundPaymentDtoSchema = z.object({
  amount: z.number().min(0.01, 'Сумма возврата должна быть больше нуля').optional(),
  reason: z.string().trim().optional(),
});

export type RefundPaymentDto = z.infer<typeof RefundPaymentDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о платеже
 */
export interface PaymentResponse {
  id: string;
  organizationId: string;
  branchId: string;
  invoiceId: string;
  workOrderId?: string;
  clientId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider?: PaymentProvider;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
