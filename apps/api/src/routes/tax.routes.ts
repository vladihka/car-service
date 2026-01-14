/**
 * Роуты для работы с налогами
 */

import { Router } from 'express';
import taxController from '../controllers/tax.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateTaxDtoSchema, UpdateTaxDtoSchema, SetDefaultTaxDtoSchema } from '../types/tax.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/taxes
 * @desc    Создать новый налог
 * @access  Private (Owner, Accountant)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.OWNER, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN),
  validateZod(CreateTaxDtoSchema),
  taxController.create.bind(taxController)
);

/**
 * @route   GET /api/v1/taxes
 * @desc    Получить список налогов
 * @access  Private (Owner, Manager, Accountant)
 */
router.get(
  '/',
  authenticate,
  isRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SUPER_ADMIN
  ),
  taxController.findAll.bind(taxController)
);

/**
 * @route   GET /api/v1/taxes/:id
 * @desc    Получить налог по ID
 * @access  Private (Owner, Manager, Accountant)
 */
router.get(
  '/:id',
  authenticate,
  isRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SUPER_ADMIN
  ),
  taxController.findById.bind(taxController)
);

/**
 * @route   PATCH /api/v1/taxes/:id
 * @desc    Обновить налог
 * @access  Private (Owner, Accountant)
 */
router.patch(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN),
  validateZod(UpdateTaxDtoSchema),
  taxController.update.bind(taxController)
);

/**
 * @route   DELETE /api/v1/taxes/:id
 * @desc    Удалить налог (soft delete)
 * @access  Private (Owner)
 */
router.delete(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.SUPER_ADMIN),
  taxController.delete.bind(taxController)
);

/**
 * @route   POST /api/v1/taxes/set-default
 * @desc    Назначить налог по умолчанию
 * @access  Private (Owner, Accountant)
 */
router.post(
  '/set-default',
  authenticate,
  isRole(UserRole.OWNER, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN),
  validateZod(SetDefaultTaxDtoSchema),
  taxController.setDefault.bind(taxController)
);

export default router;
