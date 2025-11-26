"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAlert } from '@/hooks/useAlert';
import { useFlashcardRequest, useSummaryRequest } from '@/hooks';
import { requestService } from '@/services/RequestService';

type FlashcardItem = {
  _id: string;
  title: string;
  description?: string;
  cards?: Array<{ _id: string; question: string; answer: string }>;
  subject?: string;
  isArchived?: boolean;
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
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'summaries'>('flashcards');
  const [userId, setUserId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useAlert();
  const router = useRouter();

  // Get userId
  useEffect(() => {
    const getUserId = async () => {
      let uid: string | null = null;

      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const response = await requestService.get('/api/v1/users/current');
          if (response.success && response.data?.user) {
            uid = response.data.user._id || response.data.user.id;
          }
        }
      } catch (err) {
        console.warn("Archive: JWT authentication failed:", err);
      }

      if (!uid) {
        uid = localStorage.getItem('userId');
      }

      setUserId(uid);
    };

    getUserId();
  }, []);

  // Use hooks for data fetching
  const { 
    flashcards: hookFlashcards, 
    isLoading: flashcardsLoading 
  } = useFlashcardRequest(userId || undefined);

  const { 
    summaries: hookSummaries, 
    isLoading: summariesLoading 
  } = useSummaryRequest(userId || undefined);

  // Filter archived items
  useEffect(() => {
    if (hookFlashcards) {
      const archivedFlashcards = hookFlashcards.filter(f => f.isArchived);
      setFlashcards(archivedFlashcards);
    }
  }, [hookFlashcards]);

  useEffect(() => {
    if (hookSummaries) {
      const archivedSummaries = hookSummaries.filter(s => s.isArchived);
      setSummaries(archivedSummaries);
    }
  }, [hookSummaries]);

  // Combined loading state
  useEffect(() => {
    setIsLoading(flashcardsLoading || summariesLoading);
  }, [flashcardsLoading, summariesLoading]);

  const { updateFlashcard, deleteFlashcard } = useFlashcardRequest(userId || undefined);
  const { updateSummary, deleteSummary } = useSummaryRequest(userId || undefined);

  const handleUnarchive = async (id: string, type: 'flashcard' | 'summary') => {
    if (!userId) return;

    try {
      let response;
      if (type === 'flashcard') {
        response = await updateFlashcard(id, { isArchived: false });
      } else {
        response = await updateSummary(id, { isArchived: false });
      }

      if (response.success) {
        // Update local state
        if (type === 'flashcard') {
          setFlashcards(prev => prev.filter(f => f._id !== id));
        } else {
          setSummaries(prev => prev.filter(s => s._id !== id));
        }
        showSuccess('Item restored successfully');
      } else {
        throw new Error(response.error || 'Failed to unarchive item');
      }
    } catch (error) {
      console.error('Failed to unarchive item:', error);
      showError(error instanceof Error ? error.message : 'Failed to restore item');
    }
  };

  const handleDelete = async (id: string, type: 'flashcard' | 'summary') => {
    if (!userId) return;
    if (!confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) return;

    try {
      let response;
      if (type === 'flashcard') {
        response = await deleteFlashcard(id);
      } else {
        response = await deleteSummary(id);
      }

      if (response.success) {
        // Update local state
        if (type === 'flashcard') {
          setFlashcards(prev => prev.filter(f => f._id !== id));
        } else {
          setSummaries(prev => prev.filter(s => s._id !== id));
        }
        showSuccess('Item deleted permanently');
      } else {
        throw new Error(response.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      showError(error instanceof Error ? error.message : 'Failed to delete item');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Archive</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your archived study materials</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 sm:mb-8">
        <div className="flex gap-3 sm:gap-6 border-b border-gray-200 dark:border-gray-700">
          {(['flashcards', 'summaries'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-gray-900 dark:text-white border-b-2 border-teal-500 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading archived items...</p>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!isLoading && !error && activeTab === 'flashcards' && (
          <>
            {flashcards.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No archived flashcards</h3>
                <p className="text-gray-500 dark:text-gray-400">Archived flashcard sets will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flashcards.map((flashcard) => (
                  <div key={flashcard._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">{flashcard.title}</h3>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {flashcard.cards?.length || 0} cards
                      </p>
                      {flashcard.subject && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">Subject: {flashcard.subject}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">Archived: {formatDate(flashcard.updatedAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnarchive(flashcard._id, 'flashcard')}
                        className="flex-1 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(flashcard._id, 'flashcard')}
                        className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!isLoading && !error && activeTab === 'summaries' && (
          <>
            {summaries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No archived summaries</h3>
                <p className="text-gray-500 dark:text-gray-400">Archived summaries will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summaries.map((summary) => (
                  <div key={summary._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">{summary.title}</h3>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {summary.wordCount} words • {summary.readingTime} min read
                      </p>
                      {summary.subject && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">Subject: {summary.subject}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">Archived: {formatDate(summary.updatedAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnarchive(summary._id, 'summary')}
                        className="flex-1 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(summary._id, 'summary')}
                        className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
