import mongoose, { Schema, Document } from 'mongoose';

export interface ICar extends Document {
  organizationId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  vin: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  licensePlate?: string;
  mileage?: number;
  serviceHistory: Array<{
    date: Date;
    description: string;
    mileage: number;
    cost?: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CarSchema = new Schema<ICar>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    vin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1900, max: new Date().getFullYear() + 1 },
    color: String,
    licensePlate: { type: String, trim: true, uppercase: true },
    mileage: { type: Number, min: 0 },
    serviceHistory: [{
      date: { type: Date, default: Date.now },
      description: String,
      mileage: Number,
      cost: Number,
    }],
  },
  {
    timestamps: true,
  }
);

CarSchema.index({ organizationId: 1, clientId: 1 });
CarSchema.index({ vin: 1 });
CarSchema.index({ organizationId: 1, licensePlate: 1 });

export default mongoose.model<ICar>('Car', CarSchema);
