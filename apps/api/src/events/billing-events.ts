/**
 * Domain Events для системы биллинга
 */

import logger from '../utils/logger';

/**
 * Базовый класс для Billing Events
 */
export abstract class BillingEventBase {
  public readonly type: string;
  public readonly timestamp: Date;
  public readonly organizationId?: string;
  public readonly data: { [key: string]: any };

  constructor(type: string, organizationId: string | undefined, data: { [key: string]: any }) {
    this.type = type;
    this.organizationId = organizationId;
    this.data = data;
    this.timestamp = new Date();
  }
}

/**
 * Событие: Создание подписки
 */
export class SubscriptionCreatedEvent extends BillingEventBase {
  constructor(organizationId: string, data: { subscriptionId: string; planName: string; [key: string]: any }) {
    super('subscription_created', organizationId, data);
  }
}

/**
 * Событие: Платеж успешен
 */
export class PaymentSucceededEvent extends BillingEventBase {
  constructor(organizationId: string, data: { paymentId: string; invoiceId: string; amount: number; [key: string]: any }) {
    super('payment_succeeded', organizationId, data);
  }
}

/**
 * Событие: Платеж неуспешен
 */
export class PaymentFailedEvent extends BillingEventBase {
  constructor(organizationId: string, data: { paymentId: string; invoiceId: string; amount: number; error: string; [key: string]: any }) {
    super('payment_failed', organizationId, data);
  }
}

/**
 * Событие: Подписка отменена
 */
export class SubscriptionCanceledEvent extends BillingEventBase {
  constructor(organizationId: string, data: { subscriptionId: string; cancelAtPeriodEnd: boolean; [key: string]: any }) {
    super('subscription_canceled', organizationId, data);
  }
}

/**
 * Событие: Подписка обновлена
 */
export class SubscriptionUpdatedEvent extends BillingEventBase {
  constructor(organizationId: string, data: { subscriptionId: string; oldPlan: string; newPlan: string; [key: string]: any }) {
    super('subscription_updated', organizationId, data);
  }
}
