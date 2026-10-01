import React, { useState, useEffect } from "react";
import { useBlueprint } from "./BlueprintContext";

export interface HotkeyProviderProps {
  children: React.ReactNode;
}

/**
 * [HotkeyProvider]
 * 프로페셔널 NLE 손가락 머슬 메모리 단축키 인터셉터
 * Space, C/S, Del, Shift+Del, Ctrl+Z, Ctrl+Y, 화살표 프레임 이동 및 ? 치트시트
 */
export const HotkeyProvider: React.FC<HotkeyProviderProps> = ({ children }) => {
  const {
    isPlaying,
    setIsPlaying,
    currentTimeMs,
    setCurrentTimeMs,
    splitSceneAtTime,
    deleteSelected,
    undo,
    redo,
    setSelectedLayerId,
  } = useBlueprint();

  const [showCheatSheet, setShowCheatSheet] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 인풋 필드에서 타이핑 중일 때는 인터셉트 차단
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // 1. 치트시트 토글 (?)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowCheatSheet((prev) => !prev);
        return;
      }

      // 2. 실행 취소 / 다시 실행
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // 3. 재생 / 일시정지 (Space)
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
        return;
      }

      // 4. 0초 즉각 분할 (C 또는 S)
      if ((e.key.toLowerCase() === "c" || e.key.toLowerCase() === "s") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        splitSceneAtTime(currentTimeMs);
        return;
      }

      // 5. 선택 도구 (V)
      if (e.key.toLowerCase() === "v" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSelectedLayerId(null);
        return;
      }

      // 6. 삭제 (Delete, Backspace)
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // 7. 타임라인 프레임 넛지 (좌우 방향키)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const delta = e.shiftKey ? 1000 : 33.3; // Shift: 1초, 일반: 1프레임
        setCurrentTimeMs(Math.max(0, currentTimeMs - delta));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.shiftKey ? 1000 : 33.3;
        setCurrentTimeMs(currentTimeMs + delta);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPlaying,
    setIsPlaying,
    currentTimeMs,
    setCurrentTimeMs,
    splitSceneAtTime,
    deleteSelected,
    undo,
    redo,
    setSelectedLayerId,
  ]);

  return (
    <>
      {children}

      {/* 프로페셔널 단축키 치트시트 모달 */}
      {showCheatSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCheatSheet(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center">
                <span className="text-primary mr-2">⚡</span> NLE 프로페셔널 단축키 치트시트
              </h3>
              <button
                onClick={() => setShowCheatSheet(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/40">
                <span className="text-foreground">재생 / 정지</span>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded text-primary font-mono font-bold shadow-2xs">
                  Space
                </kbd>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/40">
                <span className="text-foreground">클립 즉시 분할</span>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded text-primary font-mono font-bold shadow-2xs">
                  C / S
                </kbd>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/40">
                <span className="text-foreground">선택 도구</span>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded text-primary font-mono font-bold shadow-2xs">
                  V
                </kbd>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/40">
                <span className="text-foreground">클립 삭제</span>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded text-primary font-mono font-bold shadow-2xs">
                  Del
                </kbd>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/40">
                <span className="text-foreground">실행 취소 (Undo)</span>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded text-primary font-mono font-bold shadow-2xs">
                  Ctrl + Z
                </kbd>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/40">
                <span className="text-foreground">다시 실행 (Redo)</span>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded text-primary font-mono font-bold shadow-2xs">
                  Ctrl + Y
                </kbd>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/40">
                <span className="text-foreground">1프레임 미세이동</span>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded text-primary font-mono font-bold shadow-2xs">
                  ← / →
                </kbd>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/40">
                <span className="text-foreground">1초 점프 이동</span>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded text-primary font-mono font-bold shadow-2xs">
                  Shift + ←/→
                </kbd>
              </div>
            </div>

            <p className="mt-5 text-[11px] text-muted-foreground text-center">
              언제든지 <kbd className="text-primary font-mono font-bold">?</kbd> 키를 누르면 이 창이 열립니다.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
