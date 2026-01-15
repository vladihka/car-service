/**
 * Authentication API methods
 * Wrapper for auth endpoints
 */

import { apiClient } from '../api-client';
import {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthResponse,
  User,
} from '@car-service/shared';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
  };
}

/**
 * Login user
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<ApiResponse<AuthResponse>>(
    '/api/v1/auth/login',
    credentials
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Login failed');
  }

  return response.data;
}

/**
 * Register new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<ApiResponse<AuthResponse>>(
    '/api/v1/auth/register',
    { ...data, role: 'Client' }
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Registration failed');
  }

  return response.data;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>('/api/v1/auth/me');

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch user');
  }

  return response.data;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/v1/auth/logout');
  } catch (error) {
    // Ignore errors on logout
    console.error('Logout error:', error);
  } finally {
    apiClient.clearAuthTokens();
  }
}

/**
 * Forgot password
 */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  const response = await apiClient.post<ApiResponse<void>>(
    '/api/v1/auth/forgot-password',
    data
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to send reset email');
  }
}

/**
 * Reset password
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  const response = await apiClient.post<ApiResponse<void>>(
    '/api/v1/auth/reset-password',
    data
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to reset password');
  }
}

/**
 * Refresh access token
 */
export async function refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
    '/api/v1/auth/refresh',
    {}
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to refresh token');
  }

  return response.data;
}
