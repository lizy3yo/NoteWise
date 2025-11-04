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
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Generate study notes
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Paste notes or upload files to create concise study notes and flashcards.
              </p>
            </div>
            <div className="text-sm text-gray-400">{pasteText.length}/{MAX_CHARS} characters</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
            {["paste", "upload"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t as any)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
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

        <div className="mb-24">
          {tab === "paste" && (
            <div className="relative">
              <textarea
                ref={pasteRef}
                value={pasteText}
                onChange={handlePasteInput}
                onDrop={handlePasteDrop}
                onDragOver={handlePasteDragOver}
                placeholder="Paste your notes here. We'll do the rest."
                className="w-full min-h-[200px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-gray-900 dark:text-white resize-vertical text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <div className="absolute right-4 bottom-4 text-xs text-gray-500 dark:text-gray-400">
                {pasteText.length}/{MAX_CHARS} characters
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl py-12 flex flex-col items-center justify-center gap-4 text-center bg-white dark:bg-gray-800 min-h-160"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-md flex items-center justify-center text-white">
                    DOC
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-rose-500 rounded-md flex items-center justify-center text-white">
                    PDF
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-md flex items-center justify-center text-white">
                    PPT
                  </div>
                </div>
                <div className="text-gray-700 dark:text-gray-300 font-medium">
                  Drag notes, slides, or readings here
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Supported: .docx, .pdf, .pptx
                </div>
                <div className="mt-3">
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
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <div className="text-sm text-gray-900 dark:text-white truncate">{f.name}</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-400">
                          {(f.size / 1024).toFixed(0)} KB
                        </div>
                        <button
                          onClick={() => removeFileAt(i)}
                          className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
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

          <div className="mt-8 flex items-start gap-3">
            <div className="w-8 h-8 bg-teal-600/10 dark:bg-teal-600/20 rounded-md flex items-center justify-center">
              <span className="text-sm font-bold text-teal-600">F</span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Flashcards
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Memorise your material — study notes will include optional flashcards.
              </div>
            </div>
          </div>
        </div>

        {/* Sticky generate area */}
        <div className="fixed right-6 bottom-6 z-50">
          <div className="bg-transparent flex items-center gap-4">
            <div className="text-sm text-gray-400 hidden md:block">
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
              className={`px-6 py-3 rounded-xl font-semibold transition-shadow ${
                !allowGenerate
                  ? "bg-gray-600/30 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:scale-[1.02]"
              }`}
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
