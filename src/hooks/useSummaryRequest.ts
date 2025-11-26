/**
 * useSummaryRequest - Custom hook for summary operations
 * Handles CRUD operations for summaries with caching
 */

import { useState, useCallback, useEffect } from 'react';
import { requestService, ApiResponse } from '@/services/RequestService';
import { API_ENDPOINTS, CACHE_KEYS, CACHE_TTL } from '@/constants/endpoints';
import { cacheService } from '@/services/CacheService';

export interface Summary {
  _id: string;
  title: string;
  content: string;
  subject: string;
  difficulty: string;
  summaryType: string;
  wordCount: number;
  readingTime: number;
  keyPoints: string[];
  mainTopics: string[];
  compressionRatio: number;
  confidence: number;
  tags: string[];
  folder?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  isRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSummaryData {
  title: string;
  content: string;
  subject: string;
  difficulty?: string;
  summaryType?: string;
  tags?: string[];
  folder?: string;
}

export interface UpdateSummaryData extends Partial<CreateSummaryData> {
  isFavorite?: boolean;
  isArchived?: boolean;
  isRead?: boolean;
}

export const useSummaryRequest = (userId?: string) => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all summaries for user
   */
  const fetchSummaries = useCallback(async (useCache: boolean = true): Promise<ApiResponse<{ summaries: Summary[] }>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Check cache first
    if (useCache) {
      const cached = cacheService.get<{ summaries: Summary[] }>(CACHE_KEYS.SUMMARIES, { userId });
      if (cached) {
        setSummaries(cached.summaries);
        return { success: true, data: cached };
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.get<{ summaries: Summary[]; success: boolean }>(
        `${API_ENDPOINTS.SUMMARY.LIST}?userId=${userId}`
      );

      if (response.success && response.data) {
        setSummaries(response.data.summaries);
        // Cache the result
        cacheService.set(CACHE_KEYS.SUMMARIES, response.data, { userId }, CACHE_TTL.MEDIUM);
      } else {
        setError(response.error || 'Failed to fetch summaries');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch summaries';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Fetch single summary by ID
   */
  const fetchSummary = useCallback(async (
    summaryId: string,
    useCache: boolean = true
  ): Promise<ApiResponse<Summary>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Check cache first
    if (useCache) {
      const cached = cacheService.get<Summary>(CACHE_KEYS.SUMMARY, { userId, summaryId });
      if (cached) {
        return { success: true, data: cached };
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.get<Summary>(
        `${API_ENDPOINTS.SUMMARY.GET(summaryId)}?userId=${userId}`
      );

      if (response.success && response.data) {
        // Cache the result
        cacheService.set(CACHE_KEYS.SUMMARY, response.data, { userId, summaryId }, CACHE_TTL.MEDIUM);
      } else {
        setError(response.error || 'Failed to fetch summary');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch summary';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Create new summary
   */
  const createSummary = useCallback(async (data: CreateSummaryData): Promise<ApiResponse<Summary>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<Summary>(
        `${API_ENDPOINTS.SUMMARY.CREATE}?userId=${userId}`,
        data
      );

      if (response.success && response.data) {
        // Invalidate summaries cache
        cacheService.invalidate(CACHE_KEYS.SUMMARIES, { userId });
        // Refresh summaries list
        await fetchSummaries(false);
        
        const summaryId = response.data._id;
        
        // Trigger immediate achievement check with slight delay to ensure activity is persisted
        if (typeof window !== 'undefined') {
          // Small delay to ensure database write completes
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('checkAchievements'));
            
            // Also broadcast to other tabs
            try {
              if ('BroadcastChannel' in window) {
                const bc = new BroadcastChannel('notewise.activities');
                bc.postMessage({ type: 'summary.created', summaryId });
                bc.close();
              }
            } catch (e) {
              console.warn('BroadcastChannel not available:', e);
            }
          }, 500);
        }
      } else {
        setError(response.error || 'Failed to create summary');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create summary';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchSummaries]);

  /**
   * Update summary
   */
  const updateSummary = useCallback(async (
    summaryId: string,
    data: UpdateSummaryData
  ): Promise<ApiResponse<Summary>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.patch<Summary>(
        `${API_ENDPOINTS.SUMMARY.UPDATE}?userId=${userId}&summaryId=${summaryId}`,
        data
      );

      if (response.success) {
        // Invalidate caches
        cacheService.invalidate(CACHE_KEYS.SUMMARIES, { userId });
        cacheService.invalidate(CACHE_KEYS.SUMMARY, { userId, summaryId });
        // Refresh summaries list
        await fetchSummaries(false);
      } else {
        setError(response.error || 'Failed to update summary');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update summary';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchSummaries]);

  /**
   * Delete summary
   */
  const deleteSummary = useCallback(async (summaryId: string): Promise<ApiResponse<void>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.delete<void>(
        `${API_ENDPOINTS.SUMMARY.DELETE}?userId=${userId}&summaryId=${summaryId}`
      );

      if (response.success) {
        // Invalidate caches
        cacheService.invalidate(CACHE_KEYS.SUMMARIES, { userId });
        cacheService.invalidate(CACHE_KEYS.SUMMARY, { userId, summaryId });
        // Update local state
        setSummaries((prev) => prev.filter((s) => s._id !== summaryId));
      } else {
        setError(response.error || 'Failed to delete summary');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete summary';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Auto-fetch summaries on mount if userId is provided
   */
  useEffect(() => {
    if (userId) {
      fetchSummaries();
    }
  }, [userId, fetchSummaries]);

  return {
    summaries,
    fetchSummaries,
    fetchSummary,
    createSummary,
    updateSummary,
    deleteSummary,
    isLoading,
    error,
  };
};
