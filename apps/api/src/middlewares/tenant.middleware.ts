import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ForbiddenError } from '../utils/errors';

export const requireTenant = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }
  
  if (req.user.role !== 'SuperAdmin' && !req.user.organizationId) {
    return next(new ForbiddenError('Organization access required'));
  }
  
  next();
};

export const requireBranch = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }
  
  const allowedRoles = ['SuperAdmin', 'Owner', 'Accountant'];
  
  if (!allowedRoles.includes(req.user.role) && !req.user.branchId) {
    return next(new ForbiddenError('Branch access required'));
  }
  
  next();
};
