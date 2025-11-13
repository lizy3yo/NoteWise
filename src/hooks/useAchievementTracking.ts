'use client';

import { useEffect } from 'react';
import { useAchievements } from '@/contexts/AchievementContext';
import useAuth from '@/hooks/useAuth';

/**
 * Hook to track achievement unlocks by listening to activity events
 * Call this hook on pages where user actions happen (flashcards, summaries, practice tests)
 */
export function useAchievementTracking() {
  const { showAchievement } = useAchievements();
  const { user } = useAuth();

  useEffect(() => {
    // Listen for custom achievement unlock events
    const handleAchievementUnlock = (event: CustomEvent) => {
      const { achievement } = event.detail;
      if (achievement) {
        showAchievement(achievement);
      }
    };

    window.addEventListener('achievement:unlock' as any, handleAchievementUnlock as EventListener);

    return () => {
      window.removeEventListener('achievement:unlock' as any, handleAchievementUnlock as EventListener);
    };
  }, [showAchievement]);
}

/**
 * Helper function to trigger achievement unlock event
 * Call this when an action completes (e.g., after creating flashcard, completing study session)
 */
export function triggerAchievementCheck(achievementData?: {
  title: string;
  description: string;
  icon: string;
}) {
  // If specific achievement data is provided, dispatch unlock event
  if (achievementData) {
    const event = new CustomEvent('achievement:unlock', {
      detail: { achievement: achievementData }
    });
    window.dispatchEvent(event);
  }
  
  // Always trigger a global check
  const checkEvent = new Event('checkAchievements');
  window.dispatchEvent(checkEvent);
  console.log('🚀 Achievement check triggered!');
}
