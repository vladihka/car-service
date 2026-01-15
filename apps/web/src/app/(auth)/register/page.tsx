/**
 * Register Page
 * New user registration page
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { AuthLayout } from '../../../components/layouts/AuthLayout';
import { Input, Button } from '@car-service/ui';
import { registerSchema, type RegisterFormData } from '../../../lib/schemas/auth.schema';
import { useAuth } from '../../../lib/auth/auth-context';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Get started with Car Service">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            {...register('firstName')}
            label="First name"
            autoComplete="given-name"
            error={errors.firstName?.message}
            fullWidth
            required
          />
          <Input
            {...register('lastName')}
            label="Last name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            fullWidth
            required
          />
        </div>

        <Input
          {...register('email')}
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          fullWidth
          required
        />

        <Input
          {...register('phone')}
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          fullWidth
        />

        <Input
          {...register('password')}
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          fullWidth
          required
        />

        <Input
          {...register('confirmPassword')}
          label="Confirm password"
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
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
