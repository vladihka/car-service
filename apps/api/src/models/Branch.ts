import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
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
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

BranchSchema.index({ organizationId: 1, name: 1 });
BranchSchema.index({ organizationId: 1, isActive: 1 });

export default mongoose.model<IBranch>('Branch', BranchSchema);
