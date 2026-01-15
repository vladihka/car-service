/**
 * API Client with interceptors for JWT token handling
 * Works with cookies for token storage
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { AuthResponse } from '../types';

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false, // We handle cookies manually
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add access token to headers
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = Cookies.get('accessToken');
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            
            // Update cookie and retry request
            if (newAccessToken && originalRequest.headers) {
              Cookies.set('accessToken', newAccessToken, { expires: 7 });
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
          `${this.baseURL}/api/v1/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Update cookies
        Cookies.set('accessToken', accessToken, { expires: 7 });
        if (newRefreshToken) {
          Cookies.set('refreshToken', newRefreshToken, { expires: 30 });
        }

        return accessToken;
      } catch (error) {
        this.clearTokens();
        throw error;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  /**
   * Clear all auth tokens
   */
  private clearTokens(): void {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  }

  /**
   * Set auth tokens in cookies
   */
  public setTokens(accessToken: string, refreshToken: string): void {
    Cookies.set('accessToken', accessToken, { expires: 7 }); // 7 days
    Cookies.set('refreshToken', refreshToken, { expires: 30 }); // 30 days
  }

  /**
   * Clear auth tokens
   */
  public clearAuthTokens(): void {
    this.clearTokens();
  }

  /**
   * Get access token
   */
  public getAccessToken(): string | undefined {
    return Cookies.get('accessToken');
  }

  /**
   * Get axios instance
   */
  public getInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * GET request
   */
  public async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  public async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  public async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  public async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  public async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Export singleton instance factory
let apiClientInstance: ApiClient | null = null;

export const createApiClient = (baseURL: string): ApiClient => {
  if (!apiClientInstance || apiClientInstance.baseURL !== baseURL) {
    apiClientInstance = new ApiClient(baseURL);
  }
  return apiClientInstance;
};

export const getApiClient = (): ApiClient => {
  if (!apiClientInstance) {
    throw new Error('ApiClient not initialized. Call createApiClient first.');
  }
  return apiClientInstance;
};
