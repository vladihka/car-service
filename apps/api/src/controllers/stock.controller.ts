/**
 * Контроллер для работы со складом
 * Обрабатывает HTTP запросы для движений по складу
 */

import { Response, NextFunction } from 'express';
import stockService from '../services/stock.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateStockMovementDtoSchema } from '../types/stock.dto';
import { CreateStockMovementDto } from '../types/stock.dto';
import { StockMovementType } from '../types';

/**
 * Контроллер склада
 */
export class StockController {
  /**
   * POST /api/v1/stock/move
   * Создать движение по складу
   * Доступ: Owner, Manager
   */
  async createMovement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateStockMovementDto = req.body;
      
      const movement = await stockService.createMovement(data, req.user);
      
      res.status(201).json({
        success: true,
        data: movement,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/stock/history
   * Получить историю движений по складу
   */
  async getHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const partId = req.query.partId as string | undefined;
      const type = req.query.type as StockMovementType | undefined;
      const workOrderId = req.query.workOrderId as string | undefined;
      
      const movements = await stockService.getHistory(req.user, { partId, type, workOrderId });
      
      res.status(200).json({
        success: true,
        data: movements,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new StockController();
