/**
 * Контроллер для работы с уведомлениями
 * Обрабатывает HTTP запросы для управления уведомлениями
 */

import { Response, NextFunction } from 'express';
import notificationService from '../services/notification.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import {
  NotificationQueryDtoSchema,
  CreateNotificationDtoSchema,
  CreateTestNotificationDtoSchema,
} from '../types/notification.dto';
import {
  NotificationQueryDto,
  CreateNotificationDto,
  CreateTestNotificationDto,
} from '../types/notification.dto';

/**
 * Контроллер уведомлений
 */
export class NotificationController {
  /**
   * GET /api/v1/notifications
   * Получить список уведомлений
   * Доступ: Client (только свои), Mechanic (связанные с заказами), Manager/Owner (все в организации)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: NotificationQueryDto = {
        page: req.query.page as any,
        limit: req.query.limit as any,
        status: req.query.status as any,
        type: req.query.type as any,
        channel: req.query.channel as any,
        read: req.query.read as any,
      };
      
      const validatedQuery = NotificationQueryDtoSchema.parse(query);
      const result = await notificationService.findAll(validatedQuery, req.user);
      
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/notifications/:id
   * Получить уведомление по ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const notification = await notificationService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/notifications/:id/read
   * Отметить уведомление как прочитанное
   */
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const notification = await notificationService.markAsRead(id, req.user);
      
      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/notifications/read-all
   * Отметить все уведомления как прочитанные
   */
  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/v1/notifications
   * Создать уведомление
   * Доступ: Manager, Owner
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateNotificationDto = req.body;
      
      const notification = await notificationService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/v1/notifications/test
   * Создать тестовое уведомление
   * Доступ: Manager, Owner, SuperAdmin
   */
  async createTest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateTestNotificationDto = req.body;
      
      const notification = await notificationService.createTestNotification(data, req.user);
      
      res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
