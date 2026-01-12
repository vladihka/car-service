/**
 * Роуты для работы со складом
 */

import { Router } from 'express';
import stockController from '../controllers/stock.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateStockMovementDtoSchema } from '../types/stock.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/stock/move
 * @desc    Создать движение по складу
 * @access  Private (Owner, Manager)
 */
router.post(
  '/move',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(CreateStockMovementDtoSchema),
  stockController.createMovement.bind(stockController)
);

/**
 * @route   GET /api/v1/stock/history
 * @desc    Получить историю движений по складу
 * @access  Private
 */
router.get(
  '/history',
  authenticate,
  stockController.getHistory.bind(stockController)
);

export default router;
