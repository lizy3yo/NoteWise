"use client";

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Clock, BookOpen, FileText, Award, Folder, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Activity {
  _id: string;
  type: string;
  action: string;
  meta?: any;
  createdAt: string;
}

interface NotificationCenterProps {
  userId?: string;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all activities and check for streaks
  useEffect(() => {
    if (!userId) return;

    const fetchActivities = async () => {
      setLoading(true);
      try {
        // Check for streak notifications
        fetch('/api/student_page/check-streaks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId })
        }).catch(err => console.error('Failed to check streaks:', err));

        // Generate milestone notifications
        fetch('/api/student_page/generate-notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId })
        }).catch(err => console.error('Failed to generate notifications:', err));

        // Fetch activities
        const res = await fetch(`/api/student_page/history?userId=${encodeURIComponent(userId)}&limit=100`, {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
          
          // Calculate unread (activities from last 24 hours)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const unread = (data.activities || []).filter((a: Activity) => 
            new Date(a.createdAt) > oneDayAgo
          ).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getActivityIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('flashcard')) return <BookOpen className="w-4 h-4" />;
    if (t.includes('summary')) return <FileText className="w-4 h-4" />;
    if (t.includes('achievement')) return <Award className="w-4 h-4" />;
    if (t.includes('folder')) return <Folder className="w-4 h-4" />;
    if (t.includes('favorite')) return <Star className="w-4 h-4" />;
    if (t.includes('streak')) return <TrendingUp className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getActivityColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('flashcard')) return 'text-teal-600 bg-teal-50 dark:bg-teal-900/20';
    if (t.includes('summary')) return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
    if (t.includes('achievement')) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
    if (t.includes('folder')) return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20';
    if (t.includes('favorite')) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20';
  };

  const formatActivityMessage = (activity: Activity) => {
    const type = activity.type.toLowerCase();
    const meta = activity.meta || {};
    
    // Flashcard activities
    if (type.includes('flashcard.create')) {
      const title = meta.title || meta.flashcardTitle || 'a flashcard set';
      return `Created "${title}"`;
    }
    if (type.includes('flashcard.study_complete')) {
      const title = meta.title || meta.flashcardTitle || 'flashcards';
      return `Studied "${title}"`;
    }
    if (type.includes('flashcard.generate')) return 'Generated flashcards with AI';
    if (type.includes('flashcard.update')) return 'Updated a flashcard set';
    if (type.includes('flashcard.delete')) return 'Deleted a flashcard set';
    
    // Summary activities
    if (type.includes('summary.generate')) {
      const title = meta.title || meta.summaryTitle || 'a summary';
      return `Generated "${title}"`;
    }
    if (type.includes('summary.read')) {
      const title = meta.title || meta.summaryTitle || 'a summary';
      return `Read "${title}"`;
    }
    if (type.includes('summary.update')) return 'Updated a summary';
    if (type.includes('summary.delete')) return 'Deleted a summary';
    
    // Folder activities
    if (type.includes('folder.create')) {
      const title = meta.title || meta.folderName || 'a folder';
      return `Created folder "${title}"`;
    }
    if (type.includes('folder.rename')) return 'Renamed a folder';
    if (type.includes('folder.delete')) return 'Deleted a folder';
    if (type.includes('folder.favorite')) return 'Added to favorites ⭐';
    
    // Achievement activities
    if (type.includes('achievement')) {
      const achievementName = meta.achievement || meta.title || 'an achievement';
      return `🏆 Unlocked: ${achievementName}`;
    }
    
    // Practice test activities
    if (type.includes('practice_test.submit')) {
      const score = meta.score;
      return score ? `Completed test (${score}% score)` : 'Completed a practice test';
    }
    if (type.includes('practice_test.generate')) return 'Generated a practice test';
    
    // Profile activities
    if (type.includes('profile.update')) return 'Updated profile';
    if (type.includes('profile.password_change')) return 'Changed password';
    
    return activity.action || 'Activity recorded';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-[100] max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unreadCount} new {unreadCount === 1 ? 'notification' : 'notifications'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification Cards List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No notifications yet
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  Your activity will appear here
                </p>
              </div>
            ) : (
              <>
                {activities.map((activity) => {
                  const isRecent = new Date(activity.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
                  const type = activity.type.toLowerCase();
                  
                  // Special card for achievements, streaks, and notifications
                  if (type.includes('achievement') || type.includes('streak') || type.includes('notification')) {
                    const title = activity.meta?.title || activity.meta?.achievement || formatActivityMessage(activity);
                    const description = activity.meta?.description || 'Great job! Keep it up!';
                    const actionText = activity.meta?.actionText || "Let's Go!";
                    const actionLink = activity.meta?.actionLink || '/student_page/dashboard';
                    
                    return (
                      <div
                        key={activity._id}
                        className="notification-card bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            {isRecent && (
                              <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-600 text-white text-xs font-bold mb-2">
                                New
                              </div>
                            )}
                            <h3 className="text-slate-800 dark:text-white text-base font-bold mb-1.5">
                              {title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                              {description}
                            </p>
                            <Link
                              href={actionLink}
                              onClick={() => setIsOpen(false)}
                              className="block w-full bg-transparent border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-center no-underline"
                            >
                              {actionText}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Regular activity items
                  return (
                    <div
                      key={activity._id}
                      className={`p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 ${
                        isRecent ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getActivityColor(activity.type)} flex-shrink-0`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatActivityMessage(activity)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {getTimeAgo(activity.createdAt)}
                          </p>
                        </div>
                        {isRecent && (
                          <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/student_page/history"
              className="block text-center text-sm text-teal-600 dark:text-teal-400 hover:underline"
              onClick={() => setIsOpen(false)}
            >
              View all activity
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
