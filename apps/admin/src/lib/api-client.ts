/**
 * API Client
 * Axios wrapper with interceptors for JWT tokens and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse } from '@car-service/shared/src/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = `${API_URL}/api/v1`;

// Token keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // For cookies support
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add access token to headers
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = Cookies.get(ACCESS_TOKEN_KEY);
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized - token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for ongoing refresh
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
            if (!refreshToken) {
              this.handleAuthError();
              return Promise.reject(error);
            }

            // Try to refresh token
            const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
              `${API_BASE}/auth/refresh`,
              { refreshToken },
              { withCredentials: true }
            );

            if (response.data.success && response.data.data) {
              const { accessToken, refreshToken: newRefreshToken } = response.data.data;
              
              // Update cookies
              Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 1 }); // 1 day
              Cookies.set(REFRESH_TOKEN_KEY, newRefreshToken, { expires: 7 }); // 7 days

              // Retry original request
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }

              // Notify subscribers
              this.refreshSubscribers.forEach((callback) => callback(accessToken));
              this.refreshSubscribers = [];
              this.isRefreshing = false;

              return this.client(originalRequest);
            } else {
              this.handleAuthError();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private handleAuthError(): void {
    // Clear tokens
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    
    // Redirect to login if we're in the browser
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Set tokens after login/register
  setTokens(accessToken: string, refreshToken: string): void {
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 1 }); // 1 day
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 7 }); // 7 days
  }

  // Clear tokens on logout
  clearTokens(): void {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  }

  // Get access token
  getAccessToken(): string | undefined {
    return Cookies.get(ACCESS_TOKEN_KEY);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!Cookies.get(ACCESS_TOKEN_KEY);
  }

  // Get axios instance
  getInstance(): AxiosInstance {
    return this.client;
  }

  // Convenience methods
  async get<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
