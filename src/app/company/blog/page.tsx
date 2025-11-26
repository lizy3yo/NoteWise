"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LearningBlog() {
  const router = useRouter();

  const blogPosts = [
    {
      title: "10 Proven Study Techniques to Boost Your Academic Performance",
      excerpt: "Discover evidence-based study methods that can help you learn more effectively and retain information longer.",
      category: "Study Tips",
      date: "January 20, 2025",
      readTime: "5 min read",
      image: "📚",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "How AI is Transforming Education: A Student's Perspective",
      excerpt: "Explore how artificial intelligence is revolutionizing the way students learn and study in the modern era.",
      category: "Technology",
      date: "January 18, 2025",
      readTime: "7 min read",
      image: "🤖",
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Mastering Time Management: A Guide for Busy Students",
      excerpt: "Learn practical strategies to balance your academic workload, extracurricular activities, and personal life.",
      category: "Productivity",
      date: "January 15, 2025",
      readTime: "6 min read",
      image: "⏰",
      color: "from-orange-500 to-red-500",
    },
    {
      title: "The Science Behind Spaced Repetition and Flashcards",
      excerpt: "Understanding the cognitive science that makes flashcards one of the most effective learning tools.",
      category: "Learning Science",
      date: "January 12, 2025",
      readTime: "8 min read",
      image: "🧠",
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "Creating Effective Study Summaries: Best Practices",
      excerpt: "Tips and techniques for condensing complex information into clear, memorable summaries.",
      category: "Study Tips",
      date: "January 10, 2025",
      readTime: "5 min read",
      image: "📝",
      color: "from-teal-500 to-cyan-500",
    },
    {
      title: "Overcoming Exam Anxiety: Mental Health Tips for Students",
      excerpt: "Practical advice for managing stress and maintaining mental wellness during exam season.",
      category: "Wellness",
      date: "January 8, 2025",
      readTime: "6 min read",
      image: "🧘",
      color: "from-indigo-500 to-purple-500",
    },
  ];

  const categories = [
    "All Posts",
    "Study Tips",
    "Technology",
    "Productivity",
    "Learning Science",
    "Wellness",
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
            Learning Blog
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Insights, tips, and strategies to help you learn smarter and achieve academic success
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category, index) => (
            <button
              key={index}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                index === 0
                  ? "bg-teal-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-400"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Post */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-8 md:p-12 text-white mb-16 cursor-pointer hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-4 py-1 bg-white/20 rounded-full text-sm font-medium">Featured</span>
            <span className="text-white/80">•</span>
            <span className="text-white/80">January 20, 2025</span>
          </div>
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            The Ultimate Guide to AI-Powered Learning in 2025
          </h3>
          <p className="text-xl text-white/90 mb-6 max-w-3xl">
            Discover how artificial intelligence is reshaping education and learn how to leverage AI tools like NoteWise to maximize your learning potential.
          </p>
          <button className="px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            Read Article →
          </button>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {blogPosts.map((post, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => router.push("/auth/signup")}
            >
              <div className={`bg-gradient-to-r ${post.color} p-8 text-center`}>
                <div className="text-6xl mb-2">{post.image}</div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-medium rounded-full">
                    {post.category}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">•</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">{post.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{post.date}</span>
                  <span className="text-teal-600 dark:text-teal-400 font-semibold group-hover:translate-x-1 transition-transform">
                    Read more →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 border border-gray-100 dark:border-gray-700 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Subscribe to Our Newsletter
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Get the latest study tips, learning strategies, and educational insights delivered to your inbox every week
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
