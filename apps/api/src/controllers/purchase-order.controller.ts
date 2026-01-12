/**
 * Контроллер для работы с заказами поставщикам
 * Обрабатывает HTTP запросы для управления заказами поставщикам
 */

import { Response, NextFunction } from 'express';
import purchaseOrderService from '../services/purchase-order.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import {
  CreatePurchaseOrderDtoSchema,
  ReceivePurchaseOrderDtoSchema,
} from '../types/purchase-order.dto';
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from '../types/purchase-order.dto';
import { PurchaseOrderStatus } from '../types';

/**
 * Контроллер заказов поставщикам
 */
export class PurchaseOrderController {
  /**
   * POST /api/v1/purchase-orders
   * Создать заказ поставщику
   * Доступ: Owner, Manager
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreatePurchaseOrderDto = req.body;
      
      const order = await purchaseOrderService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/purchase-orders
   * Получить список заказов
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as PurchaseOrderStatus | undefined;
      const supplierId = req.query.supplierId as string | undefined;
      
      const orders = await purchaseOrderService.findAll(req.user, { status, supplierId });
      
      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/purchase-orders/:id
   * Получить заказ по ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const order = await purchaseOrderService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/purchase-orders/:id/receive
   * Принять заказ
   * Доступ: Owner, Manager
   */
  async receive(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: ReceivePurchaseOrderDto = req.body;
      
      const order = await purchaseOrderService.receiveOrder(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PurchaseOrderController();
