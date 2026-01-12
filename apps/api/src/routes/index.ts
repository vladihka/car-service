import { Router } from 'express';
import authRoutes from './auth.routes';
import organizationRoutes from './organization.routes';
import branchRoutes from './branch.routes';
import { healthCheck } from '../controllers/health.controller';

const router = Router();

// Health check endpoint
router.get('/health', healthCheck);

// Authentication routes
router.use('/auth', authRoutes);

// Organization routes
router.use('/organizations', organizationRoutes);

// Branch routes
router.use('/branches', branchRoutes);

export default router;
