/**
 * Роли пользователей в системе (RBAC)
 * SuperAdmin - полный доступ ко всем организациям
 * Owner - владелец организации, управляет всей организацией
 * Manager - менеджер филиала, управляет одним филиалом
 * Mechanic - механик, работает с назначенными заказами
 * Client - клиент, доступ только к своим записям
 */
export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  OWNER = 'Owner',
  MANAGER = 'Manager',
  MECHANIC = 'Mechanic',
  CLIENT = 'Client',
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum WorkOrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  WAITING_PARTS = 'waiting_parts',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  ONLINE = 'online',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum SubscriptionPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

/**
 * Типы движений по складу
 */
export enum StockMovementType {
  IN = 'in', // Приход
  OUT = 'out', // Расход
  ADJUSTMENT = 'adjustment', // Корректировка
  WRITEOFF = 'writeoff', // Списание
  RESERVATION = 'reservation', // Резервирование
  RETURN = 'return', // Возврат
}

/**
 * Статусы заказов поставщикам
 */
export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  ORDERED = 'ordered',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

/**
 * Типы уведомлений
 */
export enum NotificationType {
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  MECHANIC_ASSIGNED = 'mechanic_assigned',
  WORK_ORDER_STATUS_CHANGED = 'work_order_status_changed',
  VEHICLE_READY = 'vehicle_ready',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  WORK_ORDER_OVERDUE = 'work_order_overdue',
}

/**
 * Каналы доставки уведомлений
 */
export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

/**
 * Статусы уведомлений
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
