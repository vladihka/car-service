import { UserRole } from './index';

/**
 * Матрица прав доступа (RBAC)
 * Определяет, какие роли имеют доступ к каким операциям
 */
export const PERMISSIONS = {
  // Users
  'users:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  'users:write': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  'users:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Organizations
  'organizations:read': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  'organizations:write': [UserRole.SUPER_ADMIN],
  'organizations:delete': [UserRole.SUPER_ADMIN],
  
  // Branches
  'branches:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  'branches:write': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  'branches:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Clients
  'clients:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CLIENT],
  'clients:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  'clients:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Cars
  'cars:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC, UserRole.CLIENT],
  'cars:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  'cars:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Work Orders
  'workOrders:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC, UserRole.CLIENT],
  'workOrders:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC],
  'workOrders:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Inventory
  'inventory:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.MECHANIC],
  'inventory:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  'inventory:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Invoices
  'invoices:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CLIENT],
  'invoices:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  'invoices:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Payments
  'payments:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  'payments:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  
  // Subscriptions
  'subscriptions:read': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  'subscriptions:write': [UserRole.SUPER_ADMIN],
  
  // Analytics
  'analytics:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
  
  // Audit Logs
  'auditLogs:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const getPermissionsByRole = (role: UserRole): Permission[] => {
  const permissions: Permission[] = [];
  
  Object.entries(PERMISSIONS).forEach(([permission, roles]) => {
    if (roles.includes(role)) {
      permissions.push(permission as Permission);
    }
  });
  
  return permissions;
};
