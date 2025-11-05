"use client";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudyModePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [outputType, setOutputType] = useState<"summary" | "flashcards" | "practice_test">("summary");

  // paste state
  const [pasteText, setPasteText] = useState("");
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);
  const MAX_CHARS = 100000;

  // upload state
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // summary options
  const [summaryType, setSummaryType] = useState<'brief' | 'detailed' | 'bullet-points' | 'outline'>('detailed');
  const [maxLength, setMaxLength] = useState(500);
  const [customTitle, setCustomTitle] = useState('');
  const [subject, setSubject] = useState('');

  // Get userId on component mount
  useEffect(() => {
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
    }
    getUserId();
  }, []);

  const handlePasteInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (v.length <= MAX_CHARS) setPasteText(v);
  };

  const handlePasteDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const list = e.dataTransfer.files;
    if (list && list.length > 0) {
      const file = list[0];
      const textTypes = [
        "text/",
        "application/json",
        "application/xml",
        "application/xhtml+xml",
        "application/javascript",
      ];
      if (
        textTypes.some((t) => file.type.startsWith(t)) ||
        file.name.match(/\.(txt|md|csv|json|xml|html?|js)$/i)
      ) {
        const reader = new FileReader();
        reader.onload = () => {
          const txt = String(reader.result || "");
          const combined = pasteText ? pasteText + "\n\n" + txt : txt;
          setPasteText(combined.slice(0, MAX_CHARS));
        };
        reader.readAsText(file);
      }
    } else {
      const dtText = e.dataTransfer.getData("text");
      if (dtText)
        setPasteText((prev) => (prev ? prev + "\n\n" + dtText : dtText).slice(0, MAX_CHARS));
    }
  };

  const handlePasteDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => e.preventDefault();

  const handleFilesAdd = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles((prev) => [...prev, ...Array.from(newFiles)].slice(0, 20));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesAdd(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFilesAdd(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const removeFileAt = (index: number) => setFiles((p) => p.filter((_, i) => i !== index));

  const allowGenerate = files.length > 0 || pasteText.trim().length > 0;

  const handleGenerate = async () => {
    if (!allowGenerate || !userId) return;

    if (outputType === "summary") {
      await generateSummary();
    } else if (outputType === "flashcards") {
      // Redirect to flashcard generation
      if (tab === "upload") {
        sessionStorage.setItem("flashcard_upload_files", JSON.stringify(files.map((f) => f.name)));
        router.push("/student_page/flashcards/create/cards?source=upload");
      } else {
        sessionStorage.setItem("flashcard_paste_text", pasteText);
        router.push("/student_page/flashcards/create/cards?source=paste");
      }
    } else if (outputType === "practice_test") {
      // Redirect to practice test generation
      if (tab === "upload") {
        sessionStorage.setItem("practice_test_upload_files", JSON.stringify(files.map((f) => f.name)));
        router.push("/student_page/practice_tests/generate?source=upload");
      } else {
        sessionStorage.setItem("practice_test_paste_text", pasteText);
        router.push("/student_page/practice_tests/generate?source=paste");
      }
    }
  };

  const generateSummary = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      let response: Response;

      if (tab === "upload" && files.length > 0) {
        // Generate summary from file
        const formData = new FormData();
        formData.append('file', files[0]); // Use first file
        formData.append('title', customTitle || files[0].name);
        formData.append('subject', subject || 'General');
        formData.append('summaryType', summaryType);
        formData.append('maxLength', maxLength.toString());

        response = await fetch(`/api/student_page/summary/generate-from-file?userId=${userId}`, {
          method: 'POST',
          body: formData
        });
      } else {
        // Generate summary from text
        const requestBody = {
          content: pasteText,
          title: customTitle || 'Study Notes Summary',
          subject: subject || 'General',
          summaryType,
          maxLength
        };

        response = await fetch(`/api/student_page/summary/generate-from-text?userId=${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      // Success - redirect to summaries page
      router.push('/student_page/summaries');

    } catch (error) {
      console.error('Summary generation failed:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Generate study notes
              </h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                Paste notes or upload files to create concise study notes and flashcards.
              </p>
            </div>
            <div className="text-sm text-gray-400 sm:text-right">
              <span className="sm:hidden">Characters: </span>
              {pasteText.length}/{MAX_CHARS}
              <span className="hidden sm:inline"> characters</span>
            </div>
          </div>
        </div>

        {/* Input Method Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-full sm:w-fit">
            {["paste", "upload"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t as any)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  tab === t
                    ? "bg-white dark:bg-gray-700 text-teal-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-teal-600 hover:bg-teal-600/5"
                }`}
              >
                {t === "paste" ? "Paste text" : "Upload files"}
              </button>
            ))}
          </div>
        </div>

        {/* Output Type Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            What would you like to create?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: "summary", icon: "📄", title: "Summary", desc: "AI-generated study summary" },
              { type: "flashcards", icon: "🃏", title: "Flashcards", desc: "Interactive study cards" },
              { type: "practice_test", icon: "📝", title: "Practice Test", desc: "Quiz questions" }
            ].map((option) => (
              <button
                key={option.type}
                onClick={() => setOutputType(option.type as any)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  outputType === option.type
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-900/10"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{option.title}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{option.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Summary Options - Only show when summary is selected */}
        {outputType === "summary" && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Summary Options</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Type
                </label>
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="detailed">Detailed Summary</option>
                  <option value="brief">Brief Overview</option>
                  <option value="bullet-points">Bullet Points</option>
                  <option value="outline">Outline Format</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Length (words)
                </label>
                <input
                  type="number"
                  value={maxLength}
                  onChange={(e) => setMaxLength(parseInt(e.target.value) || 500)}
                  min="100"
                  max="1000"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Biology, History"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mb-20 sm:mb-24">
          {tab === "paste" && (
            <div className="relative">
              <textarea
                ref={pasteRef}
                value={pasteText}
                onChange={handlePasteInput}
                onDrop={handlePasteDrop}
                onDragOver={handlePasteDragOver}
                placeholder="Paste your notes here. We'll do the rest."
                className="w-full min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 text-gray-900 dark:text-white resize-vertical text-sm sm:text-base focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
              />
              <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                {pasteText.length}/{MAX_CHARS}
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl py-8 sm:py-12 lg:py-16 flex flex-col items-center justify-center gap-4 text-center bg-white dark:bg-gray-800 min-h-[200px] sm:min-h-[300px] lg:min-h-[400px]"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-md flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                    DOC
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-pink-400 to-rose-500 rounded-md flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                    PDF
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-md flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                    PPT
                  </div>
                </div>
                <div className="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base">
                  Drag notes, slides, or readings here
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Supported: .docx, .pdf, .pptx
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Browse files
                  </button>
                  <input
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    type="file"
                    className="hidden"
                    multiple
                  />
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 gap-2 sm:gap-3"
                    >
                      <div className="text-sm sm:text-base text-gray-900 dark:text-white truncate flex-1 min-w-0">
                        {f.name}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-xs sm:text-sm text-gray-400">
                          {(f.size / 1024).toFixed(0)} KB
                        </div>
                        <button
                          onClick={() => removeFileAt(i)}
                          className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info Card */}
          <div className="mt-6 sm:mt-8 flex items-start gap-3 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
            <div className="w-8 h-8 bg-teal-600/10 dark:bg-teal-600/20 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-teal-600">
                {outputType === "summary" ? "📄" : outputType === "flashcards" ? "🃏" : "📝"}
              </span>
            </div>
            <div>
              <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                {outputType === "summary" ? "AI Summary" : outputType === "flashcards" ? "Flashcards" : "Practice Test"}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {outputType === "summary" 
                  ? "Generate concise AI-powered summaries of your study material"
                  : outputType === "flashcards"
                  ? "Create interactive flashcards for memorization"
                  : "Generate practice questions to test your knowledge"
                }
              </div>
            </div>
          </div>

          {/* Error Display */}
          {generationError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                <span className="text-sm font-medium text-red-900 dark:text-red-100">Generation Failed</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{generationError}</p>
            </div>
          )}
        </div>

        {/* Generate Button - Fixed on mobile, inline on desktop */}
        <div className="fixed sm:static bottom-4 left-4 right-4 sm:bottom-auto sm:left-auto sm:right-auto z-50 sm:z-auto mt-0 sm:mt-8">
          <div className="bg-white dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent p-4 sm:p-0 rounded-xl sm:rounded-none shadow-lg sm:shadow-none border sm:border-none border-gray-200 dark:border-gray-700 flex items-center justify-between sm:justify-end gap-4">
            <div className="text-sm text-gray-400 sm:hidden">
              {files.length > 0
                ? `${files.length} file${files.length > 1 ? 's' : ''}`
                : pasteText.trim().length > 0
                ? "Text ready"
                : "No content"}{" "}
            </div>
            <div className="hidden sm:block text-sm text-gray-400 mr-4">
              {files.length > 0
                ? files.length
                : pasteText.trim().length > 0
                ? 1
                : 0}{" "}
              selected
            </div>
            <button
              onClick={handleGenerate}
              disabled={!allowGenerate || isGenerating}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                !allowGenerate || isGenerating
                  ? "bg-gray-600/30 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:scale-[1.02] hover:shadow-xl"
              } w-full sm:w-auto`}
            >
              {isGenerating && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isGenerating 
                ? `Generating ${outputType === "summary" ? "Summary" : outputType === "flashcards" ? "Flashcards" : "Test"}...`
                : `Generate ${outputType === "summary" ? "Summary" : outputType === "flashcards" ? "Flashcards" : "Test"}`
              }
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mt-8 text-xs text-gray-500 dark:text-gray-400">
          This product is enhanced with AI and may provide incorrect or problematic content. Do not
          enter any personal data.
        </div>
      </div>
    </div>
  );
}
