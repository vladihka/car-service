/**
 * Сервис для работы с поставщиками
 * Реализует бизнес-логику для управления поставщиками
 */

import Supplier, { ISupplier } from '../models/Supplier';
import PurchaseOrder from '../models/PurchaseOrder';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../utils/errors';
import { CreateSupplierDto, UpdateSupplierDto, GetSuppliersQueryDto, SupplierResponse, SupplierListResponse } from '../types/supplier.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class SupplierService {
  /**
   * Создать нового поставщика
   * Owner, Manager могут создавать поставщиков
   */
  async create(data: CreateSupplierDto, user: AuthRequest['user']): Promise<SupplierResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверка прав доступа
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для создания поставщиков');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверить уникальность имени в рамках организации
    const existingSupplier = await Supplier.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      name: data.name.trim(),
      isActive: true,
    });

    if (existingSupplier) {
      throw new ConflictError(`Поставщик с названием "${data.name}" уже существует`);
    }

    // Создать поставщика
    const supplier = new Supplier({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      name: data.name.trim(),
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim(),
      contactPerson: data.contactPerson?.trim(),
      address: data.address
        ? {
            street: data.address.street?.trim(),
            city: data.address.city?.trim(),
            state: data.address.state?.trim(),
            zipCode: data.address.zipCode?.trim(),
            country: data.address.country?.trim(),
          }
        : undefined,
      paymentTerms: data.paymentTerms?.trim(),
      notes: data.notes?.trim(),
      isActive: true,
    });

    await supplier.save();

    logger.info(`Supplier created: ${supplier.name} by ${user.userId}`);

    return this.mapToResponse(supplier);
  }

  /**
   * Получить список поставщиков с фильтрацией и пагинацией
   */
  async findAll(user: AuthRequest['user'], query: GetSuppliersQueryDto): Promise<SupplierListResponse> {
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
      throw new ForbiddenError('Недостаточно прав для просмотра поставщиков');
    }

    const filter: any = tenantFilter(user, {});

    // Поиск по названию
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
        { contactPerson: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Фильтр по названию
    if (query.name) {
      filter.name = { $regex: query.name, $options: 'i' };
    }

    // Фильтр по статусу
    if (query.status === 'active') {
      filter.isActive = true;
    } else if (query.status === 'inactive') {
      filter.isActive = false;
    }

    // Пагинация
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Получить общее количество
    const total = await Supplier.countDocuments(filter);

    // Получить поставщиков
    const suppliers = await Supplier.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    // Получить статистику для каждого поставщика
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier) => {
        const stats = await this.getSupplierStats(supplier._id.toString(), user.organizationId!);
        return { ...this.mapToResponse(supplier), ...stats };
      })
    );

    return {
      suppliers: suppliersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получить поставщика по ID
   */
  async findById(id: string, user: AuthRequest['user']): Promise<SupplierResponse> {
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
      throw new ForbiddenError('Недостаточно прав для просмотра поставщиков');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Поставщик не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const supplier = await Supplier.findOne(filter);

    if (!supplier) {
      throw new NotFoundError('Поставщик не найден');
    }

    // Получить статистику
    const stats = await this.getSupplierStats(id, user.organizationId!);

    return { ...this.mapToResponse(supplier), ...stats };
  }

  /**
   * Обновить поставщика
   */
  async update(id: string, data: UpdateSupplierDto, user: AuthRequest['user']): Promise<SupplierResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверка прав доступа
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для обновления поставщиков');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Поставщик не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const supplier = await Supplier.findOne(filter);

    if (!supplier) {
      throw new NotFoundError('Поставщик не найден');
    }

    // Проверить уникальность имени (если изменяется)
    if (data.name && data.name.trim() !== supplier.name) {
      const existingSupplier = await Supplier.findOne({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        name: data.name.trim(),
        isActive: true,
        _id: { $ne: supplier._id },
      });

      if (existingSupplier) {
        throw new ConflictError(`Поставщик с названием "${data.name}" уже существует`);
      }
    }

    // Обновить поля
    if (data.name !== undefined) {
      supplier.name = data.name.trim();
    }
    if (data.email !== undefined) {
      supplier.email = data.email?.trim() || undefined;
    }
    if (data.phone !== undefined) {
      supplier.phone = data.phone?.trim();
    }
    if (data.contactPerson !== undefined) {
      supplier.contactPerson = data.contactPerson?.trim();
    }
    if (data.address !== undefined) {
      supplier.address = data.address
        ? {
            street: data.address.street?.trim(),
            city: data.address.city?.trim(),
            state: data.address.state?.trim(),
            zipCode: data.address.zipCode?.trim(),
            country: data.address.country?.trim(),
          }
        : undefined;
    }
    if (data.paymentTerms !== undefined) {
      supplier.paymentTerms = data.paymentTerms?.trim();
    }
    if (data.notes !== undefined) {
      supplier.notes = data.notes?.trim();
    }

    await supplier.save();

    logger.info(`Supplier updated: ${supplier.name} by ${user.userId}`);

    // Получить статистику
    const stats = await this.getSupplierStats(id, user.organizationId!);

    return { ...this.mapToResponse(supplier), ...stats };
  }

  /**
   * Удалить поставщика (soft delete)
   */
  async delete(id: string, user: AuthRequest['user']): Promise<void> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner и Manager могут удалять поставщиков
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для удаления поставщиков');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Поставщик не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const supplier = await Supplier.findOne(filter);

    if (!supplier) {
      throw new NotFoundError('Поставщик не найден');
    }

    // Проверить, есть ли связанные заказы
    const hasPurchaseOrders = await PurchaseOrder.countDocuments({
      supplierId: supplier._id,
      organizationId: supplier.organizationId,
    });

    if (hasPurchaseOrders > 0) {
      throw new BadRequestError(
        'Невозможно удалить поставщика, так как у него есть связанные заказы (Purchase Orders). Используйте деактивацию (status: inactive)'
      );
    }

    // Soft delete - установить isActive = false
    supplier.isActive = false;
    await supplier.save();

    logger.info(`Supplier deleted (soft): ${supplier.name} by ${user.userId}`);
  }

  /**
   * Получить статистику поставщика
   */
  private async getSupplierStats(supplierId: string, organizationId: string): Promise<{
    purchaseOrdersCount: number;
  }> {
    const purchaseOrdersCount = await PurchaseOrder.countDocuments({
      supplierId: new mongoose.Types.ObjectId(supplierId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    return {
      purchaseOrdersCount,
    };
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(supplier: ISupplier): SupplierResponse {
    return {
      id: supplier._id.toString(),
      organizationId: supplier.organizationId.toString(),
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      contactPerson: supplier.contactPerson,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms,
      notes: supplier.notes,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}

export default new SupplierService();
