/**
 * Контроллер для работы с организациями
 * Обрабатывает HTTP запросы для управления организациями
 */

import { Response, NextFunction } from 'express';
import organizationService from '../services/organization.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateOrganizationDtoSchema, UpdateOrganizationDtoSchema } from '../types/organization.dto';
import { CreateOrganizationDto, UpdateOrganizationDto } from '../types/organization.dto';

/**
 * Контроллер организаций
 */
export class OrganizationController {
  /**
   * POST /api/v1/organizations
   * Создать новую организацию
   * Доступ: SuperAdmin
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateOrganizationDto = req.body;
      
      const organization = await organizationService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/organizations
   * Получить список организаций
   * Доступ: SuperAdmin (все), Owner (только своя)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizations = await organizationService.findAll(req.user);
      
      res.status(200).json({
        success: true,
        data: organizations,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/organizations/:id
   * Получить организацию по ID
   * Доступ: SuperAdmin (любая), Owner (только своя)
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const organization = await organizationService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/organizations/:id
   * Обновить организацию
   * Доступ: SuperAdmin (любая), Owner (только своя)
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateOrganizationDto = req.body;
      
      const organization = await organizationService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/v1/organizations/:id
   * Удалить организацию
   * Доступ: SuperAdmin
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await organizationService.delete(id, req.user);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default new OrganizationController();
