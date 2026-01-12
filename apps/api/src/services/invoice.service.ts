/**
 * Сервис для работы со счетами (Invoices)
 * Реализует бизнес-логику для управления счетами
 */

import Invoice, { IInvoice } from '../models/Invoice';
import WorkOrder from '../models/WorkOrder';
import Client from '../models/Client';
import Service from '../models/Service';
import Part from '../models/Part';
import Tax from '../models/Tax';
import taxService from './tax.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import {
  CreateInvoiceDto,
  UpdateInvoiceStatusDto,
  UpdateInvoiceDto,
  InvoiceResponse,
} from '../types/invoice.dto';
import { InvoiceStatus } from '../types';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class InvoiceService {
  /**
   * Создать новый счет
   * Manager может создавать счета
   * 
   * @param data - Данные для создания счета
   * @param user - Пользователь, создающий счет
   * @returns Созданный счет
   */
  async create(data: CreateInvoiceDto, user: AuthRequest['user']): Promise<InvoiceResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager, Owner и SuperAdmin могут создавать счета
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания счета');
    }
    
    if (!user.organizationId || !user.branchId) {
      throw new ForbiddenError('Требуется организация и филиал');
    }
    
    // Проверить, что клиент существует
    const client = await Client.findById(data.clientId);
    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }
    
    // Проверить, что клиент принадлежит организации
    if (client.organizationId.toString() !== user.organizationId) {
      throw new ForbiddenError('Клиент не принадлежит вашей организации');
    }
    
    // Проверить workOrderId, если указан
    if (data.workOrderId) {
      const workOrder = await WorkOrder.findById(data.workOrderId);
      if (!workOrder) {
        throw new NotFoundError('Заказ не найден');
      }
      if (workOrder.organizationId.toString() !== user.organizationId) {
        throw new ForbiddenError('Заказ не принадлежит вашей организации');
      }
    }
    
    // Проверить serviceId и partId для каждого элемента
    for (const item of data.items) {
      if (item.serviceId) {
        const service = await Service.findById(item.serviceId);
        if (!service) {
          throw new NotFoundError(`Услуга ${item.serviceId} не найдена`);
        }
        if (service.organizationId.toString() !== user.organizationId) {
          throw new ForbiddenError(`Услуга ${item.serviceId} не принадлежит вашей организации`);
        }
      }
      if (item.partId) {
        const part = await Part.findById(item.partId);
        if (!part) {
          throw new NotFoundError(`Запчасть ${item.partId} не найдена`);
        }
        if (part.organizationId.toString() !== user.organizationId) {
          throw new ForbiddenError(`Запчасть ${item.partId} не принадлежит вашей организации`);
        }
      }
    }
    
    // Получить налог по умолчанию, если не указан
    let taxAmount = data.tax || 0;
    if (!data.tax) {
      const defaultTax = await taxService.getDefaultTax(user.organizationId);
      if (defaultTax) {
        const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        taxAmount = taxService.calculateTax(subtotal, defaultTax.rate);
      }
    }
    
    // Вычислить суммы с точностью до 2 знаков
    const subtotal = Math.round(data.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    
    // Создать счет
    const invoice = new Invoice({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      branchId: new mongoose.Types.ObjectId(user.branchId),
      clientId: new mongoose.Types.ObjectId(data.clientId),
      workOrderId: data.workOrderId ? new mongoose.Types.ObjectId(data.workOrderId) : undefined,
      items: data.items.map(item => ({
        serviceId: item.serviceId ? new mongoose.Types.ObjectId(item.serviceId) : undefined,
        partId: item.partId ? new mongoose.Types.ObjectId(item.partId) : undefined,
        name: item.name.trim(),
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal,
      tax: taxAmount,
      total,
      currency: data.currency || 'USD',
      status: InvoiceStatus.DRAFT,
      notes: data.notes?.trim(),
    });
    
    await invoice.save();
    
    logger.info(`Invoice created: ${invoice.invoiceNumber} by ${user.userId}`);
    
    return this.mapToResponse(invoice);
  }

  /**
   * Создать счет из WorkOrder
   * Автоматически формируется при закрытии заказа
   */
  async createFromWorkOrder(workOrderId: string, organizationId: string, branchId: string, userId: string): Promise<InvoiceResponse | null> {
    const workOrder = await WorkOrder.findById(workOrderId).populate('partsUsed.partId');
    
    if (!workOrder) {
      logger.warn(`WorkOrder not found: ${workOrderId}`);
      return null;
    }
    
    // Проверить, что счет уже не создан
    const existingInvoice = await Invoice.findOne({
      workOrderId: new mongoose.Types.ObjectId(workOrderId),
    });
    
    if (existingInvoice) {
      logger.info(`Invoice already exists for work order: ${workOrderId}`);
      return this.mapToResponse(existingInvoice);
    }
    
    // Получить услуги из WorkOrder (если есть связь с Appointment и Services)
    // Для упрощения, создаем счет на основе partsUsed и labor из WorkOrder
    const items: Array<{
      serviceId?: mongoose.Types.ObjectId;
      partId?: mongoose.Types.ObjectId;
      name: string;
      price: number;
      quantity: number;
    }> = [];
    
    // Добавить запчасти
    for (const partUsed of workOrder.partsUsed) {
      const part = await Part.findById(partUsed.partId);
      if (part) {
        items.push({
          partId: part._id,
          name: part.name,
          price: partUsed.unitPrice,
          quantity: partUsed.quantity,
        });
      }
    }
    
    // Добавить труд (как услуги)
    for (const laborItem of workOrder.labor) {
      items.push({
        name: laborItem.description,
        price: laborItem.rate * laborItem.hours,
        quantity: 1,
      });
    }
    
    if (items.length === 0) {
      logger.warn(`No items to invoice for work order: ${workOrderId}`);
      return null;
    }
    
    // Получить налог по умолчанию
    const defaultTax = await taxService.getDefaultTax(organizationId);
    let taxAmount = 0;
    
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
    if (defaultTax) {
      taxAmount = taxService.calculateTax(subtotal, defaultTax.rate);
    }
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    
    // Создать счет
    const invoice = new Invoice({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      branchId: new mongoose.Types.ObjectId(branchId),
      clientId: workOrder.clientId,
      workOrderId: new mongoose.Types.ObjectId(workOrderId),
      items,
      subtotal,
      tax: taxAmount,
      total,
      status: InvoiceStatus.DRAFT,
    });
    
    await invoice.save();
    
    logger.info(`Invoice created from work order: ${invoice.invoiceNumber} for work order ${workOrderId}`);
    
    return this.mapToResponse(invoice);
  }
  
  /**
   * Получить список счетов
   * Client видит только свои счета
   * Manager/Owner видят счета своей организации/филиала
   * 
   * @param user - Пользователь, запрашивающий список
   * @param filters - Опциональные фильтры
   * @returns Список счетов
   */
  async findAll(user: AuthRequest['user'], filters?: { status?: InvoiceStatus; clientId?: string; workOrderId?: string }): Promise<InvoiceResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    let filter: any = {};
    
    // Client видит только свои счета
    if (user.role === UserRole.CLIENT) {
      filter.clientId = new mongoose.Types.ObjectId(user.userId);
    } else {
      // Manager/Owner видят счета своей организации/филиала
      filter = combinedFilter(user, {});
    }
    
    // Применить дополнительные фильтры
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.clientId) {
      filter.clientId = new mongoose.Types.ObjectId(filters.clientId);
    }
    if (filters?.workOrderId) {
      filter.workOrderId = new mongoose.Types.ObjectId(filters.workOrderId);
    }
    
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).limit(100);
    
    return invoices.map(invoice => this.mapToResponse(invoice));
  }
  
  /**
   * Получить счет по ID
   * Client видит только свои счета
   * Manager/Owner видят счета своей организации/филиала
   * 
   * @param id - ID счета
   * @param user - Пользователь, запрашивающий счет
   * @returns Счет
   */
  async findById(id: string, user: AuthRequest['user']): Promise<InvoiceResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Счет не найден');
    }
    
    let filter: any = { _id: new mongoose.Types.ObjectId(id) };
    
    // Client видит только свои счета
    if (user.role === UserRole.CLIENT) {
      filter.clientId = new mongoose.Types.ObjectId(user.userId);
    } else {
      // Manager/Owner видят счета своей организации/филиала
      filter = combinedFilter(user, filter);
    }
    
    const invoice = await Invoice.findOne(filter);
    
    if (!invoice) {
      throw new NotFoundError('Счет не найден');
    }
    
    return this.mapToResponse(invoice);
  }

  /**
   * Обновить счет (пересчет)
   * Manager может обновлять счета
   */
  async update(id: string, data: UpdateInvoiceDto, user: AuthRequest['user']): Promise<InvoiceResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Manager, Owner и SuperAdmin могут обновлять счета
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для обновления счета');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Счет не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const invoice = await Invoice.findOne(filter);

    if (!invoice) {
      throw new NotFoundError('Счет не найден');
    }

    // Нельзя обновлять оплаченный или отмененный счет
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError('Нельзя обновлять оплаченный или отмененный счет');
    }

    // Обновить items, если указаны
    if (data.items) {
      // Проверить serviceId и partId
      for (const item of data.items) {
        if (item.serviceId) {
          const service = await Service.findById(item.serviceId);
          if (!service || service.organizationId.toString() !== user.organizationId) {
            throw new NotFoundError(`Услуга ${item.serviceId} не найдена`);
          }
        }
        if (item.partId) {
          const part = await Part.findById(item.partId);
          if (!part || part.organizationId.toString() !== user.organizationId) {
            throw new NotFoundError(`Запчасть ${item.partId} не найдена`);
          }
        }
      }

      invoice.items = data.items.map(item => ({
        serviceId: item.serviceId ? new mongoose.Types.ObjectId(item.serviceId) : undefined,
        partId: item.partId ? new mongoose.Types.ObjectId(item.partId) : undefined,
        name: item.name.trim(),
        price: item.price,
        quantity: item.quantity,
      }));

      // Пересчитать суммы
      const subtotal = Math.round(invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
      const taxAmount = data.tax !== undefined 
        ? data.tax 
        : invoice.tax || 0;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;

      invoice.subtotal = subtotal;
      invoice.tax = taxAmount;
      invoice.total = total;
    }

    if (data.tax !== undefined && !data.items) {
      const subtotal = invoice.subtotal;
      const total = Math.round((subtotal + data.tax) * 100) / 100;
      invoice.tax = data.tax;
      invoice.total = total;
    }

    if (data.notes !== undefined) {
      invoice.notes = data.notes.trim();
    }

    await invoice.save();

    logger.info(`Invoice updated: ${invoice.invoiceNumber} by ${user.userId}`);

    return this.mapToResponse(invoice);
  }
  
  /**
   * Обновить статус счета
   * Manager может обновлять статус
   * 
   * @param id - ID счета
   * @param data - Данные для обновления статуса
   * @param user - Пользователь, обновляющий статус
   * @returns Обновленный счет
   */
  async updateStatus(id: string, data: UpdateInvoiceStatusDto, user: AuthRequest['user']): Promise<InvoiceResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager, Owner и SuperAdmin могут обновлять статус
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для обновления статуса');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Счет не найден');
    }
    
    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const invoice = await Invoice.findOne(filter);
    
    if (!invoice) {
      throw new NotFoundError('Счет не найден');
    }
    
    // Проверить валидность перехода статуса
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError('Нельзя изменить статус отмененного счета');
    }
    
    if (invoice.status === InvoiceStatus.PAID && data.status !== InvoiceStatus.CANCELLED) {
      throw new BadRequestError('Нельзя изменить статус оплаченного счета');
    }
    
    // Обновить статус и даты
    const oldStatus = invoice.status;
    invoice.status = data.status;
    
    if (data.status === InvoiceStatus.ISSUED && !invoice.issuedAt) {
      invoice.issuedAt = new Date();
    }
    
    if (data.status === InvoiceStatus.PAID && !invoice.paidAt) {
      invoice.paidAt = new Date();
    }
    
    await invoice.save();
    
    logger.info(`Invoice status updated: ${id} from ${oldStatus} to ${data.status} by ${user.userId}`);
    
    return this.mapToResponse(invoice);
  }
  
  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(invoice: IInvoice): InvoiceResponse {
    return {
      id: invoice._id.toString(),
      organizationId: invoice.organizationId.toString(),
      branchId: invoice.branchId.toString(),
      clientId: invoice.clientId.toString(),
      workOrderId: invoice.workOrderId?.toString(),
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      items: invoice.items.map(item => ({
        serviceId: item.serviceId?.toString(),
        partId: item.partId?.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal: invoice.subtotal,
      tax: invoice.tax || 0,
      total: invoice.total,
      currency: invoice.currency || 'USD',
      paidAmount: invoice.paidAmount || 0,
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt,
      pdfUrl: invoice.pdfUrl,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }
}

export default new InvoiceService();
