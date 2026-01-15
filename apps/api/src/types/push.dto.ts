/**
 * DTO (Data Transfer Objects) для Web Push уведомлений
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';

// ==================== Request DTOs ====================

/**
 * DTO для подписки на push уведомления
 */
export const SubscribePushDtoSchema = z.object({
  endpoint: z.string().url('Неверный формат endpoint URL').trim(),
  keys: z.object({
    p256dh: z.string().min(1, 'P256DH ключ обязателен').trim(),
    auth: z.string().min(1, 'Auth ключ обязателен').trim(),
  }),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    platform: z.string().optional(),
    browser: z.string().optional(),
    device: z.string().optional(),
  }).optional(),
});

export type SubscribePushDto = z.infer<typeof SubscribePushDtoSchema>;

/**
 * DTO для отписки от push уведомлений
 */
export const UnsubscribePushDtoSchema = z.object({
  endpoint: z.string().url('Неверный формат endpoint URL').trim(),
});

export type UnsubscribePushDto = z.infer<typeof UnsubscribePushDtoSchema>;

/**
 * DTO для отправки тестового push уведомления
 */
export const TestPushDtoSchema = z.object({
  title: z.string().min(1, 'Заголовок обязателен').trim(),
  body: z.string().min(1, 'Сообщение обязательно').trim(),
  data: z.record(z.any()).optional(),
  icon: z.string().url().optional(),
  badge: z.string().url().optional(),
  image: z.string().url().optional(),
  url: z.string().url().optional(),
  tag: z.string().optional(),
  requireInteraction: z.boolean().optional(),
});

export type TestPushDto = z.infer<typeof TestPushDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией о push подписке
 */
export interface PushSubscriptionResponse {
  id: string;
  userId: string;
  organizationId?: string;
  endpoint: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    device?: string;
  };
  isActive: boolean;
  lastSentAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ответ с результатом отправки push уведомлений
 */
export interface PushSendResultResponse {
  sent: number;
  failed: number;
  total: number;
}
