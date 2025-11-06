"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
        if (!userId || !confirm('Are you sure you want to delete this summary?')) return;

        try {
            const response = await fetch(`/api/student_page/summary?userId=${userId}&summaryId=${summaryId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                router.push('/student_page/library?tab=study_notes');
            } else {
                alert(data.error || 'Failed to delete summary');
            }
        } catch (err) {
            console.error('Error deleting summary:', err);
            alert('Failed to delete summary');
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
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            href="/student_page/library?tab=study_notes"
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors no-underline"
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                            {summary.title}
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <span>Subject: {summary.subject}</span>
                        <span>•</span>
                        <span>{summary.wordCount} words</span>
                        <span>•</span>
                        <span>{summary.readingTime} min read</span>
                        <span>•</span>
                        <span className="capitalize">{summary.difficulty}</span>
                        <span>•</span>
                        <span>Created: {new Date(summary.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                            onClick={deleteSummary}
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

                    {/* Additional Info */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{summary.wordCount}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Words</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{summary.readingTime}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Min Read</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{Math.round(summary.confidence * 100)}%</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{summary.compressionRatio.toFixed(1)}x</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Compression</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}