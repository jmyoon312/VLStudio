import React, { useState, useRef, useEffect, useCallback } from "react";
import { RotateCcw } from "lucide-react";

export interface ScrubInputProps {
  label: string; // '1줄 크기', '세로 위치', '자간', '외곽선' 등
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number; // 1px당 증감량 (기본 1.0)
  unit?: string; // 'px', '%', 'deg'
  className?: string;
  disabled?: boolean;
  defaultValue?: number; // 기본값 (되돌리기용)
  layout?: "bar" | "compact"; // 기본 "bar" (min & max 있을 때 바 형태)
}

/**
 * [ScrubInput]
 * 픽셀링 1:1 완벽 대응 슬라이더 바 & 마우스 드래그 스크럽 인풋
 * - 픽셀링 Ya 슬라이더 컴포넌트 규격: 트랙 바 + 수치 직접 입력 + 기본값 복원 버튼
 * - 좌우 슬라이더 드래그로 60fps 실시간 수치 변경
 * - Shift 키: 10배 가속 / Alt 키: 0.1배 미세 조절
 * - 클릭 시 직접 숫자 타이핑 모드 지원
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
  defaultValue,
  layout = "bar",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(String(value));
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startValRef = useRef(value);

  // 단위가 %인 경우 기본 0~100, 아닌 경우 개발자가 지정한 min/max 사용 (임의 100 클램핑 원천 차단)
  const effectiveMin = min !== undefined ? min : (unit === "%" ? 0 : undefined);
  const effectiveMax = max !== undefined ? max : (unit === "%" ? 100 : undefined);

  useEffect(() => {
    if (!isEditing) {
      setTextValue(String(Math.round(value * 100) / 100));
    }
  }, [value, isEditing]);

  const clamp = useCallback(
    (val: number) => {
      let clamped = val;
      if (effectiveMin !== undefined) clamped = Math.max(effectiveMin, clamped);
      if (effectiveMax !== undefined) clamped = Math.min(effectiveMax, clamped);
      return Math.round(clamped * 100) / 100;
    },
    [effectiveMin, effectiveMax]
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

  // 슬라이더 바 범위 설정 (HTML5 range 기본값 0~100으로 인한 수치 파괴 방지)
  const sliderMin = min !== undefined ? min : (unit === "%" ? 0 : 0);
  const sliderMax = max !== undefined ? max : (unit === "%" ? 100 : Math.max(100, Math.ceil((value || 0) * 1.5)));

  // 트랙 바 채움 비율 계산 (%)
  const fillPercentage =
    sliderMax > sliderMin
      ? Math.max(0, Math.min(100, (((value || 0) - sliderMin) / (sliderMax - sliderMin)) * 100))
      : 50;

  // 1. 컴팩트 인라인 모드 (좁은 영역용)
  if (layout === "compact") {
    return (
      <div
        className={`group relative flex items-center h-8 bg-muted/40 hover:bg-muted/70 border border-border hover:border-border/90 rounded-md overflow-hidden transition-colors select-none ${
          disabled ? "opacity-40 pointer-events-none" : ""
        } ${isDragging ? "ring-1 ring-primary border-primary" : ""} ${className}`}
      >
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-center px-2 h-full text-xs font-semibold text-muted-foreground group-hover:text-primary bg-muted/60 cursor-col-resize select-none transition-colors border-r border-border"
          title="좌우 드래그: 수치 조절 (Shift: 10배, Alt: 0.1배)"
        >
          {label}
        </div>

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

        {isDragging && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border border-primary px-1.5 py-0.5 rounded text-[10px] font-mono shadow-md pointer-events-none z-50 whitespace-nowrap">
            « {Math.round(value * 100) / 100}
            {unit} »
          </div>
        )}
      </div>
    );
  }

  // 2. 픽셀링 1:1 슬라이더 바 모드 (기본)
  return (
    <div className={`space-y-1.5 select-none ${disabled ? "opacity-40 pointer-events-none" : ""} ${className}`}>
      {/* 상단: 라벨 & 수치 입력박스 & 기본값 되돌리기 */}
      <div className="flex items-center justify-between text-xs">
        <span
          onMouseDown={handleMouseDown}
          className="font-semibold text-foreground flex items-center space-x-1 cursor-col-resize hover:text-primary transition-colors"
          title="좌우 드래그하여 수치 조절"
        >
          <span>{label}</span>
        </span>

        <div className="flex items-center space-x-1.5 font-mono">
          <div className="flex items-center bg-muted/60 border border-border px-1.5 py-0.5 rounded text-[11px] hover:border-primary/80 transition-colors">
            <input
              type="number"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              step={step}
              className="w-12 bg-transparent text-right outline-none text-foreground font-bold"
            />
            {unit && <span className="ml-0.5 text-[10px] text-muted-foreground font-sans">{unit}</span>}
          </div>

          {defaultValue !== undefined && Math.abs(value - defaultValue) > 0.01 && (
            <button
              onClick={() => onChange(defaultValue)}
              className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-muted/80 transition-colors cursor-pointer"
              title={`기본값(${defaultValue}${unit})으로 되돌리기`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 하단: 매끄러운 수평 슬라이더 바 (트랙 바) */}
      <div className="relative flex items-center h-4 group">
        <input
          type="range"
          role="slider"
          aria-label={`${label} 막대`}
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none transition-all"
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${fillPercentage}%, rgba(120, 120, 128, 0.25) ${fillPercentage}%, rgba(120, 120, 128, 0.25) 100%)`,
          }}
        />
      </div>
    </div>
  );
};

export default ScrubInput;
