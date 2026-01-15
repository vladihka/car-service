/**
 * Auth Layout
 * Layout for authentication pages (login, register, forgot password, etc.)
 */

'use client';

import React from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900">Car Service</h1>
          </Link>
          {title && (
            <h2 className="mt-6 text-2xl font-bold text-gray-900">{title}</h2>
          )}
          {subtitle && (
            <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">{children}</div>

        {/* Footer Links */}
        <div className="text-center text-sm text-gray-600">
          <Link href="/" className="hover:text-gray-900">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
