"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PrimaryActionButton from "@/components/ui/buttons/PrimaryActionButton";

export default function FlashcardsCreateSetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Load any saved draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("flashcards:create:draft");
      if (raw) {
        const data = JSON.parse(raw);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setSubject(data.subject || "");
        setIsPublic(!!data.isPublic);
      }
    } catch {}
  }, []);

  // Persist as draft while typing
  useEffect(() => {
    const draft = { title, description, subject, isPublic };
    console.log('Saving draft to localStorage:', draft);
    try {
      localStorage.setItem("flashcards:create:draft", JSON.stringify(draft));
    } catch {}
  }, [title, description, subject, isPublic]);

  const handleNext = () => {
    if (!title.trim()) {
      alert('Please enter a title for your flashcard set');
      return;
    }
    console.log('Moving to cards page with subject:', subject);
    router.push("/student_page/flashcards/create/cards");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center mb-4">
            <button
              onClick={() => router.back()}
              className="self-start mb-4 sm:mb-0 sm:mr-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Flashcards • Set Information
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Step 1 of 2 · Tell us about your set
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 lg:p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="space-y-6">
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                placeholder="Enter a title for your flashcard set"
                required
              />
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors resize-vertical"
                placeholder="Add a description (optional)"
                rows={3}
              />
            </div>

            {/* Subject and Public Toggle */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject (Optional)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                  placeholder="Enter a subject (e.g., Math, Science, History)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add a subject to help organize your flashcards
                </p>
              </div>

              <div className="flex items-start lg:items-center lg:justify-center">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-5 h-5 text-teal-500 border-gray-300 dark:border-gray-600 rounded focus:ring-teal-500 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                      Make this set public
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Others can find and study your set
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 sm:mt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors order-2 sm:order-1"
          >
            Cancel
          </button>
          <PrimaryActionButton
            onClick={handleNext}
            disabled={!title.trim()}
            title="Go to cards"
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            Next
          </PrimaryActionButton>
        </div>
      </div>
    </div>
  );
}