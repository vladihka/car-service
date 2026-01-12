/**
 * Контроллер для работы с событиями аналитики
 * Обрабатывает HTTP запросы для управления событиями
 */

import { Response, NextFunction } from 'express';
import analyticsEventService from '../services/analytics-event.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { AnalyticsEventQueryDtoSchema } from '../types/analytics-event.dto';
import { AnalyticsEventQueryDto } from '../types/analytics-event.dto';

/**
 * Контроллер событий аналитики
 */
export class AnalyticsEventController {
  /**
   * GET /api/v1/analytics/events
   * Получить список событий
   * Доступ: Owner, Manager
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const entityId = req.query.entityId as string | undefined;
      const userId = req.query.userId as string | undefined;
      const clientId = req.query.clientId as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const query: AnalyticsEventQueryDto = {
        action: action as any,
        entityType,
        entityId,
        userId,
        clientId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        limit,
      };
      
      const events = await analyticsEventService.findAll(req.user, query);
      
      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AnalyticsEventController();
