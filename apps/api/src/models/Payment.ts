import mongoose, { Schema, Document } from 'mongoose';
import { PaymentStatus, PaymentMethod, PaymentProvider } from '../types';

export interface IPayment extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider?: PaymentProvider;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
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
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD', trim: true },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    transactionId: { type: String, trim: true, index: true },
    paidAt: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ organizationId: 1, branchId: 1, status: 1 });
PaymentSchema.index({ organizationId: 1, invoiceId: 1 });
PaymentSchema.index({ organizationId: 1, workOrderId: 1 });
PaymentSchema.index({ organizationId: 1, clientId: 1 });
PaymentSchema.index({ paidAt: 1, status: 1 });
PaymentSchema.index({ transactionId: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
