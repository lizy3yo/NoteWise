"use client";

import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { useAlert } from '@/hooks/useAlert';
import { useAchievements } from '@/contexts/AchievementContext';
import { useAchievementData, type Achievement } from '@/hooks/useAchievementData';

export default function AchievementsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [summaries, setSummaries] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [studyStreak, setStudyStreak] = useState<number>(0);
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});
    const { showSuccess, showError } = useAlert();
    const [recentCompletions, setRecentCompletions] = useState<any[]>([]);
    const { checkForNewAchievements } = useAchievements();

    // compute streak from activity dates (consecutive days up to today, ending at 11:59 PM each day)
    function computeStreakFromActivities(activities: any[]) {
        try {
            // Collect all study-related activity dates (normalized to start of day)
            const studyDates = new Set<string>();
            
            activities.forEach(a => {
                const type = (a.type || '')?.toString().toLowerCase();
                // Count flashcard sessions and summary reads
                if (type.includes('flashcard.study_complete') || 
                    type.includes('summary.read')) {
                    const date = new Date(a.createdAt);
                    // Normalize to start of day (midnight) for comparison
                    date.setHours(0, 0, 0, 0);
                    studyDates.add(date.toISOString());
                }
            });

            // Calculate consecutive days
            let streak = 0;
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            // Check if user studied today
            const studiedToday = studyDates.has(today.toISOString());
            // Check if user studied yesterday
            const studiedYesterday = studyDates.has(yesterday.toISOString());

            // Streak logic:
            // - If studied today, start counting from today
            // - If NOT studied today but studied yesterday, start counting from yesterday
            //   (grace period: streak continues if they haven't passed midnight yet)
            // - If neither today nor yesterday, streak is 0
            
            let startDay = 0;
            if (studiedToday) {
                // Start from today
                startDay = 0;
            } else if (studiedYesterday) {
                // Grace period: if they studied yesterday, streak continues
                // They have until 11:59 PM today to maintain it
                startDay = 1;
            } else {
                // No activity today or yesterday - streak is broken
                return 0;
            }

            // Count consecutive days going backwards from the start day
            for (let i = startDay; i < 365; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(today.getDate() - i);
                const key = checkDate.toISOString();
                
                if (studyDates.has(key)) {
                    streak++;
                } else {
                    // Found a gap - streak ends
                    break;
                }
            }

            return streak;
        } catch (error) {
            console.error('Error computing streak:', error);
            return 0;
        }
    }

    // When flashcards or activities update, compute streak from all study activities
    useEffect(() => {
        const computed = computeStreakFromActivities(activities);
        setStudyStreak(computed);
    }, [activities]);

    // Load checklist from localStorage
    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('achievements_checklist') : null;
            if (raw) setChecklist(JSON.parse(raw));
        } catch {}
    }, []);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('achievements_checklist', JSON.stringify(checklist));
            }
        } catch {}
    }, [checklist]);

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            if (!user || !user._id) {
                setLoading(false);
                return;
            }

            const userId = encodeURIComponent(user._id as string);
            try {
                const [flashcardsRes, summariesRes, activitiesRes] = await Promise.allSettled([
                    fetch(`/api/student_page/flashcard?userId=${userId}`, { credentials: 'include' }),
                    fetch(`/api/student_page/summary?userId=${userId}`, { credentials: 'include' }),
                    fetch(`/api/student_page/history?userId=${userId}&limit=200`, { credentials: 'include' })
                ]);

                if (mounted) {
                    if (flashcardsRes.status === 'fulfilled' && flashcardsRes.value.ok) {
                        const data = await flashcardsRes.value.json().catch(() => null);
                        setFlashcards(Array.isArray(data?.flashcards) ? data.flashcards : []);
                    } else {
                        setFlashcards([]);
                    }

                    if (summariesRes.status === 'fulfilled' && summariesRes.value.ok) {
                        const data = await summariesRes.value.json().catch(() => null);
                        setSummaries(Array.isArray(data?.summaries) ? data.summaries : []);
                    } else {
                        setSummaries([]);
                    }

                    if (activitiesRes.status === 'fulfilled' && activitiesRes.value.ok) {
                        const data = await activitiesRes.value.json().catch(() => null);
                        const acts = Array.isArray(data?.activities) ? data.activities : [];
                        console.log('📊 Activities loaded:', acts.length, 'activities');
                        console.log('📊 Activity types:', acts.map((a: any) => a.type || a.action).filter(Boolean));
                        console.log('📊 Full activities data:', acts);
                        console.log('📊 User ID used for query:', userId);
                        setActivities(acts);
                    } else {
                        console.error('❌ Failed to fetch activities:', activitiesRes.status === 'fulfilled' ? activitiesRes.value.status : 'rejected');
                        if (activitiesRes.status === 'fulfilled') {
                            const errorText = await activitiesRes.value.text().catch(() => 'Unable to read error');
                            console.error('❌ Error response:', errorText);
                        }
                        setActivities([]);
                    }
                    
                }
            } catch (err) {
                console.warn('Failed to load achievements data', err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        // Refresh when user returns to the tab or when other tabs broadcast activity updates.
        let bc: BroadcastChannel | null = null;
        const visibilityHandler = () => { if (document.visibilityState === 'visible') load(); };
        const focusHandler = () => { load(); };

                try {
                    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                        const BC = (window as any).BroadcastChannel;
                        if (typeof BC === 'function') {
                            const instance = new BC('notewise.activities');
                            bc = instance;
                            instance.onmessage = () => { load(); };
                        }
                    }
                } catch (e) {
            bc = null;
        }

        window.addEventListener('visibilitychange', visibilityHandler);
        window.addEventListener('focus', focusHandler);

        return () => {
            mounted = false;
            window.removeEventListener('visibilitychange', visibilityHandler);
            window.removeEventListener('focus', focusHandler);
            try { if (bc) bc.close(); } catch (e) {}
        };
    }, [user]);

    // small sparkline data: count flashcards lastReviewed per day for last 7 days
    const sparkline = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setHours(0,0,0,0);
            d.setDate(d.getDate() - (6 - i));
            return d;
        });
        const counts = days.map(() => 0);
        flashcards.forEach(fc => {
            if (!fc.lastReviewed) return;
            const lr = new Date(fc.lastReviewed);
            lr.setHours(0,0,0,0);
            for (let i = 0; i < days.length; i++) {
                if (lr.getTime() === days[i].getTime()) counts[i]++;
            }
        });
        return counts;
    }, [flashcards]);

    // Use shared achievement calculation hook
    const achievements = useAchievementData({
        flashcards,
        activities,
        studyStreak,
        weeklyActivity: sparkline
    });

    const earnedCount = achievements.filter(a => a.earned).length;

    // Show unlocked/earned achievements first
    const sortedAchievements = useMemo(() => {
        return [...achievements].sort((a, b) => {
            const aEarn = a.earned ? 1 : 0;
            const bEarn = b.earned ? 1 : 0;
            if (bEarn !== aEarn) return bEarn - aEarn; // earned first
            // secondary sort: progress percent desc
            const aPct = (a.progress ?? 0) / (a.total ?? 1);
            const bPct = (b.progress ?? 0) / (b.total ?? 1);
            return bPct - aPct;
        });
    }, [achievements]);

    const unlocked = useMemo(() => sortedAchievements.filter(a => a.earned), [sortedAchievements]);
    const locked = useMemo(() => sortedAchievements.filter(a => !a.earned), [sortedAchievements]);

    // Check for newly unlocked achievements using the global context
    useEffect(() => {
        checkForNewAchievements(achievements);
    }, [achievements, checkForNewAchievements]);

    function toggleChecklist(key: string) {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    }

    // helper: update local streak when user finishes any study activity
    // Note: This is a fallback for localStorage-based streak tracking
    // The actual streak is now computed from activities in computeStreakFromActivities()
    function updateStreakOnFinish() {
        try {
            if (typeof window === 'undefined') return;
            const keyDate = 'studyLastFinishedDate';
            const keyStreak = 'studyStreak';
            const rawLast = localStorage.getItem(keyDate);
            
            // Current date/time
            const now = new Date();
            // Start of today (12:00 AM)
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString();

            let streak = 0;
            const rawStreak = localStorage.getItem(keyStreak);
            if (rawStreak) streak = Number(rawStreak) || 0;

            if (rawLast) {
                const last = new Date(rawLast);
                last.setHours(0, 0, 0, 0);
                const diff = Math.round((today.getTime() - last.getTime()) / (1000*60*60*24));
                if (diff === 0) {
                    // already studied today: no change to streak
                } else if (diff === 1) {
                    // studied yesterday, increment streak
                    streak = streak + 1;
                } else {
                    // gap in days, reset streak to 1
                    streak = 1;
                }
            } else {
                // first time studying
                streak = 1;
            }

            localStorage.setItem(keyDate, todayStr);
            localStorage.setItem(keyStreak, String(streak));
            setStudyStreak(streak);
            return streak;
        } catch (err) {
            return studyStreak;
        }
    }

    async function markSetFinished(flashcard: any) {
        if (!user || !user._id) {
            showError('You must be signed in to mark a set finished');
            return;
        }

        const confirm = window.confirm(`Mark "${flashcard.title || 'this set'}" as finished? This will mark all ${flashcard.cards?.length || 0} cards as mastered.`);
        if (!confirm) return;

        const userId = encodeURIComponent(user._id as string);
        const fcId = flashcard._id;
        const masteredIds = Array.isArray(flashcard.cards) ? flashcard.cards.map((c: any) => c._id) : [];
        const body = {
            learn: { masteredIds, currentIndex: 0 },
            sessionQueue: [],
            viewerPos: 0,
            lastSessionStartedAt: new Date().toISOString()
        };

        try {
            // Prevent double-marking: check existing StudyProgress completion first
            try {
                const progRes = await fetch(`/api/student_page/flashcard/${fcId}/progress?userId=${userId}`, { credentials: 'include' });
                if (progRes.ok) {
                    const progJson = await progRes.json().catch(() => null);
                    const prog = progJson?.progress || progJson;
                    const existingCompletedAt = prog?.completion?.completedAt || prog?.lastSessionStartedAt || null;
                    if (prog?.completion?.showCompletion || existingCompletedAt) {
                        // Already recorded a completion for this flashcard; avoid sending another PATCH
                        showSuccess(`"${flashcard.title || 'set'}" is already marked finished`);
                        // update local UI from server to reflect current state
                        try {
                            const refreshed = await fetch(`/api/student_page/flashcard?userId=${userId}`, { credentials: 'include' });
                            if (refreshed.ok) {
                                const json = await refreshed.json().catch(() => null);
                                setFlashcards(Array.isArray(json?.flashcards) ? json.flashcards : []);
                            }
                        } catch (e) {
                            // ignore
                        }
                        const newStreak = updateStreakOnFinish();
                        return;
                    }
                }
            } catch (e) {
                // if progress check fails, proceed with PATCH as before
                console.warn('Progress check failed, will attempt to mark finished', e);
            }

            const res = await fetch(`/api/student_page/flashcard/${fcId}/progress?userId=${userId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);

            // update local UI: re-fetch flashcards from server to ensure persistence across sessions
            try {
                const refreshed = await fetch(`/api/student_page/flashcard?userId=${userId}`, { credentials: 'include' });
                if (refreshed.ok) {
                    const json = await refreshed.json().catch(() => null);
                    setFlashcards(Array.isArray(json?.flashcards) ? json.flashcards : []);
                } else {
                    // fallback: optimistic update
                    const now = new Date().toISOString();
                    setFlashcards(prev => prev.map(f => f._id === fcId ? { ...f, lastReviewed: now, repetitionCount: (Number(f.repetitionCount) || 0) + 1 } : f));
                }
            } catch (err) {
                const now = new Date().toISOString();
                setFlashcards(prev => prev.map(f => f._id === fcId ? { ...f, lastReviewed: now, repetitionCount: (Number(f.repetitionCount) || 0) + 1 } : f));
            }

            const newStreak = updateStreakOnFinish();
            showSuccess(`Marked "${flashcard.title || 'set'}" as finished — streak: ${newStreak} days`);
        } catch (err: any) {
            console.warn('Failed to mark set finished', err);
            showError('Failed to mark set finished');
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-2 sm:px-0 py-6 sm:py-8">
                <div className="mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">Achievements</h1>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Track your learning milestones and celebrate your progress.</p>
                    </div>
                </div>

                {/* Your Progress - moved to top-most position */}
                <div className="mb-6 sm:mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">Your Progress</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                                <div className="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-teal-600 dark:text-teal-400 mb-1">{flashcards.length}</div>
                                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{flashcards.length <= 1 ? 'Flashcard' : 'Flashcards'}</div>
                                </div>

                                <div className="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">{summaries.length}</div>
                                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{summaries.length <= 1 ? 'Summary' : 'Summaries'}</div>
                                </div>

                                <div className="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{Math.round((earnedCount / (achievements.length || 1)) * 100)}%</div>
                                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Completion</div>
                                </div>

                                <div className="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">{studyStreak}d</div>
                                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Study {studyStreak <= 1 ? 'streak' : 'streaks'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3">
                        {/* Unlocked achievements */}
                        {unlocked.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Unlocked</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                                    {unlocked.map((achievement) => (
                                        <div key={achievement.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 sm:p-6 transition-all hover:shadow-lg hover:-translate-y-1 ${achievement.earned ? 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                                                <div className={`text-3xl sm:text-4xl flex-shrink-0 ${achievement.earned ? 'grayscale-0' : 'grayscale opacity-50'}`}>{achievement.icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`text-base sm:text-lg font-semibold mb-2 ${achievement.earned ? 'text-teal-900 dark:text-teal-100' : 'text-gray-900 dark:text-white'}`}>{achievement.title}</h3>
                                                    <p className={`text-xs sm:text-sm mb-3 leading-relaxed ${achievement.earned ? 'text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400'}`}>{achievement.description}</p>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                        <span className="text-xs font-medium text-teal-600 dark:text-teal-400">✓ Earned</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Locked achievements are rendered at the bottom of the page */}

                        {/* 'Your Decks' removed per user request */}

                        {/* 'Your Progress' moved to top of the page */}
                    </div>
                </div>
            </div>
            {/* Locked achievements placed at the bottom-most part of the page */}
            {locked.length > 0 && (
                <div className="max-w-6xl mx-auto px-2 sm:px-0 py-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Locked Achievements</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                            {locked.map((achievement) => (
                                <div key={achievement.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 sm:p-6 transition-all hover:shadow-lg hover:-translate-y-1 border-gray-200 dark:border-gray-700`}>
                                    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                                        <div className={`text-3xl sm:text-4xl flex-shrink-0 grayscale opacity-50`}>{achievement.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-white`}>{achievement.title}</h3>
                                            <p className={`text-xs sm:text-sm mb-3 leading-relaxed text-gray-600 dark:text-gray-400`}>{achievement.description}</p>
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    <span>Progress</span>
                                                    <span>{achievement.progress ?? 0}/{achievement.total ?? '-'}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div className="bg-teal-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((achievement.progress ?? 0) / (achievement.total ?? 1)) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}