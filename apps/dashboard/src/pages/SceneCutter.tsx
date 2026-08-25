import React, { useEffect, useRef } from 'react';
import { Scissors, RefreshCw, Sparkles } from 'lucide-react';
import { useTheme } from '../components/theme-provider';

const SceneCutter: React.FC = () => {
  const { theme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'THEME_CHANGE', theme }, '*');
    }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = getSrc();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden relative pb-16 md:pb-0">
      {/* iframe 뷰어 */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-background">
        <iframe
          ref={iframeRef}
          src={getSrc()}
          onLoad={handleIframeLoad}
          className="w-full h-full border-none bg-transparent"
          title="Scene Cutter Pro"
          sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-popups allow-forms"
          allow="clipboard-read *; clipboard-write *; display-capture *; fullscreen *"
        />
      </div>
    </div>
  );
};

export default SceneCutter;
