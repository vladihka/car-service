import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ForbiddenError } from '../utils/errors';
import { Permission } from '../types/permissions';

export const can = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }
    
    if (!req.user.permissions.includes(permission)) {
      return next(new ForbiddenError(`Insufficient permissions. Required: ${permission}`));
    }
    
    next();
  };
};

export const isRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Required roles: ${roles.join(', ')}`));
    }
    
    next();
  };
};
