/**
 * Роуты для работы со счетами (Invoices)
 */

import { Router } from 'express';
import invoiceController from '../controllers/invoice.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { CreateInvoiceDtoSchema, UpdateInvoiceStatusDtoSchema, UpdateInvoiceDtoSchema } from '../types/invoice.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/invoices
 * @desc    Создать новый счет
 * @access  Private (Manager, Owner)
 */
router.post(
  '/',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(CreateInvoiceDtoSchema),
  invoiceController.create.bind(invoiceController)
);

/**
 * @route   GET /api/v1/invoices
 * @desc    Получить список счетов
 * @access  Private (Client - только свои, Manager/Owner - все в организации/филиале)
 */
router.get(
  '/',
  authenticate,
  invoiceController.findAll.bind(invoiceController)
);

/**
 * @route   GET /api/v1/invoices/:id
 * @desc    Получить счет по ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  invoiceController.findById.bind(invoiceController)
);

/**
 * @route   PATCH /api/v1/invoices/:id
 * @desc    Обновить счет (пересчет)
 * @access  Private (Manager, Owner)
 */
router.patch(
  '/:id',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(UpdateInvoiceDtoSchema),
  invoiceController.update.bind(invoiceController)
);

/**
 * @route   PATCH /api/v1/invoices/:id/status
 * @desc    Обновить статус счета
 * @access  Private (Manager, Owner)
 */
router.patch(
  '/:id/status',
  authenticate,
  isRole(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateZod(UpdateInvoiceStatusDtoSchema),
  invoiceController.updateStatus.bind(invoiceController)
);

export default router;
