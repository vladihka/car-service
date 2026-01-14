/**
 * Контроллер для работы с поставщиками
 * Обрабатывает HTTP запросы для управления поставщиками
 */

import { Response, NextFunction } from 'express';
import supplierService from '../services/supplier.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateSupplierDtoSchema, UpdateSupplierDtoSchema, GetSuppliersQueryDtoSchema } from '../types/supplier.dto';
import { CreateSupplierDto, UpdateSupplierDto, GetSuppliersQueryDto } from '../types/supplier.dto';

/**
 * Контроллер поставщиков
 */
export class SupplierController {
  /**
   * POST /api/v1/suppliers
   * Создать нового поставщика
   * Доступ: Owner, Manager
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateSupplierDto = req.body;
      
      const supplier = await supplierService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/suppliers
   * Получить список поставщиков
   * Доступ: Owner, Manager, Accountant
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация query параметров
      const query = GetSuppliersQueryDtoSchema.parse({
        search: req.query.search as string | undefined,
        name: req.query.name as string | undefined,
        status: req.query.status as 'active' | 'inactive' | undefined,
        page: req.query.page,
        limit: req.query.limit,
      });
      
      const result = await supplierService.findAll(req.user, query);
      
      res.status(200).json({
        success: true,
        data: result.suppliers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/suppliers/:id
   * Получить поставщика по ID
   * Доступ: Owner, Manager, Accountant
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const supplier = await supplierService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/suppliers/:id
   * Обновить поставщика
   * Доступ: Owner, Manager
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateSupplierDto = req.body;
      
      const supplier = await supplierService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/v1/suppliers/:id
   * Удалить поставщика (soft delete)
   * Доступ: Owner, Manager
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await supplierService.delete(id, req.user);
      
      res.status(200).json({
        success: true,
        message: 'Поставщик удален',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SupplierController();
