"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AboutNoteWise() {
  const router = useRouter();

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
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            About NoteWise
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Transforming the way students learn with AI-powered study tools
          </p>
        </div>

        {/* Mission Section */}
        <div className="mb-20">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-6">Our Mission</h3>
            <p className="text-lg leading-relaxed mb-6">
              At NoteWise, we believe that every student deserves access to powerful learning tools that make studying more efficient and effective. Our mission is to empower students worldwide by transforming traditional study materials into interactive, AI-powered learning experiences.
            </p>
            <p className="text-lg leading-relaxed">
              We're committed to helping students learn smarter, not harder, by leveraging cutting-edge artificial intelligence to create personalized summaries and flashcards that enhance knowledge retention and academic success.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">Our Values</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Innovation</h4>
              <p className="text-gray-600 dark:text-gray-300">
                We continuously push the boundaries of AI technology to create better learning experiences for students.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Accessibility</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Quality education tools should be accessible to everyone, regardless of their background or resources.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Excellence</h4>
              <p className="text-gray-600 dark:text-gray-300">
                We strive for excellence in everything we do, from our AI algorithms to our user experience.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-xl border border-gray-100 dark:border-gray-700">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">NoteWise by the Numbers</h3>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">10K+</div>
              <div className="text-gray-600 dark:text-gray-300">Active Students</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">50K+</div>
              <div className="text-gray-600 dark:text-gray-300">Summaries Generated</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">100K+</div>
              <div className="text-gray-600 dark:text-gray-300">Flashcards Created</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">95%</div>
              <div className="text-gray-600 dark:text-gray-300">Student Satisfaction</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Transform Your Learning?
          </h3>
          <button
            onClick={() => router.push("/auth/signup")}
            className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg"
          >
            Get Started Today
          </button>
        </div>
      </main>
    </div>
  );
}
