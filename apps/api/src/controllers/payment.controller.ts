/**
 * Контроллер для работы с платежами (Payments)
 * Обрабатывает HTTP запросы для управления платежами
 */

import { Response, NextFunction } from 'express';
import paymentService from '../services/payment.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreatePaymentDtoSchema, UpdatePaymentStatusDtoSchema, RefundPaymentDtoSchema } from '../types/payment.dto';
import { CreatePaymentDto, UpdatePaymentStatusDto, RefundPaymentDto } from '../types/payment.dto';
import { PaymentStatus } from '../types';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

/**
 * Контроллер платежей
 */
export class PaymentController {
  /**
   * POST /api/v1/payments
   * Создать новый платеж
   * Доступ: Manager, Owner
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreatePaymentDto = req.body;
      
      const payment = await paymentService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/payments
   * Получить список платежей
   * Доступ: Client (только свои), Manager/Owner (все в организации/филиале)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoiceId = req.query.invoiceId as string | undefined;
      const status = req.query.status as PaymentStatus | undefined;
      
      const payments = await paymentService.findAll(req.user, { invoiceId, status });
      
      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/payments/:id
   * Получить платеж по ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const payment = await paymentService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/payments/:id
   * Обновить статус платежа
   * Доступ: Manager, Owner
   */
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdatePaymentStatusDto = req.body;
      
      const payment = await paymentService.updateStatus(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/v1/payments/:id/refund
   * Возврат платежа
   * Доступ: Manager, Owner
   */
  async refund(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: RefundPaymentDto = req.body;
      
      const payment = await paymentService.refund(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();
