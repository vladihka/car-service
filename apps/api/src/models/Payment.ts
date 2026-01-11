import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  method: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  reference?: string;
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
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now, required: true },
    method: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'check', 'other'],
      required: true,
    },
    reference: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ organizationId: 1, branchId: 1 });
PaymentSchema.index({ organizationId: 1, invoiceId: 1 });
PaymentSchema.index({ organizationId: 1, clientId: 1 });
PaymentSchema.index({ paymentDate: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
