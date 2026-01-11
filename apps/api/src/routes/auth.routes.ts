import { Router } from 'express';
import authController, { 
  loginValidation, 
  registerValidation, 
  refreshValidation,
  logoutValidation 
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Регистрация нового пользователя
 * @access  Public
 */
router.post('/register', registerValidation, authController.register.bind(authController));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Вход пользователя
 * @access  Public
 */
router.post('/login', loginValidation, authController.login.bind(authController));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Обновление access token через refresh token
 * @access  Public
 */
router.post('/refresh', refreshValidation, authController.refresh.bind(authController));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Выход пользователя (инвалидация refresh token)
 * @access  Private
 */
router.post('/logout', authenticate, logoutValidation, authController.logout.bind(authController));

/**
 * @route   GET /api/v1/auth/me
 * @desc    Получение информации о текущем пользователе
 * @access  Private
 */
router.get('/me', authenticate, authController.me.bind(authController));

export default router;

