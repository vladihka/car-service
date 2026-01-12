import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ForbiddenError } from '../utils/errors';
import { UserRole } from '../types';
import mongoose from 'mongoose';

/**
 * Multi-tenant middleware для автоматической фильтрации данных
 * Ограничивает доступ к данным в зависимости от роли и привязки к организации/филиалу
 */

/**
 * Проверяет, что пользователь имеет доступ к организации
 * SuperAdmin - имеет доступ ко всем организациям
 * Owner - имеет доступ только к своей организации
 * Manager/Mechanic/Client - требуют organizationId
 */
export const requireTenant = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ForbiddenError('Требуется аутентификация'));
  }
  
  // SuperAdmin имеет доступ ко всем организациям
  if (req.user.role === UserRole.SUPER_ADMIN) {
    return next();
  }
  
  // Остальные роли требуют organizationId
  if (!req.user.organizationId) {
    return next(new ForbiddenError('Требуется доступ к организации'));
  }
  
  next();
};

/**
 * Проверяет, что пользователь имеет доступ к филиалу
 * SuperAdmin/Owner - имеют доступ ко всем филиалам своей организации
 * Manager/Mechanic - требуют branchId
 */
export const requireBranch = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ForbiddenError('Требуется аутентификация'));
  }
  
  // SuperAdmin и Owner имеют доступ ко всем филиалам
  const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.OWNER];
  
  if (allowedRoles.includes(req.user.role as UserRole)) {
    return next();
  }
  
  // Manager и Mechanic требуют branchId
  if (!req.user.branchId) {
    return next(new ForbiddenError('Требуется доступ к филиалу'));
  }
  
  next();
};

/**
 * Функция для автоматической фильтрации данных по organizationId
 * Используется в сервисах для ограничения доступа к данным
 * 
 * @param user - Пользователь из JWT payload
 * @param query - Mongoose query объект
 * @returns Обновленный query с фильтром по organizationId
 * 
 * @example
 * const filter = tenantFilter(req.user, {});
 * const users = await User.find(filter);
 */
export const tenantFilter = <T extends Record<string, any>>(
  user: AuthRequest['user'],
  query: T = {} as T
): T & { organizationId?: mongoose.Types.ObjectId } => {
  if (!user) {
    return query;
  }
  
  // SuperAdmin видит все данные
  if (user.role === UserRole.SUPER_ADMIN) {
    return query;
  }
  
  // Owner видит только данные своей организации
  if (user.role === UserRole.OWNER && user.organizationId) {
    return {
      ...query,
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    };
  }
  
  // Manager/Mechanic/Client видят только данные своей организации
  if (user.organizationId) {
    return {
      ...query,
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    };
  }
  
  return query;
};

/**
 * Функция для автоматической фильтрации данных по branchId
 * Используется для ограничения доступа к данным филиала
 * 
 * @param user - Пользователь из JWT payload
 * @param query - Mongoose query объект
 * @returns Обновленный query с фильтром по branchId (если требуется)
 * 
 * @example
 * const filter = branchFilter(req.user, {});
 * const workOrders = await WorkOrder.find(filter);
 */
export const branchFilter = <T extends Record<string, any>>(
  user: AuthRequest['user'],
  query: T = {} as T
): T & { branchId?: mongoose.Types.ObjectId } => {
  if (!user) {
    return query;
  }
  
  // SuperAdmin и Owner видят все филиалы своей организации
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OWNER) {
    // Для Owner фильтруем только по organizationId (через tenantFilter)
    return query;
  }
  
  // Manager и Mechanic видят только свой филиал
  if ((user.role === UserRole.MANAGER || user.role === UserRole.MECHANIC) && user.branchId) {
    return {
      ...query,
      branchId: new mongoose.Types.ObjectId(user.branchId),
    };
  }
  
  return query;
};

/**
 * Комбинированный фильтр для tenant + branch
 * Применяет оба фильтра одновременно
 * 
 * @param user - Пользователь из JWT payload
 * @param query - Mongoose query объект
 * @returns Обновленный query с фильтрами
 */
export const combinedFilter = <T extends Record<string, any>>(
  user: AuthRequest['user'],
  query: T = {} as T
): T & { organizationId?: mongoose.Types.ObjectId; branchId?: mongoose.Types.ObjectId } => {
  const orgFilter = tenantFilter(user, query);
  return branchFilter(user, orgFilter);
};
