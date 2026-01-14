/**
 * Сервис для работы с биллинг-профилями
 * Реализует бизнес-логику для управления биллинг-профилями
 */

import BillingProfile, { IBillingProfile } from '../models/BillingProfile';
import Tax from '../models/Tax';
import Organization from '../models/Organization';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import {
  CreateBillingProfileDto,
  UpdateBillingProfileDto,
  BillingProfileResponse,
} from '../types/billing-profile.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class BillingProfileService {
  /**
   * Создать или обновить биллинг-профиль для организации
   */
  async createOrUpdate(
    data: CreateBillingProfileDto | UpdateBillingProfileDto,
    user: AuthRequest['user']
  ): Promise<BillingProfileResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner и Accountant могут управлять биллинг-профилем
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.ACCOUNTANT &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для управления биллинг-профилем');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверить, что организация существует
    const organization = await Organization.findById(user.organizationId);
    if (!organization) {
      throw new NotFoundError('Организация не найдена');
    }

    // Проверить налог, если указан
    if (data.defaultTaxId) {
      const tax = await Tax.findOne({
        _id: new mongoose.Types.ObjectId(data.defaultTaxId),
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        isActive: true,
      });

      if (!tax) {
        throw new NotFoundError('Налог не найден');
      }
    }

    // Найти существующий профиль или создать новый
    let profile = await BillingProfile.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    });

    if (profile) {
      // Обновить существующий профиль
      if (data.legalName !== undefined) profile.legalName = data.legalName.trim();
      if (data.vatNumber !== undefined) profile.vatNumber = data.vatNumber?.trim();
      if (data.address !== undefined) {
        profile.address = data.address
          ? {
              street: data.address.street?.trim(),
              city: data.address.city?.trim(),
              state: data.address.state?.trim(),
              zipCode: data.address.zipCode?.trim(),
              country: data.address.country?.trim(),
            }
          : undefined;
      }
      if (data.country !== undefined) profile.country = data.country?.trim().toUpperCase();
      if (data.currency !== undefined) profile.currency = data.currency.trim().toUpperCase();
      if (data.defaultTaxId !== undefined) {
        profile.defaultTaxId = data.defaultTaxId
          ? new mongoose.Types.ObjectId(data.defaultTaxId)
          : undefined;
      }
      if (data.paymentTerms !== undefined) profile.paymentTerms = data.paymentTerms;
      if (data.invoicePrefix !== undefined) profile.invoicePrefix = data.invoicePrefix.trim().toUpperCase();

      await profile.save();
      logger.info(`Billing profile updated for organization ${user.organizationId} by ${user.userId}`);
    } else {
      // Создать новый профиль
      if (!data.legalName) {
        throw new ForbiddenError('Юридическое название обязательно при создании профиля');
      }
      profile = new BillingProfile({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        legalName: data.legalName.trim(),
        vatNumber: data.vatNumber?.trim(),
        address: data.address
          ? {
              street: data.address.street?.trim(),
              city: data.address.city?.trim(),
              state: data.address.state?.trim(),
              zipCode: data.address.zipCode?.trim(),
              country: data.address.country?.trim(),
            }
          : undefined,
        country: data.country?.trim().toUpperCase(),
        currency: data.currency?.trim().toUpperCase() || 'USD',
        defaultTaxId: data.defaultTaxId
          ? new mongoose.Types.ObjectId(data.defaultTaxId)
          : undefined,
        paymentTerms: data.paymentTerms || 30,
        invoicePrefix: data.invoicePrefix?.trim().toUpperCase() || 'INV',
        nextInvoiceNumber: 1,
      });

      await profile.save();
      logger.info(`Billing profile created for organization ${user.organizationId} by ${user.userId}`);
    }

    return this.mapToResponse(profile);
  }

  /**
   * Получить биллинг-профиль организации
   */
  async getProfile(user: AuthRequest['user']): Promise<BillingProfileResponse | null> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверка прав доступа
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.ACCOUNTANT &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для просмотра биллинг-профиля');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    const profile = await BillingProfile.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    });

    if (!profile) {
      return null;
    }

    return this.mapToResponse(profile);
  }

  /**
   * Генерировать следующий номер счета
   */
  async generateInvoiceNumber(organizationId: string): Promise<string> {
    const profile = await BillingProfile.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    if (!profile) {
      // Если профиля нет, использовать дефолтный формат
      const year = new Date().getFullYear();
      const count = await mongoose.model('Invoice').countDocuments({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: new Date(year, 0, 1) },
      });
      return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    const invoiceNumber = `${profile.invoicePrefix}-${profile.nextInvoiceNumber}`;
    
    // Увеличить счетчик
    profile.nextInvoiceNumber += 1;
    await profile.save();

    return invoiceNumber;
  }

  /**
   * Получить налог по умолчанию из профиля
   */
  async getDefaultTax(organizationId: string): Promise<mongoose.Types.ObjectId | null> {
    const profile = await BillingProfile.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    return profile?.defaultTaxId || null;
  }

  /**
   * Вычислить итоговые суммы с налогами
   */
  calculateTotals(
    subtotal: number,
    taxRate: number | null
  ): { subtotal: number; taxAmount: number; total: number } {
    const taxAmount = taxRate ? Math.round((subtotal * taxRate / 100) * 100) / 100 : 0;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount,
      total,
    };
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(profile: IBillingProfile): BillingProfileResponse {
    return {
      id: profile._id.toString(),
      organizationId: profile.organizationId.toString(),
      legalName: profile.legalName,
      vatNumber: profile.vatNumber,
      address: profile.address,
      country: profile.country,
      currency: profile.currency,
      defaultTaxId: profile.defaultTaxId?.toString(),
      paymentTerms: profile.paymentTerms,
      invoicePrefix: profile.invoicePrefix,
      nextInvoiceNumber: profile.nextInvoiceNumber,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}

export default new BillingProfileService();
