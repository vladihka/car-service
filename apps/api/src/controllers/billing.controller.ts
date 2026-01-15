/**
 * Контроллер для работы с биллингом и подписками
 * Обрабатывает HTTP запросы для управления подписками и платежами
 */

import { Response, NextFunction, Request } from 'express';
import billingService from '../services/billing.service';
import billingProfileService from '../services/billing-profile.service';
import stripeService from '../services/stripe.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import {
  SubscribeDtoSchema,
  CancelSubscriptionDtoSchema,
  StripeWebhookDtoSchema,
} from '../types/billing.dto';
import {
  SubscribeDto,
  CancelSubscriptionDto,
  StripeWebhookDto,
} from '../types/billing.dto';
import {
  CreateBillingProfileDtoSchema,
  UpdateBillingProfileDtoSchema,
} from '../types/billing-profile.dto';
import {
  CreateBillingProfileDto,
  UpdateBillingProfileDto,
} from '../types/billing-profile.dto';

/**
 * Контроллер биллинга
 */
export class BillingController {
  /**
   * POST /api/v1/billing/subscribe
   * Подписаться на тариф
   * Доступ: Owner
   */
  async subscribe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: SubscribeDto = req.body;
      
      const subscription = await billingService.subscribe(data, req.user);
      
      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/v1/billing/cancel
   * Отменить подписку
   * Доступ: Owner
   */
  async cancel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CancelSubscriptionDto = req.body;
      
      const subscription = await billingService.cancelSubscription(data, req.user);
      
      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/billing/subscription/change-plan
   * Сменить план подписки
   * Доступ: Owner
   */
  async changePlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: { planId: string } = req.body;
      
      const subscription = await billingService.changePlan(data, req.user);
      
      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/billing/subscription
   * Получить подписку организации
   * Доступ: Owner, Manager
   */
  async getSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await billingService.getSubscription(req.user);
      
      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/billing/invoices
   * Получить список счетов
   * Доступ: Owner, Manager
   */
  async getInvoices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoices = await billingService.getInvoices(req.user);
      
      res.status(200).json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/v1/billing/webhook
   * Обработать Stripe webhook
   * Доступ: Public (подпись проверяется)
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        res.status(400).json({
          success: false,
          message: 'Missing stripe-signature header',
        });
        return;
      }
      
      // Верифицировать подпись (в production)
      const payload = JSON.stringify(req.body);
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
      const isValid = stripeService.verifyWebhookSignature(payload, signature, webhookSecret);
      
      if (!isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid webhook signature',
        });
        return;
      }
      
      const event: StripeWebhookDto = req.body;
      
      // Обработать webhook
      await billingService.handleStripeWebhook(event);
      
      res.status(200).json({
        success: true,
        received: true,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/billing/profile
   * Создать или обновить биллинг-профиль
   * Доступ: Owner, Accountant
   */
  async createOrUpdateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateBillingProfileDto | UpdateBillingProfileDto = req.body;
      
      const profile = await billingProfileService.createOrUpdate(data, req.user);
      
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/billing/profile
   * Получить биллинг-профиль организации
   * Доступ: Owner, Manager, Accountant
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await billingProfileService.getProfile(req.user);
      
      if (!profile) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'Биллинг-профиль не настроен',
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new BillingController();
