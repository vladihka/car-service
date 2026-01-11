import mongoose, { Schema, Document } from 'mongoose';
import { InvoiceStatus } from '../types';

export interface IInvoice extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paidAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
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
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      index: true,
    },
    issueDate: { type: Date, default: Date.now, required: true },
    dueDate: { type: Date, required: true },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
    }],
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, min: 0 },
    discount: { type: Number, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    notes: String,
  },
  {
    timestamps: true,
  }
);

InvoiceSchema.index({ organizationId: 1, branchId: 1, status: 1 });
InvoiceSchema.index({ organizationId: 1, clientId: 1 });
InvoiceSchema.index({ issueDate: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });

// Auto-generate invoice number
InvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Invoice').countDocuments({
      issueDate: { $gte: new Date(year, 0, 1) },
    });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
