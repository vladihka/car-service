/**
 * Роуты для работы с запчастями
 */

import { Router } from 'express';
import partController from '../controllers/part.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreatePartDtoSchema, UpdatePartDtoSchema } from '../types/part.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/parts
 * @desc    Создать новую запчасть
 * @access  Private (Owner, Manager)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(CreatePartDtoSchema),
  partController.create.bind(partController)
);

/**
 * @route   GET /api/v1/parts
 * @desc    Получить список запчастей
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  partController.findAll.bind(partController)
);

/**
 * @route   GET /api/v1/parts/:id
 * @desc    Получить запчасть по ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  partController.findById.bind(partController)
);

/**
 * @route   PATCH /api/v1/parts/:id
 * @desc    Обновить запчасть
 * @access  Private (Owner, Manager)
 */
router.patch(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(UpdatePartDtoSchema),
  partController.update.bind(partController)
);

/**
 * @route   DELETE /api/v1/parts/:id
 * @desc    Удалить запчасть (soft delete)
 * @access  Private (Owner)
 */
router.delete(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.SUPER_ADMIN),
  partController.delete.bind(partController)
);

export default router;
