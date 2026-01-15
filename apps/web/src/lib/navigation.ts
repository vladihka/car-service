/**
 * Navigation Configuration
 * Defines all navigation items with RBAC restrictions
 */

import { UserRole } from '@car-service/shared';

export interface NavItem {
  label: string;
  href: string;
  icon?: string; // SVG icon name or path
  roles?: UserRole[];
  permission?: string;
  badge?: number; // For notification counts
}

export const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'home',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC, UserRole.CLIENT],
  },
  {
    label: 'Appointments',
    href: '/dashboard/appointments',
    icon: 'calendar',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC, UserRole.CLIENT],
    permission: 'appointments:read',
  },
  {
    label: 'Services',
    href: '/dashboard/services',
    icon: 'wrench',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
    permission: 'services:read',
  },
  {
    label: 'Work Orders',
    href: '/dashboard/work-orders',
    icon: 'clipboard',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC, UserRole.CLIENT],
    permission: 'workOrders:read',
  },
  {
    label: 'Parts',
    href: '/dashboard/parts',
    icon: 'package',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC],
    permission: 'inventory:read',
  },
  {
    label: 'Stock Movements',
    href: '/dashboard/stock-movements',
    icon: 'arrow-left-right',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
    permission: 'inventory:read',
  },
  {
    label: 'Suppliers',
    href: '/dashboard/suppliers',
    icon: 'truck',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT],
    permission: 'suppliers:read',
  },
  {
    label: 'Purchase Orders',
    href: '/dashboard/purchase-orders',
    icon: 'shopping-cart',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
    permission: 'purchaseOrders:read',
  },
  {
    label: 'Invoices',
    href: '/dashboard/invoices',
    icon: 'file-text',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CLIENT],
    permission: 'invoices:read',
  },
  {
    label: 'Payments',
    href: '/dashboard/payments',
    icon: 'credit-card',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT],
    permission: 'payments:read',
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: 'bell',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC, UserRole.CLIENT],
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: 'bar-chart',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
    permission: 'analytics:read',
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: 'file-bar-chart',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
    permission: 'analytics:read',
  },
  {
    label: 'Billing',
    href: '/dashboard/billing',
    icon: 'wallet',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER],
    permission: 'subscriptions:read',
  },
  {
    label: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: 'credit-card',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER],
    permission: 'subscriptions:read',
  },
  {
    label: 'Taxes',
    href: '/dashboard/taxes',
    icon: 'receipt',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ACCOUNTANT],
    permission: 'taxes:read',
  },
];

/**
 * Get navigation items filtered by role and permissions
 */
export const getNavigationItems = (
  userRole?: UserRole,
  userPermissions: string[] = []
): NavItem[] => {
  if (!userRole) return [];

  return navigationItems.filter((item) => {
    // Check role restriction
    if (item.roles && item.roles.length > 0) {
      if (!item.roles.includes(userRole)) return false;
    }

    // Check permission restriction
    if (item.permission) {
      if (!userPermissions.includes(item.permission)) return false;
    }

    return true;
  });
};
