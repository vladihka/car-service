/**
 * Route Guard Hook
 * Protects routes based on roles and permissions
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../auth/auth-context';
import { UserRole } from '@car-service/shared';

interface RouteGuardOptions {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  redirectTo?: string;
}

export const useRouteGuard = (options: RouteGuardOptions = {}): void => {
  const { user, isLoading, hasRole, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // If no user, redirect to login
    if (!user) {
      router.push(options.redirectTo || '/login');
      return;
    }

    // Check role restrictions
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!hasRole(options.allowedRoles)) {
        router.push('/unauthorized');
        return;
      }
    }

    // Check permission restrictions
    if (options.requiredPermission) {
      if (!hasPermission(options.requiredPermission)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, isLoading, hasRole, hasPermission, router, pathname, options]);
};
