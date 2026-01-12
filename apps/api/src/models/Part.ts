/**
 * Модель запчастей (Parts)
 * Хранит информацию о запчастях на складе
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IPart extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  sku: string; // Артикул (Stock Keeping Unit)
  manufacturer?: string;
  category?: string;
  price: number; // Цена продажи
  cost: number; // Себестоимость
  quantity: number; // Текущее количество
  minQuantity: number; // Минимальный остаток (для алертов)
  reservedQuantity: number; // Зарезервированное количество
  unit?: string; // Единица измерения (шт, кг, литр и т.д.)
  location?: string; // Место на складе
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PartSchema = new Schema<IPart>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: 'шт',
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Составной индекс для уникальности SKU в рамках организации
PartSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
PartSchema.index({ organizationId: 1, category: 1 });
PartSchema.index({ organizationId: 1, isActive: 1, quantity: 1 });
PartSchema.index({ organizationId: 1, minQuantity: 1, quantity: 1 }); // Для поиска low stock

export default mongoose.model<IPart>('Part', PartSchema);
