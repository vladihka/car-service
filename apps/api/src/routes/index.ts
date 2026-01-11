import { Router } from 'express';
import authRoutes from './auth.routes';
import { healthCheck } from '../controllers/health.controller';

const router = Router();

router.use('/auth', authRoutes);

// Health check endpoint
router.get('/health', healthCheck);

export default router;
