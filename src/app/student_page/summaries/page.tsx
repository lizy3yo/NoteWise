"use client";

import { useState } from "react";
import Link from "next/link";

export default function SummariesPage() {
    const [summaries] = useState([
        {
            id: 1,
            title: "Biology Chapter 5 Summary",
            subject: "Biology",
            createdAt: "2024-11-01",
            wordCount: 450,
            status: "completed"
        },
        {
            id: 2,
            title: "Chemistry Reactions Overview",
            subject: "Chemistry",
            createdAt: "2024-10-28",
            wordCount: 320,
            status: "completed"
        }
    ]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        AI Summaries
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        AI-generated summaries of your uploaded notes and study materials.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="mb-6 flex gap-4">
                    <Link
                        href="/student_page/summaries/create"
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        Generate New Summary
                    </Link>
                    <Link
                        href="/student_page/flashcards/upload"
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Upload Notes First
                    </Link>
                </div>

                {/* Summaries Grid */}
                {summaries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {summaries.map((summary) => (
                            <div
                                key={summary.id}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {summary.title}
                                    </h3>
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                        {summary.status}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Subject: {summary.subject}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Words: {summary.wordCount}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Created: {new Date(summary.createdAt).toLocaleDateString()}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button className="flex-1 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 px-3 py-2 rounded-md text-sm hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors">
                                        View Summary
                                    </button>
                                    <button className="flex-1 bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                        Generate Flashcards
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No summaries yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Upload some notes to get started with AI-generated summaries.
                        </p>
                        <Link
                            href="/student_page/flashcards/upload"
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors no-underline"
                        >
                            Upload Notes
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}