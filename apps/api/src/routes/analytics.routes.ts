/**
 * Роуты для аналитики и отчетов
 */

import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import { AnalyticsEventController } from '../controllers/analytics-event.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const analyticsEventController = new AnalyticsEventController();

const router = Router();

/**
 * @route   GET /api/v1/analytics/finance
 * @desc    Получить финансовую аналитику
 * @access  Private (Owner, Manager, SuperAdmin)
 */
router.get(
  '/finance',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  analyticsController.getFinance.bind(analyticsController)
);

/**
 * @route   GET /api/v1/analytics/workload
 * @desc    Получить аналитику загруженности
 * @access  Private (Owner, Manager, Mechanic, SuperAdmin)
 */
router.get(
  '/workload',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC, UserRole.SUPER_ADMIN),
  analyticsController.getWorkload.bind(analyticsController)
);

/**
 * @route   GET /api/v1/analytics/services
 * @desc    Получить аналитику услуг
 * @access  Private (Owner, Manager, SuperAdmin)
 */
router.get(
  '/services',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  analyticsController.getServices.bind(analyticsController)
);

/**
 * @route   GET /api/v1/analytics/clients
 * @desc    Получить клиентскую аналитику
 * @access  Private (Owner, Manager, SuperAdmin)
 */
router.get(
  '/clients',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  analyticsController.getClients.bind(analyticsController)
);

/**
 * @route   GET /api/v1/analytics/summary
 * @desc    Получить общую сводку
 * @access  Private (Owner, Manager, SuperAdmin)
 */
router.get(
  '/summary',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  analyticsController.getSummary.bind(analyticsController)
);

/**
 * @route   GET /api/v1/analytics/events
 * @desc    Получить список событий аналитики
 * @access  Private (Owner, Manager, SuperAdmin)
 */
router.get(
  '/events',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  analyticsEventController.findAll.bind(analyticsEventController)
);

export default router;
