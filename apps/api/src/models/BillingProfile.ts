/**
 * Модель биллинг-профилей (Billing Profiles)
 * Хранит информацию о настройках биллинга для организаций
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IBillingProfile extends Document {
  organizationId: mongoose.Types.ObjectId;
  legalName: string; // Юридическое название
  vatNumber?: string; // Номер VAT/НДС
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  country?: string;
  currency: string; // Валюта по умолчанию
  defaultTaxId?: mongoose.Types.ObjectId; // ID налога по умолчанию
  paymentTerms: number; // Срок оплаты в днях
  invoicePrefix: string; // Префикс для номеров счетов (например, "INV")
  nextInvoiceNumber: number; // Следующий номер счета
  createdAt: Date;
  updatedAt: Date;
}

const BillingProfileSchema = new Schema<IBillingProfile>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true, // Одна организация = один профиль
      index: true,
    },
    legalName: {
      type: String,
      required: true,
      trim: true,
    },
    vatNumber: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    country: {
      type: String,
      trim: true,
      uppercase: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    defaultTaxId: {
      type: Schema.Types.ObjectId,
      ref: 'Tax',
      index: true,
    },
    paymentTerms: {
      type: Number,
      required: true,
      default: 30,
      min: 0,
    },
    invoicePrefix: {
      type: String,
      required: true,
      default: 'INV',
      trim: true,
      uppercase: true,
    },
    nextInvoiceNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

BillingProfileSchema.index({ organizationId: 1 });
BillingProfileSchema.index({ defaultTaxId: 1 });

export default mongoose.model<IBillingProfile>('BillingProfile', BillingProfileSchema);
