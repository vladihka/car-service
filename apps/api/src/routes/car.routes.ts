/**
 * Роуты для работы с автомобилями
 */

import { Router } from 'express';
import carController from '../controllers/car.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateCarDtoSchema, UpdateCarDtoSchema } from '../types/car.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/cars
 * @desc    Создать новый автомобиль
 * @access  Private (Owner, Manager, Admin)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(CreateCarDtoSchema),
  carController.create.bind(carController)
);

/**
 * @route   GET /api/v1/cars
 * @desc    Получить список автомобилей
 * @access  Private (Owner, Manager, Admin, Mechanic, Accountant, Client - только свои)
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
  carController.findAll.bind(carController)
);

/**
 * @route   GET /api/v1/cars/:id
 * @desc    Получить автомобиль по ID
 * @access  Private (Owner, Manager, Admin, Mechanic, Accountant, Client - только свой)
 */
router.get(
  '/:id',
  authenticate,
  carController.findById.bind(carController)
);

/**
 * @route   PATCH /api/v1/cars/:id
 * @desc    Обновить автомобиль
 * @access  Private (Owner, Manager, Admin)
 */
router.patch(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(UpdateCarDtoSchema),
  carController.update.bind(carController)
);

/**
 * @route   DELETE /api/v1/cars/:id
 * @desc    Удалить автомобиль
 * @access  Private (Owner)
 */
router.delete(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.SUPER_ADMIN),
  carController.delete.bind(carController)
);

export default router;
