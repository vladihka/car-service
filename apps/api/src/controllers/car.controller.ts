/**
 * Контроллер для работы с автомобилями
 * Обрабатывает HTTP запросы для управления автомобилями
 */

import { Response, NextFunction } from 'express';
import carService from '../services/car.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateCarDtoSchema, UpdateCarDtoSchema, GetCarsQueryDtoSchema } from '../types/car.dto';
import { CreateCarDto, UpdateCarDto, GetCarsQueryDto } from '../types/car.dto';

/**
 * Контроллер автомобилей
 */
export class CarController {
  /**
   * POST /api/v1/cars
   * Создать новый автомобиль
   * Доступ: Owner, Manager, Admin
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateCarDto = req.body;
      
      const car = await carService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: car,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/cars
   * Получить список автомобилей
   * Доступ: Owner, Manager, Admin, Mechanic, Accountant, Client (только свои)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация query параметров
      const query = GetCarsQueryDtoSchema.parse({
        search: req.query.search as string | undefined,
        vin: req.query.vin as string | undefined,
        make: req.query.make as string | undefined,
        model: req.query.model as string | undefined,
        year: req.query.year as string | undefined,
        clientId: req.query.clientId as string | undefined,
        licensePlate: req.query.licensePlate as string | undefined,
        page: req.query.page,
        limit: req.query.limit,
      });
      
      const result = await carService.findAll(req.user, query);
      
      res.status(200).json({
        success: true,
        data: result.cars,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/cars/:id
   * Получить автомобиль по ID
   * Доступ: Owner, Manager, Admin, Mechanic, Accountant, Client (только свой)
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const car = await carService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: car,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/cars/:id
   * Обновить автомобиль
   * Доступ: Owner, Manager, Admin
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateCarDto = req.body;
      
      const car = await carService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: car,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/v1/cars/:id
   * Удалить автомобиль
   * Доступ: Owner
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await carService.delete(id, req.user);
      
      res.status(200).json({
        success: true,
        message: 'Автомобиль удален',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CarController();
