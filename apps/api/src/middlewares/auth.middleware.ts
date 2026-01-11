import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Расширенный Request с информацией о пользователе
 */
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware для аутентификации JWT
 * Проверяет наличие и валидность access token
 * Добавляет информацию о пользователе в req.user
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Получить токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Токен не предоставлен. Используйте формат: Authorization: Bearer <token>');
    }
    
    // Извлечь токен (убрать префикс "Bearer ")
    const token = authHeader.substring(7);
    
    if (!token) {
      throw new UnauthorizedError('Токен не предоставлен');
    }
    
    // Верифицировать токен
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (error) {
      logger.warn(`Invalid token attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedError('Недействительный или истекший токен');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Alias для обратной совместимости
 */
export const authenticateJWT = authenticate;
