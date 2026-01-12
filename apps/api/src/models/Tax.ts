/**
 * Модель налогов (Taxes)
 * Хранит информацию о налогах для организации
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITax extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string; // Название налога (НДС, налог с продаж и т.д.)
  rate: number; // Ставка в процентах (например, 20 для 20%)
  isActive: boolean;
  isDefault: boolean; // Использовать по умолчанию
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaxSchema = new Schema<ITax>(
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
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    description: String,
  },
  {
    timestamps: true,
  }
);

TaxSchema.index({ organizationId: 1, isActive: 1, isDefault: 1 });
TaxSchema.index({ organizationId: 1, isActive: 1 });

export default mongoose.model<ITax>('Tax', TaxSchema);
