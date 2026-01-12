import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  basePrice: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
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
    description: String,
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
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

ServiceSchema.index({ organizationId: 1, name: 1 }, { unique: true });
ServiceSchema.index({ organizationId: 1, isActive: 1 });

export default mongoose.model<IService>('Service', ServiceSchema);
