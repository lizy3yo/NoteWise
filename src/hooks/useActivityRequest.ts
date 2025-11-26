/**
 * useActivityRequest - Custom hook for activity/history operations
 * Handles fetching and creating activity records
 */

import { useState, useCallback, useEffect } from 'react';
import { requestService, ApiResponse } from '@/services/RequestService';
import { API_ENDPOINTS, CACHE_KEYS, CACHE_TTL } from '@/constants/endpoints';
import { cacheService } from '@/services/CacheService';

export interface Activity {
  _id: string;
  type: string;
  action: string;
  meta?: any;
  createdAt: string;
}

export interface CreateActivityData {
  type: string;
  action: string;
  meta?: any;
}

export const useActivityRequest = (userId?: string) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all activities for user
   */
  const fetchActivities = useCallback(async (
    limit?: number,
    useCache: boolean = true
  ): Promise<ApiResponse<{ activities: Activity[] }>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Check cache first
    if (useCache) {
      const cached = cacheService.get<{ activities: Activity[] }>(CACHE_KEYS.ACTIVITIES, { userId, limit });
      if (cached) {
        setActivities(cached.activities);
        return { success: true, data: cached };
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = limit 
        ? `${API_ENDPOINTS.ACTIVITY.LIST}?userId=${userId}&limit=${limit}`
        : `${API_ENDPOINTS.ACTIVITY.LIST}?userId=${userId}`;

      const response = await requestService.get<{ activities: Activity[] }>(endpoint);

      if (response.success && response.data) {
        setActivities(response.data.activities);
        // Cache the result
        cacheService.set(CACHE_KEYS.ACTIVITIES, response.data, { userId, limit }, CACHE_TTL.SHORT);
      } else {
        setError(response.error || 'Failed to fetch activities');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Create new activity record
   */
  const createActivity = useCallback(async (data: CreateActivityData): Promise<ApiResponse<Activity>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<Activity>(
        `${API_ENDPOINTS.ACTIVITY.CREATE}?userId=${userId}`,
        data
      );

      if (response.success && response.data) {
        // Invalidate activities cache
        cacheService.invalidatePattern(CACHE_KEYS.ACTIVITIES);
        // Invalidate dashboard cache as it includes activities
        cacheService.invalidatePattern(CACHE_KEYS.DASHBOARD);
        // Refresh activities list
        await fetchActivities(undefined, false);
      } else {
        setError(response.error || 'Failed to create activity');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create activity';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchActivities]);

  /**
   * Auto-fetch activities on mount if userId is provided
   */
  useEffect(() => {
    if (userId) {
      fetchActivities();
    }
  }, [userId, fetchActivities]);

  return {
    activities,
    fetchActivities,
    createActivity,
    isLoading,
    error,
  };
};
