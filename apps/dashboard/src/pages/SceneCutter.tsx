import React, { useEffect, useRef, useState } from 'react';
import { Scissors, RefreshCw, Loader2 } from 'lucide-react';
import { useTheme } from '../components/theme-provider';

const SceneCutter: React.FC = () => {
  const { theme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  const getSrc = () => {
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'file:') {
        return './scenecutter/index.html';
      }
      return '/scenecutter/index.html';
    }
    return '/scenecutter/index.html';
  };

  // Sync theme to iframe whenever theme changes
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'THEME_CHANGE', theme }, '*');
    }
  }, [theme]);

  const handleIframeLoad = () => {
    setLoading(false);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'THEME_CHANGE', theme }, '*');
    }
  };

  const handleReload = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = getSrc();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden relative pb-16 md:pb-0 p-3 sm:p-6 space-y-3">
      {/* 1. 상단 타이틀 헤더 바 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full pb-3 border-b border-border">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
            <span>스마트 씬 분할 컷터</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            긴 롱폼 영상이나 레퍼런스 미디어를 AI 및 타임라인 기반으로 빠르게 다중 분할 컷팅
          </p>
        </div>

        <button
          onClick={handleReload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border shadow-2xs text-foreground text-xs font-semibold rounded-xl hover:bg-muted transition-all"
        >
          <RefreshCw size={14} />
          다시 불러오기
        </button>
      </div>

      {/* iframe 뷰어 */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-background rounded-2xl border border-border shadow-2xs">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
            <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <p className="text-xs text-muted-foreground">씬 컷터 불러오는 중...</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={getSrc()}
          onLoad={handleIframeLoad}
          className={`w-full h-full border-none bg-transparent ${loading ? 'invisible' : 'visible'}`}
          title="Scene Cutter Pro"
          sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-popups allow-forms"
          allow="clipboard-read *; clipboard-write *; display-capture *; fullscreen *"
        />
      </div>
    </div>
  );
};

export default SceneCutter;
