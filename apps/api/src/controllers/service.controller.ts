/**
 * Контроллер для работы с услугами (Services)
 * Обрабатывает HTTP запросы для управления услугами
 */

import { Response, NextFunction } from 'express';
import serviceService from '../services/service.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateServiceDtoSchema, UpdateServiceDtoSchema } from '../types/service.dto';
import { CreateServiceDto, UpdateServiceDto } from '../types/service.dto';

/**
 * Контроллер услуг
 */
export class ServiceController {
  /**
   * POST /api/v1/services
   * Создать новую услугу
   * Доступ: Owner, Manager
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateServiceDto = req.body;
      
      const service = await serviceService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/services
   * Получить список услуг
   * Доступ: Owner, Manager (все в организации)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      
      const services = await serviceService.findAll(req.user, includeInactive);
      
      res.status(200).json({
        success: true,
        data: services,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/services/:id
   * Получить услугу по ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const service = await serviceService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/services/:id
   * Обновить услугу
   * Доступ: Owner, Manager
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateServiceDto = req.body;
      
      const service = await serviceService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/v1/services/:id
   * Удалить услугу
   * Доступ: Owner
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await serviceService.delete(id, req.user);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default new ServiceController();
