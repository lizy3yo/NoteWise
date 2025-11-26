/**
 * useFlashcardGeneration - Custom hook for AI flashcard generation
 * Handles specialized flashcard generation endpoint (not standard CRUD)
 */

import { useState, useCallback } from 'react';
import { requestService, ApiResponse } from '@/services/RequestService';
import { API_ENDPOINTS, CACHE_KEYS } from '@/constants/endpoints';
import { cacheService } from '@/services/CacheService';

export interface GenerateFlashcardData {
  text: string;
  subject?: string;
  difficulty?: string;
  numberOfCards?: number;
  language?: string;
}

export interface GeneratedFlashcard {
  _id: string;
  title: string;
  description?: string;
  cards: Array<{ _id: string; question: string; answer: string }>;
  subject?: string;
  tags?: string[];
  createdAt?: string;
}

export const useFlashcardGeneration = (userId?: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  /**
   * Generate flashcards from text using AI
   */
  const generateFlashcards = useCallback(async (
    data: GenerateFlashcardData
  ): Promise<ApiResponse<GeneratedFlashcard>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await requestService.post<GeneratedFlashcard>(
        `${API_ENDPOINTS.FLASHCARD.GENERATE}?userId=${userId}`,
        data
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (response.success && response.data) {
        const flashcardId = response.data._id;
        
        // Invalidate flashcards cache since we created a new one
        cacheService.invalidate(CACHE_KEYS.FLASHCARDS, { userId });
        // Invalidate dashboard cache
        cacheService.invalidate(CACHE_KEYS.DASHBOARD, { userId });
        
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
        setError(response.error || 'Failed to generate flashcards');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate flashcards';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [userId]);

  return {
    generateFlashcards,
    isGenerating,
    progress,
    error,
  };
};
