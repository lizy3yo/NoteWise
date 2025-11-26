"use client";

import React, { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PrimaryActionButton from '@/components/ui/buttons/PrimaryActionButton';
import { useAlert } from '@/hooks/useAlert';
import { useFlashcardRequest, useSummaryRequest } from '@/hooks';
import { requestService } from '@/services/RequestService';
import GenerationProgressModal, { startGeneration, updateGenerationProgress, addGenerationResult, completeGeneration } from '@/components/ui/GenerationProgressModal';
// Alert rendering removed here; use the global Alert in student_page/layout.tsx

type FlashcardItem = {
  _id: string;
  title: string;
  description?: string;
  cards?: Array<{ _id: string; question: string; answer: string }>;
  tags?: string[];
  subject?: string;
  image?: string;
  folder?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  lastReviewed?: Date | string;
  repetitionCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type SummaryItem = {
  _id: string;
  title: string;
  content: string;
  subject: string;
  difficulty: string;
  summaryType: string;
  wordCount: number;
  readingTime: number;
  keyPoints: string[];
  mainTopics: string[];
  compressionRatio: number;
  confidence: number;
  tags: string[];
  folder?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  isRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function PrivateLibraryContent() {
  // Initialize activeTab with a stable default to prevent hydration mismatch
  const [activeTab, setActiveTab] = useState<'flashcards' | 'study_notes' | 'folders' | 'favorites'>('favorites');
  const [isClient, setIsClient] = useState(false);

  // Load saved tab from localStorage after mount (client-side only)
  useEffect(() => {
    setIsClient(true);
    const savedTab = localStorage.getItem('library_active_tab');
    if (savedTab && ['flashcards', 'study_notes', 'folders', 'favorites'].includes(savedTab)) {
      setActiveTab(savedTab as 'flashcards' | 'study_notes' | 'folders' | 'favorites');
    }
  }, []);
  const [filter, setFilter] = useState('recent');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null); // Track which folder is open

  const [userId, setUserId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [summaryReadActivityIds, setSummaryReadActivityIds] = useState<Set<string>>(() => new Set());
  const [flashcardCompletedActivityIds, setFlashcardCompletedActivityIds] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState<boolean>(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');
  const [openSubMenu, setOpenSubMenu] = useState<'share' | 'organize' | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareItem, setShareItem] = useState<FlashcardItem | null>(null);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string, type: 'flashcard' | 'summary', title: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState<boolean>(false);
  const [createFolderName, setCreateFolderName] = useState<string>('');

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDangerous: false
  });

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameModalConfig, setRenameModalConfig] = useState<{
    title: string;
    currentValue: string;
    onConfirm: (newValue: string) => void;
  }>({
    title: '',
    currentValue: '',
    onConfirm: () => {}
  });
  const [renameValue, setRenameValue] = useState<string>('');

  // Alert system
  const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert();

  const router = useRouter();

  // Helper function to format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} - ${timeStr}`;
  };

  const isFlashcardCompleted = (item: FlashcardItem) => {
    if (!item) return false;
    // Consider a flashcard completed if it has been reviewed or has positive repetition count
    if (item.lastReviewed) return true;
    if (typeof item.repetitionCount === 'number' && item.repetitionCount > 0) return true;
    // Fallback: check activity-derived completions (some flows only emit activities)
    try {
      if (flashcardCompletedActivityIds && flashcardCompletedActivityIds.has(item._id)) return true;
    } catch (e) {
      // ignore
    }
    return false;
  };

  const isSummaryCompleted = (s: SummaryItem) => {
    if (!s) return false;
    // Primary signal: summary.isRead
    if (s.isRead) return true;
    // Some flows only create an activity instead of updating the summary document — check activity cache
    try {
      if (summaryReadActivityIds && summaryReadActivityIds.has(s._id)) return true;
    } catch (e) {
      // ignore
    }
    return false;
  };

  // Track viewed items
  const [viewedItems, setViewedItems] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('viewed_library_items');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch (e) {
        return new Set();
      }
    }
    return new Set();
  });

  // Helper function to check if item is new (created within last 24 hours and not viewed)
  const isNewItem = (dateString: string, itemId: string) => {
    const itemDate = new Date(dateString);
    const now = new Date();
    const hoursDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24 && !viewedItems.has(itemId);
  };

  // Mark item as viewed
  const markAsViewed = (itemId: string) => {
    const newViewed = new Set(viewedItems);
    newViewed.add(itemId);
    setViewedItems(newViewed);
    
    // Save to localStorage
    try {
      localStorage.setItem('viewed_library_items', JSON.stringify(Array.from(newViewed)));
    } catch (e) {
      console.error('Failed to save viewed items:', e);
    }
  };

  // Toggle flashcard completed state (uses lastReviewed as 'completed' flag)
  const toggleFlashcardCompleted = async (id: string, currentCompleted: boolean) => {
    if (!userId) return;
    const updateData = currentCompleted
      ? { lastReviewed: undefined, repetitionCount: 0 }
      : { lastReviewed: new Date().toISOString() };
    
    const response = await hookUpdateFlashcard(id, updateData);
    if (response.success) {
      showSuccess(currentCompleted ? 'Marked as not completed' : 'Marked as completed');
    } else {
      showError(response.error || 'Failed to update completed state');
    }
  };

  // Toggle summary read/unread
  const toggleSummaryRead = async (id: string, currentRead: boolean) => {
    if (!userId) return;
    const response = await hookUpdateSummary(id, { isRead: !currentRead });
    
    if (response.success) {
      // Broadcast the change so other tabs update
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('notewise.activities');
          bc.postMessage({ type: 'summary.read', summaryId: id });
          bc.close();
        }
      } catch (e) {
        // ignore
      }

      showSuccess(!currentRead ? 'Marked as read' : 'Marked as unread');
    } else {
      showError(response.error || 'Failed to update read state');
    }
  };
  const searchParams = useSearchParams();

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(event.target.value);
  };

  // Helper functions for modals
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      isDangerous?: boolean;
    }
  ) => {
    setConfirmModalConfig({
      title,
      message,
      onConfirm,
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel',
      isDangerous: options?.isDangerous || false
    });
    setShowConfirmModal(true);
  };

  const showRename = (title: string, currentValue: string, onConfirm: (newValue: string) => void) => {
    setRenameModalConfig({ title, currentValue, onConfirm });
    setRenameValue(currentValue);
    setShowRenameModal(true);
  };

  // Favorite timestamp helpers (persist ordering of favorites across reloads)
  const FAVORITE_TS_KEY_PREFIX = 'notewise.favoriteTimestamps';

  const getFavoriteTimestamps = (type: 'flashcard' | 'summary' | 'folder') => {
    try {
      const raw = localStorage.getItem(`${FAVORITE_TS_KEY_PREFIX}.${type}`);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch (e) {
      return {};
    }
  };

  const setFavoriteTimestampLocal = (type: 'flashcard' | 'summary' | 'folder', id: string, ts: number | null) => {
    try {
      const map = getFavoriteTimestamps(type);
      if (ts) map[id] = ts; else delete map[id];
      localStorage.setItem(`${FAVORITE_TS_KEY_PREFIX}.${type}`, JSON.stringify(map));
    } catch (e) {
      // ignore
    }
  };

  const sortFavoritesByTimestamps = <T extends { _id: string; isFavorite?: boolean }>(arr: T[], type: 'flashcard' | 'summary' | 'folder') => {
    const tsMap = getFavoriteTimestamps(type);
    return [...arr].sort((a, b) => {
      if (a.isFavorite && b.isFavorite) {
        const at = tsMap[a._id] ?? ((a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0);
        const bt = tsMap[b._id] ?? ((b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0);
        return bt - at; // most recently favorited first
      }
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });
  };



  // Check for URL parameters
  useEffect(() => {
    // Check for tab parameter (only accept allowed values)
    const tabParam = searchParams.get('tab');
    if (tabParam && !isLoading) {
      const allowed = ['flashcards', 'study_notes', 'folders', 'favorites'] as const;
      // Only switch tabs if the URL parameter is valid
      if ((allowed as readonly string[]).includes(tabParam)) {
        setActiveTab(tabParam as any);
        // Also save to localStorage so it persists
        if (typeof window !== 'undefined') {
          localStorage.setItem('library_active_tab', tabParam);
        }
      }
    }
  }, [searchParams, isLoading]);

  // Separate effect for auto-expanding folders based on subject parameter
  useEffect(() => {
    // Check for subject to auto-expand folder
    const autoExpandSubject = searchParams.get('subject');
    if (autoExpandSubject && !isLoading) {
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
  }, [searchParams, isLoading, flashcards]);

  // Get userId
  useEffect(() => {
    const getUserId = async () => {
      let uid: string | null = null;

      // Method 1: Try authenticated API call with token
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const response = await requestService.get('/api/v1/users/current');
          if (response.success && response.data?.user) {
            uid = response.data.user._id || response.data.user.id;
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

      setUserId(uid);
    };

    getUserId();
  }, []);

  // Use hooks for data fetching
  const { 
    flashcards: hookFlashcards, 
    fetchFlashcards,
    deleteFlashcard: hookDeleteFlashcard,
    updateFlashcard: hookUpdateFlashcard,
    isLoading: flashcardsLoading 
  } = useFlashcardRequest(userId || undefined);

  const { 
    summaries: hookSummaries, 
    fetchSummaries,
    deleteSummary: hookDeleteSummary,
    updateSummary: hookUpdateSummary,
    isLoading: summariesLoading 
  } = useSummaryRequest(userId || undefined);

  // Sync hook data with local state and filter archived items
  useEffect(() => {
    if (hookFlashcards) {
      const activeFlashcards = hookFlashcards.filter(f => !f.isArchived);
      setFlashcards(activeFlashcards);
      console.log('📚 Loaded flashcards:', activeFlashcards);
    }
  }, [hookFlashcards]);

  useEffect(() => {
    if (hookSummaries) {
      const activeSummaries = hookSummaries.filter(s => !s.isArchived);
      setSummaries(activeSummaries);
      console.log('📄 Loaded summaries:', activeSummaries);
    }
  }, [hookSummaries]);

  // Fetch folders and activities separately (not in hooks yet)
  useEffect(() => {
    if (!userId) return;

    const loadAdditionalData = async () => {
      setIsLoading(true);
      try {
        // Fetch folders
        const foldersRes = await requestService.get(`/api/student_page/folder?userId=${userId}`);
        if (foldersRes.success && foldersRes.data) {
          console.log('📁 Loaded folders:', foldersRes.data);
          setFolders(Array.isArray(foldersRes.data.folders) ? foldersRes.data.folders : []);
        }

        // Fetch activities
        const actsRes = await requestService.get(`/api/student_page/history?userId=${userId}&limit=200`);
        if (actsRes.success && actsRes.data) {
          const readIds = new Set<string>();
          const completedFlashcardIds = new Set<string>();
          
          if (Array.isArray(actsRes.data.activities)) {
            actsRes.data.activities.forEach((a: any) => {
              const activityType = (a.type || a.action || '').toLowerCase();
              
              if (activityType.includes('summary.read') || activityType.includes('summary_read')) {
                const mid = a.meta?.summaryId || a.meta?.summaryID || a.meta?.id;
                if (mid) readIds.add(mid.toString());
              }
              
              if (activityType.includes('flashcard.study_complete') || activityType.includes('flashcard_study_complete')) {
                const fid = a.meta?.flashcardId || a.meta?.flashcardID || a.meta?.id;
                if (fid) completedFlashcardIds.add(fid.toString());
              }
            });
          }

          setSummaryReadActivityIds(readIds);
          setFlashcardCompletedActivityIds(completedFlashcardIds);
        }
      } catch (e) {
        console.warn('Failed to load additional data', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdditionalData();
  }, [userId]);

  // Combined loading state
  useEffect(() => {
    setIsLoading(flashcardsLoading || summariesLoading);
  }, [flashcardsLoading, summariesLoading]);

  // Helper function to determine menu position based on button location
  const handleMenuToggle = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    
    if (openMenuId === itemId) {
      setOpenMenuId(null);
      return;
    }

    // Get button position
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate space below and above
    const spaceBelow = viewportHeight - rect.bottom;
    const menuHeight = 400; // Approximate height of the menu
    
    // If not enough space below, show menu above
    if (spaceBelow < menuHeight && rect.top > menuHeight) {
      setMenuPosition('top');
    } else {
      setMenuPosition('bottom');
    }
    
    setOpenMenuId(itemId);
  };

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

  // Listen for summary read events to refresh the data
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    try {
      const bc = new BroadcastChannel('notewise.activities');
      
      bc.onmessage = (event) => {
        if (event.data?.type === 'summary.read' && event.data?.summaryId) {
          // Update the specific summary's isRead status
          setSummaries(prev => prev.map(s => 
            s._id === event.data.summaryId ? { ...s, isRead: true } : s
          ));
          // Also mark in activity set so UI shows COMPLETED even if summary.isRead isn't present
          setSummaryReadActivityIds(prev => new Set(prev).add(event.data.summaryId));
        }

        // Update flashcard data when a session finishes in another tab (or match page)
        if (event.data?.type === 'flashcard.updated' && event.data?.flashcard) {
          const fc = event.data.flashcard;
          setFlashcards(prev => {
            const found = prev.some(f => String(f._id) === String(fc._id));
            if (found) {
              return prev.map(f => String(f._id) === String(fc._id) ? { ...f, lastReviewed: fc.lastReviewed, repetitionCount: fc.repetitionCount } : f);
            }
            // if not present, prepend to the list
            return [fc, ...prev];
          });
        }

        // Some flows broadcast only an activity for completion
        if (event.data?.type === 'flashcard.study_complete' && event.data?.flashcardId) {
          setFlashcards(prev => prev);
          setFlashcardCompletedActivityIds(prev => new Set(prev).add(event.data.flashcardId));
        }
      };

      return () => {
        bc.close();
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported or failed to initialize');
    }
  }, []);



  // Track if we just navigated from study mode to refresh data
  const previousPathRef = useRef<string>('');
  
  useEffect(() => {
    const currentPath = window.location.pathname + window.location.search;
    const tabParam = searchParams.get('tab');
    
    // Only refresh if URL changed (navigating TO library, not just switching tabs)
    if (currentPath !== previousPathRef.current && tabParam && userId && !isLoading) {
      if (tabParam === 'study_notes') {
        fetchSummaries(false);
      } else if (tabParam === 'flashcards') {
        fetchFlashcards(false);
      }
    }
    
    previousPathRef.current = currentPath;
  }, [searchParams, userId, isLoading, fetchSummaries, fetchFlashcards]);

  const handleDelete = async (flashcardId: string) => {
    if (!userId) return;
    showConfirm(
      'Delete Flashcard',
      'Are you sure you want to delete this flashcard? This action cannot be undone.',
      async () => {
        const response = await hookDeleteFlashcard(flashcardId);
        if (response.success) {
          setOpenMenuId(null);
          showSuccess('Flashcard deleted successfully');
        } else {
          showError(response.error || 'Failed to delete flashcard.');
        }
      },
      { confirmText: 'Delete', isDangerous: true }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => showSuccess('Link copied to clipboard!'))
      .catch(() => showError('Failed to copy link'));
  };

  const handleCreateFlashcardsFromSummary = async (summary: SummaryItem) => {
    if (!userId || isGeneratingFlashcards) return;
    setOpenMenuId(null);
    setIsGeneratingFlashcards(true);

    try {
      // Start the generation progress modal
      startGeneration('flashcard', 1);
      updateGenerationProgress(summary.title, 0);

      const response = await fetch(`/api/student_page/flashcard/generate-from-text?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: summary.content,
          title: `${summary.title} - Flashcards`,
          subject: summary.subject,
          difficulty: summary.difficulty,
          maxCards: 15
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        addGenerationResult(summary.title, true);
        updateGenerationProgress(summary.title, 1);
        completeGeneration();
        
        showSuccess('Flashcards generated successfully', 'Generation Complete');
        
        // Refresh flashcards and navigate immediately
        await fetchFlashcards(false);
        router.push('/student_page/library?tab=flashcards');
        return;
      } else {
        addGenerationResult(summary.title, false, data.error || 'Failed to generate');
        updateGenerationProgress(summary.title, 1);
        completeGeneration();
        throw new Error(data.error || 'Failed to generate flashcards');
      }
    } catch (error) {
      console.error('Flashcard generation failed:', error);
      showError(error instanceof Error ? error.message : 'Failed to generate flashcards');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const openFolderModal = (id: string, type: 'flashcard' | 'summary', title: string) => {
    setSelectedItem({ id, type, title });
    setShowFolderModal(true);
    setNewFolderName('');
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (!selectedItem || !userId) return;

    try {
      let response;

      // Use hooks to update items
      if (selectedItem.type === 'flashcard') {
        response = await hookUpdateFlashcard(selectedItem.id, { folder: folderId || undefined });
      } else if (selectedItem.type === 'summary') {
        response = await hookUpdateSummary(selectedItem.id, { folder: folderId || undefined });
      }

      if (response && response.success) {
        // Close modal
        setShowFolderModal(false);
        setSelectedItem(null);
        showSuccess('Item moved to folder successfully');
      } else {
        throw new Error(response?.error || 'Failed to move item to folder');
      }
    } catch (error) {
      console.error('Failed to move item to folder:', error);
      showError(error instanceof Error ? error.message : 'Failed to move item to folder');
    }
  };

  const handleCreateFolder = async () => {
    if (!userId || !createFolderName.trim()) return;

    try {
      const response = await requestService.post(
        `/api/student_page/folder?userId=${userId}`,
        { title: createFolderName.trim() }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create folder');
      }

      // Update local state
      setFolders(prev => [...prev, response.data.folder]);

      // Close modal
      setShowCreateFolderModal(false);
      setCreateFolderName('');
      showSuccess('Folder created successfully');
    } catch (error) {
      console.error('Failed to create folder:', error);
      showError(error instanceof Error ? error.message : 'Failed to create folder');
    }
  };

  const handleCreateAndMoveToFolder = async () => {
    if (!selectedItem || !userId || !newFolderName.trim()) return;

    try {
      // First, create the folder
      const folderResponse = await fetch(`/api/student_page/folder?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newFolderName.trim(),
        }),
      });

      if (!folderResponse.ok) {
        const errorData = await folderResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const folderData = await folderResponse.json();
      const newFolderId = folderData.folder._id;

      // Then move the item to the new folder
      let endpoint = '';
      let updateData: any = { folder: newFolderId };

      if (selectedItem.type === 'flashcard') {
        endpoint = `/api/student_page/flashcard/${selectedItem.id}?userId=${userId}`;
      } else if (selectedItem.type === 'summary') {
        endpoint = `/api/student_page/summary?userId=${userId}&summaryId=${selectedItem.id}`;
      }

      const moveResponse = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!moveResponse.ok) {
        const errorData = await moveResponse.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to move item to folder');
      }

      // Update local state
      setFolders(prev => [...prev, folderData.folder]);

      if (selectedItem.type === 'flashcard') {
        setFlashcards(prev => prev.map(f =>
          f._id === selectedItem.id ? { ...f, folder: newFolderId } : f
        ));
      } else if (selectedItem.type === 'summary') {
        setSummaries(prev => prev.map(s =>
          s._id === selectedItem.id ? { ...s, folder: newFolderId } : s
        ));
      }

      // Close modal
      setShowFolderModal(false);
      setSelectedItem(null);
      setNewFolderName('');
      showSuccess('Folder created and item moved successfully');
    } catch (error) {
      console.error('Failed to create folder and move item:', error);
      showError(error instanceof Error ? error.message : 'Failed to create folder and move item');
    }
  };

  // Toggle favorite for any item type
  const toggleFavorite = async (id: string, type: 'flashcard' | 'summary' | 'folder', currentFavorite: boolean) => {
    if (!userId) return;

    console.log(`🔄 Toggling favorite for ${type} ${id}: ${currentFavorite} -> ${!currentFavorite}`);

    try {
      let endpoint = '';
      let updateData = { isFavorite: !currentFavorite };

      if (type === 'flashcard') {
        endpoint = `/api/student_page/flashcard/${id}?userId=${userId}`;
      } else if (type === 'summary') {
        endpoint = `/api/student_page/summary?userId=${userId}&summaryId=${id}`;
      } else if (type === 'folder') {
        endpoint = `/api/student_page/folder?userId=${userId}&folderId=${id}`;
      }

      console.log(`📡 Making PATCH request to: ${endpoint}`, updateData);

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to toggle favorite');
      }

      const responseData = await response.json();
      console.log('✅ API Success:', responseData);

      // Persist favorite timestamp locally so ordering survives reloads
      try {
        setFavoriteTimestampLocal(type, id, !currentFavorite ? Date.now() : null);
      } catch (e) {
        // ignore
      }

      // Update local state and ensure favorites are ordered by timestamp so
      // newly-favorited items move to the front and when unfavoriting the
      // remaining favorites reorder correctly.
      if (type === 'flashcard') {
        setFlashcards(prev => prev.map(f => f._id === id ? { ...f, isFavorite: !currentFavorite } : f));
      } else if (type === 'summary') {
        setSummaries(prev => prev.map(s => s._id === id ? { ...s, isFavorite: !currentFavorite } : s));
      } else if (type === 'folder') {
        setFolders(prev => prev.map(f => f._id === id ? { ...f, isFavorite: !currentFavorite } : f));
      }

      console.log(`✅ Local state updated for ${type} ${id}`);
      showSuccess(!currentFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      console.error('❌ Failed to toggle favorite:', error);
      showError(error instanceof Error ? error.message : 'Failed to toggle favorite');
    }
  };

  // Delete folder
  const deleteFolder = async (folderId: string, folderTitle: string) => {
    if (!userId) return;
    showConfirm(
      'Delete Folder',
      `Are you sure you want to delete "${folderTitle}"? Items in this folder will be moved to uncategorized.`,
      async () => {
        try {
          const response = await fetch(`/api/student_page/folder?userId=${userId}&folderId=${folderId}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete folder');
          }

          // Update local state - remove folder and update items to have no folder
          setFolders(prev => prev.filter(f => f._id !== folderId));

          // Update items that were in this folder
          setFlashcards(prev => prev.map(f =>
            f.folder === folderId ? { ...f, folder: undefined } : f
          ));
          setSummaries(prev => prev.map(s =>
            s.folder === folderId ? { ...s, folder: undefined } : s
          ));

          // Close expanded folder if it was the deleted one
          if (expandedFolder === folderId) {
            setExpandedFolder(null);
          }

          showSuccess('Folder deleted successfully');
        } catch (error) {
          console.error('Failed to delete folder:', error);
          showError(error instanceof Error ? error.message : 'Failed to delete folder');
        }
      },
      { confirmText: 'Delete', isDangerous: true }
    );
  };

  // Rename folder
  const renameFolder = async (folderId: string, currentTitle: string) => {
    if (!userId) return;

    showRename('Rename Folder', currentTitle, async (newTitle: string) => {
      if (!newTitle || newTitle.trim() === '' || newTitle === currentTitle) return;

      try {
        const response = await fetch(`/api/student_page/folder?userId=${userId}&folderId=${folderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: newTitle.trim() }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to rename folder');
        }

        // Update local state
        setFolders(prev => prev.map(f =>
          f._id === folderId ? { ...f, title: newTitle.trim() } : f
        ));
        showSuccess('Folder renamed successfully');
      } catch (error) {
        console.error('Failed to rename folder:', error);
        showError(error instanceof Error ? error.message : 'Failed to rename folder');
      }
    });
  };

  const handleRename = async (item: FlashcardItem) => {
    if (!userId) return;
    showRename('Rename Flashcard Set', item.title || '', async (newTitle: string) => {
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
        showSuccess('Flashcard set renamed successfully');
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : 'Failed to rename.');
      }
    });
  };

  // Rename handler for summaries (study notes)
  const handleRenameSummary = async (summary: SummaryItem) => {
    if (!userId) return;
    showRename('Rename Summary', summary.title || '', async (newTitle: string) => {
      if (!newTitle || newTitle.trim() === '' || newTitle === summary.title) return;
      try {
        const res = await fetch(`/api/student_page/summary?userId=${userId}&summaryId=${summary._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle.trim() }),
        });
        if (!res.ok) {
          const maybeUnknown = await res.json().catch(() => ({} as unknown));
          const maybe = maybeUnknown as Partial<{ message?: string }>;
          throw new Error(maybe?.message || `Failed to rename (${res.status})`);
        }
        setSummaries(prev => prev.map(s => s._id === summary._id ? { ...s, title: newTitle.trim() } : s));
        setOpenMenuId(null);
        showSuccess('Summary renamed successfully');
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : 'Failed to rename summary.');
      }
    });
  };

  // Delete summary
  const handleDeleteSummary = async (summaryId: string) => {
    if (!userId) return;
    showConfirm(
      'Delete Summary',
      'Are you sure you want to delete this summary? This action cannot be undone.',
      async () => {
        try {
          const res = await fetch(`/api/student_page/summary?userId=${userId}&summaryId=${summaryId}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            setSummaries(prev => prev.filter(s => s._id !== summaryId));
            setOpenMenuId(null);
            showSuccess('Summary deleted successfully');
          } else {
            showError(data.error || 'Failed to delete summary');
          }
        } catch (err) {
          showError('Failed to delete summary');
        }
      },
      { confirmText: 'Delete', isDangerous: true }
    );
  };

  // Archive flashcard
  const handleArchiveFlashcard = async (flashcardId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/student_page/flashcard/${flashcardId}?userId=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to archive flashcard');
      }
      setFlashcards(prev => prev.filter(f => f._id !== flashcardId));
      setOpenMenuId(null);
      showSuccess('Flashcard archived successfully');
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Failed to archive flashcard');
    }
  };

  // Archive summary
  const handleArchiveSummary = async (summaryId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/student_page/summary?userId=${userId}&summaryId=${summaryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to archive summary');
      }
      setSummaries(prev => prev.filter(s => s._id !== summaryId));
      setOpenMenuId(null);
      showSuccess('Summary archived successfully');
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Failed to archive summary');
    }
  };

  // Get unique subjects/folders from flashcards and summaries based on active tab
  const subjects = useMemo(() => {
    const subjectSet = new Set<string>();

    // Show subjects in folder view
    if (activeTab === 'flashcards') {
      let hasUncategorized = false;
      flashcards.forEach(f => {
        if (f.subject) subjectSet.add(f.subject);
        else hasUncategorized = true;
      });
      if (hasUncategorized) subjectSet.add('Uncategorized');
    } else if (activeTab === 'study_notes') {
      let hasUncategorized = false;
      summaries.forEach(s => {
        if (s.subject) subjectSet.add(s.subject);
        else hasUncategorized = true;
      });
      if (hasUncategorized) subjectSet.add('Uncategorized');
    }

    return Array.from(subjectSet).sort();
  }, [flashcards, summaries, activeTab, folders]);

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
      items.sort((a, b) => {
        if (filter === 'recent') {
          const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return bd - ad;
        } else if (filter === 'popular') {
          return (b.cards?.length || 0) - (a.cards?.length || 0);
        } else if (filter === 'alphabetical') {
          return (a.title || '').localeCompare(b.title || '');
        }
        // Default: favorites first within each subject/folder
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });
    });

    return grouped;
  }, [flashcards, filter]);

  const filteredFlashcards = useMemo(() => {
    let list = [...flashcards];

    // Filter by subject
    if (selectedSubject !== 'all') {
      list = list.filter(f => f.subject === selectedSubject);
    }

    // Sort based on filter
    list.sort((a, b) => {
      if (filter === 'recent') {
        const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return bd - ad;
      } else if (filter === 'popular') {
        return (b.cards?.length || 0) - (a.cards?.length || 0);
      } else if (filter === 'alphabetical') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // Default: favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    return list;
  }, [flashcards, filter, selectedSubject]);

  const filteredSummaries = useMemo(() => {
    let list = [...summaries];

    // Filter by subject
    if (selectedSubject !== 'all') {
      list = list.filter(s => s.subject === selectedSubject);
    }

    // Sort based on filter
    list.sort((a, b) => {
      if (filter === 'recent') {
        const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return bd - ad;
      } else if (filter === 'popular') {
        return (b.wordCount || 0) - (a.wordCount || 0);
      } else if (filter === 'alphabetical') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // Default: favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    return list;
  }, [summaries, filter, selectedSubject]);

  const summariesBySubject = useMemo(() => {
    const grouped = new Map<string, SummaryItem[]>();
    filteredSummaries.forEach(summary => {
      const subject = summary.subject || 'Other';
      if (!grouped.has(subject)) {
        grouped.set(subject, []);
      }
      grouped.get(subject)!.push(summary);
    });
    return grouped;
  }, [filteredSummaries]);

  return (
    <>
      <GenerationProgressModal onComplete={async () => {
        // Refresh both flashcards and summaries when generation completes
        await Promise.all([
          fetchFlashcards(false),
          fetchSummaries(false)
        ]);
      }} />
      
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* Fix for multi-line clamp mask leaking parent/background colors
           Forces the mask to be opaque so ellipsis/fade composites against
           the element's own background (works in WebKit/Blink).
        */
        .clamp-fix {
          -webkit-mask-image: linear-gradient(#000, #000);
          mask-image: linear-gradient(#000, #000);
        }
      `}</style>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Library</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage and organize your study materials</p>
      </div>

      {/* Navigation Tabs - matching Student Class page style */}
      <div className="mb-6 sm:mb-8 bg-transparent -mx-4 sm:mx-0">
        <div className="flex gap-3 sm:gap-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto px-4 sm:px-0 scrollbar-hide">
          {(['favorites', 'flashcards', 'study_notes', 'folders'] as const).map((tab) => {
            // Show a user-friendly label for the tabs. Keep the internal tab key unchanged.
            const label = tab === 'study_notes'
              ? 'Summaries'
              : tab
                .split('_')
                .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
                .join(' ');
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  // Save the active tab to localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('library_active_tab', tab);
                  }
                }}
                className={`py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap relative group ${activeTab === tab
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400'
                  }`}
              >
                {tab === 'favorites' ? (
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'favorites' ? 'text-yellow-400' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{label}</span>
                  </span>
                ) : label}
                {/* Animated underline */}
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-teal-500 transition-transform duration-300 origin-center ${activeTab === tab ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Use a horizontal, wrapping layout so controls align on small screens */}
        <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4">
          {/* Keep selects compact and allow them to sit inline on mobile */}
          <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center w-full sm:w-auto">

            <select
              id="filter"
              value={filter}
              onChange={handleFilterChange}
              className="flex-1 sm:flex-none px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm min-w-[120px] sm:min-w-[140px]"
            >
              <option value="recent">Recent</option>
              <option value="popular">
                {isClient ? (
                  activeTab === 'flashcards' ? 'Most Cards' : 
                  activeTab === 'study_notes' ? 'Most Words' : 
                  activeTab === 'folders' ? 'Most Items' : 
                  activeTab === 'favorites' ? 'Most Cards' :
                  'Most Popular'
                ) : 'Most Cards'}
              </option>
              <option value="alphabetical">A-Z</option>
            </select>

            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-first sm:order-none w-full sm:w-auto">
              {activeTab === 'flashcards' && `${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}, ${flashcards.length} ${flashcards.length === 1 ? 'set' : 'sets'}`}
              {activeTab === 'study_notes' && `${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}, ${summaries.length} ${summaries.length === 1 ? 'summary' : 'summaries'}`}
              {activeTab === 'folders' && `${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}`}
              {activeTab === 'favorites' && (() => {
                const favoriteFlashcards = flashcards.filter(f => f.isFavorite);
                const favoriteSummaries = summaries.filter(s => s.isFavorite);
                const favItemsCount = favoriteFlashcards.length + favoriteSummaries.length;
                return `${favItemsCount} ${favItemsCount === 1 ? 'item' : 'items'}`;
              })()}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          {activeTab === 'flashcards' && (
            <PrimaryActionButton as="link" href="/student_page/study_mode?create=flashcards" title="Create a new set">
              <span className="hidden sm:inline">+ Create Set</span>
              <span className="sm:hidden">+ Set</span>
            </PrimaryActionButton>
          )}
          {activeTab === 'study_notes' && (
            <PrimaryActionButton as="link" href="/student_page/study_mode" title="Create a summary">
              <span className="hidden sm:inline">+ Create Summary</span>
              <span className="sm:hidden">+ Summary</span>
            </PrimaryActionButton>
          )}
          {activeTab === 'folders' && (
            <PrimaryActionButton onClick={() => setShowCreateFolderModal(true)} title="Create a new folder">
              <span className="hidden sm:inline">+ Create Folder</span>
              <span className="sm:hidden">+ Folder</span>
            </PrimaryActionButton>
          )}

        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        {activeTab === 'flashcards' && (
          <div id="flashcards">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                <PrimaryActionButton as="link" href="/student_page/study_mode?create=flashcards" title="Create your first set">
                  Create Your First Set
                </PrimaryActionButton>
              </div>
            )}



            {/* Unified Folder View */}
            {!isLoading && !error && (
              <div className="space-y-4">

                {/* Folders - Sort according to favorites (by timestamp) + active filter */}
                {(() => {
                  // Use a single comparator that orders favorites by their persisted timestamp
                  // and falls back to the active `filter` for tie-breaking or non-favorites.
                  const tsMap = getFavoriteTimestamps('folder');
                  const sorted = [...folders].sort((a, b) => {
                    const aFav = a.isFavorite ? 1 : 0;
                    const bFav = b.isFavorite ? 1 : 0;

                    // Both favorites -> order by favorite timestamp (most recent first)
                    if (aFav && bFav) {
                      const at = tsMap[a._id] ?? ((a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0);
                      const bt = tsMap[b._id] ?? ((b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0);
                      if (bt !== at) return bt - at;
                    }

                    // If one is favorite, it should come first
                    if (aFav && !bFav) return -1;
                    if (!aFav && bFav) return 1;

                    // Now either both non-favorites or tied on favorite timestamp -> apply active filter
                    if (filter === 'recent') {
                      const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      if (bd !== ad) return bd - ad;
                    } else if (filter === 'popular') {
                      const aCount = (flashcards.filter(f => f.folder === a._id).length)
                        + (summaries.filter(s => s.folder === a._id).length);
                      const bCount = (flashcards.filter(f => f.folder === b._id).length)
                        + (summaries.filter(s => s.folder === b._id).length);
                      if (bCount !== aCount) return bCount - aCount;
                    } else if (filter === 'alphabetical') {
                      const cmp = (a.title || '').localeCompare(b.title || '');
                      if (cmp !== 0) return cmp;
                    }

                    return 0;
                  });
                  return sorted;
                })().map((folder) => {
                  // Get all items in this folder and sort them
                  let folderFlashcards = flashcards.filter(f => f.folder === folder._id);
                  let folderSummaries = summaries.filter(s => s.folder === folder._id);

                  // Sort folder flashcards
                  folderFlashcards = [...folderFlashcards].sort((a, b) => {
                    if (filter === 'recent') {
                      const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      return bd - ad;
                    } else if (filter === 'popular') {
                      return (b.cards?.length || 0) - (a.cards?.length || 0);
                    } else if (filter === 'alphabetical') {
                      return (a.title || '').localeCompare(b.title || '');
                    }
                    // Default: favorites first
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    return 0;
                  });

                  // Sort folder summaries
                  folderSummaries = [...folderSummaries].sort((a, b) => {
                    if (filter === 'recent') {
                      const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      return bd - ad;
                    } else if (filter === 'popular') {
                      return (b.wordCount || 0) - (a.wordCount || 0);
                    } else if (filter === 'alphabetical') {
                      return (a.title || '').localeCompare(b.title || '');
                    }
                    // Default: favorites first
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    return 0;
                  });

                  // Determine which types to show depending on the active tab.
                  const showFlashcards = (activeTab as string) === 'flashcards' || (activeTab as string) === 'folders';
                  const showSummaries = (activeTab as string) === 'study_notes' || (activeTab as string) === 'folders';

                  const displayedCount = (showFlashcards ? folderFlashcards.length : 0)
                    + (showSummaries ? folderSummaries.length : 0);

                  if (displayedCount === 0) return null;

                  return (
                    <div
                      key={folder._id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible relative group"
                    >
                      {/* Folder Header */}
                      <div
                        onClick={() => setExpandedFolder(expandedFolder === folder._id ? null : folder._id)}
                        className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            {folder.isFavorite && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {folder.title}
                              {folder.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {displayedCount} {displayedCount === 1 ? 'item' : 'items'}
                              {showFlashcards && folderFlashcards.length > 0 && ` • ${folderFlashcards.length} flashcard${folderFlashcards.length === 1 ? '' : 's'}`}
                              {showSummaries && folderSummaries.length > 0 && ` • ${folderSummaries.length} summar${folderSummaries.length === 1 ? 'y' : 'ies'}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Folder Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(folder._id, 'folder', folder.isFavorite || false); }}
                              className={`p-1.5 rounded-lg transition-colors ${folder.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-400 hover:text-yellow-500'
                                }`}
                              title={folder.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <svg className="w-4 h-4" fill={folder.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); renameFolder(folder._id, folder.title); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                              title="Rename folder"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteFolder(folder._id, folder.title); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete folder"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <svg
                            className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === folder._id ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Folder Contents */}
                      {expandedFolder === folder._id && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                            {/* Flashcards in folder */}
                            {showFlashcards && folderFlashcards.map((item) => (
                              <div
                                key={`flashcard-${item._id}`}
                                onClick={() => { markAsViewed(item._id); router.push(`/student_page/library/${item._id}`); }}
                                className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === item._id ? 'z-50' : 'z-0'}`}
                              >
                                {/* Favorite + actions (inside folder) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id, 'flashcard', item.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => handleMenuToggle(e, item._id)}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === item._id && (
                                    <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleFavorite(item._id, 'flashcard', item.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {item.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { handleRename(item); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { openFolderModal(item._id, 'flashcard', item.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />

                                      <button

                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"

                                        onClick={() => { handleArchiveFlashcard(item._id); setOpenMenuId(null); }}

                                      >

                                        Archive

                                      </button>

                                      <button

                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"

                                        onClick={() => { handleDelete(item._id); setOpenMenuId(null); }}

                                      >

                                        Delete

                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                    {item.createdAt && isNewItem(item.createdAt, item._id) && (
                                      <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                    )}
                                    {isFlashcardCompleted(item) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.title}</h4>
                                  {item.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.description}</p>
                                  )}
                                </div>
                                {item.createdAt && (
                                  <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                    {formatDateTime(item.createdAt)}
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Summaries in folder */}
                            {showSummaries && folderSummaries.map((summary) => (
                              <div
                                key={`summary-${summary._id}`}
                                onClick={() => { markAsViewed(summary._id); router.push(`/student_page/summaries/${summary._id}`); }}
                                className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === summary._id ? 'z-50' : 'z-0'}`}
                              >
                                {/* Favorite + actions (inside folder) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(summary._id, 'summary', summary.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${summary.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={summary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={summary.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => handleMenuToggle(e, summary._id)}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleSummaryRead(summary._id, !!summary.isRead); setOpenMenuId(null); }}
                                      >
                                        {summary.isRead ? 'Mark as unread' : 'Mark as read'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { router.push(`/student_page/summaries/${summary._id}`); setOpenMenuId(null); }}
                                      >
                                        View
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { handleRenameSummary(summary); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => handleCreateFlashcardsFromSummary(summary)}
                                      >
                                        Create Flashcards
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { openFolderModal(summary._id, 'summary', summary.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />

                                      <button

                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"

                                        onClick={() => { handleArchiveSummary(summary._id); setOpenMenuId(null); }}

                                      >

                                        Archive

                                      </button>

                                      <button

                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"

                                        onClick={() => { handleDeleteSummary(summary._id); setOpenMenuId(null); }}

                                      >

                                        Delete

                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                    {summary.createdAt && isNewItem(summary.createdAt, summary._id) && (
                                      <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                    )}
                                    {isSummaryCompleted(summary) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{summary.title}</h4>
                                </div>
                                {summary.createdAt && (
                                  <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                    {formatDateTime(summary.createdAt)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Uncategorized Items - just cards at the bottom */}
                {(() => {
                  // Use the globally-sorted `flashcards` array for uncategorized items
                  let uncategorizedFlashcards = flashcards.filter(f => !f.folder);
                  let uncategorizedSummaries = summaries.filter(s => !s.folder);

                  // Sort uncategorized flashcards
                  uncategorizedFlashcards = [...uncategorizedFlashcards].sort((a, b) => {
                    if (filter === 'recent') {
                      const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      return bd - ad;
                    } else if (filter === 'popular') {
                      return (b.cards?.length || 0) - (a.cards?.length || 0);
                    } else if (filter === 'alphabetical') {
                      return (a.title || '').localeCompare(b.title || '');
                    }
                    // Default: favorites first
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    return 0;
                  });

                  // Sort uncategorized summaries
                  uncategorizedSummaries = [...uncategorizedSummaries].sort((a, b) => {
                    if (filter === 'recent') {
                      const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      return bd - ad;
                    } else if (filter === 'popular') {
                      return (b.wordCount || 0) - (a.wordCount || 0);
                    } else if (filter === 'alphabetical') {
                      return (a.title || '').localeCompare(b.title || '');
                    }
                    // Default: favorites first
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    return 0;
                  });

                  const showFlashcards = (activeTab as string) === 'flashcards' || (activeTab as string) === 'folders';
                  const showSummaries = (activeTab as string) === 'study_notes' || (activeTab as string) === 'folders';

                  const uncategorizedTotal = (showFlashcards ? uncategorizedFlashcards.length : 0)
                    + (showSummaries ? uncategorizedSummaries.length : 0);

                  if (uncategorizedTotal === 0) return null;

                  return (
                    <>
                      {/* Simple header without folder wrapper */}
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Uncategorized</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{uncategorizedTotal} {uncategorizedTotal === 1 ? 'item' : 'items'}</p>
                      </div>

                      {/* Cards displayed directly without folder container */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                        {/* Render uncategorized items similar to above */}
                            {showFlashcards && uncategorizedFlashcards.map((item) => (
                              <div
                                key={`uncategorized-flashcard-${item._id}`}
                                onClick={() => { markAsViewed(item._id); router.push(`/student_page/library/${item._id}`); }}
                                className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === item._id ? 'z-50' : 'z-0'}`}
                              >
                                {/* Favorite + actions (uncategorized flashcard) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id, 'flashcard', item.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => handleMenuToggle(e, item._id)}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === item._id && (
                                    <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleFavorite(item._id, 'flashcard', item.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {item.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { handleRename(item); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { openFolderModal(item._id, 'flashcard', item.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />

                                      <button

                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"

                                        onClick={() => { handleArchiveFlashcard(item._id); setOpenMenuId(null); }}

                                      >

                                        Archive

                                      </button>

                                      <button

                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"

                                        onClick={() => { handleDelete(item._id); setOpenMenuId(null); }}

                                      >

                                        Delete

                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                    {item.createdAt && isNewItem(item.createdAt, item._id) && (
                                      <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                    )}
                                    {isFlashcardCompleted(item) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.title}</h4>
                                  {item.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.description}</p>
                                  )}
                                </div>
                                {item.createdAt && (
                                  <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                    {formatDateTime(item.createdAt)}
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Uncategorized Summaries */}
                            {showSummaries && uncategorizedSummaries.map((summary) => (
                              <div
                                key={`uncategorized-summary-${summary._id}`}
                                onClick={() => { markAsViewed(summary._id); router.push(`/student_page/summaries/${summary._id}`); }}
                                className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === summary._id ? 'z-50' : 'z-0'}`}
                              >
                                {/* Favorite + actions (uncategorized summary) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(summary._id, 'summary', summary.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${summary.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={summary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={summary.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => handleMenuToggle(e, summary._id)}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleSummaryRead(summary._id, !!summary.isRead); setOpenMenuId(null); }}
                                      >
                                        {summary.isRead ? 'Mark as unread' : 'Mark as read'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { router.push(`/student_page/summaries/${summary._id}`); setOpenMenuId(null); }}
                                      >
                                        View
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { handleRenameSummary(summary); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => handleCreateFlashcardsFromSummary(summary)}
                                      >
                                        Create Flashcards
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { openFolderModal(summary._id, 'summary', summary.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />

                                      <button

                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"

                                        onClick={() => { handleArchiveSummary(summary._id); setOpenMenuId(null); }}

                                      >

                                        Archive

                                      </button>

                                      <button

                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"

                                        onClick={() => { handleDeleteSummary(summary._id); setOpenMenuId(null); }}

                                      >

                                        Delete

                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                    {summary.createdAt && isNewItem(summary.createdAt, summary._id) && (
                                      <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                    )}
                                    {isSummaryCompleted(summary) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{summary.title}</h4>

                                      {summary.createdAt && (

                                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">

                                          {formatDateTime(summary.createdAt)}

                                        </div>

                                      )}

                                      </div>

                                      </div>
                            ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}



          </div>
        )}
        {activeTab === 'favorites' && (
          <div id="favorites">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-slate-400">Loading your favorites...</p>
                </div>
              </div>
            )}

            {!isLoading && (() => {
              const favoriteFlashcards = flashcards.filter(f => f.isFavorite);
              const favoriteSummaries = summaries.filter(s => s.isFavorite);
              const totalFavorites = favoriteFlashcards.length + favoriteSummaries.length;

              if (totalFavorites === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 p-1">
                        {/* Use a standard centered filled star and circular container for consistent alignment */}
                        <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" role="img">
                          <path d="M12 .587l3.668 7.431 8.194 1.192-5.93 5.782 1.4 8.166L12 18.896l-7.332 3.962 1.4-8.166L.138 9.21l8.194-1.192L12 .587z" />
                        </svg>
                      </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No favorites yet</h3>
                    <p className="text-gray-500 dark:text-slate-400 mb-4">Mark folders or items with the star to add them to favorites.</p>
                  </div>
                );
              }

              // Folder view
              return (
                  <div className="space-y-4">
                    {/* Favorited items grouped by folder (for display purposes only - not showing folder itself) */}
                    {(() => {
                      // Prioritize folders that are explicitly favorited by the user,
                      // ordering those by the persisted favorite timestamp. Then include
                      // folders that contain favorited items (but are not favorited themselves),
                      // ordered by the active `filter`.
                      const tsMap = getFavoriteTimestamps('folder');

                      const favoritedFolders = folders.filter(folder => folder.isFavorite);

                      const foldersWithFavorites = folders.filter(folder => {
                        const hasFavFlashcards = flashcards.some(f => f.folder === folder._id && f.isFavorite);
                        const hasFavSummaries = summaries.some(s => s.folder === folder._id && s.isFavorite);
                        return (hasFavFlashcards || hasFavSummaries) && !folder.isFavorite;
                      });

                      // Sort explicit favorited folders by timestamp (most recent first)
                      const sortedFavorited = [...favoritedFolders].sort((a, b) => {
                        const at = tsMap[a._id] ?? ((a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0);
                        const bt = tsMap[b._id] ?? ((b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0);
                        if (bt !== at) return bt - at;
                        return 0;
                      });

                      // Sort folders that merely contain favorited items according to the active filter
                      const sortedContaining = [...foldersWithFavorites].sort((a, b) => {
                        if (filter === 'recent') {
                          const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                          const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                          if (bd !== ad) return bd - ad;
                        } else if (filter === 'popular') {
                          const aCount = (flashcards.filter(f => f.folder === a._id && f.isFavorite).length)
                            + (summaries.filter(s => s.folder === a._id && s.isFavorite).length);
                          const bCount = (flashcards.filter(f => f.folder === b._id && f.isFavorite).length)
                            + (summaries.filter(s => s.folder === b._id && s.isFavorite).length);
                          if (bCount !== aCount) return bCount - aCount;
                        } else if (filter === 'alphabetical') {
                          const cmp = (a.title || '').localeCompare(b.title || '');
                          if (cmp !== 0) return cmp;
                        }
                        return 0;
                      });

                      // Combine: explicit favorites first, then folders that contain favorite items
                      return [...sortedFavorited, ...sortedContaining];
                    })().map((folder) => {
                      // Get and sort favorites in this folder
                      let folderFlashcards = flashcards.filter(f => f.folder === folder._id && f.isFavorite);
                      let folderSummaries = summaries.filter(s => s.folder === folder._id && s.isFavorite);

                      // Sort folder flashcards
                      folderFlashcards = [...folderFlashcards].sort((a, b) => {
                        if (filter === 'recent') {
                          const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                          const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                          return bd - ad;
                        } else if (filter === 'popular') {
                          return (b.cards?.length || 0) - (a.cards?.length || 0);
                        } else if (filter === 'alphabetical') {
                          return (a.title || '').localeCompare(b.title || '');
                        }
                        return 0;
                      });

                      // Sort folder summaries
                      folderSummaries = [...folderSummaries].sort((a, b) => {
                        if (filter === 'recent') {
                          const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                          const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                          return bd - ad;
                        } else if (filter === 'popular') {
                          return (b.wordCount || 0) - (a.wordCount || 0);
                        } else if (filter === 'alphabetical') {
                          return (a.title || '').localeCompare(b.title || '');
                        }
                        return 0;
                      });

                      const displayedCount = folderFlashcards.length + folderSummaries.length;

                      return (
                        <div
                          key={folder._id}
                          id={`folder-${folder.title.replace(/[^a-zA-Z0-9]/g, '-')}`}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible relative group"
                        >
                          <div
                            onClick={() => setExpandedFolder(expandedFolder === folder._id ? null : folder._id)}
                            className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-600/10 text-teal-600'
                                }`}>
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                {folder.isFavorite && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="text-left">
                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  {folder.title}
                                  {folder.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {displayedCount} {displayedCount === 1 ? 'item' : 'items'}
                                  {folderFlashcards.length > 0 && ` • ${folderFlashcards.length} flashcard${folderFlashcards.length === 1 ? '' : 's'}`}
                                  {folderSummaries.length > 0 && ` • ${folderSummaries.length} summar${folderSummaries.length === 1 ? 'y' : 'ies'}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Folder Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(folder._id, 'folder', folder.isFavorite || false); }}
                                  className={`p-1.5 rounded-lg transition-colors ${folder.isFavorite
                                    ? 'text-yellow-500 hover:text-yellow-600'
                                    : 'text-gray-400 hover:text-yellow-500'
                                    }`}
                                  title={folder.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                  <svg className="w-4 h-4" fill={folder.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); renameFolder(folder._id, folder.title); }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                                  title="Rename folder"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteFolder(folder._id, folder.title); }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                  title="Delete folder"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              <svg
                                className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === folder._id ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Folder Contents (favorite-only) - collapsible and full cards */}
                          {expandedFolder === folder._id && (
                            <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                                {folderFlashcards.map((item) => (
                                  <div
                                    key={`fav-flash-${item._id}`}
                                    onClick={() => { markAsViewed(item._id); router.push(`/student_page/library/${item._id}`); }}
                                    className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === item._id ? 'z-50' : 'z-0'}`}
                                  >
                                    {/* Favorite + actions (inside folder) */}
                                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id, 'flashcard', item.isFavorite || false); }}
                                        className={`p-1 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                        title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                      >
                                        <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                      </button>

                                      <button
                                        onClick={(e) => handleMenuToggle(e, item._id)}
                                        className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                        aria-label="Open actions"
                                      >
                                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                      </button>

                                      {openMenuId === item._id && (
                                        <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                            onClick={() => { toggleFavorite(item._id, 'flashcard', item.isFavorite || false); setOpenMenuId(null); }}
                                          >
                                            {item.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                          </button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                            onClick={() => { handleRename(item); setOpenMenuId(null); }}
                                          >
                                            Rename
                                          </button>
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                            onClick={() => { router.push(`/student_page/library/${item._id}`); setOpenMenuId(null); }}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                            onClick={() => { openFolderModal(item._id, 'flashcard', item.title); setOpenMenuId(null); }}
                                          >
                                            Move to Folder
                                          </button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />

                                          <button

                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"

                                            onClick={() => { handleArchiveFlashcard(item._id); setOpenMenuId(null); }}

                                          >

                                            Archive

                                          </button>

                                          <button

                                            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"

                                            onClick={() => { handleDelete(item._id); setOpenMenuId(null); }}

                                          >

                                            Delete

                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                        <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                        {item.createdAt && isNewItem(item.createdAt, item._id) && (
                                          <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                        )}
                                    {isFlashcardCompleted(item) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                      </div>
                                    </div>
                                    <div className="mb-2 sm:mb-3">
                                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.title}</h4>
                                      {item.description && (
                                        <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.description}</p>
                                      )}
                                      {item.createdAt && (
                                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                          {formatDateTime(item.createdAt)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {folderSummaries.map((summary) => (
                                  <div
                                    key={`fav-sum-${summary._id}`}
                                    onClick={() => { markAsViewed(summary._id); router.push(`/student_page/summaries/${summary._id}`); }}
                                    className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === summary._id ? 'z-50' : 'z-0'}`}
                                  >
                                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(summary._id, 'summary', summary.isFavorite || false); }} className={`p-1 rounded-lg transition-colors ${summary.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`} title={summary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                                        <svg className="w-4 h-4" fill={summary.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                      </button>

                                      <button onClick={(e) => handleMenuToggle(e, summary._id)} className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all" aria-label="Open actions">
                                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                      </button>

                                      {openMenuId === summary._id && (
                                        <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl" onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}>{summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { handleRenameSummary(summary); setOpenMenuId(null); }}>Rename</button>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => handleCreateFlashcardsFromSummary(summary)}>Create Flashcards</button>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { openFolderModal(summary._id, 'summary', summary.title); setOpenMenuId(null); }}>Move to Folder</button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600" onClick={() => { handleArchiveSummary(summary._id); setOpenMenuId(null); }}>Archive</button>
                                          <button className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl" onClick={() => { handleDeleteSummary(summary._id); setOpenMenuId(null); }}>Delete</button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                        <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                        {summary.createdAt && isNewItem(summary.createdAt, summary._id) && (
                                          <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                        )}
                                    {isSummaryCompleted(summary) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                      </div>
                                    </div>
                                    <div className="mb-2 sm:mb-3">
                                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{summary.title}</h4>
                                    </div>
                                    {summary.createdAt && (
                                      <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                        {formatDateTime(summary.createdAt)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Uncategorized favorites - just cards at the bottom */}
                    {(() => {
                      let uncategorizedFlashcards = favoriteFlashcards.filter(f => !f.folder);
                      let uncategorizedSummaries = favoriteSummaries.filter(s => !s.folder);
                      
                      // Combine and sort all uncategorized items together
                      const combined: any[] = [
                        ...uncategorizedFlashcards.map(f => ({ ...f, __type: 'flashcard' })),
                        ...uncategorizedSummaries.map(s => ({ ...s, __type: 'summary' }))
                      ];
                      
                      // Sort the combined array based on the active filter
                      const sortedCombined = [...combined].sort((a, b) => {
                        if (filter === 'recent') {
                          // Use createdAt as primary, fallback to updatedAt
                          const aDate = a.createdAt || a.updatedAt;
                          const bDate = b.createdAt || b.updatedAt;
                          if (!aDate && !bDate) return 0;
                          if (!aDate) return 1;
                          if (!bDate) return -1;
                          const aTime = new Date(aDate).getTime();
                          const bTime = new Date(bDate).getTime();
                          // Newest first (larger timestamp first)
                          return bTime - aTime;
                        } else if (filter === 'popular') {
                          const aVal = a.__type === 'flashcard' ? (a.cards?.length || 0) : (a.wordCount || 0);
                          const bVal = b.__type === 'flashcard' ? (b.cards?.length || 0) : (b.wordCount || 0);
                          return bVal - aVal;
                        } else if (filter === 'alphabetical') {
                          return (a.title || '').localeCompare(b.title || '');
                        }
                        return 0;
                      });
                      
                      const uncategorizedTotal = sortedCombined.length;
                      if (uncategorizedTotal === 0) return null;

                      return (
                        <>
                          {/* Simple header without folder wrapper */}
                          <div className="mb-3">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Uncategorized</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{uncategorizedTotal} {uncategorizedTotal === 1 ? 'item' : 'items'}</p>
                          </div>

                          {/* Cards displayed directly without folder container */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                                {sortedCombined.map((item) => item.__type === 'flashcard' ? (
                                  <div
                                    key={`uncat-fav-flash-${item._id}`}
                                    onClick={() => { markAsViewed(item._id); router.push(`/student_page/library/${item._id}`); }}
                                    className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === item._id ? 'z-50' : 'z-0'}`}
                                  >
                                  <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id, 'flashcard', item.isFavorite || false); }}
                                      className={`p-1 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                      title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                      <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                    </button>

                                    <button
                                      onClick={(e) => handleMenuToggle(e, item._id)}
                                      className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                      aria-label="Open actions"
                                    >
                                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                    </button>

                                    {openMenuId === item._id && (
                                      <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { toggleFavorite(item._id, 'flashcard', item.isFavorite || false); setOpenMenuId(null); }}>{item.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</button>
                                        <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { handleRename(item); setOpenMenuId(null); }}>Rename</button>
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { router.push(`/student_page/library/${item._id}`); setOpenMenuId(null); }}>Edit</button>
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { openFolderModal(item._id, 'flashcard', item.title); setOpenMenuId(null); }}>Move to Folder</button>
                                        <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600" onClick={() => { handleArchiveFlashcard(item._id); setOpenMenuId(null); }}>Archive</button>
                                        <button className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl" onClick={() => { handleDelete(item._id); setOpenMenuId(null); }}>Delete</button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                      <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                      {item.createdAt && isNewItem(item.createdAt, item._id) && (
                                        <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                      )}
                                    {isFlashcardCompleted(item) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                    </div>
                                  </div>
                                  <div className="mb-2 sm:mb-3">
                                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.title}</h4>
                                    {item.description && (
                                      <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.description}</p>
                                    )}
                                    {item.createdAt && (
                                      <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                        {formatDateTime(item.createdAt)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  key={`uncat-fav-sum-${item._id}`}
                                  onClick={() => { markAsViewed(item._id); router.push(`/student_page/summaries/${item._id}`); }}
                                  className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === item._id ? 'z-50' : 'z-0'}`}
                                >
                                  <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id, 'summary', item.isFavorite || false); }}
                                      className={`p-1 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                      title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                      <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                    </button>

                                    <button
                                      onClick={(e) => handleMenuToggle(e, item._id)}
                                      className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                      aria-label="Open actions"
                                    >
                                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                    </button>

                                    {openMenuId === item._id && (
                                      <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl" onClick={() => { toggleFavorite(item._id, 'summary', item.isFavorite || false); setOpenMenuId(null); }}>{item.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</button>
                                        <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { handleRenameSummary(item); setOpenMenuId(null); }}>Rename</button>
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { openFolderModal(item._id, 'summary', item.title); setOpenMenuId(null); }}>Move to Folder</button>
                                        <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600" onClick={() => { handleArchiveSummary(item._id); setOpenMenuId(null); }}>Archive</button>
                                        <button className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl" onClick={() => { handleDeleteSummary(item._id); setOpenMenuId(null); }}>Delete</button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                      <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {item.wordCount} words</span>
                                      {item.createdAt && isNewItem(item.createdAt, item._id) && (
                                        <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                      )}
                                    {isSummaryCompleted(item) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                    </div>
                                  </div>
                                  <div className="mb-2 sm:mb-3">
                                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{item.title}</h4>
                                  </div>
                                  {item.createdAt && (
                                    <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                      {formatDateTime(item.createdAt)}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                );
              })()}
          </div>
        )}
        {activeTab === 'study_notes' && (
          <div>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-slate-400">Loading your summaries...</p>
                </div>
              </div>
            )}
            {!isLoading && summaries.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No Summaries Yet</h3>
                <p className="text-gray-500 dark:text-slate-400 mb-4">Create AI-generated summaries from your study materials</p>
                <PrimaryActionButton as="link" href="/student_page/study_mode" title="Create your first summary">
                  Create Your First Summary
                </PrimaryActionButton>
              </div>
            )}

            {/* Folder View for Study Notes */}
            {!isLoading && summaries.length > 0 && (
              <div className="space-y-4">
                {/* Folders - Sort according to favorites (by timestamp) + active filter */}
                {(() => {
                  // Use a single comparator that orders favorites by their persisted timestamp
                  // and falls back to the active `filter` for tie-breaking or non-favorites.
                  const tsMap = getFavoriteTimestamps('folder');
                  const sorted = [...folders].sort((a, b) => {
                    const aFav = a.isFavorite ? 1 : 0;
                    const bFav = b.isFavorite ? 1 : 0;

                    if (aFav && bFav) {
                      const at = tsMap[a._id] ?? ((a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0);
                      const bt = tsMap[b._id] ?? ((b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0);
                      if (bt !== at) return bt - at;
                    }

                    if (aFav && !bFav) return -1;
                    if (!aFav && bFav) return 1;

                    if (filter === 'recent') {
                      const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      if (bd !== ad) return bd - ad;
                    } else if (filter === 'popular') {
                      const aCount = (flashcards.filter(f => f.folder === a._id).length)
                        + (summaries.filter(s => s.folder === a._id).length);
                      const bCount = (flashcards.filter(f => f.folder === b._id).length)
                        + (summaries.filter(s => s.folder === b._id).length);
                      if (bCount !== aCount) return bCount - aCount;
                    } else if (filter === 'alphabetical') {
                      const cmp = (a.title || '').localeCompare(b.title || '');
                      if (cmp !== 0) return cmp;
                    }

                    return 0;
                  });
                  return sorted;
                })().map((folder) => {
                  // Get all summaries in this folder and sort them
                  let folderSummaries = summaries.filter(s => s.folder === folder._id);
                  
                  // Sort folder summaries
                  folderSummaries = [...folderSummaries].sort((a, b) => {
                    if (filter === 'recent') {
                      const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      return bd - ad;
                    } else if (filter === 'popular') {
                      return (b.wordCount || 0) - (a.wordCount || 0);
                    } else if (filter === 'alphabetical') {
                      return (a.title || '').localeCompare(b.title || '');
                    }
                    // Default: favorites first
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    return 0;
                  });

                  // Only show folder if it has summaries
                  if (folderSummaries.length === 0) return null;

                  return (
                    <div
                      key={folder._id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible relative group"
                    >
                      {/* Folder Header */}
                      <div
                        onClick={() => setExpandedFolder(expandedFolder === folder._id ? null : folder._id)}
                        className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            {folder.isFavorite && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {folder.title}
                              {folder.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {folderSummaries.length} summar{folderSummaries.length === 1 ? 'y' : 'ies'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Folder Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(folder._id, 'folder', folder.isFavorite || false); }}
                              className={`p-1.5 rounded-lg transition-colors ${folder.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-400 hover:text-yellow-500'
                                }`}
                              title={folder.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <svg className="w-4 h-4" fill={folder.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); renameFolder(folder._id, folder.title); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                              title="Rename folder"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteFolder(folder._id, folder.title); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete folder"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <svg
                            className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === folder._id ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Folder Contents */}
                      {expandedFolder === folder._id && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                            {/* Summaries in folder */}
                            {folderSummaries.map((summary) => (
                              <div
                                key={`summary-${summary._id}`}
                                onClick={() => { markAsViewed(summary._id); router.push(`/student_page/summaries/${summary._id}`); }}
                                className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 isolate group relative ${openMenuId === summary._id ? 'z-50' : 'z-0'}`}
                              >
                                {/* Favorite + actions (inside folder) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(summary._id, 'summary', summary.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${summary.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={summary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={summary.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => handleMenuToggle(e, summary._id)}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { handleRenameSummary(summary); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => handleCreateFlashcardsFromSummary(summary)}
                                      >
                                        Create Flashcards
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { openFolderModal(summary._id, 'summary', summary.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"
                                        onClick={() => {
                                          handleArchiveSummary(summary._id);
                                          setOpenMenuId(null);
                                        }}
                                      >
                                        Archive
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={() => {
                                          handleDeleteSummary(summary._id);
                                          setOpenMenuId(null);
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                    {isSummaryCompleted(summary) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{summary.title}</h4>

                                      {summary.createdAt && (

                                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">

                                          {formatDateTime(summary.createdAt)}

                                        </div>

                                      )}

                                      </div>

                                      </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Uncategorized Items */}
                {(() => {
                  let uncategorizedSummaries = summaries.filter(s => !s.folder);

                  // Sort uncategorized summaries
                  uncategorizedSummaries = [...uncategorizedSummaries].sort((a, b) => {
                    if (filter === 'recent') {
                      const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                      const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                      return bd - ad;
                    } else if (filter === 'popular') {
                      return (b.wordCount || 0) - (a.wordCount || 0);
                    } else if (filter === 'alphabetical') {
                      return (a.title || '').localeCompare(b.title || '');
                    }
                    // Default: favorites first
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    return 0;
                  });

                  if (uncategorizedSummaries.length === 0) return null;

                  return (
                    <>
                      {/* Simple header without folder wrapper */}
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Uncategorized</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{uncategorizedSummaries.length} {uncategorizedSummaries.length === 1 ? 'summary' : 'summaries'}</p>
                      </div>

                      {/* Cards displayed directly without folder container */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                        {/* Render uncategorized summaries */}
                            {uncategorizedSummaries.map((summary) => (
                              <div
                                key={`uncategorized-summary-${summary._id}`}
                                onClick={() => { markAsViewed(summary._id); router.push(`/student_page/summaries/${summary._id}`); }}
                                className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative ${openMenuId === summary._id ? 'z-50' : 'z-0'}`}
                              >
                                {/* Favorite + actions (inside folder - uncategorized) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(summary._id, 'summary', summary.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${summary.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={summary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={summary.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => handleMenuToggle(e, summary._id)}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { handleRenameSummary(summary); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => handleCreateFlashcardsFromSummary(summary)}
                                      >
                                        Create Flashcards
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { openFolderModal(summary._id, 'summary', summary.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"
                                        onClick={() => {
                                          handleArchiveSummary(summary._id);
                                          setOpenMenuId(null);
                                        }}
                                      >
                                        Archive
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={() => {
                                          handleDeleteSummary(summary._id);
                                          setOpenMenuId(null);
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                    {summary.createdAt && isNewItem(summary.createdAt, summary._id) && (
                                      <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                    )}
                                    {isSummaryCompleted(summary) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{summary.title}</h4>

                                      {summary.createdAt && (

                                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">

                                          {formatDateTime(summary.createdAt)}

                                        </div>

                                      )}

                                      </div>

                                      </div>
                            ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'folders' && (
          <div>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-slate-400">Loading your folders...</p>
                </div>
              </div>
            )}

            {!isLoading && !error && folders.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No folders yet</h3>
                <p className="text-gray-500 dark:text-slate-400 mb-4">Organize your study materials by moving them to folders using the "Move to Folder" option in each item's menu</p>
              </div>
            )}

            {!isLoading && !error && folders.length > 0 && (
              <div className="space-y-4">
                {
                  // Sort folders according to favorites (by timestamp) first, then the active `filter` (recent / popular / alphabetical)
                  (() => {
                    // Use a single comparator that orders favorites by their persisted timestamp
                    // and falls back to the active `filter` for tie-breaking or non-favorites.
                    const tsMap = getFavoriteTimestamps('folder');
                    const sortedFolders = [...folders].sort((a, b) => {
                      const aFav = a.isFavorite ? 1 : 0;
                      const bFav = b.isFavorite ? 1 : 0;

                      if (aFav && bFav) {
                        const at = tsMap[a._id] ?? ((a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0);
                        const bt = tsMap[b._id] ?? ((b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0);
                        if (bt !== at) return bt - at;
                      }

                      if (aFav && !bFav) return -1;
                      if (!aFav && bFav) return 1;

                      if (filter === 'recent') {
                        const ad = new Date(a.createdAt || a.updatedAt || 0).getTime();
                        const bd = new Date(b.createdAt || b.updatedAt || 0).getTime();
                        if (bd !== ad) return bd - ad;
                      } else if (filter === 'popular') {
                        const aCount = (flashcards.filter(f => f.folder === a._id).length)
                          + (summaries.filter(s => s.folder === a._id).length);
                        const bCount = (flashcards.filter(f => f.folder === b._id).length)
                          + (summaries.filter(s => s.folder === b._id).length);
                        if (bCount !== aCount) return bCount - aCount;
                      } else if (filter === 'alphabetical') {
                        const cmp = (a.title || '').localeCompare(b.title || '');
                        if (cmp !== 0) return cmp;
                      }

                      // Fallback: preserve original order
                      return 0;
                    });

                    return sortedFolders.map((folder) => {
                      return folder;
                    });
                  })()
                .map((folder) => {
                  // Get all items in this folder
                  // Use the globally-sorted flashcards array (toggleFavorite re-sorts globals)
                  const folderFlashcards = flashcards.filter(f => f.folder === folder._id);
                  const folderSummaries = summaries.filter(s => s.folder === folder._id);
                  const totalItems = folderFlashcards.length + folderSummaries.length;

                  return (
                    <div
                      key={folder._id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible"
                    >
                      {/* Folder Header */}
                      <div
                        onClick={() => setExpandedFolder(expandedFolder === folder._id ? null : folder._id)}
                        className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            {folder.isFavorite && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {folder.title}
                              {folder.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {totalItems} {totalItems === 1 ? 'item' : 'items'}
                              {folderFlashcards.length > 0 && ` • ${folderFlashcards.length} flashcard${folderFlashcards.length === 1 ? '' : 's'}`}
                              {folderSummaries.length > 0 && ` • ${folderSummaries.length} summar${folderSummaries.length === 1 ? 'y' : 'ies'}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Folder Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(folder._id, 'folder', folder.isFavorite || false); }}
                              className={`p-1.5 rounded-lg transition-colors ${folder.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-400 hover:text-yellow-500'
                                }`}
                              title={folder.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <svg className="w-4 h-4" fill={folder.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); renameFolder(folder._id, folder.title); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                              title="Rename folder"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteFolder(folder._id, folder.title); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete folder"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedFolder(expandedFolder === folder._id ? null : folder._id); }}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title={expandedFolder === folder._id ? 'Collapse folder' : 'Expand folder'}
                            aria-label={expandedFolder === folder._id ? 'Collapse folder' : 'Expand folder'}
                          >
                            <svg
                              className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === folder._id ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Folder Contents */}
                      {expandedFolder === folder._id && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                            {(() => {
                              // Build a combined cross-type list so favorites jump to the top of the folder regardless of type
                              const tsFlash = getFavoriteTimestamps('flashcard');
                              const tsSum = getFavoriteTimestamps('summary');

                              const combined: any[] = [
                                ...folderFlashcards.map(i => ({ ...i, __type: 'flashcard' })),
                                ...folderSummaries.map(i => ({ ...i, __type: 'summary' })),
                              ];

                              const getTs = (it: any) => {
                                if (it.__type === 'flashcard') return tsFlash[it._id] ?? (it.updatedAt ? new Date(it.updatedAt).getTime() : 0);
                                return tsSum[it._id] ?? (it.updatedAt ? new Date(it.updatedAt).getTime() : 0);
                              };

                              const getGlobalIndex = (it: any) => {
                                if (it.__type === 'flashcard') return flashcards.findIndex(f => f._id === it._id);
                                return summaries.findIndex(s => s._id === it._id);
                              };

                              combined.sort((a, b) => {
                                const getCreated = (it: any) => new Date(it.createdAt || it.updatedAt || 0).getTime();
                                const getPopularity = (it: any) => {
                                  if (it.__type === 'flashcard') return it.cards?.length || 0;
                                  return it.wordCount || 0;
                                };

                                // Apply filter first
                                if (filter === 'recent') {
                                  const ra = getCreated(a);
                                  const rb = getCreated(b);
                                  if (rb !== ra) return rb - ra;
                                } else if (filter === 'popular') {
                                  const pa = getPopularity(a);
                                  const pb = getPopularity(b);
                                  if (pb !== pa) return pb - pa;
                                } else if (filter === 'alphabetical') {
                                  const cmp = (a.title || '').localeCompare(b.title || '');
                                  if (cmp !== 0) return cmp;
                                }

                                // Default: favorites first, ordered by favorite timestamp
                                if (a.isFavorite && b.isFavorite) return getTs(b) - getTs(a);
                                if (a.isFavorite && !b.isFavorite) return -1;
                                if (!a.isFavorite && b.isFavorite) return 1;

                                // Fallback: preserve global order
                                return (getGlobalIndex(a) - getGlobalIndex(b));
                              });

                              return combined.map((item) => {
                                if (item.__type === 'flashcard') {
                                  const fc = item as FlashcardItem;
                                  return (
                                    <div
                                      key={`flashcard-${fc._id}`}
                                      onClick={() => { markAsViewed(fc._id); router.push(`/student_page/library/${fc._id}`); }}
                                      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative ${openMenuId === fc._id ? 'z-50' : 'z-0'}`}
                                    >
                                      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleFavorite(fc._id, 'flashcard', fc.isFavorite || false); }}
                                          className={`p-1 rounded-lg transition-colors ${fc.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                          title={fc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                          <svg className="w-4 h-4" fill={fc.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                          </svg>
                                        </button>

                                        <button
                                          onClick={(e) => handleMenuToggle(e, fc._id)}
                                          className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                          aria-label="Open actions"
                                        >
                                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                          </svg>
                                        </button>

                                        {openMenuId === fc._id && (
                                          <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                            <button
                                              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                              onClick={() => { toggleFavorite(fc._id, 'flashcard', fc.isFavorite || false); setOpenMenuId(null); }}
                                            >
                                              {fc.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                            </button>
                                            <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                            <button
                                              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                              onClick={() => { handleRename(fc); setOpenMenuId(null); }}
                                            >
                                              Rename
                                            </button>
                                            <button
                                              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                              onClick={() => { openFolderModal(fc._id, 'flashcard', fc.title); setOpenMenuId(null); }}
                                            >
                                              Move to Folder
                                            </button>
                                            <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                            <button
                                              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"
                                              onClick={() => { handleArchiveFlashcard(fc._id); setOpenMenuId(null); }}
                                            >
                                              Archive
                                            </button>
                                            <button
                                              className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                              onClick={() => { handleDelete(fc._id); setOpenMenuId(null); }}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                          <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {fc.cards?.length || 0} cards</span>
                                          {fc.createdAt && isNewItem(fc.createdAt, fc._id) && (
                                            <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                          )}
                                    {isFlashcardCompleted(fc) && (
                                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        COMPLETED
                                      </span>
                                    )}
                                        </div>
                                      </div>
                                      <div className="mb-2 sm:mb-3">
                                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{fc.title}</h4>
                                        {fc.description && (
                                          <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{fc.description}</p>
                                        )}
                                      </div>
                                      {fc.createdAt && (
                                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                          {formatDateTime(fc.createdAt)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                // summary
                                const sm = item as SummaryItem;
                                return (
                                  <div
                                    key={`summary-${sm._id}`}
                                    onClick={() => { markAsViewed(sm._id); router.push(`/student_page/summaries/${sm._id}`); }}
                                    className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative ${openMenuId === sm._id ? 'z-50' : 'z-0'}`}
                                  >
                                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(sm._id, 'summary', sm.isFavorite || false); }}
                                        className={`p-1 rounded-lg transition-colors ${sm.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                        title={sm.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                      >
                                        <svg className="w-4 h-4" fill={sm.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                      </button>

                                      <button
                                        onClick={(e) => handleMenuToggle(e, sm._id)}
                                        className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                        aria-label="Open actions"
                                      >
                                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                      </button>

                                      {openMenuId === sm._id && (
                                        <div className={`absolute ${menuPosition === 'top' ? 'bottom-10' : 'top-10'} right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50`} onClick={(e) => e.stopPropagation()}>
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                            onClick={() => { toggleFavorite(sm._id, 'summary', sm.isFavorite || false); setOpenMenuId(null); }}
                                          >
                                            {sm.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                          </button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                            onClick={() => { handleRenameSummary(sm); setOpenMenuId(null); }}
                                          >
                                            Rename
                                          </button>
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                            onClick={() => handleCreateFlashcardsFromSummary(sm)}
                                          >
                                            Create Flashcards
                                          </button>
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                            onClick={() => { openFolderModal(sm._id, 'summary', sm.title); setOpenMenuId(null); }}
                                          >
                                            Move to Folder
                                          </button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"
                                            onClick={() => { handleArchiveSummary(sm._id); setOpenMenuId(null); }}
                                          >
                                            Archive
                                          </button>
                                          <button
                                            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                            onClick={() => { handleDeleteSummary(sm._id); setOpenMenuId(null); }}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-start justify-between mb-2 sm:mb-3 pr-16"><div className="flex items-center gap-1 sm:gap-2 flex-wrap"><div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                        <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {sm.wordCount} words</span>
                                        {sm.createdAt && isNewItem(sm.createdAt, sm._id) && (
                                          <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0">NEW</span>
                                        )}
                                        {isSummaryCompleted(sm) && (
                                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            COMPLETED
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mb-2 sm:mb-3">
                                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 bg-white dark:bg-slate-800 inline-block w-full">{sm.title}</h4>
                                    </div>
                                    {sm.createdAt && (
                                      <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                        {formatDateTime(sm.createdAt)}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Modals - Accessible from all tabs */}
      
      {/* Share Modal */}
      {showShareModal && shareItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowShareModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Share &quot;{shareItem.title}&quot;</h3>
              <button
                className="text-gray-400 dark:text-slate-500 hover:text-teal-600 p-1"
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

      {/* Folder Selection Modal */}
      {showFolderModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFolderModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Move to Folder</h3>
              <button
                className="text-gray-400 dark:text-slate-500 hover:text-teal-600 p-1"
                onClick={() => setShowFolderModal(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Choose a folder for "{selectedItem.title}"
            </p>

            {/* No Folder Option */}
            <button
              onClick={() => handleMoveToFolder(null)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors mb-2"
            >
              <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-gray-700 dark:text-slate-300">No Folder</span>
            </button>

            {/* Existing Folders */}
            <div className="max-h-48 overflow-y-auto mb-4">
              {folders.map((folder) => (
                <button
                  key={folder._id}
                  onClick={() => handleMoveToFolder(folder._id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors mb-2"
                >
                  <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <span className="text-gray-700 dark:text-slate-300">{folder.title}</span>
                </button>
              ))}
            </div>

            {/* Create New Folder */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newFolderName.trim()) {
                      handleCreateAndMoveToFolder();
                    }
                  }}
                />
                <button
                  onClick={handleCreateAndMoveToFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateFolderModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Create New Folder</h3>
              <button
                className="text-gray-400 dark:text-slate-500 hover:text-teal-600 p-1"
                onClick={() => setShowCreateFolderModal(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Enter a name for your new folder
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={createFolderName}
                onChange={(e) => setCreateFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && createFolderName.trim()) {
                    handleCreateFolder();
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                disabled={!createFolderName.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{confirmModalConfig.title}</h3>
              <button
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1"
                onClick={() => setShowConfirmModal(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              {confirmModalConfig.message}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
              >
                {confirmModalConfig.cancelText}
              </button>
              <button
                onClick={() => {
                  confirmModalConfig.onConfirm();
                  setShowConfirmModal(false);
                }}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  confirmModalConfig.isDangerous
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {confirmModalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRenameModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{renameModalConfig.title}</h3>
              <button
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1"
                onClick={() => setShowRenameModal(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new name"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && renameValue.trim()) {
                    renameModalConfig.onConfirm(renameValue);
                    setShowRenameModal(false);
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) {
                    renameModalConfig.onConfirm(renameValue);
                    setShowRenameModal(false);
                  }
                }}
                disabled={!renameValue.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts are shown via the global Alert in student_page/layout.tsx */}
    </div>
    </>
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
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <PrivateLibraryContent />
    </Suspense>
  );
}









