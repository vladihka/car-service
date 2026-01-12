/**
 * Роуты для работы с отчетами
 */

import { Router } from 'express';
import reportController from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import { GenerateReportDtoSchema, ReportQueryDtoSchema } from '../types/report.dto';
import { isRole } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @route   POST /api/v1/reports/generate
 * @desc    Генерировать отчет
 * @access  Private (Owner, Manager)
 */
router.post(
  '/generate',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  validateZod(GenerateReportDtoSchema),
  reportController.generate.bind(reportController)
);

/**
 * @route   GET /api/v1/reports
 * @desc    Получить список отчетов
 * @access  Private (Owner, Manager)
 */
router.get(
  '/',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  reportController.findAll.bind(reportController)
);

/**
 * @route   GET /api/v1/reports/:id
 * @desc    Получить отчет по ID
 * @access  Private (Owner, Manager)
 */
router.get(
  '/:id',
  authenticate,
  isRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN),
  reportController.findById.bind(reportController)
);

export default router;
