/**
 * useDashboardRequest - Custom hook for dashboard data operations
 * Handles aggregated dashboard statistics and data
 */

import { useState, useCallback, useEffect } from 'react';
import { requestService, ApiResponse } from '@/services/RequestService';
import { API_ENDPOINTS, CACHE_KEYS, CACHE_TTL } from '@/constants/endpoints';
import { cacheService } from '@/services/CacheService';

export interface DashboardStats {
  totalFlashcards: number;
  totalSummaries: number;
  totalTests: number;
  totalFolders: number;
  studyStreak: number;
  averageTestScore: number;
  totalStudyTime: number;
  recentActivity: string;
}

export interface DashboardData {
  stats: DashboardStats;
  flashcards: any[];
  summaries: any[];
  folders: any[];
  activities: any[];
  favorites: Array<{ _id: string; title: string; type: string }>;
  weeklyActivity: number[];
}

export const useDashboardRequest = (userId?: string) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all dashboard data in parallel
   */
  const fetchDashboard = useCallback(async (useCache: boolean = true): Promise<ApiResponse<DashboardData>> => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Check cache first
    if (useCache) {
      const cached = cacheService.get<DashboardData>(CACHE_KEYS.DASHBOARD, { userId });
      if (cached) {
        setDashboardData(cached);
        return { success: true, data: cached };
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [flashcardsRes, foldersRes, summariesRes, historyRes] = await Promise.allSettled([
        requestService.get<{ flashcards: any[] }>(`${API_ENDPOINTS.FLASHCARD.LIST}?userId=${userId}`),
        requestService.get<{ folders: any[] }>(`${API_ENDPOINTS.FOLDER.LIST}?userId=${userId}`),
        requestService.get<{ summaries: any[] }>(`${API_ENDPOINTS.SUMMARY.LIST}?userId=${userId}`),
        requestService.get<{ activities: any[] }>(`${API_ENDPOINTS.ACTIVITY.LIST}?userId=${userId}&limit=200`)
      ]);

      let flashcards: any[] = [];
      let folders: any[] = [];
      let summaries: any[] = [];
      let activities: any[] = [];

      // Process results
      if (flashcardsRes.status === 'fulfilled' && flashcardsRes.value.success && flashcardsRes.value.data) {
        flashcards = flashcardsRes.value.data.flashcards || [];
      }

      if (foldersRes.status === 'fulfilled' && foldersRes.value.success && foldersRes.value.data) {
        folders = foldersRes.value.data.folders || [];
      }

      if (summariesRes.status === 'fulfilled' && summariesRes.value.success && summariesRes.value.data) {
        summaries = summariesRes.value.data.summaries || [];
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.success && historyRes.value.data) {
        activities = historyRes.value.data.activities || [];
      }

      // Calculate stats
      const studyStreak = calculateStudyStreak(activities);
      const weeklyActivity = calculateWeeklyActivity(activities);

      // Build favorites
      const favorites: Array<{ _id: string; title: string; type: string }> = [];
      folders.forEach((f: any) => {
        if (f.isFavorite) favorites.push({ _id: f._id, title: f.title || 'Folder', type: 'folder' });
      });
      flashcards.forEach((f: any) => {
        if (f.isFavorite) favorites.push({ _id: f._id, title: f.title || 'Flashcards', type: 'flashcard' });
      });
      summaries.forEach((s: any) => {
        if (s.isFavorite) favorites.push({ _id: s._id, title: s.title || 'Summary', type: 'summary' });
      });

      const recentActivity = activities.length > 0
        ? formatActivityMessage(activities[0])
        : "No recent activity";

      const data: DashboardData = {
        stats: {
          totalFlashcards: flashcards.length,
          totalSummaries: summaries.length,
          totalTests: 0,
          totalFolders: folders.length,
          studyStreak,
          averageTestScore: 0,
          totalStudyTime: 0,
          recentActivity
        },
        flashcards,
        summaries,
        folders,
        activities,
        favorites: favorites.slice(0, 8),
        weeklyActivity
      };

      setDashboardData(data);
      // Cache the result
      cacheService.set(CACHE_KEYS.DASHBOARD, data, { userId }, CACHE_TTL.SHORT);

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Refresh dashboard data (skip cache)
   */
  const refreshDashboard = useCallback(async () => {
    cacheService.invalidate(CACHE_KEYS.DASHBOARD, { userId });
    return fetchDashboard(false);
  }, [userId, fetchDashboard]);

  /**
   * Auto-fetch dashboard on mount if userId is provided
   */
  useEffect(() => {
    if (userId) {
      fetchDashboard();
    }
  }, [userId, fetchDashboard]);

  return {
    dashboardData,
    stats: dashboardData?.stats,
    flashcards: dashboardData?.flashcards || [],
    summaries: dashboardData?.summaries || [],
    folders: dashboardData?.folders || [],
    activities: dashboardData?.activities || [],
    favorites: dashboardData?.favorites || [],
    weeklyActivity: dashboardData?.weeklyActivity || [0, 0, 0, 0, 0, 0, 0],
    fetchDashboard,
    refreshDashboard,
    isLoading,
    error,
  };
};

// Helper functions
function calculateStudyStreak(activities: any[]): number {
  try {
    const studyDates = new Set<string>();
    
    activities.forEach(a => {
      const type = (a.type || '')?.toString().toLowerCase();
      if (type.includes('flashcard.study_complete') || 
          type.includes('summary.read') || 
          type.includes('practice_test.submit')) {
        const date = new Date(a.createdAt);
        date.setHours(0, 0, 0, 0);
        studyDates.add(date.toISOString());
      }
    });

    let streak = 0;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const key = checkDate.toISOString();
      
      if (studyDates.has(key)) {
        streak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }

    return streak;
  } catch {
    return 0;
  }
}

function calculateWeeklyActivity(activities: any[]): number[] {
  const weekly = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  activities.forEach(activity => {
    const type = (activity.type || '').toString().toLowerCase();
    if (type.includes('flashcard.study_complete') || 
        type.includes('summary.read') || 
        type.includes('practice_test.submit')) {
      const activityDate = new Date(activity.createdAt);
      activityDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7 && daysDiff >= 0) {
        weekly[6 - daysDiff]++;
      }
    }
  });
  
  return weekly;
}

function formatActivityMessage(activity: any): string {
  const actionMap: Record<string, string> = {
    'flashcard.create': 'Created flashcard set',
    'flashcard.study': 'Studied flashcards',
    'summary.create': 'Generated summary',
    'practice_test.create': 'Created practice test',
    'practice_test.complete': 'Completed practice test',
    'folder.create': 'Created folder'
  };
  
  return actionMap[activity.type] || activity.action || 'Recent activity';
}
