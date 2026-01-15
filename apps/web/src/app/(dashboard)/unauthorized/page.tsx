/**
 * Unauthorized Page
 * Shown when user doesn't have permission to access a resource
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../../components/layouts/DashboardLayout';
import { Button } from '@car-service/ui';

export default function UnauthorizedPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-md text-center">
          <svg
            className="mx-auto h-12 w-12 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
          </p>
          <div className="mt-6">
            <Link href="/dashboard">
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
