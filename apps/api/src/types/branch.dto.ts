/**
 * DTO (Data Transfer Objects) для филиалов
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';

// ==================== Request DTOs ====================

/**
 * DTO для создания филиала
 * Owner может создавать филиалы в своей организации
 */
export const CreateBranchDtoSchema = z.object({
  name: z.string().min(1, 'Название филиала обязательно').trim(),
  organizationId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID организации'
  ),
  email: z.string().email('Некорректный email адрес').trim().optional(),
  phone: z.string().trim().optional(),
  address: z.object({
    street: z.string().trim(),
    city: z.string().trim(),
    state: z.string().trim(),
    zipCode: z.string().trim(),
    country: z.string().trim(),
  }).optional(),
});

export type CreateBranchDto = z.infer<typeof CreateBranchDtoSchema>;

/**
 * DTO для обновления филиала
 */
export const UpdateBranchDtoSchema = z.object({
  name: z.string().min(1, 'Название филиала обязательно').trim().optional(),
  email: z.string().email('Некорректный email адрес').trim().optional(),
  phone: z.string().trim().optional(),
  address: z.object({
    street: z.string().trim(),
    city: z.string().trim(),
    state: z.string().trim(),
    zipCode: z.string().trim(),
    country: z.string().trim(),
  }).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Должно быть указано хотя бы одно поле для обновления',
});

export type UpdateBranchDto = z.infer<typeof UpdateBranchDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о филиале
 */
export interface BranchResponse {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
