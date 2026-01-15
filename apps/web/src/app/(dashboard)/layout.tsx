/**
 * Dashboard Layout Wrapper
 * Protects dashboard routes with authentication
 */

'use client';

import React from 'react';
import { useRouteGuard } from '../../lib/hooks/use-route-guard';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all dashboard routes - requires authentication
  useRouteGuard({});

  return <>{children}</>;
}
