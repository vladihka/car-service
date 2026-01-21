/**
 * Dashboard Page
 * Main dashboard with metrics and overview
 */

'use client';

import React from 'react';
import { DashboardLayout } from '../../../components/layouts/DashboardLayout';
import { MetricCard } from '../../../components/dashboard/MetricCard';
import { useAuth } from '../../../lib/auth/auth-context';
import { CalendarIcon, ClipboardIcon, FileTextIcon } from '../../../components/icons';

export default function DashboardPage() {
  const { user } = useAuth();

  // Mock metrics - replace with real API calls
  const metrics = [
    {
      title: 'Appointments Today',
      value: '12',
      subtitle: '3 upcoming',
      trend: { value: 12, isPositive: true, label: 'vs yesterday' },
      icon: <CalendarIcon />,
      color: 'primary' as const,
    },
    {
      title: 'Active Work Orders',
      value: '8',
      subtitle: '2 in progress',
      trend: { value: 5, isPositive: false, label: 'vs last week' },
      icon: <ClipboardIcon />,
      color: 'warning' as const,
    },
    {
      title: 'Pending Invoices',
      value: '$4,250',
      subtitle: '5 invoices',
      trend: { value: 8, isPositive: true, label: 'vs last month' },
      icon: <FileTextIcon />,
      color: 'info' as const,
    },
    {
      title: 'Total Revenue',
      value: '$28,500',
      subtitle: 'This month',
      trend: { value: 15, isPositive: true, label: 'vs last month' },
      icon: <FileTextIcon />,
      color: 'success' as const,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, {user?.firstName}! Here's what's happening today.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {/* Add quick action buttons here */}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {/* Add recent activity list here */}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
