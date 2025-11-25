"use client";

import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              About NoteWise
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
              Your AI-powered study companion designed to enhance your learning experience.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Our Mission
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                NoteWise is dedicated to revolutionizing the way students learn and study. We believe that 
                effective learning should be accessible, engaging, and personalized. Our platform combines 
                cutting-edge AI technology with proven educational methodologies to help students achieve 
                their academic goals.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                What We Offer
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      Smart Flashcards
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    AI-generated flashcards from your study materials with spaced repetition algorithms 
                    to optimize your learning retention.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      Study Notes
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    Upload your documents (PDF, Word, or text files) and let our AI generate comprehensive 
                    study summaries with key concepts highlighted and organized.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      AI Study Assistant
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    Chat with our AI assistant to get instant help with your studies, generate summaries 
                    from documents, and receive personalized study recommendations.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      Progress & Achievements
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    Track your study streaks, earn achievements, and monitor your learning progress 
                    with detailed analytics to stay motivated and reach your goals.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Our Technology
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                NoteWise is powered by OpenAI's advanced language models to provide intelligent study assistance. 
                Our platform uses natural language processing to understand your study materials, generate 
                high-quality summaries, create effective flashcards, and provide personalized learning support 
                through our AI chatbot.
              </p>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                We combine AI technology with proven learning techniques like spaced repetition to maximize 
                your study efficiency. Your data privacy and security are our top priorities, and we're 
                committed to maintaining the highest standards of protection for all user information.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Contact Us
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Have questions, feedback, or suggestions? We'd love to hear from you!
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href="mailto:not3wis3@gmail.com" className="text-sm sm:text-base text-teal-600 dark:text-teal-400 hover:underline">not3wis3@gmail.com</a>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-gray-200 dark:border-gray-700 pt-6 sm:pt-8">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  © 2024 NoteWise. All rights reserved. Made with ❤️ for students everywhere.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}