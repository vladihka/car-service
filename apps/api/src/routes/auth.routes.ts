import { Router } from 'express';
import authController, { loginValidation, registerValidation, refreshValidation } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

router.post('/login', validate(loginValidation), authController.login.bind(authController));
router.post('/register', validate(registerValidation), authController.register.bind(authController));
router.post('/refresh', validate(refreshValidation), authController.refresh.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
