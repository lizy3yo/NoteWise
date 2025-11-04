"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type MultipleChoiceQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
  topic: string;
  points: number;
};

type WrittenQuestion = {
  question: string;
  expectedAnswer: string;
  rubric: string[];
  difficulty: string;
  topic: string;
  points: number;
};

type PracticeTest = {
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  timeLimit: number;
  totalPoints: number;
  multipleChoiceQuestions: MultipleChoiceQuestion[];
  writtenQuestions: WrittenQuestion[];
  topics: string[];
  learningObjectives: string[];
  instructions: string;
};

function GeneratePracticeTestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showCustomModal, setShowCustomModal] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [practiceTest, setPracticeTest] = useState<PracticeTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false); // New state for public/private selection

  // Subject/class selection
  const [subject, setSubject] = useState('');
  const [userSubjects, setUserSubjects] = useState<string[]>([]);

  // Customization options
  const [maxQuestions, setMaxQuestions] = useState(20);
  const [includeMultipleChoice, setIncludeMultipleChoice] = useState(true);
  const [includeWritten, setIncludeWritten] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [timeLimit, setTimeLimit] = useState(30);
  const [customTitle, setCustomTitle] = useState('');

  // Get source info
  const source = searchParams.get('source');
  const sets = searchParams.get('sets');

  // Fetch user's enrolled classes to get subjects
  const fetchUserSubjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/student_page/class?active=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success && data.data.classes) {
        const subjects = data.data.classes.map((cls: any) => cls.subject as string);
        const uniqueSubjects = Array.from(new Set(subjects)) as string[];
        setUserSubjects(uniqueSubjects);
      }
    } catch (error) {
      console.error('Error fetching user subjects:', error);
    }
  };

  useEffect(() => {
    // Get userId - try from API first, then localStorage
    async function getUserId() {
      let uid: string | null = null;
      try {
        const token = localStorage.getItem("accessToken");
        if (token) {
          const currentRes = await fetch("/api/v1/users/current", {
            credentials: "include",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
          if (currentRes.ok) {
            const json = await currentRes.json().catch(() => ({} as unknown));
            uid = json?.user?._id;
          }
        }
      } catch (e) {
        // ignore
      }
      if (!uid) uid = localStorage.getItem('userId');
      if (!uid) {
        uid = `temp-user-${Date.now()}`;
        localStorage.setItem('userId', uid);
      }
      setUserId(uid);
      
      // Fetch user's enrolled classes
      if (uid) {
        fetchUserSubjects();
      }
    }
    getUserId();
    
    // If source is upload, retrieve the file from sessionStorage
    if (source === 'upload') {
      const storedFilesData = sessionStorage.getItem('practice_test_upload_files');
      console.log('Stored files data:', storedFilesData ? 'Found' : 'Not found');
      
      if (storedFilesData) {
        try {
          const filesData = JSON.parse(storedFilesData);
          console.log('Parsed files data:', filesData?.length || 0, 'files');
          
          if (filesData && filesData.length > 0) {
            // Convert base64 back to File object (use first file)
            const fileData = filesData[0];
            console.log('Processing file:', fileData.name, fileData.type);
            
            fetch(fileData.data)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], fileData.name, { type: fileData.type });
                console.log('File recreated successfully:', file.name, file.size);
                setUploadedFile(file);
              })
              .catch(err => {
                console.error('Failed to recreate file from base64:', err);
                alert('Failed to load uploaded file. Please try again.');
                router.push('/student_page/practice_tests');
              });
          } else {
            console.error('No files in stored data');
            alert('No files found. Please select a file to upload.');
            router.push('/student_page/practice_tests');
          }
        } catch (e) {
          console.error('Failed to parse stored files JSON:', e);
          alert('Failed to load uploaded file. Please try again.');
          router.push('/student_page/practice_tests');
        }
      } else {
        console.error('No stored files data in sessionStorage');
        alert('No files found. Please select a file to upload.');
        router.push('/student_page/practice_tests');
      }
    }
  }, [source, router]);

  const handleGenerate = async () => {
    if (!userId) return;
    
    setShowCustomModal(false);
    setIsGenerating(true);
    setError(null);

    try {
      let fetchOptions: RequestInit;

      if (source === 'upload' && uploadedFile) {
        // For file uploads, use FormData
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('userId', userId!);
        formData.append('maxQuestions', maxQuestions.toString());
        formData.append('includeMultipleChoice', includeMultipleChoice.toString());
        formData.append('includeWritten', includeWritten.toString());
        formData.append('difficulty', difficulty);
        formData.append('timeLimit', timeLimit.toString());
        if (customTitle) formData.append('title', customTitle);
        if (subject) formData.append('subject', subject);

        fetchOptions = {
          method: 'POST',
          body: formData
        };
      } else {
        // For other sources, use JSON
        let requestBody: any = {
          userId,
          maxQuestions,
          includeMultipleChoice,
          includeWritten,
          difficulty,
          timeLimit,
          title: customTitle || undefined
        };

        if (source === 'paste') {
          const text = sessionStorage.getItem('practice_test_paste_text');
          if (!text) {
            throw new Error('No text found');
          }
          requestBody.source = 'paste';
          requestBody.pastedText = text;
          if (subject) requestBody.subject = subject;
        } else if (sets) {
          const flashcardIds = sets.split(',');
          requestBody.source = 'flashcards';
          requestBody.flashcardIds = flashcardIds;
        } else {
          throw new Error('No source specified');
        }

        fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        };
      }

      const res = await fetch('/api/student_page/practice-test/generate', fetchOptions);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate practice test');
      }

      const generatedTest = data.practiceTest;
      setPracticeTest(generatedTest);
      
      // Automatically save to library after generation
      await saveToLibrary(generatedTest);
      
      // Clean up session storage
      sessionStorage.removeItem('practice_test_paste_text');
      sessionStorage.removeItem('practice_test_upload_files');

    } catch (err: any) {
      setError(err.message || 'Failed to generate practice test');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToLibrary = async (testToSave: any) => {
    if (!testToSave || !userId) return;
    
    try {
      const sourceType = source === 'paste' ? 'paste' : source === 'upload' ? 'upload' : 'flashcards';
      const sourceIds = sets ? sets.split(',') : [];

      const res = await fetch('/api/student_page/practice-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          practiceTest: testToSave,
          sourceType,
          sourceIds,
          isPublic
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save');
      }

      console.log(`✅ Practice test saved to ${isPublic ? 'public' : 'private'} library!`);
      
    } catch (err: any) {
      console.error('Failed to save practice test:', err);
      throw err;
    }
  };

  const handleViewInLibrary = () => {
    if (!practiceTest) return;
    
    // Navigate to library
    router.push(`/student_page/library?tab=practice_tests&subject=${encodeURIComponent(practiceTest.subject)}`);
  };



  const handleTakeTest = () => {
    if (!practiceTest) return;
    // Store test in session and navigate to take test page
    sessionStorage.setItem('current_practice_test', JSON.stringify(practiceTest));
    router.push('/student_page/practice_tests/take');
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Customization Modal */}
      {showCustomModal && !isGenerating && !practiceTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Customize Practice Test
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Configure your test settings before generating
              </p>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Test Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Leave empty for auto-generated title"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Subject/Class Selection - Only show for upload and paste sources */}
                {(source === 'upload' || source === 'paste') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject/Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">Select subject (required)</option>
                      {userSubjects.length > 0 ? (
                        userSubjects.map((subj, index) => (
                          <option key={index} value={subj}>
                            {subj}
                          </option>
                        ))
                      ) : (
                        <option disabled>No enrolled classes found</option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {userSubjects.length > 0 
                        ? 'Select the class/subject for this practice test' 
                        : 'Please enroll in a class first'}
                    </p>
                  </div>
                )}

                {/* Questions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Questions (max. 100)
                  </label>
                  <input
                    type="number"
                    value={maxQuestions}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow free typing, only store valid numbers
                      if (value === '') {
                        setMaxQuestions(0);
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num) && num >= 0) {
                          setMaxQuestions(num);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Validate on blur (when user leaves the field)
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < 5) {
                        setMaxQuestions(5);
                      } else if (value > 100) {
                        setMaxQuestions(100);
                      }
                    }}
                    min="5"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total questions to generate (minimum 5, maximum 100)
                  </p>
                </div>

                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timer (minutes)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow free typing, only store valid numbers
                      if (value === '') {
                        setTimeLimit(0);
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num) && num >= 0) {
                          setTimeLimit(num);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Validate on blur (when user leaves the field)
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < 5) {
                        setTimeLimit(5);
                      }
                    }}
                    min="5"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Question Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Question Types
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMultipleChoice}
                        onChange={(e) => setIncludeMultipleChoice(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Multiple choice</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeWritten}
                        onChange={(e) => setIncludeWritten(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Written</span>
                    </label>
                  </div>
                  {!includeMultipleChoice && !includeWritten && (
                    <p className="text-sm text-red-600 mt-2">At least one question type must be selected</p>
                  )}
                </div>

                {/* Library Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Save To
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 border-teal-600 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/20">
                      <input
                        type="radio"
                        name="library-type"
                        checked={true}
                        readOnly
                        className="w-5 h-5 text-teal-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📚</span>
                          <span className="font-medium text-gray-900 dark:text-white">Library</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">Save to your personal library</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Buttons at bottom */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => router.back()}
                    className="flex-1 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={
                      (!includeMultipleChoice && !includeWritten) ||
                      ((source === 'upload' || source === 'paste') && !subject)
                    }
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                  >
                    Generate Test
                  </button>
                </div>
                {((source === 'upload' || source === 'paste') && !subject) && (
                  <p className="text-sm text-red-600 text-center">Please select a subject/class to continue</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generating State */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Generating your practice test...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This may take up to 30 seconds. Please wait.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isGenerating && (
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Generation Failed
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setShowCustomModal(true);
              }}
              className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Success - Show Generated Test */}
      {practiceTest && !isGenerating && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold">Test Generated Successfully!</h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                    {isPublic ? '🌐 Public' : '🔒 Private'}
                  </span>
                </div>
                <h2 className="text-xl font-semibold mb-2">{practiceTest.title}</h2>
                <p className="text-teal-50 mb-4">{practiceTest.description}</p>
                <p className="text-sm text-teal-100 mb-4">
                  ✓ Saved to your {isPublic ? 'Public' : 'Private'} Library
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Questions</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">
                      {maxQuestions}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Timer (minutes)</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">
                      {practiceTest.timeLimit}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Question type toggles */}
            <div className="flex gap-4 mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMultipleChoice}
                  onChange={(e) => setIncludeMultipleChoice(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="font-medium">Multiple choice</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWritten}
                  onChange={(e) => setIncludeWritten(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="font-medium">Written</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleTakeTest}
              className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all"
            >
              Take This Test Now
            </button>
            <button
              onClick={handleViewInLibrary}
              className="flex-1 px-8 py-4 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              View in {isPublic ? 'Public' : 'Private'} Library
            </button>
          </div>

          {/* Question Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Question Preview
              </h3>
            </div>

            <div className="p-6 space-y-8">
              {/* Multiple Choice Questions */}
              {practiceTest.multipleChoiceQuestions.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Multiple Choice ({practiceTest.multipleChoiceQuestions.length} questions)
                  </h4>
                  <div className="space-y-6">
                    {practiceTest.multipleChoiceQuestions.slice(0, 3).map((q, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold">
                            {idx + 1}
                          </span>
                          <p className="font-medium text-slate-900 dark:text-slate-100 flex-1">
                            {q.question}
                          </p>
                        </div>
                        <div className="ml-11 space-y-2">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                              <span className="text-slate-700 dark:text-slate-300">{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Written Questions */}
              {practiceTest.writtenQuestions.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Written Response ({practiceTest.writtenQuestions.length} questions)
                  </h4>
                  <div className="space-y-6">
                    {practiceTest.writtenQuestions.slice(0, 2).map((q, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                            {idx + 1}
                          </span>
                          <p className="font-medium text-slate-900 dark:text-slate-100 flex-1">
                            {q.question}
                          </p>
                        </div>
                        <div className="ml-11">
                          <div className="h-24 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default function GeneratePracticeTestPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <GeneratePracticeTestContent />
    </Suspense>
  );
}
