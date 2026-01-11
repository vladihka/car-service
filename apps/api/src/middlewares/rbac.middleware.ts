import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ForbiddenError } from '../utils/errors';
import { Permission } from '../types/permissions';
import { UserRole } from '../types';

/**
 * Middleware для проверки прав доступа (permissions)
 * @param permission Требуемое право доступа
 * @returns Middleware функция
 * 
 * @example
 * router.get('/users', authenticate, can('users:read'), getUsers);
 */
export const can = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Требуется аутентификация'));
    }
    
    if (!req.user.permissions.includes(permission)) {
      return next(new ForbiddenError(`Недостаточно прав. Требуется: ${permission}`));
    }
    
    next();
  };
};

/**
 * Middleware для проверки роли пользователя
 * @param roles Разрешенные роли
 * @returns Middleware функция
 * 
 * @example
 * router.delete('/users/:id', authenticate, isRole(UserRole.SUPER_ADMIN, UserRole.OWNER), deleteUser);
 */
export const isRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Требуется аутентификация'));
    }
    
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new ForbiddenError(`Доступ запрещен. Требуемые роли: ${roles.join(', ')}`));
    }
    
    next();
  };
};

/**
 * Alias для обратной совместимости
 */
export const authorizeRoles = isRole;
