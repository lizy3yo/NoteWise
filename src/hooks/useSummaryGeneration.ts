/**
 * useSummaryGeneration - Custom hook for AI summary generation and resummarization
 * Handles generating summaries from text content using AI
 */

import { useState, useCallback } from 'react';
import { requestService, ApiResponse } from '@/services/RequestService';
import { API_ENDPOINTS, CACHE_KEYS } from '@/constants/endpoints';
import { cacheService } from '@/services/CacheService';

export interface GenerateSummaryData {
  text: string;
  title?: string;
  folderId?: string;
  userId: string;
}

export interface Summary {
  _id: string;
  title: string;
  content: string;
  originalText?: string;
  userId: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

export const useSummaryGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<Summary | null>(null);

  /**
   * Generate a new summary from text
   */
  const generateSummary = useCallback(async (
    data: GenerateSummaryData
  ): Promise<ApiResponse<Summary>> => {
    setIsGenerating(true);
    setError(null);
    setGeneratedSummary(null);

    try {
      const response = await requestService.post<Summary>(
        API_ENDPOINTS.SUMMARY.GENERATE,
        data
      );

      if (response.success && response.data) {
        setGeneratedSummary(response.data);
        // Invalidate summaries cache
        cacheService.invalidatePattern(CACHE_KEYS.SUMMARIES);
        cacheService.invalidatePattern(CACHE_KEYS.DASHBOARD);
        
        // Log activity for achievement tracking
        try {
          await fetch('/api/student_page/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              userId: data.userId,
              type: 'summary.created',
              action: 'summary.generate',
              meta: {
                summaryId: response.data._id,
                title: response.data.title
              }
            })
          });
        } catch (err) {
          console.warn('Failed to log summary creation activity:', err);
        }
        
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
        setError(response.error || 'Failed to generate summary');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Regenerate an existing summary
   */
  const regenerateSummary = useCallback(async (
    summaryId: string,
    userId: string
  ): Promise<ApiResponse<Summary>> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await requestService.post<Summary>(
        `${API_ENDPOINTS.SUMMARY.GENERATE}?summaryId=${summaryId}&userId=${userId}`,
        {}
      );

      if (response.success && response.data) {
        setGeneratedSummary(response.data);
        // Invalidate caches
        cacheService.invalidate(CACHE_KEYS.SUMMARY, { id: summaryId });
        cacheService.invalidatePattern(CACHE_KEYS.SUMMARIES);
        cacheService.invalidatePattern(CACHE_KEYS.DASHBOARD);
      } else {
        setError(response.error || 'Failed to regenerate summary');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate summary';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Clear the generated summary state
   */
  const clearSummary = useCallback(() => {
    setGeneratedSummary(null);
    setError(null);
  }, []);

  return {
    generateSummary,
    regenerateSummary,
    clearSummary,
    isGenerating,
    error,
    generatedSummary,
  };
};
