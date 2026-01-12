/**
 * Модель событий аналитики (Analytics Events)
 * Хранит события для анализа активности пользователей
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Типы действий
 */
export enum AnalyticsAction {
  // Записи
  CREATE_APPOINTMENT = 'createAppointment',
  CONFIRM_APPOINTMENT = 'confirmAppointment',
  CANCEL_APPOINTMENT = 'cancelAppointment',
  
  // Заказы
  CREATE_WORK_ORDER = 'createWorkOrder',
  START_WORK_ORDER = 'startWorkOrder',
  COMPLETE_WORK_ORDER = 'completeWorkOrder',
  CANCEL_WORK_ORDER = 'cancelWorkOrder',
  
  // Платежи
  PAYMENT_MADE = 'paymentMade',
  PAYMENT_FAILED = 'paymentFailed',
  
  // Счета
  CREATE_INVOICE = 'createInvoice',
  ISSUE_INVOICE = 'issueInvoice',
  PAY_INVOICE = 'payInvoice',
  
  // Другие
  LOGIN = 'login',
  VIEW_DASHBOARD = 'viewDashboard',
}

export interface IAnalyticsEvent extends Document {
  organizationId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  action: AnalyticsAction;
  entityType?: string; // workOrder, appointment, invoice, payment
  entityId?: mongoose.Types.ObjectId;
  metadata?: {
    [key: string]: any;
  };
  timestamp: Date;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AnalyticsAction),
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      trim: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AnalyticsEventSchema.index({ organizationId: 1, action: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, action: 1, timestamp: -1 });
AnalyticsEventSchema.index({ clientId: 1, action: 1, timestamp: -1 });
AnalyticsEventSchema.index({ timestamp: -1 });
AnalyticsEventSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
