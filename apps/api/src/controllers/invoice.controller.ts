/**
 * Контроллер для работы со счетами (Invoices)
 * Обрабатывает HTTP запросы для управления счетами
 */

import { Response, NextFunction } from 'express';
import invoiceService from '../services/invoice.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateInvoiceDtoSchema, UpdateInvoiceStatusDtoSchema, UpdateInvoiceDtoSchema } from '../types/invoice.dto';
import { CreateInvoiceDto, UpdateInvoiceStatusDto, UpdateInvoiceDto } from '../types/invoice.dto';
import { InvoiceStatus } from '../types';

/**
 * Контроллер счетов
 */
export class InvoiceController {
  /**
   * POST /api/v1/invoices
   * Создать новый счет
   * Доступ: Manager, Owner
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateInvoiceDto = req.body;
      
      const invoice = await invoiceService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/invoices
   * Получить список счетов
   * Доступ: Client (только свои), Manager/Owner (все в организации/филиале)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as InvoiceStatus | undefined;
      const clientId = req.query.clientId as string | undefined;
      
      const invoices = await invoiceService.findAll(req.user, { status, clientId });
      
      res.status(200).json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/invoices/:id
   * Получить счет по ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const invoice = await invoiceService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/invoices/:id
   * Обновить счет (пересчет)
   * Доступ: Manager, Owner
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateInvoiceDto = req.body;
      
      const invoice = await invoiceService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/invoices/:id/status
   * Обновить статус счета
   * Доступ: Manager, Owner
   */
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateInvoiceStatusDto = req.body;
      
      const invoice = await invoiceService.updateStatus(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new InvoiceController();
