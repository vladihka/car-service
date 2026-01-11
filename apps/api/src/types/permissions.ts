import { UserRole } from './index';

export const PERMISSIONS = {
  // Users
  'users:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
  'users:write': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  'users:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Organizations
  'organizations:read': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  'organizations:write': [UserRole.SUPER_ADMIN],
  'organizations:delete': [UserRole.SUPER_ADMIN],
  
  // Branches
  'branches:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER],
  'branches:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
  'branches:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  
  // Clients
  'clients:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CLIENT],
  'clients:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER],
  'clients:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
  
  // Cars
  'cars:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC, UserRole.CLIENT],
  'cars:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER],
  'cars:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
  
  // Work Orders
  'workOrders:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC, UserRole.CLIENT],
  'workOrders:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC],
  'workOrders:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
  
  // Inventory
  'inventory:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC],
  'inventory:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER],
  'inventory:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
  
  // Invoices
  'invoices:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.CLIENT],
  'invoices:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT],
  'invoices:delete': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
  
  // Payments
  'payments:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT],
  'payments:write': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT],
  
  // Subscriptions
  'subscriptions:read': [UserRole.SUPER_ADMIN, UserRole.OWNER],
  'subscriptions:write': [UserRole.SUPER_ADMIN],
  
  // Analytics
  'analytics:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
  
  // Audit Logs
  'auditLogs:read': [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN],
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
