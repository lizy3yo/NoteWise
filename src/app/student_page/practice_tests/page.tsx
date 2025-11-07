"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

type FlashcardItem = {
  _id: string;
  title: string;
  description?: string;
  subject?: string;
  cards?: Array<{ _id: string; question: string; answer: string }>;
  updatedAt?: string;
  createdAt?: string;
};

type SummaryItem = {
  _id: string;
  title: string;
  content: string;
  subject: string;
  difficulty: string;
  summaryType: string;
  wordCount: number;
  readingTime: number;
  keyPoints: string[];
  mainTopics: string[];
  createdAt?: string;
  updatedAt?: string;
};

export default function PracticeTestsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"sets" | "notes" | "upload" | "paste" | "drive">("sets");
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

  // files + refs
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // paste state + ref
  const [pasteText, setPasteText] = useState<string>("");
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);

  // new: search & select all
  const [query, setQuery] = useState("");
  const visibleFlashcards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flashcards;
    return flashcards.filter((f) => {
      const title = (f.title || "").toLowerCase();
      const desc = (f.description || "").toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [flashcards, query]);

  const visibleSummaries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter((s) => {
      const title = (s.title || "").toLowerCase();
      const content = (s.content || "").toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [summaries, query]);

  // Group flashcards by subject
  const flashcardsBySubject = useMemo(() => {
    const grouped = new Map<string, FlashcardItem[]>();

    // build folder id -> title map so we can show real folder titles when items are in folders
    const folderMap: Record<string, string> = {};
    folders.forEach((f: any) => { if (f && f._id) folderMap[f._id] = f.title; });

    visibleFlashcards.forEach((flashcard) => {
      const folderTitle = flashcard && (flashcard as any).folder ? folderMap[(flashcard as any).folder] : undefined;
      const subject = folderTitle || flashcard.subject || 'Uncategorized';
      if (!grouped.has(subject)) {
        grouped.set(subject, []);
      }
      grouped.get(subject)!.push(flashcard);
    });

    // Sort alphabetically within each subject
    grouped.forEach((cards) => {
      cards.sort((a, b) => a.title.localeCompare(b.title));
    });

    return grouped;
  }, [visibleFlashcards, folders]);

  // Group summaries by subject
  const summariesBySubject = useMemo(() => {
    const grouped = new Map<string, SummaryItem[]>();

    // folder id -> title map
    const folderMap: Record<string, string> = {};
    folders.forEach((f: any) => { if (f && f._id) folderMap[f._id] = f.title; });

    visibleSummaries.forEach((summary) => {
      const folderTitle = summary && (summary as any).folder ? folderMap[(summary as any).folder] : undefined;
      const subject = folderTitle || summary.subject || 'Uncategorized';
      if (!grouped.has(subject)) {
        grouped.set(subject, []);
      }
      grouped.get(subject)!.push(summary);
    });

    // Sort alphabetically within each subject
    grouped.forEach((summaries) => {
      summaries.sort((a, b) => a.title.localeCompare(b.title));
    });

    return grouped;
  }, [visibleSummaries, folders]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
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
        if (!uid) uid = localStorage.getItem("userId");
        if (!uid) {
          uid = `temp-user-${Date.now()}`;
          localStorage.setItem("userId", uid);
        }
        if (!mounted) return;
        setUserId(uid);

        // Fetch flashcards
        const res = await fetch(`/api/student_page/flashcard?userId=${uid}`, { cache: "no-store" });
        if (!res.ok) {
          const maybe = await res.json().catch(() => ({} as unknown));
          throw new Error(maybe?.message || `Failed to load flashcards (${res.status})`);
        }
        const data = (await res.json()) as { flashcards?: FlashcardItem[] };
        if (!mounted) return;
        setFlashcards(Array.isArray(data?.flashcards) ? data.flashcards : []);

        // Fetch summaries
        const summariesRes = await fetch(`/api/student_page/summary?userId=${uid}`, { cache: "no-store" });
        if (summariesRes.ok) {
          const summariesData = await summariesRes.json();
          if (mounted && summariesData.success) {
            setSummaries(Array.isArray(summariesData?.summaries) ? summariesData.summaries : []);
          }
        }

        // Fetch folders (so practice tests page shows real folder data like Library/Study Notes)
        try {
          const foldersRes = await fetch(`/api/student_page/folder?userId=${uid}`, { cache: "no-store" });
          if (foldersRes.ok) {
            const foldersData = await foldersRes.json();
            if (mounted) {
              setFolders(Array.isArray(foldersData?.folders) ? foldersData.folders : []);
            }
          } else {
            // not fatal for this page — just log
            console.warn('practice_tests: failed to load folders');
          }
        } catch (e) {
          // ignore folder fetch errors
        }
      } catch (e: unknown) {
        if (!mounted) return;
        setError((e as any)?.message || "Failed to load flashcards.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const toggleSelect = (id: string) =>
    setSelectedIds((p) => ({ ...p, [id]: !p[id] }));

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  const selectAllVisible = () => {
    const visibleIds = tab === 'sets' ? visibleFlashcards.map((f) => f._id) : visibleSummaries.map((s) => s._id);
    const allSelected = visibleIds.every((id) => !!selectedIds[id]);
    if (allSelected) {
      // deselect visible
      setSelectedIds((prev) => {
        const copy = { ...prev };
        visibleIds.forEach((id) => delete copy[id]);
        return copy;
      });
    } else {
      // select visible
      setSelectedIds((prev) => {
        const copy = { ...prev };
        visibleIds.forEach((id) => { copy[id] = true; });
        return copy;
      });
    }
  };

  // file handlers
  const handleFilesAdd = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const newFilesArray = Array.from(newFiles);
    console.log('Adding files:', newFilesArray.map(f => f.name));
    setFiles((prev) => [...prev, ...newFilesArray]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed, files:', e.target.files?.length || 0);
    handleFilesAdd(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFilesAdd(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeFileAt = (index: number) =>
    setFiles((p) => p.filter((_, i) => i !== index));

  // paste handlers
  const handlePasteInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteText(e.target.value);
  };

  const handlePasteDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const list = e.dataTransfer.files;
    if (list && list.length > 0) {
      const file = list[0];
      const textTypes = ["text/", "application/json", "application/xml", "application/xhtml+xml", "application/javascript"];
      if (textTypes.some((t) => file.type.startsWith(t)) || file.name.match(/\.(txt|md|csv|json|xml|html?|js)$/i)) {
        const reader = new FileReader();
        reader.onload = () => {
          const txt = String(reader.result || "");
          setPasteText((prev) => (prev ? prev + "\n\n" + txt : txt));
        };
        reader.readAsText(file);
      }
    } else {
      const dtText = e.dataTransfer.getData("text");
      if (dtText) setPasteText((prev) => (prev ? prev + "\n\n" + dtText : dtText));
    }
  };

  const handlePasteDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  const allowGenerate = selectedCount > 0 || files.length > 0 || pasteText.trim().length > 0;

  const handleGenerate = () => {
    if (!allowGenerate) return;

    if (tab === "upload") {
      if (files.length === 0) {
        console.warn('No files selected');
        return;
      }

      console.log('Processing files for upload:', files.length);

      // Store file data as base64 in sessionStorage
      const filePromises = files.map(file => {
        return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log('File read successfully:', file.name);
            resolve({
              name: file.name,
              type: file.type,
              data: reader.result as string
            });
          };
          reader.onerror = () => {
            console.error('Failed to read file:', file.name);
            reject(new Error(`Failed to read ${file.name}`));
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises)
        .then(fileData => {
          console.log('All files processed, storing in sessionStorage');
          sessionStorage.setItem("practice_test_upload_files", JSON.stringify(fileData));
          router.push(`/student_page/practice_tests/generate?source=upload`);
        })
        .catch(error => {
          console.error('Error processing files:', error);
          alert('Failed to process files. Please try again.');
        });
      return;
    }

    if (tab === "paste") {
      sessionStorage.setItem("practice_test_paste_text", pasteText);
      router.push(`/student_page/practice_tests/generate?source=paste`);
      return;
    }

    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    router.push(`/student_page/practice_tests/generate?sets=${encodeURIComponent(ids.join(","))}`);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Generate a practice test</h1>
          <p className="text-gray-600 dark:text-gray-400">Choose sets or upload materials to create tailored practice questions.</p>
        </div>

        <div className="mb-8 bg-transparent">
          <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
            {['sets', 'notes', 'upload', 'paste'].map((t) => {
              const label = t === 'sets' ? 'Flashcard sets' : t === 'notes' ? 'Study notes sets' : t === 'upload' ? 'Upload files' : 'Paste text';
              return (
                <button
                  key={t}
                  onClick={() => setTab(t as any)}
                  className={`py-3 text-sm font-medium transition-colors ${tab === t
                    ? 'text-gray-900 dark:text-white border-b-2 border-teal-500 -mb-[2px]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {(tab === "sets" || tab === "notes") && (
            <>
              {/* search + select all + generate in one row */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 max-w-md">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search sets by title or description"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  onClick={selectAllVisible}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-pressed={tab === 'sets' ? (visibleFlashcards.length > 0 && visibleFlashcards.every(f => !!selectedIds[f._id])) : (visibleSummaries.length > 0 && visibleSummaries.every(s => !!selectedIds[s._id]))}
                >
                  <CheckCircle
                    size={16}
                    className={tab === 'sets' ? (visibleFlashcards.length > 0 && visibleFlashcards.every(f => !!selectedIds[f._id]) ? 'fill-current' : '') : (visibleSummaries.length > 0 && visibleSummaries.every(s => !!selectedIds[s._id]) ? 'fill-current' : '')}
                  />
                  <span>{tab === 'sets' ? (visibleFlashcards.length > 0 && visibleFlashcards.every(f => !!selectedIds[f._id]) ? 'Deselect all' : 'Select all') : (visibleSummaries.length > 0 && visibleSummaries.every(s => !!selectedIds[s._id]) ? 'Deselect all' : 'Select all')}</span>
                </button>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {tab === 'sets' ? `${visibleFlashcards.length} ${visibleFlashcards.length === 1 ? 'set' : 'sets'}` : `${visibleSummaries.length} ${visibleSummaries.length === 1 ? 'summary' : 'summaries'}`}
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!allowGenerate}
                  className={`ml-auto px-6 py-2 rounded-xl font-semibold text-sm transition-all ${!allowGenerate ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02]"}`}
                >
                  Generate
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading your flashcard sets...</p>
                  </div>
                </div>
              )}

              {!loading && error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {!loading && !error && tab === 'sets' && visibleFlashcards.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No sets match your search</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Try a different search or create a new set.</p>
                  <button onClick={() => router.push('/student_page/flashcards/create')} className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors">Create a set</button>
                </div>
              )}

              {!loading && !error && tab === 'notes' && visibleSummaries.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No summaries match your search</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Try a different search or create a new summary.</p>
                  <button onClick={() => router.push('/student_page/study_mode')} className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors">Create a summary</button>
                </div>
              )}

              <div className="space-y-4">
                {!loading && !error && tab === 'sets' && Array.from(flashcardsBySubject.entries()).map(([subject, items]) => (
                  <div
                    key={subject}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-visible"
                  >
                    {/* Folder Header */}
                    <button
                      onClick={() => setExpandedFolder(expandedFolder === subject ? null : subject)}
                      className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expandedFolder === subject
                          ? 'bg-teal-600 text-white'
                          : 'bg-teal-600/10 text-teal-600'
                          }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{subject}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {items.length} {items.length === 1 ? 'set' : 'sets'}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedFolder === subject ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Folder Contents */}
                    {expandedFolder === subject && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((item) => {
                            const selected = !!selectedIds[item._id];
                            return (
                              <div
                                key={item._id}
                                className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all relative`}
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                                    <span className="text-sm font-medium text-teal-600">{item.cards?.length || 0} cards</span>
                                  </div>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(item._id); }}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium ${selected ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                    aria-pressed={selected}
                                  >
                                    {selected ? 'Selected' : 'Select'}
                                  </button>
                                </div>

                                <div className="mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{item.title}</h3>
                                  {item.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>}
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-teal-600/10 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-medium text-teal-600">Y</span>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">You</span>
                                  </div>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Recently'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {!loading && !error && tab === 'notes' && Array.from(summariesBySubject.entries()).map(([subject, items]) => (
                  <div
                    key={subject}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-visible"
                  >
                    {/* Folder Header */}
                    <button
                      onClick={() => setExpandedFolder(expandedFolder === subject ? null : subject)}
                      className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${expandedFolder === subject
                          ? 'bg-teal-600 text-white'
                          : 'bg-teal-600/10 text-teal-600'
                          }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{subject}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {items.length} {items.length === 1 ? 'summary' : 'summaries'}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedFolder === subject ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Folder Contents */}
                    {expandedFolder === subject && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((item) => {
                            const selected = !!selectedIds[item._id];
                            return (
                              <div
                                key={item._id}
                                className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 cursor-pointer hover:shadow-lg hover:border-teal-600/20 dark:hover:border-teal-600/40 transition-all relative`}
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                                    <span className="text-sm font-medium text-teal-600">{item.wordCount} words</span>
                                  </div>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(item._id); }}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium ${selected ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                    aria-pressed={selected}
                                  >
                                    {selected ? 'Selected' : 'Select'}
                                  </button>
                                </div>

                                <div className="mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{item.title}</h3>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${item.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                      item.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                      }`}>
                                      {item.difficulty}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.readingTime} min read</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-teal-600/10 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-medium text-teal-600">Y</span>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">You</span>
                                  </div>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Recently'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "upload" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {files.length} {files.length === 1 ? 'file' : 'files'}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!allowGenerate}
                  className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${!allowGenerate ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02]"}`}
                >
                  Generate
                </button>
              </div>

              {files.length === 0 ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-8 flex flex-col items-center justify-center gap-3 text-center bg-gray-50 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-md flex items-center justify-center text-white text-xs font-bold">DOC</div>
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-500 rounded-md flex items-center justify-center text-white text-xs font-bold">PDF</div>
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-md flex items-center justify-center text-white text-xs font-bold">TXT</div>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 font-medium">Drag notes, documents, or readings here</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Supported: .pdf, .docx, .doc, .txt</div>
                  <div className="mt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Browse files
                    </button>
                    <input
                      ref={fileInputRef}
                      onChange={handleFileInput}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
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
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    + Add more files
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "paste" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {pasteText.trim().length > 0 ? `${pasteText.trim().length} characters` : 'No text'}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!allowGenerate}
                  className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${!allowGenerate ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02]"}`}
                >
                  Generate
                </button>
              </div>

              <textarea
                ref={pasteRef}
                value={pasteText}
                onChange={handlePasteInput}
                onDrop={handlePasteDrop}
                onDragOver={handlePasteDragOver}
                placeholder="Paste text here or drop a file"
                className="w-full min-h-[200px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-gray-900 dark:text-white resize-vertical focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Tip: drop a .txt/.md/.json file to append its contents</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}