"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAlert } from '@/hooks/useAlert';
import { useSummaryRequest } from '@/hooks';
import { requestService } from '@/services/RequestService';

interface Summary {
    _id: string;
    title: string;
    content: string;
    subject: string;
    createdAt: string;
    wordCount: number;
    status: string;
    difficulty: string;
    summaryType: string;
    keyPoints: string[];
    mainTopics: string[];
    compressionRatio: number;
    readingTime: number;
    tags: string[];
    confidence: number;
}

export default function SummaryViewPage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();
    const params = useParams();
    const summaryId = params.id as string;

    // Get userId and fetch summary
    useEffect(() => {
        async function getUserIdAndFetchSummary() {
            let uid: string | null = null;
            try {
                const token = localStorage.getItem("accessToken");
                if (token) {
                    const currentRes = await fetch("/api/v1/users/current", {
                        credentials: "include",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    });
                    if (currentRes.ok) {
                        const json = await currentRes.json().catch(() => ({} as unknown));
                        uid = json?.user?._id;
                    }
                }
            } catch (e) {
                // ignore
            }
            if (!uid) uid = localStorage.getItem('userId');
            if (!uid) {
                uid = `temp-user-${Date.now()}`;
                localStorage.setItem('userId', uid);
            }
            setUserId(uid);

            // Fetch specific summary
            if (uid && summaryId) {
                await fetchSummary(uid, summaryId);
            }
        }
        getUserIdAndFetchSummary();
    }, [summaryId]);

    const fetchSummary = async (uid: string, id: string) => {
        try {
            setLoading(true);
            console.log('Fetching summary with userId:', uid, 'summaryId:', id);
            const response = await fetch(`/api/student_page/summary?userId=${uid}&summaryId=${id}`);
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (data.success && data.summary) {
                setSummary(data.summary);
                // best-effort: check recent activities to see if this summary was already marked read
                try {
                    const histRes = await fetch(`/api/student_page/history?userId=${encodeURIComponent(uid)}&limit=200`);
                    if (histRes.ok) {
                        const histJson = await histRes.json().catch(() => null);
                        const acts = Array.isArray(histJson?.activities) ? histJson.activities : [];
                        const found = acts.find((a: any) => (a.type || '').toString().toLowerCase().includes('summary.read') && a.meta?.summaryId === id);
                        if (found) setHasRead(true);
                    }
                } catch (e) {
                    // ignore history check errors — non-fatal
                }
            } else {
                setError(data.error || 'Summary not found');
            }
        } catch (err) {
            console.error('Error fetching summary:', err);
            setError('Failed to load summary');
        } finally {
            setLoading(false);
        }
    };

    const deleteSummary = async () => {
        // This function performs the delete. Confirmation is handled by the in-app modal.
        if (!userId) {
            showError('User not found.');
            return;
        }

        try {
            setDeleteLoading(true);
            const response = await fetch(`/api/student_page/summary?userId=${userId}&summaryId=${summaryId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                showSuccess('Summary deleted successfully');
                router.push('/student_page/library?tab=study_notes');
            } else {
                showError(data.error || 'Failed to delete summary');
            }
        } catch (err) {
            console.error('Error deleting summary:', err);
            showError('Failed to delete summary');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Delete confirmation modal state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

    const openDeleteConfirm = () => {
        if (!userId) {
            showError('User not found.');
            return;
        }
        setShowDeleteConfirm(true);
    };

    const [showResummarizeModal, setShowResummarizeModal] = useState<boolean>(false);
    const [resummarizeLoading, setResummarizeLoading] = useState<boolean>(false);
    // whether the current user has already marked this summary as read
    const [hasRead, setHasRead] = useState<boolean>(false);
    const [markReadLoading, setMarkReadLoading] = useState<boolean>(false);
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
    const [editedTitle, setEditedTitle] = useState<string>('');
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [editedContent, setEditedContent] = useState<string>('');
    const [editLoading, setEditLoading] = useState<boolean>(false);
    // Confirmation modal for actions (re-used from library style)
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState<{
        title: string;
        message: string;
        onConfirm: () => void | Promise<void>;
        confirmText?: string;
        cancelText?: string;
        isDangerous?: boolean;
    }>({ title: '', message: '', onConfirm: () => {}, confirmText: 'Confirm', cancelText: 'Cancel', isDangerous: false });
    const { showSuccess, showError } = useAlert();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showMenu) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showMenu]);

    const handleRenameTitle = async () => {
        if (!userId || !editedTitle.trim() || editedTitle === summary?.title) {
            setIsEditingTitle(false);
            return;
        }

        try {
            const response = await fetch(`/api/student_page/summary?userId=${userId}&summaryId=${summaryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editedTitle.trim() })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to rename');
            }

            setSummary(prev => prev ? { ...prev, title: editedTitle.trim() } : null);
            setIsEditingTitle(false);
            showSuccess('Title updated successfully');
        } catch (err) {
            console.error('Rename failed:', err);
            showError(err instanceof Error ? err.message : 'Failed to rename');
        }
    };

    const handleSaveContent = async () => {
        if (!userId || !summary) {
            setShowEditModal(false);
            return;
        }

        try {
            setEditLoading(true);
            const response = await fetch(`/api/student_page/summary?userId=${userId}&summaryId=${summaryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: editedTitle.trim(),
                    content: editedContent.trim(),
                    keyPoints: summary.keyPoints?.filter(p => p.trim()),
                    mainTopics: summary.mainTopics?.filter(t => t.trim())
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to update summary');
            }

            // Update with the response data
            if (data.summary) {
                setSummary(data.summary);
            }
            setShowEditModal(false);
            showSuccess('Summary updated successfully');
        } catch (err) {
            console.error('Update failed:', err);
            showError(err instanceof Error ? err.message : 'Failed to update summary');
        } finally {
            setEditLoading(false);
        }
    };

    const resummarize = async () => {
        if (!userId) {
            showError('User not found.');
            return;
        }

        try {
            setResummarizeLoading(true);
            const response = await fetch(`/api/student_page/summary/resummarize?userId=${userId}&summaryId=${summaryId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to resummarize');
            }

            // Update the displayed summary
            setSummary(data.summary);
            setShowResummarizeModal(false);
            showSuccess('Summary rewritten successfully');
        } catch (err) {
            console.error('Rewrite failed:', err);
            showError(err instanceof Error ? err.message : 'Failed to rewrite');
        } finally {
            setResummarizeLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading summary...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Summary Not Found</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        <Link
                            href="/student_page/library?tab=study_notes"
                            className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors no-underline font-medium"
                        >
                            Back to Library
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4 flex-1">
                            <Link
                                href="/student_page/library?tab=study_notes"
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors no-underline"
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            {isEditingTitle ? (
                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onBlur={handleRenameTitle}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameTitle();
                                        if (e.key === 'Escape') { setIsEditingTitle(false); setEditedTitle(summary.title); }
                                    }}
                                    autoFocus
                                    className="flex-1 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-teal-500 focus:outline-none"
                                />
                            ) : (
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                                    {summary.title}
                                </h1>
                            )}
                        </div>
                        
                        {/* Ellipsis Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                aria-label="More options"
                            >
                                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
                                    <button
                                        onClick={() => {
                                            setEditedTitle(summary.title);
                                            setEditedContent(summary.content);
                                            setShowEditModal(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-xl transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setShowMenu(false);
                                            if (!userId || !summary) return;

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
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Create Flashcards from This
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            if (!userId || !summary) {
                                                showError('User not found');
                                                return;
                                            }
                                            if (hasRead) {
                                                showSuccess('You already marked this summary as read');
                                                return;
                                            }

                                            setConfirmModalConfig({
                                                title: 'Mark Summary as Read',
                                                message: 'Mark this summary as read? You can only mark a summary as read once.',
                                                onConfirm: async () => {
                                                    try {
                                                        setMarkReadLoading(true);
                                                        const res = await fetch('/api/student_page/summary/mark-read', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ userId, summaryId: summary._id, title: summary.title })
                                                        });
                                                        const data = await res.json().catch(() => null);
                                                        if (!res.ok || !data?.success) {
                                                            throw new Error(data?.error || 'Failed to mark read');
                                                        }

                                                        setHasRead(true);
                                                        if (data.already) {
                                                            showSuccess('This summary was already marked as read');
                                                        } else {
                                                            showSuccess('Marked summary as read');
                                                        }
                                                        try {
                                                            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                                                                const BC = (window as any).BroadcastChannel;
                                                                if (typeof BC === 'function') {
                                                                    const bc = new BC('notewise.activities');
                                                                    bc.postMessage({ type: 'summary.read', summaryId: summary._id });
                                                                    bc.close();
                                                                }
                                                            }
                                                        } catch (e) {}
                                                    } catch (err: any) {
                                                        console.error('Mark read failed', err);
                                                        showError(err?.message || 'Failed to mark read');
                                                    } finally {
                                                        setMarkReadLoading(false);
                                                    }
                                                },
                                                confirmText: 'Mark as Read',
                                                cancelText: 'Cancel',
                                                isDangerous: false
                                            });
                                            setShowConfirmModal(true);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                                            hasRead 
                                                ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 cursor-default' 
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                        disabled={hasRead}
                                    >
                                        <span>{hasRead ? 'Marked as Read' : 'Mark as Read'}</span>
                                        {hasRead && (
                                            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowResummarizeModal(true);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Rewrite
                                    </button>
                                    <div className="h-px bg-gray-200 dark:bg-gray-700 mx-2" />
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            openDeleteConfirm();
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl transition-colors"
                                    >
                                        Delete Summary
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Created: {new Date(summary.createdAt).toLocaleDateString()}
                        </span>
                        {hasRead && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-xs font-medium">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Completed
                            </span>
                        )}
                    </div>

                    {/* Action Buttons - Hidden, keeping for backward compatibility */}
                    <div className="hidden flex-col sm:flex-row gap-3 sm:gap-4">
                        <button
                            onClick={async () => {
                                if (!userId || !summary) return;

                                try {
                                    // Show loading state
                                    const button = document.querySelector('.flashcard-generate-btn') as HTMLButtonElement;
                                    if (button) {
                                        button.disabled = true;
                                        button.textContent = 'Generating Flashcards...';
                                    }

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
                                    alert(error instanceof Error ? error.message : 'Failed to generate flashcards');

                                    // Reset button state
                                    const button = document.querySelector('.flashcard-generate-btn') as HTMLButtonElement;
                                    if (button) {
                                        button.disabled = false;
                                        button.textContent = 'Create Flashcards from This';
                                    }
                                }
                            }}
                            className="flex-1 bg-teal-600 text-white px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium text-center flashcard-generate-btn disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Flashcards from This
                        </button>
                        <button
                            onClick={() => {
                                if (!userId || !summary) {
                                    showError('User not found');
                                    return;
                                }
                                if (hasRead) {
                                    showSuccess('You already marked this summary as read');
                                    return;
                                }

                                setConfirmModalConfig({
                                    title: 'Mark Summary as Read',
                                    message: 'Mark this summary as read? You can only mark a summary as read once.',
                                    onConfirm: async () => {
                                        try {
                                            setMarkReadLoading(true);
                                            const res = await fetch('/api/student_page/summary/mark-read', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ userId, summaryId: summary._id, title: summary.title })
                                            });
                                            const data = await res.json().catch(() => null);
                                            if (!res.ok || !data?.success) {
                                                throw new Error(data?.error || 'Failed to mark read');
                                            }

                                            setHasRead(true);
                                            showSuccess('Marked summary as read');
                                            // notify other tabs/pages to refresh
                                            try {
                                                if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                                                    const BC = (window as any).BroadcastChannel;
                                                    if (typeof BC === 'function') {
                                                        const bc = new BC('notewise.activities');
                                                        bc.postMessage({ type: 'summary.read', summaryId: summary._id });
                                                        bc.close();
                                                    }
                                                }
                                            } catch (e) {}
                                        } catch (err: any) {
                                            console.error('Mark read failed', err);
                                            showError(err?.message || 'Failed to mark read');
                                        } finally {
                                            setMarkReadLoading(false);
                                        }
                                    },
                                    confirmText: 'Mark as Read',
                                    cancelText: 'Cancel',
                                    isDangerous: false
                                });
                                setShowConfirmModal(true);
                            }}
                            className={`px-6 py-3 ${hasRead ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'} rounded-lg transition-colors font-medium`}
                            disabled={markReadLoading || hasRead}
                        >
                            {hasRead ? 'Marked as Read' : (markReadLoading ? 'Marking...' : 'Mark as Read')}
                        </button>
                        <button
                            onClick={() => setShowResummarizeModal(true)}
                            className="px-6 py-3 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-medium"
                        >
                            Rewrite
                        </button>
                        <button
                            onClick={openDeleteConfirm}
                            className="px-6 py-3 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                        >
                            Delete Summary
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-8">
                    {/* Summary Content */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Summary</h2>
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {summary.content || 'No content available'}
                            </p>
                        </div>
                    </div>

                    {/* Key Points */}
                    {summary.keyPoints && summary.keyPoints.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Key Points</h2>
                            <ul className="space-y-3">
                                {summary.keyPoints.map((point, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <span className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></span>
                                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Main Topics */}
                    {summary.mainTopics && summary.mainTopics.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Main Topics</h2>
                            <div className="flex flex-wrap gap-2">
                                {summary.mainTopics.map((topic, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-2 bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 rounded-full text-sm font-medium"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}


                </div>

                {/* Edit Content Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="absolute inset-0 bg-black/50" onClick={() => { if (!editLoading) setShowEditModal(false); }}></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl my-8">
                            {/* Header with Save/Cancel buttons */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveContent}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${editLoading ? 'opacity-60 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                                        disabled={editLoading}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {editLoading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                        disabled={editLoading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <button
                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                                    onClick={() => { if (!editLoading) setShowEditModal(false); }}
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {/* Edit Title */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Edit Title</h3>
                                    <input
                                        type="text"
                                        value={editedTitle}
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg font-semibold"
                                        placeholder="Enter summary title..."
                                    />
                                </div>

                                {/* Edit Summary Content */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Edit Summary</h3>
                                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                        {/* Toolbar */}
                                        <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex-wrap">
                                            <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Bold">
                                                <span className="font-bold text-sm">B</span>
                                            </button>
                                            <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Italic">
                                                <span className="italic text-sm">I</span>
                                            </button>
                                            <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Underline">
                                                <span className="underline text-sm">U</span>
                                            </button>
                                            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                            <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm" title="Heading 1">H1</button>
                                            <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm" title="Heading 2">H2</button>
                                            <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm" title="Heading 3">H3</button>
                                        </div>
                                        <textarea
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            className="w-full h-48 p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none resize-none"
                                            placeholder="Edit your summary content..."
                                        />
                                    </div>
                                </div>

                                {/* Edit Key Points */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Key Points</h3>
                                        <button
                                            onClick={() => {
                                                const newKeyPoints = [...(summary.keyPoints || []), ''];
                                                setSummary(prev => prev ? { ...prev, keyPoints: newKeyPoints } : null);
                                            }}
                                            className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:text-teal-700"
                                        >
                                            + Add Point
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(summary.keyPoints || []).map((point, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={point}
                                                    onChange={(e) => {
                                                        const newKeyPoints = [...(summary.keyPoints || [])];
                                                        newKeyPoints[index] = e.target.value;
                                                        setSummary(prev => prev ? { ...prev, keyPoints: newKeyPoints } : null);
                                                    }}
                                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                    placeholder="Enter key point..."
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newKeyPoints = (summary.keyPoints || []).filter((_, i) => i !== index);
                                                        setSummary(prev => prev ? { ...prev, keyPoints: newKeyPoints } : null);
                                                    }}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Edit Main Topics */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Main Topics</h3>
                                        <button
                                            onClick={() => {
                                                const newTopics = [...(summary.mainTopics || []), ''];
                                                setSummary(prev => prev ? { ...prev, mainTopics: newTopics } : null);
                                            }}
                                            className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:text-teal-700"
                                        >
                                            + Add Topic
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(summary.mainTopics || []).map((topic, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={topic}
                                                    onChange={(e) => {
                                                        const newTopics = [...(summary.mainTopics || [])];
                                                        newTopics[index] = e.target.value;
                                                        setSummary(prev => prev ? { ...prev, mainTopics: newTopics } : null);
                                                    }}
                                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                    placeholder="Enter topic..."
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newTopics = (summary.mainTopics || []).filter((_, i) => i !== index);
                                                        setSummary(prev => prev ? { ...prev, mainTopics: newTopics } : null);
                                                    }}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Resummarize Confirmation Modal */}
                {showResummarizeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50" onClick={() => { if (!resummarizeLoading) setShowResummarizeModal(false); }}></div>
                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Rewrite Summary</h3>
                                <button
                                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1"
                                    onClick={() => { if (!resummarizeLoading) setShowResummarizeModal(false); }}
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                                This will regenerate and overwrite the existing summary content. Are you sure you want to continue?
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowResummarizeModal(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                                    disabled={resummarizeLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={resummarize}
                                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${resummarizeLoading ? 'opacity-60 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                                    disabled={resummarizeLoading}
                                >
                                    {resummarizeLoading ? 'Rewriting...' : 'Rewrite'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation Modal (re-used style from Library) */}
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                                    onClick={async () => {
                                        try {
                                            await Promise.resolve(confirmModalConfig.onConfirm());
                                        } catch (e) {
                                            // onConfirm should handle its own errors
                                        }
                                        setShowConfirmModal(false);
                                    }}
                                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${confirmModalConfig.isDangerous ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                                    {confirmModalConfig.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50" onClick={() => { if (!deleteLoading) setShowDeleteConfirm(false); }}></div>
                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Delete Summary</h3>
                                <button
                                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1"
                                    onClick={() => { if (!deleteLoading) setShowDeleteConfirm(false); }}
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                                Are you sure you want to delete this summary? This action cannot be undone.
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                                    disabled={deleteLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={deleteSummary}
                                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${deleteLoading ? 'opacity-60 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}