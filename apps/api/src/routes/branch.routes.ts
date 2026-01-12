/**
 * Роуты для работы с филиалами
 */

import { Router } from 'express';
import branchController from '../controllers/branch.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateBranchDtoSchema, UpdateBranchDtoSchema } from '../types/branch.dto';

const router = Router();

/**
 * @route   POST /api/v1/branches
 * @desc    Создать новый филиал
 * @access  Private (SuperAdmin, Owner - в своей организации)
 */
router.post(
  '/',
  authenticate,
  validateZod(CreateBranchDtoSchema),
  branchController.create.bind(branchController)
);

/**
 * @route   GET /api/v1/branches
 * @desc    Получить список филиалов
 * @access  Private (SuperAdmin - все, Owner - все в своей организации, Manager - только свой)
 */
router.get(
  '/',
  authenticate,
  branchController.findAll.bind(branchController)
);

/**
 * @route   GET /api/v1/branches/:id
 * @desc    Получить филиал по ID
 * @access  Private (SuperAdmin, Owner - любой в своей организации, Manager - только свой)
 */
router.get(
  '/:id',
  authenticate,
  branchController.findById.bind(branchController)
);

/**
 * @route   PATCH /api/v1/branches/:id
 * @desc    Обновить филиал
 * @access  Private (SuperAdmin, Owner - любой в своей организации, Manager - только свой)
 */
router.patch(
  '/:id',
  authenticate,
  validateZod(UpdateBranchDtoSchema),
  branchController.update.bind(branchController)
);

/**
 * @route   DELETE /api/v1/branches/:id
 * @desc    Удалить филиал
 * @access  Private (SuperAdmin, Owner - в своей организации)
 */
router.delete(
  '/:id',
  authenticate,
  branchController.delete.bind(branchController)
);

export default router;
