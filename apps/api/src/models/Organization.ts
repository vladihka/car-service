import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionStatus, SubscriptionPlan } from '../types';

export interface IOrganization extends Document {
  name: string;
  ownerId: mongoose.Types.ObjectId; // Владелец организации (User с ролью Owner)
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    startDate: Date;
    endDate?: Date;
    maxBranches: number;
    maxUsers: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    subscription: {
      plan: {
        type: String,
        enum: Object.values(SubscriptionPlan),
        default: SubscriptionPlan.STARTER,
      },
      status: {
        type: String,
        enum: Object.values(SubscriptionStatus),
        default: SubscriptionStatus.TRIAL,
      },
      startDate: { type: Date, default: Date.now },
      endDate: Date,
      maxBranches: { type: Number, default: 1 },
      maxUsers: { type: Number, default: 5 },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ email: 1 });
OrganizationSchema.index({ isActive: 1 });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
