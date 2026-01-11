import mongoose, { Schema, Document } from 'mongoose';

export interface IPart extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  supplierId?: mongoose.Types.ObjectId;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  location?: string;
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
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    name: { type: String, required: true, trim: true },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    description: String,
    category: String,
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      index: true,
    },
    cost: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'pcs' },
    location: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

PartSchema.index({ organizationId: 1, branchId: 1, sku: 1 }, { unique: true });
PartSchema.index({ organizationId: 1, isActive: 1 });
PartSchema.index({ organizationId: 1, stock: 1 });

export default mongoose.model<IPart>('Part', PartSchema);
