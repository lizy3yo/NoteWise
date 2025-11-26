"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useEffect } from "react";

export default function Features() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle hash scrolling on page load and when hash changes
  useEffect(() => {
    // Function to scroll to element
    const scrollToElement = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          // Add offset for header
          const headerOffset = 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }
    };

    // Scroll on mount
    scrollToElement();

    // Listen for hash changes
    window.addEventListener("hashchange", scrollToElement);

    return () => {
      window.removeEventListener("hashchange", scrollToElement);
    };
  }, []);

  const features = [
    {
      id: "ai-summarization",
      title: "AI Summarization",
      icon: "📝",
      description: "Transform lengthy documents into clear, concise summaries in seconds",
      color: "from-teal-500 to-cyan-600",
      benefits: [
        "Instant AI-powered text analysis",
        "Customizable summary length and focus",
        "Support for PDF, DOCX, and TXT files",
        "Key concepts and main ideas extraction",
        "Multiple summary styles (brief, detailed, bullet points)",
      ],
      stats: { number: "50K+", label: "Summaries Generated" },
    },
    {
      id: "flashcard-generation",
      title: "Flashcard Generation",
      icon: "🎴",
      description: "Automatically create interactive flashcards from your study materials",
      color: "from-amber-500 to-orange-600",
      benefits: [
        "AI-generated question and answer pairs",
        "Smart difficulty adjustment",
        "Spaced repetition algorithm",
        "Multiple study modes (Learn, Test, Match)",
        "Progress tracking and analytics",
      ],
      stats: { number: "100K+", label: "Flashcards Created" },
    },
    {
      id: "file-upload",
      title: "File Upload",
      icon: "📤",
      description: "Seamlessly upload and process your study materials",
      color: "from-emerald-500 to-teal-600",
      benefits: [
        "Drag and drop interface",
        "Multiple file format support",
        "Batch upload capability",
        "Cloud storage integration",
        "Fast processing with AI",
      ],
      stats: { number: "75K+", label: "Files Processed" },
    },
    {
      id: "progress-tracking",
      title: "Progress Tracking",
      icon: "📊",
      description: "Monitor your learning journey with detailed analytics",
      color: "from-blue-500 to-indigo-600",
      benefits: [
        "Visual progress dashboards",
        "Performance analytics",
        "Study streak tracking",
        "Achievement system",
        "Personalized insights and recommendations",
      ],
      stats: { number: "10K+", label: "Active Learners" },
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
            Powerful Features for Smarter Learning
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover all the tools and capabilities that make NoteWise the ultimate AI-powered study companion
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-12">
          {features.map((feature) => (
            <div
              key={feature.id}
              id={feature.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-100 dark:border-gray-700 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className={`bg-gradient-to-r ${feature.color} p-4 rounded-2xl flex-shrink-0`}>
                  <div className="text-4xl">{feature.icon}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 break-words">
                    {feature.title}
                  </h3>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-6">
                    {feature.description}
                  </p>
                  <ul className="grid md:grid-cols-2 gap-3 mb-6">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="inline-flex items-center gap-3 bg-teal-50 dark:bg-teal-900/20 px-6 py-3 rounded-xl">
                    <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                      {feature.stats.number}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">{feature.stats.label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How It All Works Together */}
        <div className="mt-20 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-12 text-white">
          <h3 className="text-3xl font-bold text-center mb-12">How It All Works Together</h3>
          <div className="grid md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <p className="font-semibold mb-2">Upload Files</p>
              <p className="text-white/80 text-sm">Add your study materials</p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <p className="font-semibold mb-2">AI Processing</p>
              <p className="text-white/80 text-sm">Generate summaries & flashcards</p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <p className="font-semibold mb-2">Study & Track</p>
              <p className="text-white/80 text-sm">Learn and monitor progress</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-white dark:bg-gray-800 rounded-3xl p-12 border border-gray-100 dark:border-gray-700">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Experience These Features?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Start using NoteWise today and transform the way you study with our powerful AI-driven tools
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/auth/signup")}
              className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={() => router.push("/#features")}
              className="px-8 py-4 border-2 border-teal-600 dark:border-teal-400 text-teal-600 dark:text-teal-400 font-semibold rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
            >
              View Quick Overview
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
