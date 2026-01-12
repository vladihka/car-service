/**
 * Контроллер для работы с отчетами
 * Обрабатывает HTTP запросы для управления отчетами
 */

import { Response, NextFunction } from 'express';
import reportService from '../services/report.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { GenerateReportDtoSchema, ReportQueryDtoSchema } from '../types/report.dto';
import { GenerateReportDto, ReportQueryDto } from '../types/report.dto';

/**
 * Контроллер отчетов
 */
export class ReportController {
  /**
   * POST /api/v1/reports/generate
   * Генерировать отчет
   * Доступ: Owner, Manager
   */
  async generate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: GenerateReportDto = req.body;
      
      const report = await reportService.generate(data, req.user);
      
      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports
   * Получить список отчетов
   * Доступ: Owner, Manager
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = req.query.type as string | undefined;
      const branchId = req.query.branchId as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      
      const query: ReportQueryDto = {
        type: type as any,
        branchId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      };
      
      const reports = await reportService.findAll(req.user, query);
      
      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/:id
   * Получить отчет по ID
   * Доступ: Owner, Manager
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const report = await reportService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ReportController();
