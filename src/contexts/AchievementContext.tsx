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
  const [previouslyUnlockedIds, setPreviouslyUnlockedIds] = useState<Set<number>>(new Set());

  console.log('🌍 AchievementProvider rendering, current unlocked achievement:', unlockedAchievement);

  // Load previously unlocked achievement IDs from localStorage on mount
  useEffect(() => {
    console.log('🌍 AchievementProvider MOUNTED');
    try {
      const unlockedRaw = typeof window !== 'undefined' ? localStorage.getItem('unlocked_achievements') : null;
      if (unlockedRaw) {
        const ids = JSON.parse(unlockedRaw);
        setPreviouslyUnlockedIds(new Set(ids));
      }
    } catch (e) {
      console.error('Failed to load unlocked achievements:', e);
    }
  }, []);

  const checkForNewAchievements = (currentAchievements: Achievement[]) => {
    console.log('🔍 Checking for new achievements...', {
      totalAchievements: currentAchievements.length,
      previouslyUnlocked: Array.from(previouslyUnlockedIds),
      currentAchievements: currentAchievements.map(a => ({ id: a.id, title: a.title, earned: a.earned }))
    });
    
    const unlocked = currentAchievements.filter(a => a.earned);
    console.log('🎯 Currently unlocked achievements:', unlocked.map(a => ({ id: a.id, title: a.title })));
    
    const currentlyUnlockedIds = new Set(unlocked.map(a => a.id));
    
    // Find newly unlocked achievement (not in previous set but in current set)
    const newlyUnlocked = unlocked.find(a => !previouslyUnlockedIds.has(a.id));
    
    console.log('✨ Newly unlocked achievement:', newlyUnlocked ? newlyUnlocked.title : 'None');
    
    if (newlyUnlocked) {
      // Check if we recently showed this achievement (within last 10 seconds)
      const lastShownKey = `achievement_shown_${newlyUnlocked.id}`;
      const lastShownTime = typeof window !== 'undefined' ? localStorage.getItem(lastShownKey) : null;
      const now = Date.now();
      
      if (lastShownTime && (now - parseInt(lastShownTime)) < 10000) {
        console.log('⏭️ Skipping - achievement was shown recently');
        // Still update the tracking to prevent showing again
        setPreviouslyUnlockedIds(currentlyUnlockedIds);
        return;
      }
      
      console.log('🎉 SHOWING ACHIEVEMENT TOAST:', newlyUnlocked.title);
      // Show toast for the newly unlocked achievement
      setUnlockedAchievement({
        title: newlyUnlocked.title,
        description: newlyUnlocked.description,
        icon: newlyUnlocked.icon
      });
      
      // Update localStorage with all unlocked IDs and timestamp
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('unlocked_achievements', JSON.stringify(Array.from(currentlyUnlockedIds)));
          localStorage.setItem(lastShownKey, now.toString());
          console.log('💾 Saved to localStorage:', Array.from(currentlyUnlockedIds));
        }
      } catch (e) {
        console.error('Failed to save unlocked achievements:', e);
      }
      
      // Update state
      setPreviouslyUnlockedIds(currentlyUnlockedIds);
    } else {
      console.log('ℹ️ No new achievements unlocked');
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

  const resetTracking = () => {
    console.log('🔄 Resetting achievement tracking');
    setPreviouslyUnlockedIds(new Set());
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('unlocked_achievements');
      }
    } catch (e) {
      console.error('Failed to reset tracking:', e);
    }
  };

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
