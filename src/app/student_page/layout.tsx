"use client";

import "./student.css";
import { usePathname, useRouter } from "next/navigation";
import Breadcrumbs from "@/components/ui/breadcrumbs/Breadcrumbs";
import Alert from "@/components/ui/alert_template/Alert";
import { useAlert } from "@/hooks/useAlert";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Chatbot from "@/components/chatbot/Chatbot";
import { AchievementProvider, useAchievements } from "@/contexts/AchievementContext";
import GenerationProgressModal from "@/components/ui/GenerationProgressModal";
import NotificationWidget from "@/components/notifications/NotificationWidget";

interface StudentLayoutProps {
  children: React.ReactNode;
}

interface SessionUser {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  [key: string]: unknown; // allow extra fields without using any
}

interface CurrentUserResponseUser extends SessionUser {
  firstName?: string;
  lastName?: string;
  username?: string;
}

interface CurrentUserResponse {
  user?: CurrentUserResponseUser;
}

// Extend Window interface for custom events
declare global {
  interface WindowEventMap {
    profileUpdated: CustomEvent;
  }
}

// Inner component that uses achievement hooks
function AchievementListener() {
  const { checkForNewAchievements } = useAchievements();
  const { data: session } = useSession();

  useEffect(() => {
    // Get user ID from session or localStorage
    const getUserId = () => {
      const localUser = localStorage.getItem('user');
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser);
          return parsed._id || parsed.id;
        } catch {}
      }
      return (session?.user as any)?._id || (session?.user as any)?.id;
    };

    const fetchAndCheckAchievements = async () => {
      const userId = getUserId();
      if (!userId) return;

      try {
        // Fetch minimal data needed for achievement calculation
        const { requestService } = await import('@/services/RequestService');
        const [flashcardsRes, summariesRes, activitiesRes] = await Promise.allSettled([
          requestService.get(`/api/student_page/flashcard?userId=${encodeURIComponent(userId)}`),
          requestService.get(`/api/student_page/summary?userId=${encodeURIComponent(userId)}`),
          requestService.get(`/api/student_page/history?userId=${encodeURIComponent(userId)}&limit=200`)
        ]);

        let flashcards: any[] = [];
        let summaries: any[] = [];
        let activities: any[] = [];

        if (flashcardsRes.status === 'fulfilled' && flashcardsRes.value.success) {
          flashcards = flashcardsRes.value.data?.flashcards || [];
        }

        if (summariesRes.status === 'fulfilled' && summariesRes.value.success) {
          summaries = summariesRes.value.data?.summaries || [];
        }

        if (activitiesRes.status === 'fulfilled' && activitiesRes.value.success) {
          activities = activitiesRes.value.data?.activities || [];
        }

        // Calculate achievements (same logic as achievements page)
        const totalFlashcards = flashcards.length;
        const studySessionsCompleted = activities.filter((a: any) =>
          a.type?.toLowerCase().includes('flashcard.study_complete')
        ).length;
        const summarySessionsCompleted = activities.filter((a: any) =>
          a.type?.toLowerCase().includes('summary.read')
        ).length;
        const practiceTestsCompleted = activities.filter((a: any) =>
          a.type?.toLowerCase().includes('practice_test.submit')
        ).length;
        const cardsReviewed = activities.filter((a: any) =>
          a.type?.toLowerCase().includes('flashcard.card_reviewed')
        ).length;
        const favoritesStudied = activities.filter((a: any) =>
          a.type?.toLowerCase().includes('flashcard.study_complete') && a.metadata?.isFavorite
        ).length;

        // Calculate study streak
        const studyDates = new Set<string>();
        activities.forEach((a: any) => {
          const type = (a.type || '').toString().toLowerCase();
          if (type.includes('flashcard.study_complete') ||
            type.includes('summary.read') ||
            type.includes('practice_test.submit')) {
            const date = new Date(a.createdAt);
            date.setHours(0, 0, 0, 0);
            studyDates.add(date.toISOString());
          }
        });

        let studyStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const key = checkDate.toISOString();

          if (studyDates.has(key)) {
            studyStreak++;
          } else {
            if (i === 0) continue;
            break;
          }
        }

        const totalCards = flashcards.reduce((sum: number, f: any) =>
          sum + (Array.isArray(f.cards) ? f.cards.length : 0), 0);

        // Build achievements array
        const achievements = [
          { id: 1, title: 'First Steps', description: 'Created your first flashcard set', icon: '🎯', earned: totalFlashcards >= 1 },
          { id: 2, title: 'Study Streak', description: 'Studied for 7 days in a row', icon: '🔥', earned: studyStreak >= 7 },
          { id: 3, title: 'Knowledge Master', description: 'Created 10 flashcard sets', icon: '🏆', earned: totalFlashcards >= 10 },
          { id: 4, title: 'Perfect Score', description: 'Got 100% on a practice test', icon: '⭐', earned: practiceTestsCompleted >= 1 },
          { id: 5, title: 'Deck Finisher', description: 'Complete 5 study sessions', icon: '🏁', earned: studySessionsCompleted >= 5 },
          { id: 6, title: 'Streak Holder', description: 'Keep a study streak for 14 days', icon: '📅', earned: studyStreak >= 14 },
          { id: 7, title: 'Flashcard Novice', description: 'Create 3 flashcard sets', icon: '📚', earned: totalFlashcards >= 3 },
          { id: 8, title: 'Flashcard Collector', description: 'Create 25 flashcard sets', icon: '🧩', earned: totalFlashcards >= 25 },
          { id: 9, title: 'Summary Starter', description: 'Read your first summary', icon: '✍️', earned: summarySessionsCompleted >= 1 },
          { id: 10, title: 'Summary Scholar', description: 'Read 5 summaries', icon: '📖', earned: summarySessionsCompleted >= 5 },
          { id: 11, title: 'Review Apprentice', description: 'Review 50 cards', icon: '🔁', earned: cardsReviewed >= 50 },
          { id: 12, title: 'Review Pro', description: 'Review 200 cards', icon: '⚡', earned: cardsReviewed >= 200 },
          { id: 13, title: 'Marathoner', description: 'Study streak of 30 days', icon: '🏃‍♀️', earned: studyStreak >= 30 },
          { id: 14, title: 'Active Week', description: 'Study 7 times in the last 7 days', icon: '📆', earned: false },
          { id: 15, title: 'Session Master', description: 'Complete 10 study sessions', icon: '🎓', earned: studySessionsCompleted >= 10 },
          { id: 16, title: 'Card Collector', description: 'Add 100 cards total', icon: '🃏', earned: totalCards >= 100 },
          { id: 17, title: 'Card Hoarder', description: 'Add 500 cards total', icon: '📦', earned: totalCards >= 500 },
          { id: 18, title: 'Favorites Fan', description: 'Study favorites 3 times', icon: '⭐', earned: favoritesStudied >= 3 },
          { id: 19, title: 'Centurion', description: 'Create 100 flashcard sets', icon: '💯', earned: totalFlashcards >= 100 },
          { id: 20, title: 'Study Champion', description: 'Complete 50 study sessions', icon: '🏅', earned: studySessionsCompleted >= 50 }
        ];

        // Check for newly unlocked achievements
        checkForNewAchievements(achievements);
      } catch (error) {
        console.error('Failed to check achievements:', error);
      }
    };

    // Check immediately
    fetchAndCheckAchievements();

    // Listen for manual trigger events (when user completes an action)
    const handleManualCheck = () => {
      console.log('🎯 Manual achievement check triggered');
      fetchAndCheckAchievements();
    };
    window.addEventListener('checkAchievements', handleManualCheck);

    // Check when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 Page visible - checking achievements');
        fetchAndCheckAchievements();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check when window gains focus
    const handleFocus = () => {
      console.log('🔍 Window focused - checking achievements');
      fetchAndCheckAchievements();
    };
    window.addEventListener('focus', handleFocus);

    // Then check every 3 seconds for real-time updates
    const interval = setInterval(fetchAndCheckAchievements, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('checkAchievements', handleManualCheck);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForNewAchievements, session]);

  return null; // This component doesn't render anything
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession(); // << get NextAuth session with status
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Get user ID from session or localStorage
  const getUserId = () => {
    const localUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        return parsed._id || parsed.id;
      } catch {}
    }
    return (session?.user as any)?._id || (session?.user as any)?.id;
  };


  // Client-side authentication redirect
  useEffect(() => {
    // Check both NextAuth session and manual login
    const hasManualAuth = typeof window !== 'undefined' &&
      localStorage.getItem('accessToken') &&
      localStorage.getItem('user');

    // Only redirect if both NextAuth is unauthenticated AND no manual auth exists
    if (status === "unauthenticated" && !hasManualAuth) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTouchExpanded, setIsTouchExpanded] = useState(false);
  // Mobile off-canvas menu state (separate from collapsed logic used on desktop)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userName, setUserName] = useState<string | null>(null); // << new state
  const [userEmail, setUserEmail] = useState<string | null>(null); // << new state
  const [userImage, setUserImage] = useState<string | null>(null); // << new state
  const [currentTime, setCurrentTime] = useState<string>("");
  const { alert, showAlert, showError, showSuccess, showWarning, showInfo, hideAlert } = useAlert();
  
  // Use a ref to track if we're already handling an alert to prevent loops
  const isHandlingAlertRef = useRef(false);

  // Listen for global alert events (dispatched by useAlert in other components)
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent infinite loop by checking if we're already handling an alert
      if (isHandlingAlertRef.current) return;
      
      const ce = e as CustomEvent | any;
      const detail = ce?.detail;
      if (!detail) return;
      const { type, message, title } = detail;
      
      // Set flag to prevent re-entry
      isHandlingAlertRef.current = true;
      
      if (typeof showAlert === 'function') {
        showAlert(type, message, title);
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        isHandlingAlertRef.current = false;
      }, 100);
    };

    window.addEventListener('notewise:alert', handler as EventListener);
    return () => window.removeEventListener('notewise:alert', handler as EventListener);
  }, [showAlert]);

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = (e: Event) => {
      const ce = e as CustomEvent;
      const detail = ce?.detail;
      if (!detail) return;
      
      const { message, title } = detail;
      showError?.(message, title);
    };

    window.addEventListener('session:expired', handleSessionExpired as EventListener);
    return () => window.removeEventListener('session:expired', handleSessionExpired as EventListener);
  }, [showError]);

  // Setup session monitoring on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { setupSessionMonitoring } = require('@/utils/sessionHandler');
      setupSessionMonitoring();
    }
  }, []);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const bufferActiveRef = useRef(false);
  const COLLAPSE_BUFFER = 96; // px beyond sidebar edge before auto-collapse

  // Function to refresh user data
  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await fetch(`/api/v1/users/current`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (res.ok) {
        const json: CurrentUserResponse = await res.json().catch(() => ({}) as CurrentUserResponse);
        const dbUser = json.user;
        if (!dbUser) return;

        const dbName =
          (dbUser.firstName && dbUser.lastName && `${dbUser.firstName} ${dbUser.lastName}`) ||
          dbUser.username ||
          dbUser.name ||
          null;
        if (typeof dbName === "string") setUserName(dbName);
        if (typeof dbUser.email === "string") setUserEmail(dbUser.email);

        // Prioritize profileImage from database, then fallback to session image
        if (typeof dbUser.profileImage === "string" && dbUser.profileImage) {
          setUserImage(dbUser.profileImage);
        } else if (typeof dbUser.image === "string") {
          setUserImage(dbUser.image);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Try to populate display info from (in order): DB (if available), session, localStorage
  useEffect(() => {
    let mounted = true;

    const applyLocal = () => {
      try {
        const raw = localStorage.getItem("user");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!mounted) return;
        // prefer firstName/lastName, fall back to username or name
        const name =
          (parsed.firstName && parsed.lastName && `${parsed.firstName} ${parsed.lastName}`) ||
          parsed.username ||
          parsed.name ||
          null;
        if (name) setUserName(name);
        if (parsed.email) setUserEmail(parsed.email);

        // Prioritize profileImage from localStorage, then fallback to session image
        if (parsed.profileImage) {
          setUserImage(parsed.profileImage);
        } else if (parsed.image) {
          setUserImage(parsed.image);
        }
      } catch {
        // ignore parse errors
      }
    };

    // apply localStorage immediately if present
    if (typeof window !== "undefined") applyLocal();

    // session.user tends to have name/email/image from Google provider
    if (session?.user) {
      const sUser = session.user as SessionUser;
      if (mounted) {
        if (sUser.name) setUserName((prev) => prev ?? sUser.name ?? null);
        if (sUser.email) setUserEmail((prev) => prev ?? sUser.email ?? null);
        if (sUser.image) setUserImage((prev) => prev ?? sUser.image ?? null);
      }
    }

    // Optionally fetch full user from DB if we have an id + accessToken
    (async () => {
      try {
        const userId = (session?.user as SessionUser | undefined)?.id || localStorage.getItem("userId");
        const token = localStorage.getItem("accessToken");
        if (!userId || !token) return;

        const res = await fetch(`/api/v1/users/current`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!res.ok) {
          // don't throw here — silently ignore so UI falls back to session/local data
          return;
        }

        // The current route returns { user }
        const json: CurrentUserResponse = await res.json().catch(() => ({}) as CurrentUserResponse);
        const dbUser = json.user;
        if (!mounted || !dbUser) return;

        const dbName =
          (dbUser.firstName && dbUser.lastName && `${dbUser.firstName} ${dbUser.lastName}`) ||
          dbUser.username ||
          dbUser.name ||
          null;
        if (typeof dbName === "string") setUserName(dbName);
        if (typeof dbUser.email === "string") setUserEmail(dbUser.email);

        // Prioritize profileImage from database, then fallback to session image
        if (typeof dbUser.profileImage === "string" && dbUser.profileImage) {
          setUserImage(dbUser.profileImage);
        } else if (typeof dbUser.image === "string") {
          setUserImage(dbUser.image);
        }
      } catch {
        // silent fallback; keep session/local values
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      refreshUserData();
    };

    // Listen for custom profile update events
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const stopBufferCollapse = () => {
    bufferActiveRef.current = false;
    if (mouseMoveHandlerRef.current) {
      window.removeEventListener("mousemove", mouseMoveHandlerRef.current);
      mouseMoveHandlerRef.current = null;
    }
  };

  const startBufferCollapse = () => {
    if (bufferActiveRef.current) return;
    const el = sidebarRef.current;
    if (!el) return;
    bufferActiveRef.current = true;
    const rect = el.getBoundingClientRect();
    const thresholdX = rect.right + COLLAPSE_BUFFER;
    const handler = (e: MouseEvent) => {
      if (!bufferActiveRef.current) return;
      if (e.clientX > thresholdX) {
        setIsTouchExpanded(false);
        setIsProfileDropdownOpen(false);

        stopBufferCollapse();
      }
    };
    mouseMoveHandlerRef.current = handler;
    window.addEventListener("mousemove", handler);
  };

  useEffect(() => {
    return () => {
      stopBufferCollapse();
    };
  }, []);

  // Handle touch expansion for mobile devices
  const handleTouchExpansion = () => {
    if (isSidebarCollapsed && isMobile) {
      setIsTouchExpanded(!isTouchExpanded);
    }
  };

  // Auto-collapse touch expansion when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isTouchExpanded && !target.closest("aside")) {
        setIsTouchExpanded(false);
      }
    };

    if (isTouchExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isTouchExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isProfileDropdownOpen && !target.closest(".user-profile")) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      // Auto-expand sidebar on mobile
      if (mobile) {
        setIsSidebarCollapsed(false);
        // Close off-canvas if switching to mobile to avoid inconsistent transform states
        setIsMobileMenuOpen(false);
      }
      if (!mobile) {
        // Ensure body scroll not locked when returning to desktop
        setIsMobileMenuOpen(false);
        document.body.classList.remove("overflow-hidden");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Lock body scroll when mobile sidebar open
  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }, [isMobile, isMobileMenuOpen]);

  // Close mobile menu on ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMobileMenuOpen]);

  // Lock body scroll and close modal on Escape when logout confirmation is open
  useEffect(() => {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLogoutConfirm(false);
    };

    if (showLogoutConfirm) {
      document.body.classList.add("overflow-hidden");
      window.addEventListener("keydown", escHandler);
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      window.removeEventListener("keydown", escHandler);
      document.body.classList.remove("overflow-hidden");
    };
  }, [showLogoutConfirm]);

  // Update current time and date
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const date = now.getDate();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Format time as 12-hour with AM/PM
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, "0");

      const timeString = `${dayName}, ${monthName} ${date} • ${displayHours}:${displayMinutes} ${period}`;
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const toggleDarkMode = () => {
    const currentTheme = localStorage.getItem("theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = async () => {
    try {
      // Clear any existing alerts
      hideAlert && hideAlert();
      
      // Call logout API directly
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');

      // Show appropriate alert then redirect to login
      if (response.ok) {
        showSuccess?.("You have been logged out successfully.", "Logged out");
        setTimeout(() => {
          window.location.href = "/auth/login?message=" + encodeURIComponent("Logged out successfully");
        }, 700);
      } else {
        showError?.(
          "Server logout failed — you were signed out locally. Please sign in again if needed.",
          "Logout"
        );
        setTimeout(() => {
          window.location.href = "/auth/login?message=" + encodeURIComponent("Logout encountered an issue");
        }, 900);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Clear local storage anyway
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      
      showError?.("Network error during logout. You were signed out locally.", "Logout Error");
      setTimeout(() => {
        window.location.href = "/auth/login?message=" + encodeURIComponent("Logout failed");
      }, 900);
    }
  };

  // Helper to determine if sidebar should show expanded content
  const isExpanded = !isSidebarCollapsed || isTouchExpanded;

  return (
    <AchievementProvider>
      <AchievementListener />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        {/* Global Generation Progress Modal */}
        <GenerationProgressModal />
        
        {/* Global alert (used by auth pages and layout actions like logout) */}
        <Alert
        type={alert.type}
        message={alert.message}
        title={alert.title}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        autoClose={alert.type === "success"}
        autoCloseDelay={3000}
        position="top-right"
      />
      {/* Mobile Top Navbar */}
      {isMobile && (
        <header className={`fixed top-0 left-0 right-0 h-14 z-[70] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 backdrop-blur ${isMobileMenuOpen ? "bg-white dark:bg-slate-900" : "bg-white/70 dark:bg-slate-900/50"
          }`}>
          <div className="flex items-center justify-between h-full relative">
            {/* Left: Hamburger Menu */}
            <button
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 z-10"
            >
              {/* Hamburger icon */}
              <svg width="24" height="24" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeWidth={2} strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            {/* Center: Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Link href="/student_page/dashboard" className="flex items-center no-underline">
                <span className="text-lg font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent tracking-tight whitespace-nowrap">NoteWise</span>
              </Link>
            </div>

            {/* Right: Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 z-10"
            >
              <svg className="block dark:hidden" width="20" height="20" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg className="hidden dark:block" width="20" height="20" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
          </div>
        </header>
      )}
      <div className="flex">
        {/* Left Sidebar */}
        <aside
          ref={sidebarRef}
          className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 ${!isExpanded && isProfileDropdownOpen ? "allow-overflow" : "overflow-hidden"
            } fixed left-0 top-0 bottom-0 z-50 shadow-[2px_0_8px_rgba(0,0,0,0.04)] transition-all duration-300 ${isSidebarCollapsed && !isTouchExpanded ? "w-20" : "w-80"
            } ${isMobile ? (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}`}
          onClick={handleTouchExpansion}
          onMouseEnter={() => {
            stopBufferCollapse();
          }}
          onMouseLeave={() => {
            if (!isMobile && isSidebarCollapsed && isTouchExpanded) {
              startBufferCollapse();
            }
          }}
        >
          <div className="flex flex-col h-full max-h-screen">
            {/* Header Section with Title and Search - Fixed Height via CSS var */}
            <div className={`sidebar-header flex-shrink-0 ${isExpanded ? "px-6 pt-6 pb-3" : "p-2"}`}>
              {/* Header with Title and Toggle */}
              <div className="flex items-center justify-between mb-0">
                {isExpanded && (
                  <Link
                    href="/student_page/dashboard"
                    className="flex items-center"
                  >
                    <h1 className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent text-3xl font-extrabold m-0 tracking-tight">
                      NoteWise
                    </h1>
                  </Link>
                )}

                {/* Toggle Button */}
                <div className="flex items-center gap-2">
                  {isMobile ? (
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-label="Close menu"
                      className="p-2 rounded-lg transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <svg width="22" height="22" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                      aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                      className={`p-2 rounded-lg transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ${isSidebarCollapsed ? "mx-auto" : ""
                        }`}
                    >
                      {/* Hamburger icon to match mobile navbar */}
                      <svg width="24" height="24" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Divider line */}
            <div className="border-b border-slate-200 dark:border-slate-800"></div>

            {/* Navigation Section - Scrollable but constrained */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div
                className="h-full overflow-y-auto scrollbar-hide sidebar-nav"
                style={{ maxHeight: "calc(100vh - var(--sidebar-header-height) - var(--sidebar-footer-height))" }}
              >
                <nav className="pt-4 pb-4">
                  <div className="mb-6">
                    <Link
                      href="/student_page/dashboard"
                      className={`flex items-center ${!isExpanded
                        ? "justify-center w-full p-2.5 mx-0"
                        : "gap-4 px-5 py-2.5 mx-4"
                        } text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-300 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-slate-200 ${isExpanded ? "hover:translate-x-1" : ""
                        } ${pathname === "/student_page/dashboard"
                          ? "bg-gradient-to-br from-teal-500/10 to-teal-600/5 text-teal-600 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.1)]"
                          : ""
                        }`}
                      title={!isExpanded ? "Home" : ""}
                    >
                      <svg
                        className={`flex-shrink-0 transition-transform duration-300 hover:scale-110 ${pathname === "/student_page/dashboard"
                          ? "text-teal-600"
                          : ""
                          }`}
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 15v-4a2 2 0 012-2h4a2 2 0 012 2v4"
                        />
                      </svg>
                      {isExpanded && (
                        <span className="whitespace-nowrap">Home</span>
                      )}
                    </Link>



                    {/* Library Link */}
                    {!isExpanded ? (
                      <Link
                        href="/student_page/library"
                        className={`flex items-center justify-center w-full p-2.5 text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-300 mx-0 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-slate-200 ${pathname === "/student_page/library"
                          ? "bg-gradient-to-br from-teal-500/10 to-teal-600/5 text-teal-600 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.1)]"
                          : ""
                          }`}
                        title="Library"
                      >
                        <svg
                          className={`flex-shrink-0 transition-transform duration-300 hover:scale-110 ${pathname === "/student_page/library"
                            ? "text-teal-600 dark:text-slate-200"
                            : ""
                            }`}
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </Link>
                    ) : (
                      <Link
                        href="/student_page/library"
                        className={`flex items-center gap-4 px-5 py-2.5 text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-300 mx-4 w-[calc(100%-2rem)] rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-slate-200 hover:translate-x-1 ${pathname === "/student_page/library"
                          ? "bg-gradient-to-br from-teal-500/10 to-teal-600/5 text-teal-600 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.1)]"
                          : ""
                          }`}
                      >
                        <svg
                          className={`flex-shrink-0 transition-transform duration-300 hover:scale-110 ${pathname === "/student_page/library"
                            ? "text-teal-600 dark:text-slate-200"
                            : ""
                            }`}
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span className="whitespace-nowrap">
                          Library
                        </span>
                      </Link>
                    )}
                  </div>

                  {/* Divider between Library and Flashcards when collapsed */}
                  {!isExpanded && (
                    <div
                      role="separator"
                      aria-orientation="horizontal"
                      className="mx-auto my-3 w-9/12 h-px bg-slate-200 dark:bg-slate-700"
                    />
                  )}

                  <div className="mb-4">
                    {isExpanded && (
                      <div className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider px-6 mb-3">
                        Quick Access
                      </div>
                    )}

                    {/* Flashcards quick-access removed per request */}


                    <Link
                      href="/student_page/study_mode"
                      className={`flex items-center ${!isExpanded
                        ? "justify-center w-full p-2.5 mx-0"
                        : "gap-4 px-5 py-2.5 mx-4"
                        } text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-300 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-slate-200 ${isExpanded ? "hover:translate-x-1" : ""
                        } ${pathname === "/student_page/study_mode"
                          ? "bg-gradient-to-br from-teal-500/10 to-teal-600/5 text-teal-600 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.1)]"
                          : ""
                        }`}
                      title={!isExpanded ? "Study Notes" : ""}
                    >
                      <svg
                        className={`flex-shrink-0 transition-transform duration-300 hover:scale-110 ${pathname === "/student_page/study_mode"
                          ? "text-teal-600 dark:text-slate-200"
                          : ""
                          }`}
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      {isExpanded && (
                        <span className="whitespace-nowrap">Generate</span>
                      )}
                    </Link>

                    {/* Achievements - moved here so it's visible in the main sidebar quick-access */}
                    <Link
                      href="/student_page/achievements"
                      className={`flex items-center ${!isExpanded
                        ? "justify-center w-full p-2.5 mx-0"
                        : "gap-4 px-5 py-2.5 mx-4"
                        } text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-300 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-slate-200 ${isExpanded ? "hover:translate-x-1" : ""
                        } ${pathname === "/student_page/achievements"
                          ? "bg-gradient-to-br from-teal-500/10 to-teal-600/5 text-teal-600 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.1)]"
                          : ""
                        }`}
                      title={!isExpanded ? "Achievements" : ""}
                    >
                      <svg
                        className={`flex-shrink-0 transition-transform duration-300 hover:scale-110 ${pathname === "/student_page/achievements"
                          ? "text-teal-600 dark:text-slate-200"
                          : ""
                          }`}
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                        />
                      </svg>
                      {isExpanded && (
                        <span className="whitespace-nowrap">Achievements</span>
                      )}
                    </Link>

                    {/* Unified History link (shows all activity: summaries, flashcards, practice tests) */}
                    <div className="mt-1">
                      {/* header removed: keep only the History link to avoid duplicate label */}

                      <Link
                        href="/student_page/history"
                        className={`flex items-center ${!isExpanded
                          ? "justify-center w-full p-2.5 mx-0"
                          : "gap-4 px-5 py-2.5 mx-4"
                          } text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-300 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-slate-200 ${isExpanded ? "hover:translate-x-1" : ""
                          } ${pathname === "/student_page/history"
                          ? "bg-gradient-to-br from-teal-500/10 to-teal-600/5 text-teal-600 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.1)]"
                          : ""
                        }`}
                        title={!isExpanded ? "History" : ""}
                      >
                        <svg
                          className={`flex-shrink-0 transition-transform duration-300 hover:scale-110 ${pathname === "/student_page/history" ? "text-teal-600" : ""}`}
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3v4M8 3v4" />
                        </svg>
                        {isExpanded && <span className="whitespace-nowrap">History</span>}
                      </Link>
                    </div>
                  </div>
                </nav>
              </div>
            </div>

                    
            {/* Dynamic Notification Card - Above Profile Section */}
            {isExpanded && (
              <NotificationWidget userId={getUserId()} />
            )}

            {/* Profile Section at Bottom - Fixed Height via CSS var */}
            <div className="sidebar-footer flex-shrink-0 border-t border-slate-200 dark:border-slate-800 p-6">
              <div className="relative user-profile">
                <button
                  className={`flex items-center w-full p-3 rounded-xl transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800 group ${!isExpanded ? "justify-center" : "gap-4"
                    }`}
                  onClick={() => {
                    if (!isExpanded) {
                      setIsProfileDropdownOpen(true);
                      return;
                    }
                    setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  }}
                  title={!isExpanded ? (userName || "Student User") : ""}
                >
                  <div className="relative w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 transition-all duration-300 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 group-hover:border-teal-500 group-hover:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] group-hover:bg-gradient-to-br group-hover:from-teal-500 group-hover:to-teal-600 flex-shrink-0 overflow-hidden">
                    {userImage ? (
                      // Check if it's a Cloudinary image (uploaded profile image) or OAuth provider image
                      userImage.includes('res.cloudinary.com') ? (
                        <img
                          src={userImage}
                          alt="avatar"
                          className="w-full h-full object-cover"
                          onError={() => setUserImage(null)}
                        />
                      ) : (
                        <Image
                          src={userImage}
                          alt="avatar"
                          fill
                          sizes="40px"
                          className="object-cover"
                          onError={() => setUserImage(null)}
                        />
                      )
                    ) : (
                      <svg
                        className="text-slate-500 dark:text-slate-400 transition-colors duration-300 group-hover:text-white"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {userName ?? "Student User"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {userEmail ?? "student@example.com"}
                      </div>
                    </div>
                  )}
                </button>

                {isProfileDropdownOpen && (
                  <div className={`${isExpanded
                    ? "absolute bottom-[calc(100%+0.5rem)] left-0 right-0"
                    : "absolute bottom-[calc(100%+0.5rem)] left-[calc(100%+0.5rem)] w-64"
                    } bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.4),0_10px_10px_-5px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800 z-[1000] overflow-hidden animate-in slide-in-from-bottom-2 duration-200`}>
                    <div className="py-2 border-b border-slate-100 dark:border-slate-800">
                      <Link
                        href="/student_page/profile"
                        className="group flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-200 border-none bg-transparent w-full text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <svg
                          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span>My Profile</span>
                      </Link>

                      <Link
                        href="/student_page/archive"
                        className="group flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-200 border-none bg-transparent w-full text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <svg
                          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                          />
                        </svg>
                        <span>Archive</span>
                      </Link>

                      <button
                        className="group flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-200 border-none bg-transparent w-full text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                        onClick={toggleDarkMode}
                      >
                        <svg
                          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            className="block dark:hidden"
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                          <path
                            className="hidden dark:block"
                            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                          />
                        </svg>
                        <span className="block dark:hidden">Dark mode</span>
                        <span className="hidden dark:block">Light mode</span>
                      </button>
                    </div>

                    <div className="py-2 border-b border-slate-100 dark:border-slate-800">
                      <button
                        className="group flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 no-underline text-sm font-medium transition-all duration-200 border-none bg-transparent w-full text-left cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
                        onClick={() => setShowLogoutConfirm(true)}
                      >
                        <svg
                          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Log out</span>
                      </button>
                    </div>

                    <div className="py-2">
                      <Link
                        href="/student_page/about"
                        className="group flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-200 border-none bg-transparent w-full text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <svg
                          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>About</span>
                      </Link>

                      <Link
                        href="/student_page/privacy_policy"
                        className="group flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-200 border-none bg-transparent w-full text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <svg
                          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5-6v6a7 7 0 11-14 0V6a7 7 0 1114 0z"
                          />
                        </svg>
                        <span>Privacy Policy</span>
                      </Link>

                      <Link
                        href="/student_page/help"
                        className="group flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 no-underline text-sm font-medium transition-all duration-200 border-none bg-transparent w-full text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <svg
                          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Help & Support</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {isMobile && isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Logout confirmation modal (minimal, local to this layout) */}
        {showLogoutConfirm && (
          <>
            <div
              className="fixed inset-0 z-[1200] bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowLogoutConfirm(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-[1201] flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-modal-title"
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="logout-modal-title" className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  Confirm log out
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Are you sure you want to log out? You will be redirected to the login page.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-4 py-2 rounded-lg bg-transparent border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      handleLogout();
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 p-2 sm:p-8 transition-all duration-300 ${isMobile ? "ml-0 pt-16" : isExpanded ? "ml-80" : "ml-20"
            }`}
        >
          {/* Top bar with Breadcrumbs and Time */}
          <div className="flex items-center justify-between mb-6">
            {/* Breadcrumbs only visible on lg and above (hidden on mobile/tablet) */}
            <div className="flex-1">
              <Breadcrumbs />
            </div>

            {/* Current Time and Date - hidden on mobile */}
            {!isMobile && currentTime && (
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap ml-4">
                {currentTime}
              </div>
            )}
          </div>

          {children}
        </main>
      </div>

      {/* Chatbot */}
      <Chatbot isAuthenticated={true} />
    </div>
    </AchievementProvider>
  );
}

