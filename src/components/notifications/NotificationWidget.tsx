"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Activity {
  _id: string;
  type: string;
  action: string;
  meta?: any;
  createdAt: string;
}

interface NotificationWidgetProps {
  userId?: string;
}

export default function NotificationWidget({ userId }: NotificationWidgetProps) {
  const [latestNotification, setLatestNotification] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Clear invalid notifications on first load
    const clearInvalidNotifications = async () => {
      try {
        await fetch('/api/student_page/clear-invalid-notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId })
        });
      } catch (err) {
        console.error('Failed to clear invalid notifications:', err);
      }
    };

    clearInvalidNotifications();

    const fetchLatestNotification = async (skipGeneration = false) => {
      try {
        console.log('🔔 Fetching notifications for user:', userId);
        
        // Only check for streaks and milestones on regular intervals, not on achievement unlock
        if (!skipGeneration) {
          // Check for streak notifications
          const streakRes = await fetch('/api/student_page/check-streaks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId })
          });
          
          if (streakRes.ok) {
            const streakData = await streakRes.json();
            console.log('✅ Streak check result:', streakData);
          }

          // Generate milestone notifications
          const milestoneRes = await fetch('/api/student_page/generate-notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId })
          });
          
          if (milestoneRes.ok) {
            const milestoneData = await milestoneRes.json();
            console.log('✅ Milestone check result:', milestoneData);
          }
        }

        // Fetch latest notification
        const res = await fetch(`/api/student_page/history?userId=${encodeURIComponent(userId)}&limit=50`, {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          const activities = data.activities || [];
          console.log('📊 Total activities fetched:', activities.length);
          
          // Find the latest notification/achievement/streak
          const notification = activities.find((a: Activity) => {
            const type = a.type.toLowerCase();
            
            // Skip "Active Week" achievements - they're calculated incorrectly
            if (a.meta?.achievement === 'Active Week' || 
                a.meta?.title?.includes('Active Week') ||
                a.action?.includes('Active Week')) {
              console.log('⏭️ Skipping Active Week notification (needs validation)');
              return false;
            }
            
            return type.includes('notification') || type.includes('achievement') || type.includes('streak');
          });
          
          console.log('🎯 Latest notification found:', notification);
          
          // Only show if it's from the last 7 days
          if (notification) {
            const notificationDate = new Date(notification.createdAt);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            if (notificationDate > sevenDaysAgo) {
              console.log('✅ Showing notification:', notification.meta?.title || notification.action);
              setLatestNotification(notification);
            } else {
              console.log('⏰ Notification too old, not showing');
            }
          } else {
            console.log('❌ No notification found in activities');
          }
        }
      } catch (error) {
        console.error('Failed to fetch notification:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestNotification();
    
    // Listen for achievement unlock events
    const handleAchievementUnlock = () => {
      console.log('🎉 Achievement unlocked event received, refreshing notification...');
      setTimeout(() => {
        fetchLatestNotification(true); // Skip generation, just fetch
      }, 1000); // Wait 1 second for the API to finish
    };
    
    window.addEventListener('achievement:unlocked', handleAchievementUnlock);
    
    // Refresh every 60 seconds
    const interval = setInterval(() => fetchLatestNotification(), 60000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('achievement:unlocked', handleAchievementUnlock);
    };
  }, [userId]);

  if (loading || !latestNotification) {
    return null;
  }

  const title = latestNotification.meta?.title || latestNotification.action || 'New Notification';
  const description = latestNotification.meta?.description || 'You have a new notification!';
  const actionText = latestNotification.meta?.actionText || "Let's Go!";
  const actionLink = latestNotification.meta?.actionLink || '/student_page/dashboard';
  
  // Check if notification is from last 24 hours
  const isNew = new Date(latestNotification.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <div className="flex-shrink-0 px-6 pb-4">
      <div className="notification-card bg-transparent rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {isNew && (
              <div className="notification-badge inline-flex items-center px-2.5 py-1 rounded-full bg-teal-600 text-white text-xs font-bold mb-2">
                New
              </div>
            )}
            <h3 className="text-slate-800 dark:text-white text-sm font-semibold mb-1">
              {title}
            </h3>
            <p className="text-slate-600 dark:text-[#BCBCBC] text-xs leading-relaxed mb-3">
              {description}
            </p>
            <Link
              href={actionLink}
              className="notification-action block w-full bg-transparent border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-transparent text-center no-underline"
            >
              {actionText}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
