"use client";

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PrimaryActionButton from '@/components/ui/buttons/PrimaryActionButton';
import { useAlert } from '@/hooks/useAlert';
import Alert from '@/components/ui/alert_template/Alert';

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
  folder?: string;
  isFavorite?: boolean;
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
  createdAt?: string;
  updatedAt?: string;
};

function PrivateLibraryContent() {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'study_notes' | 'practice_tests' | 'folders' | 'favorites'>('favorites');
  const [filter, setFilter] = useState('recent');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'by_folders' | 'by_list'>('by_folders'); // New state for view mode
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null); // Track which folder is open

  const [userId, setUserId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [practiceTests, setPracticeTests] = useState<PracticeTestItem[]>([]);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<'share' | 'organize' | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareItem, setShareItem] = useState<FlashcardItem | null>(null);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string, type: 'flashcard' | 'practice_test' | 'summary', title: string } | null>(null);
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

  const getFavoriteTimestamps = (type: 'flashcard' | 'practice_test' | 'summary' | 'folder') => {
    try {
      const raw = localStorage.getItem(`${FAVORITE_TS_KEY_PREFIX}.${type}`);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch (e) {
      return {};
    }
  };

  const setFavoriteTimestampLocal = (type: 'flashcard' | 'practice_test' | 'summary' | 'folder', id: string, ts: number | null) => {
    try {
      const map = getFavoriteTimestamps(type);
      if (ts) map[id] = ts; else delete map[id];
      localStorage.setItem(`${FAVORITE_TS_KEY_PREFIX}.${type}`, JSON.stringify(map));
    } catch (e) {
      // ignore
    }
  };

  const sortFavoritesByTimestamps = <T extends { _id: string; isFavorite?: boolean }>(arr: T[], type: 'flashcard' | 'practice_test' | 'summary' | 'folder') => {
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
      const allowed = ['flashcards', 'study_notes', 'practice_tests', 'folders', 'favorites'] as const;
      // Only switch tabs if the URL parameter is valid
      if ((allowed as readonly string[]).includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [searchParams, isLoading]);

  // Separate effect for auto-expanding folders based on subject parameter
  useEffect(() => {
    // Check for subject to auto-expand folder
    const autoExpandSubject = searchParams.get('subject');
    if (autoExpandSubject && viewMode === 'by_folders' && !isLoading) {
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

        setFlashcards(Array.isArray(data?.flashcards) ? sortFavoritesByTimestamps(data.flashcards, 'flashcard') : []);

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
            setPracticeTests(Array.isArray(practiceTestData?.practiceTests) ? sortFavoritesByTimestamps(practiceTestData.practiceTests, 'practice_test') : []);
          }
        } else {
          console.warn('Failed to load practice tests');
        }

        // Fetch summaries
        const summariesRes = await fetch(`/api/student_page/summary?userId=${uid}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (summariesRes.ok) {
          const summariesData = await summariesRes.json();
          if (isMounted && summariesData.success) {
            console.log('📄 Loaded summaries:', summariesData.summaries);
            setSummaries(Array.isArray(summariesData?.summaries) ? sortFavoritesByTimestamps(summariesData.summaries, 'summary') : []);
          }
        } else {
          console.warn('Failed to load summaries');
        }

        // Fetch folders
        const foldersRes = await fetch(`/api/student_page/folder?userId=${uid}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (foldersRes.ok) {
          const foldersData = await foldersRes.json();
          if (isMounted) {
            console.log('📁 Loaded folders:', foldersData);
            setFolders(Array.isArray(foldersData.folders) ? sortFavoritesByTimestamps(foldersData.folders, 'folder') : []);
          }
        } else {
          console.warn('Failed to load folders');
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
    showConfirm(
      'Delete Flashcard',
      'Are you sure you want to delete this flashcard? This action cannot be undone.',
      async () => {
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
          showSuccess('Flashcard deleted successfully');
        } catch (e: unknown) {
          showError(e instanceof Error ? e.message : 'Failed to delete flashcard.');
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

  const openFolderModal = (id: string, type: 'flashcard' | 'practice_test' | 'summary', title: string) => {
    setSelectedItem({ id, type, title });
    setShowFolderModal(true);
    setNewFolderName('');
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (!selectedItem || !userId) return;

    try {
      let endpoint = '';
      let updateData: any = { folder: folderId };

      // Determine the correct API endpoint based on item type
      if (selectedItem.type === 'flashcard') {
        endpoint = `/api/student_page/flashcard/${selectedItem.id}?userId=${userId}`;
      } else if (selectedItem.type === 'summary') {
        endpoint = `/api/student_page/summary?userId=${userId}&summaryId=${selectedItem.id}`;
        updateData = { folder: folderId };
      } else if (selectedItem.type === 'practice_test') {
        endpoint = `/api/student_page/practice-test/${selectedItem.id}?userId=${userId}`;
      }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to move item to folder');
      }

      // Update local state instead of reloading
      if (selectedItem.type === 'flashcard') {
        setFlashcards(prev => prev.map(f =>
          f._id === selectedItem.id ? { ...f, folder: folderId || undefined } : f
        ));
      } else if (selectedItem.type === 'summary') {
        setSummaries(prev => prev.map(s =>
          s._id === selectedItem.id ? { ...s, folder: folderId || undefined } : s
        ));
      } else if (selectedItem.type === 'practice_test') {
        setPracticeTests(prev => prev.map(t =>
          t._id === selectedItem.id ? { ...t, folder: folderId || undefined } : t
        ));
      }

      // Close modal
      setShowFolderModal(false);
      setSelectedItem(null);
      showSuccess('Item moved to folder successfully');
    } catch (error) {
      console.error('Failed to move item to folder:', error);
      showError(error instanceof Error ? error.message : 'Failed to move item to folder');
    }
  };

  const handleCreateFolder = async () => {
    if (!userId || !createFolderName.trim()) return;

    try {
      const folderResponse = await fetch(`/api/student_page/folder?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: createFolderName.trim(),
        }),
      });

      if (!folderResponse.ok) {
        const errorData = await folderResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const folderData = await folderResponse.json();

      // Update local state
      setFolders(prev => [...prev, folderData.folder]);

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
      } else if (selectedItem.type === 'practice_test') {
        endpoint = `/api/student_page/practice-test/${selectedItem.id}?userId=${userId}`;
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
      } else if (selectedItem.type === 'practice_test') {
        setPracticeTests(prev => prev.map(t =>
          t._id === selectedItem.id ? { ...t, folder: newFolderId } : t
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
  const toggleFavorite = async (id: string, type: 'flashcard' | 'practice_test' | 'summary' | 'folder', currentFavorite: boolean) => {
    if (!userId) return;

    console.log(`🔄 Toggling favorite for ${type} ${id}: ${currentFavorite} -> ${!currentFavorite}`);

    try {
      let endpoint = '';
      let updateData = { isFavorite: !currentFavorite };

      if (type === 'flashcard') {
        endpoint = `/api/student_page/flashcard/${id}?userId=${userId}`;
      } else if (type === 'summary') {
        endpoint = `/api/student_page/summary?userId=${userId}&summaryId=${id}`;
      } else if (type === 'practice_test') {
        endpoint = `/api/student_page/practice-test/${id}?userId=${userId}`;
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

      // Update local state and move newly favorited item to the front
      if (type === 'flashcard') {
        setFlashcards(prev => {
          const updated = prev.map(f => f._id === id ? { ...f, isFavorite: !currentFavorite } : f);
          // If we just set it to favorite, move it to the front
          if (!currentFavorite) {
            const idx = updated.findIndex(f => f._id === id);
            if (idx > -1) {
              const [item] = updated.splice(idx, 1);
              updated.unshift(item);
            }
          }
          return updated;
        });
      } else if (type === 'summary') {
        setSummaries(prev => {
          const updated = prev.map(s => s._id === id ? { ...s, isFavorite: !currentFavorite } : s);
          if (!currentFavorite) {
            const idx = updated.findIndex(s => s._id === id);
            if (idx > -1) {
              const [item] = updated.splice(idx, 1);
              updated.unshift(item);
            }
          }
          return updated;
        });
      } else if (type === 'practice_test') {
        setPracticeTests(prev => {
          const updated = prev.map(t => t._id === id ? { ...t, isFavorite: !currentFavorite } : t);
          if (!currentFavorite) {
            const idx = updated.findIndex(t => t._id === id);
            if (idx > -1) {
              const [item] = updated.splice(idx, 1);
              updated.unshift(item);
            }
          }
          return updated;
        });
      } else if (type === 'folder') {
        setFolders(prev => {
          const updated = prev.map(f => f._id === id ? { ...f, isFavorite: !currentFavorite } : f);
          if (!currentFavorite) {
            const idx = updated.findIndex(f => f._id === id);
            if (idx > -1) {
              const [item] = updated.splice(idx, 1);
              updated.unshift(item);
            }
          }
          return updated;
        });
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
          setPracticeTests(prev => prev.map(t =>
            t.folder === folderId ? { ...t, folder: undefined } : t
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

  // Rename handler for practice tests
  const handleRenamePracticeTest = async (test: PracticeTestItem) => {
    if (!userId) return;
    showRename('Rename Practice Test', test.title || '', async (newTitle: string) => {
      if (!newTitle || newTitle.trim() === '' || newTitle === test.title) return;
      try {
        const res = await fetch(`/api/student_page/practice-test/${test._id}?userId=${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle.trim() }),
        });
        if (!res.ok) {
          const maybeUnknown = await res.json().catch(() => ({} as unknown));
          const maybe = maybeUnknown as Partial<{ message?: string }>;
          throw new Error(maybe?.message || `Failed to rename (${res.status})`);
        }
        setPracticeTests(prev => prev.map(t => t._id === test._id ? { ...t, title: newTitle.trim() } : t));
        setOpenMenuId(null);
        showSuccess('Practice test renamed successfully');
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : 'Failed to rename practice test.');
      }
    });
  };

  // Delete practice test
  const handleDeletePracticeTest = async (testId: string) => {
    if (!userId) return;
    showConfirm(
      'Delete Practice Test',
      'Are you sure you want to delete this practice test? This action cannot be undone.',
      async () => {
        try {
          const res = await fetch(`/api/student_page/practice-test?testId=${testId}&userId=${userId}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            setPracticeTests(prev => prev.filter(t => t._id !== testId));
            setOpenMenuId(null);
            showSuccess('Practice test deleted successfully');
          } else {
            showError(data.error || 'Failed to delete');
          }
        } catch (err) {
          showError('Failed to delete practice test');
        }
      },
      { confirmText: 'Delete', isDangerous: true }
    );
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

  // Get unique subjects/folders from flashcards, practice tests, and summaries based on active tab and view mode
  const subjects = useMemo(() => {
    const subjectSet = new Set<string>();

  if (viewMode === 'by_list') {
      // In list view, show folder names instead of subjects
      folders.forEach(folder => {
        subjectSet.add(folder.title);
      });
      // Also add "Uncategorized" for items not in folders
      if (activeTab === 'flashcards') {
        const hasUncategorized = flashcards.some(f => !f.folder);
        if (hasUncategorized) subjectSet.add('Uncategorized');
      } else if (activeTab === 'practice_tests') {
        const hasUncategorized = practiceTests.some(t => !t.folder);
        if (hasUncategorized) subjectSet.add('Uncategorized');
      } else if (activeTab === 'study_notes') {
        const hasUncategorized = summaries.some(s => !s.folder);
        if (hasUncategorized) subjectSet.add('Uncategorized');
      }
    } else {
      // In folder view, show subjects as before
      if (activeTab === 'flashcards') {
        flashcards.forEach(f => {
          if (f.subject) subjectSet.add(f.subject);
        });
      } else if (activeTab === 'practice_tests') {
        practiceTests.forEach(t => {
          if (t.subject) subjectSet.add(t.subject);
        });
      } else if (activeTab === 'study_notes') {
        summaries.forEach(s => {
          if (s.subject) subjectSet.add(s.subject);
        });
      }
    }

    return Array.from(subjectSet).sort();
  }, [flashcards, practiceTests, summaries, activeTab, viewMode, folders]);

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

      // Always sort favorites first within each subject/folder
      items.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });
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

      // Always sort favorites first within each subject/folder
      items.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });
    });

    return grouped;
  }, [practiceTests, filter]);

  const filteredFlashcards = useMemo(() => {
    let list = [...flashcards];

    // Filter by subject or folder depending on view mode
    if (selectedSubject !== 'all') {
  if (viewMode === 'by_list') {
        // Filter by folder name
        if (selectedSubject === 'Uncategorized') {
          list = list.filter(f => !f.folder);
        } else {
          const selectedFolder = folders.find(folder => folder.title === selectedSubject);
          if (selectedFolder) {
            list = list.filter(f => f.folder === selectedFolder._id);
          }
        }
      } else {
        // Filter by subject (original behavior)
        list = list.filter(f => f.subject === selectedSubject);
      }
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

    // Always sort favorites first
    list.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    return list;
  }, [flashcards, filter, selectedSubject, viewMode, folders]);

  const filteredPracticeTests = useMemo(() => {
    let list = [...practiceTests];

    // Filter by subject or folder depending on view mode
    if (selectedSubject !== 'all') {
  if (viewMode === 'by_list') {
        // Filter by folder name
        if (selectedSubject === 'Uncategorized') {
          list = list.filter(t => !t.folder);
        } else {
          const selectedFolder = folders.find(folder => folder.title === selectedSubject);
          if (selectedFolder) {
            list = list.filter(t => t.folder === selectedFolder._id);
          }
        }
      } else {
        // Filter by subject (original behavior)
        list = list.filter(t => t.subject === selectedSubject);
      }
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

    // Always sort favorites first
    list.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    return list;
  }, [practiceTests, filter, selectedSubject, viewMode, folders]);

  const filteredSummaries = useMemo(() => {
    let list = [...summaries];

    // Filter by subject or folder depending on view mode
    if (selectedSubject !== 'all') {
  if (viewMode === 'by_list') {
        // Filter by folder name
        if (selectedSubject === 'Uncategorized') {
          list = list.filter(s => !s.folder);
        } else {
          const selectedFolder = folders.find(folder => folder.title === selectedSubject);
          if (selectedFolder) {
            list = list.filter(s => s.folder === selectedFolder._id);
          }
        }
      } else {
        // Filter by subject (original behavior)
        list = list.filter(s => s.subject === selectedSubject);
      }
    }

    // Sort
    if (filter === 'recent') {
      list.sort((a, b) => {
        const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bd - ad;
      });
    } else if (filter === 'popular') {
      list.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
    } else if (filter === 'alphabetical') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    // Always sort favorites first
    list.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    return list;
  }, [summaries, filter, selectedSubject, viewMode, folders]);

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
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Library</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage and organize your study materials</p>
      </div>

      {/* Navigation Tabs - matching Student Class page style */}
      <div className="mb-8 bg-transparent">
        <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
          {(['favorites', 'flashcards', 'study_notes', 'practice_tests', 'folders'] as const).map((tab) => {
            const label = tab
              .split('_')
              .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
              .join(' ');
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium transition-colors ${activeTab === tab
                  ? 'text-gray-900 dark:text-white border-b-2 border-teal-500 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {tab === 'favorites' ? (
                  <span className="flex items-center gap-2">
                    <svg className={`w-4 h-4 ${activeTab === 'favorites' ? 'text-yellow-400' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{label}</span>
                  </span>
                ) : label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        {/* Use a horizontal, wrapping layout so controls align on small screens */}
        <div className="flex flex-row flex-wrap items-center gap-4">
          {/* View Mode Toggle - only show for non-folder tabs */}
          {activeTab !== 'folders' && (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 w-fit">
              <button
                    onClick={() => setViewMode('by_folders')}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${viewMode === 'by_folders'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                title="View by folders"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="hidden sm:inline">Folders</span>
              </button>
              <button
                onClick={() => setViewMode('by_list')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${viewMode === 'by_list'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                title="View as list"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          )}

          {/* Keep selects compact and allow them to sit inline on mobile */}
          <div className="flex flex-row flex-wrap gap-2 items-center">
            {activeTab !== 'folders' && viewMode === 'by_list' && (
              <select
                id="subject-filter"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm min-w-[8rem] sm:px-3 sm:py-2 sm:text-sm sm:rounded-xl sm:min-w-[12rem]"
              >
                <option value="all">{viewMode === 'by_list' ? 'All Folders' : 'All Subjects'}</option>
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
              className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm min-w-[7rem] sm:px-3 sm:py-2 sm:text-sm sm:rounded-xl sm:min-w-[10rem]"
            >
              <option value="recent">Recent</option>
              <option value="popular">Most Cards</option>
              <option value="alphabetical">A-Z</option>
            </select>

            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-first sm:order-none">
              {activeTab === 'flashcards' && (
                viewMode === 'by_folders'
                  ? `${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}, ${flashcards.length} ${flashcards.length === 1 ? 'set' : 'sets'}`
                  : `${filteredFlashcards.length} ${filteredFlashcards.length === 1 ? 'set' : 'sets'}`
              )}
              {activeTab === 'practice_tests' && (
                viewMode === 'by_folders'
                  ? `${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}, ${practiceTests.length} ${practiceTests.length === 1 ? 'test' : 'tests'}`
                  : `${filteredPracticeTests.length} ${filteredPracticeTests.length === 1 ? 'test' : 'tests'}`
              )}
              {activeTab === 'study_notes' && (
                viewMode === 'by_folders'
                  ? `${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}, ${summaries.length} ${summaries.length === 1 ? 'summary' : 'summaries'}`
                  : `${filteredSummaries.length} ${filteredSummaries.length === 1 ? 'summary' : 'summaries'}`
              )}
              {activeTab === 'folders' && `${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}`}
              {activeTab === 'favorites' && (() => {
                const favoriteFolders = folders.filter(f => f.isFavorite);
                const favoriteFlashcards = flashcards.filter(f => f.isFavorite);
                const favoritePracticeTests = practiceTests.filter(t => t.isFavorite);
                const favoriteSummaries = summaries.filter(s => s.isFavorite);
                const favItemsCount = favoriteFlashcards.length + favoritePracticeTests.length + favoriteSummaries.length;
                return `${favoriteFolders.length} ${favoriteFolders.length === 1 ? 'folder' : 'folders'}, ${favItemsCount} ${favItemsCount === 1 ? 'item' : 'items'}`;
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
          {activeTab === 'practice_tests' && (
            <PrimaryActionButton as="link" href="/student_page/practice_tests" title="Create a practice test">
              <span className="hidden sm:inline">+ Create Test</span>
              <span className="sm:hidden">+ Test</span>
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
            {!isLoading && !error && viewMode === 'by_folders' && (
              <div className="space-y-4">

                {/* Folders - Sort favorites first */}
                {[...folders].sort((a, b) => {
                  if (a.isFavorite && !b.isFavorite) return -1;
                  if (!a.isFavorite && b.isFavorite) return 1;
                  return 0;
                }).map((folder) => {
                  // Get all items in this folder
                  const folderFlashcards = flashcards.filter(f => f.folder === folder._id);
                  const folderPracticeTests = practiceTests.filter(t => t.folder === folder._id);
                  const folderSummaries = summaries.filter(s => s.folder === folder._id);

                  // Determine which types to show depending on the active tab.
                  const showFlashcards = (activeTab as string) === 'flashcards' || (activeTab as string) === 'folders';
                  const showPracticeTests = (activeTab as string) === 'practice_tests' || (activeTab as string) === 'folders';
                  const showSummaries = (activeTab as string) === 'study_notes' || (activeTab as string) === 'folders';

                  const displayedCount = (showFlashcards ? folderFlashcards.length : 0)
                    + (showPracticeTests ? folderPracticeTests.length : 0)
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
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {folder.title}
                              {folder.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {displayedCount} {displayedCount === 1 ? 'item' : 'items'}
                              {showFlashcards && folderFlashcards.length > 0 && ` • ${folderFlashcards.length} flashcard${folderFlashcards.length === 1 ? '' : 's'}`}
                              {showPracticeTests && folderPracticeTests.length > 0 && ` • ${folderPracticeTests.length} test${folderPracticeTests.length === 1 ? '' : 's'}`}
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
                                onClick={() => router.push(`/student_page/library/${item._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
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
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === item._id ? null : item._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === item._id && (
                                    <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
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
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={() => { handleDelete(item._id); setOpenMenuId(null); }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{item.title}</h4>
                                  {item.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Practice Tests in folder */}
                            {showPracticeTests && folderPracticeTests.map((test) => (
                              <div
                                key={`test-${test._id}`}
                                onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                              >
                                {/* Favorite + actions (inside folder) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${test.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={test.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={test.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === test._id ? null : test._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>

                                  {openMenuId === test._id && (
                                    <div
                                      className="absolute right-0 top-10 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {test.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); router.push(`/student_page/practice_tests/${test._id}`); setOpenMenuId(null); }}
                                      >
                                        View
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); handleRenamePracticeTest(test); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); openFolderModal(test._id, 'practice_test', test.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          handleDeletePracticeTest(test._id);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-green-500">Practice Test • {test.totalPoints} pts</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{test.title}</h4>
                                  {test.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{test.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Summaries in folder */}
                            {showSummaries && folderSummaries.map((summary) => (
                              <div
                                key={`summary-${summary._id}`}
                                onClick={() => router.push(`/student_page/summaries/${summary._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
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
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === summary._id ? null : summary._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
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
                                        onClick={async () => {
                                          if (!userId) return;
                                          setOpenMenuId(null);
                                          try {
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

                                            if (!response.ok || !data.success) {
                                              throw new Error(data.error || 'Failed to generate flashcards');
                                            }

                                            router.push('/student_page/library?tab=flashcards');
                                          } catch (error) {
                                            console.error('Flashcard generation failed:', error);
                                            showError(error instanceof Error ? error.message : 'Failed to generate flashcards');
                                          }
                                        }}
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
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={() => { handleDeleteSummary(summary._id); setOpenMenuId(null); }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{summary.title}</h4>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${summary.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                      summary.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                      }`}>
                                      {summary.difficulty}
                                    </span>
                                  </div>
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
                  const uncategorizedFlashcards = flashcards.filter(f => !f.folder);
                  const uncategorizedPracticeTests = practiceTests.filter(t => !t.folder);
                  const uncategorizedSummaries = summaries.filter(s => !s.folder);

                  const showFlashcards = (activeTab as string) === 'flashcards' || (activeTab as string) === 'folders';
                  const showPracticeTests = (activeTab as string) === 'practice_tests' || (activeTab as string) === 'folders';
                  const showSummaries = (activeTab as string) === 'study_notes' || (activeTab as string) === 'folders';

                  const uncategorizedTotal = (showFlashcards ? uncategorizedFlashcards.length : 0)
                    + (showPracticeTests ? uncategorizedPracticeTests.length : 0)
                    + (showSummaries ? uncategorizedSummaries.length : 0);

                  if (uncategorizedTotal === 0) return null;

                  return (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible">
                      {/* Uncategorized Header */}
                      <div
                        onClick={() => setExpandedFolder(expandedFolder === 'uncategorized' ? null : 'uncategorized')}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expandedFolder === 'uncategorized'
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Uncategorized</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {uncategorizedTotal} {uncategorizedTotal === 1 ? 'item' : 'items'} not in folders
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === 'uncategorized' ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Uncategorized Contents */}
                      {expandedFolder === 'uncategorized' && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                            {/* Render uncategorized items similar to above */}
                            {showFlashcards && uncategorizedFlashcards.map((item) => (
                              <div
                                key={`uncategorized-flashcard-${item._id}`}
                                onClick={() => router.push(`/student_page/library/${item._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
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
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === item._id ? null : item._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === item._id && (
                                    <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleFavorite(item._id, 'flashcard', item.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {item.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-7g00 mx-2" />
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
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={() => { handleDelete(item._id); setOpenMenuId(null); }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{item.title}</h4>
                                  {item.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Uncategorized Practice Tests */}
                            {showPracticeTests && uncategorizedPracticeTests.map((test) => (
                              <div
                                key={`uncategorized-test-${test._id}`}
                                onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                              >
                                {/* Favorite + actions (uncategorized practice test) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${test.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={test.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={test.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === test._id ? null : test._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>

                                  {openMenuId === test._id && (
                                    <div
                                      className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {test.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); router.push(`/student_page/practice_tests/${test._id}`); setOpenMenuId(null); }}
                                      >
                                        View
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); handleRenamePracticeTest(test); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); openFolderModal(test._id, 'practice_test', test.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          handleDeletePracticeTest(test._id);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-green-500">Practice Test • {test.totalPoints} pts</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{test.title}</h4>
                                  {test.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{test.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Uncategorized Summaries */}
                            {showSummaries && uncategorizedSummaries.map((summary) => (
                              <div
                                key={`uncategorized-summary-${summary._id}`}
                                onClick={() => router.push(`/student_page/summaries/${summary._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
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
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === summary._id ? null : summary._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
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
                                        onClick={async () => {
                                          if (!userId) return;
                                          setOpenMenuId(null);
                                          try {
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
                                            if (!response.ok || !data.success) {
                                              throw new Error(data.error || 'Failed to generate flashcards');
                                            }
                                            router.push('/student_page/library?tab=flashcards');
                                          } catch (error) {
                                            console.error('Flashcard generation failed:', error);
                                            showError(error instanceof Error ? error.message : 'Failed to generate flashcards');
                                          }
                                        }}
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
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={() => { handleDeleteSummary(summary._id); setOpenMenuId(null); }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{summary.title}</h4>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${summary.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                      summary.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                      }`}>
                                      {summary.difficulty}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* List View - Original Grid */}
            {!isLoading && !error && viewMode === 'by_list' && filteredFlashcards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredFlashcards.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => router.push(`/student_page/library/${item._id}`)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-[var(--dark-border,#2E2E2E)] rounded-2xl p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative h-full flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                        <span className="text-xs sm:text-sm font-medium text-teal-600">{item.cards?.length || 0} cards</span>
                        {item.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id, 'flashcard', item.isFavorite || false); }}
                          className={`p-1.5 rounded-lg transition-colors ${item.isFavorite
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-400 hover:text-yellow-500'
                            }`}
                          title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === item._id ? null : item._id); }}
                          className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                          aria-label="Open actions"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-teal-600/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-teal-600">Y</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-slate-400">You</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>

                    {/* Dropdown Menu */}
                    {openMenuId === item._id && (
                      <div className="absolute top-12 right-2 sm:right-4 w-44 sm:w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                        {/* Share option removed from ellipsis menu per request */}
                        <button
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                          onClick={() => { toggleFavorite(item._id, 'flashcard', item.isFavorite || false); setOpenMenuId(null); }}
                        >
                          {item.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                        <button
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                          onClick={() => handleRename(item)}
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
                          className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                          onClick={() => handleDelete(item._id)}
                        >
                          Delete
                        </button>

                        {/* Floating share submenu removed */}
                      </div>
                    )}
                  </div>
                ))}
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
              const favoriteFolders = folders.filter(f => f.isFavorite);
              const favoriteFlashcards = flashcards.filter(f => f.isFavorite);
              const favoritePracticeTests = practiceTests.filter(t => t.isFavorite);
              const favoriteSummaries = summaries.filter(s => s.isFavorite);
              const totalFavorites = favoriteFolders.length + favoriteFlashcards.length + favoritePracticeTests.length + favoriteSummaries.length;

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
              if (viewMode === 'by_folders') {
                return (
                  <div className="space-y-4">
                    {/* Favorite folders */}
                    {[...favoriteFolders].map((folder) => {
                      const folderFlashcards = flashcards.filter(f => f.folder === folder._id && f.isFavorite);
                      const folderPracticeTests = practiceTests.filter(t => t.folder === folder._id && t.isFavorite);
                      const folderSummaries = summaries.filter(s => s.folder === folder._id && s.isFavorite);
                      const displayedCount = folderFlashcards.length + folderPracticeTests.length + folderSummaries.length;

                      return (
                        <div
                          key={folder._id}
                          id={`folder-${folder.title.replace(/[^a-zA-Z0-9]/g, '-')}`}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible relative group"
                        >
                          <div
                            onClick={() => setExpandedFolder(expandedFolder === folder._id ? null : folder._id)}
                            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-600/10 text-teal-600'
                                }`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  {folder.title}
                                  {folder.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {displayedCount} {displayedCount === 1 ? 'item' : 'items'}
                                  {folderFlashcards.length > 0 && ` • ${folderFlashcards.length} flashcard${folderFlashcards.length === 1 ? '' : 's'}`}
                                  {folderPracticeTests.length > 0 && ` • ${folderPracticeTests.length} test${folderPracticeTests.length === 1 ? '' : 's'}`}
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
                                    onClick={() => router.push(`/student_page/library/${item._id}`)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
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
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === item._id ? null : item._id); }}
                                        className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                        aria-label="Open actions"
                                      >
                                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                      </button>

                                      {openMenuId === item._id && (
                                        <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
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
                                            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                            onClick={() => { handleDelete(item._id); setOpenMenuId(null); }}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                      </div>
                                    </div>
                                    <div className="mb-2 sm:mb-3">
                                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{item.title}</h4>
                                      {item.description && (
                                        <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {folderPracticeTests.map((test) => (
                                  <div
                                    key={`fav-test-${test._id}`}
                                    onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                                  >
                                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); }}
                                        className={`p-1 rounded-lg transition-colors ${test.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                        title={test.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                      >
                                        <svg className="w-4 h-4" fill={test.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                      </button>

                                      <button
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === test._id ? null : test._id); }}
                                        className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                        aria-label="Open actions"
                                      >
                                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                        </svg>
                                      </button>

                                      {openMenuId === test._id && (
                                        <div className="absolute right-0 top-10 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); setOpenMenuId(null); }}>{test.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); router.push(`/student_page/practice_tests/${test._id}`); setOpenMenuId(null); }}>View</button>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); handleRenamePracticeTest(test); setOpenMenuId(null); }}>Rename</button>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); openFolderModal(test._id, 'practice_test', test.title); setOpenMenuId(null); }}>Move to Folder</button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button onClick={async (e) => { e.stopPropagation(); handleDeletePracticeTest(test._id); }} className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors">Delete</button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-xs sm:text-sm font-medium text-green-500">Practice Test • {test.totalPoints} pts</span>
                                      </div>
                                    </div>
                                    <div className="mb-2 sm:mb-3">
                                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{test.title}</h4>
                                      {test.description && (
                                        <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{test.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {folderSummaries.map((summary) => (
                                  <div
                                    key={`fav-sum-${summary._id}`}
                                    onClick={() => router.push(`/student_page/summaries/${summary._id}`)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                                  >
                                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(summary._id, 'summary', summary.isFavorite || false); }} className={`p-1 rounded-lg transition-colors ${summary.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`} title={summary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                                        <svg className="w-4 h-4" fill={summary.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                      </button>

                                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === summary._id ? null : summary._id); }} className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all" aria-label="Open actions">
                                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                      </button>

                                      {openMenuId === summary._id && (
                                        <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl" onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}>{summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { router.push(`/student_page/summaries/${summary._id}`); setOpenMenuId(null); }}>View</button>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { handleRenameSummary(summary); setOpenMenuId(null); }}>Rename</button>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={async () => { if (!userId) return; setOpenMenuId(null); try { const response = await fetch(`/api/student_page/flashcard/generate-from-text?userId=${userId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: summary.content, title: `${summary.title} - Flashcards`, subject: summary.subject, difficulty: summary.difficulty, maxCards: 15 }) }); const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Failed to generate flashcards'); router.push('/student_page/library?tab=flashcards'); } catch (error) { console.error('Flashcard generation failed:', error); showError(error instanceof Error ? error.message : 'Failed to generate flashcards'); } }}>Create Flashcards</button>
                                          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { openFolderModal(summary._id, 'summary', summary.title); setOpenMenuId(null); }}>Move to Folder</button>
                                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                          <button className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl" onClick={() => { handleDeleteSummary(summary._id); setOpenMenuId(null); }}>Delete</button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                        <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                      </div>
                                    </div>
                                    <div className="mb-2 sm:mb-3">
                                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{summary.title}</h4>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Uncategorized favorites */}
                    {(() => {
                      const uncategorizedFlashcards = favoriteFlashcards.filter(f => !f.folder);
                      const uncategorizedPracticeTests = favoritePracticeTests.filter(t => !t.folder);
                      const uncategorizedSummaries = favoriteSummaries.filter(s => !s.folder);
                      const uncategorizedTotal = uncategorizedFlashcards.length + uncategorizedPracticeTests.length + uncategorizedSummaries.length;
                      if (uncategorizedTotal === 0) return null;

                      return (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible">
                          <div className="w-full flex items-center justify-between p-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${'bg-teal-600/10 text-teal-600'}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <div className="text-left">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Uncategorized</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{uncategorizedTotal} {uncategorizedTotal === 1 ? 'item' : 'items'} not in folders</p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                              {uncategorizedFlashcards.map((item) => (
                                <div key={`uncat-fav-flash-${item._id}`} onClick={() => router.push(`/student_page/library/${item._id}`)} className="bg-white dark:bg-slate-800 border rounded-xl p-3 cursor-pointer">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                      <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id, 'flashcard', item.isFavorite || false); }} className={`p-1 rounded-lg ${item.isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}>
                                      <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                    </button>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{item.title}</h4>
                                </div>
                              ))}

                              {uncategorizedPracticeTests.map((test) => (
                                <div key={`uncat-fav-test-${test._id}`} onClick={() => router.push(`/student_page/practice_tests/${test._id}`)} className="bg-white dark:bg-slate-800 border rounded-xl p-3 cursor-pointer">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                                      <span className="text-xs sm:text-sm font-medium text-green-500">Practice Test • {test.totalPoints} pts</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); }} className={`p-1 rounded-lg ${test.isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}>
                                      <svg className="w-4 h-4" fill={test.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                    </button>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{test.title}</h4>
                                </div>
                              ))}

                              {uncategorizedSummaries.map((summary) => (
                                <div key={`uncat-fav-sum-${summary._id}`} onClick={() => router.push(`/student_page/summaries/${summary._id}`)} className="bg-white dark:bg-slate-800 border rounded-xl p-3 cursor-pointer">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                      <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(summary._id, 'summary', summary.isFavorite || false); }} className={`p-1 rounded-lg ${summary.isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}>
                                      <svg className="w-4 h-4" fill={summary.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                    </button>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{summary.title}</h4>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              }

              // List view - show favorite folders first then favorite items (use same card + actions as other tabs)
              return (
                <div className="space-y-6">
                  {favoriteFolders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Favorite Folders</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {favoriteFolders.map(folder => (
                          <div
                            key={`fav-folder-${folder._id}`}
                            onClick={() => { setExpandedFolder(folder._id); setViewMode('by_folders'); }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer relative hover:shadow-lg hover:border-teal-600/20 transition-all duration-200"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{folder.title}</h4>

                              <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(folder._id, 'folder', folder.isFavorite || false); }}
                                  className={`p-1.5 rounded-lg transition-colors ${folder.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
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
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Folder</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Favorite Items</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {[...favoriteFlashcards, ...favoritePracticeTests, ...favoriteSummaries].map((item: any) => {
                        // Determine type by presence of fields and reuse full card UI per type
                        if ((item as FlashcardItem).cards !== undefined) {
                          const fc = item as FlashcardItem;
                          return (
                            <div
                              key={`fav-item-flash-${fc._id}`}
                              onClick={() => router.push(`/student_page/library/${fc._id}`)}
                              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative h-full flex flex-col"
                            >
                              <div className="flex items-start justify-between mb-3 sm:mb-4">
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {fc.cards?.length || 0} cards</span>
                                    {fc.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                                  </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(fc._id, 'flashcard', fc.isFavorite || false); }}
                                    className={`p-1.5 rounded-lg transition-colors ${fc.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={fc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={fc.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === fc._id ? null : fc._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              <div className="mb-3">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{fc.title}</h3>
                                {fc.description && (
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{fc.description}</p>
                                )}
                              </div>

                              <div className="mt-auto flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-500">Y</span>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-slate-400">You</span>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-slate-500">{fc.updatedAt ? new Date(fc.updatedAt).toLocaleDateString() : 'Recently'}</span>
                              </div>

                              {/* Dropdown Menu */}
                              {openMenuId === fc._id && (
                                <div className="absolute top-12 right-2 sm:right-4 w-44 sm:w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { toggleFavorite(fc._id, 'flashcard', fc.isFavorite || false); setOpenMenuId(null); }}>{fc.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</button>
                                  <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { handleRename(fc); setOpenMenuId(null); }}>Rename</button>
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { router.push(`/student_page/library/${fc._id}`); setOpenMenuId(null); }}>Edit</button>
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { openFolderModal(fc._id, 'flashcard', fc.title); setOpenMenuId(null); }}>Move to Folder</button>
                                  <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                  <button className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl" onClick={() => { handleDelete(fc._id); setOpenMenuId(null); }}>Delete</button>
                                </div>
                              )}
                            </div>
                          );
                        }

                        if ((item as PracticeTestItem).totalPoints !== undefined) {
                          const pt = item as PracticeTestItem;
                          return (
                            <div
                              key={`fav-item-test-${pt._id}`}
                              onClick={() => router.push(`/student_page/practice_tests/${pt._id}`)}
                              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 relative cursor-pointer"
                            >
                              <div className="flex items-start justify-between mb-2 sm:mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-xs sm:text-sm font-medium text-green-500">Practice Test • {pt.totalPoints} pts</span>
                                      </div>
                                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 flex items-center gap-2">{pt.title}</h3>
                                    </div>

                                    <div className="flex items-center gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(pt._id, 'practice_test', pt.isFavorite || false); }} className={`p-1.5 rounded-lg transition-colors ${pt.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`} title={pt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                                    <svg className="w-4 h-4" fill={pt.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === pt._id ? null : pt._id); }} className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all" aria-label="Open actions">
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                  </button>
                                </div>
                              </div>

                              {openMenuId === pt._id && (
                                <div className="absolute right-0 top-12 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); toggleFavorite(pt._id, 'practice_test', pt.isFavorite || false); setOpenMenuId(null); }}>{pt.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</button>
                                  <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); router.push(`/student_page/practice_tests/${pt._id}`); setOpenMenuId(null); }}>View</button>
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); handleRenamePracticeTest(pt); setOpenMenuId(null); }}>Rename</button>
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); openFolderModal(pt._id, 'practice_test', pt.title); setOpenMenuId(null); }}>Move to Folder</button>
                                  <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                  <button onClick={async (e) => { e.stopPropagation(); handleDeletePracticeTest(pt._id); }} className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors">Delete</button>
                                </div>
                              )}

                              <p className="text-xs text-slate-500 dark:text-slate-400">Practice Test • {pt.totalPoints} pts</p>
                            </div>
                          );
                        }

                        // Summary
                        const sm = item as SummaryItem;
                        return (
                          <div
                            key={`fav-item-sum-${sm._id}`}
                            onClick={() => router.push(`/student_page/summaries/${sm._id}`)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 pr-12 sm:pr-16 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                  <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {sm.wordCount} words</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 flex-1 mr-2 flex items-center gap-2 min-w-0">{sm.title}{sm.isFavorite && <span className="text-yellow-500 text-sm">★</span>}</h3>
                              </div>
                              <div className="absolute top-4 right-4 flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(sm._id, 'summary', sm.isFavorite || false); }} className={`p-1.5 rounded-lg transition-colors ${sm.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`} title={sm.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                                  <svg className="w-4 h-4" fill={sm.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === sm._id ? null : sm._id); }} className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all" aria-label="Open actions">
                                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4">
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Subject: {sm.subject}</p>
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Words: {sm.wordCount} • {sm.readingTime} min read</p>
                            </div>

                            {/* Dropdown Menu */}
                            {openMenuId === sm._id && (
                              <div className="absolute top-12 right-2 sm:right-4 w-44 sm:w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl" onClick={() => { toggleFavorite(sm._id, 'summary', sm.isFavorite || false); setOpenMenuId(null); }}>{sm.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</button>
                                <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { router.push(`/student_page/summaries/${sm._id}`); setOpenMenuId(null); }}>View</button>
                                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { handleRenameSummary(sm); setOpenMenuId(null); }}>Rename</button>
                                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={async () => {
                                  if (!userId) return; setOpenMenuId(null);
                                  try {
                                    const response = await fetch(`/api/student_page/flashcard/generate-from-text?userId=${userId}`, {
                                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: sm.content, title: `${sm.title} - Flashcards`, subject: sm.subject, difficulty: sm.difficulty, maxCards: 15 })
                                    });
                                    const data = await response.json();
                                    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to generate flashcards');
                                    router.push('/student_page/library?tab=flashcards');
                                  } catch (error) { console.error('Flashcard generation failed:', error); showError(error instanceof Error ? error.message : 'Failed to generate flashcards'); }
                                }}>Create Flashcards</button>
                                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600" onClick={() => { openFolderModal(sm._id, 'summary', sm.title); setOpenMenuId(null); }}>Move to Folder</button>
                                <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                <button className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl" onClick={() => { handleDeleteSummary(sm._id); setOpenMenuId(null); }}>Delete</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {activeTab === 'practice_tests' && (
          <div>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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


            {/* Folder View for Practice Tests */}
            {!isLoading && practiceTests.length > 0 && viewMode === 'by_folders' && (
              <div className="space-y-4">
                {/* Folders - Sort favorites first */}
                {[...folders].sort((a, b) => {
                  if (a.isFavorite && !b.isFavorite) return -1;
                  if (!a.isFavorite && b.isFavorite) return 1;
                  return 0;
                }).map((folder) => {
                  // Get all practice tests in this folder
                  const folderPracticeTests = practiceTests.filter(t => t.folder === folder._id);

                  // Only show folder if it has practice tests
                  if (folderPracticeTests.length === 0) return null;

                  return (
                    <div
                      key={folder._id}
                      id={`folder-${folder.title.replace(/[^a-zA-Z0-9]/g, '-')}`}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible relative group"
                    >
                      {/* Folder Header */}
                      <div
                        onClick={() => setExpandedFolder(expandedFolder === folder._id ? null : folder._id)}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {folder.title}
                              {folder.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {folderPracticeTests.length} test{folderPracticeTests.length === 1 ? '' : 's'}
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
                            {/* Practice Tests in folder */}
                            {folderPracticeTests.map((test) => (
                              <div
                                key={`test-${test._id}`}
                                onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                              >
                                {/* Favorite + actions (inside folder) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${test.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={test.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={test.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === test._id ? null : test._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>

                                  {openMenuId === test._id && (
                                    <div
                                      className="absolute right-0 top-10 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {test.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); router.push(`/student_page/practice_tests/${test._id}`); setOpenMenuId(null); }}
                                      >
                                        View
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); handleRenamePracticeTest(test); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); openFolderModal(test._id, 'practice_test', test.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          handleDeletePracticeTest(test._id);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-green-500">Practice Test • {test.totalPoints} pts</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{test.title}</h4>
                                  {test.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{test.description}</p>
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
                  const uncategorizedTests = practiceTests.filter(t => !t.folder);

                  if (uncategorizedTests.length === 0) return null;

                  return (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible">
                      {/* Uncategorized Header */}
                      <div
                        onClick={() => setExpandedFolder(expandedFolder === 'uncategorized' ? null : 'uncategorized')}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expandedFolder === 'uncategorized'
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Uncategorized</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {uncategorizedTests.length} test{uncategorizedTests.length === 1 ? '' : 's'} not in folders
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === 'uncategorized' ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Uncategorized Contents */}
                      {expandedFolder === 'uncategorized' && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                            {/* Render uncategorized practice tests */}
                            {uncategorizedTests.map((test) => (
                              <div
                                key={`uncategorized-test-${test._id}`}
                                onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                              >
                                {/* Favorite + actions (inside folder - uncategorized) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${test.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={test.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={test.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === test._id ? null : test._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>

                                  {openMenuId === test._id && (
                                    <div
                                      className="absolute right-0 top-10 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {test.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); router.push(`/student_page/practice_tests/${test._id}`); setOpenMenuId(null); }}
                                      >
                                        View
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); handleRenamePracticeTest(test); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); openFolderModal(test._id, 'practice_test', test.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          handleDeletePracticeTest(test._id);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-green-500">Practice Test • {test.totalPoints} pts</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{test.title}</h4>
                                  {test.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{test.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* List View for Practice Tests */}
            {!isLoading && practiceTests.length > 0 && viewMode === 'by_list' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredPracticeTests.map((test) => (
                  <div
                    key={test._id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 relative cursor-pointer"
                    onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                  >
                    {/* Favorite action removed here to avoid duplicate star; kept in the actions area */}
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 flex items-center gap-2">
                          {test.title}
                        </h3>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); }}
                          className={`p-1.5 rounded-lg transition-colors ${test.isFavorite
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-400 hover:text-yellow-500'
                            }`}
                          title={test.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <svg className="w-4 h-4" fill={test.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
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
                      </div>

                      {/* Dropdown Menu */}
                      {openMenuId === test._id && (
                        <div
                          className="absolute right-4 top-12 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); setOpenMenuId(null); }}
                          >
                            {test.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                          </button>
                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                          <button
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                            onClick={(e) => { e.stopPropagation(); router.push(`/student_page/practice_tests/${test._id}`); setOpenMenuId(null); }}
                          >
                            View
                          </button>
                          <button
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                            onClick={(e) => { e.stopPropagation(); handleRenamePracticeTest(test); setOpenMenuId(null); }}
                          >
                            Rename
                          </button>
                          <button
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                            onClick={(e) => { e.stopPropagation(); openFolderModal(test._id, 'practice_test', test.title); setOpenMenuId(null); }}
                          >
                            Move to Folder
                          </button>
                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              handleDeletePracticeTest(test._id);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {test.description && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 sm:mb-4 line-clamp-2">
                        {test.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap mb-2 sm:mb-3">
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {test.subject}
                      </span>
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
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

            {!isLoading && summaries.length > 0 && viewMode === 'by_list' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredSummaries.map((summary) => (
                  <div
                    key={summary._id}
                    onClick={() => router.push(`/student_page/summaries/${summary._id}`)}
                    // add right padding to avoid title overlapping absolute action buttons
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 pr-12 sm:pr-16 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 flex-1 mr-2 flex items-center gap-2 min-w-0">
                        {summary.title}
                        {summary.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                      </h3>
                      {/* removed small status badges (completed / difficulty) to avoid overlap with actions */}
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Subject: {summary.subject}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Words: {summary.wordCount} • {summary.readingTime} min read
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Type: {summary.summaryType.replace('-', ' ')}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Created: {new Date(summary.createdAt || '').toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(summary._id, 'summary', summary.isFavorite || false); }}
                        className={`p-1.5 rounded-lg transition-colors ${summary.isFavorite
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-400 hover:text-yellow-500'
                          }`}
                        title={summary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <svg className="w-4 h-4" fill={summary.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === summary._id ? null : summary._id); }}
                        className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                        aria-label="Open actions"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Dropdown Menu */}
                    {openMenuId === summary._id && (
                      <div className="absolute top-12 right-2 sm:right-4 w-44 sm:w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl"
                          onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                        >
                          {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
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
                          onClick={async () => {
                            if (!userId) return;
                            setOpenMenuId(null);

                            try {
                              // Generate flashcards from summary content
                              const response = await fetch(`/api/student_page/flashcard/generate-from-text?userId=${userId}`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  content: summary.content,
                                  title: `${summary.title} - Flashcards`,
                                  subject: summary.subject,
                                  difficulty: summary.difficulty,
                                  maxCards: 15
                                })
                              });

                              const data = await response.json();

                              if (!response.ok || !data.success) {
                                throw new Error(data.error || 'Failed to generate flashcards');
                              }

                              // Success - redirect to library flashcards tab
                              router.push('/student_page/library?tab=flashcards');
                            } catch (error) {
                              console.error('Flashcard generation failed:', error);
                              showError(error instanceof Error ? error.message : 'Failed to generate flashcards');
                            }
                          }}
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
                          className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                          onClick={async () => {
                            handleDeleteSummary(summary._id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Folder View for Study Notes */}
            {!isLoading && summaries.length > 0 && viewMode === 'by_folders' && (
              <div className="space-y-4">
                {/* Folders - Sort favorites first */}
                {[...folders].sort((a, b) => {
                  if (a.isFavorite && !b.isFavorite) return -1;
                  if (!a.isFavorite && b.isFavorite) return 1;
                  return 0;
                }).map((folder) => {
                  // Get all summaries in this folder
                  const folderSummaries = summaries.filter(s => s.folder === folder._id);

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
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
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
                                onClick={() => router.push(`/student_page/summaries/${summary._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
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
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === summary._id ? null : summary._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
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
                                        onClick={async () => {
                                          if (!userId) return;
                                          setOpenMenuId(null);

                                          try {
                                            // Generate flashcards from summary content
                                            const response = await fetch(`/api/student_page/flashcard/generate-from-text?userId=${userId}`, {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json'
                                              },
                                              body: JSON.stringify({
                                                content: summary.content,
                                                title: `${summary.title} - Flashcards`,
                                                subject: summary.subject,
                                                difficulty: summary.difficulty,
                                                maxCards: 15
                                              })
                                            });

                                            const data = await response.json();

                                            if (!response.ok || !data.success) {
                                              throw new Error(data.error || 'Failed to generate flashcards');
                                            }

                                            // Success - redirect to library flashcards tab
                                            showSuccess('Flashcards generated successfully!');
                                            router.push('/student_page/library?tab=flashcards');
                                          } catch (error) {
                                            console.error('Flashcard generation failed:', error);
                                            showError(error instanceof Error ? error.message : 'Failed to generate flashcards');
                                          }
                                        }}
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
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{summary.title}</h4>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${summary.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                      summary.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                      }`}>
                                      {summary.difficulty}
                                    </span>
                                  </div>
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
                  const uncategorizedSummaries = summaries.filter(s => !s.folder);

                  if (uncategorizedSummaries.length === 0) return null;

                  return (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible">
                      {/* Uncategorized Header */}
                      <div
                        onClick={() => setExpandedFolder(expandedFolder === 'uncategorized' ? null : 'uncategorized')}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expandedFolder === 'uncategorized'
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Uncategorized</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {uncategorizedSummaries.length} summar{uncategorizedSummaries.length === 1 ? 'y' : 'ies'} not in folders
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${expandedFolder === 'uncategorized' ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Uncategorized Contents */}
                      {expandedFolder === 'uncategorized' && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                            {/* Render uncategorized summaries */}
                            {uncategorizedSummaries.map((summary) => (
                              <div
                                key={`uncategorized-summary-${summary._id}`}
                                onClick={() => router.push(`/student_page/summaries/${summary._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
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
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === summary._id ? null : summary._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
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
                                        onClick={async () => {
                                          if (!userId) return;
                                          setOpenMenuId(null);

                                          try {
                                            // Generate flashcards from summary content
                                            const response = await fetch(`/api/student_page/flashcard/generate-from-text?userId=${userId}`, {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json'
                                              },
                                              body: JSON.stringify({
                                                content: summary.content,
                                                title: `${summary.title} - Flashcards`,
                                                subject: summary.subject,
                                                difficulty: summary.difficulty,
                                                maxCards: 15
                                              })
                                            });

                                            const data = await response.json();

                                            if (!response.ok || !data.success) {
                                              throw new Error(data.error || 'Failed to generate flashcards');
                                            }

                                            // Success - redirect to library flashcards tab
                                            showSuccess('Flashcards generated successfully!');
                                            router.push('/student_page/library?tab=flashcards');
                                          } catch (error) {
                                            console.error('Flashcard generation failed:', error);
                                            showError(error instanceof Error ? error.message : 'Failed to generate flashcards');
                                          }
                                        }}
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
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{summary.title}</h4>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${summary.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                      summary.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                      }`}>
                                      {summary.difficulty}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                {[...folders].sort((a, b) => {
                  if (a.isFavorite && !b.isFavorite) return -1;
                  if (!a.isFavorite && b.isFavorite) return 1;
                  return 0;
                }).map((folder) => {
                  // Get all items in this folder
                  const folderFlashcards = flashcards.filter(f => f.folder === folder._id);
                  const folderPracticeTests = practiceTests.filter(t => t.folder === folder._id);
                  const folderSummaries = summaries.filter(s => s.folder === folder._id);
                  const totalItems = folderFlashcards.length + folderPracticeTests.length + folderSummaries.length;

                  return (
                    <div
                      key={folder._id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible"
                    >
                      {/* Folder Header */}
                      <div
                        onClick={() => setExpandedFolder(expandedFolder === folder._id ? null : folder._id)}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors relative ${expandedFolder === folder._id
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-600/10 text-teal-600'
                            }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {folder.title}
                              {folder.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {totalItems} {totalItems === 1 ? 'item' : 'items'}
                              {folderFlashcards.length > 0 && ` • ${folderFlashcards.length} flashcard${folderFlashcards.length === 1 ? '' : 's'}`}
                              {folderPracticeTests.length > 0 && ` • ${folderPracticeTests.length} test${folderPracticeTests.length === 1 ? '' : 's'}`}
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

                      {/* Folder Contents */}
                      {expandedFolder === folder._id && (
                        <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50 dark:bg-slate-900/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 overflow-visible">
                            {/* Flashcards in folder */}
                            {folderFlashcards.map((item) => (
                              <div
                                key={`flashcard-${item._id}`}
                                onClick={() => router.push(`/student_page/library/${item._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                              >
                                {/* Favorite + actions (inside folders tab) */}
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
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === item._id ? null : item._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === item._id && (
                                    <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
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
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={() => { handleDelete(item._id); setOpenMenuId(null); }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-blue-500">Flashcard • {item.cards?.length || 0} cards</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{item.title}</h4>
                                  {item.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Practice Tests in folder */}
                            {folderPracticeTests.map((test) => (
                              <div
                                key={`test-${test._id}`}
                                onClick={() => router.push(`/student_page/practice_tests/${test._id}`)}
                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                              >
                                {/* Favorite + actions (inside folders tab) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); }}
                                    className={`p-1 rounded-lg transition-colors ${test.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={test.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <svg className="w-4 h-4" fill={test.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === test._id ? null : test._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>

                                  {openMenuId === test._id && (
                                    <div
                                      className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(test._id, 'practice_test', test.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {test.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600"
                                        onClick={(e) => { e.stopPropagation(); handleRenamePracticeTest(test); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl"
                                        onClick={(e) => { e.stopPropagation(); openFolderModal(test._id, 'practice_test', test.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          handleDeletePracticeTest(test._id);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-green-500">Practice Test • {test.totalPoints} pts</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{test.title}</h4>
                                  {test.description && (
                                    <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2">{test.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Summaries in folder */}
                            {folderSummaries.map((summary) => (
                              <div
                                key={`summary-${summary._id}`}
                                onClick={() => router.push(`/student_page/summaries/${summary._id}`)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all duration-200 group relative"
                              >
                                {/* Favorite + actions (inside folders tab) */}
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
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === summary._id ? null : summary._id); }}
                                    className="p-1.5 rounded-lg hover:bg-teal-600/10 text-gray-400 dark:text-slate-500 hover:text-teal-600 transition-all"
                                    aria-label="Open actions"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>

                                  {openMenuId === summary._id && (
                                    <div className="absolute top-10 right-0 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-teal-600/10 hover:text-teal-600 rounded-t-xl"
                                        onClick={() => { router.push(`/student_page/summaries/${summary._id}`); setOpenMenuId(null); }}
                                      >
                                        View
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C]"
                                        onClick={() => { handleRenameSummary(summary); setOpenMenuId(null); }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C]"
                                        onClick={() => { toggleFavorite(summary._id, 'summary', summary.isFavorite || false); setOpenMenuId(null); }}
                                      >
                                        {summary.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C]"
                                        onClick={async () => {
                                          if (!userId) return;
                                          setOpenMenuId(null);

                                          try {
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

                                            if (!response.ok || !data.success) {
                                              throw new Error(data.error || 'Failed to generate flashcards');
                                            }

                                            router.push('/student_page/library?tab=flashcards');
                                          } catch (error) {
                                            console.error('Flashcard generation failed:', error);
                                            showError(error instanceof Error ? error.message : 'Failed to generate flashcards');
                                          }
                                        }}
                                      >
                                        Create Flashcards
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C]"
                                        onClick={() => { openFolderModal(summary._id, 'summary', summary.title); setOpenMenuId(null); }}
                                      >
                                        Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={async () => {
                                          handleDeleteSummary(summary._id);
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-purple-500">Summary • {summary.wordCount} words</span>
                                  </div>
                                </div>
                                <div className="mb-2 sm:mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{summary.title}</h4>
                                  {/* removed difficulty badge to avoid overlap with actions */}
                                </div>
                              </div>
                            ))}
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

      {/* Alert Notification */}
      <Alert
        type={alert.type}
        message={alert.message}
        title={alert.title}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        autoClose={true}
        autoCloseDelay={5000}
        position="top-right"
        showIcon={true}
      />
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






