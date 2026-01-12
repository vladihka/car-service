/**
 * Модель отчетов (Reports)
 * Хранит сгенерированные отчеты для быстрого доступа
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Типы отчетов
 */
export enum ReportType {
  REVENUE = 'revenue', // Доходы
  WORK_ORDERS = 'workOrders', // Заказы
  APPOINTMENTS = 'appointments', // Записи
  MECHANICS_PERFORMANCE = 'mechanicsPerformance', // Производительность механиков
  CLIENT_ACTIVITY = 'clientActivity', // Активность клиентов
  PARTS_USAGE = 'partsUsage', // Использование запчастей
  SERVICES_POPULARITY = 'servicesPopularity', // Популярность услуг
}

export interface IReport extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
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
  generatedBy: mongoose.Types.ObjectId;
  data: {
    summary?: {
      totalOrders?: number;
      totalRevenue?: number;
      totalAppointments?: number;
      averageOrderTime?: number;
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
  expiresAt?: Date; // Для кэширования
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ReportType),
      required: true,
      index: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // TTL индекс для автоудаления
    },
  },
  {
    timestamps: true,
  }
);

ReportSchema.index({ organizationId: 1, type: 1, generatedAt: -1 });
ReportSchema.index({ organizationId: 1, branchId: 1, type: 1, generatedAt: -1 });
ReportSchema.index({ generatedBy: 1, generatedAt: -1 });
ReportSchema.index({ expiresAt: 1 });

export default mongoose.model<IReport>('Report', ReportSchema);
