/**
 * Appointments Page
 * List and manage appointments
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layouts/DashboardLayout';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Button, Card } from '@car-service/ui';
import { CalendarIcon } from '../../../components/icons';
import { useRouteGuard } from '../../../lib/hooks/use-route-guard';
import { UserRole } from '@car-service/shared';

export default function AppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Protect route - require authentication
  useRouteGuard({});

  useEffect(() => {
    // TODO: Fetch appointments from API
    setTimeout(() => {
      setLoading(false);
      setAppointments([]); // Empty for now
    }, 1000);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading appointments..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            // Retry logic
          }}
        />
      </DashboardLayout>
    );
  }

  if (appointments.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your service appointments
              </p>
            </div>
            <Button variant="primary">New Appointment</Button>
          </div>
          <EmptyState
            title="No appointments"
            message="You don't have any appointments yet. Create one to get started."
            actionLabel="Create Appointment"
            onAction={() => {
              // Navigate to create appointment
            }}
            icon={<CalendarIcon className="h-12 w-12" />}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your service appointments
            </p>
          </div>
          <Button variant="primary">New Appointment</Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} padding="md">
              {/* Appointment card content */}
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
