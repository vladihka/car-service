/**
 * DTO (Data Transfer Objects) для отчетов (Reports)
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { ReportType } from '../models/Report';

// ==================== Request DTOs ====================

/**
 * DTO для генерации отчета
 */
export const GenerateReportDtoSchema = z.object({
  type: z.nativeEnum(ReportType),
  filters: z.object({
    dateRange: z.object({
      from: z.coerce.date(),
      to: z.coerce.date(),
    }).optional(),
    branchId: z.string().optional().refine(
      (val) => !val || mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID филиала'
    ),
    mechanicId: z.string().optional().refine(
      (val) => !val || mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID механика'
    ),
    serviceId: z.string().optional().refine(
      (val) => !val || mongoose.Types.ObjectId.isValid(val),
      'Неверный формат ID услуги'
    ),
    status: z.string().optional(),
  }).optional(),
  cacheHours: z.number().int().min(0).max(24).optional().default(1), // Часы кэширования
});

export type GenerateReportDto = z.infer<typeof GenerateReportDtoSchema>;

/**
 * DTO для запроса отчетов
 */
export const ReportQueryDtoSchema = z.object({
  type: z.nativeEnum(ReportType).optional(),
  branchId: z.string().optional().refine(
    (val) => !val || mongoose.Types.ObjectId.isValid(val),
    'Неверный формат ID филиала'
  ),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ReportQueryDto = z.infer<typeof ReportQueryDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Ответ с информацией об отчете
 */
export interface ReportResponse {
  id: string;
  organizationId: string;
  branchId?: string;
  type: ReportType;
  filters: {
    dateRange?: {
      from: Date;
      to: Date;
    };
    branchId?: string;
    mechanicId?: string;
    serviceId?: string;
    status?: string;
    [key: string]: any;
  };
  generatedAt: Date;
  generatedBy: string;
  generatedByName?: string;
  data: {
    summary?: {
      [key: string]: any;
    };
    series?: Array<{
      date: Date;
      value: number;
      label?: string;
      [key: string]: any;
    }>;
    categories?: Array<{
      name: string;
      value: number;
      percentage?: number;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  expiresAt?: Date;
  createdAt: Date;
}
