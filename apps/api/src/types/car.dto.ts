/**
 * DTO (Data Transfer Objects) для автомобилей (Cars)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';

// ==================== Request DTOs ====================

/**
 * DTO для создания автомобиля
 */
export const CreateCarDtoSchema = z.object({
  clientId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID клиента'
  ),
  vin: z.string().min(17, 'VIN должен содержать минимум 17 символов').max(17, 'VIN должен содержать максимум 17 символов').trim().toUpperCase(),
  make: z.string().min(1, 'Марка обязательна').trim(),
  model: z.string().min(1, 'Модель обязательна').trim(),
  year: z.number().int().min(1900, 'Год должен быть не меньше 1900').max(new Date().getFullYear() + 1, 'Год не может быть больше текущего + 1'),
  color: z.string().trim().optional(),
  licensePlate: z.string().trim().toUpperCase().optional(),
  mileage: z.number().int().min(0, 'Пробег должен быть неотрицательным').optional(),
});

export type CreateCarDto = z.infer<typeof CreateCarDtoSchema>;

/**
 * DTO для обновления автомобиля
 */
export const UpdateCarDtoSchema = CreateCarDtoSchema.partial().extend({
  vin: z.string().min(17, 'VIN должен содержать минимум 17 символов').max(17, 'VIN должен содержать максимум 17 символов').trim().toUpperCase().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  mileage: z.number().int().min(0).optional(),
});

export type UpdateCarDto = z.infer<typeof UpdateCarDtoSchema>;

/**
 * DTO для запроса списка автомобилей (query parameters)
 */
export const GetCarsQueryDtoSchema = z.object({
  search: z.string().trim().optional(),
  vin: z.string().trim().optional(),
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  year: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int()).optional(),
  clientId: z.string().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID клиента'
  ).optional(),
  licensePlate: z.string().trim().optional(),
  page: z.preprocess((val) => {
    if (typeof val === 'string') return parseInt(val, 10);
    return val;
  }, z.number().int().min(1)).optional().default(1),
  limit: z.preprocess((val) => {
    if (typeof val === 'string') return parseInt(val, 10);
    return val;
  }, z.number().int().min(1).max(100)).optional().default(20),
});

export type GetCarsQueryDto = z.infer<typeof GetCarsQueryDtoSchema>;

// ==================== Response DTOs ====================

/**
 * История обслуживания автомобиля
 */
export interface ServiceHistoryItem {
  date: Date;
  description: string;
  mileage: number;
  cost?: number;
}

/**
 * Ответ с информацией об автомобиле
 */
export interface CarResponse {
  id: string;
  organizationId: string;
  clientId: string;
  clientName?: string; // Имя клиента
  vin: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  licensePlate?: string;
  mileage?: number;
  serviceHistory: ServiceHistoryItem[];
  appointmentsCount?: number; // Количество записей
  workOrdersCount?: number; // Количество заказов
  invoicesCount?: number; // Количество счетов
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ответ со списком автомобилей
 */
export interface CarListResponse {
  cars: CarResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
