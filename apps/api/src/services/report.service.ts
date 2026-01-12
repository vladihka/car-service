/**
 * Сервис для работы с отчетами
 * Реализует бизнес-логику для генерации и управления отчетами
 */

import Report, { IReport, ReportType } from '../models/Report';
import analyticsService from './analytics.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { GenerateReportDto, ReportQueryDto, ReportResponse } from '../types/report.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class ReportService {
  /**
   * Генерировать отчет
   */
  async generate(data: GenerateReportDto, user: AuthRequest['user']): Promise<ReportResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner, Manager и SuperAdmin могут генерировать отчеты
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для генерации отчетов');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверить, есть ли кэшированный отчет
    if (data.cacheHours && data.cacheHours > 0) {
      const cachedReport = await this.findCachedReport(data.type, data.filters, user.organizationId, user.branchId);
      if (cachedReport) {
        logger.info(`Using cached report: ${cachedReport._id} for type ${data.type}`);
        return this.mapToResponse(cachedReport);
      }
    }

    // Генерировать данные отчета
    const reportData = await this.generateReportData(data.type, data.filters || {}, user);

    // Определить время истечения кэша
    let expiresAt: Date | undefined;
    if (data.cacheHours && data.cacheHours > 0) {
      expiresAt = new Date(Date.now() + data.cacheHours * 60 * 60 * 1000);
    }

    // Создать отчет
    const report = new Report({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      branchId: user.branchId ? new mongoose.Types.ObjectId(user.branchId) : undefined,
      type: data.type,
      filters: data.filters || {},
      generatedAt: new Date(),
      generatedBy: new mongoose.Types.ObjectId(user.userId),
      data: reportData,
      expiresAt,
    });

    await report.save();

    logger.info(`Report generated: ${report._id} type ${data.type} by ${user.userId}`);

    return this.mapToResponse(report);
  }

  /**
   * Генерировать данные отчета
   */
  private async generateReportData(type: ReportType, filters: any, user: AuthRequest['user']): Promise<any> {
    const dateRange = filters.dateRange || {};

    switch (type) {
      case ReportType.REVENUE:
        return await this.generateRevenueReport(dateRange, filters, user);

      case ReportType.WORK_ORDERS:
        return await this.generateWorkOrdersReport(dateRange, filters, user);

      case ReportType.APPOINTMENTS:
        return await this.generateAppointmentsReport(dateRange, filters, user);

      case ReportType.MECHANICS_PERFORMANCE:
        return await this.generateMechanicsPerformanceReport(dateRange, filters, user);

      case ReportType.CLIENT_ACTIVITY:
        return await this.generateClientActivityReport(dateRange, filters, user);

      case ReportType.PARTS_USAGE:
        return await this.generatePartsUsageReport(dateRange, filters, user);

      case ReportType.SERVICES_POPULARITY:
        return await this.generateServicesPopularityReport(dateRange, filters, user);

      default:
        throw new BadRequestError(`Неизвестный тип отчета: ${type}`);
    }
  }

  /**
   * Генерация отчета по доходам
   */
  private async generateRevenueReport(dateRange: any, filters: any, user: AuthRequest['user']): Promise<any> {
    // Используем существующий сервис аналитики
    const financeData = await analyticsService.getFinanceAnalytics(
      {
        from: dateRange.from,
        to: dateRange.to,
        branchId: filters.branchId,
        period: 'day',
      },
      user
    );

    return {
      summary: {
        totalRevenue: financeData.totalRevenue,
        averageInvoiceAmount: financeData.averageInvoiceAmount,
        totalInvoices: financeData.totalInvoices,
      },
      series: financeData.revenueByPeriod,
      categories: financeData.invoicesByStatus.map(item => ({
        name: item.status,
        value: item.total,
        count: item.count,
      })),
    };
  }

  /**
   * Генерация отчета по заказам
   */
  private async generateWorkOrdersReport(dateRange: any, filters: any, user: AuthRequest['user']): Promise<any> {
    const workloadData = await analyticsService.getWorkloadAnalytics(
      {
        from: dateRange.from,
        to: dateRange.to,
        branchId: filters.branchId,
        period: 'day',
      },
      user
    );

    return {
      summary: {
        totalOrders: workloadData.workOrdersByStatus.reduce((sum, item) => sum + item.count, 0),
        conversionRate: workloadData.conversionRate,
      },
      series: workloadData.workOrdersByStatus,
      categories: workloadData.mechanicWorkload,
    };
  }

  /**
   * Генерация отчета по записям
   */
  private async generateAppointmentsReport(dateRange: any, filters: any, user: AuthRequest['user']): Promise<any> {
    // Упрощенная реализация - можно расширить
    return {
      summary: {
        totalAppointments: 0,
      },
      series: [],
    };
  }

  /**
   * Генерация отчета по производительности механиков
   */
  private async generateMechanicsPerformanceReport(dateRange: any, filters: any, user: AuthRequest['user']): Promise<any> {
    const workloadData = await analyticsService.getWorkloadAnalytics(
      {
        from: dateRange.from,
        to: dateRange.to,
        branchId: filters.branchId,
        period: 'day',
      },
      user
    );

    return {
      summary: {
        totalMechanics: workloadData.mechanicWorkload.length,
      },
      categories: workloadData.mechanicWorkload,
    };
  }

  /**
   * Генерация отчета по активности клиентов
   */
  private async generateClientActivityReport(dateRange: any, filters: any, user: AuthRequest['user']): Promise<any> {
    // Упрощенная реализация - можно расширить
    return {
      summary: {
        totalClients: 0,
        activeClients: 0,
      },
      series: [],
    };
  }

  /**
   * Генерация отчета по использованию запчастей
   */
  private async generatePartsUsageReport(dateRange: any, filters: any, user: AuthRequest['user']): Promise<any> {
    // Упрощенная реализация - можно расширить
    return {
      summary: {
        totalPartsUsed: 0,
      },
      categories: [],
    };
  }

  /**
   * Генерация отчета по популярности услуг
   */
  private async generateServicesPopularityReport(dateRange: any, filters: any, user: AuthRequest['user']): Promise<any> {
    const serviceData = await analyticsService.getServicesAnalytics(
      {
        from: dateRange.from,
        to: dateRange.to,
        branchId: filters.branchId,
        period: 'day',
      },
      user
    );

    return {
      summary: {
        totalServices: serviceData.topServices.length,
      },
      categories: serviceData.topServices,
    };
  }

  /**
   * Найти кэшированный отчет
   */
  private async findCachedReport(
    type: ReportType,
    filters: any,
    organizationId: string,
    branchId?: string
  ): Promise<IReport | null> {
    const filter: any = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      type,
      expiresAt: { $gt: new Date() },
    };

    if (branchId) {
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    // Упрощенная проверка фильтров (можно улучшить)
    if (filters && Object.keys(filters).length > 0) {
      // В реальной системе нужно сравнивать фильтры более точно
      filter['filters.dateRange.from'] = filters.dateRange?.from;
      filter['filters.dateRange.to'] = filters.dateRange?.to;
    }

    const report = await Report.findOne(filter).sort({ generatedAt: -1 });

    return report;
  }

  /**
   * Получить список отчетов
   */
  async findAll(user: AuthRequest['user'], query: ReportQueryDto): Promise<ReportResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter: any = combinedFilter(user, {});

    // Применить фильтры
    if (query.type) {
      filter.type = query.type;
    }
    if (query.branchId) {
      filter.branchId = new mongoose.Types.ObjectId(query.branchId);
    }
    if (query.from || query.to) {
      filter.generatedAt = {};
      if (query.from) filter.generatedAt.$gte = query.from;
      if (query.to) filter.generatedAt.$lte = query.to;
    }

    const reports = await Report.find(filter)
      .populate('generatedBy', 'firstName lastName')
      .sort({ generatedAt: -1 })
      .limit(100);

    return reports.map(report => this.mapToResponse(report));
  }

  /**
   * Получить отчет по ID
   */
  async findById(id: string, user: AuthRequest['user']): Promise<ReportResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Отчет не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const report = await Report.findOne(filter).populate('generatedBy', 'firstName lastName');

    if (!report) {
      throw new NotFoundError('Отчет не найден');
    }

    return this.mapToResponse(report);
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(report: IReport & { generatedBy?: any }): ReportResponse {
    return {
      id: report._id.toString(),
      organizationId: report.organizationId.toString(),
      branchId: report.branchId?.toString(),
      type: report.type,
      filters: report.filters,
      generatedAt: report.generatedAt,
      generatedBy: report.generatedBy._id?.toString() || report.generatedBy.toString(),
      generatedByName: report.generatedBy
        ? `${report.generatedBy.firstName || ''} ${report.generatedBy.lastName || ''}`.trim()
        : undefined,
      data: report.data,
      expiresAt: report.expiresAt,
      createdAt: report.createdAt,
    };
  }
}

export default new ReportService();
