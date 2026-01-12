/**
 * DTO (Data Transfer Objects) для записей клиентов (Appointments)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { AppointmentStatus } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для создания записи
 * Client может создавать записи
 */
export const CreateAppointmentDtoSchema = z.object({
  clientId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID клиента'
  ),
  branchId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID филиала'
  ),
  car: z.object({
    brand: z.string().min(1, 'Марка автомобиля обязательна').trim(),
    model: z.string().min(1, 'Модель автомобиля обязательна').trim(),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
    vin: z.string().trim().optional(),
  }),
  services: z.array(
    z.string().refine(
      (val) => mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID услуги'
    )
  ).min(1, 'Необходимо выбрать хотя бы одну услугу'),
  preferredDate: z.coerce.date({
    required_error: 'Дата записи обязательна',
    invalid_type_error: 'Неверный формат даты',
  }),
  notes: z.string().trim().optional(),
});

export type CreateAppointmentDto = z.infer<typeof CreateAppointmentDtoSchema>;

/**
 * DTO для обновления статуса записи
 * Manager может обновлять статус
 */
export const UpdateAppointmentStatusDtoSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export type UpdateAppointmentStatusDto = z.infer<typeof UpdateAppointmentStatusDtoSchema>;

/**
 * DTO для назначения механика
 * Manager может назначать механика
 */
export const AssignAppointmentDtoSchema = z.object({
  mechanicId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID механика'
  ),
});

export type AssignAppointmentDto = z.infer<typeof AssignAppointmentDtoSchema>;

/**
 * DTO для обновления записи
 */
export const UpdateAppointmentDtoSchema = z.object({
  preferredDate: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Должно быть указано хотя бы одно поле для обновления',
});

export type UpdateAppointmentDto = z.infer<typeof UpdateAppointmentDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о записи
 */
export interface AppointmentResponse {
  id: string;
  organizationId: string;
  branchId: string;
  clientId: string;
  car: {
    brand: string;
    model: string;
    year: number;
    vin?: string;
  };
  services: string[];
  preferredDate: Date;
  status: AppointmentStatus;
  assignedMechanicId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
