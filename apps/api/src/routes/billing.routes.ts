/**
 * Роуты для работы с биллингом и подписками
 */

import { Router } from 'express';
import billingController from '../controllers/billing.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { SubscribeDtoSchema, CancelSubscriptionDtoSchema } from '../types/billing.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/billing/subscribe
 * @desc    Подписаться на тариф
 * @access  Private (Owner)
 */
router.post(
  '/subscribe',
  authenticate,
  isRole(UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(SubscribeDtoSchema),
  billingController.subscribe.bind(billingController)
);

/**
 * @route   POST /api/v1/billing/cancel
 * @desc    Отменить подписку
 * @access  Private (Owner)
 */
router.post(
  '/cancel',
  authenticate,
  isRole(UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(CancelSubscriptionDtoSchema),
  billingController.cancel.bind(billingController)
);

/**
 * @route   GET /api/v1/billing/subscription
 * @desc    Получить подписку организации
 * @access  Private (Owner, Manager)
 */
router.get(
  '/subscription',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  billingController.getSubscription.bind(billingController)
);

/**
 * @route   GET /api/v1/billing/invoices
 * @desc    Получить список счетов
 * @access  Private (Owner, Manager)
 */
router.get(
  '/invoices',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  billingController.getInvoices.bind(billingController)
);

/**
 * @route   POST /api/v1/billing/webhook
 * @desc    Обработать Stripe webhook
 * @access  Public (подпись проверяется)
 */
router.post(
  '/webhook',
  billingController.handleWebhook.bind(billingController)
);

export default router;
