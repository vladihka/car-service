/**
 * Сервис для работы с организациями
 * Реализует бизнес-логику для управления организациями
 */

import Organization, { IOrganization } from '../models/Organization';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import { tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationResponse } from '../types/organization.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class OrganizationService {
  /**
   * Создать новую организацию
   * Только SuperAdmin может создавать организации
   * 
   * @param data - Данные для создания организации
   * @param user - Пользователь, создающий организацию
   * @returns Созданная организация
   */
  async create(data: CreateOrganizationDto, user: AuthRequest['user']): Promise<OrganizationResponse> {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Только SuperAdmin может создавать организации');
    }
    
    // Проверить, что владелец существует и имеет роль Owner
    const owner = await User.findById(data.ownerId);
    if (!owner) {
      throw new NotFoundError('Владелец не найден');
    }
    
    if (owner.role !== UserRole.OWNER) {
      throw new ForbiddenError('Владелец должен иметь роль Owner');
    }
    
    // Проверить уникальность email
    const existingOrg = await Organization.findOne({ email: data.email.toLowerCase() });
    if (existingOrg) {
      throw new ConflictError('Организация с таким email уже существует');
    }
    
    // Создать организацию
    const organization = new Organization({
      ...data,
      email: data.email.toLowerCase(),
      ownerId: new mongoose.Types.ObjectId(data.ownerId),
    });
    
    await organization.save();
    
    // Обновить organizationId у владельца
    owner.organizationId = organization._id;
    await owner.save();
    
    logger.info(`Organization created: ${organization.name} by ${user.userId}`);
    
    return this.mapToResponse(organization);
  }
  
  /**
   * Получить список организаций
   * SuperAdmin видит все организации
   * Owner видит только свою организацию
   * 
   * @param user - Пользователь, запрашивающий список
   * @returns Список организаций
   */
  async findAll(user: AuthRequest['user']): Promise<OrganizationResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    const filter = tenantFilter(user, {});
    const organizations = await Organization.find(filter).populate('ownerId', 'firstName lastName email');
    
    return organizations.map(org => this.mapToResponse(org));
  }
  
  /**
   * Получить организацию по ID
   * SuperAdmin может получить любую организацию
   * Owner может получить только свою организацию
   * 
   * @param id - ID организации
   * @param user - Пользователь, запрашивающий организацию
   * @returns Организация
   */
  async findById(id: string, user: AuthRequest['user']): Promise<OrganizationResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Организация не найдена');
    }
    
    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const organization = await Organization.findOne(filter).populate('ownerId', 'firstName lastName email');
    
    if (!organization) {
      throw new NotFoundError('Организация не найдена');
    }
    
    return this.mapToResponse(organization);
  }
  
  /**
   * Обновить организацию
   * SuperAdmin может обновить любую организацию
   * Owner может обновить только свою организацию
   * 
   * @param id - ID организации
   * @param data - Данные для обновления
   * @param user - Пользователь, обновляющий организацию
   * @returns Обновленная организация
   */
  async update(id: string, data: UpdateOrganizationDto, user: AuthRequest['user']): Promise<OrganizationResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Организация не найдена');
    }
    
    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const organization = await Organization.findOne(filter);
    
    if (!organization) {
      throw new NotFoundError('Организация не найдена');
    }
    
    // Проверить уникальность email, если он обновляется
    if (data.email && data.email.toLowerCase() !== organization.email) {
      const existingOrg = await Organization.findOne({ email: data.email.toLowerCase() });
      if (existingOrg) {
        throw new ConflictError('Организация с таким email уже существует');
      }
    }
    
    // Обновить поля
    Object.assign(organization, {
      ...data,
      email: data.email?.toLowerCase() || organization.email,
    });
    
    await organization.save();
    
    logger.info(`Organization updated: ${id} by ${user.userId}`);
    
    return this.mapToResponse(organization);
  }
  
  /**
   * Удалить организацию
   * Только SuperAdmin может удалять организации
   * 
   * @param id - ID организации
   * @param user - Пользователь, удаляющий организацию
   */
  async delete(id: string, user: AuthRequest['user']): Promise<void> {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Только SuperAdmin может удалять организации');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Организация не найдена');
    }
    
    const organization = await Organization.findById(id);
    if (!organization) {
      throw new NotFoundError('Организация не найдена');
    }
    
    await organization.deleteOne();
    
    logger.info(`Organization deleted: ${id} by ${user.userId}`);
  }
  
  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(organization: IOrganization): OrganizationResponse {
    return {
      id: organization._id.toString(),
      name: organization.name,
      ownerId: organization.ownerId.toString(),
      email: organization.email,
      phone: organization.phone,
      address: organization.address,
      subscription: {
        plan: organization.subscription.plan,
        status: organization.subscription.status,
        startDate: organization.subscription.startDate,
        endDate: organization.subscription.endDate,
        maxBranches: organization.subscription.maxBranches,
        maxUsers: organization.subscription.maxUsers,
      },
      isActive: organization.isActive,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}

export default new OrganizationService();
