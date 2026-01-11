import { Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { body } from 'express-validator';
import { UserRole } from '../types';

export class AuthController {
  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login(email, password);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, organizationId, branchId, role } = req.body;
      
      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        organizationId,
        branchId,
        role: role || UserRole.CLIENT,
      });
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async refresh(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return next(new Error('Refresh token is required'));
      }
      
      const result = await authService.refresh(refreshToken);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { refreshToken } = req.body;
      
      if (userId && refreshToken) {
        await authService.logout(userId, refreshToken);
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('Not authenticated'));
      }
      
      const userRepository = (await import('../repositories/user.repository')).default;
      const user = await userRepository.findById(req.user.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      const userObject = user.toObject();
      delete userObject.password;
      delete userObject.refreshTokens;
      
      res.json({
        success: true,
        data: userObject,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Validation rules
export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 }),
];

export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('role').optional().isIn(Object.values(UserRole)),
];

export const refreshValidation = [
  body('refreshToken').notEmpty(),
];

export default new AuthController();
