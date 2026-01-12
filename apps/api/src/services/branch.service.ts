/**
 * Сервис для работы с филиалами
 * Реализует бизнес-логику для управления филиалами
 */

import Branch, { IBranch } from '../models/Branch';
import Organization from '../models/Organization';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { CreateBranchDto, UpdateBranchDto, BranchResponse } from '../types/branch.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class BranchService {
  /**
   * Создать новый филиал
   * Owner может создавать филиалы в своей организации
   * 
   * @param data - Данные для создания филиала
   * @param user - Пользователь, создающий филиал
   * @returns Созданный филиал
   */
  async create(data: CreateBranchDto, user: AuthRequest['user']): Promise<BranchResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // SuperAdmin и Owner могут создавать филиалы
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenError('Только Owner может создавать филиалы');
    }
    
    // Определить organizationId
    const organizationId = data.organizationId 
      ? new mongoose.Types.ObjectId(data.organizationId)
      : user.organizationId
        ? new mongoose.Types.ObjectId(user.organizationId)
        : null;
    
    if (!organizationId) {
      throw new ForbiddenError('Требуется organizationId');
    }
    
    // Проверить, что организация существует
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Организация не найдена');
    }
    
    // Для Owner проверяем, что это его организация
    if (user.role === UserRole.OWNER && user.organizationId !== organizationId.toString()) {
      throw new ForbiddenError('Вы можете создавать филиалы только в своей организации');
    }
    
    // Проверить лимит филиалов
    const branchCount = await Branch.countDocuments({ organizationId });
    if (branchCount >= organization.subscription.maxBranches) {
      throw new ForbiddenError(`Достигнут лимит филиалов (${organization.subscription.maxBranches})`);
    }
    
    // Создать филиал
    const branch = new Branch({
      ...data,
      organizationId,
      email: data.email?.toLowerCase(),
    });
    
    await branch.save();
    
    logger.info(`Branch created: ${branch.name} in organization ${organizationId} by ${user.userId}`);
    
    return this.mapToResponse(branch);
  }
  
  /**
   * Получить список филиалов
   * SuperAdmin/Owner видят все филиалы своей организации
   * Manager видит только свой филиал
   * 
   * @param user - Пользователь, запрашивающий список
   * @param organizationId - Опциональный фильтр по организации (для SuperAdmin)
   * @returns Список филиалов
   */
  async findAll(user: AuthRequest['user'], organizationId?: string): Promise<BranchResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    let filter: any = {};
    
    // Если указан organizationId, добавить в фильтр (для SuperAdmin)
    if (organizationId && user.role === UserRole.SUPER_ADMIN) {
      filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    } else {
      // Применить tenant + branch фильтры
      filter = combinedFilter(user, filter);
    }
    
    const branches = await Branch.find(filter);
    
    return branches.map(branch => this.mapToResponse(branch));
  }
  
  /**
   * Получить филиал по ID
   * SuperAdmin/Owner могут получить любой филиал своей организации
   * Manager может получить только свой филиал
   * 
   * @param id - ID филиала
   * @param user - Пользователь, запрашивающий филиал
   * @returns Филиал
   */
  async findById(id: string, user: AuthRequest['user']): Promise<BranchResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Филиал не найден');
    }
    
    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const branch = await Branch.findOne(filter);
    
    if (!branch) {
      throw new NotFoundError('Филиал не найден');
    }
    
    return this.mapToResponse(branch);
  }
  
  /**
   * Обновить филиал
   * Owner может обновить любой филиал своей организации
   * Manager может обновить только свой филиал
   * 
   * @param id - ID филиала
   * @param data - Данные для обновления
   * @param user - Пользователь, обновляющий филиал
   * @returns Обновленный филиал
   */
  async update(id: string, data: UpdateBranchDto, user: AuthRequest['user']): Promise<BranchResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Филиал не найден');
    }
    
    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const branch = await Branch.findOne(filter);
    
    if (!branch) {
      throw new NotFoundError('Филиал не найден');
    }
    
    // Обновить поля
    Object.assign(branch, {
      ...data,
      email: data.email?.toLowerCase() || branch.email,
    });
    
    await branch.save();
    
    logger.info(`Branch updated: ${id} by ${user.userId}`);
    
    return this.mapToResponse(branch);
  }
  
  /**
   * Удалить филиал
   * Только Owner может удалять филиалы
   * 
   * @param id - ID филиала
   * @param user - Пользователь, удаляющий филиал
   */
  async delete(id: string, user: AuthRequest['user']): Promise<void> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только SuperAdmin и Owner могут удалять филиалы
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenError('Только Owner может удалять филиалы');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Филиал не найден');
    }
    
    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const branch = await Branch.findOne(filter);
    
    if (!branch) {
      throw new NotFoundError('Филиал не найден');
    }
    
    await branch.deleteOne();
    
    logger.info(`Branch deleted: ${id} by ${user.userId}`);
  }
  
  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(branch: IBranch): BranchResponse {
    return {
      id: branch._id.toString(),
      organizationId: branch.organizationId.toString(),
      name: branch.name,
      email: branch.email,
      phone: branch.phone,
      address: branch.address,
      isActive: branch.isActive,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }
}

export default new BranchService();
