/**
 * Роуты для работы с биллингом и подписками
 */

import { Router } from 'express';
import { z } from 'zod';
import billingController from '../controllers/billing.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { SubscribeDtoSchema, CancelSubscriptionDtoSchema } from '../types/billing.dto';
import { CreateBillingProfileDtoSchema, UpdateBillingProfileDtoSchema } from '../types/billing-profile.dto';
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
 * @route   PATCH /api/v1/billing/subscription/change-plan
 * @desc    Сменить план подписки
 * @access  Private (Owner)
 */
router.patch(
  '/subscription/change-plan',
  authenticate,
  isRole(UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(z.object({
    planId: z.string().min(1, 'ID тарифа обязателен'),
  })),
  billingController.changePlan.bind(billingController)
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

/**
 * @route   POST /api/v1/billing/profile
 * @desc    Создать или обновить биллинг-профиль
 * @access  Private (Owner, Accountant)
 */
router.post(
  '/profile',
  authenticate,
  isRole(UserRole.OWNER, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN),
  validateZod(CreateBillingProfileDtoSchema),
  billingController.createOrUpdateProfile.bind(billingController)
);

/**
 * @route   GET /api/v1/billing/profile
 * @desc    Получить биллинг-профиль организации
 * @access  Private (Owner, Manager, Accountant)
 */
router.get(
  '/profile',
  authenticate,
  isRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SUPER_ADMIN
  ),
  billingController.getProfile.bind(billingController)
);

/**
 * @route   PATCH /api/v1/billing/profile
 * @desc    Обновить биллинг-профиль
 * @access  Private (Owner, Accountant)
 */
router.patch(
  '/profile',
  authenticate,
  isRole(UserRole.OWNER, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN),
  validateZod(UpdateBillingProfileDtoSchema),
  billingController.createOrUpdateProfile.bind(billingController)
);

export default router;
