import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BaseFloatingInspectorCardProps {
  title: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
  defaultPosition?: { x: number; y: number };
  className?: string;
  width?: number | string;
  children: React.ReactNode;
}

export const BaseFloatingInspectorCard: React.FC<BaseFloatingInspectorCardProps> = ({
  title,
  icon,
  isOpen,
  onClose,
  onReset,
  defaultPosition = { x: 24, y: 48 },
  className,
  width = 280,
  children,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>(defaultPosition);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: defaultPosition.x,
    posY: defaultPosition.y,
  });

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 기본 위치 동기화
  useEffect(() => {
    if (isOpen && defaultPosition) {
      setPosition(defaultPosition);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: typeof width === 'number' ? `${width}px` : width,
        zIndex: 9999,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "bg-card text-card-foreground border border-border shadow-2xl rounded-xl flex flex-col overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none",
        className
      )}
    >
      {/* 1. 드래그 가능 헤더 바 */}
      <div
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          isDraggingRef.current = true;
          const targetEl = e.currentTarget;
          targetEl.setPointerCapture(e.pointerId);
          dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            posX: position.x,
            posY: position.y,
          };

          const onPointerMove = (mv: PointerEvent) => {
            if (!isDraggingRef.current) return;
            const dx = mv.clientX - dragStartRef.current.startX;
            const dy = mv.clientY - dragStartRef.current.startY;
            setPosition({
              x: Math.max(8, dragStartRef.current.posX + dx),
              y: Math.max(8, dragStartRef.current.posY + dy),
            });
          };

          const onPointerUp = (upEv: PointerEvent) => {
            isDraggingRef.current = false;
            try { targetEl.releasePointerCapture(upEv.pointerId); } catch (_) {}
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
          };

          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        }}
        className="h-10 px-3.5 border-b border-border/70 bg-muted/40 flex items-center justify-between cursor-move shrink-0"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <span className="font-bold text-xs text-foreground truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onReset && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="h-6 px-2 text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center gap-1 cursor-pointer transition active:scale-95"
              title="이 객체 기본값으로 리셋"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>리셋</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition"
            title="닫기 (ESC)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. 스크롤 가능한 본문 설정 영역 */}
      <div className="p-3.5 space-y-3.5 max-h-[460px] overflow-y-auto custom-scrollbar text-xs">
        {children}
      </div>
    </div>
  );
};

export default BaseFloatingInspectorCard;
