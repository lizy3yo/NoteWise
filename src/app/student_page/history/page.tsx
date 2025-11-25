"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import useAuth from '@/hooks/useAuth';
import { authManager } from '@/utils/auth';
import { 
  FileText, BookOpen, ClipboardCheck, Trash2, Edit, Plus,
  Clock, Calendar, Filter, TrendingUp, Award, RefreshCw,
  Folder, Star, FolderEdit, User, Lock
} from 'lucide-react';

type Activity = {
  _id: string;
  type?: string;
  action?: string;
  meta?: any;
  progress?: number;
  createdAt?: string;
};

type ActivityGroup = {
  date: string;
  activities: Activity[];
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
  'folder.create': 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
  'folder.rename': 'text-sky-600 bg-sky-50 dark:bg-sky-900/20',
  'folder.delete': 'text-red-600 bg-red-50 dark:bg-red-900/20',
  'folder.favorite': 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
  'profile.update': 'text-violet-600 bg-violet-50 dark:bg-violet-900/20',
  'profile.password_change': 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
  
};

export default function HistoryPage() {
  const { user, isLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');

  const fetchActivities = async (userId: string) => {
    try {
      setLoading(true);

      const res = await authManager.makeAuthenticatedRequest(
        `/api/student_page/history?userId=${encodeURIComponent(userId)}`,
        { method: 'GET', credentials: 'include' }
      );

      if (!res.ok) {
        setActivities([]);
        return;
      }
      const data = await res.json();
      // Log fetched activities for debugging types/timestamps
      console.debug('History: fetched activities', data.activities);
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Failed to load activities', err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user && (user as any)._id) {
      fetchActivities((user as any)._id);
    }
  }, [user, isLoading]);

  // Normalize/respect different activity shapes -- some events (login/logout, theme changes)
  // may come back with different field names or only an action. Resolve to a stable
  // type string used for icons, colors and filtering.
  const resolveActivityType = (act: Activity) => {
    if (!act) return '';
    // If server provided a type, trust it first
    if (act.type) return act.type;

    const action = (act.action || '').toString().toLowerCase();

    // Common special cases
    if (action.includes('login')) return 'auth.login';
    if (action.includes('logout')) return 'auth.logout';

    // Theme changes may be recorded as action='theme', 'theme_change', 'dark', 'light', or in meta
    if (action.includes('theme') || action.includes('dark') || action.includes('light') || (act.meta && (act.meta.mode || act.meta.theme))) {
      return 'appearance.theme_change';
    }

    // If meta contains a type, use it
    if (act.meta && typeof act.meta.type === 'string') return act.meta.type;

    // fallback: try to infer category from action words
    if (action.includes('flashcard')) return `flashcard.${action.replace(/\s+/g, '_')}`;
    if (action.includes('summary')) return `summary.${action.replace(/\s+/g, '_')}`;

    // Last resort: return the raw action or empty
    return action || '';
  };

  // Filter and group activities
  const groupedActivities = useMemo(() => {
    if (!activities) return [];

    // prepare resolved types array for debugging and consistent use
    const resolvedMap = new Map<string, string>();
    activities.forEach(act => {
      resolvedMap.set(act._id, resolveActivityType(act));
    });

    let filtered = activities;

    // Filter by type - use a case-insensitive substring match so variants like
    // 'auth.login' or 'authentication.login' both match when filterType is 'auth' or 'authentication'.
    if (filterType !== 'all') {
      const ft = filterType.toLowerCase();
      filtered = filtered.filter(act => {
        const resolved = (resolvedMap.get(act._id) || '').toLowerCase();
        return resolved.includes(ft);
      });
    }

    // Filter by time - if an activity lacks createdAt (e.g. some auth events), include it
    const now = new Date();
    if (timeFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(act => {
        if (!act.createdAt) return true; // include undated activities
        const d = new Date(act.createdAt);
        return !isNaN(d.getTime()) && d >= today;
      });
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(act => {
        if (!act.createdAt) return true;
        const d = new Date(act.createdAt);
        return !isNaN(d.getTime()) && d >= weekAgo;
      });
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(act => {
        if (!act.createdAt) return true;
        const d = new Date(act.createdAt);
        return !isNaN(d.getTime()) && d >= monthAgo;
      });
    }

    // Group by date. Activities without a valid createdAt are grouped under 'Unknown Date'.
  const groups: Record<string, Activity[]> = {};
    const UNKNOWN_KEY = 'Unknown Date';
    filtered.forEach(act => {
      if (!act.createdAt) {
        if (!groups[UNKNOWN_KEY]) groups[UNKNOWN_KEY] = [];
        groups[UNKNOWN_KEY].push(act);
        return;
      }
      const date = new Date(act.createdAt);
      if (isNaN(date.getTime())) {
        if (!groups[UNKNOWN_KEY]) groups[UNKNOWN_KEY] = [];
        groups[UNKNOWN_KEY].push(act);
        return;
      }
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(act);
    });

    // Convert to array and keep Unknown Date at the top if present
    const entries = Object.entries(groups).map(([date, activities]) => ({ date, activities }));
    entries.sort((a, b) => {
      if (a.date === UNKNOWN_KEY) return -1;
      if (b.date === UNKNOWN_KEY) return 1;
      // parse dates - newest first
      const ad = new Date(a.date).getTime();
      const bd = new Date(b.date).getTime();
      return bd - ad;
    });

    return entries;
  }, [activities, filterType, timeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!activities) return { total: 0, flashcards: 0, summaries: 0 };
    let flashcards = 0, summaries = 0;
    activities.forEach(a => {
      const rt = resolveActivityType(a);
      if (rt.startsWith('flashcard')) flashcards++;
      if (rt.startsWith('summary')) summaries++;
    });
    return {
      total: activities.length,
      flashcards,
      summaries,
    };
  }, [activities]);

  const formatActivityLabel = (type: string | undefined, action: string | undefined) => {
    const t = (type || '').toString();
    const parts = t.split('.');
    const category = (parts[0] || '').replace('_', ' ');
    const actionPart = action || parts[1] ? (parts[1] || '').replace(/_/g, ' ') : '';
    const titleCategory = category ? `${category.charAt(0).toUpperCase() + category.slice(1)}` : '';
    return `${titleCategory} ${actionPart}`.trim();
  };

  const getActivityIcon = (type: string) => {
    // try the exact key, then lowercase fallback, else default
    const Icon = activityIcons[type] || activityIcons[type.toLowerCase?.()] || Clock;
    return Icon;
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-0">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Activity History</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Track all your learning activities and progress
            </p>
          </div>
          <button
            onClick={() => user && (user as any)._id && fetchActivities((user as any)._id)}
            className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border border-teal-200 dark:border-teal-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Total</p>
                <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{stats.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Flashcards</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.flashcards}</p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Summaries</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.summaries}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          {/* Tests stats removed */}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Activities</option>
              <option value="flashcard">Flashcards</option>
              <option value="summary">Summaries</option>
              {/* Practice Tests option removed */}
              <option value="folder">Folders</option>
              {/* Profile filter removed */}
              
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Time:</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-6">
        {loading || isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading activity...</p>
            </div>
          </div>
        ) : groupedActivities.length > 0 ? (
          groupedActivities.map((group) => (
            <div key={group.date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                  {group.date}
                </h3>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Activities */}
              <div className="space-y-2">
                {group.activities.map((act) => {
                  // resolve the type so display is consistent even if server sends different shapes
                  const resolvedType = resolveActivityType(act);
                  // debug: show resolved type in console when needed
                  // console.debug('Activity resolved type', act._id, resolvedType);
                  const Icon = getActivityIcon(resolvedType);
                  const colorClass = activityColors[resolvedType] || 'text-slate-600 bg-slate-50 dark:bg-slate-800';

                  // Extra derived display data for flashcard events
                  const isStudyComplete = resolvedType.startsWith('flashcard.study_complete');
                  const isFlashcardUpdate = resolvedType.startsWith('flashcard.update');

                  // Study-complete: try multiple possible meta shapes
                  const studiedCount = act.meta?.cardCount ?? (Array.isArray(act.meta?.cardIds) ? act.meta.cardIds.length : undefined);
                  const correctCount = act.meta?.correctCount ?? act.meta?.correct ?? undefined;
                  const totalCount = act.meta?.total ?? (studiedCount ?? undefined);
                  const percent = (typeof correctCount === 'number' && typeof totalCount === 'number' && totalCount > 0)
                    ? Math.round((correctCount / totalCount) * 100)
                    : undefined;

                  // Update: list updated fields or present changes array with before/after
                  const updatedFields = act.meta?.updatedFields ?? (Array.isArray(act.meta?.changes) ? act.meta.changes.map((c: any) => c.field || c.key).filter(Boolean) : undefined);
                  const changes = Array.isArray(act.meta?.changes) ? act.meta.changes : undefined;
                  
                  return (
                    <div
                      key={act._id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg ${colorClass} flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 dark:text-white">
                                {formatActivityLabel(resolvedType, act.action)}
                              </h4>
                              {act.meta?.title && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                  {act.meta.title}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                {/* Existing explicit meta badges */}
                                {act.meta?.cardCount !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    {act.meta.cardCount} cards
                                  </span>
                                )}
                                {act.meta?.wordCount !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {act.meta.wordCount} words
                                  </span>
                                )}
                                {act.meta?.score !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    Score: {act.meta.score}%
                                  </span>
                                )}
                                {act.meta?.subject && (
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                                    {act.meta.subject}
                                  </span>
                                )}

                                {/* Added: readable details for flashcard study completions */}
                                {isStudyComplete && (studiedCount !== undefined || correctCount !== undefined) && (
                                  <span className="flex items-center gap-2">
                                    <BookOpen className="w-3 h-3" />
                                    <span>
                                      {studiedCount ?? totalCount ?? '1'} card{(studiedCount ?? totalCount ?? 1) > 1 ? 's' : ''}
                                      {typeof correctCount === 'number' ? ` · ${correctCount} correct${typeof percent === 'number' ? ` (${percent}%)` : ''}` : ''}
                                    </span>
                                  </span>
                                )}

                                {/* Added: readable details for flashcard updates */}
                                {isFlashcardUpdate && updatedFields && updatedFields.length > 0 && (
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                                    Updated: {updatedFields.join(', ')}
                                  </span>
                                )}
                              </div>

                              {/* If changes array present, show a compact before/after list */}
                              {isFlashcardUpdate && Array.isArray(changes) && changes.length > 0 && (
                                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  {changes.map((c: any, i: number) => (
                                    <div key={i} className="mb-1">
                                      <span className="font-medium">{c.field ?? c.key ?? 'field'}</span>
                                      {c.before !== undefined || c.after !== undefined ? (
                                        <span className="ml-2">{String(c.before ?? '')} → {String(c.after ?? '')}</span>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3" />
                              {act.createdAt ? new Date(act.createdAt).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              }) : ''}
                            </div>
                          </div>

                          {typeof act.progress === 'number' && act.progress < 100 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                                <span>Progress</span>
                                <span>{act.progress}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-2 bg-teal-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, act.progress))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full">
                <Clock className="w-12 h-12 text-slate-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">No Activity Yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  {filterType !== 'all' || timeFilter !== 'all' 
                    ? 'No activities found for the selected filters. Try adjusting your filters.'
                    : 'Start creating flashcards or summaries to see your activity here.'}
                </p>
              </div>
              {(filterType !== 'all' || timeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setFilterType('all');
                    setTimeFilter('all');
                  }}
                  className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
