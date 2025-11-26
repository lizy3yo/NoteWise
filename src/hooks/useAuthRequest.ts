/**
 * useAuthRequest - Custom hook for authentication requests
 * Handles login, register, logout, and password management
 */

import { useState, useCallback } from 'react';
import { requestService, ApiResponse } from '@/services/RequestService';
import { API_ENDPOINTS } from '@/constants/endpoints';
import { cacheService } from '@/services/CacheService';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailData {
  email: string;
  code: string;
}

export interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken?: string;
}

export const useAuthRequest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear old user data and cache before logging in
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      cacheService.clear();

      const response = await requestService.post<AuthResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials,
        { skipAuth: true }
      );

      if (response.success && response.data) {
        console.log('✅ Login successful, storing tokens:', {
          hasAccessToken: !!response.data.accessToken,
          hasRefreshToken: !!response.data.refreshToken,
          hasUser: !!response.data.user
        });

        // Store tokens
        if (response.data.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
          console.log('✅ Access token stored');
        }
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
          console.log('✅ Refresh token stored');
        }
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('userId', response.data.user._id || response.data.user.id);
          console.log('✅ User data stored');
        }
      } else {
        console.error('❌ Login failed:', response.error);
        setError(response.error || 'Login failed');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterData): Promise<ApiResponse<AuthResponse>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<AuthResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        data,
        { skipAuth: true }
      );

      if (response.success && response.data) {
        // Store tokens if provided
        if (response.data.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
        }
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('userId', response.data.user._id || response.data.user.id);
        }
      } else {
        setError(response.error || 'Registration failed');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<void>(API_ENDPOINTS.AUTH.LOGOUT);

      // Clear ALL local storage regardless of response
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      localStorage.removeItem('rememberMe');

      // Clear all cache
      cacheService.clear();

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Request password reset
   */
  const forgotPassword = useCallback(async (email: string): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<void>(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { email },
        { skipAuth: true }
      );

      if (!response.success) {
        setError(response.error || 'Failed to send reset email');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset password with token
   */
  const resetPassword = useCallback(async (data: ResetPasswordData): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<void>(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        data,
        { skipAuth: true }
      );

      if (!response.success) {
        setError(response.error || 'Failed to reset password');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify email with code
   */
  const verifyEmail = useCallback(async (data: VerifyEmailData): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<void>(
        API_ENDPOINTS.AUTH.VERIFY_EMAIL,
        data,
        { skipAuth: true }
      );

      if (!response.success) {
        setError(response.error || 'Email verification failed');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email verification failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Resend verification email
   */
  const resendVerification = useCallback(async (email: string): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<void>(
        API_ENDPOINTS.AUTH.RESEND_VERIFICATION,
        { email },
        { skipAuth: true }
      );

      if (!response.success) {
        setError(response.error || 'Failed to resend verification email');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend verification email';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    isLoading,
    error,
  };
};
