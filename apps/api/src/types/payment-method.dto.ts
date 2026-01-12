/**
 * DTO (Data Transfer Objects) для методов оплаты (Payment Methods)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import { PaymentMethod } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для создания метода оплаты
 */
export const CreatePaymentMethodDtoSchema = z.object({
  name: z.string().min(1, 'Название обязательно').trim(),
  type: z.nativeEnum(PaymentMethod),
  settings: z.record(z.any()).optional(),
});

export type CreatePaymentMethodDto = z.infer<typeof CreatePaymentMethodDtoSchema>;

/**
 * DTO для обновления метода оплаты
 */
export const UpdatePaymentMethodDtoSchema = CreatePaymentMethodDtoSchema.partial();

export type UpdatePaymentMethodDto = z.infer<typeof UpdatePaymentMethodDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о методе оплаты
 */
export interface PaymentMethodResponse {
  id: string;
  organizationId: string;
  name: string;
  type: PaymentMethod;
  isActive: boolean;
  settings?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}
