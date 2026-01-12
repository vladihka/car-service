/**
 * Сервис для работы с заказами на работу (Work Orders)
 * Реализует бизнес-логику для управления заказами
 */

import WorkOrder, { IWorkOrder } from '../models/WorkOrder';
import Appointment from '../models/Appointment';
import Client from '../models/Client';
import Car from '../models/Car';
import User from '../models/User';
import stockService from './stock.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { CreateWorkOrderDto, UpdateWorkOrderDto, WorkOrderResponse } from '../types/work-order.dto';
import { WorkOrderStatus } from '../types';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class WorkOrderService {
  /**
   * Создать новый заказ на работу
   * Manager может создавать заказы
   * 
   * @param data - Данные для создания заказа
   * @param user - Пользователь, создающий заказ
   * @returns Созданный заказ
   */
  async create(data: CreateWorkOrderDto, user: AuthRequest['user']): Promise<WorkOrderResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager, Owner и SuperAdmin могут создавать заказы
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания заказа');
    }
    
    if (!user.organizationId || !user.branchId) {
      throw new ForbiddenError('Требуется организация и филиал');
    }
    
    // Проверить, что клиент существует
    const client = await Client.findById(data.clientId);
    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }
    
    // Проверить, что автомобиль существует
    const car = await Car.findById(data.carId);
    if (!car) {
      throw new NotFoundError('Автомобиль не найден');
    }
    
    // Проверить, что механик существует и имеет роль Mechanic
    const mechanic = await User.findById(data.mechanicId);
    if (!mechanic) {
      throw new NotFoundError('Механик не найден');
    }
    
    if (mechanic.role !== UserRole.MECHANIC) {
      throw new BadRequestError('Пользователь не является механиком');
    }
    
    // Проверить, что все принадлежат организации
    if (client.organizationId.toString() !== user.organizationId) {
      throw new ForbiddenError('Клиент не принадлежит вашей организации');
    }
    
    if (car.organizationId.toString() !== user.organizationId) {
      throw new ForbiddenError('Автомобиль не принадлежит вашей организации');
    }
    
    if (mechanic.organizationId?.toString() !== user.organizationId) {
      throw new ForbiddenError('Механик не принадлежит вашей организации');
    }
    
    // Проверить appointmentId, если указан
    if (data.appointmentId) {
      const appointment = await Appointment.findById(data.appointmentId);
      if (!appointment) {
        throw new NotFoundError('Запись не найдена');
      }
      if (appointment.organizationId.toString() !== user.organizationId) {
        throw new ForbiddenError('Запись не принадлежит вашей организации');
      }
    }
    
    // Создать заказ
    const workOrder = new WorkOrder({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      branchId: new mongoose.Types.ObjectId(user.branchId),
      clientId: new mongoose.Types.ObjectId(data.clientId),
      carId: new mongoose.Types.ObjectId(data.carId),
      appointmentId: data.appointmentId ? new mongoose.Types.ObjectId(data.appointmentId) : undefined,
      description: data.description.trim(),
      diagnostics: data.diagnostics?.trim(),
      estimatedCost: data.estimatedCost,
      status: WorkOrderStatus.PENDING,
      assignedTo: new mongoose.Types.ObjectId(data.mechanicId),
      partsUsed: [],
      labor: [],
    });
    
    await workOrder.save();
    
    logger.info(`WorkOrder created: ${workOrder.workOrderNumber} by ${user.userId}`);
    
    return this.mapToResponse(workOrder);
  }
  
  /**
   * Получить список заказов
   * Mechanic видит только свои заказы
   * Manager/Owner видят заказы своего филиала/организации
   * 
   * @param user - Пользователь, запрашивающий список
   * @param filters - Опциональные фильтры
   * @returns Список заказов
   */
  async findAll(user: AuthRequest['user'], filters?: { status?: WorkOrderStatus; my?: boolean }): Promise<WorkOrderResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    let filter: any = {};
    
    // Mechanic видит только свои заказы
    if (user.role === UserRole.MECHANIC || filters?.my) {
      filter.assignedTo = new mongoose.Types.ObjectId(user.userId);
    } else {
      // Для других ролей применяем tenant + branch фильтры
      filter = combinedFilter(user, filter);
    }
    
    // Применить фильтр по статусу
    if (filters?.status) {
      filter.status = filters.status;
    }
    
    const workOrders = await WorkOrder.find(filter)
      .populate('clientId', 'firstName lastName email phone')
      .populate('carId', 'make model year vin')
      .populate('assignedTo', 'firstName lastName email')
      .populate('appointmentId', 'preferredDate status')
      .sort({ createdAt: -1 });
    
    return workOrders.map(workOrder => this.mapToResponse(workOrder));
  }
  
  /**
   * Получить заказ по ID
   * 
   * @param id - ID заказа
   * @param user - Пользователь, запрашивающий заказ
   * @returns Заказ
   */
  async findById(id: string, user: AuthRequest['user']): Promise<WorkOrderResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Заказ не найден');
    }
    
    let filter: any = { _id: new mongoose.Types.ObjectId(id) };
    
    // Mechanic видит только свои заказы
    if (user.role === UserRole.MECHANIC) {
      filter.assignedTo = new mongoose.Types.ObjectId(user.userId);
    } else {
      filter = combinedFilter(user, filter);
    }
    
    const workOrder = await WorkOrder.findOne(filter)
      .populate('clientId', 'firstName lastName email phone')
      .populate('carId', 'make model year vin')
      .populate('assignedTo', 'firstName lastName email')
      .populate('appointmentId', 'preferredDate status');
    
    if (!workOrder) {
      throw new NotFoundError('Заказ не найден');
    }
    
    return this.mapToResponse(workOrder);
  }
  
  /**
   * Обновить заказ на работу
   * Mechanic может обновлять свои заказы
   * 
   * @param id - ID заказа
   * @param data - Данные для обновления
   * @param user - Пользователь, обновляющий заказ
   * @returns Обновленный заказ
   */
  async update(id: string, data: UpdateWorkOrderDto, user: AuthRequest['user']): Promise<WorkOrderResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Заказ не найден');
    }
    
    let filter: any = { _id: new mongoose.Types.ObjectId(id) };
    
    // Mechanic может обновлять только свои заказы
    if (user.role === UserRole.MECHANIC) {
      filter.assignedTo = new mongoose.Types.ObjectId(user.userId);
    } else if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для обновления заказа');
    } else {
      filter = combinedFilter(user, filter);
    }
    
    const workOrder = await WorkOrder.findOne(filter);
    
    if (!workOrder) {
      throw new NotFoundError('Заказ не найден');
    }
    
    // Обновить статус и связанные поля
    const oldStatus = workOrder.status;
    if (data.status) {
      workOrder.status = data.status;
      
      // Обновить даты в зависимости от статуса
      if (data.status === WorkOrderStatus.IN_PROGRESS && !workOrder.startedAt) {
        workOrder.startedAt = new Date();
      }
      if (data.status === WorkOrderStatus.COMPLETED && !workOrder.finishedAt) {
        workOrder.finishedAt = new Date();
        
        // Автоматическое списание запчастей и создание счета при закрытии заказа
        if (oldStatus !== WorkOrderStatus.COMPLETED && user.organizationId) {
          // Списание запчастей
          stockService.writeOffPartsFromWorkOrder(
            workOrder._id.toString(),
            user.organizationId,
            user.branchId,
            user.userId
          ).catch(error => {
            logger.error(`Error writing off parts for work order ${workOrder._id}:`, error);
          });
          
          // Создание счета
          invoiceService.createFromWorkOrder(
            workOrder._id.toString(),
            user.organizationId,
            user.branchId!,
            user.userId
          ).catch(error => {
            logger.error(`Error creating invoice for work order ${workOrder._id}:`, error);
          });
        }
      }
    }
    
    if (data.diagnostics !== undefined) {
      workOrder.diagnostics = data.diagnostics;
    }
    
    if (data.partsUsed !== undefined) {
      workOrder.partsUsed = data.partsUsed.map(part => ({
        partId: new mongoose.Types.ObjectId(part.partId),
        quantity: part.quantity,
        unitPrice: part.unitPrice,
      }));
    }
    
    if (data.finalPrice !== undefined) {
      workOrder.finalPrice = data.finalPrice;
    }
    
    if (data.notes !== undefined) {
      workOrder.notes = data.notes;
    }
    
    await workOrder.save();
    
    logger.info(`WorkOrder updated: ${id} by ${user.userId}`);
    
    return this.mapToResponse(workOrder);
  }
  
  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(workOrder: IWorkOrder): WorkOrderResponse {
    return {
      id: workOrder._id.toString(),
      organizationId: workOrder.organizationId.toString(),
      branchId: workOrder.branchId.toString(),
      clientId: workOrder.clientId.toString(),
      carId: workOrder.carId.toString(),
      appointmentId: workOrder.appointmentId?.toString(),
      workOrderNumber: workOrder.workOrderNumber,
      status: workOrder.status,
      description: workOrder.description,
      diagnostics: workOrder.diagnostics,
      estimatedCost: workOrder.estimatedCost,
      actualCost: workOrder.actualCost,
      finalPrice: workOrder.finalPrice,
      estimatedCompletion: workOrder.estimatedCompletion,
      startedAt: workOrder.startedAt,
      finishedAt: workOrder.finishedAt,
      assignedTo: workOrder.assignedTo?.toString(),
      partsUsed: workOrder.partsUsed.map(part => ({
        partId: part.partId.toString(),
        quantity: part.quantity,
        unitPrice: part.unitPrice,
      })),
      labor: workOrder.labor.map(l => ({
        description: l.description,
        hours: l.hours,
        rate: l.rate,
      })),
      notes: workOrder.notes,
      createdAt: workOrder.createdAt,
      updatedAt: workOrder.updatedAt,
    };
  }
}

export default new WorkOrderService();
