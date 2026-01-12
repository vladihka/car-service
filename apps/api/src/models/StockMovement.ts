/**
 * Модель движений по складу (Stock Movements)
 * Хранит историю всех операций со складом
 */

import mongoose, { Schema, Document } from 'mongoose';
import { StockMovementType } from '../types';

export interface IStockMovement extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  partId: mongoose.Types.ObjectId;
  type: StockMovementType;
  quantity: number; // Положительное или отрицательное число
  reason?: string; // Причина движения
  relatedWorkOrderId?: mongoose.Types.ObjectId; // Связанный заказ на ремонт
  relatedPurchaseOrderId?: mongoose.Types.ObjectId; // Связанный заказ поставщику
  createdBy: mongoose.Types.ObjectId; // Кто создал движение
  reference?: string; // Референс (номер документа, накладной и т.д.)
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
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
    partId: {
      type: Schema.Types.ObjectId,
      ref: 'Part',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(StockMovementType),
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    relatedWorkOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      index: true,
    },
    relatedPurchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

StockMovementSchema.index({ organizationId: 1, partId: 1, createdAt: -1 });
StockMovementSchema.index({ organizationId: 1, type: 1, createdAt: -1 });
StockMovementSchema.index({ relatedWorkOrderId: 1 });
StockMovementSchema.index({ relatedPurchaseOrderId: 1 });
StockMovementSchema.index({ createdAt: -1 });

export default mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
