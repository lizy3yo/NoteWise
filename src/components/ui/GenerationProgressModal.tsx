'use client';

import React, { useEffect, useState } from 'react';

interface GenerationProgress {
  isGenerating: boolean;
  type: 'summary' | 'flashcard';
  totalFiles: number;
  completedFiles: number;
  currentFile: string;
  startTime: number;
  results: Array<{ file: string; success: boolean; error?: string }>;
}

interface GenerationProgressModalProps {
  onComplete?: () => void;
}

const STORAGE_KEY = 'generation_progress';

export default function GenerationProgressModal({ onComplete }: GenerationProgressModalProps) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  // Load progress from localStorage
  useEffect(() => {
    const loadProgress = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setProgress(parsed);
        } else {
          // If no stored progress, clear the modal
          setProgress(null);
        }
      } catch (e) {
        console.error('Failed to load generation progress:', e);
      }
    };

    loadProgress();

    // Poll for updates every 300ms (faster polling)
    const interval = setInterval(loadProgress, 300);

    return () => clearInterval(interval);
  }, []);

  // Handle completion (both success and failure)
  useEffect(() => {
    if (!progress) {
      return;
    }
    
    if (progress.isGenerating) {
      return;
    }

    // Generation is complete - only run this once when isGenerating becomes false
    console.log('✅ Generation complete! Setting up auto-close timer');
    const errorCount = progress.results.filter(r => !r.success).length;
    const hasErrors = errorCount > 0;
    
    // Show completion state for 1 second on both success and failure
    const delay = 1000;
    
    console.log('🎯 Closing modal in', delay, 'ms', { hasErrors, errorCount });
    
    const timer = setTimeout(() => {
      console.log('🚀 Closing modal now');
      localStorage.removeItem(STORAGE_KEY);
      setProgress(null);
      if (onComplete) {
        onComplete();
      }
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [progress?.isGenerating, onComplete]);

  if (!progress) {
    return null;
  }

  const percentage = progress.totalFiles > 0 
    ? Math.round((progress.completedFiles / progress.totalFiles) * 100)
    : 0;

  const elapsedTime = Math.floor((Date.now() - progress.startTime) / 1000);
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  const successCount = progress.results.filter(r => r.success).length;
  const errorCount = progress.results.filter(r => !r.success).length;
  const isComplete = !progress.isGenerating;
  const hasErrors = errorCount > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-white relative ${
          isComplete 
            ? hasErrors 
              ? 'bg-gradient-to-r from-red-500 to-red-600' 
              : 'bg-gradient-to-r from-green-500 to-green-600'
            : 'bg-gradient-to-r from-teal-500 to-teal-600'
        }`}>
          {/* Close button */}
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setProgress(null);
              onComplete?.();
            }}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              {isComplete ? (
                hasErrors ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )
              ) : (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {isComplete 
                  ? hasErrors 
                    ? 'Generation Failed' 
                    : 'Generation Complete!'
                  : `Generating ${progress.type === 'summary' ? 'Summaries' : 'Flashcards'}`
                }
              </h3>
              <p className={`text-sm ${isComplete ? 'text-white/90' : 'text-teal-100'}`}>
                {isComplete 
                  ? 'Closing automatically...'
                  : 'Processing your files with AI...'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                File {progress.completedFiles} of {progress.totalFiles}
              </span>
              <span className="font-semibold text-teal-600 dark:text-teal-400">
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Current File */}
          {progress.currentFile && (
            <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Currently processing:</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {progress.currentFile}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {progress.totalFiles}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {successCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Success</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {errorCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
            </div>
          </div>

          {/* Elapsed Time */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Elapsed time: {minutes}:{seconds.toString().padStart(2, '0')}
          </div>

          {/* Results List */}
          {progress.results.length > 0 && (
            <div className="mt-4 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Completed:</p>
              <div className="space-y-1">
                {progress.results.map((result, index) => (
                  <div 
                    key={index}
                    className={`text-xs p-2 rounded flex items-center gap-2 ${
                      result.success 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {result.success ? (
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="truncate flex-1">{result.file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning/Info */}
          {isComplete ? (
            <div className={`mt-4 p-3 rounded-lg border ${
              hasErrors 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <p className={`text-xs flex items-start gap-2 ${
                hasErrors 
                  ? 'text-red-800 dark:text-red-400'
                  : 'text-green-800 dark:text-green-400'
              }`}>
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>
                  {hasErrors 
                    ? 'Some files failed to process. Check the results above.'
                    : 'Generation completed successfully! This modal will close automatically...'
                  }
                </span>
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-800 dark:text-yellow-400 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Please don't close this page. Generation is in progress...</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions to manage generation progress
export const startGeneration = (type: 'summary' | 'flashcard', totalFiles: number) => {
  const progress: GenerationProgress = {
    isGenerating: true,
    type,
    totalFiles,
    completedFiles: 0,
    currentFile: '',
    startTime: Date.now(),
    results: []
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export const updateGenerationProgress = (currentFile: string, completedFiles: number) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const progress = JSON.parse(stored);
      progress.currentFile = currentFile;
      progress.completedFiles = completedFiles;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch (e) {
    console.error('Failed to update generation progress:', e);
  }
};

export const addGenerationResult = (file: string, success: boolean, error?: string) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const progress = JSON.parse(stored);
      progress.results.push({ file, success, error });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch (e) {
    console.error('Failed to add generation result:', e);
  }
};

export const completeGeneration = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('🏁 completeGeneration called, stored:', stored);
    if (stored) {
      const progress = JSON.parse(stored);
      console.log('📝 Before:', progress);
      progress.isGenerating = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      console.log('✅ After: isGenerating set to false');
    } else {
      console.warn('⚠️ No stored progress found in localStorage');
    }
  } catch (e) {
    console.error('❌ Failed to complete generation:', e);
  }
};

export const cancelGeneration = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Force clear any stuck generation state
export const clearGenerationState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear generation state:', e);
  }
};