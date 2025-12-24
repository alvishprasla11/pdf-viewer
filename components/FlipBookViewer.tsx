'use client';

import { useState, useEffect, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import ePub from 'epubjs';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut, FiRotateCw, FiHome, FiMaximize2, FiEye, FiEyeOff, FiSun, FiMoon, FiList } from 'react-icons/fi';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
}

interface FlipBookViewerProps {
  fileUrl: string;
  fileName: string;
}

interface Chapter {
  title: string;
  page: number;
}

export default function FlipBookViewer({ fileUrl, fileName }: FlipBookViewerProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [uiVisible, setUiVisible] = useState(true);
  const [darkBackground, setDarkBackground] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showChapters, setShowChapters] = useState(false);
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const isEpub = fileName.toLowerCase().endsWith('.epub');

  // Pinch to zoom
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let initialDistance = 0;
    let initialZoom = zoom;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        initialZoom = zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = currentDistance / initialDistance;
        const newZoom = Math.max(0.5, Math.min(2, initialZoom * scale));
        setZoom(newZoom);
      }
    };

    viewer.addEventListener('touchstart', handleTouchStart, { passive: false });
    viewer.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      viewer.removeEventListener('touchstart', handleTouchStart);
      viewer.removeEventListener('touchmove', handleTouchMove);
    };
  }, [zoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setUiVisible(prev => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 't' || e.key === 'T') {
        setDarkBackground(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        if (chapters.length > 0) {
          setShowChapters(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [chapters]);

  useEffect(() => {
    const loadFile = async () => {
      setLoading(true);
      setPages([]);
      setLoadingProgress(0);
      try {
        if (isEpub) {
          await loadEpubAsImages();
        } else {
          await loadPdfAsImages();
        }
      } catch (error) {
        console.error('Error loading file:', error);
      } finally {
        setLoading(false);
      }
    };

    if (fileUrl && fileName) {
      loadFile();
    }
  }, [fileUrl, fileName, rotation]);

  const loadPdfAsImages = async () => {
    const loadingTask = pdfjsLib.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    setTotalPages(numPages);

    // Extract outline/bookmarks for chapter navigation
    try {
      const outline = await pdf.getOutline();
      if (outline && outline.length > 0) {
        const extractedChapters: Chapter[] = [];
        for (const item of outline) {
          try {
            let pageNum = 1;
            if (item.dest) {
              if (typeof item.dest === 'string') {
                const dest = await pdf.getDestination(item.dest);
                if (dest && dest[0]) {
                  const pageIndex = await pdf.getPageIndex(dest[0]);
                  pageNum = pageIndex + 1;
                }
              } else if (Array.isArray(item.dest) && item.dest[0]) {
                const pageIndex = await pdf.getPageIndex(item.dest[0]);
                pageNum = pageIndex + 1;
              }
            }
            extractedChapters.push({
              title: item.title || 'Untitled',
              page: pageNum
            });
          } catch (err) {
            console.error('Error extracting chapter:', err);
          }
        }
        setChapters(extractedChapters);
      }
    } catch (err) {
      console.error('No outline available:', err);
    }

    const pageImages: string[] = [];
    const batchSize = 3; // Process 3 pages at a time

    for (let i = 1; i <= numPages; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, numPages + 1); j++) {
        batch.push(renderPage(pdf, j));
      }
      const batchResults = await Promise.all(batch);
      pageImages.push(...batchResults);
      setLoadingProgress(Math.round((i / numPages) * 100));
    }

    setPages(pageImages);
  };

  const renderPage = async (pdf: any, pageNum: number): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    // Reduced scale for faster rendering
    const viewport = page.getViewport({ scale: 2, rotation });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context!,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    // Use JPEG for smaller size and faster conversion
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const loadEpubAsImages = async () => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const book = ePub(fileUrl);
        await book.ready;

        // Extract TOC
        try {
          const navigation = await book.loaded.navigation;
          if (navigation && navigation.toc && navigation.toc.length > 0) {
            const extractedChapters: Chapter[] = navigation.toc.map((item: any, index: number) => ({
              title: item.label || `Chapter ${index + 1}`,
              page: index + 1
            }));
            setChapters(extractedChapters);
          }
        } catch (err) {
          console.error('No TOC available:', err);
        }

        const container = document.createElement('div');
        container.id = 'epub-temp-container';
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '800px';
        container.style.height = '1200px';
        document.body.appendChild(container);

        const rendition = book.renderTo(container, {
          width: 800,
          height: 1200,
          spread: 'none',
        });

        await rendition.display();
        const spine = await book.loaded.spine;
        
        const pageImages: string[] = [];
        const items = (spine as any).items || [];
        
        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          try {
            await rendition.display(item.href);
            await new Promise(resolve => setTimeout(resolve, 200));

            const iframe = container.querySelector('iframe') as HTMLIFrameElement;
            if (iframe?.contentDocument?.body) {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d', {
                alpha: false,
                desynchronized: true
              });
              
              canvas.width = 800;
              canvas.height = 1200;

              if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 800, 1200);
                
                const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200">
                  <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="width:800px;height:1200px;overflow:hidden;background:white;">
                      ${iframe.contentDocument.body.innerHTML}
                    </div>
                  </foreignObject>
                </svg>`;
                
                const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const img = new Image();
                
                await new Promise<void>((resolveImg) => {
                  img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
                    URL.revokeObjectURL(url);
                    resolveImg();
                  };
                  img.onerror = () => {
                    ctx.fillStyle = '#000000';
                    ctx.font = '16px Arial';
                    ctx.fillText(`Page ${pageImages.length + 1}`, 50, 50);
                    pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
                    URL.revokeObjectURL(url);
                    resolveImg();
                  };
                  img.src = url;
                });
              }
            }
            setLoadingProgress(Math.round(((idx + 1) / items.length) * 100));
          } catch (err) {
            console.error('Error rendering EPUB page:', err);
          }
        }

        setTotalPages(pageImages.length);
        setPages(pageImages);
        
        rendition.destroy();
        document.body.removeChild(container);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const nextPage = () => bookRef.current?.pageFlip().flipNext();
  const prevPage = () => bookRef.current?.pageFlip().flipPrev();
  const goToFirstPage = () => bookRef.current?.pageFlip().flip(0);

  const goToPage = (pageNum: number) => {
    if (bookRef.current && pageNum >= 1 && pageNum <= totalPages) {
      bookRef.current.pageFlip().flip(pageNum - 1);
      setPageInput(pageNum.toString());
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (!isNaN(pageNum)) goToPage(pageNum);
  };

  const onFlip = (e: any) => {
    setCurrentPage(e.data);
    setPageInput((e.data + 1).toString());
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));
  const handleRotate = () => setRotation((rotation + 90) % 360);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full transition-colors duration-300 ${
        darkBackground ? 'bg-slate-900' : 'bg-amber-50'
      }`}>
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className={`absolute inset-0 border-8 rounded-full ${
              darkBackground ? 'border-amber-900' : 'border-amber-200'
            }`}></div>
            <div className="absolute inset-0 border-8 border-transparent border-t-amber-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${
                darkBackground ? 'text-amber-400' : 'text-amber-700'
              }`}>{loadingProgress}%</span>
            </div>
          </div>
          <p className={`text-xl font-medium mb-2 ${
            darkBackground ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Converting {isEpub ? 'EPUB' : 'PDF'}...
          </p>
          <p className={`text-sm ${
            darkBackground ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Optimizing for faster reading
          </p>
          <div className="mt-4 w-64 mx-auto h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600 dark:text-slate-400">Failed to load file. Please try another.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col h-full transition-colors duration-500 ${
        darkBackground 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
          : 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50'
      }`}
    >
      {/* Toolbar */}
      <div className={`transform transition-all duration-500 ease-in-out ${
        uiVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 absolute pointer-events-none'
      } bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 px-6 py-4 shadow-lg z-10`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={goToFirstPage} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all" title="First Page">
              <FiHome className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
            <button onClick={prevPage} disabled={currentPage === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all">
              <FiChevronLeft className="w-5 h-5" />
              <span className="font-medium">Previous</span>
            </button>
            
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Page</span>
              <input type="number" min="1" max={totalPages} value={pageInput} onChange={(e) => setPageInput(e.target.value)}
                className="w-16 px-2 py-1.5 text-center text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">of {totalPages}</span>
            </form>

            <button onClick={nextPage} disabled={currentPage >= totalPages - 1} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all">
              <span className="font-medium">Next</span>
              <FiChevronRight className="w-5 h-5" />
            </button>

            {chapters.length > 0 && (
              <button onClick={() => setShowChapters(!showChapters)} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all" title="Chapters (C)">
                <FiList className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleZoomOut} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all" title="Zoom Out">
              <FiZoomOut className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all" title="Zoom In">
              <FiZoomIn className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
            {!isEpub && (
              <button onClick={handleRotate} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all" title="Rotate">
                <FiRotateCw className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              </button>
            )}
            <button onClick={() => setDarkBackground(!darkBackground)} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all" title="Toggle Theme (T)">
              {darkBackground ? <FiSun className="w-5 h-5 text-slate-700 dark:text-slate-200" /> : <FiMoon className="w-5 h-5 text-slate-700 dark:text-slate-200" />}
            </button>
            <button onClick={toggleFullscreen} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all" title="Fullscreen (F)">
              <FiMaximize2 className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
            <button onClick={() => setUiVisible(false)} className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all" title="Hide UI (H)">
              <FiEyeOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chapter Navigation */}
      {showChapters && uiVisible && chapters.length > 0 && (
        <div className="absolute top-20 right-4 z-20 w-80 max-h-96 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Chapters</h3>
            <button onClick={() => setShowChapters(false)} className="text-slate-500 hover:text-slate-700">✕</button>
          </div>
          <div className="overflow-y-auto max-h-80">
            {chapters.map((chapter, index) => (
              <button key={index} onClick={() => { goToPage(chapter.page); setShowChapters(false); }}
                className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{chapter.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Page {chapter.page}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FlipBook */}
      <div ref={viewerRef} className="flex-1 overflow-hidden p-8 flex items-center justify-center touch-none">
        <div className="relative transition-transform duration-300 ease-out" style={{ transform: `scale(${zoom})` }}>
          <HTMLFlipBook width={400} height={600} size="stretch" minWidth={315} maxWidth={1000} minHeight={400} maxHeight={1533}
            maxShadowOpacity={0.5} showCover={true} mobileScrollSupport={true} onFlip={onFlip} className="shadow-2xl"
            startPage={0} drawShadow={true} flippingTime={600} usePortrait={false} autoSize={true} useMouseEvents={true}
            swipeDistance={30} showPageCorners={true} disableFlipByClick={false} ref={bookRef}>
            {pages.map((page, index) => (
              <div key={index} className="bg-white shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="relative w-full h-full">
                  <img src={page} alt={`Page ${index + 1}`} className="w-full h-full object-contain" draggable={false} />
                  <div className={`absolute bottom-4 left-0 right-0 flex justify-center transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="px-3 py-1 bg-slate-800/80 text-white text-xs font-medium rounded-full backdrop-blur-sm">{index + 1}</div>
                  </div>
                </div>
              </div>
            ))}
          </HTMLFlipBook>
        </div>
      </div>

      {/* Tips Footer */}
      <div className={`transform transition-all duration-500 ease-in-out ${
        uiVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 absolute bottom-0 pointer-events-none'
      } w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 px-6 py-3`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
          <span>💡 Click corners</span>
          <span>⌨️ Arrow keys</span>
          <span>🤏 Pinch zoom</span>
          <span>H - Hide UI</span>
          <span>T - Theme</span>
          <span>F - Fullscreen</span>
          {chapters.length > 0 && <span>C - Chapters</span>}
        </div>
      </div>

      {/* Show UI Button */}
      {!uiVisible && (
        <button onClick={() => setUiVisible(true)}
          className="absolute top-4 right-4 z-30 p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-2xl hover:from-amber-600 hover:to-orange-600 transition-all animate-pulse" title="Show UI (H)">
          <FiEye className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
