/**
 * Сервис для работы с биллингом и подписками
 * Реализует бизнес-логику для управления подписками и платежами
 */

import Subscription, { ISubscription } from '../models/Subscription';
import Plan, { IPlan } from '../models/Plan';
import Organization from '../models/Organization';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import TransactionLog from '../models/TransactionLog';
import User from '../models/User';
import stripeService from './stripe.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import {
  SubscribeDto,
  CancelSubscriptionDto,
  SubscriptionResponse,
  BillingInvoiceResponse,
} from '../types/billing.dto';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
} from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class BillingService {
  /**
   * Подписаться на тариф
   * Owner может подписывать организацию на тариф
   */
  async subscribe(data: SubscribeDto, user: AuthRequest['user']): Promise<SubscriptionResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner может управлять подпиской
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Только владелец организации может управлять подпиской');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверить, что организация существует
    const organization = await Organization.findById(user.organizationId);
    if (!organization) {
      throw new NotFoundError('Организация не найдена');
    }

    // Проверить, что тариф существует и активен
    const plan = await Plan.findOne({ name: data.planName, isActive: true });
    if (!plan) {
      throw new NotFoundError(`Тариф ${data.planName} не найден или неактивен`);
    }

    // Проверить существующую подписку
    const existingSubscription = await Subscription.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    });

    if (existingSubscription) {
      // Обновить существующую подписку
      return this.updateSubscription(existingSubscription, plan, user);
    }

    // Создать новую подписку
    const owner = await User.findById(user.userId);
    if (!owner) {
      throw new NotFoundError('Пользователь не найден');
    }

    // Создать клиента в Stripe (mock)
    const stripeCustomer = await stripeService.createCustomer({
      email: owner.email,
      name: `${owner.firstName} ${owner.lastName}`,
      metadata: {
        organizationId: user.organizationId,
      },
    });

    // Создать подписку в Stripe (mock)
    const stripeSubscription = await stripeService.createSubscription({
      customerId: stripeCustomer.id,
      priceId: plan.stripePriceId || 'price_mock',
      trialDays: plan.trialDays,
    });

    // Вычислить даты периода
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + (plan.interval === 'year' ? 365 : 30));

    // Вычислить trial период
    let trialStart: Date | undefined;
    let trialEnd: Date | undefined;
    let status = SubscriptionStatus.ACTIVE;

    if (plan.trialDays > 0) {
      trialStart = now;
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
      status = SubscriptionStatus.TRIAL;
    }

    // Создать подписку в БД
    const subscription = new Subscription({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      planId: plan._id,
      planName: plan.name,
      status,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart,
      trialEnd,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeCustomer.id,
      stripePriceId: plan.stripePriceId,
    });

    await subscription.save();

    // Создать лог транзакции
    await TransactionLog.create({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      subscriptionId: subscription._id,
      type: 'subscription',
      action: 'created',
      status: 'success',
      metadata: {
        planName: plan.name,
        stripeSubscriptionId: stripeSubscription.id,
      },
    });

    logger.info(`Subscription created: ${subscription._id} for organization ${user.organizationId}`);

    return this.mapToResponse(subscription, plan);
  }

  /**
   * Обновить существующую подписку
   */
  private async updateSubscription(
    existingSubscription: ISubscription,
    newPlan: IPlan,
    user: AuthRequest['user']
  ): Promise<SubscriptionResponse> {
    // Обновить подписку в Stripe (mock)
    const stripeSubscription = await stripeService.updateSubscription?.(existingSubscription.stripeSubscriptionId || '', {
      priceId: newPlan.stripePriceId || 'price_mock',
    });

    // Обновить подписку в БД
    existingSubscription.planId = newPlan._id;
    existingSubscription.planName = newPlan.name;
    existingSubscription.stripePriceId = newPlan.stripePriceId;

    if (stripeSubscription) {
      existingSubscription.currentPeriodStart = stripeSubscription.currentPeriodStart;
      existingSubscription.currentPeriodEnd = stripeSubscription.currentPeriodEnd;
      existingSubscription.status = this.mapStripeStatusToSubscriptionStatus(stripeSubscription.status);
    }

    await existingSubscription.save();

    // Создать лог транзакции
    await TransactionLog.create({
      organizationId: new mongoose.Types.ObjectId(user!.organizationId!),
      subscriptionId: existingSubscription._id,
      type: 'subscription',
      action: 'updated',
      status: 'success',
      metadata: {
        oldPlan: existingSubscription.planName,
        newPlan: newPlan.name,
      },
    });

    return this.mapToResponse(existingSubscription, newPlan);
  }

  /**
   * Отменить подписку
   */
  async cancelSubscription(data: CancelSubscriptionDto, user: AuthRequest['user']): Promise<SubscriptionResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner может отменять подписку
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Только владелец организации может отменять подписку');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    const subscription = await Subscription.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    });

    if (!subscription) {
      throw new NotFoundError('Подписка не найдена');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestError('Подписка уже отменена');
    }

    // Отменить подписку в Stripe
    const stripeSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId || '',
      data.cancelAtPeriodEnd
    );

    // Обновить подписку в БД
    subscription.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
    subscription.status = this.mapStripeStatusToSubscriptionStatus(stripeSubscription.status);

    if (!data.cancelAtPeriodEnd) {
      subscription.canceledAt = new Date();
      subscription.status = SubscriptionStatus.CANCELLED;
    }

    await subscription.save();

    // Создать лог транзакции
    await TransactionLog.create({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      subscriptionId: subscription._id,
      type: 'subscription',
      action: 'canceled',
      status: 'success',
      metadata: {
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      },
    });

    const plan = await Plan.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundError('Тариф не найден');
    }

    logger.info(`Subscription canceled: ${subscription._id} for organization ${user.organizationId}`);

    return this.mapToResponse(subscription, plan);
  }

  /**
   * Сменить план подписки
   */
  async changePlan(data: { planId: string }, user: AuthRequest['user']): Promise<SubscriptionResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner может менять план
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Только владелец организации может менять план подписки');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверить, что тариф существует и активен
    const plan = await Plan.findOne({
      _id: new mongoose.Types.ObjectId(data.planId),
      isActive: true,
    });

    if (!plan) {
      throw new NotFoundError('Тариф не найден или неактивен');
    }

    // Найти существующую подписку
    const subscription = await Subscription.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    });

    if (!subscription) {
      throw new NotFoundError('Подписка не найдена');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestError('Нельзя изменить план отмененной подписки');
    }

    // Обновить подписку
    return this.updateSubscription(subscription, plan, user);
  }

  /**
   * Получить подписку организации
   */
  async getSubscription(user: AuthRequest['user']): Promise<SubscriptionResponse | null> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Owner и Manager могут просматривать подписку
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для просмотра подписки');
    }

    if (!user.organizationId) {
      return null;
    }

    const subscription = await Subscription.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    }).populate('planId');

    if (!subscription) {
      return null;
    }

    const plan = await Plan.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundError('Тариф не найден');
    }

    return this.mapToResponse(subscription, plan);
  }

  /**
   * Получить список счетов организации
   */
  async getInvoices(user: AuthRequest['user']): Promise<BillingInvoiceResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Owner и Manager могут просматривать счета
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для просмотра счетов');
    }

    if (!user.organizationId) {
      return [];
    }

    const subscription = await Subscription.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    });

    if (!subscription) {
      return [];
    }

    // Получить счета организации (используем существующую модель Invoice)
    const invoices = await Invoice.find({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return invoices.map(invoice => ({
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      organizationId: invoice.organizationId.toString(),
      subscriptionId: subscription._id.toString(),
      status: invoice.status,
      amount: invoice.total,
      currency: 'USD', // TODO: получить из плана
      dueDate: invoice.issuedAt,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
    }));
  }

  /**
   * Обработать Stripe webhook
   */
  async handleStripeWebhook(event: { id: string; type: string; data: { object: any } }): Promise<void> {
    // Проверить идемпотентность через TransactionLog
    const existingLog = await TransactionLog.findOne({
      stripeEventId: event.id,
    });

    if (existingLog) {
      logger.info(`Webhook event ${event.id} already processed`);
      return;
    }

    try {
      switch (event.type) {
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object);
          break;
        case 'subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      // Создать лог транзакции
      await TransactionLog.create({
        organizationId: undefined, // Будет установлено в обработчиках
        type: 'webhook',
        action: event.type,
        status: 'success',
        stripeEventId: event.id,
        metadata: {
          type: event.type,
          object: event.data.object,
        },
      });
    } catch (error: any) {
      logger.error(`Error handling webhook ${event.id}:`, error);

      // Создать лог ошибки
      await TransactionLog.create({
        organizationId: undefined,
        type: 'webhook',
        action: event.type,
        status: 'failed',
        stripeEventId: event.id,
        error: error.message,
        metadata: {
          type: event.type,
        },
      });

      throw error;
    }
  }

  /**
   * Обработать событие invoice.paid
   */
  private async handleInvoicePaid(invoice: any): Promise<void> {
    // Найти подписку по stripeSubscriptionId
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (!subscription) {
      logger.warn(`Subscription not found for invoice ${invoice.id}`);
      return;
    }

    // Обновить статус подписки
    subscription.status = SubscriptionStatus.ACTIVE;
    await subscription.save();

    logger.info(`Invoice paid: ${invoice.id} for subscription ${subscription._id}`);
  }

  /**
   * Обработать событие subscription.updated
   */
  private async handleSubscriptionUpdated(stripeSubscription: any): Promise<void> {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (!subscription) {
      logger.warn(`Subscription not found for Stripe subscription ${stripeSubscription.id}`);
      return;
    }

    // Обновить подписку
    subscription.status = this.mapStripeStatusToSubscriptionStatus(stripeSubscription.status);
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    subscription.canceledAt = stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : undefined;

    await subscription.save();

    logger.info(`Subscription updated: ${subscription._id}`);
  }

  /**
   * Обработать событие payment_failed
   */
  private async handlePaymentFailed(invoice: any): Promise<void> {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (!subscription) {
      logger.warn(`Subscription not found for invoice ${invoice.id}`);
      return;
    }

    // Обновить статус подписки на SUSPENDED
    subscription.status = SubscriptionStatus.SUSPENDED;
    await subscription.save();

    logger.warn(`Payment failed for subscription ${subscription._id}`);
  }

  /**
   * Маппинг статуса Stripe в статус подписки
   */
  private mapStripeStatusToSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'trialing':
        return SubscriptionStatus.TRIAL;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.SUSPENDED;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(subscription: ISubscription, plan: IPlan): SubscriptionResponse {
    return {
      id: subscription._id.toString(),
      organizationId: subscription.organizationId.toString(),
      planId: subscription.planId.toString(),
      planName: subscription.planName,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      canceledAt: subscription.canceledAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      plan: {
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features,
      },
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}

export default new BillingService();
