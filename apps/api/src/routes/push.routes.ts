/**
 * Роуты для Web Push уведомлений
 */

import { Router } from 'express';
import pushController from '../controllers/push.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import {
  SubscribePushDtoSchema,
  UnsubscribePushDtoSchema,
  TestPushDtoSchema,
} from '../types/push.dto';

const router = Router();

/**
 * GET /api/v1/push/vapid-public-key
 * Получить публичный VAPID ключ для клиента
 */
router.get(
  '/vapid-public-key',
  authenticate,
  pushController.getVapidPublicKey.bind(pushController)
);

/**
 * GET /api/v1/push/subscriptions
 * Получить все подписки пользователя
 */
router.get(
  '/subscriptions',
  authenticate,
  pushController.getSubscriptions.bind(pushController)
);

/**
 * POST /api/v1/push/subscribe
 * Подписаться на push уведомления
 */
router.post(
  '/subscribe',
  authenticate,
  validateZod(SubscribePushDtoSchema),
  pushController.subscribe.bind(pushController)
);

/**
 * POST /api/v1/push/unsubscribe
 * Отписаться от push уведомлений
 */
router.post(
  '/unsubscribe',
  authenticate,
  validateZod(UnsubscribePushDtoSchema),
  pushController.unsubscribe.bind(pushController)
);

/**
 * POST /api/v1/push/test
 * Отправить тестовое push уведомление (для Manager, Owner, SuperAdmin)
 */
router.post(
  '/test',
  authenticate,
  validateZod(TestPushDtoSchema),
  pushController.sendTest.bind(pushController)
);

export default router;
