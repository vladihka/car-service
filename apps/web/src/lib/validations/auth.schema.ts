/**
 * Zod Validation Schemas for Auth
 * Synced with backend DTOs
 */

import { z } from 'zod';
import { UserRole } from '@car-service/shared/src/types/auth';

export const loginSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email('Некорректный email адрес'),
    password: z
      .string()
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'
      ),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Имя обязательно').trim(),
    lastName: z.string().min(1, 'Фамилия обязательна').trim(),
    phone: z.string().optional(),
    role: z.nativeEnum(UserRole).optional().default(UserRole.CLIENT),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Токен обязателен'),
    password: z
      .string()
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
