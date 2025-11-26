"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function StudyNotes() {
  const router = useRouter();

  const noteCategories = [
    {
      title: "Computer Science",
      icon: "💻",
      topics: ["Data Structures", "Algorithms", "Web Development", "Database Systems"],
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Mathematics",
      icon: "📐",
      topics: ["Calculus", "Linear Algebra", "Statistics", "Discrete Math"],
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Natural Sciences",
      icon: "🔬",
      topics: ["Biology", "Chemistry", "Physics", "Environmental Science"],
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "Business",
      icon: "💼",
      topics: ["Marketing", "Finance", "Management", "Economics"],
      color: "from-orange-500 to-red-500",
    },
  ];

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
            Study Notes Library
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Access thousands of high-quality study notes, summaries, and flashcards created by students and educators
          </p>
        </div>

        {/* Features */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-12 text-white mb-16">
          <h3 className="text-3xl font-bold text-center mb-12">What You'll Find</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Comprehensive Summaries</h4>
              <p className="text-white/90">Detailed notes covering key concepts and topics</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Interactive Flashcards</h4>
              <p className="text-white/90">Practice with ready-made flashcard sets</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Practice Tests</h4>
              <p className="text-white/90">Test your knowledge with quizzes and exams</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl text-center border border-gray-100 dark:border-gray-700">
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-2">50,000+</div>
            <div className="text-gray-600 dark:text-gray-300">Study Notes</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl text-center border border-gray-100 dark:border-gray-700">
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-2">100+</div>
            <div className="text-gray-600 dark:text-gray-300">Subjects</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl text-center border border-gray-100 dark:border-gray-700">
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-2">10,000+</div>
            <div className="text-gray-600 dark:text-gray-300">Contributors</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl text-center border border-gray-100 dark:border-gray-700">
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-2">Daily</div>
            <div className="text-gray-600 dark:text-gray-300">Updates</div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Start Accessing Study Notes
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Sign up now to access our complete library of study notes, summaries, and flashcards
          </p>
          <button
            onClick={() => router.push("/auth/signup")}
            className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg"
          >
            Get Started Free
          </button>
        </div>
      </main>
    </div>
  );
}
