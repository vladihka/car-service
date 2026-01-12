/**
 * Роуты для работы с платежами (Payments)
 */

import { Router } from 'express';
import paymentController from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreatePaymentDtoSchema, UpdatePaymentStatusDtoSchema, RefundPaymentDtoSchema } from '../types/payment.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/payments
 * @desc    Создать новый платеж
 * @access  Private (Manager, Owner)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(CreatePaymentDtoSchema),
  paymentController.create.bind(paymentController)
);

/**
 * @route   GET /api/v1/payments
 * @desc    Получить список платежей
 * @access  Private (Client - только свои, Manager/Owner - все в организации/филиале)
 */
router.get(
  '/',
  authenticate,
  paymentController.findAll.bind(paymentController)
);

/**
 * @route   GET /api/v1/payments/:id
 * @desc    Получить платеж по ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  paymentController.findById.bind(paymentController)
);

/**
 * @route   PATCH /api/v1/payments/:id
 * @desc    Обновить статус платежа
 * @access  Private (Manager, Owner)
 */
router.patch(
  '/:id',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(UpdatePaymentStatusDtoSchema),
  paymentController.updateStatus.bind(paymentController)
);

/**
 * @route   POST /api/v1/payments/:id/refund
 * @desc    Возврат платежа
 * @access  Private (Manager, Owner)
 */
router.post(
  '/:id/refund',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(RefundPaymentDtoSchema),
  paymentController.refund.bind(paymentController)
);

export default router;
