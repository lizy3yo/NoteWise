/**
 * RequestService - Core HTTP service for handling API requests
 * Provides centralized request handling with error management, token refresh, and interceptors
 */

import { API_ENDPOINTS } from '@/constants/endpoints';

export interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class RequestService {
  private baseURL: string;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  /**
   * Get refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  /**
   * Set access token in localStorage
   */
  private setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  /**
   * Clear authentication tokens
   */
  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        const newAccessToken = data.accessToken || data.token;

        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        this.setAccessToken(newAccessToken);
        return newAccessToken;
      } catch (error) {
        this.clearTokens();
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login?session=expired';
        }
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Build headers for request
   */
  private buildHeaders(config?: RequestConfig): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge config headers
    if (config?.headers) {
      Object.assign(headers, config.headers);
    }

    // Add authorization header if not skipped
    if (!config?.skipAuth) {
      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): never {
    if (error.name === 'AbortError') {
      throw new Error('Request was cancelled');
    }

    if (error instanceof TypeError) {
      throw new Error('Network error - please check your connection');
    }

    throw error;
  }

  /**
   * Core request method
   */
  private async request<T = any>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
      const headers = this.buildHeaders(config);

      const response = await fetch(url, {
        ...config,
        headers,
        credentials: config?.credentials || 'include',
      });

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401 && !config?.skipRefresh) {
        try {
          const newToken = await this.refreshAccessToken();
          
          // Retry original request with new token
          const retryHeaders = {
            ...headers,
            'Authorization': `Bearer ${newToken}`,
          };

          const retryResponse = await fetch(url, {
            ...config,
            headers: retryHeaders,
            credentials: config?.credentials || 'include',
          });

          const retryData = await retryResponse.json();
          
          return {
            success: retryResponse.ok,
            data: retryData,
            error: retryResponse.ok ? undefined : retryData.error || retryData.message,
          };
        } catch (refreshError) {
          // Refresh failed, return original 401 response
          const data = await response.json().catch(() => ({}));
          return {
            success: false,
            error: data.error || data.message || 'Authentication failed',
          };
        }
      }

      const data = await response.json().catch(() => ({}));

      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.error || data.message || `Request failed with status ${response.status}`,
        message: data.message,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Export singleton instance
export const requestService = new RequestService();
