/**
 * DTO (Data Transfer Objects) для клиентов (Clients)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';

// ==================== Request DTOs ====================

/**
 * DTO для создания клиента
 */
export const CreateClientDtoSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').trim(),
  lastName: z.string().min(1, 'Фамилия обязательна').trim(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Телефон обязателен').trim(),
  branchId: z.string().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID филиала'
  ).optional(),
  address: z.object({
    street: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    zipCode: z.string().trim().optional(),
    country: z.string().trim().optional(),
  }).optional(),
  notes: z.string().trim().optional(),
});

export type CreateClientDto = z.infer<typeof CreateClientDtoSchema>;

/**
 * DTO для обновления клиента
 */
export const UpdateClientDtoSchema = CreateClientDtoSchema.partial();

export type UpdateClientDto = z.infer<typeof UpdateClientDtoSchema>;

/**
 * DTO для запроса списка клиентов (query parameters)
 */
export const GetClientsQueryDtoSchema = z.object({
  search: z.string().trim().optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().optional(),
  vin: z.string().trim().optional(), // Поиск по VIN автомобиля клиента
  branchId: z.string().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID филиала'
  ).optional(),
  isActive: z.string().transform((val) => val === 'true').optional(),
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).optional().default('1'),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional().default('20'),
});

export type GetClientsQueryDto = z.infer<typeof GetClientsQueryDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о клиенте
 */
export interface ClientResponse {
  id: string;
  organizationId: string;
  branchId?: string;
  firstName: string;
  lastName: string;
  fullName: string; // firstName + lastName
  email?: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  isActive: boolean;
  carsCount?: number; // Количество автомобилей клиента
  appointmentsCount?: number; // Количество записей
  workOrdersCount?: number; // Количество заказов
  invoicesCount?: number; // Количество счетов
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ответ со списком клиентов
 */
export interface ClientListResponse {
  clients: ClientResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
