'use client';

import Link from 'next/link';

export default function FlashcardsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Flashcards
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose how you&apos;d like to create your flashcard set
          </p>
        </div>

        {/* Creation Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          {/* Manual Creation */}
          <Link href="/student_page/flashcards/create/set" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-teal-500 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="w-25 h-25 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Create by Hand
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Manually add terms and definitions to build your flashcard set from scratch
                </p>
                <ul className="text-gray-500 dark:text-gray-400 space-y-1">
                  <li>✓ Full control over content</li>
                  <li>✓ Add images and formatting</li>
                  <li>✓ Perfect for custom study materials</li>
                </ul>
              </div>
            </div>
          </Link>

          {/* Upload Creation */}
          <Link href="/student_page/flashcards/upload" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="w-25 h-25 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Upload File
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Import flashcards from CSV, Excel, or text files to quickly create large sets
                </p>
                <ul className="text-gray-500 dark:text-gray-400 space-y-1">
                  <li>✓ Quick bulk import</li>
                  <li>✓ Supports multiple formats</li>
                  <li>✓ Great for existing study materials</li>
                </ul>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}