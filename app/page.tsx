'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FiBook, FiUpload } from 'react-icons/fi';

// Dynamically import viewer to prevent SSR issues with PDF.js
const FlipBookViewer = dynamic(() => import('@/components/FlipBookViewer'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading viewer...</p>
      </div>
    </div>
  )
});

export default function Home() {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setFileName(file.name);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-black overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700 shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-xl shadow-lg">
              <FiBook className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                FlipBook Reader
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Interactive page-turning experience
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <label className="block">
            <div className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-orange-500 dark:hover:border-orange-400 transition-all duration-300 cursor-pointer bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800/50 dark:to-orange-900/10 hover:from-orange-50 hover:to-rose-50 dark:hover:from-orange-900/20 dark:hover:to-rose-900/20 group">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative flex items-center justify-center h-full">
                    <FiUpload className="w-8 h-8 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 block mb-1">
                  Upload Your Book
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  PDF or EPUB files supported
                </p>
              </div>
            </div>
            <input
              type="file"
              accept=".pdf,.epub"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          
          {fileName && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                📖 Currently Reading
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 truncate">
                {fileName}
              </p>
            </div>
          )}
        </div>

        {/* Features Info */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            ✨ Features
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">📖</div>
                <div>
                  <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Realistic Page Flipping
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Experience 3D page-turning animations like a real book
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">🔍</div>
                <div>
                  <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Zoom & Rotate
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Zoom in/out and rotate pages for better viewing
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">📍</div>
                <div>
                  <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Page Navigation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Jump to any page instantly with page numbers
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">💻</div>
                <div>
                  <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    100% Local
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Everything runs in your browser, no server needed
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">📄</div>
                <div>
                  <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    PDF & EPUB Support
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Both formats converted to flipbook automatically
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">⌨️</div>
                <div>
                  <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Keyboard Shortcuts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use arrow keys to flip pages quickly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Happy Reading! 📚✨
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse delay-75"></div>
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center">
        {!fileUrl ? (
          <div className="text-center max-w-lg px-6">
            <div className="mb-8 relative">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/40 animate-pulse">
                <FiBook className="w-16 h-16 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-20 h-20 bg-yellow-400 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-rose-400 rounded-full blur-3xl opacity-50 animate-pulse delay-75"></div>
            </div>
            <h2 className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Start Your Reading Journey
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Upload a PDF or EPUB file to experience books with stunning 3D flipbook animations.
              Every page turn feels just like reading a real book.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg">
              <FiUpload className="w-5 h-5" />
              <span className="font-medium">Choose a file to begin</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            <FlipBookViewer fileUrl={fileUrl} fileName={fileName} />
          </div>
        )}
      </main>
    </div>
  );
}
