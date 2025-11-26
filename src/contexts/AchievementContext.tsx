'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AchievementUnlockToast from '@/components/achievements/AchievementUnlockToast';

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  earned?: boolean;
}

interface AchievementContextType {
  checkForNewAchievements: (currentAchievements: Achievement[]) => void;
  showAchievement: (achievement: { title: string; description: string; icon: string }) => void;
  showAllUnlocked: (currentAchievements: Achievement[]) => void;
  resetTracking: () => void;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [unlockedAchievement, setUnlockedAchievement] = useState<{
    title: string;
    description: string;
    icon: string;
  } | null>(null);
  
  // Initialize from localStorage immediately to prevent false "new" detections
  const [previouslyUnlockedIds, setPreviouslyUnlockedIds] = useState<Set<number>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const unlockedRaw = localStorage.getItem('unlocked_achievements');
        const hasSeenInitial = localStorage.getItem('achievements_initialized');
        
        // If this is the first time, don't load from localStorage
        // This ensures all earned achievements show notifications on first visit
        if (!hasSeenInitial) {
          console.log('🆕 First time initialization - will show all earned achievements');
          localStorage.setItem('achievements_initialized', 'true');
          return new Set();
        }
        
        if (unlockedRaw) {
          const ids = JSON.parse(unlockedRaw);
          console.log('🔄 Initialized previously unlocked IDs from localStorage:', ids);
          return new Set(ids);
        }
      }
    } catch (e) {
      console.error('Failed to load unlocked achievements:', e);
    }
    return new Set();
  });
  
  // Mark as initialized immediately - we've already loaded from localStorage
  const [isInitialized, setIsInitialized] = useState(true);

  console.log('🌍 AchievementProvider rendering, current unlocked achievement:', unlockedAchievement);

  // Log when mounted
  useEffect(() => {
    console.log('🌍 AchievementProvider MOUNTED with previously unlocked:', Array.from(previouslyUnlockedIds));
  }, []);

  const checkForNewAchievements = (currentAchievements: Achievement[]) => {
    // Don't check until initialized to prevent false positives
    if (!isInitialized) {
      console.log('⏸️ Skipping check - not yet initialized');
      return;
    }
    
    console.log('🔍 Checking for new achievements...', {
      totalAchievements: currentAchievements.length,
      previouslyUnlocked: Array.from(previouslyUnlockedIds),
      currentAchievements: currentAchievements.map(a => ({ id: a.id, title: a.title, earned: a.earned }))
    });
    
    const unlocked = currentAchievements.filter(a => a.earned);
    console.log('🎯 Currently unlocked achievements:', unlocked.map(a => ({ id: a.id, title: a.title })));
    
    const currentlyUnlockedIds = new Set(unlocked.map(a => a.id));
    
    // Check if the sets are actually different before doing anything
    const hasChanges = currentlyUnlockedIds.size !== previouslyUnlockedIds.size ||
      Array.from(currentlyUnlockedIds).some(id => !previouslyUnlockedIds.has(id));
    
    if (!hasChanges) {
      console.log('ℹ️ No changes in unlocked achievements');
      return;
    }
    
    // Find ALL newly unlocked achievements (not in previous set but in current set)
    const newlyUnlockedList = unlocked.filter(a => !previouslyUnlockedIds.has(a.id));
    
    console.log('✨ Newly unlocked achievements:', newlyUnlockedList.map(a => a.title));
    
    if (newlyUnlockedList.length > 0) {
      // Show notifications for each newly unlocked achievement with a delay between them
      newlyUnlockedList.forEach((achievement, index) => {
        setTimeout(() => {
          console.log(`🎉 SHOWING ACHIEVEMENT TOAST ${index + 1}/${newlyUnlockedList.length}:`, achievement.title);
      
          // Log achievement to activity feed (only if not recently logged)
          try {
            const localUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            let userId = null;
            if (localUser) {
              const parsed = JSON.parse(localUser);
              userId = parsed._id || parsed.id;
            }
            
            console.log('📝 Logging achievement to activity feed...', {
              userId,
              title: achievement.title,
              description: achievement.description,
              icon: achievement.icon
            });
            
            if (userId) {
              fetch('/api/student_page/log-achievement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  userId,
                  achievementTitle: achievement.title,
                  achievementDescription: achievement.description,
                  achievementIcon: achievement.icon
                })
              })
              .then(res => res.json())
              .then(data => {
                console.log('✅ Achievement logged successfully:', data);
                // Trigger a refresh of the notification widget
                window.dispatchEvent(new CustomEvent('achievement:unlocked'));
              })
              .catch(err => console.error('❌ Failed to log achievement:', err));
            } else {
              console.error('❌ No userId found, cannot log achievement');
            }
          } catch (e) {
            console.error('❌ Failed to log achievement to activity feed:', e);
          }
          
          // Show toast for the newly unlocked achievement
          setUnlockedAchievement({
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon
          });
        }, index * 6000); // 6 seconds between each notification (5s display + 1s gap)
      });
      
      // Update localStorage with all unlocked IDs (after all notifications are queued)
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('unlocked_achievements', JSON.stringify(Array.from(currentlyUnlockedIds)));
          console.log('💾 Saved to localStorage:', Array.from(currentlyUnlockedIds));
        }
      } catch (e) {
        console.error('Failed to save unlocked achievements:', e);
      }
      
      // Update state
      setPreviouslyUnlockedIds(currentlyUnlockedIds);
    }
  };

  const showAchievement = (achievement: { title: string; description: string; icon: string }) => {
    setUnlockedAchievement(achievement);
  };

  const showAllUnlocked = (currentAchievements: Achievement[]) => {
    const unlocked = currentAchievements.filter(a => a.earned);
    console.log('🎊 Showing ALL unlocked achievements:', unlocked.length);
    
    if (unlocked.length === 0) {
      console.log('⚠️ No unlocked achievements to show');
      return;
    }
    
    // Show them one by one with a delay
    unlocked.forEach((achievement, index) => {
      setTimeout(() => {
        console.log(`📢 Showing achievement ${index + 1}/${unlocked.length}:`, achievement.title);
        setUnlockedAchievement({
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon
        });
      }, index * 6000); // 6 seconds between each (5s display + 1s gap)
    });
    
    // Update localStorage with all unlocked IDs
    const currentlyUnlockedIds = new Set(unlocked.map(a => a.id));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('unlocked_achievements', JSON.stringify(Array.from(currentlyUnlockedIds)));
      }
    } catch (e) {
      console.error('Failed to save unlocked achievements:', e);
    }
    setPreviouslyUnlockedIds(currentlyUnlockedIds);
  };

  const resetTracking = async () => {
    console.log('🔄 Resetting achievement tracking...');
    setPreviouslyUnlockedIds(new Set());
    
    try {
      if (typeof window !== 'undefined') {
        // Clear localStorage
        localStorage.removeItem('unlocked_achievements');
        localStorage.removeItem('achievements_initialized');
        localStorage.removeItem('dismissed_notification');
        localStorage.removeItem('dismissed_notifications');
        
        // Get user ID
        const localUser = localStorage.getItem('user');
        let userId = null;
        if (localUser) {
          const parsed = JSON.parse(localUser);
          userId = parsed._id || parsed.id;
        }
        
        // Clear database achievement logs (development only)
        if (userId && process.env.NODE_ENV !== 'production') {
          try {
            const response = await fetch('/api/dev/reset-achievements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ userId })
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`✅ Deleted ${data.deletedCount} achievement logs from database`);
            }
          } catch (err) {
            console.warn('Could not clear database logs:', err);
          }
        }
        
        console.log('✅ Achievement tracking reset complete!');
        console.log('🔄 Refresh the page to see notifications for all earned achievements');
      }
    } catch (e) {
      console.error('Failed to reset tracking:', e);
    }
  };
  
  // Expose reset function globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).resetAchievements = resetTracking;
      console.log('💡 Debug: Run window.resetAchievements() in console to reset and see notifications again');
    }
  }, []);

  return (
    <AchievementContext.Provider value={{ checkForNewAchievements, showAchievement, showAllUnlocked, resetTracking }}>
      {children}
      {/* Global achievement toast - appears on all pages */}
      <AchievementUnlockToast
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (context === undefined) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
}
