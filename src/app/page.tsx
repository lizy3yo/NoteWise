"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import TermsOfService from "@/components/legal/TermsOfService";
import PrivacyPolicy from "@/components/legal/PrivacyPolicy";
import "./home.css";

export default function Home() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when screen size changes to tablet/desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="main-container">
      {/* Header */}
      <header
        className={`header ${isMobileMenuOpen ? "mobile-menu-open" : ""}`}
      >
        <div className="header-content">
          <div className="header-inner">
            <div className="logo-section">
              <Image
                src="/notewise.png"
                alt="NoteWise Logo"
                width={44}
                height={44}
                className="logo-image"
              />
              <h1 className="logo-text">NoteWise</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="navigation desktop-nav">
              <a href="#home" className="nav-link">
                Home
              </a>
              <a href="#features" className="nav-link">
                Features
              </a>
              <a href="#target-users" className="nav-link">
                Target Users
              </a>
              <a href="#how-it-works" className="nav-link">
                How It Works
              </a>
            </nav>

            <div className="header-buttons">
              <div className="desktop-get-started">
                <button
                  className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-200"
                  onClick={() => router.push("/auth/signup")}
                >
                  Sign Up
                </button>
                <button
                  className="px-6 py-2 border border-teal-200 text-teal-600 font-medium rounded-lg hover:bg-teal-50 transition-all duration-200"
                  onClick={() => router.push("/auth/login")}
                >
                  Sign In
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="mobile-menu-btn"
                onClick={toggleMobileMenu}
                aria-label="Toggle mobile menu"
              >
                <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <div className={`mobile-nav ${isMobileMenuOpen ? 'active' : ''}`}>
            <nav className="mobile-nav-content">
              <a href="#home" className="mobile-nav-link" onClick={toggleMobileMenu}>Home</a>
              <a href="#features" className="mobile-nav-link" onClick={toggleMobileMenu}>Features</a>
              <a href="#target-users" className="mobile-nav-link" onClick={toggleMobileMenu}>Target Users</a>
              <a href="#how-it-works" className="mobile-nav-link" onClick={toggleMobileMenu}>How It Works</a>
              <div className="flex flex-col gap-4">
                <button className="mobile-get-started-btn" onClick={() => { router.push('/auth/signup'); toggleMobileMenu(); }}>
                  Sign Up
                </button>
                <button className="px-6 py-3 border border-teal-200 text-teal-600 font-medium rounded-lg hover:bg-teal-50 transition-all duration-200" onClick={() => { router.push('/auth/login'); toggleMobileMenu(); }}>
                  Sign In
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-bg"></div>
        <div className="hero-decoration"></div>

        <div className="hero-content">
          <h2 className="hero-title">
            Transform your notes into
            <span className="hero-title-highlight">
              interactive learning
            </span>
          </h2>

          <p className="hero-description">
            Empower your studies with an AI-powered platform that turns study materials into
            clear summaries and interactive flashcards, helping you learn smarter and retain knowledge better.
          </p>



          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-20 max-w-6xl mx-auto">
            <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-teal-500/30 shadow-md">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all hover:bg-teal-500 hover:scale-110 group">
                <svg className="w-8 h-8 text-teal-600 transition-colors group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Transform Learning Materials</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Upload notes and get clear, easy-to-digest AI-generated summaries</p>
            </div>

            <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-amber-500/30 shadow-md">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all hover:bg-amber-500 hover:scale-110 group">
                <svg className="w-8 h-8 text-amber-600 transition-colors group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Create Interactive Flashcards</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Turn your summaries into engaging flashcards for active learning</p>
            </div>

            <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500/30 shadow-md">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all hover:bg-emerald-500 hover:scale-110 group">
                <svg className="w-8 h-8 text-emerald-600 transition-colors group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Save Time and Effort</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Learn faster and smarter with AI assistance and automated study tools</p>
            </div>

            <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-cyan-500/30 shadow-md">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all hover:bg-cyan-500 hover:scale-110 group">
                <svg className="w-8 h-8 text-cyan-600 transition-colors group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Encourage Smarter Studying</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Focus on understanding rather than memorizing with intelligent study methods</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1C2B1C]/10 rounded-full blur-3xl opacity-50"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-6">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AI-Powered Study Features
            </div>
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              NoteWise's MVP Features
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive AI-powered tools designed to transform how students learn and retain knowledge
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* AI-Powered Summarization */}
            <div className="relative p-8 rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <h4 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Summarization</h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Automatically generates clear, concise summaries from uploaded notes and documents.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-teal-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">PDF, DOCX, TXT support</span>
                  </div>
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-teal-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Instant AI processing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Flashcard Generation Engine */}
            <div className="relative p-8 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>

                <h4 className="text-2xl font-bold text-gray-900 mb-4">Flashcard Generation Engine</h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Transforms key concepts from summaries into interactive flashcards for active recall.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Auto-generated Q&A pairs</span>
                  </div>
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Interactive study mode</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload Interface */}
            <div className="relative p-8 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                <h4 className="text-2xl font-bold text-gray-900 mb-4">File Upload Interface</h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Allows users to upload learning materials in PDF, DOCX, or TXT formats for instant AI processing.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Drag & drop interface</span>
                  </div>
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Multiple format support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Features Row */}
          <div className="grid lg:grid-cols-2 gap-8 mt-8">
            {/* Summary Customization */}
            <div className="relative p-8 rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>

                <h4 className="text-2xl font-bold text-gray-900 mb-4">Summary Customization</h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Lets users adjust the summary length, focus, or writing style to match their study preferences.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Adjustable length & focus</span>
                  </div>
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Personalized study style</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Flashcard Review Mode */}
            <div className="relative p-8 rounded-3xl border border-pink-200 bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>

                <h4 className="text-2xl font-bold text-gray-900 mb-4">Flashcard Review Mode</h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Provides an engaging, quiz-like experience to help students test and retain knowledge effectively.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-pink-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Interactive quiz experience</span>
                  </div>
                  <div className="flex items-center p-2 bg-white/60 rounded-lg">
                    <div className="w-6 h-6 bg-pink-500 rounded-md flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Knowledge retention tracking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Users Section */}
      <section id="target-users" className="py-24 bg-gradient-to-br from-gray-50 to-purple-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-200/30 rounded-full blur-2xl opacity-40"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Perfect for Every Student
            </div>
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Who Are The Target Users?
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              NoteWise is designed for students at every level who want to optimize their learning experience
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* The Overloaded Student */}
            <div className="relative p-8 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>

                <h4 className="text-2xl font-bold text-gray-900 mb-4">The Overloaded Student</h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Struggles to manage multiple subjects, notes, and materials at once.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Needs a tool that quickly summarizes long readings into clear points</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Values organized and accessible notes for easier review and study</span>
                  </div>
                </div>
              </div>
            </div>

            {/* The Active Learner */}
            <div className="relative p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-teal-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>

                <h4 className="text-2xl font-bold text-gray-900 mb-4">The Active Learner</h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Enjoys interactive and engaging study methods like flashcards.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Uses quizzes and repetition to strengthen memory and understanding</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Looks for tools that make studying fun and less repetitive</span>
                  </div>
                </div>
              </div>
            </div>

            {/* The Efficient Achiever */}
            <div className="relative p-8 rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <h4 className="text-2xl font-bold text-gray-900 mb-4">The Efficient Achiever</h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Enjoys interactive and engaging study methods like flashcards.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Uses quizzes and repetition to strengthen memory and understanding</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Looks for tools that make studying fun and less repetitive</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-indigo-200/20 rounded-full blur-2xl opacity-30"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Simple 3-Step Process
            </div>
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How NoteWise Works
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Transform your study materials into interactive learning experiences in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center relative">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl transition-all hover:shadow-2xl hover:scale-110">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-purple-300 -z-10"></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-lg transition-all hover:shadow-xl border border-gray-100">
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Materials</h4>
                <p className="text-gray-600 leading-relaxed">
                  Simply drag and drop your study notes, PDFs, or documents into NoteWise. Our AI instantly processes your materials and prepares them for transformation.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl transition-all hover:shadow-2xl hover:scale-110">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-blue-300 -z-10"></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-lg transition-all hover:shadow-xl border border-gray-100">
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Get AI Summaries</h4>
                <p className="text-gray-600 leading-relaxed">
                  Our AI analyzes your content and creates clear, concise summaries. Customize the length and focus to match your study preferences and learning goals.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl transition-all hover:shadow-2xl hover:scale-110">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-lg transition-all hover:shadow-xl border border-gray-100">
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Study with Flashcards</h4>
                <p className="text-gray-600 leading-relaxed">
                  Practice with automatically generated flashcards in an interactive review mode. Test your knowledge and track your progress as you master the material.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-teal-600 via-cyan-700 to-emerald-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Ready to Transform Your Study Experience?
            </h3>
            <p className="text-xl md:text-2xl text-white/90 mb-12 leading-relaxed">
              Join thousands of students already using NoteWise to learn smarter, retain knowledge better,
              and achieve academic success with AI-powered study tools
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button className="bg-white text-teal-700 px-10 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                onClick={() => router.push('/auth/signup')}
              >
                <span className="flex items-center">
                  Start Learning Smarter
                  <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <button className="border-2 border-white/30 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 hover:border-white/50 transition-all">
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Try Demo
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-12 text-white/80">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Free to get started
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                AI-powered learning
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Instant results
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-1">
              <div className="flex items-center mb-6">
                <Image
                  src="/notewise.png"
                  alt="NoteWise Logo"
                  width={40}
                  height={40}
                  className="mr-3"
                />
                <h4 className="text-2xl font-bold text-white">
                  NoteWise
                </h4>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">
                An AI-powered study companion that transforms learning materials into interactive experiences, helping students learn smarter and retain knowledge better.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center hover:bg-teal-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center hover:bg-teal-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center hover:bg-teal-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h5 className="text-lg font-bold text-white mb-6">Product</h5>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">AI Summarization</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Flashcard Generation</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">File Upload</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Study Modes</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Progress Tracking</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-lg font-bold text-white mb-6">Support</h5>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Student Community</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Study Guides</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Status</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-lg font-bold text-white mb-6">Company</h5>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">About NoteWise</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Learning Blog</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Join Our Team</a></li>
                <li><a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Success Stories</a></li>
                <li>
                  <button
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-gray-300 hover:text-teal-400 transition-colors"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                &copy; 2025 NoteWise. All rights reserved.
              </p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="text-gray-400 hover:text-teal-400 text-sm transition-colors"
                >
                  Terms of Service
                </button>
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-gray-400 hover:text-teal-400 text-sm transition-colors"
                >
                  Privacy Policy
                </button>
                <a href="#" className="text-gray-400 hover:text-teal-400 text-sm transition-colors">Cookie Settings</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms of Service"
      >
        <TermsOfService />
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
      >
        <PrivacyPolicy />
      </Modal>
    </div>
  );
}