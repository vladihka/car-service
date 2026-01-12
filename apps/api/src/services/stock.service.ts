/**
 * Сервис для работы со складом
 * Реализует бизнес-логику для движений по складу, резервирования и списания
 */

import StockMovement, { IStockMovement } from '../models/StockMovement';
import Part from '../models/Part';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { CreateStockMovementDto, StockMovementResponse } from '../types/stock.dto';
import { StockMovementType, UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class StockService {
  /**
   * Создать движение по складу
   * Использует MongoDB транзакции для атомарности
   */
  async createMovement(data: CreateStockMovementDto, user: AuthRequest['user']): Promise<StockMovementResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Manager и SuperAdmin могут создавать движения
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания движений по складу');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Начать транзакцию MongoDB
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Проверить, что запчасть существует
      const part = await Part.findById(data.partId).session(session);
      if (!part) {
        throw new NotFoundError('Запчасть не найдена');
      }

      // Проверить, что запчасть принадлежит организации
      if (part.organizationId.toString() !== user.organizationId) {
        throw new ForbiddenError('Запчасть не принадлежит вашей организации');
      }

      // Проверить доступность для расходных операций
      if (data.quantity < 0 || data.type === StockMovementType.OUT || data.type === StockMovementType.WRITEOFF) {
        const availableQuantity = part.quantity - part.reservedQuantity;
        const requestedQuantity = Math.abs(data.quantity);

        if (requestedQuantity > availableQuantity) {
          throw new BadRequestError(`Недостаточно запчастей. Доступно: ${availableQuantity}, запрошено: ${requestedQuantity}`);
        }
      }

      // Обновить количество запчасти
      const quantityChange = data.type === StockMovementType.IN || data.type === StockMovementType.RETURN
        ? Math.abs(data.quantity)
        : -Math.abs(data.quantity);

      part.quantity += quantityChange;

      // Обработать резервирование
      if (data.type === StockMovementType.RESERVATION) {
        part.reservedQuantity += Math.abs(data.quantity);
      } else if (data.type === StockMovementType.OUT && data.relatedWorkOrderId) {
        // Автоматически списать резерв при расходе, связанном с заказом
        const reservedQty = Math.min(part.reservedQuantity, Math.abs(data.quantity));
        part.reservedQuantity -= reservedQty;
      }

      if (part.quantity < 0) {
        throw new BadRequestError('Количество запчасти не может быть отрицательным');
      }

      await part.save({ session });

      // Создать движение
      const movement = new StockMovement({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        branchId: user.branchId ? new mongoose.Types.ObjectId(user.branchId) : undefined,
        partId: new mongoose.Types.ObjectId(data.partId),
        type: data.type,
        quantity: quantityChange,
        reason: data.reason?.trim(),
        relatedWorkOrderId: data.relatedWorkOrderId
          ? new mongoose.Types.ObjectId(data.relatedWorkOrderId)
          : undefined,
        relatedPurchaseOrderId: data.relatedPurchaseOrderId
          ? new mongoose.Types.ObjectId(data.relatedPurchaseOrderId)
          : undefined,
        createdBy: new mongoose.Types.ObjectId(user.userId),
        reference: data.reference?.trim(),
      });

      await movement.save({ session });

      // Зафиксировать транзакцию
      await session.commitTransaction();

      logger.info(`Stock movement created: ${movement._id} for part ${data.partId} by ${user.userId}`);

      return this.mapToResponse(movement);
    } catch (error) {
      // Откатить транзакцию в случае ошибки
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Получить историю движений по складу
   */
  async getHistory(user: AuthRequest['user'], filters?: { partId?: string; type?: StockMovementType; workOrderId?: string }): Promise<StockMovementResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter: any = combinedFilter(user, {});

    // Применить дополнительные фильтры
    if (filters?.partId) {
      filter.partId = new mongoose.Types.ObjectId(filters.partId);
    }
    if (filters?.type) {
      filter.type = filters.type;
    }
    if (filters?.workOrderId) {
      filter.relatedWorkOrderId = new mongoose.Types.ObjectId(filters.workOrderId);
    }

    const movements = await StockMovement.find(filter)
      .populate('partId', 'name sku')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(100);

    return movements.map(movement => this.mapToResponse(movement));
  }

  /**
   * Резервировать запчасти под заказ
   */
  async reserveParts(workOrderId: string, parts: Array<{ partId: string; quantity: number }>, user: AuthRequest['user']): Promise<StockMovementResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const movements: StockMovementResponse[] = [];

    for (const item of parts) {
      const movement = await this.createMovement(
        {
          partId: item.partId,
          type: StockMovementType.RESERVATION,
          quantity: item.quantity,
          reason: 'Резервирование под заказ',
          relatedWorkOrderId: workOrderId,
        },
        user
      );
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Автоматическое списание запчастей при закрытии заказа
   * Вызывается из WorkOrderService при закрытии заказа
   */
  async writeOffPartsFromWorkOrder(workOrderId: string, organizationId: string, branchId: string | undefined, userId: string): Promise<void> {
    // Найти все резервирования для этого заказа
    const reservations = await StockMovement.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      relatedWorkOrderId: new mongoose.Types.ObjectId(workOrderId),
      type: StockMovementType.RESERVATION,
    });

    // Создать списание для каждого резервирования
    for (const reservation of reservations) {
      await this.createMovement(
        {
          partId: reservation.partId.toString(),
          type: StockMovementType.OUT,
          quantity: Math.abs(reservation.quantity),
          reason: 'Списание по закрытому заказу',
          relatedWorkOrderId: workOrderId,
        },
        {
          userId,
          organizationId,
          branchId,
          role: UserRole.MANAGER, // Внутренний вызов
        } as AuthRequest['user']
      );
    }
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(movement: IStockMovement & { partId?: any; createdBy?: any }): StockMovementResponse {
    return {
      id: movement._id.toString(),
      organizationId: movement.organizationId.toString(),
      branchId: movement.branchId?.toString(),
      partId: movement.partId._id?.toString() || movement.partId.toString(),
      partName: movement.partId?.name,
      partSku: movement.partId?.sku,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      relatedWorkOrderId: movement.relatedWorkOrderId?.toString(),
      relatedPurchaseOrderId: movement.relatedPurchaseOrderId?.toString(),
      createdBy: movement.createdBy._id?.toString() || movement.createdBy.toString(),
      createdByName: movement.createdBy
        ? `${movement.createdBy.firstName || ''} ${movement.createdBy.lastName || ''}`.trim()
        : undefined,
      reference: movement.reference,
      createdAt: movement.createdAt,
    };
  }
}

export default new StockService();
