import mongoose, { Schema, Document } from 'mongoose';
import { AppointmentStatus } from '../types';

export interface IAppointment extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  car: {
    brand: string;
    model: string;
    year: number;
    vin?: string;
  };
  services: mongoose.Types.ObjectId[]; // Array of Service IDs
  preferredDate: Date;
  status: AppointmentStatus;
  assignedMechanicId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
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
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    car: {
      brand: { type: String, required: true, trim: true },
      model: { type: String, required: true, trim: true },
      year: { type: Number, required: true, min: 1900, max: new Date().getFullYear() + 1 },
      vin: { type: String, trim: true, uppercase: true },
    },
    services: [{
      type: Schema.Types.ObjectId,
      ref: 'Service',
    }],
    preferredDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.PENDING,
      index: true,
    },
    assignedMechanicId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

AppointmentSchema.index({ organizationId: 1, branchId: 1, status: 1 });
AppointmentSchema.index({ organizationId: 1, clientId: 1 });
AppointmentSchema.index({ assignedMechanicId: 1, status: 1 });
AppointmentSchema.index({ preferredDate: 1, status: 1 });

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
