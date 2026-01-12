/**
 * Роуты для работы с услугами (Services)
 */

import { Router } from 'express';
import serviceController from '../controllers/service.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateServiceDtoSchema, UpdateServiceDtoSchema } from '../types/service.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/services
 * @desc    Создать новую услугу
 * @access  Private (Owner, Manager)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(CreateServiceDtoSchema),
  serviceController.create.bind(serviceController)
);

/**
 * @route   GET /api/v1/services
 * @desc    Получить список услуг
 * @access  Private (Owner, Manager - все в организации)
 */
router.get(
  '/',
  authenticate,
  serviceController.findAll.bind(serviceController)
);

/**
 * @route   GET /api/v1/services/:id
 * @desc    Получить услугу по ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  serviceController.findById.bind(serviceController)
);

/**
 * @route   PATCH /api/v1/services/:id
 * @desc    Обновить услугу
 * @access  Private (Owner, Manager)
 */
router.patch(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(UpdateServiceDtoSchema),
  serviceController.update.bind(serviceController)
);

/**
 * @route   DELETE /api/v1/services/:id
 * @desc    Удалить услугу
 * @access  Private (Owner)
 */
router.delete(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.SUPER_ADMIN),
  serviceController.delete.bind(serviceController)
);

export default router;
