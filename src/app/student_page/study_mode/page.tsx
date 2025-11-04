"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudyModePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"paste" | "upload">("paste");

  // paste state
  const [pasteText, setPasteText] = useState("");
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);
  const MAX_CHARS = 100000;

  // upload state
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleGenerate = () => {
    if (!allowGenerate) return;
    if (tab === "upload") {
      sessionStorage.setItem("study_note_upload_files", JSON.stringify(files.map((f) => f.name)));
      router.push("/student_page/study_mode/generate?source=upload");
      return;
    }
    // paste
    sessionStorage.setItem("study_note_paste_text", pasteText);
    router.push("/student_page/study_mode/generate?source=paste");
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

          <div className="mt-6 sm:mt-8 flex items-start gap-3 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
            <div className="w-8 h-8 bg-teal-600/10 dark:bg-teal-600/20 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-teal-600">F</span>
            </div>
            <div>
              <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                Flashcards
              </div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Memorise your material — study notes will include optional flashcards.
              </div>
            </div>
          </div>
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
              disabled={!allowGenerate}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                !allowGenerate
                  ? "bg-gray-600/30 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:scale-[1.02] hover:shadow-xl"
              } w-full sm:w-auto`}
            >
              Generate
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
