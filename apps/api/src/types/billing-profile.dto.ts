/**
 * DTO (Data Transfer Objects) для биллинг-профилей (Billing Profiles)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';

// ==================== Request DTOs ====================

const AddressSchema = z.object({
  street: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
}).optional();

/**
 * DTO для создания биллинг-профиля
 */
export const CreateBillingProfileDtoSchema = z.object({
  legalName: z.string().min(1, 'Юридическое название обязательно').trim(),
  vatNumber: z.string().trim().optional(),
  address: AddressSchema,
  country: z.string().trim().optional(),
  currency: z.string().trim().min(1, 'Валюта обязательна').default('USD'),
  defaultTaxId: z.string().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID налога'
  ).optional(),
  paymentTerms: z.number().int().min(0, 'Срок оплаты должен быть неотрицательным').optional().default(30),
  invoicePrefix: z.string().trim().min(1, 'Префикс обязателен').default('INV'),
});

export type CreateBillingProfileDto = z.infer<typeof CreateBillingProfileDtoSchema>;

/**
 * DTO для обновления биллинг-профиля
 */
export const UpdateBillingProfileDtoSchema = CreateBillingProfileDtoSchema.partial();

export type UpdateBillingProfileDto = z.infer<typeof UpdateBillingProfileDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о биллинг-профиле
 */
export interface BillingProfileResponse {
  id: string;
  organizationId: string;
  legalName: string;
  vatNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  country?: string;
  currency: string;
  defaultTaxId?: string;
  paymentTerms: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  createdAt: Date;
  updatedAt: Date;
}
