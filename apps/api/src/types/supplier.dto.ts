/**
 * DTO (Data Transfer Objects) для поставщиков (Suppliers)
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
 * DTO для создания поставщика
 */
export const CreateSupplierDtoSchema = z.object({
  name: z.string().min(1, 'Название обязательно').trim(),
  email: z.string().email('Неверный формат email').trim().optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  address: AddressSchema,
  paymentTerms: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreateSupplierDto = z.infer<typeof CreateSupplierDtoSchema>;

/**
 * DTO для обновления поставщика
 */
export const UpdateSupplierDtoSchema = CreateSupplierDtoSchema.partial();

export type UpdateSupplierDto = z.infer<typeof UpdateSupplierDtoSchema>;

/**
 * DTO для запроса списка поставщиков (query parameters)
 */
export const GetSuppliersQueryDtoSchema = z.object({
  search: z.string().trim().optional(),
  name: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.preprocess((val) => {
    if (typeof val === 'string') return parseInt(val, 10);
    return val;
  }, z.number().int().min(1)).optional().default(1),
  limit: z.preprocess((val) => {
    if (typeof val === 'string') return parseInt(val, 10);
    return val;
  }, z.number().int().min(1).max(100)).optional().default(20),
});

export type GetSuppliersQueryDto = z.infer<typeof GetSuppliersQueryDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о поставщике
 */
export interface SupplierResponse {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  purchaseOrdersCount?: number; // Количество заказов у поставщика
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ответ со списком поставщиков и пагинацией
 */
export interface SupplierListResponse {
  suppliers: SupplierResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
