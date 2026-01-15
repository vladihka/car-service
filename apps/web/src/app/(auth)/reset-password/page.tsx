/**
 * Reset Password Page
 * Reset password with token
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { AuthLayout } from '../../../components/layouts/AuthLayout';
import { Input, Button } from '@car-service/ui';
import { resetPasswordSchema, type ResetPasswordFormData } from '../../../lib/schemas/auth.schema';
import { resetPassword } from '../../../lib/auth/auth-api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (!tokenParam) {
      toast.error('Invalid reset token');
      router.push('/forgot-password');
      return;
    }
    setToken(tokenParam);
  }, [searchParams, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || '',
    },
  });

  // Update form when token is available
  useEffect(() => {
    if (token) {
      // @ts-ignore - reset method exists
      handleSubmit((data) => {})();
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Invalid reset token');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({ ...data, token });
      toast.success('Password reset successfully!');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Loading..." subtitle="Validating reset token">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary-600 border-r-transparent"></div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('token')} value={token} />

        <Input
          {...register('password')}
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          fullWidth
          required
        />

        <Input
          {...register('confirmPassword')}
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          fullWidth
          required
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset password'}
        </Button>

        <div className="text-center text-sm text-gray-600">
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
