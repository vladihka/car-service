/**
 * Сервис для работы с услугами (Services)
 * Реализует бизнес-логику для управления услугами
 */

import Service, { IService } from '../models/Service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { CreateServiceDto, UpdateServiceDto, ServiceResponse } from '../types/service.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class ServiceService {
  /**
   * Создать новую услугу
   * Owner, Manager могут создавать услуги
   * 
   * @param data - Данные для создания услуги
   * @param user - Пользователь, создающий услугу
   * @returns Созданная услуга
   */
  async create(data: CreateServiceDto, user: AuthRequest['user']): Promise<ServiceResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Owner, Manager и SuperAdmin могут создавать услуги
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для создания услуги');
    }
    
    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }
    
    // Проверить уникальность названия в рамках организации
    const existingService = await Service.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      name: data.name.trim(),
    });
    
    if (existingService) {
      throw new ConflictError('Услуга с таким названием уже существует');
    }
    
    // Создать услугу
    const service = new Service({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      name: data.name.trim(),
      description: data.description?.trim(),
      basePrice: data.basePrice,
      durationMinutes: data.durationMinutes,
      isActive: true,
    });
    
    await service.save();
    
    logger.info(`Service created: ${service.name} by ${user.userId}`);
    
    return this.mapToResponse(service);
  }
  
  /**
   * Получить список услуг
   * Owner, Manager видят услуги своей организации
   * 
   * @param user - Пользователь, запрашивающий список
   * @returns Список услуг
   */
  async findAll(user: AuthRequest['user'], includeInactive = false): Promise<ServiceResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    const filter = tenantFilter(user, {});
    
    if (!includeInactive) {
      filter.isActive = true;
    }
    
    const services = await Service.find(filter).sort({ name: 1 });
    
    return services.map(service => this.mapToResponse(service));
  }
  
  /**
   * Получить услугу по ID
   * 
   * @param id - ID услуги
   * @param user - Пользователь, запрашивающий услугу
   * @returns Услуга
   */
  async findById(id: string, user: AuthRequest['user']): Promise<ServiceResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Услуга не найдена');
    }
    
    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const service = await Service.findOne(filter);
    
    if (!service) {
      throw new NotFoundError('Услуга не найдена');
    }
    
    return this.mapToResponse(service);
  }
  
  /**
   * Обновить услугу
   * Owner, Manager могут обновлять услуги
   * 
   * @param id - ID услуги
   * @param data - Данные для обновления
   * @param user - Пользователь, обновляющий услугу
   * @returns Обновленная услуга
   */
  async update(id: string, data: UpdateServiceDto, user: AuthRequest['user']): Promise<ServiceResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Owner, Manager и SuperAdmin могут обновлять услуги
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для обновления услуги');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Услуга не найдена');
    }
    
    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const service = await Service.findOne(filter);
    
    if (!service) {
      throw new NotFoundError('Услуга не найдена');
    }
    
    // Проверить уникальность названия, если оно обновляется
    if (data.name && data.name.trim() !== service.name) {
      const existingService = await Service.findOne({
        organizationId: service.organizationId,
        name: data.name.trim(),
        _id: { $ne: service._id },
      });
      
      if (existingService) {
        throw new ConflictError('Услуга с таким названием уже существует');
      }
    }
    
    // Обновить поля
    Object.assign(service, {
      ...data,
      name: data.name?.trim() || service.name,
      description: data.description?.trim() ?? service.description,
    });
    
    await service.save();
    
    logger.info(`Service updated: ${id} by ${user.userId}`);
    
    return this.mapToResponse(service);
  }
  
  /**
   * Удалить услугу
   * Owner может удалять услуги
   * 
   * @param id - ID услуги
   * @param user - Пользователь, удаляющий услугу
   */
  async delete(id: string, user: AuthRequest['user']): Promise<void> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Owner и SuperAdmin могут удалять услуги
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для удаления услуги');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Услуга не найдена');
    }
    
    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const service = await Service.findOne(filter);
    
    if (!service) {
      throw new NotFoundError('Услуга не найдена');
    }
    
    await service.deleteOne();
    
    logger.info(`Service deleted: ${id} by ${user.userId}`);
  }
  
  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(service: IService): ServiceResponse {
    return {
      id: service._id.toString(),
      organizationId: service.organizationId.toString(),
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}

export default new ServiceService();
