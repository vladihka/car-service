/**
 * Authentication Context and Provider
 * Manages auth state and provides auth methods to components
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '@car-service/shared';
import {
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  getCurrentUser,
  refreshToken,
} from './auth-api';
import { apiClient } from '../api-client';
import { LoginRequest, RegisterRequest } from '@car-service/shared';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize auth - check for existing tokens and fetch user
   */
  const initializeAuth = async (): Promise<void> => {
    try {
      const accessToken = apiClient.getAccessToken();
      if (accessToken) {
        // Try to get current user
        await refreshUser();
      }
    } catch (error) {
      // Token invalid or expired, clear it
      apiClient.clearAuthTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh user data from API
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error: any) {
      // If failed, clear tokens
      apiClient.clearAuthTokens();
      setUser(null);
      throw error;
    }
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      const response = await loginApi(credentials);
      
      // Store tokens in cookies
      apiClient.setTokens(response.accessToken, response.refreshToken);
      
      // Set user
      setUser(response.user);
      
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterRequest): Promise<void> => {
    try {
      const response = await registerApi(data);
      
      // Store tokens in cookies
      apiClient.setTokens(response.accessToken, response.refreshToken);
      
      // Set user
      setUser(response.user);
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutApi();
    } catch (error) {
      // Ignore errors
    } finally {
      // Clear state regardless of API call success
      apiClient.clearAuthTokens();
      setUser(null);
      toast.success('Logged out successfully');
    }
  }, []);

  /**
   * Check if user has specific role(s)
   */
  const hasRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(user.role);
    },
    [user]
  );

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const token = apiClient.getAccessToken();
        if (token) {
          // Check if token is about to expire (refresh 5 minutes before)
          // For now, we rely on interceptor to handle 401 and refresh
          // This is a safety net
        }
      } catch (error) {
        console.error('Token refresh check error:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
