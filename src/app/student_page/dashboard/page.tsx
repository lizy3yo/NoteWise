"use client";

import "./styles.css";
import { useState, useEffect, useMemo } from "react";
import { 
  FileText, BookOpen, ClipboardCheck, Trash2, Edit, Plus,
  Clock, Calendar, Filter, TrendingUp, Award, RefreshCw,
  Folder, Star, FolderEdit, User, Lock
} from 'lucide-react';
import useAuth from "@/hooks/useAuth";
import Link from "next/link";
import LoadingTemplate2 from "@/components/ui/loading_template_2/loading2";
import { useSession } from "next-auth/react";
import { useAchievements } from '@/contexts/AchievementContext';

interface DashboardStats {
  totalFlashcards: number;
  totalSummaries: number;
  totalTests: number;
  totalFolders: number;
  studyStreak: number;
  averageTestScore: number;
  totalStudyTime: number;
  recentActivity: string;
}

interface Activity {
  _id: string;
  type: string;
  action: string;
  meta?: any;
  createdAt: string;
}

interface TestSubmission {
  _id: string;
  practiceTestId: string;
  score: number;
  completedAt: string;
  timeSpent: number;
  // optional metadata populated when joining with practice test data
  practiceTestTitle?: string;
  practiceTest?: {
    _id?: string;
    title?: string;
  };
}

interface StudyProgress {
  flashcard: string;
  lastSessionStartedAt: string;
  learn?: {
    masteredIds: string[];
    incorrectIds: string[];
  };
}

export default function UserDashboard() {
  const { isLoading: authLoading, user } = useAuth();
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalFlashcards: 0,
    totalSummaries: 0,
    totalTests: 0,
    totalFolders: 0,
    studyStreak: 0,
    averageTestScore: 0,
    totalStudyTime: 0,
    recentActivity: "No recent activity"
  });
  // Start true to avoid a brief flash of the dashboard content before the
  // client-side data load begins (prevents the flicker you reported).
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Array<{_id: string; title: string; type: string}>>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  // Keep full fetched data so we can compute achievements accurately (not just the 4 recent items)
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allFlashcards, setAllFlashcards] = useState<any[]>([]);
  const [recentTests, setRecentTests] = useState<TestSubmission[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const { checkForNewAchievements } = useAchievements();

  // Resolve first name from several sources
  const fromAuth =
    (user?.firstName?.trim?.() ? user.firstName!.trim() : null) ||
    (user?.name?.trim?.() ? user.name!.trim().split(" ")[0] : null) ||
    (user?.username?.trim?.() ? user.username!.trim() : null);

  const sessionName =
    typeof session?.user?.name === "string"
      ? session.user.name
      : null;
  const fromSession =
    sessionName && sessionName.trim()
      ? sessionName.trim().split(" ")[0]
      : null;

  let fromLocal: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        fromLocal =
          (parsed?.firstName && String(parsed.firstName).trim()) ||
          (parsed?.name &&
            String(parsed.name).trim().split(" ")[0]) ||
          (parsed?.username && String(parsed.username).trim()) ||
          null;
      }
    } catch {
      // ignore
    }
  }

  const firstName = fromAuth || fromSession || fromLocal || "Student";

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      setLoadingStats(true);
      setStatsError(null);

      try {
        if (user && user._id) {
          const userId = encodeURIComponent(user._id as string);

          // Fetch all data in parallel
          const [flashcardsRes, foldersRes, testsRes, summariesRes, historyRes, submissionsRes] = await Promise.allSettled([
            fetch(`/api/student_page/flashcard?userId=${userId}`, { credentials: 'include' }),
            fetch(`/api/student_page/folder?userId=${userId}`, { credentials: 'include' }),
            fetch(`/api/student_page/practice-test?userId=${userId}`, { credentials: 'include' }),
            fetch(`/api/student_page/summary?userId=${userId}`, { credentials: 'include' }),
            fetch(`/api/student_page/history?userId=${userId}&limit=200`, { credentials: 'include' }),
            fetch(`/api/student_page/practice-test/submit?userId=${userId}`, { credentials: 'include' })
          ]);

          let fetchedFlashcards: any[] = [];
          let fetchedFolders: any[] = [];
          let fetchedTests: any[] = [];
          let fetchedSummaries: any[] = [];
          let fetchedActivities: Activity[] = [];
          let fetchedSubmissions: TestSubmission[] = [];

          // Process flashcards
          if (flashcardsRes.status === 'fulfilled' && flashcardsRes.value.ok) {
            const data = await flashcardsRes.value.json().catch(() => null);
            fetchedFlashcards = Array.isArray(data?.flashcards) ? data.flashcards : [];
          }

          // Process folders
          if (foldersRes.status === 'fulfilled' && foldersRes.value.ok) {
            const data = await foldersRes.value.json().catch(() => null);
            fetchedFolders = Array.isArray(data?.folders) ? data.folders : [];
          }

          // Process tests
          if (testsRes.status === 'fulfilled' && testsRes.value.ok) {
            const data = await testsRes.value.json().catch(() => null);
            fetchedTests = Array.isArray(data?.practiceTests) ? data.practiceTests : [];
          }

          // Process summaries
          if (summariesRes.status === 'fulfilled' && summariesRes.value.ok) {
            const data = await summariesRes.value.json().catch(() => null);
            fetchedSummaries = Array.isArray(data?.summaries) ? data.summaries : [];
          }

          // Process activity history
          if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
            const data = await historyRes.value.json().catch(() => null);
            fetchedActivities = Array.isArray(data?.activities) ? data.activities : [];
          }

          // Process test submissions
          if (submissionsRes.status === 'fulfilled' && submissionsRes.value.ok) {
            const data = await submissionsRes.value.json().catch(() => null);
            fetchedSubmissions = Array.isArray(data?.submissions) ? data.submissions : [];
          }

          // Calculate stats
          const totalFlashcards = fetchedFlashcards.length;
          const totalSummaries = fetchedSummaries.length;
          const totalTests = fetchedTests.length;
          const totalFolders = fetchedFolders.length;

          // Calculate average test score
          const averageTestScore = fetchedSubmissions.length > 0
            ? Math.round(fetchedSubmissions.reduce((sum, sub) => sum + sub.score, 0) / fetchedSubmissions.length)
            : 0;

          // Calculate total study time (from test submissions)
          const totalStudyTime = Math.round(
            fetchedSubmissions.reduce((sum, sub) => sum + (sub.timeSpent || 0), 0) / 60
          ); // Convert to minutes

          // Calculate study streak (days with activity in the last 7 days)
          const studyStreak = calculateStudyStreak(fetchedActivities);
          console.log('📊 Dashboard Study Streak:', studyStreak, 'days (from', fetchedActivities.length, 'activities)');

          // Calculate weekly activity
          const weekly = calculateWeeklyActivity(fetchedActivities);

          // Build favorites
          const favs: Array<{_id: string; title: string; type: string}> = [];
          fetchedFolders.forEach((f: any) => {
            if (f.isFavorite) favs.push({ _id: f._id, title: f.title || 'Folder', type: 'folder' });
          });
          fetchedFlashcards.forEach((f: any) => {
            if (f.isFavorite) favs.push({ _id: f._id, title: f.title || 'Flashcards', type: 'flashcard' });
          });
          fetchedTests.forEach((t: any) => {
            if (t.isFavorite) favs.push({ _id: t._id, title: t.title || 'Practice Test', type: 'practice_test' });
          });
          fetchedSummaries.forEach((s: any) => {
            if (s.isFavorite) favs.push({ _id: s._id, title: s.title || 'Summary', type: 'summary' });
          });

          // Get recent activity message
          const recentActivity = fetchedActivities.length > 0
            ? formatActivityMessage(fetchedActivities[0])
            : "No recent activity";

          if (mounted) {
            setStats({
              totalFlashcards,
              totalSummaries,
              totalTests,
              totalFolders,
              studyStreak,
              averageTestScore,
              totalStudyTime,
              recentActivity
            });
            setFavorites(favs.slice(0, 8));
            // Keep full activities in state for achievement calculations, but show the first 4 in the recent list
            setAllActivities(fetchedActivities);
            setRecentActivities(fetchedActivities.slice(0, 4));
            // Keep full flashcards for achievement calculations
            setAllFlashcards(fetchedFlashcards);
            // join submissions with fetched practice tests so we can show full titles
            const submissionsWithTitles = (fetchedSubmissions || []).map((s: any) => {
              const match = fetchedTests.find((t: any) => String(t._id) === String(s.practiceTestId) || String(t._id) === String(s.practiceTest?._id));
              return {
                ...s,
                practiceTestTitle: s.practiceTestTitle || match?.title || undefined,
                practiceTest: match ? { _id: match._id, title: match.title } : s.practiceTest || undefined
              };
            });
            setRecentTests(submissionsWithTitles.slice(0, 3));
            setWeeklyActivity(weekly);
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch dashboard stats:', err);
        setStatsError(err?.message || 'Failed to load dashboard data');
      } finally {
        setLoadingStats(false);
      }
    }

    loadStats();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Helper functions
  function calculateStudyStreak(activities: Activity[]): number {
    try {
      // Collect all study-related activity dates
      const studyDates = new Set<string>();
      
      activities.forEach(a => {
        const type = (a.type || '')?.toString().toLowerCase();
        // Count flashcard sessions, summary reads, and practice test submissions
        if (type.includes('flashcard.study_complete') || 
            type.includes('summary.read') || 
            type.includes('practice_test.submit')) {
          const date = new Date(a.createdAt);
          // Normalize to start of day (midnight) for comparison
          date.setHours(0, 0, 0, 0);
          studyDates.add(date.toISOString());
        }
      });

      // Calculate consecutive days from today backwards
      let streak = 0;
      const now = new Date();
      // Set to start of current day to check if user studied today
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      // Check consecutive days going backwards
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const key = checkDate.toISOString();
        
        if (studyDates.has(key)) {
          streak++;
        } else {
          // If this is day 0 (today) and no activity yet, continue checking yesterday
          // This prevents breaking streak if user hasn't studied today yet but studied yesterday
          if (i === 0) continue;
          break;
        }
      }

      return streak;
    } catch {
      return 0;
    }
  }

  function calculateWeeklyActivity(activities: Activity[]): number[] {
    const weekly = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    activities.forEach(activity => {
      const activityDate = new Date(activity.createdAt);
      activityDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        weekly[6 - daysDiff]++;
      }
    });
    
    return weekly;
  }

  function formatActivityMessage(activity: Activity): string {
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

  // Normalize/respect different activity shapes -- some events (login/logout, theme changes)
  // may come back with different field names or only an action. Resolve to a stable
  // type string used for icons, colors and filtering (borrowed from History page logic).
  function resolveActivityType(act: Activity | null | undefined) {
    if (!act) return '';
    // If server provided a type, trust it first
    if ((act as any).type) return (act as any).type;

    const action = ((act as any).action || '').toString().toLowerCase();

    // Common special cases
    if (action.includes('login')) return 'auth.login';
    if (action.includes('logout')) return 'auth.logout';

    // Theme changes may be recorded as action='theme', 'theme_change', 'dark', 'light', or in meta
    if (action.includes('theme') || action.includes('dark') || action.includes('light') || ((act as any).meta && ((act as any).meta.mode || (act as any).meta.theme))) {
      return 'appearance.theme_change';
    }

    // If meta contains a type, use it
    if ((act as any).meta && typeof (act as any).meta.type === 'string') return (act as any).meta.type;

    // fallback: try to infer category from action words
    if (action.includes('flashcard')) return `flashcard.${action.replace(/\s+/g, '_')}`;
    if (action.includes('summary')) return `summary.${action.replace(/\s+/g, '_')}`;
    if (action.includes('practice') || action.includes('test')) return `practice_test.${action.replace(/\s+/g, '_')}`;

    // Last resort: return the raw action or empty
    return action || '';
  }

  const formatActivityLabel = (type: string | undefined, action: string | undefined) => {
    const t = (type || '').toString();
    const parts = t.split('.');
    const category = (parts[0] || '').replace('_', ' ');
    const actionPart = action || parts[1] ? (parts[1] || '').replace(/_/g, ' ') : '';
    const titleCategory = category ? `${category.charAt(0).toUpperCase() + category.slice(1)}` : '';
    return `${titleCategory} ${actionPart}`.trim();
  };

  const activityIcons: Record<string, any> = {
    'flashcard.create': Plus,
    'flashcard.update': Edit,
    'flashcard.delete': Trash2,
    'flashcard.generate': BookOpen,
    'flashcard.study_complete': ClipboardCheck,
    'summary.generate': FileText,
    'summary.update': Edit,
    'summary.delete': Trash2,
    'practice_test.submit': ClipboardCheck,
    'practice_test.generate': Plus,
    'folder.create': Folder,
    'folder.rename': FolderEdit,
    'folder.delete': Trash2,
    'folder.favorite': Star,
    'profile.update': User,
    'profile.password_change': Lock,
  };

  const activityColors: Record<string, string> = {
    'flashcard.create': 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
    'flashcard.update': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    'flashcard.delete': 'text-red-600 bg-red-50 dark:bg-red-900/20',
    'flashcard.generate': 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    'flashcard.study_complete': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    'summary.generate': 'text-green-600 bg-green-50 dark:bg-green-900/20',
    'summary.update': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    'summary.delete': 'text-red-600 bg-red-50 dark:bg-red-900/20',
    'practice_test.submit': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    'practice_test.generate': 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
    'folder.create': 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
    'folder.rename': 'text-sky-600 bg-sky-50 dark:bg-sky-900/20',
    'folder.delete': 'text-red-600 bg-red-50 dark:bg-red-900/20',
    'folder.favorite': 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    'profile.update': 'text-violet-600 bg-violet-50 dark:bg-violet-900/20',
    'profile.password_change': 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
  };

  function getActivityIcon(type: string) {
    // Try exact match, then lowercase fallback, else default to Clock icon
    const Icon = activityIcons[type] || activityIcons[type.toLowerCase?.()] || Clock;
    return <Icon className="w-4 h-4" />;
  }

  function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  // Map activity types to color classes (used for icon badge backgrounds)
  function getActivityColorClass(type: string) {
    const t = (type || '').toString().toLowerCase();
    if (t.includes('flashcard')) return 'text-teal-600 bg-teal-50 dark:bg-teal-900/20';
    if (t.includes('summary')) return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
    if (t.includes('practice') || t.includes('test')) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
    if (t.includes('folder')) return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20';
    if (t.includes('auth') || t.includes('profile')) return 'text-violet-600 bg-violet-50 dark:bg-violet-900/20';
    return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20';
  }

  // Achievements derived from real fetched data (allActivities, allFlashcards, recentTests, stats)
  type AchievementLocal = {
    id: number;
    title: string;
    description: string;
    icon: string;
    earned?: boolean;
    earnedDate?: string | null;
    progress?: number;
    total?: number;
  };

  // helper to find latest activity date matching a predicate
  function findLatestActivityDate(predicate: (a: Activity) => boolean): string | null {
    try {
      const found = allActivities.filter(predicate).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return found.length > 0 ? found[0].createdAt : null;
    } catch {
      return null;
    }
  }

  const totalCards = useMemo(() => {
    try {
      return allFlashcards.reduce((s, f) => s + (Array.isArray(f.cards) ? f.cards.length : 0), 0);
    } catch {
      return 0;
    }
  }, [allFlashcards]);

  const cardsReviewed = useMemo(() => {
    try {
      // Prefer server-side repetitionCount on flashcard docs; fall back to summing activity meta values similar to Achievements page
      const sum = allFlashcards.reduce((s, fc) => s + (Number(fc.repetitionCount) || 0), 0);
      if (sum > 0) return sum;

      const actSum = (allActivities || []).reduce((s, a) => {
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
  }, [allFlashcards, allActivities]);

  const studySessionsCompleted = useMemo(() => {
    try {
      return (allActivities || []).filter(a => {
        const t = (a.type || a.action || '')?.toString().toLowerCase();
        return t.includes('flashcard.study_complete');
      }).length;
    } catch {
      return 0;
    }
  }, [allActivities]);

  const summarySessionsCompleted = useMemo(() => {
    try {
      return (allActivities || []).filter(a => {
        const t = (a.type || a.action || '')?.toString().toLowerCase();
        return t.includes('summary.read') || t.includes('summary.session') || t.includes('summary.completed');
      }).length;
    } catch {
      return 0;
    }
  }, [allActivities]);

  const favoritesStudied = useMemo(() => {
    try {
      return (allActivities || []).filter(a => {
        const t = (a.type || a.action || '')?.toString().toLowerCase();
        return t.includes('flashcard.study_complete') && !!a.meta?.studiedFavorites;
      }).length;
    } catch {
      return 0;
    }
  }, [allActivities]);

  // Practice tests completed: count of practice_test.submit activities
  const practiceTestsCompleted = useMemo(() => {
    try {
      return (allActivities || []).filter(a => {
        const t = (a.type || a.action || '')?.toString().toLowerCase();
        return t.includes('practice_test.submit') || t.includes('practice_test.completed') || t.includes('test.submit');
      }).length;
    } catch {
      return 0;
    }
  }, [allActivities]);

  const achievements = useMemo<AchievementLocal[]>(() => {
    const finishedSets = allFlashcards.filter((f: any) => f.lastReviewed).length;
    const totalCards = allFlashcards.reduce((sum: number, f: any) => sum + (Array.isArray(f.cards) ? f.cards.length : 0), 0);
    const studyCompletions = studySessionsCompleted;

    const a: AchievementLocal[] = [
      { id: 1, title: 'First Steps', description: 'Created your first flashcard set', icon: '🎯', earned: stats.totalFlashcards >= 1, earnedDate: stats.totalFlashcards >= 1 ? findLatestActivityDate(x => (x.type || '').includes('flashcard') && ((x.action || '').toLowerCase().includes('create') || (x.type || '').includes('create'))) : null },
      { id: 2, title: 'Study Streak', description: 'Studied for 7 days in a row', icon: '🔥', earned: stats.studyStreak >= 7, progress: stats.studyStreak, total: 7, earnedDate: stats.studyStreak >= 7 ? null : null },
      { id: 3, title: 'Knowledge Master', description: 'Created 10 flashcard sets', icon: '🏆', progress: stats.totalFlashcards, total: 10, earned: stats.totalFlashcards >= 10, earnedDate: stats.totalFlashcards >= 10 ? findLatestActivityDate(x => (x.type || '').includes('flashcard') && ((x.action || '').toLowerCase().includes('create') || (x.type || '').includes('create'))) : null },
      { id: 4, title: 'Perfect Score', description: 'Got 100% on a practice test', icon: '⭐', progress: practiceTestsCompleted, total: 1, earned: practiceTestsCompleted >= 1, earnedDate: recentTests.filter(t => t.score === 100).sort((a,b)=> new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]?.completedAt || null },
      { id: 5, title: 'Deck Finisher', description: 'Complete 5 study sessions', icon: '🏁', progress: studyCompletions, total: 5, earned: studyCompletions >= 5, earnedDate: studyCompletions >= 5 ? findLatestActivityDate(x => (x.type || '').includes('flashcard.study_complete')) : null },
      { id: 6, title: 'Streak Holder', description: 'Keep a study streak for 14 days', icon: '📅', progress: stats.studyStreak, total: 14, earned: stats.studyStreak >= 14 },
      { id: 7, title: 'Flashcard Novice', description: 'Create 3 flashcard sets', icon: '📚', progress: stats.totalFlashcards, total: 3, earned: stats.totalFlashcards >= 3 },
      { id: 8, title: 'Flashcard Collector', description: 'Create 25 flashcard sets', icon: '🧩', progress: stats.totalFlashcards, total: 25, earned: stats.totalFlashcards >= 25 },
      { id: 9, title: 'Summary Starter', description: 'Read your first summary', icon: '✍️', progress: summarySessionsCompleted, total: 1, earned: summarySessionsCompleted >= 1, earnedDate: summarySessionsCompleted >= 1 ? findLatestActivityDate(x => (x.type || '').includes('summary.read')) : null },
      { id: 10, title: 'Summary Scholar', description: 'Read 5 summaries', icon: '📖', progress: summarySessionsCompleted, total: 5, earned: summarySessionsCompleted >= 5 },
      { id: 11, title: 'Review Apprentice', description: 'Review 50 cards', icon: '🔁', progress: cardsReviewed, total: 50, earned: cardsReviewed >= 50, earnedDate: cardsReviewed >= 50 ? findLatestActivityDate(x => (x.type || '').includes('flashcard.study_complete')) : null },
      { id: 12, title: 'Review Pro', description: 'Review 200 cards', icon: '⚡', progress: cardsReviewed, total: 200, earned: cardsReviewed >= 200 },
      { id: 13, title: 'Marathoner', description: 'Study streak of 30 days', icon: '🏃‍♀️', progress: stats.studyStreak, total: 30, earned: stats.studyStreak >= 30 },
      { id: 14, title: 'Active Week', description: 'Study 7 times in the last 7 days', icon: '📆', progress: studyCompletions, total: 7, earned: studyCompletions >= 7 },
      { id: 15, title: 'Session Master', description: 'Complete 10 study sessions', icon: '🎓', progress: studyCompletions, total: 10, earned: studyCompletions >= 10 },
      { id: 16, title: 'Card Collector', description: 'Add 100 cards total', icon: '🃏', progress: totalCards, total: 100, earned: totalCards >= 100, earnedDate: totalCards >= 100 ? findLatestActivityDate(x => (x.type || '').includes('flashcard') && Boolean(x.createdAt)) : null },
      { id: 17, title: 'Card Hoarder', description: 'Add 500 cards total', icon: '📦', progress: totalCards, total: 500, earned: totalCards >= 500 },
      { id: 18, title: 'Favorites Fan', description: 'Study favorites 3 times', icon: '⭐', progress: favoritesStudied, total: 3, earned: favoritesStudied >= 3 },
      { id: 19, title: 'Centurion', description: 'Create 100 flashcard sets', icon: '💯', progress: stats.totalFlashcards, total: 100, earned: stats.totalFlashcards >= 100 },
      { id: 20, title: 'Study Champion', description: 'Complete 50 study sessions', icon: '🏅', progress: studyCompletions, total: 50, earned: studyCompletions >= 50 }
    ];
    return a;
  }, [stats, allActivities, allFlashcards, recentTests, practiceTestsCompleted, cardsReviewed, studySessionsCompleted, summarySessionsCompleted, favoritesStudied]);

  const unlockedAchievements = useMemo(() => {
    const unlocked = achievements.filter(a => a.earned).map(a => ({ ...a }));
    
    // Assign earnedDate based on the LATEST activity that would have unlocked each achievement
    // This shows the MOST RECENTLY unlocked achievements, not the oldest ones
    unlocked.forEach(u => {
      if (u.earnedDate) return; // Skip if already has earnedDate from achievements array
      
      let relevantDate: string | null = null;
      const title = u.title;
      
      // For ALL achievements, use the MOST RECENT (LATEST) activity that crossed the threshold
      // Sort by DESCENDING date (newest first) and take the activity at the threshold index from the END
      
      if (title === 'First Steps') {
        const createActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard') && ((a.action || '').toLowerCase().includes('create') || (a.type || '').toLowerCase().includes('create')));
        if (createActivities.length >= 1) {
          const sorted = createActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 1].createdAt; // LAST created (1st flashcard)
        }
      } else if (title === 'Flashcard Novice') {
        const createActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard') && ((a.action || '').toLowerCase().includes('create') || (a.type || '').toLowerCase().includes('create')));
        if (createActivities.length >= 3) {
          const sorted = createActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 3].createdAt; // 3rd from end (3rd flashcard created)
        }
      } else if (title === 'Knowledge Master') {
        const createActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard') && ((a.action || '').toLowerCase().includes('create') || (a.type || '').toLowerCase().includes('create')));
        if (createActivities.length >= 10) {
          const sorted = createActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 10].createdAt; // 10th from end
        }
      } else if (title === 'Flashcard Collector') {
        const createActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard') && ((a.action || '').toLowerCase().includes('create') || (a.type || '').toLowerCase().includes('create')));
        if (createActivities.length >= 25) {
          const sorted = createActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 25].createdAt;
        }
      } else if (title === 'Centurion') {
        const createActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard') && ((a.action || '').toLowerCase().includes('create') || (a.type || '').toLowerCase().includes('create')));
        if (createActivities.length >= 100) {
          const sorted = createActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 100].createdAt;
        }
      } else if (title === 'Summary Starter') {
        const summaryActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('summary.read'));
        if (summaryActivities.length >= 1) {
          const sorted = summaryActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 1].createdAt;
        }
      } else if (title === 'Summary Scholar') {
        const summaryActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('summary.read'));
        if (summaryActivities.length >= 5) {
          const sorted = summaryActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 5].createdAt;
        }
      } else if (title === 'Deck Finisher') {
        const sessionActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard.study_complete'));
        if (sessionActivities.length >= 5) {
          const sorted = sessionActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 5].createdAt; // 5th session from end (when unlocked)
        }
      } else if (title === 'Session Master') {
        const sessionActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard.study_complete'));
        if (sessionActivities.length >= 10) {
          const sorted = sessionActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 10].createdAt; // 10th session from end
        }
      } else if (title === 'Study Champion') {
        const sessionActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard.study_complete'));
        if (sessionActivities.length >= 50) {
          const sorted = sessionActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 50].createdAt; // 50th session from end
        }
      } else if (title === 'Review Apprentice' || title === 'Review Pro') {
        // These track cumulative reviews, use most recent study session
        const sessionActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard.study_complete'));
        if (sessionActivities.length > 0) {
          const sorted = sessionActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[0].createdAt; // Most recent session
        }
      } else if (title === 'Favorites Fan') {
        const favActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('folder.favorite'));
        if (favActivities.length >= 3) {
          const sorted = favActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 3].createdAt;
        }
      } else if (title === 'Perfect Score') {
        const testActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('practice_test.submit'));
        if (testActivities.length >= 1) {
          const sorted = testActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 1].createdAt;
        }
      } else if (title === 'Active Week') {
        const sessionActivities = allActivities.filter(a => (a.type || '').toLowerCase().includes('flashcard.study_complete'));
        if (sessionActivities.length >= 7) {
          const sorted = sessionActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          relevantDate = sorted[sorted.length - 7].createdAt;
        }
      }
      
      // Fallback to most recent activity if no specific date found
      u.earnedDate = relevantDate || (allActivities.length > 0 ? allActivities[0].createdAt : null);
    });
    
    // Sort by earnedDate descending (most recent first)
    const sorted = unlocked.sort((a, b) => {
      const ta = a.earnedDate ? new Date(a.earnedDate).getTime() : 0;
      const tb = b.earnedDate ? new Date(b.earnedDate).getTime() : 0;
      return tb - ta;
    });
    
    // Log ALL unlocked achievements to debug
    console.log('🏆 ALL Unlocked Achievements (sorted by date):', sorted.map((a, idx) => ({
      rank: idx + 1,
      title: a.title,
      earnedDate: a.earnedDate ? new Date(a.earnedDate).toLocaleString() : 'unknown',
      timestamp: a.earnedDate ? new Date(a.earnedDate).getTime() : 0,
      progress: a.progress,
      total: a.total
    })));
    
    const result = sorted.slice(0, 4);
    console.log('🏆 Top 4 Recent Unlocked Achievements:', result.map(a => a.title));
    
    return result;
  }, [achievements, allActivities]);

  // Check for newly unlocked achievements using the global context
  useEffect(() => {
    checkForNewAchievements(achievements);
  }, [achievements, checkForNewAchievements]);

  // Show library-style loading UI while auth or dashboard stats are loading.
  if (authLoading || loadingStats) {
    return (
      <LoadingTemplate2
        title="Loading dashboard..."
        // use the library/teal accent color so the spinner matches the Library page
        accentColor="#06B6A4"
        compact={!!loadingStats}
      />
    );
  }

  return (
    <div className="dashboard-root bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <div className="dashboard-container">
        {/* Header with user greeting */}
        <header className="greet-block" aria-label="Welcome">
          <h1 className="greet-title text-gray-900 dark:text-white">{`Welcome Back, ${firstName}!`}</h1>
          <p className="greet-sub text-gray-600 dark:text-gray-400">
            {stats.studyStreak > 0 
              ? `You're on a ${stats.studyStreak}-day study streak! Keep it up!` 
              : "Ready to start your learning journey?"}
          </p>
        </header>

        {/* Summary Statistics */}
        <div className="dashboard-grid">
          <div className="col-span-12">
            <div className="summary-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Flashcards Card */}
              <div className="metric-card panel p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Flashcard Sets</p>
                    <p className="metric-value text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalFlashcards}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summaries Card */}
              <div className="metric-card panel p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Summaries</p>
                    <p className="metric-value text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalSummaries}
                    </p>
                  </div>
                </div>
              </div>

              {/* Practice Tests Card */}
              <div className="metric-card panel p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Practice Tests</p>
                    <p className="metric-value text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalTests}
                    </p>
                  </div>
                </div>
              </div>

              {/* Average Score Card */}
              <div className="metric-card panel p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Avg Test Score</p>
                    <p className="metric-value text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.averageTestScore}<span className="text-base font-medium text-gray-500 dark:text-gray-400">%</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity and Stats Section */}
        <div className="dashboard-grid">
          <div className="col-span-8">
            <div className="panel panel-padded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title text-gray-900 dark:text-white">Recent Activity</h2>
                <Link href="/student_page/history" className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
                  View All
                </Link>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => {
                    const resolvedType = resolveActivityType(activity);
                    const title = formatActivityLabel(resolvedType, activity.action);
                    const colorClass = activityColors[resolvedType] || getActivityColorClass(resolvedType);
                    return (
                      <div key={activity._id} className="flex items-start gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          {getActivityIcon(resolvedType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {title || formatActivityMessage(activity)}
                          </p>
                          {/* show an optional subtitle if meta contains a title or details */}
                          {activity.meta?.title ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{activity.meta.title}</p>
                          ) : activity.meta?.summary ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{activity.meta.summary}</p>
                          ) : null}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{getTimeAgo(activity.createdAt)}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs mt-1">Start studying to see your activity here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Unlocked Achievements (replaces Weekly Activity) */}
            <div className="panel panel-padded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="section-title mb-4 text-gray-900 dark:text-white">Recent Unlocked Achievements</h2>
              {unlockedAchievements.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unlockedAchievements.map(a => (
                    <div key={a.id} className="p-4 bg-gray-50 dark:bg-gray-700 border border-teal-100 dark:border-teal-800 rounded-lg flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0" aria-hidden>
                        {a.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.description}</p>
                        <div className="mt-2 text-xs text-teal-600 dark:text-teal-400 font-medium">
                          ✓ Earned{a.earnedDate ? ` • ${new Date(a.earnedDate).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No achievements unlocked yet</p>
                  <p className="text-xs mt-1">Complete activities to earn achievements</p>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4">
            {/* Quick Stats */}
            <div className="panel panel-padded-lg mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="section-title mb-4 text-gray-900 dark:text-white">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Study Streak</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.studyStreak} {stats.studyStreak === 1 ? 'day' : 'days'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total items</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalFlashcards + stats.totalSummaries + stats.totalTests}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.totalFlashcards} flashcards • {stats.totalSummaries} summaries • {stats.totalTests} tests</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Folders</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalFolders}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Test Scores */}
            <div className="panel panel-padded-lg mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="section-title mb-4 text-gray-900 dark:text-white">Recent Test Scores</h2>
              <div className="space-y-3">
                {recentTests.length > 0 ? (
                  recentTests.map((test) => {
                    const title = (test.practiceTestTitle && String(test.practiceTestTitle).trim())
                      || (test.practiceTest && typeof test.practiceTest.title === 'string' && test.practiceTest.title.trim())
                      || `Test #${String(test.practiceTestId || test._id || '').slice(-6)}`;
                    const testId = test.practiceTest?._id || test.practiceTestId || null;
                    const TitleNode = (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
                    );

                    return (
                      <div key={test._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1 min-w-0">
                          {testId ? (
                            <Link href={`/student_page/practice_tests/${testId}`} className="no-underline hover:underline">{TitleNode}</Link>
                          ) : TitleNode}
                          <p className="text-xs text-gray-500 dark:text-gray-400">{getTimeAgo(test.completedAt)}</p>
                        </div>
                        <div className={`text-lg font-bold ${
                          test.score >= 90 ? 'text-green-600 dark:text-green-400' :
                          test.score >= 70 ? 'text-blue-600 dark:text-blue-400' :
                          test.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {test.score}%
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No tests completed yet</p>
                    <Link href="/student_page/practice_tests" className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-2 inline-block">
                      Take your first test
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Favorites Shortcuts Panel */}
            <div className="panel panel-padded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="section-title mb-3 text-gray-900 dark:text-white">Favorites</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {favorites.length > 0 ? (
                  favorites.map(f => (
                    <Link key={f._id} href={`/student_page/library?tab=favorites`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors no-underline">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                        {f.type === 'folder' && (
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                          </svg>
                        )}
                        {f.type === 'flashcard' && (
                          <svg className="w-4 h-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="6" width="14" height="10" rx="2" strokeWidth="1.5" />
                            <rect x="7" y="9" width="14" height="10" rx="2" strokeWidth="1.5" />
                          </svg>
                        )}
                        {f.type === 'practice_test' && (
                          <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z" strokeWidth="1.5" />
                            <path d="M9 8h6M9 12h6M9 16h4" strokeWidth="1.5" />
                          </svg>
                        )}
                        {f.type === 'summary' && (
                          <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M7 3h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V3z" strokeWidth="1.5" />
                            <path d="M7 13h10M7 9h6" strokeWidth="1.5" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{f.type.replace('_', ' ')}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No favorites yet</p>
                    <p className="text-xs mt-1">Mark items in your library</p>
                  </div>
                )}
              </div>
              {favorites.length > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  <Link href="/student_page/library?tab=favorites" className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
                    View all favorites →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}