/**
 * DTO (Data Transfer Objects) для аутентификации
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import { UserRole } from './index';

// ==================== Request DTOs ====================

/**
 * DTO для регистрации пользователя
 */
export const RegisterDtoSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'
    ),
  firstName: z.string().min(1, 'Имя обязательно').trim(),
  lastName: z.string().min(1, 'Фамилия обязательна').trim(),
  phone: z.string().optional(),
  organizationId: z.string().optional(),
  branchId: z.string().optional(),
  role: z.nativeEnum(UserRole).optional().default(UserRole.CLIENT),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

/**
 * DTO для входа
 */
export const LoginDtoSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;

/**
 * DTO для обновления токена
 */
export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен'),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

/**
 * DTO для выхода
 */
export const LogoutDtoSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен'),
});

export type LogoutDto = z.infer<typeof LogoutDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с токенами и пользователем
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId?: string;
    branchId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Ответ с новыми токенами
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Ответ с информацией о пользователе
 */
export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  permissions: string[];
  organizationId?: string;
  branchId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
