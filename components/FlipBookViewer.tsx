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
  onChaptersExtracted?: (chapters: Chapter[]) => void;
}

interface Chapter {
  title: string;
  page: number;
}

export default function FlipBookViewer({ fileUrl, fileName, onChaptersExtracted }: FlipBookViewerProps) {
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        const newZoom = Math.max(0.5, Math.min(5, initialZoom * scale));
        setZoom(newZoom);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Detect pinch gesture on trackpad (ctrlKey is set for pinch on trackpads)
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Debounce zoom updates
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
        
        const delta = -e.deltaY;
        const scaleFactor = delta > 0 ? 1.1 : 0.9;
        const newZoom = Math.max(0.5, Math.min(5, zoom * scaleFactor));
        
        zoomTimeoutRef.current = setTimeout(() => {
          setZoom(newZoom);
        }, 10);
      }
    };

    viewer.addEventListener('touchstart', handleTouchStart, { passive: false });
    viewer.addEventListener('touchmove', handleTouchMove, { passive: false });
    viewer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewer.removeEventListener('touchstart', handleTouchStart);
      viewer.removeEventListener('touchmove', handleTouchMove);
      viewer.removeEventListener('wheel', handleWheel);
    };
  }, [zoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (bookRef.current) {
          bookRef.current.pageFlip().flipPrev();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (bookRef.current) {
          bookRef.current.pageFlip().flipNext();
        }
      } else if (e.key === 'h' || e.key === 'H') {
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

    const handleJumpToPage = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail && bookRef.current) {
        try {
          bookRef.current.pageFlip().flip(customEvent.detail);
        } catch (err) {
          console.error('Error jumping to page:', err);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('jumpToPage', handleJumpToPage);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('jumpToPage', handleJumpToPage);
    };
  }, [chapters]);

  useEffect(() => {
    const loadFile = async () => {
      // Cancel any previous loading task
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this load
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setPages([]);
      setLoadingProgress(0);
      setChapters([]);
      
      try {
        if (isEpub) {
          await loadEpubAsImages(abortController);
        } else {
          await loadPdfAsImages(abortController);
        }
      } catch (error) {
        // Don't log error if it was aborted
        if (error instanceof Error && (error.message === 'AbortError' || error.name === 'AbortError')) {
          console.log('Previous file load cancelled');
          return; // Exit early, don't set loading to false
        } else {
          console.error('Error loading file:', error);
        }
      } finally {
        // Only set loading to false if this is still the current load
        if (abortControllerRef.current === abortController) {
          setLoading(false);
        }
      }
    };

    if (fileUrl && fileName) {
      loadFile();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fileUrl, fileName, rotation]);

  const loadPdfAsImages = async (abortController: AbortController) => {
    // Check if aborted before starting
    if (abortController.signal.aborted) {
      throw new Error('AbortError');
    }

    const loadingTask = pdfjsLib.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    setTotalPages(numPages);

    // Check again after async operation
    if (abortController.signal.aborted) {
      throw new Error('AbortError');
    }

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
        onChaptersExtracted?.(extractedChapters);
      }
    } catch (err) {
      console.error('No outline available:', err);
    }

    const pageImages: string[] = [];
    const batchSize = 3; // Process 3 pages at a time

    for (let i = 1; i <= numPages; i += batchSize) {
      // Check if this load has been aborted before each batch
      if (abortController.signal.aborted) {
        console.log('PDF load aborted at page', i);
        throw new Error('AbortError');
      }

      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, numPages + 1); j++) {
        batch.push(renderPage(pdf, j));
      }
      const batchResults = await Promise.all(batch);
      
      // Check again after rendering batch
      if (abortController.signal.aborted) {
        console.log('PDF load aborted after rendering batch at page', i);
        throw new Error('AbortError');
      }
      
      pageImages.push(...batchResults);
      setLoadingProgress(Math.round((i / numPages) * 100));
    }

    setPages(pageImages);
  };

  const renderPage = async (pdf: any, pageNum: number): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    // Reduced scale to 1.5 for better performance
    const viewport = page.getViewport({ scale: 1.5, rotation });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context!,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    // Use JPEG at 75% quality for better memory efficiency
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    
    // Clear canvas to free memory
    canvas.width = 0;
    canvas.height = 0;
    
    return dataUrl;
  };

  const loadEpubAsImages = async (abortController: AbortController) => {
    // Check if aborted before starting
    if (abortController.signal.aborted) {
      throw new Error('AbortError');
    }

    return new Promise<void>(async (resolve, reject) => {
      try {
        const book = ePub(fileUrl);
        await book.ready;

        // Check again after book ready
        if (abortController.signal.aborted) {
          throw new Error('AbortError');
        }

        // Extract TOC
        try {
          const navigation = await book.loaded.navigation;
          if (navigation && navigation.toc && navigation.toc.length > 0) {
            const extractedChapters: Chapter[] = navigation.toc.map((item: any, index: number) => ({
              title: item.label || `Chapter ${index + 1}`,
              page: index + 1
            }));
            setChapters(extractedChapters);
            onChaptersExtracted?.(extractedChapters);
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
          // Check if this load has been aborted before each page
          if (abortController.signal.aborted) {
            console.log('EPUB load aborted at page', idx);
            throw new Error('AbortError');
          }

          const item = items[idx];
          try {
            await rendition.display(item.href);
            await new Promise(resolve => setTimeout(resolve, 200));

            // Check again after display
            if (abortController.signal.aborted) {
              console.log('EPUB load aborted after display at page', idx);
              throw new Error('AbortError');
            }

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

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 5));
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
        darkBackground ? 'bg-neutral-900' : 'bg-stone-100'
      }`}>
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className={`absolute inset-0 border-8 rounded-full ${
              darkBackground ? 'border-stone-800' : 'border-stone-300'
            }`}></div>
            <div className="absolute inset-0 border-8 border-transparent border-t-stone-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-serif ${
                darkBackground ? 'text-stone-400' : 'text-stone-700'
              }`}>{loadingProgress}%</span>
            </div>
          </div>
          <p className={`text-xl font-serif mb-2 ${
            darkBackground ? 'text-stone-300' : 'text-stone-800'
          }`}>
            Preparing {isEpub ? 'EPUB' : 'PDF'}...
          </p>
          <p className={`text-sm font-serif ${
            darkBackground ? 'text-stone-500' : 'text-stone-600'
          }`}>
            Preparing your reading experience
          </p>
          <div className="mt-4 w-64 mx-auto h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-stone-600 dark:bg-stone-500 transition-all duration-300"
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
          ? 'bg-gradient-to-br from-neutral-900 via-stone-900 to-neutral-900' 
          : 'bg-gradient-to-br from-stone-100 via-stone-50 to-neutral-50'
      }`}
    >
      {/* Toolbar */}
      <div className={`transform transition-all duration-500 ease-in-out ${
        uiVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 absolute pointer-events-none'
      } bg-stone-50/95 dark:bg-neutral-800/95 backdrop-blur-lg border-b border-stone-300 dark:border-stone-700 py-4 shadow-md z-10`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto pl-24 pr-6">
          <div className="flex items-center gap-3">
            <button onClick={goToFirstPage} className="p-2.5 bg-stone-200 dark:bg-stone-700 rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-all" title="First Page">
              <FiHome className="w-5 h-5 text-stone-700 dark:text-stone-200" />
            </button>
            <button onClick={prevPage} disabled={currentPage === 0} className="p-2.5 bg-stone-600 dark:bg-stone-700 text-stone-50 rounded-md hover:bg-stone-700 dark:hover:bg-stone-600 disabled:opacity-50 transition-all" title="Previous Page">
              <FiChevronLeft className="w-5 h-5" />
            </button>
            
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
              <span className="text-sm font-serif text-stone-600 dark:text-stone-400">Page</span>
              <input type="number" min="1" max={totalPages} value={pageInput} onChange={(e) => setPageInput(e.target.value)}
                className="w-16 px-2 py-1.5 text-center text-sm font-serif border border-stone-300 dark:border-stone-600 rounded-md bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-500" />
              <span className="text-sm font-serif text-stone-600 dark:text-stone-400">of {totalPages}</span>
            </form>

            <button onClick={nextPage} disabled={currentPage >= totalPages - 1} className="p-2.5 bg-stone-600 dark:bg-stone-700 text-stone-50 rounded-md hover:bg-stone-700 dark:hover:bg-stone-600 disabled:opacity-50 transition-all" title="Next Page">
              <FiChevronRight className="w-5 h-5" />
            </button>

            {chapters.length > 0 && (
              <button onClick={() => setShowChapters(!showChapters)} className="p-2.5 bg-stone-200 dark:bg-stone-700 rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-all" title="Chapters (C)">
                <FiList className="w-5 h-5 text-stone-700 dark:text-stone-200" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleZoomOut} className="p-2.5 bg-stone-200 dark:bg-stone-700 rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-all" title="Zoom Out">
              <FiZoomOut className="w-5 h-5 text-stone-700 dark:text-stone-200" />
            </button>
            <span className="text-sm font-serif text-stone-700 dark:text-stone-300 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2.5 bg-stone-200 dark:bg-stone-700 rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-all" title="Zoom In">
              <FiZoomIn className="w-5 h-5 text-stone-700 dark:text-stone-200" />
            </button>
            {!isEpub && (
              <button onClick={handleRotate} className="p-2.5 bg-stone-200 dark:bg-stone-700 rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-all" title="Rotate">
                <FiRotateCw className="w-5 h-5 text-stone-700 dark:text-stone-200" />
              </button>
            )}
            <button onClick={() => setDarkBackground(!darkBackground)} className="p-2.5 bg-stone-200 dark:bg-stone-700 rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-all" title="Toggle Theme (T)">
              {darkBackground ? <FiSun className="w-5 h-5 text-stone-700 dark:text-stone-200" /> : <FiMoon className="w-5 h-5 text-stone-700 dark:text-stone-200" />}
            </button>
            <button onClick={toggleFullscreen} className="p-2.5 bg-stone-200 dark:bg-stone-700 rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-all" title="Fullscreen (F)">
              <FiMaximize2 className="w-5 h-5 text-stone-700 dark:text-stone-200" />
            </button>
            <button onClick={() => setUiVisible(false)} className="p-2.5 bg-stone-600 dark:bg-stone-700 text-stone-50 rounded-md hover:bg-stone-700 dark:hover:bg-stone-600 transition-all" title="Hide UI (H)">
              <FiEyeOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chapter Navigation */}
      {showChapters && uiVisible && chapters.length > 0 && (
        <div className="absolute top-20 right-4 z-20 w-80 max-h-96 bg-stone-50 dark:bg-neutral-800 rounded-md shadow-xl border border-stone-300 dark:border-stone-700 overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-stone-300 dark:border-stone-700 flex items-center justify-between">
            <h3 className="font-serif text-lg text-stone-800 dark:text-stone-200">Contents</h3>
            <button onClick={() => setShowChapters(false)} className="text-stone-500 hover:text-stone-700 text-xl">×</button>
          </div>
          <div className="overflow-y-auto max-h-80">
            {chapters.map((chapter, index) => (
              <button key={index} onClick={() => { goToPage(chapter.page); setShowChapters(false); }}
                className="w-full px-4 py-3 text-left hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors border-b border-stone-200 dark:border-stone-700 last:border-0">
                <div className="text-sm font-serif text-stone-700 dark:text-stone-300 truncate">{chapter.title}</div>
                <div className="text-xs font-serif text-stone-500 dark:text-stone-400 mt-1">Page {chapter.page}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FlipBook */}
      <div ref={viewerRef} className="flex-1 overflow-hidden p-8 flex items-center justify-center touch-none" style={{ contain: 'layout style paint' }}>
        <div className="relative max-w-full max-h-full" style={{ 
          transform: `scale(${zoom})`,
          willChange: zoom !== 1 ? 'transform' : 'auto',
          transformOrigin: 'center center'
        }}>
          <HTMLFlipBook width={400} height={600} size="stretch" minWidth={315} maxWidth={1000} minHeight={400} maxHeight={1533}
            maxShadowOpacity={0.5} showCover={true} mobileScrollSupport={true} onFlip={onFlip} className="shadow-2xl"
            startPage={0} drawShadow={true} flippingTime={600} usePortrait={false} autoSize={true} useMouseEvents={true}
            swipeDistance={30} showPageCorners={true} disableFlipByClick={false} ref={bookRef}>
            {pages.map((page, index) => (
              <div key={index} className="bg-white shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ contain: 'layout style paint' }}>
                <div className="relative w-full h-full">
                  <img 
                    src={page} 
                    alt={`Page ${index + 1}`} 
                    className="w-full h-full object-contain" 
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    style={{ contentVisibility: 'auto' }}
                  />
                  <div className={`absolute bottom-4 left-0 right-0 flex justify-center transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="px-3 py-1 bg-stone-700/70 text-stone-100 text-xs font-serif rounded-sm backdrop-blur-sm">{index + 1}</div>
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
      } w-full bg-stone-50/90 dark:bg-neutral-800/90 backdrop-blur-lg border-t border-stone-300 dark:border-stone-700 px-6 py-3`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-6 text-xs font-serif text-stone-600 dark:text-stone-400 flex-wrap">
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
          className="absolute top-4 right-4 z-30 p-3 bg-stone-600 dark:bg-stone-700 text-stone-50 rounded-full shadow-xl hover:bg-stone-700 dark:hover:bg-stone-600 transition-all animate-pulse" title="Show UI (H)">
          <FiEye className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
