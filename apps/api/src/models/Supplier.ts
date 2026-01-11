import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    contactPerson: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    paymentTerms: String,
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

SupplierSchema.index({ organizationId: 1, name: 1 });
SupplierSchema.index({ organizationId: 1, isActive: 1 });

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);
