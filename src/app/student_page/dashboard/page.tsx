"use client";

import "./styles.css";
import { useState, useEffect } from "react";
import useAuth from "@/hooks/useAuth";
import Link from "next/link";
import LoadingTemplate2 from "@/components/ui/loading_template_2/loading2";
import { useSession } from "next-auth/react";

interface DashboardStats {
  totalUploads: number;
  totalFlashcards: number;
  studyStreak: number;
  studyProgress: number;
  recentActivity: string;
}

export default function UserDashboard() {
  const { isLoading: authLoading, user } = useAuth();
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalUploads: 0,
    totalFlashcards: 0,
    studyStreak: 0,
    studyProgress: 0,
    recentActivity: "No recent activity"
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Array<{_id: string; title: string; type: string}>>([]);

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
    // Load dashboard stats from available endpoints when user is present.
    // If endpoints are unavailable or the request fails, fall back to hardcoded/localStorage values.
    let mounted = true;

    async function loadStats() {
      setLoadingStats(true);
      setStatsError(null);

      // local fallback values
      const fallback: DashboardStats = {
        totalUploads: 5,
        totalFlashcards: 10,
        studyStreak: 0,
        studyProgress: 0,
        recentActivity: 'No recent activity'
      };

      try {
        // If we have a logged-in user, try to fetch real data in parallel
        if (user && user._id) {
          const userId = encodeURIComponent(user._id as string);

          const flashcardsPromise = fetch(`/api/student_page/flashcard?userId=${userId}`, { credentials: 'include' });
          const foldersPromise = fetch(`/api/student_page/folder?userId=${userId}`, { credentials: 'include' });
          const testsPromise = fetch(`/api/student_page/practice-test?userId=${userId}`, { credentials: 'include' });
          const summariesPromise = fetch(`/api/student_page/summary?userId=${userId}`, { credentials: 'include' });

          const [flashcardsRes, foldersRes, testsRes, summariesRes] = await Promise.allSettled([
            flashcardsPromise,
            foldersPromise,
            testsPromise,
            summariesPromise,
          ]);

          let totalFlashcards = 0;
          let totalFolders = 0;
          let totalTests = 0;
          let recentActivity = fallback.recentActivity;
          let fetchedFlashcards: any[] = [];
          let fetchedFolders: any[] = [];
          let fetchedTests: any[] = [];
          let fetchedSummaries: any[] = [];

          if (flashcardsRes.status === 'fulfilled' && flashcardsRes.value.ok) {
            const data = await flashcardsRes.value.json().catch(() => null);
            const flashcards = (data && data.flashcards) || [];
            fetchedFlashcards = Array.isArray(flashcards) ? flashcards : [];
            totalFlashcards = fetchedFlashcards.length;
            if (fetchedFlashcards[0]) {
              recentActivity = `Last: ${fetchedFlashcards[0].title || 'Updated a flashcard'}`;
            }
          }

          if (foldersRes.status === 'fulfilled' && foldersRes.value.ok) {
            const data = await foldersRes.value.json().catch(() => null);
            const folders = (data && (data.folders || data.folders)) || data?.folders || [];
            fetchedFolders = Array.isArray(folders) ? folders : [];
            totalFolders = fetchedFolders.length;
          }

          if (testsRes.status === 'fulfilled' && testsRes.value.ok) {
            const data = await testsRes.value.json().catch(() => null);
            const tests = (data && data.practiceTests) || [];
            fetchedTests = Array.isArray(tests) ? tests : [];
            totalTests = fetchedTests.length;
            if (fetchedTests[0]) {
              recentActivity = `Saved test: ${fetchedTests[0].title}`;
            }
          }

          if (summariesRes.status === 'fulfilled' && summariesRes.value.ok) {
            const data = await summariesRes.value.json().catch(() => null);
            const s = (data && data.summaries) || data?.summaries || [];
            fetchedSummaries = Array.isArray(s) ? s : [];
          }

          // Build favorites list from fetched items (flashcards, folders, tests, summaries)
          try {
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

            // Keep most recent favorites first — try to preserve server ordering
            setFavorites(favs.slice(0, 8));
          } catch (e) {
            // ignore
            setFavorites([]);
          }

          // totalUploads: best-effort aggregated metric (flashcards + practice tests)
          const totalUploads = totalFlashcards + totalTests;

          // Try reading lightweight progress info from localStorage as a fallback
          let studyStreak = 0;
          let studyProgress = 0;
          try {
            if (typeof window !== 'undefined') {
              const s = localStorage.getItem('studyStreak');
              const p = localStorage.getItem('studyProgress');
              if (s) studyStreak = Number(s) || 0;
              if (p) studyProgress = Number(p) || 0;
            }
          } catch {}

          if (mounted) {
            setStats({
              totalUploads: totalUploads || fallback.totalUploads,
              totalFlashcards: totalFlashcards || fallback.totalFlashcards,
              studyStreak,
              studyProgress,
              recentActivity: recentActivity || fallback.recentActivity,
            });
          }
        } else {
          // Not signed in: try localStorage or show fallback
          let fromLocal: any = null;
          try {
            if (typeof window !== 'undefined') {
              const raw = localStorage.getItem('user');
              if (raw) fromLocal = JSON.parse(raw);
            }
          } catch {}

          if (mounted) {
            setStats({
              totalUploads: fallback.totalUploads,
              totalFlashcards: fallback.totalFlashcards,
              studyStreak: 0,
              studyProgress: 0,
              recentActivity: fromLocal?.recentActivity || fallback.recentActivity,
            });
          }
        }
      } catch (err: any) {
        // Non-fatal: keep fallback values but surface error state
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

  if (authLoading) {
    return <LoadingTemplate2 title="Loading dashboard..." />;
  }

  return (
    <div className="dashboard-root bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <div className="dashboard-container">
        {/* Header with user greeting */}
        <header className="greet-block" aria-label="Welcome">
          <h1 className="greet-title text-gray-900 dark:text-white">{`Welcome Back, ${firstName}!`}</h1>
          <p className="greet-sub text-gray-600 dark:text-gray-400">
            Ready to continue your learning journey?
          </p>
        </header>

        {/* Summary Statistics */}
        <div className="dashboard-grid">
          <div className="col-span-12">
            <div className="summary-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Uploads Card */}
              <div className="metric-card panel p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Uploads</p>
                    <p className="metric-value text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalUploads}
                    </p>
                  </div>
                </div>
              </div>

              {/* Flashcards Card */}
              <div className="metric-card panel p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Flashcards</p>
                    <p className="metric-value text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalFlashcards}
                    </p>
                  </div>
                </div>
              </div>

              {/* Study Streak Card */}
              <div className="metric-card panel p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Study Streak</p>
                    <p className="metric-value text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.studyStreak} <span className="text-base font-medium text-gray-500 dark:text-gray-400">days</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Card */}
              <div className="metric-card panel p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Progress</p>
                    <p className="metric-value text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.studyProgress}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity and Quick Actions Section */}
        <div className="dashboard-grid">
          <div className="col-span-8">
            <div className="panel panel-padded-lg h-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="section-title mb-4 text-gray-900 dark:text-white">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 bg-teal-100 dark:bg-teal-800 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-600 dark:text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stats.recentActivity}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Uploaded Chemistry notes</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Yesterday</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Completed Math quiz</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-4">
            {/* Favorites Shortcuts Panel - separated into folders and items */}
            <div className="panel panel-padded-lg mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="section-title mb-3 text-gray-900 dark:text-white">Favorites</h2>
              <div className="space-y-3">
                {/* Split favorites into folders and other items */}
                {(() => {
                  const folderFavs = favorites.filter(f => f.type === 'folder');
                  const itemFavs = favorites.filter(f => f.type !== 'folder');
                  if (folderFavs.length === 0 && itemFavs.length === 0) {
                    return (
                      <div className="p-3 text-sm text-gray-600 dark:text-gray-400">No favorites yet. Mark items as favorites in your library to see shortcuts here.</div>
                    );
                  }

                  return (
                    <>
                      {folderFavs.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Folders</h3>
                          <div className="space-y-1">
                            {folderFavs.map(f => (
                              <Link key={f._id} href={`/student_page/library?tab=favorites`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors no-underline">
                                <div className="w-8 h-8 bg-yellow-50 dark:bg-yellow-900/10 rounded-md flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Folder</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {itemFavs.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Items</h3>
                          <div className="space-y-1">
                            {itemFavs.map(f => (
                              <Link key={f._id} href={`/student_page/library?tab=favorites`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors no-underline">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                                  {/* Flashcard */}
                                  {f.type === 'flashcard' && (
                                    <svg className="w-4 h-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <rect x="3" y="6" width="14" height="10" rx="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      <rect x="7" y="9" width="14" height="10" rx="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}

                                  {/* Practice test (clipboard/list) */}
                                  {f.type === 'practice_test' && (
                                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path d="M9 2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M9 8h6M9 12h6M9 16h4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}

                                  {/* Summary (document) */}
                                  {f.type === 'summary' && (
                                    <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path d="M7 3h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V3z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M7 13h10M7 9h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{f.type.replace('_', ' ')}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <Link href="/student_page/library?tab=favorites" className="text-sm text-teal-600 dark:text-teal-300 hover:underline">View all favorites</Link>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="panel panel-padded-lg h-80 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="section-title mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
              <div className="qa-group flex-1 flex flex-col justify-center">
                <Link href="/student_page/flashcards/upload" className="qa-link qa-chip flex items-center gap-3 p-3 mb-3 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors no-underline">
                  <div className="qa-icon">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="qa-text">Upload Notes</span>
                </Link>

                <Link href="/student_page/flashcards/create" className="qa-link flex items-center gap-3 p-3 mb-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors no-underline">
                  <div className="qa-icon">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="qa-text">Create Flashcards</span>
                </Link>

                <Link href="/student_page/study_mode" className="qa-link flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors no-underline">
                  <div className="qa-icon">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="qa-text">Study Notes</span>
                </Link>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}