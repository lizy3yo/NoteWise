import { useMemo } from 'react';

export type Achievement = {
  id: number;
  title: string;
  description: string;
  icon: string;
  earned?: boolean;
  earnedDate?: string | null;
  progress?: number;
  total?: number;
};

interface UseAchievementDataParams {
  flashcards: any[];
  activities: any[];
  studyStreak: number;
  weeklyActivity?: number[];
}

export function useAchievementData({
  flashcards,
  activities,
  studyStreak,
  weeklyActivity = [0, 0, 0, 0, 0, 0, 0]
}: UseAchievementDataParams): Achievement[] {
  
  // Calculate total cards across all flashcard sets
  const totalCards = useMemo(() => {
    try {
      return flashcards.reduce((s, f) => s + (Array.isArray(f.cards) ? f.cards.length : 0), 0);
    } catch {
      return 0;
    }
  }, [flashcards]);

  // Calculate cards reviewed from repetitionCount or activity meta
  const cardsReviewed = useMemo(() => {
    try {
      // Prefer server-side repetitionCount on flashcard docs
      const sum = flashcards.reduce((s, fc) => s + (Number(fc.repetitionCount) || 0), 0);
      if (sum > 0) return sum;

      // Fall back to summing activity meta values
      const actSum = (activities || []).reduce((s, a) => {
        const t = (a.type || a.action || '')?.toString().toLowerCase();
        if (t.includes('flashcard.study_complete')) {
          if (typeof a.meta?.cardsStudied === 'number') return s + a.meta.cardsStudied;
          if (typeof a.meta?.cardCount === 'number') return s + a.meta.cardCount;
          if (Array.isArray(a.meta?.cardIds)) return s + a.meta.cardIds.length;
          if (typeof a.meta?.total === 'number') return s + a.meta.total;
          if (typeof (a as any).progress === 'number') return s + (a as any).progress;
          return s + 1;
        }
        return s;
      }, 0);
      return actSum;
    } catch {
      return 0;
    }
  }, [flashcards, activities]);

  // Count study sessions completed
  const studySessionsCompleted = useMemo(() => {
    try {
      return (activities || []).filter(a => {
        const t = (a.type || a.action || '')?.toString().toLowerCase();
        return t.includes('flashcard.study_complete');
      }).length;
    } catch {
      return 0;
    }
  }, [activities]);

  // Count summary sessions completed
  const summarySessionsCompleted = useMemo(() => {
    try {
      return (activities || []).filter(a => {
        const t = (a.type || a.action || '')?.toString().toLowerCase();
        return t.includes('summary.read') || t.includes('summary.session') || t.includes('summary.completed');
      }).length;
    } catch {
      return 0;
    }
  }, [activities]);

  // Count favorites studied
  const favoritesStudied = useMemo(() => {
    try {
      return (activities || []).filter(a => {
        const t = (a.type || a.action || '')?.toString().toLowerCase();
        return t.includes('flashcard.study_complete') && !!a.meta?.studiedFavorites;
      }).length;
    } catch {
      return 0;
    }
  }, [activities]);

  const totalFlashcards = flashcards.length;
  const weeklyReviews = weeklyActivity.reduce((s, n) => s + n, 0);

  // Define all achievements with consistent logic
  const achievements = useMemo<Achievement[]>(() => {
    const a: Achievement[] = [
      { id: 1, title: 'First Steps', description: 'Created your first flashcard set', icon: '🎯', earned: totalFlashcards >= 1 },
      { id: 2, title: 'Study Streak', description: 'Studied for 7 days in a row', icon: '🔥', earned: studyStreak >= 7, progress: studyStreak, total: 7 },
      { id: 3, title: 'Knowledge Master', description: 'Created 10 flashcard sets', icon: '🏆', progress: totalFlashcards, total: 10, earned: totalFlashcards >= 10 },
      { id: 4, title: 'Deck Finisher', description: 'Complete 5 study sessions', icon: '🏁', progress: studySessionsCompleted, total: 5, earned: studySessionsCompleted >= 5 },
      { id: 6, title: 'Streak Holder', description: 'Keep a study streak for 14 days', icon: '📅', progress: studyStreak, total: 14, earned: studyStreak >= 14 },
      { id: 7, title: 'Flashcard Novice', description: 'Create 3 flashcard sets', icon: '📚', progress: totalFlashcards, total: 3, earned: totalFlashcards >= 3 },
      { id: 8, title: 'Flashcard Collector', description: 'Create 25 flashcard sets', icon: '🧩', progress: totalFlashcards, total: 25, earned: totalFlashcards >= 25 },
      { id: 9, title: 'Summary Starter', description: 'Read your first summary', icon: '✍️', progress: summarySessionsCompleted, total: 1, earned: summarySessionsCompleted >= 1 },
      { id: 10, title: 'Summary Scholar', description: 'Read 5 summaries', icon: '📖', progress: summarySessionsCompleted, total: 5, earned: summarySessionsCompleted >= 5 },
      { id: 11, title: 'Review Apprentice', description: 'Review 50 cards', icon: '🔁', progress: cardsReviewed, total: 50, earned: cardsReviewed >= 50 },
      { id: 12, title: 'Review Pro', description: 'Review 200 cards', icon: '⚡', progress: cardsReviewed, total: 200, earned: cardsReviewed >= 200 },
      { id: 13, title: 'Marathoner', description: 'Study streak of 30 days', icon: '🏃‍♀️', progress: studyStreak, total: 30, earned: studyStreak >= 30 },
      { id: 14, title: 'Active Week', description: 'Study 7 times in the last 7 days', icon: '📆', progress: weeklyReviews, total: 7, earned: weeklyReviews >= 7 },
      { id: 15, title: 'Session Master', description: 'Complete 10 study sessions', icon: '🎓', progress: studySessionsCompleted, total: 10, earned: studySessionsCompleted >= 10 },
      { id: 16, title: 'Card Collector', description: 'Add 100 cards total', icon: '🃏', progress: totalCards, total: 100, earned: totalCards >= 100 },
      { id: 17, title: 'Card Hoarder', description: 'Add 500 cards total', icon: '📦', progress: totalCards, total: 500, earned: totalCards >= 500 },
      { id: 18, title: 'Favorites Fan', description: 'Study favorites 3 times', icon: '⭐', progress: favoritesStudied, total: 3, earned: favoritesStudied >= 3 },
      { id: 19, title: 'Centurion', description: 'Create 100 flashcard sets', icon: '💯', progress: totalFlashcards, total: 100, earned: totalFlashcards >= 100 },
      { id: 20, title: 'Study Champion', description: 'Complete 50 study sessions', icon: '🏅', progress: studySessionsCompleted, total: 50, earned: studySessionsCompleted >= 50 }
    ];
    
    return a;
  }, [totalFlashcards, studyStreak, studySessionsCompleted, summarySessionsCompleted, cardsReviewed, totalCards, weeklyReviews, favoritesStudied]);

  return achievements;
}
