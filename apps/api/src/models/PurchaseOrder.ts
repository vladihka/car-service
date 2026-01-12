/**
 * Модель заказов поставщикам (Purchase Orders)
 * Хранит информацию о заказах запчастей у поставщиков
 */

import mongoose, { Schema, Document } from 'mongoose';
import { PurchaseOrderStatus } from '../types';

export interface IPurchaseOrder extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  orderNumber: string;
  status: PurchaseOrderStatus;
  items: Array<{
    partId: mongoose.Types.ObjectId;
    sku: string;
    name: string;
    quantity: number;
    price: number; // Цена за единицу
    receivedQuantity?: number; // Полученное количество
  }>;
  totalAmount: number;
  notes?: string;
  orderedAt?: Date;
  expectedDeliveryDate?: Date;
  receivedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
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
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PurchaseOrderStatus),
      default: PurchaseOrderStatus.DRAFT,
      index: true,
    },
    items: [{
      partId: {
        type: Schema.Types.ObjectId,
        ref: 'Part',
        required: true,
      },
      sku: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      receivedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },
    }],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: String,
    orderedAt: Date,
    expectedDeliveryDate: Date,
    receivedAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PurchaseOrderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ supplierId: 1, status: 1 });
PurchaseOrderSchema.index({ createdAt: -1 });

// Auto-generate order number
PurchaseOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PurchaseOrder').countDocuments({
      createdAt: { $gte: new Date(year, 0, 1) },
    });
    this.orderNumber = `PO-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
