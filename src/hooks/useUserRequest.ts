/**
 * useUserRequest - Custom hook for user profile operations
 * Handles user data fetching and profile updates
 */

import { useState, useCallback, useEffect } from 'react';
import { requestService, ApiResponse } from '@/services/RequestService';
import { API_ENDPOINTS, CACHE_KEYS, CACHE_TTL } from '@/constants/endpoints';
import { cacheService } from '@/services/CacheService';

export interface User {
  _id?: string;
  id?: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  profileImage?: string;
  image?: string;
  role?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const useUserRequest = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current user profile
   */
  const fetchCurrentUser = useCallback(async (useCache: boolean = true): Promise<ApiResponse<{ user: User }>> => {
    // Check cache first
    if (useCache) {
      const cached = cacheService.get<{ user: User }>(CACHE_KEYS.USER_CURRENT);
      if (cached) {
        setUser(cached.user);
        return { success: true, data: cached };
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.get<{ user: User }>(API_ENDPOINTS.USER.CURRENT);

      if (response.success && response.data) {
        setUser(response.data.user);
        // Cache the result
        cacheService.set(CACHE_KEYS.USER_CURRENT, response.data, undefined, CACHE_TTL.LONG);
        
        // Update localStorage
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          const userId = response.data.user._id || response.data.user.id;
          if (userId) {
            localStorage.setItem('userId', userId);
          }
        }
      } else {
        setError(response.error || 'Failed to fetch user profile');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: UpdateProfileData): Promise<ApiResponse<{ user: User }>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.patch<{ user: User }>(
        API_ENDPOINTS.USER.UPDATE_PROFILE,
        data
      );

      if (response.success && response.data) {
        setUser(response.data.user);
        // Invalidate cache
        cacheService.invalidate(CACHE_KEYS.USER_CURRENT);
        
        // Update localStorage
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        // Dispatch custom event for profile update
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('profileUpdated'));
        }
      } else {
        setError(response.error || 'Failed to update profile');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Change user password
   */
  const changePassword = useCallback(async (data: ChangePasswordData): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<void>(
        API_ENDPOINTS.USER.CHANGE_PASSWORD,
        data
      );

      if (!response.success) {
        setError(response.error || 'Failed to change password');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Auto-fetch current user on mount
   */
  useEffect(() => {
    // Only fetch if we have an access token
    if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
      fetchCurrentUser();
    }
  }, [fetchCurrentUser]);

  return {
    user,
    fetchCurrentUser,
    updateProfile,
    changePassword,
    isLoading,
    error,
  };
};
