/**
 * Контроллер для работы с заказами на работу (Work Orders)
 * Обрабатывает HTTP запросы для управления заказами
 */

import { Response, NextFunction } from 'express';
import workOrderService from '../services/work-order.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateWorkOrderDtoSchema, UpdateWorkOrderDtoSchema } from '../types/work-order.dto';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from '../types/work-order.dto';
import { WorkOrderStatus } from '../types';

/**
 * Контроллер заказов на работу
 */
export class WorkOrderController {
  /**
   * POST /api/v1/work-orders
   * Создать новый заказ на работу
   * Доступ: Manager, Owner
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateWorkOrderDto = req.body;
      
      const workOrder = await workOrderService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/work-orders
   * Получить список заказов
   * Доступ: Mechanic (только свои), Manager/Owner (все в филиале/организации)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as WorkOrderStatus | undefined;
      const my = req.query.my === 'true';
      
      const workOrders = await workOrderService.findAll(req.user, { status, my });
      
      res.status(200).json({
        success: true,
        data: workOrders,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/work-orders/my
   * Получить список своих заказов (для Mechanic)
   * Доступ: Mechanic
   */
  async findMy(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as WorkOrderStatus | undefined;
      
      const workOrders = await workOrderService.findAll(req.user, { status, my: true });
      
      res.status(200).json({
        success: true,
        data: workOrders,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/work-orders/:id
   * Получить заказ по ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const workOrder = await workOrderService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/work-orders/:id
   * Обновить заказ на работу
   * Доступ: Mechanic (только свои), Manager/Owner (все в филиале/организации)
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateWorkOrderDto = req.body;
      
      const workOrder = await workOrderService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new WorkOrderController();
