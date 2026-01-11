import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import AuditLog from '../models/AuditLog';

export const auditLog = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to capture response
    res.end = function (chunk?: any, encoding?: any) {
      // Restore original end
      res.end = originalEnd;
      
      // Only log successful requests (2xx status codes)
      if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
        // Get resource ID from params, body, or response
        const resourceId = req.params.id || req.body.id || undefined;
        
        // Prepare changes (for update operations)
        let changes;
        if (action === 'update' && req.body) {
          changes = {
            after: req.body,
          };
        }
        
        // Log asynchronously (don't block response)
        AuditLog.create({
          organizationId: req.user.organizationId,
          branchId: req.user.branchId,
          userId: req.user.userId,
          action,
          resource,
          resourceId,
          changes,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }).catch((err) => {
          console.error('Failed to create audit log:', err);
        });
      }
      
      // Call original end function
      originalEnd.call(res, chunk, encoding);
    };
    
    next();
  };
};
