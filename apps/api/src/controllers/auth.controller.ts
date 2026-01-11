import { Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { 
  RegisterDtoSchema, 
  LoginDtoSchema, 
  RefreshTokenDtoSchema, 
  LogoutDtoSchema,
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
} from '../types/auth.dto';
import { validateZod } from '../middlewares/validation.middleware';
import { NotFoundError } from '../utils/errors';

/**
 * Контроллер аутентификации
 * Обрабатывает HTTP запросы для регистрации, входа, обновления токенов и выхода
 */
export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Вход пользователя
   */
  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: LoginDto = req.body;
      
      const result = await authService.login(data.email, data.password);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/v1/auth/register
   * Регистрация нового пользователя
   * Автоматически назначает роль CLIENT если не указана
   */
  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: RegisterDto = req.body;
      
      const result = await authService.register(data);
      
      res.status(201).json({
        success: true,
        message: 'Пользователь успешно зарегистрирован',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/v1/auth/refresh
   * Обновление access token через refresh token
   * Реализует ротацию refresh токенов
   */
  async refresh(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: RefreshTokenDto = req.body;
      
      if (!data.refreshToken) {
        return next(new ValidationError('Refresh token обязателен'));
      }
      
      const result = await authService.refresh(data.refreshToken);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/v1/auth/logout
   * Выход пользователя
   * Инвалидирует refresh token
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new NotFoundError('Пользователь не аутентифицирован'));
      }
      
      const data: LogoutDto = req.body;
      
      if (!data.refreshToken) {
        return next(new ValidationError('Refresh token обязателен'));
      }
      
      await authService.logout(req.user.userId, data.refreshToken);
      
      res.status(200).json({
        success: true,
        message: 'Выход выполнен успешно',
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/auth/me
   * Получение информации о текущем пользователе
   */
  async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new NotFoundError('Пользователь не аутентифицирован'));
      }
      
      const user = await authService.getMe(req.user.userId);
      
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Экспорт валидации для использования в routes
export const loginValidation = validateZod(LoginDtoSchema);
export const registerValidation = validateZod(RegisterDtoSchema);
export const refreshValidation = validateZod(RefreshTokenDtoSchema);
export const logoutValidation = validateZod(LogoutDtoSchema);

export default new AuthController();
