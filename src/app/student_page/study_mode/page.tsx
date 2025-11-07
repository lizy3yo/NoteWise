"use client";
import React, { useRef, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@/components/ui/alert_template/Alert";
import { useAlert } from "@/hooks/useAlert";

function StudyModeContent() {
  const router = useRouter();
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  // create type: summary | flashcards
  const [createType, setCreateType] = useState<'summary' | 'flashcards'>('summary');


  // paste state
  const [pasteText, setPasteText] = useState("");
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);
  const MAX_CHARS = 100000;

  // upload state
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { alert, showError, showSuccess, showInfo, hideAlert } = useAlert();

  // summary options
  const [summaryType, setSummaryType] = useState<'brief' | 'detailed' | 'bullet-points' | 'outline'>('outline');
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [customTitle, setCustomTitle] = useState('');
  // flashcard options
  const [maxCards, setMaxCards] = useState<number>(20);

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

  // support preselect via query param: ?create=flashcards|summary
  const searchParams = useSearchParams();
  useEffect(() => {
    try {
      const createParam = searchParams?.get?.('create') || '';
      if (createParam) {
        const v = createParam.toLowerCase();
        if (v === 'flashcards' || v === 'flashcard') setCreateType('flashcards');
        else if (v === 'summary' || v === 'summaries') setCreateType('summary');
      }
    } catch (e) {
      // ignore
    }
  }, [searchParams]);

  const handlePasteInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (v.length <= MAX_CHARS) setPasteText(v);
    if (alert.isVisible) hideAlert();
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
    if (!newFiles || newFiles.length === 0) {
      console.log('No files to add');
      return;
    }
    console.log('Adding files:', Array.from(newFiles).map(f => ({ name: f.name, size: f.size, type: f.type })));
    const fileArray = Array.from(newFiles);

    // If creating a summary, only allow simple text files that the summary API supports.
    if (createType === 'summary') {
      const supported = fileArray.filter((f) => {
        const n = f.name.toLowerCase();
        return n.endsWith('.txt') || n.endsWith('.csv');
      });

      if (supported.length === 0) {
        // Show a helpful client-side error instead of sending unsupported files to the API.
        showError('Summary uploads currently support only .txt and .csv files. Please paste text or use a .txt/.csv file.', 'Unsupported file type');
        return;
      }

      // clear previous generation errors when we have valid files
      hideAlert();

      setFiles((prev) => {
        const updated = [...prev, ...supported].slice(0, 20);
        console.log('Files state updated:', updated.length, 'files');
        return updated;
      });
      return;
    }

    // Default behaviour for flashcards or other upload types
    setFiles((prev) => {
      const updated = [...prev, ...fileArray].slice(0, 20);
      console.log('Files state updated:', updated.length, 'files');
      return updated;
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed:', e.target.files);
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFilesAdd(selectedFiles);
      // Clear input after processing to allow selecting the same file again
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 100);
    }
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
    await generateSummary();
  };

  const generateSummary = async () => {
    setIsGenerating(true);
    hideAlert();

    console.log('🚀 Starting generation:', {
      createType,
      tab,
      filesCount: files.length,
      pasteTextLength: pasteText.length,
      userId
    });

    try {
      // Convert summary length to word count
      const getMaxLength = (length: 'short' | 'medium' | 'long') => {
        switch (length) {
          case 'short': return 200;
          case 'medium': return 350;
          case 'long': return 500;
          default: return 350;
        }
      };

      const maxLength = getMaxLength(summaryLength);

      // choose endpoint and payload based on createType
      let response: Response | undefined;

      if (createType === 'summary') {
        if (tab === "upload" && files.length > 0) {
          const formData = new FormData();
          formData.append('file', files[0]);
          formData.append('title', customTitle || files[0].name);
          formData.append('summaryType', summaryType);
          formData.append('maxLength', maxLength.toString());

          response = await fetch(`/api/student_page/summary/generate-from-file?userId=${userId}`, {
            method: 'POST',
            body: formData
          });
        } else {
          const requestBody = {
            content: pasteText,
            title: customTitle || 'Study Notes Summary',
            summaryType,
            maxLength
          };

          response = await fetch(`/api/student_page/summary/generate-from-text?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
        }

      } else if (createType === 'flashcards') {
        // generate flashcards
        if (tab === "upload" && files.length > 0) {
          const formData = new FormData();
          formData.append('file', files[0]);
          formData.append('title', customTitle || files[0].name);
          formData.append('maxCards', String(maxCards));

          response = await fetch(`/api/student_page/flashcard/generate-from-file?userId=${userId}`, {
            method: 'POST',
            body: formData
          });
        } else {
          const requestBody = {
            content: pasteText,
            title: customTitle || 'Flashcards from notes',
            maxCards
          };

          response = await fetch(`/api/student_page/flashcard/generate-from-text?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
        }

      }

      if (!response) {
        throw new Error('Invalid create type selected');
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate');
      }

      // Success - redirect to the appropriate library tab
      const successMsg = createType === 'summary' ? 'Summary generated successfully' : 'Flashcards generated successfully';
      showSuccess(successMsg, 'Generation Complete');

      setTimeout(() => {
        if (createType === 'summary') router.push('/student_page/library?tab=study_notes');
        else if (createType === 'flashcards') router.push('/student_page/library?tab=flashcards');
      }, 400);

    } catch (error) {
      console.error('Summary generation failed:', error);
      const msg = error instanceof Error ? error.message : 'Failed to generate summary';
      showError(msg, 'Generation Failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Alert
          type={alert.type}
          message={alert.message}
          title={alert.title}
          isVisible={alert.isVisible}
          onClose={hideAlert}
          autoClose={alert.type === "success"}
          autoCloseDelay={3000}
          position="bottom-right"
        />
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Generate study notes
              </h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                Paste notes or upload files to create AI-powered summaries of your study material.
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
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium text-sm transition-all ${tab === t
                  ? "bg-white dark:bg-gray-700 text-teal-600 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-teal-600 hover:bg-teal-600/5"
                  }`}
              >
                {t === "paste" ? "Paste text" : "Upload files"}
              </button>
            ))}
          </div>
        </div>

        {/* Create Type Selection */}
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">What would you like to create?</div>
          <div className="flex gap-3">
            <button
              onClick={() => setCreateType('summary')}
              className={`flex-1 text-left p-4 rounded-lg border ${createType === 'summary' ? 'border-teal-500 bg-white dark:bg-gray-700 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white/0 dark:bg-transparent'} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 text-teal-600">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">Summary</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">AI-generated study summary</div>
            </button>
            <button
              onClick={() => setCreateType('flashcards')}
              className={`flex-1 text-left p-4 rounded-lg border ${createType === 'flashcards' ? 'border-teal-500 bg-white dark:bg-gray-700 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white/0 dark:bg-transparent'} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 text-orange-600">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5,3C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.11,3 19,3H5M5,5H19V19H5V5M7,7V9H17V7H7M7,11V13H17V11H7M7,15V17H14V15H7Z" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">Flashcards</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Interactive study cards</div>
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{createType === 'summary' ? 'Summary Options' : 'Flashcard Options'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {createType === 'summary' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Summary Type</label>
                  <select
                    value={summaryType}
                    onChange={(e) => setSummaryType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="outline">Outline Format</option>
                    <option value="detailed">Detailed Summary</option>
                    <option value="brief">Brief Overview</option>
                    <option value="bullet-points">Bullet Points</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Length</label>
                  <select
                    value={summaryLength}
                    onChange={(e) => setSummaryLength(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title (Optional)</label>
                  <input 
                    type="text" 
                    value={customTitle} 
                    onChange={(e) => setCustomTitle(e.target.value)} 
                    placeholder="Auto-generated if empty" 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                  />
                </div>
              </>
            )}

            {createType === 'flashcards' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Flashcards to Generate</label>
                  <select
                    value={maxCards}
                    onChange={(e) => setMaxCards(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value={10}>10 flashcards</option>
                    <option value={15}>15 flashcards</option>
                    <option value={20}>20 flashcards</option>
                    <option value={25}>25 flashcards</option>
                    <option value={30}>30 flashcards</option>
                    <option value={40}>40 flashcards</option>
                    <option value={50}>50 flashcards</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    More flashcards provide better coverage but take longer to generate
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title (Optional)</label>
                  <input type="text" value={customTitle} onChange={(e)=>setCustomTitle(e.target.value)} placeholder="Auto-generated if empty" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
              </>
            )}
            
          </div>
        </div>

        <div className="mb-20 sm:mb-24">
          {tab === "paste" && (
            <div className="relative">
              <textarea
                ref={pasteRef}
                value={pasteText}
                onChange={handlePasteInput}
                onDrop={handlePasteDrop}
                onDragOver={handlePasteDragOver}
                placeholder={createType === 'flashcards' ? "Paste your content here (notes, articles, study materials)..." : "Paste your notes here. We'll do the rest."}
                className="w-full min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 text-gray-900 dark:text-white resize-vertical text-sm sm:text-base focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
              />
              <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                {pasteText.length}/{MAX_CHARS}
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div>
              {/* show drop/browse area only when no files selected */}
              {files.length === 0 ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl py-8 sm:py-12 lg:py-16 flex flex-col items-center justify-center gap-4 text-center bg-white dark:bg-gray-800 min-h-[200px] sm:min-h-[300px] lg:min-h-[400px]"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    {createType === 'summary' ? (
                      <>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-gray-400 to-gray-500 rounded-md flex items-center justify-center text-white text-xs sm:text-sm font-bold">TXT</div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-400 to-amber-500 rounded-md flex items-center justify-center text-white text-xs sm:text-sm font-bold">CSV</div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-md flex items-center justify-center text-white text-xs sm:text-sm font-bold">DOC</div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-pink-400 to-rose-500 rounded-md flex items-center justify-center text-white text-xs sm:text-sm font-bold">PDF</div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-md flex items-center justify-center text-white text-xs sm:text-sm font-bold">PPT</div>
                      </>
                    )}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base">
                    {createType === 'flashcards' ? 'Upload files for AI processing' : 'Drag notes, slides, or readings here'}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {createType === 'flashcards'
                      ? 'PDF, Word, PowerPoint, Text files (max 10MB) - Processed with advanced AI'
                      : 'Supported for summaries: .txt, .csv (other formats are not supported by summary upload)'}
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
                      accept={createType === 'summary' ? '.txt,.csv' : '.pdf,.docx,.pptx,.txt,.md,.doc'}
                      className="hidden"
                      multiple
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{(f.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFileAt(i)}
                        className="ml-3 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {/* Removed: '+ Add more files' button - users may not add more files after initial selection */}
                </div>
              )}
            </div>
          )}

          {/* Info Card */}
          <div className="mt-6 sm:mt-8 flex items-start gap-3 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
            <div className="w-8 h-8 bg-teal-600/10 dark:bg-teal-600/20 rounded-md flex items-center justify-center flex-shrink-0">
              <div className="w-5 h-5 text-teal-600">
                {createType === 'summary' ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5,3C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.11,3 19,3H5M5,5H19V19H5V5M7,7V9H17V7H7M7,11V13H17V11H7M7,15V17H14V15H7Z" />
                  </svg>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                {createType === 'summary' ? 'AI Summary' : 'Flashcards'}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {createType === 'summary' ? 'Generate concise AI-powered summaries of your study material' : 'Create interactive flashcards from your notes'}
              </div>
            </div>
          </div>

          {/* Alerts are shown via the global Alert component (useAlert) */}
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
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${!allowGenerate || isGenerating
                ? "bg-gray-600/30 text-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:scale-[1.02] hover:shadow-xl"
                } w-full sm:w-auto`}
            >
              {isGenerating && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {isGenerating ? `Generating ${createType === 'summary' ? 'Summary' : 'Flashcards'}...` : `Generate ${createType === 'summary' ? 'Summary' : 'Flashcards'}`}
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

export default function StudyModePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    }>
      <StudyModeContent />
    </Suspense>
  );
}