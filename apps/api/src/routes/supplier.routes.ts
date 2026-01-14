/**
 * Роуты для работы с поставщиками
 */

import { Router } from 'express';
import supplierController from '../controllers/supplier.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateSupplierDtoSchema, UpdateSupplierDtoSchema } from '../types/supplier.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/suppliers
 * @desc    Создать нового поставщика
 * @access  Private (Owner, Manager)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(CreateSupplierDtoSchema),
  supplierController.create.bind(supplierController)
);

/**
 * @route   GET /api/v1/suppliers
 * @desc    Получить список поставщиков
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
  supplierController.findAll.bind(supplierController)
);

/**
 * @route   GET /api/v1/suppliers/:id
 * @desc    Получить поставщика по ID
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
  supplierController.findById.bind(supplierController)
);

/**
 * @route   PATCH /api/v1/suppliers/:id
 * @desc    Обновить поставщика
 * @access  Private (Owner, Manager)
 */
router.patch(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(UpdateSupplierDtoSchema),
  supplierController.update.bind(supplierController)
);

/**
 * @route   DELETE /api/v1/suppliers/:id
 * @desc    Удалить поставщика (soft delete)
 * @access  Private (Owner, Manager)
 */
router.delete(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  supplierController.delete.bind(supplierController)
);

export default router;
