/**
 * Shared Auth Types
 * Sync with backend DTOs
 */

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  OWNER = 'Owner',
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  MECHANIC = 'Mechanic',
  ACCOUNTANT = 'Accountant',
  CLIENT = 'Client',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  permissions: string[];
  organizationId?: string;
  branchId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
  };
}
