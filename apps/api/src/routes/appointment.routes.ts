/**
 * Роуты для работы с записями клиентов (Appointments)
 */

import { Router } from 'express';
import appointmentController from '../controllers/appointment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import {
  CreateAppointmentDtoSchema,
  UpdateAppointmentDtoSchema,
  UpdateAppointmentStatusDtoSchema,
  AssignAppointmentDtoSchema,
} from '../types/appointment.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/appointments
 * @desc    Создать новую запись
 * @access  Private (Client)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.CLIENT),
  validateZod(CreateAppointmentDtoSchema),
  appointmentController.create.bind(appointmentController)
);

/**
 * @route   GET /api/v1/appointments
 * @desc    Получить список записей
 * @access  Private (Client - только свои, Manager/Owner - все в организации/филиале)
 */
router.get(
  '/',
  authenticate,
  appointmentController.findAll.bind(appointmentController)
);

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Получить запись по ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  appointmentController.findById.bind(appointmentController)
);

/**
 * @route   PATCH /api/v1/appointments/:id/status
 * @desc    Обновить статус записи
 * @access  Private (Manager, Owner)
 */
router.patch(
  '/:id/status',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(UpdateAppointmentStatusDtoSchema),
  appointmentController.updateStatus.bind(appointmentController)
);

/**
 * @route   PATCH /api/v1/appointments/:id/assign
 * @desc    Назначить механика на запись
 * @access  Private (Manager, Owner)
 */
router.patch(
  '/:id/assign',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(AssignAppointmentDtoSchema),
  appointmentController.assignMechanic.bind(appointmentController)
);

/**
 * @route   PATCH /api/v1/appointments/:id
 * @desc    Обновить запись
 * @access  Private
 */
router.patch(
  '/:id',
  authenticate,
  validateZod(UpdateAppointmentDtoSchema),
  appointmentController.update.bind(appointmentController)
);

export default router;
