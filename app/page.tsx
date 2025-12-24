'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FiBookOpen, FiUpload } from 'react-icons/fi';

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
    <div className="flex h-screen bg-gradient-to-br from-stone-100 to-neutral-100 dark:from-neutral-900 dark:to-black overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-stone-50/90 dark:bg-neutral-900/90 backdrop-blur-xl border-r border-stone-300 dark:border-stone-700 shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-300 dark:border-stone-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-stone-700 dark:bg-stone-800 rounded-md shadow-md">
              <FiBookOpen className="w-7 h-7 text-stone-100" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-stone-800 dark:text-stone-200">
                Reader
              </h1>
              <p className="text-xs font-serif text-stone-500 dark:text-stone-400">
                Classic book experience
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="p-6 border-b border-stone-300 dark:border-stone-700">
          <label className="block">
            <div className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-stone-400 dark:border-stone-600 rounded-md hover:border-stone-600 dark:hover:border-stone-500 transition-all duration-300 cursor-pointer bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800/50 dark:to-stone-900/50 hover:from-stone-200 hover:to-stone-300 dark:hover:from-stone-800/70 dark:hover:to-stone-900/70 group">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-stone-600 dark:bg-stone-700 rounded-md opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  <div className="relative flex items-center justify-center h-full">
                    <FiUpload className="w-8 h-8 text-stone-700 dark:text-stone-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <span className="text-sm font-serif text-stone-800 dark:text-stone-200 group-hover:text-stone-900 dark:group-hover:text-stone-100 block mb-1">
                  Upload Your Book
                </span>
                <p className="text-xs font-serif text-stone-600 dark:text-stone-400">
                  PDF or EPUB files
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
            <div className="mt-4 p-4 bg-stone-200 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md">
              <p className="text-xs font-serif text-stone-700 dark:text-stone-400 mb-1">
                📖 Currently Reading
              </p>
              <p className="text-xs font-serif text-stone-800 dark:text-stone-300 truncate">
                {fileName}
              </p>
            </div>
          )}
        </div>

        {/* Features Info */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-sm font-serif text-stone-700 dark:text-stone-300 mb-4 tracking-wide">
            Features
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-md border border-stone-200 dark:border-stone-700">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">📖</div>
                <div>
                  <h3 className="text-xs font-serif text-stone-800 dark:text-stone-300 mb-1">
                    Realistic Page Turning
                  </h3>
                  <p className="text-xs font-serif text-stone-600 dark:text-stone-400 leading-relaxed">
                    Experience natural page flips like a real book
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-md border border-stone-200 dark:border-stone-700">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">🔍</div>
                <div>
                  <h3 className="text-xs font-serif text-stone-800 dark:text-stone-300 mb-1">
                    Zoom & Rotate
                  </h3>
                  <p className="text-xs font-serif text-stone-600 dark:text-stone-400 leading-relaxed">
                    Adjust view with zoom and rotation controls
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-md border border-stone-200 dark:border-stone-700">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">📍</div>
                <div>
                  <h3 className="text-xs font-serif text-stone-800 dark:text-stone-300 mb-1">
                    Page Navigation
                  </h3>
                  <p className="text-xs font-serif text-stone-600 dark:text-stone-400 leading-relaxed">
                    Jump to any page with keyboard shortcuts
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-md border border-stone-200 dark:border-stone-700">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">💻</div>
                <div>
                  <h3 className="text-xs font-serif text-stone-800 dark:text-stone-300 mb-1">
                    Fully Private
                  </h3>
                  <p className="text-xs font-serif text-stone-600 dark:text-stone-400 leading-relaxed">
                    Everything runs locally in your browser
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-md border border-stone-200 dark:border-stone-700">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">📄</div>
                <div>
                  <h3 className="text-xs font-serif text-stone-800 dark:text-stone-300 mb-1">
                    PDF & EPUB Support
                  </h3>
                  <p className="text-xs font-serif text-stone-600 dark:text-stone-400 leading-relaxed">
                    Both formats work seamlessly
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-md border border-stone-200 dark:border-stone-700">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">⌨️</div>
                <div>
                  <h3 className="text-xs font-serif text-stone-800 dark:text-stone-300 mb-1">
                    Keyboard Shortcuts
                  </h3>
                  <p className="text-xs font-serif text-stone-600 dark:text-stone-400 leading-relaxed">
                    Quick navigation with keyboard controls
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-300 dark:border-stone-700">
          <div className="text-center">
            <p className="text-xs font-serif text-stone-500 dark:text-stone-400 mb-2">
              Happy Reading 📖
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 bg-stone-500 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-stone-500 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-stone-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center">
        {!fileUrl ? (
          <div className="text-center max-w-lg px-6">
            <div className="mb-8 relative">
              <div className="w-32 h-32 mx-auto bg-stone-700 dark:bg-stone-800 rounded-lg flex items-center justify-center shadow-xl">
                <FiBookOpen className="w-16 h-16 text-stone-100" />
              </div>
            </div>
            <h2 className="text-4xl font-serif text-stone-800 dark:text-stone-200 mb-4">
              Welcome
            </h2>
            <p className="text-lg font-serif text-stone-600 dark:text-stone-400 mb-8 leading-relaxed">
              Upload a PDF or EPUB file to begin your reading journey with natural page-turning animations.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-stone-600 dark:bg-stone-700 text-stone-50 rounded-md shadow-md hover:bg-stone-700 dark:hover:bg-stone-600 transition-colors">
              <FiUpload className="w-5 h-5" />
              <span className="font-serif">Choose a file to begin</span>
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
