/**
 * Контроллер для работы с налогами
 * Обрабатывает HTTP запросы для управления налогами
 */

import { Response, NextFunction } from 'express';
import taxService from '../services/tax.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateTaxDtoSchema, UpdateTaxDtoSchema, SetDefaultTaxDtoSchema } from '../types/tax.dto';
import { CreateTaxDto, UpdateTaxDto, SetDefaultTaxDto } from '../types/tax.dto';

/**
 * Контроллер налогов
 */
export class TaxController {
  /**
   * POST /api/v1/taxes
   * Создать новый налог
   * Доступ: Owner, Accountant
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateTaxDto = req.body;
      
      const tax = await taxService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: tax,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/taxes
   * Получить список налогов
   * Доступ: Owner, Manager, Accountant
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const taxes = await taxService.findAll(req.user);
      
      res.status(200).json({
        success: true,
        data: taxes,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/taxes/:id
   * Получить налог по ID
   * Доступ: Owner, Manager, Accountant
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const tax = await taxService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: tax,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/taxes/:id
   * Обновить налог
   * Доступ: Owner, Accountant
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateTaxDto = req.body;
      
      const tax = await taxService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: tax,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/v1/taxes/:id
   * Удалить налог (soft delete)
   * Доступ: Owner
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await taxService.delete(id, req.user);
      
      res.status(200).json({
        success: true,
        message: 'Налог удален',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/taxes/set-default
   * Назначить налог по умолчанию
   * Доступ: Owner, Accountant
   */
  async setDefault(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: SetDefaultTaxDto = req.body;
      
      const tax = await taxService.setDefaultTax(data.taxId, req.user);
      
      res.status(200).json({
        success: true,
        data: tax,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TaxController();
