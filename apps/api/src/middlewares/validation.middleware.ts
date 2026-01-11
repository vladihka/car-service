import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '../utils/errors';
import { z, ZodError } from 'zod';

/**
 * Middleware для валидации с express-validator
 * Используется для простых валидаций
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => `${err.msg} (${err.param})`).join(', ');
      return next(new ValidationError(errorMessages));
    }
    
    next();
  };
};

/**
 * Middleware для валидации с Zod
 * Более строгая типизация и валидация
 * @param schema Zod schema для валидации
 * @returns Middleware функция
 * 
 * @example
 * router.post('/register', validateZod(RegisterDtoSchema), register);
 */
export const validateZod = <T extends z.ZodTypeAny>(schema: T) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Валидировать body запроса
      const validatedData = await schema.parseAsync(req.body);
      // Заменить body на валидированные данные (с правильными типами)
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // В Zod 4.x используется issues вместо errors
        if (error.issues && Array.isArray(error.issues)) {
          const errorMessages = error.issues.map(err => {
            const path = err.path.join('.');
            return `${path}: ${err.message}`;
          }).join(', ');
          return next(new ValidationError(`Ошибка валидации: ${errorMessages}`));
        }
        // Fallback: если issues отсутствует, используем message
        return next(new ValidationError(`Ошибка валидации: ${error.message || 'Неизвестная ошибка валидации'}`));
      }
      next(error);
    }
  };
};
