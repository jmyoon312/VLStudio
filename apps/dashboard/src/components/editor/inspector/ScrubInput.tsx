import React, { useState, useRef, useEffect, useCallback } from "react";

export interface ScrubInputProps {
  label: string; // 'X', 'Y', '폭', '높이', '크기', '회전', '자간' 등
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number; // 1px당 증감량 (기본 1.0)
  unit?: string; // 'px', '%', 'deg'
  className?: string;
  disabled?: boolean;
}

/**
 * [ScrubInput]
 * 마우스 드래그 미세 스크럽 인풋 컴포넌트
 * - 라벨 호버 시 col-resize 커서
 * - 좌우 드래그로 연속 수치 조절
 * - Shift 키: 10배 가속 (빠른 이동)
 * - Alt 키: 0.1배 정밀 (소수점 미세 조정)
 * - 클릭 시 직접 숫자 타이핑 모드로 즉각 전환
 */
export const ScrubInput: React.FC<ScrubInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  sensitivity = 1.0,
  unit = "",
  className = "",
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(String(value));
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startValRef = useRef(value);

  useEffect(() => {
    if (!isEditing) {
      setTextValue(String(Math.round(value * 100) / 100));
    }
  }, [value, isEditing]);

  const clamp = useCallback(
    (val: number) => {
      let clamped = val;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      return Math.round(clamped * 100) / 100;
    },
    [min, max]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isEditing) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startValRef.current = value;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      let multiplier = sensitivity;
      if (moveEvent.shiftKey) multiplier *= 10;
      if (moveEvent.altKey) multiplier *= 0.1;

      const deltaVal = deltaX * multiplier * step;
      const nextVal = clamp(startValRef.current + deltaVal);
      onChange(nextVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(textValue);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    } else {
      setTextValue(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setTextValue(String(value));
    }
  };

  return (
    <div
      className={`group relative flex items-center h-8 bg-muted/40 hover:bg-muted/70 border border-border hover:border-border/90 rounded-md overflow-hidden transition-colors select-none ${
        disabled ? "opacity-40 pointer-events-none" : ""
      } ${isDragging ? "ring-1 ring-primary border-primary" : ""} ${className}`}
    >
      {/* 마우스 드래그 라벨 */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-center px-2 h-full text-xs font-semibold text-muted-foreground group-hover:text-primary bg-muted/60 cursor-col-resize select-none transition-colors border-r border-border"
        title="좌우 드래그: 수치 조절 (Shift: 10배, Alt: 0.1배)"
      >
        {label}
      </div>

      {/* 수치 표기 및 직접 입력창 */}
      {isEditing ? (
        <input
          type="number"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full h-full bg-background px-2 text-xs font-mono text-primary outline-none border-none text-right"
        />
      ) : (
        <div
          onClick={() => !disabled && setIsEditing(true)}
          className="flex-1 flex items-center justify-end px-2 text-xs font-mono text-foreground cursor-text hover:text-primary"
        >
          <span>{Math.round(value * 100) / 100}</span>
          {unit && <span className="ml-1 text-[10px] text-muted-foreground font-sans">{unit}</span>}
        </div>
      )}

      {/* 드래그 중 실시간 뱃지 */}
      {isDragging && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border border-primary px-1.5 py-0.5 rounded text-[10px] font-mono shadow-md pointer-events-none z-50 whitespace-nowrap">
          « {Math.round(value * 100) / 100}
          {unit} »
        </div>
      )}
    </div>
  );
};
