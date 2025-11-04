"use client";

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PrimaryActionButton from '@/components/ui/buttons/PrimaryActionButton';

type FlashcardItem = {
  _id: string;
  title: string;
  description?: string;
  cards?: Array<{ _id: string; question: string; answer: string }>;
  tags?: string[];
  subject?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PracticeTestItem = {
  _id: string;
  title: string;
  description?: string;
  subject: string;
  difficulty: string;
  timeLimit: number;
  totalPoints: number;
  topics: string[];
  attempts: number;
  averageScore?: number;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function PrivateLibraryContent() {
  const [activeTab, setActiveTab] = useState('flashcards');
  const [filter, setFilter] = useState('recent');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'folders' | 'list'>('folders'); // New state for view mode
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null); // Track which folder is open

  const [userId, setUserId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [practiceTests, setPracticeTests] = useState<PracticeTestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<'share' | 'organize' | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareItem, setShareItem] = useState<FlashcardItem | null>(null);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(event.target.value);
  };

  // Check for URL parameters
  useEffect(() => {
    // Check for tab parameter
    const tabParam = searchParams.get('tab');
    if (tabParam && !isLoading) {
      setActiveTab(tabParam);
    }

    // Check for subject to auto-expand folder
    const autoExpandSubject = searchParams.get('subject');
    if (autoExpandSubject && viewMode === 'folders' && !isLoading) {
      const decodedSubject = decodeURIComponent(autoExpandSubject);
      setExpandedFolder(decodedSubject);

      // Scroll to the folder after a short delay to ensure it's rendered
      setTimeout(() => {
        const folderElement = document.getElementById(`folder-${decodedSubject.replace(/[^a-zA-Z0-9]/g, '-')}`);
        if (folderElement) {
          folderElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);

      // Find and highlight the most recent flashcard in this subject
      if (flashcards.length > 0) {
        const subjectFlashcards = flashcards.filter(f => f.subject === decodedSubject);
        if (subjectFlashcards.length > 0) {
          // Get the most recently created flashcard
          const mostRecent = subjectFlashcards.reduce((latest, current) => {
            const latestDate = new Date(latest.createdAt || 0).getTime();
            const currentDate = new Date(current.createdAt || 0).getTime();
            return currentDate > latestDate ? current : latest;
          });
          setHighlightedCardId(mostRecent._id);

          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedCardId(null);
          }, 3000);
        }
      }
    }
  }, [searchParams, viewMode, isLoading, flashcards]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        // Try multiple authentication methods
        let uid: string | null = null;

        // Method 1: Try authenticated API call with token
        try {
          const token = localStorage.getItem('accessToken');
          if (token) {
            const currentRes = await fetch('/api/v1/users/current', {
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            if (currentRes.ok) {
              const currentJsonUnknown = await currentRes.json().catch(() => ({} as unknown));
              const currentJson = currentJsonUnknown as Partial<{ user?: { _id?: string } }>;
              uid = currentJson?.user?._id ?? null;
              console.log("✅ Library: Authenticated via JWT token, user ID:", uid);
            }
          }
        } catch (err) {
          console.warn("Library: JWT authentication failed:", err);
        }

        // Method 2: Fallback to localStorage userId
        if (!uid) {
          uid = localStorage.getItem('userId');
          if (uid) {
            console.log("✅ Library: Using localStorage userId:", uid);
          }
        }

        // Method 3: Generate a temporary user ID for demo purposes
        if (!uid) {
          uid = `temp-user-${Date.now()}`;
          localStorage.setItem('userId', uid);
          console.log("⚠️ Library: Generated temporary user ID:", uid);
        }

        if (!isMounted) return;
        setUserId(uid);

        // Fetch flashcards owned by the current user from the student_page API
        const res = await fetch(`/api/student_page/flashcard?userId=${uid}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        if (!res.ok) {
          const maybeUnknown = await res.json().catch(() => ({} as unknown));
          const maybe = maybeUnknown as Partial<{ message?: string }>;
          throw new Error(maybe?.message || `Failed to load flashcards (${res.status})`);
        }
        const data = (await res.json()) as { flashcards: FlashcardItem[] };
        if (!isMounted) return;

        // Debug: Log flashcard data to check subjects
        console.log('📚 Loaded flashcards:', data.flashcards);
        data.flashcards.forEach((fc, idx) => {
          console.log(`Flashcard ${idx + 1}: "${fc.title}" - Subject: "${fc.subject || 'MISSING'}"`, fc);
        });

        setFlashcards(Array.isArray(data?.flashcards) ? data.flashcards : []);

        // Fetch practice tests (private only)
        const practiceTestRes = await fetch(`/api/student_page/practice-test?userId=${uid}&isPublic=false`, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (practiceTestRes.ok) {
          const practiceTestData = (await practiceTestRes.json()) as { practiceTests: PracticeTestItem[] };
          if (isMounted) {
            console.log('📝 Loaded private practice tests:', practiceTestData.practiceTests);
            setPracticeTests(Array.isArray(practiceTestData?.practiceTests) ? practiceTestData.practiceTests : []);
          }
        } else {
          console.warn('Failed to load practice tests');
        }
      } catch (e: unknown) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Something went wrong loading your library.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  const handleDelete = async (flashcardId: string) => {
    if (!userId) return;
    if (!confirm('Delete this flashcard? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/student_page/flashcard/${flashcardId}?userId=${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const maybeUnknown = await res.json().catch(() => ({} as unknown));
        const maybe = maybeUnknown as Partial<{ message?: string }>;
        throw new Error(maybe?.message || `Failed to delete (${res.status})`);
      }
      setFlashcards(prev => prev.filter(f => f._id !== flashcardId));
      setOpenMenuId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete flashcard.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('Link copied to clipboard!'))
      .catch(() => alert('Failed to copy link'));
  };

  const handleRename = async (item: FlashcardItem) => {
    if (!userId) return;
    const newTitle = prompt('Rename set to:', item.title || '');
    if (!newTitle || newTitle.trim() === '' || newTitle === item.title) return;
    try {
      const res = await fetch(`/api/student_page/flashcard/${item._id}?userId=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) {
        const maybeUnknown = await res.json().catch(() => ({} as unknown));
        const maybe = maybeUnknown as Partial<{ message?: string }>;
        throw new Error(maybe?.message || `Failed to rename (${res.status})`);
      }
      setFlashcards(prev => prev.map(f => f._id === item._id ? { ...f, title: newTitle.trim() } : f));
      setOpenMenuId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to rename.');
    }
  };

  // Get unique subjects from both flashcards and practice tests based on active tab
  const subjects = useMemo(() => {
    const subjectSet = new Set<string>();
    if (activeTab === 'flashcards') {
      flashcards.forEach(f => {
        if (f.subject) subjectSet.add(f.subject);
      });
    } else if (activeTab === 'practice_tests') {
      practiceTests.forEach(t => {
        if (t.subject) subjectSet.add(t.subject);
      });
    }
    return Array.from(subjectSet).sort();
  }, [flashcards, practiceTests, activeTab]);

  // Group flashcards by subject for folder view
  const flashcardsBySubject = useMemo(() => {
    const grouped = new Map<string, FlashcardItem[]>();

    flashcards.forEach(f => {
      const subject = f.subject || 'Uncategorized';
      if (!grouped.has(subject)) {
        grouped.set(subject, []);
      }
      grouped.get(subject)!.push(f);
    });

    // Sort flashcards within each subject
    grouped.forEach((items, subject) => {
      if (filter === 'recent') {
        items.sort((a, b) => {
          const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bd - ad;
        });
      } else if (filter === 'popular') {
        items.sort((a, b) => (b.cards?.length || 0) - (a.cards?.length || 0));
      } else if (filter === 'alphabetical') {
        items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }
    });

    return grouped;
  }, [flashcards, filter]);

  // Group practice tests by subject for folder view
  const practiceTestsBySubject = useMemo(() => {
    const grouped = new Map<string, PracticeTestItem[]>();

    practiceTests.forEach(test => {
      const subject = test.subject || 'Uncategorized';
      if (!grouped.has(subject)) {
        grouped.set(subject, []);
      }
      grouped.get(subject)!.push(test);
    });

    // Sort practice tests within each subject
    grouped.forEach((items) => {
      if (filter === 'recent') {
        items.sort((a, b) => {
          const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bd - ad;
        });
      } else if (filter === 'popular') {
        items.sort((a, b) => (b.attempts || 0) - (a.attempts || 0));
      } else if (filter === 'alphabetical') {
        items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }
    });

    return grouped;
  }, [practiceTests, filter]);

  const filteredFlashcards = useMemo(() => {
    let list = [...flashcards];

    // Filter by subject
    if (selectedSubject !== 'all') {
      list = list.filter(f => f.subject === selectedSubject);
    }

    // Sort
    if (filter === 'recent') {
      list.sort((a, b) => {
        const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bd - ad;
      });
    } else if (filter === 'popular') {
      list.sort((a, b) => (b.cards?.length || 0) - (a.cards?.length || 0));
    } else if (filter === 'alphabetical') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return list;
  }, [flashcards, filter, selectedSubject]);

  const filteredPracticeTests = useMemo(() => {
    let list = [...practiceTests];

    // Filter by subject
    if (selectedSubject !== 'all') {
      list = list.filter(t => t.subject === selectedSubject);
    }

    // Sort
    if (filter === 'recent') {
      list.sort((a, b) => {
        const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bd - ad;
      });
    } else if (filter === 'popular') {
      list.sort((a, b) => (b.attempts || 0) - (a.attempts || 0));
    } else if (filter === 'alphabetical') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return list;
  }, [practiceTests, filter, selectedSubject]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Library</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage and organize your study materials</p>
      </div>

      {/* Navigation Tabs - matching Student Class page style */}
      <div className="mb-8 bg-transparent">
        <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
          {['flashcards', 'practice_tests', 'study_notes'].map((tab) => {
            const label = tab
              .split('_')
              .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
              .join(' ');
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium transition-colors ${activeTab === tab
                  ? 'text-gray-900 dark:text-white border-b-2 border-teal-500 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('folders')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'folders'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              title="View by folders"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Folders
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              title="View as list"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              List
            </button>
          </div>

          {viewMode === 'list' && (
            <select
              id="subject-filter"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          )}

          <select
            id="filter"
            value={filter}
            onChange={handleFilterChange}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
          >
            <option value="recent">Recent</option>
            <option value="popular">Most Cards</option>
            <option value="alphabetical">A-Z</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'flashcards' && (
              viewMode === 'folders'
                ? `${flashcardsBySubject.size} ${flashcardsBySubject.size === 1 ? 'class' : 'classes'}, ${flashcards.length} ${flashcards.length === 1 ? 'set' : 'sets'}`
                : `${filteredFlashcards.length} ${filteredFlashcards.length === 1 ? 'set' : 'sets'}`
            )}
            {activeTab === 'practice_tests' && (
              viewMode === 'folders'
                ? `${practiceTestsBySubject.size} ${practiceTestsBySubject.size === 1 ? 'class' : 'classes'}, ${practiceTests.length} ${practiceTests.length === 1 ? 'test' : 'tests'}`
                : `${filteredPracticeTests.length} ${filteredPracticeTests.length === 1 ? 'test' : 'tests'}`
            )}
            {activeTab === 'study_notes' && '0 notes'}
          </span>
        </div>

        {activeTab === 'flashcards' && (
          <PrimaryActionButton as="link" href="/student_page/flashcards/create" title="Create a new set">
            + Create Set
          </PrimaryActionButton>
        )}
        {activeTab === 'practice_tests' && (
          <PrimaryActionButton as="link" href="/student_page/practice_tests" title="Create a practice test">
            + Create Test
          </PrimaryActionButton>
        )}
        {activeTab === 'study_notes' && (
          <PrimaryActionButton as="button" onClick={() => alert('Coming soon!')} title="Create a study note">
            + Create Note
          </PrimaryActionButton>
        )}
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        {activeTab === 'flashcards' && (
          <div id="flashcards">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[#1C2B1C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-slate-400">Loading your flashcards...</p>
                </div>
              </div>
            )}
            {!isLoading && error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {!isLoading && !error && flashcards.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No flashcard sets yet</h3>
                <p className="text-gray-500 dark:text-slate-400 mb-4">Create your first set to get started</p>
                <PrimaryActionButton as="link" href="/student_page/flashcards/create" title="Create your first set">
                  Create Your First Set
                </PrimaryActionButton>
              </div>
            )}

            {/* Folder View */}
            {!isLoading && !error && viewMode === 'folders' && flashcards.length > 0 && (
              <div className="space-y-4">
                {Array.from(flashcardsBySubject.entries()).map(([subject, items]) => (
                  <div
                    key={subject}
                    id={`folder-${subject.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible"
                  >
                    {/* Folder Header */}
                    <button
                      onClick={() => setExpandedFolder(expandedFolder === subject ? null : subject)}
                      className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expandedFolder === subject
                          ? 'bg-[#1C2B1C] text-white'
                          : 'bg-[#1C2B1C]/10 text-[#1C2B1C]'
                          }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{subject}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {items.length} {items.length === 1 ? 'set' : 'sets'}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === subject ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Folder Contents */}
                    {expandedFolder === subject && (
                      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-visible">
                          {items.map((item) => (
                            <div
                              key={item._id}
                              onClick={() => router.push(`/student_page/library/${item._id}`)}
                              className={`bg-white dark:bg-slate-800 border rounded-xl p-4 cursor-pointer hover:shadow-lg hover:border-[#1C2B1C]/20 dark:hover:border-[#1C2B1C]/40 transition-all duration-200 group relative ${highlightedCardId === item._id
                                ? 'border-[#1C2B1C] border-2 shadow-lg ring-2 ring-[#1C2B1C]/20 animate-pulse'
                                : 'border-slate-200 dark:border-slate-700'
                                }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-[#1C2B1C] rounded-full"></div>
                                  <span className="text-sm font-medium text-[#1C2B1C]">{item.cards?.length || 0} cards</span>
                                  {highlightedCardId === item._id && (
                                    <span className="px-2 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === item._id ? null : item._id); }}
                                  className="p-1 rounded-lg hover:bg-[#1C2B1C]/10 text-gray-400 dark:text-slate-500 hover:text-[#1C2B1C] opacity-0 group-hover:opacity-100 transition-all"
                                  aria-label="Open actions"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </button>
                              </div>

                              <div className="mb-3">
                                <h4 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{item.title}</h4>
                                {item.description && (
                                  <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
                                <span>Updated {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'recently'}</span>
                              </div>

                              {/* Dropdown Menu */}
                              {openMenuId === item._id && (
                                <div className="absolute top-12 right-4 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C] rounded-t-xl ${openSubMenu === 'share' ? 'bg-[#1C2B1C]/10' : ''}`}
                                    onMouseEnter={() => setOpenSubMenu('share')}
                                    onFocus={() => setOpenSubMenu('share')}
                                  >
                                    <span className="text-gray-700 dark:text-slate-300">Share</span>
                                    <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                  <button
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C]"
                                    onClick={() => handleRename(item)}
                                  >
                                    Rename
                                  </button>
                                  <button
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C]"
                                    onClick={() => { router.push(`/student_page/library/${item._id}`); setOpenMenuId(null); }}
                                  >
                                    Edit
                                  </button>
                                  <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                  <button
                                    className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                    onClick={() => handleDelete(item._id)}
                                  >
                                    Delete
                                  </button>

                                  {openSubMenu === 'share' && (
                                    <div className="absolute top-0 right-full mr-2 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50">
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C] rounded-t-xl"
                                        onClick={() => { setShareItem(item); setShowShareModal(true); setOpenMenuId(null); setOpenSubMenu(null); }}
                                      >
                                        Share link
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C] rounded-b-xl"
                                        onClick={() => { copyToClipboard(`${window.location.origin}/student_page/library/${item._id}`); setOpenMenuId(null); setOpenSubMenu(null); }}
                                      >
                                        Copy link
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* List View - Original Grid */}
            {!isLoading && !error && viewMode === 'list' && filteredFlashcards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFlashcards.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => router.push(`/student_page/library/${item._id}`)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-[var(--dark-border,#2E2E2E)] rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:border-[#1C2B1C]/20 dark:hover:border-[#1C2B1C]/40 transition-all duration-200 group relative h-full flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#1C2B1C] rounded-full"></div>
                        <span className="text-sm font-medium text-[#1C2B1C]">{item.cards?.length || 0} cards</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === item._id ? null : item._id); }}
                        className="p-1.5 rounded-lg hover:bg-[#1C2B1C]/10 text-gray-400 dark:text-slate-500 hover:text-[#1C2B1C] opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Open actions"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#1C2B1C]/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-[#1C2B1C]">Y</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-slate-400">You</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>

                    {/* Dropdown Menu */}
                    {openMenuId === item._id && (
                      <div className="absolute top-12 right-4 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C] rounded-t-xl ${openSubMenu === 'share' ? 'bg-[#1C2B1C]/10' : ''}`}
                          onMouseEnter={() => setOpenSubMenu('share')}
                          onFocus={() => setOpenSubMenu('share')}
                        >
                          <span className="text-gray-700 dark:text-slate-300">Share</span>
                          <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C]"
                          onClick={() => handleRename(item)}
                        >
                          Rename
                        </button>
                        <button
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C]"
                          onClick={() => { router.push(`/student_page/library/${item._id}`); setOpenMenuId(null); }}
                        >
                          Edit
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                        <button
                          className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                          onClick={() => handleDelete(item._id)}
                        >
                          Delete
                        </button>

                        {openSubMenu === 'share' && (
                          <div className="absolute top-0 right-full mr-2 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg">
                            <button
                              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C] rounded-t-xl"
                              onClick={() => { setShareItem(item); setShowShareModal(true); setOpenMenuId(null); setOpenSubMenu(null); }}
                            >
                              Share link
                            </button>
                            <button
                              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C] rounded-b-xl"
                              onClick={() => { copyToClipboard(`${window.location.origin}/student_page/library/${item._id}`); setOpenMenuId(null); setOpenSubMenu(null); }}
                            >
                              Copy link
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Share Modal */}
            {showShareModal && shareItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowShareModal(false)}></div>
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Share &quot;{shareItem.title}&quot;</h3>
                    <button
                      className="text-gray-400 dark:text-slate-500 hover:text-[#1C2B1C] p-1"
                      onClick={() => setShowShareModal(false)}
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">Anyone with this link can view your flashcard set.</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/student_page/library/${shareItem._id}`}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm"
                    />
                    <PrimaryActionButton onClick={() => copyToClipboard(`${window.location.origin}/student_page/library/${shareItem._id}`)}>
                      Copy
                    </PrimaryActionButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'practice_tests' && (
          <div>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[#1C2B1C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-slate-400">Loading your practice tests...</p>
                </div>
              </div>
            )}
            {!isLoading && practiceTests.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No Practice Tests Yet</h3>
                <p className="text-gray-500 dark:text-slate-400 mb-4">Create practice tests from your flashcards</p>
                <PrimaryActionButton as="link" href="/student_page/practice_tests" title="Create a practice test">
                  Create Practice Test
                </PrimaryActionButton>
              </div>
            )}
            {!isLoading && practiceTests.length > 0 && viewMode === 'folders' && (
              <div className="space-y-4">
                {Array.from(practiceTestsBySubject.entries()).map(([subject, tests]) => (
                  <div
                    key={subject}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible"
                  >
                    {/* Folder Header */}
                    <button
                      onClick={() => setExpandedFolder(expandedFolder === subject ? null : subject)}
                      className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expandedFolder === subject
                          ? 'bg-[#1C2B1C] text-white'
                          : 'bg-[#1C2B1C]/10 text-[#1C2B1C]'
                          }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{subject}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {tests.length} {tests.length === 1 ? 'test' : 'tests'}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === subject ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Folder Contents */}
                    {expandedFolder === subject && (
                      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {tests.map((test) => (
                            <div
                              key={test._id}
                              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg hover:border-[#1C2B1C]/20 dark:hover:border-[#1C2B1C]/40 transition-all duration-200 relative"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                                >
                                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                                    {test.title}
                                  </h3>
                                </div>

                                {/* Three dots menu */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === test._id ? null : test._id);
                                    }}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                  >
                                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>

                                  {openMenuId === test._id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (confirm('Are you sure you want to delete this practice test?')) {
                                            try {
                                              const res = await fetch(`/api/student_page/practice-test?testId=${test._id}&userId=${userId}`, {
                                                method: 'DELETE'
                                              });
                                              const data = await res.json();
                                              if (data.success) {
                                                setPracticeTests(prev => prev.filter(t => t._id !== test._id));
                                                setOpenMenuId(null);
                                              } else {
                                                alert(data.error || 'Failed to delete');
                                              }
                                            } catch (err) {
                                              alert('Failed to delete practice test');
                                            }
                                          }
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-t-xl transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {test.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                  {test.description}
                                </p>
                              )}

                              <div className="flex items-center gap-2 flex-wrap mb-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  {test.difficulty}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ⏱️ {test.timeLimit} min
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  🎯 {test.totalPoints} pts
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <span>
                                  {test.attempts} {test.attempts === 1 ? 'attempt' : 'attempts'}
                                </span>
                                {test.averageScore !== undefined && (
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    Avg: {test.averageScore.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* List View for Practice Tests */}
            {!isLoading && practiceTests.length > 0 && viewMode === 'list' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPracticeTests.map((test) => (
                  <div
                    key={test._id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-lg hover:border-[#1C2B1C]/20 dark:hover:border-[#1C2B1C]/40 transition-all duration-200 relative cursor-pointer"
                    onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                          {test.title}
                        </h3>
                      </div>

                      {/* Three dots menu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === test._id ? null : test._id);
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === test._id && (
                        <div
                          className="absolute right-4 top-12 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this practice test?')) {
                                try {
                                  const res = await fetch(`/api/student_page/practice-test?testId=${test._id}&userId=${userId}`, {
                                    method: 'DELETE'
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    setPracticeTests(prev => prev.filter(t => t._id !== test._id));
                                    setOpenMenuId(null);
                                  } else {
                                    alert(data.error || 'Failed to delete');
                                  }
                                } catch (err) {
                                  alert('Failed to delete practice test');
                                }
                              }
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {test.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {test.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {test.subject}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {test.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        ⏱️ {test.timeLimit} min
                      </span>
                      <span className="flex items-center gap-1">
                        🎯 {test.totalPoints} pts
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <span>
                        {test.attempts} {test.attempts === 1 ? 'attempt' : 'attempts'}
                      </span>
                      {test.averageScore !== undefined && (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Avg: {test.averageScore.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'study_notes' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Study Notes</h3>
            <p className="text-gray-500 dark:text-slate-400">Coming soon - Generate comprehensive study notes</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrivateLibraryPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Library</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage and organize your study materials</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#1C2B1C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <PrivateLibraryContent />
    </Suspense>
  );
}