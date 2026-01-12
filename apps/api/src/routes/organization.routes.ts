/**
 * Роуты для работы с организациями
 */

import { Router } from 'express';
import organizationController from '../controllers/organization.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateOrganizationDtoSchema, UpdateOrganizationDtoSchema } from '../types/organization.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/organizations
 * @desc    Создать новую организацию
 * @access  Private (SuperAdmin)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.SUPER_ADMIN),
  validateZod(CreateOrganizationDtoSchema),
  organizationController.create.bind(organizationController)
);

/**
 * @route   GET /api/v1/organizations
 * @desc    Получить список организаций
 * @access  Private (SuperAdmin - все, Owner - только своя)
 */
router.get(
  '/',
  authenticate,
  organizationController.findAll.bind(organizationController)
);

/**
 * @route   GET /api/v1/organizations/:id
 * @desc    Получить организацию по ID
 * @access  Private (SuperAdmin - любая, Owner - только своя)
 */
router.get(
  '/:id',
  authenticate,
  organizationController.findById.bind(organizationController)
);

/**
 * @route   PATCH /api/v1/organizations/:id
 * @desc    Обновить организацию
 * @access  Private (SuperAdmin - любая, Owner - только своя)
 */
router.patch(
  '/:id',
  authenticate,
  validateZod(UpdateOrganizationDtoSchema),
  organizationController.update.bind(organizationController)
);

/**
 * @route   DELETE /api/v1/organizations/:id
 * @desc    Удалить организацию
 * @access  Private (SuperAdmin)
 */
router.delete(
  '/:id',
  authenticate,
  isRole(UserRole.SUPER_ADMIN),
  organizationController.delete.bind(organizationController)
);

export default router;
