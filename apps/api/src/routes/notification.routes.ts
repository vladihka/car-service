/**
 * Роуты для работы с уведомлениями
 */

import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { NotificationQueryDtoSchema, CreateNotificationDtoSchema, CreateTestNotificationDtoSchema } from '../types/notification.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   GET /api/v1/notifications
 * @desc    Получить список уведомлений
 * @access  Private (Client - только свои, Mechanic - связанные с заказами, Manager/Owner - все в организации)
 */
router.get(
  '/',
  authenticate,
  notificationController.findAll.bind(notificationController)
);

/**
 * @route   GET /api/v1/notifications/:id
 * @desc    Получить уведомление по ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  notificationController.findById.bind(notificationController)
);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Отметить уведомление как прочитанное
 * @access  Private
 */
router.patch(
  '/:id/read',
  authenticate,
  notificationController.markAsRead.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications
 * @desc    Создать уведомление
 * @access  Private (Manager, Owner)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(CreateNotificationDtoSchema),
  notificationController.create.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/test
 * @desc    Создать тестовое уведомление
 * @access  Private (Manager, Owner, SuperAdmin)
 */
router.post(
  '/test',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(CreateTestNotificationDtoSchema),
  notificationController.createTest.bind(notificationController)
);

export default router;
