"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Chatbot from "@/components/chatbot/Chatbot";
import { useRef } from "react";

export default function HelpCenter() {
  const router = useRouter();
  const chatbotRef = useRef<any>(null);

  const handleContactSupport = () => {
    // Trigger chatbot to open
    setTimeout(() => {
      const chatbotButton = document.querySelector('[aria-label="Toggle chatbot"]') as HTMLButtonElement;
      if (chatbotButton) {
        chatbotButton.click();
      } else {
        console.error('Chatbot button not found');
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-shrink-0" onClick={() => router.push("/")}>
              <Image src="/notewise.png" alt="NoteWise Logo" width={32} height={32} className="sm:w-10 sm:h-10" />
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                NoteWise
              </h1>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-3 py-2 sm:px-6 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Help Center
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Find answers to common questions and learn how to make the most of NoteWise
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Getting Started */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Getting Started</h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li>• How to create an account</li>
              <li>• Uploading your first document</li>
              <li>• Generating summaries</li>
              <li>• Creating flashcards</li>
            </ul>
          </div>

          {/* Features Guide */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Features Guide</h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li>• AI Summarization</li>
              <li>• Flashcard Generation</li>
              <li>• Study Modes</li>
              <li>• Progress Tracking</li>
            </ul>
          </div>

          {/* Troubleshooting */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Troubleshooting</h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li>• Upload issues</li>
              <li>• Login problems</li>
              <li>• Generation errors</li>
              <li>• Account recovery</li>
            </ul>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Still need help?</h3>
          <p className="text-white/90 text-lg mb-8">Our AI support assistant is here to help you 24/7</p>
          <button
            onClick={handleContactSupport}
            className="inline-block px-8 py-4 bg-white text-teal-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Chat with AI Support
          </button>
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot isAuthenticated={false} />
    </div>
  );
}
