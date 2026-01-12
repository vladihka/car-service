/**
 * Сервис для работы с заказами поставщикам
 * Реализует бизнес-логику для управления заказами поставщикам
 */

import PurchaseOrder, { IPurchaseOrder } from '../models/PurchaseOrder';
import Part from '../models/Part';
import Supplier from '../models/Supplier';
import stockService from './stock.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  PurchaseOrderResponse,
} from '../types/purchase-order.dto';
import { PurchaseOrderStatus, StockMovementType, UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class PurchaseOrderService {
  /**
   * Создать заказ поставщику
   * Owner и Manager могут создавать заказы
   */
  async create(data: CreatePurchaseOrderDto, user: AuthRequest['user']): Promise<PurchaseOrderResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Manager и SuperAdmin могут создавать заказы
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания заказов поставщикам');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверить, что поставщик существует
    const supplier = await Supplier.findById(data.supplierId);
    if (!supplier) {
      throw new NotFoundError('Поставщик не найден');
    }

    // Проверить, что поставщик принадлежит организации
    if (supplier.organizationId.toString() !== user.organizationId) {
      throw new ForbiddenError('Поставщик не принадлежит вашей организации');
    }

    // Проверить все запчасти
    const items: Array<{
      partId: mongoose.Types.ObjectId;
      sku: string;
      name: string;
      quantity: number;
      price: number;
      receivedQuantity: number;
    }> = [];

    let totalAmount = 0;

    for (const item of data.items) {
      const part = await Part.findById(item.partId);
      if (!part) {
        throw new NotFoundError(`Запчасть ${item.partId} не найдена`);
      }

      if (part.organizationId.toString() !== user.organizationId) {
        throw new ForbiddenError(`Запчасть ${item.partId} не принадлежит вашей организации`);
      }

      items.push({
        partId: part._id,
        sku: part.sku,
        name: part.name,
        quantity: item.quantity,
        price: item.price,
        receivedQuantity: 0,
      });

      totalAmount += item.quantity * item.price;
    }

    // Создать заказ
    const purchaseOrder = new PurchaseOrder({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      branchId: user.branchId ? new mongoose.Types.ObjectId(user.branchId) : undefined,
      supplierId: new mongoose.Types.ObjectId(data.supplierId),
      status: PurchaseOrderStatus.DRAFT,
      items,
      totalAmount,
      expectedDeliveryDate: data.expectedDeliveryDate,
      notes: data.notes?.trim(),
      createdBy: new mongoose.Types.ObjectId(user.userId),
    });

    await purchaseOrder.save();

    logger.info(`Purchase order created: ${purchaseOrder.orderNumber} by ${user.userId}`);

    return this.mapToResponse(purchaseOrder, supplier);
  }

  /**
   * Получить список заказов
   */
  async findAll(user: AuthRequest['user'], filters?: { status?: PurchaseOrderStatus; supplierId?: string }): Promise<PurchaseOrderResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter: any = combinedFilter(user, {});

    // Применить дополнительные фильтры
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.supplierId) {
      filter.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
    }

    const orders = await PurchaseOrder.find(filter)
      .populate('supplierId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    return orders.map(order => this.mapToResponse(order));
  }

  /**
   * Получить заказ по ID
   */
  async findById(id: string, user: AuthRequest['user']): Promise<PurchaseOrderResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Заказ не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const order = await PurchaseOrder.findOne(filter)
      .populate('supplierId', 'name')
      .populate('createdBy', 'firstName lastName');

    if (!order) {
      throw new NotFoundError('Заказ не найден');
    }

    return this.mapToResponse(order);
  }

  /**
   * Отправить заказ (изменить статус на ORDERED)
   */
  async sendOrder(id: string, user: AuthRequest['user']): Promise<PurchaseOrderResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Manager и SuperAdmin могут отправлять заказы
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для отправки заказов');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Заказ не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const order = await PurchaseOrder.findOne(filter).populate('supplierId', 'name');

    if (!order) {
      throw new NotFoundError('Заказ не найден');
    }

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestError('Можно отправить только заказы в статусе DRAFT');
    }

    order.status = PurchaseOrderStatus.ORDERED;
    order.orderedAt = new Date();
    await order.save();

    logger.info(`Purchase order sent: ${order.orderNumber} by ${user.userId}`);

    return this.mapToResponse(order);
  }

  /**
   * Принять заказ (изменить статус на RECEIVED и создать приходные движения)
   */
  async receiveOrder(id: string, data: ReceivePurchaseOrderDto, user: AuthRequest['user']): Promise<PurchaseOrderResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Manager и SuperAdmin могут принимать заказы
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для приёмки заказов');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Заказ не найден');
    }

    // Начать транзакцию MongoDB
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
      const order = await PurchaseOrder.findOne(filter).session(session).populate('supplierId', 'name');

      if (!order) {
        throw new NotFoundError('Заказ не найден');
      }

      if (order.status !== PurchaseOrderStatus.ORDERED) {
        throw new BadRequestError('Можно принять только заказы в статусе ORDERED');
      }

      // Обновить полученные количества и создать движения
      const itemMap = new Map(data.items.map(item => [item.partId, item.receivedQuantity]));

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const receivedQty = itemMap.get(item.partId.toString()) || 0;

        if (receivedQty > item.quantity) {
          throw new BadRequestError(`Полученное количество (${receivedQty}) не может превышать заказанное (${item.quantity}) для ${item.name}`);
        }

        order.items[i].receivedQuantity = receivedQty;

        // Создать приходное движение, если есть полученное количество
        if (receivedQty > 0) {
          await stockService.createMovement(
            {
              partId: item.partId.toString(),
              type: StockMovementType.IN,
              quantity: receivedQty,
              reason: `Приёмка по заказу ${order.orderNumber}`,
              relatedPurchaseOrderId: order._id.toString(),
              reference: order.orderNumber,
            },
            user
          );
        }
      }

      // Обновить статус
      order.status = PurchaseOrderStatus.RECEIVED;
      order.receivedAt = new Date();
      await order.save({ session });

      // Зафиксировать транзакцию
      await session.commitTransaction();

      logger.info(`Purchase order received: ${order.orderNumber} by ${user.userId}`);

      return this.mapToResponse(order);
    } catch (error) {
      // Откатить транзакцию в случае ошибки
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(order: IPurchaseOrder & { supplierId?: any; createdBy?: any }): PurchaseOrderResponse {
    return {
      id: order._id.toString(),
      organizationId: order.organizationId.toString(),
      branchId: order.branchId?.toString(),
      supplierId: order.supplierId._id?.toString() || order.supplierId.toString(),
      supplierName: order.supplierId?.name,
      orderNumber: order.orderNumber,
      status: order.status,
      items: order.items.map(item => ({
        partId: item.partId.toString(),
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        receivedQuantity: item.receivedQuantity || 0,
      })),
      totalAmount: order.totalAmount,
      notes: order.notes,
      orderedAt: order.orderedAt,
      expectedDeliveryDate: order.expectedDeliveryDate,
      receivedAt: order.receivedAt,
      createdBy: order.createdBy._id?.toString() || order.createdBy.toString(),
      createdByName: order.createdBy
        ? `${order.createdBy.firstName || ''} ${order.createdBy.lastName || ''}`.trim()
        : undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

export default new PurchaseOrderService();
