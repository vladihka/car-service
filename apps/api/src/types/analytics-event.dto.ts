/**
 * DTO (Data Transfer Objects) для событий аналитики (Analytics Events)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { AnalyticsAction } from '../models/AnalyticsEvent';

// ==================== Request DTOs ====================

/**
 * DTO для создания события аналитики
 */
export const CreateAnalyticsEventDtoSchema = z.object({
  action: z.nativeEnum(AnalyticsAction),
  entityType: z.string().trim().optional(),
  entityId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID сущности'
  ),
  metadata: z.record(z.any()).optional(),
});

export type CreateAnalyticsEventDto = z.infer<typeof CreateAnalyticsEventDtoSchema>;

/**
 * DTO для запроса событий
 */
export const AnalyticsEventQueryDtoSchema = z.object({
  action: z.nativeEnum(AnalyticsAction).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID сущности'
  ),
  userId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID пользователя'
  ),
  clientId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID клиента'
  ),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
});

export type AnalyticsEventQueryDto = z.infer<typeof AnalyticsEventQueryDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о событии
 */
export interface AnalyticsEventResponse {
  id: string;
  organizationId?: string;
  branchId?: string;
  userId: string;
  userName?: string;
  clientId?: string;
  action: AnalyticsAction;
  entityType?: string;
  entityId?: string;
  metadata?: {
    [key: string]: any;
  };
  timestamp: Date;
  createdAt: Date;
}
