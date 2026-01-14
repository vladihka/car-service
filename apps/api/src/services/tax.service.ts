/**
 * Сервис для работы с налогами
 * Реализует бизнес-логику для управления налогами
 */

import Tax, { ITax } from '../models/Tax';
import { AuthRequest } from '../middlewares/auth.middleware';
import { tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { CreateTaxDto, UpdateTaxDto, TaxResponse } from '../types/tax.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class TaxService {
  /**
   * Получить налог по умолчанию для организации
   */
  async getDefaultTax(organizationId: string): Promise<ITax | null> {
    const tax = await Tax.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      isActive: true,
      isDefault: true,
    });

    return tax;
  }

  /**
   * Вычислить налог от суммы
   */
  calculateTax(amount: number, rate: number): number {
    return Math.round((amount * rate / 100) * 100) / 100; // Округление до 2 знаков
  }

  /**
   * Создать новый налог
   */
  async create(data: CreateTaxDto, user: AuthRequest['user']): Promise<TaxResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Accountant и SuperAdmin могут создавать налоги
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.ACCOUNTANT &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для создания налогов');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Если это налог по умолчанию, снять флаг isDefault с других
    if (data.isDefault) {
      await Tax.updateMany(
        {
          organizationId: new mongoose.Types.ObjectId(user.organizationId),
          isDefault: true,
        },
        {
          isDefault: false,
        }
      );
    }

    const tax = new Tax({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      name: data.name.trim(),
      rate: data.rate,
      country: data.country?.trim().toUpperCase(),
      isActive: true,
      isDefault: data.isDefault || false,
      description: data.description?.trim(),
    });

    await tax.save();

    logger.info(`Tax created: ${tax._id} by ${user.userId}`);

    return this.mapToResponse(tax);
  }

  /**
   * Получить список налогов
   */
  async findAll(user: AuthRequest['user']): Promise<TaxResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter = tenantFilter(user, { isActive: true });
    const taxes = await Tax.find(filter).sort({ isDefault: -1, name: 1 });

    return taxes.map(tax => this.mapToResponse(tax));
  }

  /**
   * Получить налог по ID
   */
  async findById(id: string, user: AuthRequest['user']): Promise<TaxResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Налог не найден');
    }

    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const tax = await Tax.findOne(filter);

    if (!tax) {
      throw new NotFoundError('Налог не найден');
    }

    return this.mapToResponse(tax);
  }

  /**
   * Обновить налог
   */
  async update(id: string, data: UpdateTaxDto, user: AuthRequest['user']): Promise<TaxResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Manager и SuperAdmin могут обновлять налоги
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для обновления налогов');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Налог не найден');
    }

    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const tax = await Tax.findOne(filter);

    if (!tax) {
      throw new NotFoundError('Налог не найден');
    }

    // Если это налог по умолчанию, снять флаг isDefault с других
    if (data.isDefault && !tax.isDefault) {
      await Tax.updateMany(
        {
          organizationId: tax.organizationId,
          isDefault: true,
          _id: { $ne: tax._id },
        },
        {
          isDefault: false,
        }
      );
    }

    // Обновить поля
    if (data.name !== undefined) tax.name = data.name.trim();
    if (data.rate !== undefined) tax.rate = data.rate;
    if (data.country !== undefined) tax.country = data.country?.trim().toUpperCase();
    if (data.isDefault !== undefined) tax.isDefault = data.isDefault;
    if (data.description !== undefined) tax.description = data.description?.trim();

    await tax.save();

    logger.info(`Tax updated: ${tax._id} by ${user.userId}`);

    return this.mapToResponse(tax);
  }

  /**
   * Удалить налог (soft delete)
   */
  async delete(id: string, user: AuthRequest['user']): Promise<void> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner и SuperAdmin могут удалять налоги
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для удаления налогов');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Налог не найден');
    }

    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const tax = await Tax.findOne(filter);

    if (!tax) {
      throw new NotFoundError('Налог не найден');
    }

    // Soft delete
    tax.isActive = false;
    await tax.save();

    logger.info(`Tax deleted: ${tax._id} by ${user.userId}`);
  }

  /**
   * Назначить налог по умолчанию
   */
  async setDefaultTax(taxId: string, user: AuthRequest['user']): Promise<TaxResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Accountant и SuperAdmin могут назначать налог по умолчанию
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.ACCOUNTANT &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для назначения налога по умолчанию');
    }

    if (!mongoose.Types.ObjectId.isValid(taxId)) {
      throw new NotFoundError('Налог не найден');
    }

    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(taxId) });
    const tax = await Tax.findOne(filter);

    if (!tax) {
      throw new NotFoundError('Налог не найден');
    }

    if (!tax.isActive) {
      throw new ForbiddenError('Нельзя назначить неактивный налог по умолчанию');
    }

    // Снять флаг isDefault с других налогов
    await Tax.updateMany(
      {
        organizationId: tax.organizationId,
        isDefault: true,
        _id: { $ne: tax._id },
      },
      {
        isDefault: false,
      }
    );

    // Установить флаг isDefault для выбранного налога
    tax.isDefault = true;
    await tax.save();

    logger.info(`Tax set as default: ${tax._id} by ${user.userId}`);

    return this.mapToResponse(tax);
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(tax: ITax): TaxResponse {
    return {
      id: tax._id.toString(),
      organizationId: tax.organizationId.toString(),
      name: tax.name,
      rate: tax.rate,
      country: tax.country,
      isActive: tax.isActive,
      isDefault: tax.isDefault,
      description: tax.description,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    };
  }
}

export default new TaxService();
