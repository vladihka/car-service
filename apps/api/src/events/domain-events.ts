/**
 * Domain Events для системы уведомлений
 * Event-driven архитектура для обработки событий системы
 */

import { NotificationType, DomainEvent } from '../types/notification.dto';
import logger from '../utils/logger';

/**
 * Базовый класс для Domain Events
 */
export abstract class DomainEventBase {
  public readonly type: NotificationType;
  public readonly timestamp: Date;
  public readonly organizationId?: string;
  public readonly branchId?: string;
  public readonly userId: string;
  public readonly data: { [key: string]: any };

  constructor(
    type: NotificationType,
    userId: string,
    data: { [key: string]: any },
    organizationId?: string,
    branchId?: string
  ) {
    this.type = type;
    this.userId = userId;
    this.data = data;
    this.organizationId = organizationId;
    this.branchId = branchId;
    this.timestamp = new Date();
  }

  toDTO(): DomainEvent {
    return {
      type: this.type,
      organizationId: this.organizationId,
      branchId: this.branchId,
      userId: this.userId,
      data: this.data,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Событие: Создание записи
 */
export class AppointmentCreatedEvent extends DomainEventBase {
  constructor(userId: string, data: { appointmentId: string; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.APPOINTMENT_CREATED, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Подтверждение записи
 */
export class AppointmentConfirmedEvent extends DomainEventBase {
  constructor(userId: string, data: { appointmentId: string; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.APPOINTMENT_CONFIRMED, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Отмена записи
 */
export class AppointmentCancelledEvent extends DomainEventBase {
  constructor(userId: string, data: { appointmentId: string; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.APPOINTMENT_CANCELLED, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Назначение механика
 */
export class MechanicAssignedEvent extends DomainEventBase {
  constructor(userId: string, data: { appointmentId: string; workOrderId: string; mechanicId: string; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.MECHANIC_ASSIGNED, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Изменение статуса заказа
 */
export class WorkOrderStatusChangedEvent extends DomainEventBase {
  constructor(userId: string, data: { workOrderId: string; oldStatus: string; newStatus: string; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.WORK_ORDER_STATUS_CHANGED, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Автомобиль готов
 */
export class VehicleReadyEvent extends DomainEventBase {
  constructor(userId: string, data: { workOrderId: string; appointmentId: string; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.VEHICLE_READY, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Напоминание о записи
 */
export class AppointmentReminderEvent extends DomainEventBase {
  constructor(userId: string, data: { appointmentId: string; reminderHours: number; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.APPOINTMENT_REMINDER, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Просроченный заказ
 */
export class WorkOrderOverdueEvent extends DomainEventBase {
  constructor(userId: string, data: { workOrderId: string; overdueDays: number; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.WORK_ORDER_OVERDUE, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Создание подписки
 */
export class SubscriptionCreatedEvent extends DomainEventBase {
  constructor(userId: string, data: { subscriptionId: string; planName: string; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.MECHANIC_ASSIGNED, userId, { ...data, eventType: 'subscription_created' }, organizationId, branchId);
  }
}

/**
 * Событие: Платеж успешен
 */
export class PaymentSucceededEvent extends DomainEventBase {
  constructor(userId: string, data: { paymentId: string; invoiceId: string; amount: number; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.MECHANIC_ASSIGNED, userId, { ...data, eventType: 'payment_succeeded' }, organizationId, branchId);
  }
}

/**
 * Событие: Платеж неуспешен
 */
export class PaymentFailedEvent extends DomainEventBase {
  constructor(userId: string, data: { paymentId: string; invoiceId: string; amount: number; error: string; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.MECHANIC_ASSIGNED, userId, { ...data, eventType: 'payment_failed' }, organizationId, branchId);
  }
}

/**
 * Событие: Счет создан
 */
export class InvoiceCreatedEvent extends DomainEventBase {
  constructor(userId: string, data: { invoiceId: string; invoiceNumber: string; totalAmount: number; currency: string; dueDate?: Date; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.INVOICE_CREATED, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Платеж получен
 */
export class PaymentReceivedEvent extends DomainEventBase {
  constructor(userId: string, data: { paymentId: string; invoiceId: string; invoiceNumber: string; amount: number; currency: string; paymentMethod: string; paymentDate: Date; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.PAYMENT_RECEIVED, userId, data, organizationId, branchId);
  }
}

/**
 * Событие: Запрос на сброс пароля
 */
export class PasswordResetRequestEvent extends DomainEventBase {
  constructor(userId: string, data: { resetToken: string; resetUrl: string; expirationHours: number; [key: string]: any }, organizationId?: string, branchId?: string) {
    super(NotificationType.PASSWORD_RESET, userId, data, organizationId, branchId);
  }
}

/**
 * Event Bus (подготовка под очередь задач)
 * В будущем можно интегрировать BullMQ, RabbitMQ, etc.
 */
export class EventBus {
  private static handlers: Map<NotificationType, Array<(event: DomainEventBase) => Promise<void>>> = new Map();

  /**
   * Подписаться на событие
   */
  static subscribe(type: NotificationType, handler: (event: DomainEventBase) => Promise<void>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    logger.info(`Subscribed handler for event type: ${type}`);
  }

  /**
   * Опубликовать событие
   */
  static async publish(event: DomainEventBase): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    
    logger.info(`Publishing event: ${event.type} for user ${event.userId}`);
    
    // Выполнить все обработчики асинхронно
    const promises = handlers.map(handler => {
      return handler(event).catch(error => {
        logger.error(`Error handling event ${event.type}:`, error);
      });
    });
    
    await Promise.allSettled(promises);
  }

  /**
   * Очистить все подписки (для тестов)
   */
  static clear(): void {
    this.handlers.clear();
  }
}
