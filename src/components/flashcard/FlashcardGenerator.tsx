'use client';

import React, { useState } from 'react';

interface FlashcardGeneratorProps {
  userId: string;
}

// ClassFile interface removed - classes functionality removed

// ClassInfo interface removed - classes functionality removed

export default function FlashcardGenerator({ userId }: FlashcardGeneratorProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Text input state
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textDifficulty, setTextDifficulty] = useState('medium');
  const [textSubject, setTextSubject] = useState('');

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileTitle, setFileTitle] = useState('');
  const [fileDifficulty, setFileDifficulty] = useState('medium');
  const [fileSubject, setFileSubject] = useState('');



  const handleTextGeneration = async () => {
    if (!textContent.trim()) {
      setError('Please enter some text content');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/student_page/flashcard/generate-from-text?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textContent,
          title: textTitle || 'Text-based Flashcards',
          difficulty: textDifficulty,
          subject: textSubject,
          aiProvider: 'gemini'
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        setTextContent('');
        setTextTitle('');
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to generate flashcards from text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileGeneration = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const results = [];
      const errors = [];

      // Process each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        
        // For multiple files, auto-generate title with number
        const title = selectedFiles.length > 1 
          ? (fileTitle ? `${fileTitle} - File ${i + 1}` : `${file.name.replace(/\.[^/.]+$/, '')} - Set ${i + 1}`)
          : (fileTitle || file.name);
        
        formData.append('title', title);
        formData.append('difficulty', fileDifficulty);
        formData.append('subject', fileSubject);
        formData.append('aiProvider', 'gemini');

        try {
          const response = await fetch(`/api/student_page/flashcard/generate-from-file?userId=${userId}`, {
            method: 'POST',
            body: formData
          });

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
          }

          const data = await response.json();
          
          if (data.success) {
            results.push({ file: file.name, data });
          } else {
            errors.push({ file: file.name, error: data.error });
          }
        } catch (err) {
          errors.push({ file: file.name, error: 'Failed to process file' });
        }
      }

      // Set combined result
      if (results.length > 0) {
        setResult({
          success: true,
          message: `Successfully generated flashcards from ${results.length} file(s)`,
          results,
          errors: errors.length > 0 ? errors : undefined
        });
        setSelectedFiles([]);
        setFileTitle('');
      } else {
        setError(`Failed to generate flashcards from all files: ${errors.map(e => e.error).join(', ')}`);
      }
    } catch (error) {
      setError('Failed to generate flashcards from files');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">AI Flashcard Generator</h2>
          <p className="text-gray-600 mt-2">Generate flashcards using AI from text, files, or class materials</p>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('text')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'text'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Text Input
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'file'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📁 File Upload
            </button>

          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Text Input Tab */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Content *
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste or type your study content here..."
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {textContent.length} characters (minimum 50 required)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="Flashcard set title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    value={textSubject}
                    onChange={(e) => setTextSubject(e.target.value)}
                    placeholder="e.g., Biology, History"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={textDifficulty}
                    onChange={(e) => setTextDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleTextGeneration}
                disabled={isLoading || textContent.length < 50}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '🔄 Generating Flashcards...' : '✨ Generate from Text'}
              </button>
            </div>
          )}

          {/* File Upload Tab */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Files *
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setSelectedFiles(files);
                  }}
                  accept=".pdf,.doc,.docx,.txt,.csv,.ppt,.pptx"
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Supported: PDF, Word, PowerPoint, Text files (max 10MB each). You can select multiple files.
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md space-y-2">
                  <p className="text-sm font-semibold">Selected Files ({selectedFiles.length}):</p>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                      <span>
                        {index + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700 ml-2"
                        disabled={isLoading}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedFiles.length === 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      placeholder="Flashcard set title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                )}

                {selectedFiles.length > 1 && (
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title Prefix (Optional)
                    </label>
                    <input
                      type="text"
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      placeholder="e.g., Chapter 1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Will create: "{fileTitle || 'Filename'} - File 1", "File 2", etc.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    value={fileSubject}
                    onChange={(e) => setFileSubject(e.target.value)}
                    placeholder="e.g., Biology, History"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={fileDifficulty}
                    onChange={(e) => setFileDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleFileGeneration}
                disabled={isLoading || selectedFiles.length === 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? `🔄 Processing ${selectedFiles.length} File(s)...` : `📁 Generate from ${selectedFiles.length} File(s)`}
              </button>
            </div>
          )}



          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}

          {/* Success Display */}
          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-green-800 font-semibold">✅ Success!</h3>
              <p className="text-green-700 mt-1">{result.message}</p>
              
              {/* Single file result */}
              {result.flashcard && (
                <div className="mt-2 text-sm text-green-600">
                  <p>📚 Title: {result.flashcard.title}</p>
                  <p>🃏 Cards Generated: {result.flashcard.cardsGenerated}</p>
                  {result.flashcard.processingTime && (
                    <p>⏱️ Processing Time: {result.flashcard.processingTime}ms</p>
                  )}
                </div>
              )}

              {/* Multiple files result */}
              {result.results && (
                <div className="mt-3 space-y-2">
                  {result.results.map((res: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border border-green-300">
                      <p className="font-semibold text-green-800">📄 {res.file}</p>
                      <p className="text-sm text-green-600">
                        📚 {res.data.flashcard.title} - 🃏 {res.data.flashcard.cardsGenerated} cards
                      </p>
                    </div>
                  ))}
                  
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded">
                      <p className="text-sm font-semibold text-yellow-800">⚠️ Some files failed:</p>
                      {result.errors.map((err: any, index: number) => (
                        <p key={index} className="text-xs text-yellow-700">
                          • {err.file}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}