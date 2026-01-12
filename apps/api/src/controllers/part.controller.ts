/**
 * Контроллер для работы с запчастями
 * Обрабатывает HTTP запросы для управления запчастями
 */

import { Response, NextFunction } from 'express';
import partService from '../services/part.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreatePartDtoSchema, UpdatePartDtoSchema } from '../types/part.dto';
import { CreatePartDto, UpdatePartDto } from '../types/part.dto';

/**
 * Контроллер запчастей
 */
export class PartController {
  /**
   * POST /api/v1/parts
   * Создать новую запчасть
   * Доступ: Owner, Manager
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreatePartDto = req.body;
      
      const part = await partService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: part,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/parts
   * Получить список запчастей
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const lowStock = req.query.lowStock === 'true';
      const search = req.query.search as string | undefined;
      
      const parts = await partService.findAll(req.user, { category, lowStock, search });
      
      res.status(200).json({
        success: true,
        data: parts,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/parts/:id
   * Получить запчасть по ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const part = await partService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: part,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/parts/:id
   * Обновить запчасть
   * Доступ: Owner, Manager
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdatePartDto = req.body;
      
      const part = await partService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: part,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/v1/parts/:id
   * Удалить запчасть (soft delete)
   * Доступ: Owner
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await partService.delete(id, req.user);
      
      res.status(200).json({
        success: true,
        message: 'Запчасть удалена',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PartController();
