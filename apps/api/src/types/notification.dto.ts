/**
 * DTO (Data Transfer Objects) для уведомлений (Notifications)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import { NotificationType, NotificationChannel, NotificationStatus } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для запросов списка уведомлений
 */
export const NotificationQueryDtoSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(NotificationStatus).optional(),
  type: z.nativeEnum(NotificationType).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  read: z.coerce.boolean().optional(),
});

export type NotificationQueryDto = z.infer<typeof NotificationQueryDtoSchema>;

/**
 * DTO для создания уведомления
 * Manager/Owner может создавать уведомления
 */
export const CreateNotificationDtoSchema = z.object({
  userId: z.string().min(1, 'ID пользователя обязателен'),
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.IN_APP),
  title: z.string().min(1, 'Заголовок обязателен').trim(),
  message: z.string().min(1, 'Сообщение обязательно').trim(),
  data: z.record(z.any()).optional(),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationDtoSchema>;

/**
 * DTO для создания тестового уведомления
 */
export const CreateTestNotificationDtoSchema = z.object({
  userId: z.string().optional(),
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel),
  title: z.string().min(1),
  message: z.string().min(1),
});

export type CreateTestNotificationDto = z.infer<typeof CreateTestNotificationDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией об уведомлении
 */
export interface NotificationResponse {
  id: string;
  organizationId?: string;
  branchId?: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: {
    [key: string]: any;
  };
  readAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  retryCount: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Пагинированный ответ со списком уведомлений
 */
export interface NotificationListResponse {
  data: NotificationResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * DTO для Domain Events
 */
export interface DomainEvent {
  type: NotificationType;
  organizationId?: string;
  branchId?: string;
  userId: string;
  data: {
    [key: string]: any;
  };
  timestamp: Date;
}
