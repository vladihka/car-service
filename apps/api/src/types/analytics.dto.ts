/**
 * DTO (Data Transfer Objects) для аналитики и отчетов
 * Строгая типизация для всех запросов и ответов
 */

import { z } from 'zod';

// ==================== Request DTOs ====================

/**
 * DTO для запросов аналитики
 * Общие параметры фильтрации
 */
export const AnalyticsQueryDtoSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  branchId: z.string().optional(),
  period: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export type AnalyticsQueryDto = z.infer<typeof AnalyticsQueryDtoSchema>;

// ==================== Response DTOs ====================

/**
 * Данные для временного ряда (для графиков)
 */
export interface TimeSeriesDataPoint {
  date: string; // ISO date string
  value: number;
  label?: string;
}

/**
 * Финансовая аналитика
 */
export interface FinanceAnalyticsResponse {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  averageInvoiceAmount: number;
  revenueByPeriod: TimeSeriesDataPoint[];
  invoicesByStatus: Array<{
    status: string;
    count: number;
    total: number;
  }>;
  period: string;
}

/**
 * Аналитика загруженности
 */
export interface WorkloadAnalyticsResponse {
  workOrdersByStatus: Array<{
    status: string;
    count: number;
  }>;
  mechanicWorkload: Array<{
    mechanicId: string;
    mechanicName: string;
    totalOrders: number;
    completedOrders: number;
    totalHours: number;
    averageOrderDuration: number; // в часах
  }>;
  appointmentsByStatus: Array<{
    status: string;
    count: number;
  }>;
  conversionRate: number; // Процент конверсии записей в выполненные заказы
  period: string;
}

/**
 * Аналитика услуг
 */
export interface ServicesAnalyticsResponse {
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    totalRevenue: number;
    totalQuantity: number;
    averagePrice: number;
  }>;
  servicesByCategory: Array<{
    category: string;
    revenue: number;
    count: number;
  }>;
  period: string;
}

/**
 * Клиентская аналитика
 */
export interface ClientsAnalyticsResponse {
  totalClients: number;
  activeClients: number; // Клиенты с активными заказами
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalSpent: number;
    totalOrders: number;
    averageOrderAmount: number;
  }>;
  clientsByPeriod: TimeSeriesDataPoint[]; // Новые клиенты по периодам
  period: string;
}

/**
 * Общая сводка (Summary)
 */
export interface SummaryAnalyticsResponse {
  finance: {
    totalRevenue: number;
    totalInvoices: number;
    averageInvoiceAmount: number;
    revenueGrowth: number; // Процент роста по сравнению с предыдущим периодом
  };
  workOrders: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    completionRate: number; // Процент выполненных заказов
  };
  appointments: {
    total: number;
    confirmed: number;
    completed: number;
    conversionRate: number; // Конверсия записей в заказы
  };
  clients: {
    total: number;
    active: number;
    newClients: number; // За период
  };
  services: {
    totalServices: number;
    topService: {
      name: string;
      revenue: number;
    } | null;
  };
  period: {
    from: Date;
    to: Date;
  };
}
