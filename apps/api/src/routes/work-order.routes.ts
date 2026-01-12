/**
 * Роуты для работы с заказами на работу (Work Orders)
 */

import { Router } from 'express';
import workOrderController from '../controllers/work-order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateWorkOrderDtoSchema, UpdateWorkOrderDtoSchema } from '../types/work-order.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/work-orders
 * @desc    Создать новый заказ на работу
 * @access  Private (Manager, Owner)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(CreateWorkOrderDtoSchema),
  workOrderController.create.bind(workOrderController)
);

/**
 * @route   GET /api/v1/work-orders
 * @desc    Получить список заказов
 * @access  Private (Mechanic - только свои, Manager/Owner - все в филиале/организации)
 */
router.get(
  '/',
  authenticate,
  workOrderController.findAll.bind(workOrderController)
);

/**
 * @route   GET /api/v1/work-orders/my
 * @desc    Получить список своих заказов (для Mechanic)
 * @access  Private (Mechanic)
 */
router.get(
  '/my',
  authenticate,
  isRole(UserRole.MECHANIC),
  workOrderController.findMy.bind(workOrderController)
);

/**
 * @route   GET /api/v1/work-orders/:id
 * @desc    Получить заказ по ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  workOrderController.findById.bind(workOrderController)
);

/**
 * @route   PATCH /api/v1/work-orders/:id
 * @desc    Обновить заказ на работу
 * @access  Private (Mechanic - только свои, Manager/Owner - все в филиале/организации)
 */
router.patch(
  '/:id',
  authenticate,
  validateZod(UpdateWorkOrderDtoSchema),
  workOrderController.update.bind(workOrderController)
);

export default router;
