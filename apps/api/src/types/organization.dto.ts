/**
 * DTO (Data Transfer Objects) для организаций
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';

// ==================== Request DTOs ====================

/**
 * DTO для создания организации
 * SuperAdmin может создавать организации
 */
export const CreateOrganizationDtoSchema = z.object({
  name: z.string().min(1, 'Название организации обязательно').trim(),
  ownerId: z.string().min(1, 'ID владельца обязателен').refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID владельца'
  ),
  email: z.string().email('Некорректный email адрес').trim(),
  phone: z.string().trim().optional(),
  address: z.object({
    street: z.string().trim(),
    city: z.string().trim(),
    state: z.string().trim(),
    zipCode: z.string().trim(),
    country: z.string().trim(),
  }).optional(),
});

export type CreateOrganizationDto = z.infer<typeof CreateOrganizationDtoSchema>;

/**
 * DTO для обновления организации
 */
export const UpdateOrganizationDtoSchema = z.object({
  name: z.string().min(1, 'Название организации обязательно').trim().optional(),
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

export type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией об организации
 */
export interface OrganizationResponse {
  id: string;
  name: string;
  ownerId: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subscription: {
    plan: string;
    status: string;
    startDate: Date;
    endDate?: Date;
    maxBranches: number;
    maxUsers: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
