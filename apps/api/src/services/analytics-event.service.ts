/**
 * Сервис для работы с событиями аналитики
 * Реализует бизнес-логику для сбора и анализа событий
 */

import AnalyticsEvent, { IAnalyticsEvent, AnalyticsAction } from '../models/AnalyticsEvent';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { ForbiddenError } from '../utils/errors';
import { CreateAnalyticsEventDto, AnalyticsEventQueryDto, AnalyticsEventResponse } from '../types/analytics-event.dto';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class AnalyticsEventService {
  /**
   * Создать событие аналитики
   * Используется для сбора событий из различных частей системы
   */
  async create(
    data: CreateAnalyticsEventDto,
    user: AuthRequest['user'],
    metadata?: { organizationId?: string; branchId?: string; clientId?: string; entityType?: string; entityId?: string }
  ): Promise<IAnalyticsEvent> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const event = new AnalyticsEvent({
      organizationId: metadata?.organizationId
        ? new mongoose.Types.ObjectId(metadata.organizationId)
        : user.organizationId
        ? new mongoose.Types.ObjectId(user.organizationId)
        : undefined,
      branchId: metadata?.branchId
        ? new mongoose.Types.ObjectId(metadata.branchId)
        : user.branchId
        ? new mongoose.Types.ObjectId(user.branchId)
        : undefined,
      userId: new mongoose.Types.ObjectId(user.userId),
      clientId: metadata?.clientId ? new mongoose.Types.ObjectId(metadata.clientId) : undefined,
      action: data.action,
      entityType: metadata?.entityType || data.entityType,
      entityId: metadata?.entityId
        ? new mongoose.Types.ObjectId(metadata.entityId)
        : data.entityId
        ? new mongoose.Types.ObjectId(data.entityId)
        : undefined,
      metadata: data.metadata || {},
      timestamp: new Date(),
    });

    await event.save();

    logger.debug(`Analytics event created: ${data.action} by ${user.userId}`);

    return event;
  }

  /**
   * Получить список событий
   */
  async findAll(user: AuthRequest['user'], query: AnalyticsEventQueryDto): Promise<AnalyticsEventResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter: any = {};

    // Применить фильтры организации
    if (user.organizationId) {
      filter.organizationId = new mongoose.Types.ObjectId(user.organizationId);
    }
    if (user.branchId && user.role !== 'SuperAdmin' && user.role !== 'Owner') {
      filter.branchId = new mongoose.Types.ObjectId(user.branchId);
    }

    // Применить дополнительные фильтры
    if (query.action) {
      filter.action = query.action;
    }
    if (query.entityType) {
      filter.entityType = query.entityType;
    }
    if (query.entityId) {
      filter.entityId = new mongoose.Types.ObjectId(query.entityId);
    }
    if (query.userId) {
      filter.userId = new mongoose.Types.ObjectId(query.userId);
    }
    if (query.clientId) {
      filter.clientId = new mongoose.Types.ObjectId(query.clientId);
    }
    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) filter.timestamp.$gte = query.from;
      if (query.to) filter.timestamp.$lte = query.to;
    }

    const events = await AnalyticsEvent.find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('clientId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(query.limit || 100);

    return events.map(event => this.mapToResponse(event));
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(event: IAnalyticsEvent & { userId?: any; clientId?: any }): AnalyticsEventResponse {
    return {
      id: event._id.toString(),
      organizationId: event.organizationId?.toString(),
      branchId: event.branchId?.toString(),
      userId: event.userId._id?.toString() || event.userId.toString(),
      userName: event.userId
        ? `${event.userId.firstName || ''} ${event.userId.lastName || ''}`.trim() || event.userId.email
        : undefined,
      clientId: event.clientId?._id?.toString() || event.clientId?.toString(),
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId?.toString(),
      metadata: event.metadata,
      timestamp: event.timestamp,
      createdAt: event.createdAt,
    };
  }
}

export default new AnalyticsEventService();
