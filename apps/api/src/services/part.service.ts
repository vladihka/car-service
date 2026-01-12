/**
 * Сервис для работы с запчастями
 * Реализует бизнес-логику для управления запчастями
 */

import Part, { IPart } from '../models/Part';
import { AuthRequest } from '../middlewares/auth.middleware';
import { tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../utils/errors';
import { CreatePartDto, UpdatePartDto, PartResponse } from '../types/part.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class PartService {
  /**
   * Создать новую запчасть
   * Owner и Manager могут создавать запчасти
   */
  async create(data: CreatePartDto, user: AuthRequest['user']): Promise<PartResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Manager и SuperAdmin могут создавать запчасти
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания запчастей');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверить уникальность SKU в рамках организации
    const existingPart = await Part.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      sku: data.sku.trim(),
    });

    if (existingPart) {
      throw new ConflictError(`Запчасть с артикулом ${data.sku} уже существует`);
    }

    // Создать запчасть
    const part = new Part({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      name: data.name.trim(),
      sku: data.sku.trim(),
      manufacturer: data.manufacturer?.trim(),
      category: data.category?.trim(),
      price: data.price,
      cost: data.cost,
      quantity: data.quantity || 0,
      minQuantity: data.minQuantity || 0,
      reservedQuantity: 0,
      unit: data.unit || 'шт',
      location: data.location?.trim(),
      description: data.description?.trim(),
      isActive: true,
    });

    await part.save();

    logger.info(`Part created: ${part.sku} by ${user.userId}`);

    return this.mapToResponse(part);
  }

  /**
   * Получить список запчастей
   */
  async findAll(user: AuthRequest['user'], filters?: { category?: string; lowStock?: boolean; search?: string }): Promise<PartResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter = tenantFilter(user, { isActive: true });

    // Применить дополнительные фильтры
    if (filters?.category) {
      filter.category = filters.category;
    }
    if (filters?.lowStock) {
      // Используем агрегацию для фильтрации по lowStock
      // Это сложнее, поэтому можем сделать отдельный запрос
    }
    if (filters?.search) {
      filter.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
        { manufacturer: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const parts = await Part.find(filter).sort({ name: 1 });

    let result = parts.map(part => this.mapToResponse(part));

    // Фильтр lowStock
    if (filters?.lowStock) {
      result = result.filter(part => part.isLowStock);
    }

    return result;
  }

  /**
   * Получить запчасть по ID
   */
  async findById(id: string, user: AuthRequest['user']): Promise<PartResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Запчасть не найдена');
    }

    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const part = await Part.findOne(filter);

    if (!part) {
      throw new NotFoundError('Запчасть не найдена');
    }

    return this.mapToResponse(part);
  }

  /**
   * Обновить запчасть
   */
  async update(id: string, data: UpdatePartDto, user: AuthRequest['user']): Promise<PartResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Manager и SuperAdmin могут обновлять запчасти
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для обновления запчастей');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Запчасть не найдена');
    }

    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const part = await Part.findOne(filter);

    if (!part) {
      throw new NotFoundError('Запчасть не найдена');
    }

    // Проверить уникальность SKU, если он изменяется
    if (data.sku && data.sku.trim() !== part.sku) {
      const existingPart = await Part.findOne({
        organizationId: part.organizationId,
        sku: data.sku.trim(),
        _id: { $ne: part._id },
      });

      if (existingPart) {
        throw new ConflictError(`Запчасть с артикулом ${data.sku} уже существует`);
      }
    }

    // Обновить поля
    if (data.name !== undefined) part.name = data.name.trim();
    if (data.sku !== undefined) part.sku = data.sku.trim();
    if (data.manufacturer !== undefined) part.manufacturer = data.manufacturer?.trim();
    if (data.category !== undefined) part.category = data.category?.trim();
    if (data.price !== undefined) part.price = data.price;
    if (data.cost !== undefined) part.cost = data.cost;
    if (data.quantity !== undefined) part.quantity = data.quantity;
    if (data.minQuantity !== undefined) part.minQuantity = data.minQuantity;
    if (data.unit !== undefined) part.unit = data.unit;
    if (data.location !== undefined) part.location = data.location?.trim();
    if (data.description !== undefined) part.description = data.description?.trim();

    await part.save();

    logger.info(`Part updated: ${part.sku} by ${user.userId}`);

    return this.mapToResponse(part);
  }

  /**
   * Удалить запчасть (soft delete)
   */
  async delete(id: string, user: AuthRequest['user']): Promise<void> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner и SuperAdmin могут удалять запчасти
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для удаления запчастей');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Запчасть не найдена');
    }

    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const part = await Part.findOne(filter);

    if (!part) {
      throw new NotFoundError('Запчасть не найдена');
    }

    // Soft delete
    part.isActive = false;
    await part.save();

    logger.info(`Part deleted: ${part.sku} by ${user.userId}`);
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(part: IPart): PartResponse {
    return {
      id: part._id.toString(),
      organizationId: part.organizationId.toString(),
      name: part.name,
      sku: part.sku,
      manufacturer: part.manufacturer,
      category: part.category,
      price: part.price,
      cost: part.cost,
      quantity: part.quantity,
      minQuantity: part.minQuantity,
      reservedQuantity: part.reservedQuantity,
      availableQuantity: part.quantity - part.reservedQuantity,
      unit: part.unit || 'шт',
      location: part.location,
      description: part.description,
      isActive: part.isActive,
      isLowStock: part.quantity <= part.minQuantity,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,
    };
  }
}

export default new PartService();
