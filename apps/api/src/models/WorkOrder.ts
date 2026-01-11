import mongoose, { Schema, Document } from 'mongoose';
import { WorkOrderStatus } from '../types';

export interface IWorkOrder extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  carId: mongoose.Types.ObjectId;
  workOrderNumber: string;
  status: WorkOrderStatus;
  description: string;
  estimatedCost?: number;
  actualCost?: number;
  estimatedCompletion?: Date;
  completedAt?: Date;
  assignedTo?: mongoose.Types.ObjectId;
  parts: Array<{
    partId: mongoose.Types.ObjectId;
    quantity: number;
    unitPrice: number;
  }>;
  labor: Array<{
    description: string;
    hours: number;
    rate: number;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkOrderSchema = new Schema<IWorkOrder>(
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
    carId: {
      type: Schema.Types.ObjectId,
      ref: 'Car',
      required: true,
      index: true,
    },
    workOrderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(WorkOrderStatus),
      default: WorkOrderStatus.PENDING,
      index: true,
    },
    description: { type: String, required: true },
    estimatedCost: { type: Number, min: 0 },
    actualCost: { type: Number, min: 0 },
    estimatedCompletion: Date,
    completedAt: Date,
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    parts: [{
      partId: { type: Schema.Types.ObjectId, ref: 'Part' },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
    }],
    labor: [{
      description: { type: String, required: true },
      hours: { type: Number, required: true, min: 0 },
      rate: { type: Number, required: true, min: 0 },
    }],
    notes: String,
  },
  {
    timestamps: true,
  }
);

WorkOrderSchema.index({ organizationId: 1, branchId: 1, status: 1 });
WorkOrderSchema.index({ organizationId: 1, clientId: 1 });
WorkOrderSchema.index({ assignedTo: 1, status: 1 });

// Auto-generate work order number
WorkOrderSchema.pre('save', async function (next) {
  if (!this.workOrderNumber) {
    const count = await mongoose.model('WorkOrder').countDocuments();
    this.workOrderNumber = `WO-${Date.now()}-${count + 1}`;
  }
  next();
});

export default mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);
