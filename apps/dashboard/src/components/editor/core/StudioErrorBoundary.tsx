import React, { Component, ErrorInfo, ReactNode } from "react";

export interface StudioErrorBoundaryProps {
  sectionName: "Stage" | "Timeline" | "Inspector" | "Header" | "StudioGlobal";
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * [StudioErrorBoundary]
 * 프로덕션 하드닝 2.5: 컴포넌트 3단 격리 에러 바운더리 & 크래시 덤프 블랙박스
 * - 특정 섹션(뷰포트/타임라인/인스펙터)에서 런타임 예외 발생 시 전체 앱 크래시 방어
 * - 크래시 덤프를 로컬스토리지 및 콘솔에 보존하여 결함 격리 지원
 */
export class StudioErrorBoundary extends Component<StudioErrorBoundaryProps, State> {
  constructor(props: StudioErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    const crashDump = {
      timestamp: new Date().toISOString(),
      section: this.props.sectionName,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    };

    console.error(`[StudioErrorBoundary] Crash in [${this.props.sectionName}]:`, crashDump);

    try {
      const existingDumps = JSON.parse(localStorage.getItem("vlstudio_crash_dumps") || "[]");
      existingDumps.push(crashDump);
      if (existingDumps.length > 20) existingDumps.shift();
      localStorage.setItem("vlstudio_crash_dumps", JSON.stringify(existingDumps));
    } catch (e) {
      console.warn("[StudioErrorBoundary] Failed to write crash dump:", e);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-500/10 border border-red-500/30 rounded-xl m-2 text-center text-red-600 dark:text-red-300">
          <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/60 flex items-center justify-center text-lg mb-3">
            ⚠️
          </div>
          <h4 className="text-sm font-bold text-red-600 dark:text-red-300">
            [{this.props.sectionName}] 모듈에서 일시적인 렌더링 예외가 발생했습니다
          </h4>
          <p className="text-xs text-red-500/80 mt-1 max-w-md font-mono line-clamp-2">
            {this.state.error?.message || "알 수 없는 오류"}
          </p>
          <div className="mt-4 flex items-center space-x-2">
            <button
              onClick={this.handleReset}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              모듈 다시 시도
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded text-xs font-medium transition-colors cursor-pointer border border-border"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
