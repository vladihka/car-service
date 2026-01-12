/**
 * Контроллер для аналитики и отчетов
 * Обрабатывает HTTP запросы для аналитики
 */

import { Response, NextFunction } from 'express';
import analyticsService from '../services/analytics.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AnalyticsQueryDtoSchema } from '../types/analytics.dto';
import { AnalyticsQueryDto } from '../types/analytics.dto';

/**
 * Контроллер аналитики
 */
export class AnalyticsController {
  /**
   * GET /api/v1/analytics/finance
   * Получить финансовую аналитику
   * Доступ: Owner, Manager (не Client, не Mechanic)
   */
  async getFinance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: AnalyticsQueryDto = {
        from: req.query.from as any,
        to: req.query.to as any,
        branchId: req.query.branchId as string,
        period: (req.query.period as 'day' | 'week' | 'month') || 'day',
      };
      
      // Валидация через Zod (можно добавить middleware)
      const validatedQuery = AnalyticsQueryDtoSchema.parse(query);
      
      const analytics = await analyticsService.getFinanceAnalytics(validatedQuery, req.user);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/analytics/workload
   * Получить аналитику загруженности
   * Доступ: Owner, Manager (Mechanic - только личная статистика)
   */
  async getWorkload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: AnalyticsQueryDto = {
        from: req.query.from as any,
        to: req.query.to as any,
        branchId: req.query.branchId as string,
        period: (req.query.period as 'day' | 'week' | 'month') || 'day',
      };
      
      const validatedQuery = AnalyticsQueryDtoSchema.parse(query);
      
      const analytics = await analyticsService.getWorkloadAnalytics(validatedQuery, req.user);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/analytics/services
   * Получить аналитику услуг
   * Доступ: Owner, Manager (не Client, не Mechanic)
   */
  async getServices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: AnalyticsQueryDto = {
        from: req.query.from as any,
        to: req.query.to as any,
        branchId: req.query.branchId as string,
        period: (req.query.period as 'day' | 'week' | 'month') || 'day',
      };
      
      const validatedQuery = AnalyticsQueryDtoSchema.parse(query);
      
      const analytics = await analyticsService.getServicesAnalytics(validatedQuery, req.user);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/analytics/clients
   * Получить клиентскую аналитику
   * Доступ: Owner, Manager (не Client, не Mechanic)
   */
  async getClients(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: AnalyticsQueryDto = {
        from: req.query.from as any,
        to: req.query.to as any,
        branchId: req.query.branchId as string,
        period: (req.query.period as 'day' | 'week' | 'month') || 'day',
      };
      
      const validatedQuery = AnalyticsQueryDtoSchema.parse(query);
      
      const analytics = await analyticsService.getClientsAnalytics(validatedQuery, req.user);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/analytics/summary
   * Получить общую сводку
   * Доступ: Owner, Manager (не Client, не Mechanic)
   */
  async getSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: AnalyticsQueryDto = {
        from: req.query.from as any,
        to: req.query.to as any,
        branchId: req.query.branchId as string,
        period: (req.query.period as 'day' | 'week' | 'month') || 'day',
      };
      
      const validatedQuery = AnalyticsQueryDtoSchema.parse(query);
      
      const analytics = await analyticsService.getSummary(validatedQuery, req.user);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AnalyticsController();
