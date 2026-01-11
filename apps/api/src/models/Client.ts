import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
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
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

ClientSchema.index({ organizationId: 1, branchId: 1 });
ClientSchema.index({ organizationId: 1, phone: 1 });
ClientSchema.index({ organizationId: 1, email: 1 });

export default mongoose.model<IClient>('Client', ClientSchema);
