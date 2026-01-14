/**
 * Контроллер для работы с клиентами
 * Обрабатывает HTTP запросы для управления клиентами
 */

import { Response, NextFunction } from 'express';
import clientService from '../services/client.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateClientDtoSchema, UpdateClientDtoSchema, GetClientsQueryDtoSchema } from '../types/client.dto';
import { CreateClientDto, UpdateClientDto, GetClientsQueryDto } from '../types/client.dto';

/**
 * Контроллер клиентов
 */
export class ClientController {
  /**
   * POST /api/v1/clients
   * Создать нового клиента
   * Доступ: Owner, Manager, Admin
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateClientDto = req.body;
      
      const client = await clientService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/clients
   * Получить список клиентов
   * Доступ: Owner, Manager, Admin, Mechanic, Accountant
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация query параметров
      const query = GetClientsQueryDtoSchema.parse({
        search: req.query.search,
        email: req.query.email,
        phone: req.query.phone,
        vin: req.query.vin,
        branchId: req.query.branchId,
        isActive: req.query.isActive,
        page: req.query.page,
        limit: req.query.limit,
      });
      
      const result = await clientService.findAll(req.user, query);
      
      res.status(200).json({
        success: true,
        data: result.clients,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/clients/:id
   * Получить клиента по ID
   * Доступ: Owner, Manager, Admin, Mechanic, Accountant, Client (только свой профиль)
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const client = await clientService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/clients/:id
   * Обновить клиента
   * Доступ: Owner, Manager, Admin
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateClientDto = req.body;
      
      const client = await clientService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/v1/clients/:id
   * Удалить клиента (soft delete)
   * Доступ: Owner
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await clientService.delete(id, req.user);
      
      res.status(200).json({
        success: true,
        message: 'Клиент удален',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ClientController();
