/**
 * Сервис для работы с платежами (Payments)
 * Реализует бизнес-логику для управления платежами
 */

import Payment, { IPayment } from '../models/Payment';
import Invoice from '../models/Invoice';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { CreatePaymentDto, UpdatePaymentStatusDto, RefundPaymentDto, PaymentResponse } from '../types/payment.dto';
import { PaymentStatus, PaymentProvider, InvoiceStatus } from '../types';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class PaymentService {
  /**
   * Создать новый платеж
   * Manager может создавать платежи
   * Использует MongoDB транзакции для атомарности операций
   * 
   * @param data - Данные для создания платежа
   * @param user - Пользователь, создающий платеж
   * @returns Созданный платеж
   */
  async create(data: CreatePaymentDto, user: AuthRequest['user']): Promise<PaymentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager, Owner и SuperAdmin могут создавать платежи
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания платежа');
    }
    
    if (!user.organizationId || !user.branchId) {
      throw new ForbiddenError('Требуется организация и филиал');
    }
    
    // Начать транзакцию MongoDB
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Проверить, что счет существует
      const invoice = await Invoice.findById(data.invoiceId).session(session);
      if (!invoice) {
        throw new NotFoundError('Счет не найден');
      }
      
      // Проверить, что счет принадлежит организации
      if (invoice.organizationId.toString() !== user.organizationId) {
        throw new ForbiddenError('Счет не принадлежит вашей организации');
      }
      
      // Проверить статус счета
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestError('Нельзя создать платеж для отмененного счета');
      }
      
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestError('Счет уже оплачен');
      }
      
      // Проверить, что сумма платежа не превышает остаток по счету
      const remainingAmount = invoice.total - (invoice.paidAmount || 0);
      if (data.amount > remainingAmount) {
        throw new BadRequestError(`Сумма платежа (${data.amount}) превышает остаток по счету (${remainingAmount})`);
      }
      
      // Создать платеж
      const payment = new Payment({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        branchId: new mongoose.Types.ObjectId(user.branchId),
        invoiceId: new mongoose.Types.ObjectId(data.invoiceId),
        workOrderId: data.workOrderId ? new mongoose.Types.ObjectId(data.workOrderId) : invoice.workOrderId,
        clientId: invoice.clientId,
        amount: data.amount,
        currency: data.currency || invoice.currency || 'USD',
        method: data.method,
        status: PaymentStatus.PENDING,
        transactionId: data.transactionId?.trim(),
        notes: data.notes?.trim(),
      });
      
      await payment.save({ session });
      
      // Обновить статус платежа на COMPLETED
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      await payment.save({ session });
      
      // Обновить счет: увеличить paidAmount
      const newPaidAmount = (invoice.paidAmount || 0) + data.amount;
      invoice.paidAmount = newPaidAmount;
      
      // Если счет полностью оплачен, обновить статус
      if (Math.abs(newPaidAmount - invoice.total) < 0.01) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidAt = new Date();
      } else if (invoice.status === InvoiceStatus.DRAFT) {
        // Если счет был в статусе DRAFT и начата оплата, перевести в ISSUED
        invoice.status = InvoiceStatus.ISSUED;
        invoice.issuedAt = invoice.issuedAt || new Date();
      }
      
      await invoice.save({ session });
      
      // Зафиксировать транзакцию
      await session.commitTransaction();
      
      logger.info(`Payment created: ${payment._id} for invoice ${data.invoiceId} by ${user.userId}`);
      
      return this.mapToResponse(payment);
    } catch (error) {
      // Откатить транзакцию в случае ошибки
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Получить список платежей
   * Client видит только свои платежи
   * Manager/Owner видят платежи своей организации/филиала
   * 
   * @param user - Пользователь, запрашивающий список
   * @param filters - Опциональные фильтры
   * @returns Список платежей
   */
  async findAll(user: AuthRequest['user'], filters?: { invoiceId?: string; status?: PaymentStatus }): Promise<PaymentResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    let filter: any = {};
    
    // Client видит только свои платежи
    if (user.role === UserRole.CLIENT) {
      // Фильтр будет применен через tenantFilter, но нужно также проверить clientId
      // Это будет сделано через Invoice
      filter = tenantFilter(user, filter);
    } else {
      // Для других ролей применяем tenant + branch фильтры
      filter = combinedFilter(user, filter);
    }
    
    // Применить дополнительные фильтры
    if (filters?.invoiceId) {
      filter.invoiceId = new mongoose.Types.ObjectId(filters.invoiceId);
    }
    if (filters?.status) {
      filter.status = filters.status;
    }
    
    const payments = await Payment.find(filter)
      .populate('invoiceId', 'invoiceNumber status total')
      .populate('clientId', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
    
    return payments.map(payment => this.mapToResponse(payment));
  }
  
  /**
   * Получить платеж по ID
   * 
   * @param id - ID платежа
   * @param user - Пользователь, запрашивающий платеж
   * @returns Платеж
   */
  async findById(id: string, user: AuthRequest['user']): Promise<PaymentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Платеж не найден');
    }
    
    let filter: any = { _id: new mongoose.Types.ObjectId(id) };
    
    // Client видит только свои платежи
    if (user.role === UserRole.CLIENT) {
      filter = tenantFilter(user, filter);
    } else {
      filter = combinedFilter(user, filter);
    }
    
    const payment = await Payment.findOne(filter)
      .populate('invoiceId', 'invoiceNumber status total paidAmount')
      .populate('clientId', 'firstName lastName email phone');
    
    if (!payment) {
      throw new NotFoundError('Платеж не найден');
    }
    
    return this.mapToResponse(payment);
  }
  
  /**
   * Обновить статус платежа
   * Используется для webhooks платежных систем
   * 
   * @param id - ID платежа
   * @param data - Данные для обновления
   * @param user - Пользователь, обновляющий платеж
   * @returns Обновленный платеж
   */
  async updateStatus(id: string, data: UpdatePaymentStatusDto, user: AuthRequest['user']): Promise<PaymentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager, Owner и SuperAdmin могут обновлять статус
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для обновления статуса платежа');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Платеж не найден');
    }
    
    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const payment = await Payment.findOne(filter);
    
    if (!payment) {
      throw new NotFoundError('Платеж не найден');
    }
    
    // Проверить валидность перехода статуса
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestError('Нельзя изменить статус возвращенного платежа');
    }
    
    if (payment.status === PaymentStatus.COMPLETED && data.status === PaymentStatus.PENDING) {
      throw new BadRequestError('Нельзя изменить статус завершенного платежа на ожидающий');
    }
    
    const oldStatus = payment.status;
    payment.status = data.status;
    
    if (data.transactionId) {
      payment.transactionId = data.transactionId.trim();
    }
    
    if (data.notes) {
      payment.notes = data.notes.trim();
    }
    
    if (data.status === PaymentStatus.COMPLETED && !payment.paidAt) {
      payment.paidAt = new Date();
    }
    
    await payment.save();
    
    logger.info(`Payment status updated: ${id} from ${oldStatus} to ${data.status} by ${user.userId}`);
    
    return this.mapToResponse(payment);
  }
  
  /**
   * Возврат платежа (refund)
   * Создает новый платеж со статусом REFUNDED и обновляет счет
   * 
   * @param id - ID платежа для возврата
   * @param data - Данные для возврата
   * @param user - Пользователь, инициирующий возврат
   * @returns Платеж с возвратом
   */
  async refund(id: string, data: RefundPaymentDto, user: AuthRequest['user']): Promise<PaymentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager, Owner и SuperAdmin могут делать возвраты
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для возврата платежа');
    }
    
    if (!user.organizationId || !user.branchId) {
      throw new ForbiddenError('Требуется организация и филиал');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Платеж не найден');
    }
    
    // Начать транзакцию MongoDB
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
      const originalPayment = await Payment.findOne(filter).session(session);
      
      if (!originalPayment) {
        throw new NotFoundError('Платеж не найден');
      }
      
      // Проверить, что платеж завершен
      if (originalPayment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestError('Можно вернуть только завершенный платеж');
      }
      
      // Проверить, что платеж еще не был возвращен
      const existingRefund = await Payment.findOne({
        transactionId: originalPayment.transactionId,
        status: PaymentStatus.REFUNDED,
      }).session(session);
      
      if (existingRefund) {
        throw new BadRequestError('Этот платеж уже был возвращен');
      }
      
      // Получить счет
      const invoice = await Invoice.findById(originalPayment.invoiceId).session(session);
      if (!invoice) {
        throw new NotFoundError('Счет не найден');
      }
      
      // Определить сумму возврата (полная или частичная)
      const refundAmount = data.amount || originalPayment.amount;
      
      if (refundAmount > originalPayment.amount) {
        throw new BadRequestError(`Сумма возврата (${refundAmount}) не может превышать сумму платежа (${originalPayment.amount})`);
      }
      
      // Обновить статус оригинального платежа на REFUNDED
      originalPayment.status = PaymentStatus.REFUNDED;
      if (data.reason) {
        originalPayment.notes = (originalPayment.notes ? originalPayment.notes + '\n' : '') + `Возврат: ${data.reason}`;
      }
      await originalPayment.save({ session });
      
      // Обновить счет: уменьшить paidAmount
      const newPaidAmount = Math.max(0, (invoice.paidAmount || 0) - refundAmount);
      invoice.paidAmount = newPaidAmount;
      
      // Если счет был полностью оплачен, но теперь частично возвращен, изменить статус
      if (invoice.status === InvoiceStatus.PAID && newPaidAmount < invoice.total) {
        invoice.status = InvoiceStatus.ISSUED;
        invoice.paidAt = undefined;
      } else if (newPaidAmount === 0) {
        invoice.status = InvoiceStatus.ISSUED;
        invoice.paidAt = undefined;
      }
      
      await invoice.save({ session });
      
      // Зафиксировать транзакцию
      await session.commitTransaction();
      
      logger.info(`Payment refunded: ${id} amount ${refundAmount} by ${user.userId}`);
      
      return this.mapToResponse(originalPayment);
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
  private mapToResponse(payment: IPayment): PaymentResponse {
    return {
      id: payment._id.toString(),
      organizationId: payment.organizationId.toString(),
      branchId: payment.branchId.toString(),
      invoiceId: payment.invoiceId.toString(),
      workOrderId: payment.workOrderId?.toString(),
      clientId: payment.clientId.toString(),
      amount: payment.amount,
      currency: payment.currency || 'USD',
      method: payment.method,
      provider: payment.provider,
      status: payment.status,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      notes: payment.notes,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}

export default new PaymentService();
