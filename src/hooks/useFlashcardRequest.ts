/**
 * useFlashcardRequest - Custom hook for flashcard operations
 * Handles CRUD operations for flashcards with caching
 */

import { useState, useCallback, useEffect } from 'react';
import { requestService, ApiResponse } from '@/services/RequestService';
import { API_ENDPOINTS, CACHE_KEYS, CACHE_TTL } from '@/constants/endpoints';
import { cacheService } from '@/services/CacheService';

export interface Flashcard {
  _id: string;
  title: string;
  description?: string;
  cards?: Array<{ _id: string; question: string; answer: string }>;
  tags?: string[];
  subject?: string;
  image?: string;
  folder?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  lastReviewed?: Date | string;
  repetitionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFlashcardData {
  title: string;
  description?: string;
  subject?: string;
  cards?: Array<{ question: string; answer: string }>;
  tags?: string[];
  folder?: string;
}

export interface UpdateFlashcardData extends Partial<CreateFlashcardData> {
  isFavorite?: boolean;
  isArchived?: boolean;
  lastReviewed?: Date | string;
  repetitionCount?: number;
}

export const useFlashcardRequest = (userId?: string) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all flashcards for user
   */
  const fetchFlashcards = useCallback(async (useCache: boolean = true): Promise<ApiResponse<{ flashcards: Flashcard[] }>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Check cache first
    if (useCache) {
      const cached = cacheService.get<{ flashcards: Flashcard[] }>(CACHE_KEYS.FLASHCARDS, { userId });
      if (cached) {
        setFlashcards(cached.flashcards);
        return { success: true, data: cached };
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.get<{ flashcards: Flashcard[] }>(
        `${API_ENDPOINTS.FLASHCARD.LIST}?userId=${userId}`
      );

      if (response.success && response.data) {
        setFlashcards(response.data.flashcards);
        // Cache the result
        cacheService.set(CACHE_KEYS.FLASHCARDS, response.data, { userId }, CACHE_TTL.MEDIUM);
      } else {
        setError(response.error || 'Failed to fetch flashcards');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flashcards';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Fetch single flashcard by ID
   */
  const fetchFlashcard = useCallback(async (
    flashcardId: string,
    useCache: boolean = true
  ): Promise<ApiResponse<Flashcard>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Check cache first
    if (useCache) {
      const cached = cacheService.get<Flashcard>(CACHE_KEYS.FLASHCARD, { userId, flashcardId });
      if (cached) {
        return { success: true, data: cached };
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.get<Flashcard>(
        `${API_ENDPOINTS.FLASHCARD.GET(flashcardId)}?userId=${userId}`
      );

      if (response.success && response.data) {
        // Cache the result
        cacheService.set(CACHE_KEYS.FLASHCARD, response.data, { userId, flashcardId }, CACHE_TTL.MEDIUM);
      } else {
        setError(response.error || 'Failed to fetch flashcard');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flashcard';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Create new flashcard
   */
  const createFlashcard = useCallback(async (data: CreateFlashcardData): Promise<ApiResponse<Flashcard>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.post<Flashcard>(
        `${API_ENDPOINTS.FLASHCARD.CREATE}?userId=${userId}`,
        data
      );

      if (response.success && response.data) {
        const flashcardId = response.data._id;
        
        // Invalidate flashcards cache
        cacheService.invalidate(CACHE_KEYS.FLASHCARDS, { userId });
        // Refresh flashcards list
        await fetchFlashcards(false);
        
        // Trigger immediate achievement check with slight delay to ensure activity is persisted
        if (typeof window !== 'undefined') {
          // Small delay to ensure database write completes
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('checkAchievements'));
            
            // Also broadcast to other tabs
            try {
              if ('BroadcastChannel' in window) {
                const bc = new BroadcastChannel('notewise.activities');
                bc.postMessage({ type: 'flashcard.created', flashcardId });
                bc.close();
              }
            } catch (e) {
              console.warn('BroadcastChannel not available:', e);
            }
          }, 500);
        }
      } else {
        setError(response.error || 'Failed to create flashcard');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create flashcard';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchFlashcards]);

  /**
   * Update flashcard
   */
  const updateFlashcard = useCallback(async (
    flashcardId: string,
    data: UpdateFlashcardData
  ): Promise<ApiResponse<Flashcard>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.patch<Flashcard>(
        `${API_ENDPOINTS.FLASHCARD.UPDATE(flashcardId)}?userId=${userId}`,
        data
      );

      if (response.success) {
        // Invalidate caches
        cacheService.invalidate(CACHE_KEYS.FLASHCARDS, { userId });
        cacheService.invalidate(CACHE_KEYS.FLASHCARD, { userId, flashcardId });
        // Refresh flashcards list
        await fetchFlashcards(false);
      } else {
        setError(response.error || 'Failed to update flashcard');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update flashcard';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchFlashcards]);

  /**
   * Delete flashcard
   */
  const deleteFlashcard = useCallback(async (flashcardId: string): Promise<ApiResponse<void>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestService.delete<void>(
        `${API_ENDPOINTS.FLASHCARD.DELETE(flashcardId)}?userId=${userId}`
      );

      if (response.success) {
        // Invalidate caches
        cacheService.invalidate(CACHE_KEYS.FLASHCARDS, { userId });
        cacheService.invalidate(CACHE_KEYS.FLASHCARD, { userId, flashcardId });
        // Update local state
        setFlashcards((prev) => prev.filter((f) => f._id !== flashcardId));
      } else {
        setError(response.error || 'Failed to delete flashcard');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete flashcard';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Auto-fetch flashcards on mount if userId is provided
   */
  useEffect(() => {
    if (userId) {
      fetchFlashcards();
    }
  }, [userId, fetchFlashcards]);

  return {
    flashcards,
    fetchFlashcards,
    fetchFlashcard,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    isLoading,
    error,
  };
};
