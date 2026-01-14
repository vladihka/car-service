/**
 * Роуты для работы с клиентами
 */

import { Router } from 'express';
import clientController from '../controllers/client.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateClientDtoSchema, UpdateClientDtoSchema } from '../types/client.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/clients
 * @desc    Создать нового клиента
 * @access  Private (Owner, Manager, Admin)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(CreateClientDtoSchema),
  clientController.create.bind(clientController)
);

/**
 * @route   GET /api/v1/clients
 * @desc    Получить список клиентов
 * @access  Private (Owner, Manager, Admin, Mechanic, Accountant)
 */
router.get(
  '/',
  authenticate,
  isRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.MECHANIC,
    UserRole.SUPER_ADMIN
  ),
  clientController.findAll.bind(clientController)
);

/**
 * @route   GET /api/v1/clients/:id
 * @desc    Получить клиента по ID
 * @access  Private (Owner, Manager, Admin, Mechanic, Accountant, Client - только свой профиль)
 */
router.get(
  '/:id',
  authenticate,
  clientController.findById.bind(clientController)
);

/**
 * @route   PATCH /api/v1/clients/:id
 * @desc    Обновить клиента
 * @access  Private (Owner, Manager, Admin)
 */
router.patch(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(UpdateClientDtoSchema),
  clientController.update.bind(clientController)
);

/**
 * @route   DELETE /api/v1/clients/:id
 * @desc    Удалить клиента (soft delete)
 * @access  Private (Owner)
 */
router.delete(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.SUPER_ADMIN),
  clientController.delete.bind(clientController)
);

export default router;
