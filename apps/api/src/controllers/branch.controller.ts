/**
 * Контроллер для работы с филиалами
 * Обрабатывает HTTP запросы для управления филиалами
 */

import { Response, NextFunction } from 'express';
import branchService from '../services/branch.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CreateBranchDtoSchema, UpdateBranchDtoSchema } from '../types/branch.dto';
import { CreateBranchDto, UpdateBranchDto } from '../types/branch.dto';

/**
 * Контроллер филиалов
 */
export class BranchController {
  /**
   * POST /api/v1/branches
   * Создать новый филиал
   * Доступ: SuperAdmin, Owner (в своей организации)
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateBranchDto = req.body;
      
      const branch = await branchService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/branches
   * Получить список филиалов
   * Доступ: SuperAdmin (все), Owner (все в своей организации), Manager (только свой)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      
      const branches = await branchService.findAll(req.user, organizationId);
      
      res.status(200).json({
        success: true,
        data: branches,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/branches/:id
   * Получить филиал по ID
   * Доступ: SuperAdmin, Owner (любой в своей организации), Manager (только свой)
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const branch = await branchService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/branches/:id
   * Обновить филиал
   * Доступ: SuperAdmin, Owner (любой в своей организации), Manager (только свой)
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateBranchDto = req.body;
      
      const branch = await branchService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/v1/branches/:id
   * Удалить филиал
   * Доступ: SuperAdmin, Owner (в своей организации)
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await branchService.delete(id, req.user);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default new BranchController();
