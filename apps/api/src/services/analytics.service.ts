/**
 * Сервис для аналитики и отчетов
 * Реализует бизнес-логику для агрегации данных
 */

import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import WorkOrder from '../models/WorkOrder';
import Appointment from '../models/Appointment';
import Service from '../models/Service';
import Client from '../models/Client';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { ForbiddenError } from '../utils/errors';
import {
  AnalyticsQueryDto,
  FinanceAnalyticsResponse,
  WorkloadAnalyticsResponse,
  ServicesAnalyticsResponse,
  ClientsAnalyticsResponse,
  SummaryAnalyticsResponse,
  TimeSeriesDataPoint,
} from '../types/analytics.dto';
import { InvoiceStatus, WorkOrderStatus, AppointmentStatus } from '../types';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class AnalyticsService {
  /**
   * Получить финансовую аналитику
   * Доход по периодам, статистика по счетам
   * 
   * @param query - Параметры фильтрации
   * @param user - Пользователь, запрашивающий аналитику
   * @returns Финансовая аналитика
   */
  async getFinanceAnalytics(query: AnalyticsQueryDto, user: AuthRequest['user']): Promise<FinanceAnalyticsResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Client и Mechanic не имеют доступа к финансовой аналитике
    if (user.role === UserRole.CLIENT || user.role === UserRole.MECHANIC) {
      throw new ForbiddenError('Недостаточно прав для просмотра финансовой аналитики');
    }
    
    const filter = this.buildBaseFilter(query, user);
    const dateGroupFormat = this.getDateGroupFormat(query.period || 'day');
    
    // Базовая фильтрация для счетов
    const invoiceFilter = combinedFilter(user, {});
    if (filter.from || filter.to) {
      invoiceFilter.createdAt = {};
      if (filter.from) invoiceFilter.createdAt.$gte = filter.from;
      if (filter.to) invoiceFilter.createdAt.$lte = filter.to;
    }
    if (query.branchId) {
      invoiceFilter.branchId = new mongoose.Types.ObjectId(query.branchId);
    }
    
    // Агрегация: общая статистика
    const totalStats = await Invoice.aggregate([
      { $match: invoiceFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalInvoices: { $sum: 1 },
          paidInvoices: {
            $sum: { $cond: [{ $eq: ['$status', InvoiceStatus.PAID] }, 1, 0] },
          },
          totalPaidAmount: { $sum: '$paidAmount' },
        },
      },
    ]);
    
    const stats = totalStats[0] || {
      totalRevenue: 0,
      totalInvoices: 0,
      paidInvoices: 0,
      totalPaidAmount: 0,
    };
    
    const averageInvoiceAmount = stats.totalInvoices > 0
      ? stats.totalRevenue / stats.totalInvoices
      : 0;
    
    // Агрегация: доход по периодам
    const revenueByPeriod = await Invoice.aggregate([
      { $match: invoiceFilter },
      {
        $group: {
          _id: { $dateToString: { format: dateGroupFormat, date: '$createdAt' } },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          value: '$revenue',
          _id: 0,
        },
      },
    ]);
    
    // Агрегация: счета по статусам
    const invoicesByStatus = await Invoice.aggregate([
      { $match: invoiceFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          total: 1,
          _id: 0,
        },
      },
    ]);
    
    return {
      totalRevenue: stats.totalRevenue,
      totalInvoices: stats.totalInvoices,
      paidInvoices: stats.paidInvoices,
      averageInvoiceAmount: Math.round(averageInvoiceAmount * 100) / 100,
      revenueByPeriod: revenueByPeriod.map(item => ({
        date: item.date,
        value: item.value,
      })),
      invoicesByStatus: invoicesByStatus.map(item => ({
        status: item.status,
        count: item.count,
        total: item.total,
      })),
      period: query.period || 'day',
    };
  }
  
  /**
   * Получить аналитику загруженности
   * Заказы по статусам, загруженность механиков, конверсия
   * 
   * @param query - Параметры фильтрации
   * @param user - Пользователь, запрашивающий аналитику
   * @returns Аналитика загруженности
   */
  async getWorkloadAnalytics(query: AnalyticsQueryDto, user: AuthRequest['user']): Promise<WorkloadAnalyticsResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Client не имеет доступа
    if (user.role === UserRole.CLIENT) {
      throw new ForbiddenError('Недостаточно прав для просмотра аналитики загруженности');
    }
    
    const filter = this.buildBaseFilter(query, user);
    
    // Базовая фильтрация для заказов
    const workOrderFilter: any = combinedFilter(user, {});
    if (filter.from || filter.to) {
      workOrderFilter.createdAt = {};
      if (filter.from) workOrderFilter.createdAt.$gte = filter.from;
      if (filter.to) workOrderFilter.createdAt.$lte = filter.to;
    }
    if (query.branchId) {
      workOrderFilter.branchId = new mongoose.Types.ObjectId(query.branchId);
    }
    
    // Если Mechanic, показываем только его заказы
    if (user.role === UserRole.MECHANIC) {
      workOrderFilter.assignedTo = new mongoose.Types.ObjectId(user.userId);
    }
    
    // Агрегация: заказы по статусам
    const workOrdersByStatus = await WorkOrder.aggregate([
      { $match: workOrderFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
    
    // Агрегация: загруженность механиков
    const mechanicWorkloadData = await WorkOrder.aggregate([
      { $match: workOrderFilter },
      { $match: { assignedTo: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', WorkOrderStatus.COMPLETED] }, 1, 0] },
          },
          totalHours: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$startedAt', null] }, { $ne: ['$finishedAt', null] }] },
                {
                  $divide: [
                    { $subtract: ['$finishedAt', '$startedAt'] },
                    1000 * 60 * 60, // Конвертация в часы
                  ],
                },
                0,
              ],
            },
          },
        },
      },
      { $limit: 20 }, // Топ 20 механиков
    ]);
    
    // Получить информацию о механиках
    const mechanicIds = mechanicWorkloadData.map((item: any) => item._id);
    const mechanics = await User.find({ _id: { $in: mechanicIds } });
    const mechanicMap = new Map(mechanics.map(m => [m._id.toString(), m]));
    
    const mechanicWorkload = mechanicWorkloadData.map((item: any) => {
      const mechanic = mechanicMap.get(item._id.toString());
      const avgDuration = item.totalOrders > 0 ? item.totalHours / item.totalOrders : 0;
      
      return {
        mechanicId: item._id.toString(),
        mechanicName: mechanic
          ? `${mechanic.firstName} ${mechanic.lastName}`
          : 'Unknown',
        totalOrders: item.totalOrders,
        completedOrders: item.completedOrders,
        totalHours: Math.round(item.totalHours * 100) / 100,
        averageOrderDuration: Math.round(avgDuration * 100) / 100,
      };
    });
    
    // Агрегация: записи по статусам
    const appointmentFilter: any = combinedFilter(user, {});
    if (filter.from || filter.to) {
      appointmentFilter.createdAt = {};
      if (filter.from) appointmentFilter.createdAt.$gte = filter.from;
      if (filter.to) appointmentFilter.createdAt.$lte = filter.to;
    }
    if (query.branchId) {
      appointmentFilter.branchId = new mongoose.Types.ObjectId(query.branchId);
    }
    
    const appointmentsByStatus = await Appointment.aggregate([
      { $match: appointmentFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
    
    // Конверсия: записи -> выполненные заказы
    const totalAppointments = await Appointment.countDocuments(appointmentFilter);
    const completedWorkOrders = await WorkOrder.countDocuments({
      ...workOrderFilter,
      status: WorkOrderStatus.COMPLETED,
    });
    
    const conversionRate = totalAppointments > 0
      ? Math.round((completedWorkOrders / totalAppointments) * 100 * 100) / 100
      : 0;
    
    return {
      workOrdersByStatus: workOrdersByStatus.map((item: any) => ({
        status: item.status,
        count: item.count,
      })),
      mechanicWorkload,
      appointmentsByStatus: appointmentsByStatus.map((item: any) => ({
        status: item.status,
        count: item.count,
      })),
      conversionRate,
      period: query.period || 'day',
    };
  }
  
  /**
   * Получить аналитику услуг
   * Топ услуг по выручке
   * 
   * @param query - Параметры фильтрации
   * @param user - Пользователь, запрашивающий аналитику
   * @returns Аналитика услуг
   */
  async getServicesAnalytics(query: AnalyticsQueryDto, user: AuthRequest['user']): Promise<ServicesAnalyticsResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Client и Mechanic не имеют доступа
    if (user.role === UserRole.CLIENT || user.role === UserRole.MECHANIC) {
      throw new ForbiddenError('Недостаточно прав для просмотра аналитики услуг');
    }
    
    const filter = this.buildBaseFilter(query, user);
    
    // Базовая фильтрация для счетов
    const invoiceFilter: any = combinedFilter(user, {});
    if (filter.from || filter.to) {
      invoiceFilter.createdAt = {};
      if (filter.from) invoiceFilter.createdAt.$gte = filter.from;
      if (filter.to) invoiceFilter.createdAt.$lte = filter.to;
    }
    if (query.branchId) {
      invoiceFilter.branchId = new mongoose.Types.ObjectId(query.branchId);
    }
    
    // Агрегация: топ услуг по выручке
    const topServicesData = await Invoice.aggregate([
      { $match: invoiceFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.serviceId',
          totalRevenue: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] },
          },
          totalQuantity: { $sum: '$items.quantity' },
          averagePrice: { $avg: '$items.price' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $project: {
          serviceId: '$_id',
          totalRevenue: 1,
          totalQuantity: 1,
          averagePrice: 1,
          _id: 0,
        },
      },
    ]);
    
    // Получить информацию об услугах
    const serviceIds = topServicesData
      .map((item: any) => item.serviceId)
      .filter((id: any) => id !== null && id !== undefined);
    
    const services = serviceIds.length > 0
      ? await Service.find({ _id: { $in: serviceIds } })
      : [];
    const serviceMap = new Map(services.map(s => [s._id.toString(), s]));
    
    const topServices = topServicesData.map((item: any) => {
      const service = item.serviceId ? serviceMap.get(item.serviceId.toString()) : null;
      
      return {
        serviceId: item.serviceId?.toString() || 'unknown',
        serviceName: service?.name || 'Unknown Service',
        totalRevenue: Math.round(item.totalRevenue * 100) / 100,
        totalQuantity: item.totalQuantity,
        averagePrice: Math.round(item.averagePrice * 100) / 100,
      };
    });
    
    return {
      topServices,
      servicesByCategory: [], // Можно расширить при наличии категорий
      period: query.period || 'day',
    };
  }
  
  /**
   * Получить клиентскую аналитику
   * Топ клиентов, статистика по клиентам
   * 
   * @param query - Параметры фильтрации
   * @param user - Пользователь, запрашивающий аналитику
   * @returns Клиентская аналитика
   */
  async getClientsAnalytics(query: AnalyticsQueryDto, user: AuthRequest['user']): Promise<ClientsAnalyticsResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Client и Mechanic не имеют доступа
    if (user.role === UserRole.CLIENT || user.role === UserRole.MECHANIC) {
      throw new ForbiddenError('Недостаточно прав для просмотра клиентской аналитики');
    }
    
    const filter = this.buildBaseFilter(query, user);
    
    // Базовая фильтрация
    const baseFilter: any = combinedFilter(user, {});
    if (query.branchId) {
      baseFilter.branchId = new mongoose.Types.ObjectId(query.branchId);
    }
    
    const clientFilter = { ...baseFilter };
    const invoiceFilter: any = { ...baseFilter };
    
    if (filter.from || filter.to) {
      const dateFilter: any = {};
      if (filter.from) dateFilter.$gte = filter.from;
      if (filter.to) dateFilter.$lte = filter.to;
      invoiceFilter.createdAt = dateFilter;
    }
    
    // Общее количество клиентов
    const totalClients = await Client.countDocuments(clientFilter);
    
    // Активные клиенты (с активными заказами)
    const activeClientIds = await WorkOrder.distinct('clientId', {
      ...baseFilter,
      status: { $in: [WorkOrderStatus.PENDING, WorkOrderStatus.IN_PROGRESS] },
    });
    const activeClients = activeClientIds.length;
    
    // Топ клиентов по выручке
    const topClientsData = await Invoice.aggregate([
      { $match: invoiceFilter },
      {
        $group: {
          _id: '$clientId',
          totalSpent: { $sum: '$total' },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $project: {
          clientId: '$_id',
          totalSpent: 1,
          totalOrders: 1,
          averageOrderAmount: { $divide: ['$totalSpent', '$totalOrders'] },
          _id: 0,
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]);
    
    // Получить информацию о клиентах
    const clientIds = topClientsData.map((item: any) => item.clientId);
    const clients = clientIds.length > 0
      ? await Client.find({ _id: { $in: clientIds } })
      : [];
    const clientMap = new Map(clients.map(c => [c._id.toString(), c]));
    
    const topClients = topClientsData.map((item: any) => {
      const client = clientMap.get(item.clientId.toString());
      
      return {
        clientId: item.clientId.toString(),
        clientName: client
          ? `${client.firstName} ${client.lastName}`
          : 'Unknown Client',
        totalSpent: Math.round(item.totalSpent * 100) / 100,
        totalOrders: item.totalOrders,
        averageOrderAmount: Math.round(item.averageOrderAmount * 100) / 100,
      };
    });
    
    // Новые клиенты по периодам
    const dateGroupFormat = this.getDateGroupFormat(query.period || 'day');
    const clientsByPeriodFilter: any = { ...clientFilter };
    if (filter.from || filter.to) {
      clientsByPeriodFilter.createdAt = {};
      if (filter.from) clientsByPeriodFilter.createdAt.$gte = filter.from;
      if (filter.to) clientsByPeriodFilter.createdAt.$lte = filter.to;
    }
    
    const clientsByPeriod = await Client.aggregate([
      { $match: clientsByPeriodFilter },
      {
        $group: {
          _id: { $dateToString: { format: dateGroupFormat, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          value: '$count',
          _id: 0,
        },
      },
    ]);
    
    return {
      totalClients,
      activeClients,
      topClients,
      clientsByPeriod: clientsByPeriod.map((item: any) => ({
        date: item.date,
        value: item.value,
      })),
      period: query.period || 'day',
    };
  }
  
  /**
   * Получить общую сводку (Summary)
   * Основные метрики для дашборда
   * 
   * @param query - Параметры фильтрации
   * @param user - Пользователь, запрашивающий аналитику
   * @returns Общая сводка
   */
  async getSummary(query: AnalyticsQueryDto, user: AuthRequest['user']): Promise<SummaryAnalyticsResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Client и Mechanic не имеют доступа
    if (user.role === UserRole.CLIENT || user.role === UserRole.MECHANIC) {
      throw new ForbiddenError('Недостаточно прав для просмотра сводки');
    }
    
    const filter = this.buildBaseFilter(query, user);
    
    // Базовая фильтрация
    const baseFilter: any = combinedFilter(user, {});
    if (query.branchId) {
      baseFilter.branchId = new mongoose.Types.ObjectId(query.branchId);
    }
    
    // Фильтр с датами
    const dateFilter: any = { ...baseFilter };
    if (filter.from || filter.to) {
      dateFilter.createdAt = {};
      if (filter.from) dateFilter.createdAt.$gte = filter.from;
      if (filter.to) dateFilter.createdAt.$lte = filter.to;
    }
    
    // Финансы
    const financeStats = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalInvoices: { $sum: 1 },
        },
      },
    ]);
    
    const finance = financeStats[0] || { totalRevenue: 0, totalInvoices: 0 };
    const averageInvoiceAmount = finance.totalInvoices > 0
      ? finance.totalRevenue / finance.totalInvoices
      : 0;
    
    // Вычислить рост доходов (сравнение с предыдущим периодом)
    const previousPeriodFilter: any = { ...baseFilter };
    if (filter.from && filter.to) {
      const periodDuration = filter.to.getTime() - filter.from.getTime();
      const previousTo = new Date(filter.from.getTime() - 1);
      const previousFrom = new Date(previousTo.getTime() - periodDuration);
      previousPeriodFilter.createdAt = { $gte: previousFrom, $lte: previousTo };
    }
    
    const previousFinance = await Invoice.aggregate([
      { $match: previousPeriodFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
        },
      },
    ]);
    
    const previousRevenue = previousFinance[0]?.totalRevenue || 0;
    const revenueGrowth = previousRevenue > 0
      ? Math.round(((finance.totalRevenue - previousRevenue) / previousRevenue) * 100 * 100) / 100
      : 0;
    
    // Заказы
    const workOrderFilter = { ...dateFilter };
    const workOrderStats = await WorkOrder.aggregate([
      { $match: workOrderFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', WorkOrderStatus.COMPLETED] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', WorkOrderStatus.IN_PROGRESS] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', WorkOrderStatus.PENDING] }, 1, 0] },
          },
        },
      },
    ]);
    
    const workOrders = workOrderStats[0] || {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
    };
    
    const completionRate = workOrders.total > 0
      ? Math.round((workOrders.completed / workOrders.total) * 100 * 100) / 100
      : 0;
    
    // Записи
    const appointmentFilter = { ...dateFilter };
    const appointmentStats = await Appointment.aggregate([
      { $match: appointmentFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', AppointmentStatus.CONFIRMED] }, 1, 0] },
          },
          done: {
            $sum: { $cond: [{ $eq: ['$status', AppointmentStatus.DONE] }, 1, 0] },
          },
        },
      },
    ]);
    
    const appointments = appointmentStats[0] || {
      total: 0,
      confirmed: 0,
      done: 0,
    };
    
    const conversionRate = appointments.total > 0
      ? Math.round((workOrders.completed / appointments.total) * 100 * 100) / 100
      : 0;
    
    // Клиенты
    const clientFilter = { ...baseFilter };
    const activeClientIds = await WorkOrder.distinct('clientId', {
      ...baseFilter,
      status: { $in: [WorkOrderStatus.PENDING, WorkOrderStatus.IN_PROGRESS] },
    });
    
    const clientsByPeriodFilter: any = { ...clientFilter };
    if (filter.from || filter.to) {
      clientsByPeriodFilter.createdAt = {};
      if (filter.from) clientsByPeriodFilter.createdAt.$gte = filter.from;
      if (filter.to) clientsByPeriodFilter.createdAt.$lte = filter.to;
    }
    
    const newClients = await Client.countDocuments(clientsByPeriodFilter);
    const totalClients = await Client.countDocuments(clientFilter);
    
    // Топ услуга
    const topServiceData = await Invoice.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.serviceId',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          name: { $first: '$items.name' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 1 },
    ]);
    
    const topService = topServiceData[0]
      ? {
          name: topServiceData[0].name,
          revenue: Math.round(topServiceData[0].revenue * 100) / 100,
        }
      : null;
    
    const totalServices = await Service.countDocuments(
      tenantFilter(user, { isActive: true })
    );
    
    return {
      finance: {
        totalRevenue: Math.round(finance.totalRevenue * 100) / 100,
        totalInvoices: finance.totalInvoices,
        averageInvoiceAmount: Math.round(averageInvoiceAmount * 100) / 100,
        revenueGrowth,
      },
      workOrders: {
        total: workOrders.total,
        completed: workOrders.completed,
        inProgress: workOrders.inProgress,
        pending: workOrders.pending,
        completionRate,
      },
      appointments: {
        total: appointments.total,
        confirmed: appointments.confirmed,
        completed: appointments.done,
        conversionRate,
      },
      clients: {
        total: totalClients,
        active: activeClientIds.length,
        newClients,
      },
      services: {
        totalServices,
        topService,
      },
      period: {
        from: filter.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 дней назад
        to: filter.to || new Date(),
      },
    };
  }
  
  /**
   * Построить базовый фильтр по датам
   */
  private buildBaseFilter(query: AnalyticsQueryDto, user: AuthRequest['user']): {
    from?: Date;
    to?: Date;
  } {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 дней назад
    
    return {
      from: query.from || defaultFrom,
      to: query.to || now,
    };
  }
  
  /**
   * Получить формат группировки дат для MongoDB $dateToString
   */
  private getDateGroupFormat(period: 'day' | 'week' | 'month'): string {
    switch (period) {
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-W%V'; // ISO week format
      case 'month':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }
}

export default new AnalyticsService();
