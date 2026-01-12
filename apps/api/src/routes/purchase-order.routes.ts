/**
 * Роуты для работы с заказами поставщикам
 */

import { Router } from 'express';
import purchaseOrderController from '../controllers/purchase-order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreatePurchaseOrderDtoSchema, ReceivePurchaseOrderDtoSchema } from '../types/purchase-order.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/purchase-orders
 * @desc    Создать заказ поставщику
 * @access  Private (Owner, Manager)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(CreatePurchaseOrderDtoSchema),
  purchaseOrderController.create.bind(purchaseOrderController)
);

/**
 * @route   GET /api/v1/purchase-orders
 * @desc    Получить список заказов
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  purchaseOrderController.findAll.bind(purchaseOrderController)
);

/**
 * @route   GET /api/v1/purchase-orders/:id
 * @desc    Получить заказ по ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  purchaseOrderController.findById.bind(purchaseOrderController)
);

/**
 * @route   PATCH /api/v1/purchase-orders/:id/receive
 * @desc    Принять заказ
 * @access  Private (Owner, Manager)
 */
router.patch(
  '/:id/receive',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(ReceivePurchaseOrderDtoSchema),
  purchaseOrderController.receive.bind(purchaseOrderController)
);

export default router;
