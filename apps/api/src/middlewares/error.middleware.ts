import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { ZodError } from 'zod';

/**
 * Централизованный обработчик ошибок
 * Обрабатывает все типы ошибок и возвращает стандартизированный ответ
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Обработка кастомных ошибок приложения
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
    
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }
  
  // Обработка ошибок валидации Zod
  if (err instanceof ZodError) {
    // В Zod 4.x используется issues вместо errors
    const errorMessages = err.issues.map(e => {
      const path = e.path.join('.');
      return `${path}: ${e.message}`;
    }).join(', ');
    
    logger.warn(`Validation error: ${errorMessages}`, {
      path: req.path,
      method: req.method,
    });
    
    return res.status(400).json({
      success: false,
      error: {
        message: `Ошибка валидации: ${errorMessages}`,
        statusCode: 400,
        details: err.issues,
      },
    });
  }
  
  // Логирование неожиданных ошибок
  logger.error('Unexpected error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });
  
  // Возврат ошибки (скрыть детали в production)
  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Внутренняя ошибка сервера' 
        : err.message,
      statusCode: 500,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
};
