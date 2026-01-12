/**
 * DTO (Data Transfer Objects) для услуг (Services)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';

// ==================== Request DTOs ====================

/**
 * DTO для создания услуги
 * Owner, Manager могут создавать услуги
 */
export const CreateServiceDtoSchema = z.object({
  name: z.string().min(1, 'Название услуги обязательно').trim(),
  description: z.string().trim().optional(),
  basePrice: z.number().min(0, 'Цена должна быть неотрицательной'),
  durationMinutes: z.number().int().min(1, 'Длительность должна быть минимум 1 минута'),
});

export type CreateServiceDto = z.infer<typeof CreateServiceDtoSchema>;

/**
 * DTO для обновления услуги
 */
export const UpdateServiceDtoSchema = z.object({
  name: z.string().min(1, 'Название услуги обязательно').trim().optional(),
  description: z.string().trim().optional(),
  basePrice: z.number().min(0, 'Цена должна быть неотрицательной').optional(),
  durationMinutes: z.number().int().min(1, 'Длительность должна быть минимум 1 минута').optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Должно быть указано хотя бы одно поле для обновления',
});

export type UpdateServiceDto = z.infer<typeof UpdateServiceDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией об услуге
 */
export interface ServiceResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  basePrice: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
