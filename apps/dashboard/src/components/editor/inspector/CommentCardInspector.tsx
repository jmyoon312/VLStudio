import React from "react";
import { ShapeLayer, CommentCardStyle } from "../../../types/blueprintV4";
import { ScrubInput } from "./ScrubInput";
import { ColorPalettePicker } from "./ColorPalettePicker";

export interface CommentCardInspectorProps {
  layer: ShapeLayer;
  onChange: (patch: Partial<ShapeLayer>) => void;
  className?: string;
}

interface PresetOption {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
  border?: string;
  desc: string;
}

const PRESET_OPTIONS: PresetOption[] = [
  { id: "default-dark", name: "기본 다크", bg: "#1e1e1e", text: "#ffffff", accent: "#ef4444", desc: "표준 유튜브/쇼츠 다크" },
  { id: "default-light", name: "기본 라이트", bg: "#ffffff", text: "#18181b", accent: "#ef4444", border: "#e4e4e7", desc: "깔끔한 화이트" },
  { id: "maritel-neon", name: "마리텔 네온", bg: "#18181b", text: "#38bdf8", accent: "#38bdf8", border: "#0284c7", desc: "마이리틀텔레비전 팝" },
  { id: "maritel-dark", name: "마리텔 골드", bg: "#09090b", text: "#fbbf24", accent: "#f59e0b", desc: "고급스러운 골드" },
  { id: "news-dark", name: "뉴스룸 다크", bg: "#0f172a", text: "#f8fafc", accent: "#ef4444", desc: "정통 방송 뉴스룸" },
  { id: "news-light", name: "뉴스룸 라이트", bg: "#f1f5f9", text: "#0f172a", accent: "#2563eb", border: "#cbd5e1", desc: "공공/언론 브리핑" },
  { id: "cyber-cyan", name: "사이버 네온", bg: "#030712", text: "#22d3ee", accent: "#06b6d4", border: "#0891b2", desc: "SF/테크 사이버틱" },
  { id: "cyber-purple", name: "사이버 퍼플", bg: "#1e1b4b", text: "#e879f9", accent: "#c084fc", desc: "트렌디 릴스 보라" },
  { id: "insta-clean", name: "인스타 클린", bg: "#ffffff", text: "#000000", accent: "#2563eb", border: "#e5e7eb", desc: "인스타그램 릴스 피드" },
  { id: "insta-dark", name: "인스타 다크", bg: "#18181b", text: "#f4f4f5", accent: "#3b82f6", desc: "인스타그램 다크 피드" },
  { id: "minimal-overlay", name: "미니멀 반투명", bg: "rgba(0,0,0,0.6)", text: "#ffffff", accent: "#fbbf24", desc: "영상 위 블렌딩" },
  { id: "minimal-bordered", name: "미니멀 보더", bg: "transparent", text: "#ffffff", accent: "#ffffff", border: "#ffffff", desc: "모던 아웃라인" },
];

/**
 * [CommentCardInspector]
 * 댓글형 폼팩터 전용 12종 디자인 프리셋 및 카드 형태 미세 조작 인스펙터
 */
export const CommentCardInspector: React.FC<CommentCardInspectorProps> = ({
  layer,
  onChange,
  className = "",
}) => {
  const currentStyle: CommentCardStyle = layer.commentCardStyle || {
    presetId: "default-dark",
    theme: "dark",
    cardWidth: 600,
    paddingY: 24,
    borderRadius: 16,
    opacity: 100,
    backgroundColor: layer.fillColor || "#1e1e1e",
    textColor: "#ffffff",
    accentColor: "#ef4444",
    showShadow: false,
    showBorder: false,
    borderColor: "#00000000",
    transparentExport: false,
    showAuthorBadge: true,
    authorBlur: false,
    avatarInitial: false,
  };

  const updateStyle = (patch: Partial<CommentCardStyle>) => {
    const next = { ...currentStyle, ...patch };
    onChange({
      commentCardStyle: next,
      fillColor: next.backgroundColor,
      borderRadius: next.borderRadius,
      borderWidth: next.showBorder ? 2 : 0,
      borderColor: next.borderColor,
    });
  };

  const handleApplyPreset = (p: PresetOption) => {
    updateStyle({
      presetId: p.id,
      backgroundColor: p.bg,
      textColor: p.text,
      accentColor: p.accent,
      showBorder: !!p.border,
      borderColor: p.border || "#00000000",
    });
  };

  return (
    <div className={`space-y-4 p-3 bg-card rounded-xl border border-border select-none ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span>💬 댓글 카드 스타일</span>
        <span className="text-[10px] text-primary font-mono font-bold">12종 프리셋</span>
      </div>

      {/* 1. 12종 디자인 프리셋 그리드 */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-muted-foreground block">디자인 템플릿 프리셋</label>
        <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-0.5">
          {PRESET_OPTIONS.map((p) => {
            const isSelected = currentStyle.presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-2 rounded-lg text-left border transition-all cursor-pointer flex flex-col justify-between h-15 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                    : "border-border/70 hover:border-border bg-muted/40 hover:bg-muted/70"
                }`}
                title={p.desc}
              >
                <div className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: p.bg === "transparent" ? "#fff" : p.bg }}
                  />
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.accent }}
                  />
                </div>
                <span className="text-[10px] font-semibold truncate text-foreground">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 카드 형태 미세 조작기 (너비, 여백, 곡률, 불투명도) */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <label className="text-[11px] font-semibold text-foreground block">카드 형태 정밀 조작</label>
        <div className="space-y-2.5">
          <ScrubInput
            label="카드 너비"
            value={currentStyle.cardWidth}
            onChange={(val) => {
              updateStyle({ cardWidth: val });
              onChange({
                transform: { ...layer.transform, width: val },
              });
            }}
            min={300}
            max={900}
            unit="px"
            defaultValue={600}
          />
          <ScrubInput
            label="상하 여백"
            value={currentStyle.paddingY}
            onChange={(val) => updateStyle({ paddingY: val })}
            min={8}
            max={80}
            unit="px"
            defaultValue={24}
          />
          <ScrubInput
            label="모서리 곡률 (라운드)"
            value={currentStyle.borderRadius}
            onChange={(val) => updateStyle({ borderRadius: val })}
            min={0}
            max={32}
            unit="px"
            defaultValue={16}
          />
          <ScrubInput
            label="배경 불투명도"
            value={currentStyle.opacity}
            onChange={(val) => updateStyle({ opacity: val })}
            min={0}
            max={100}
            unit="%"
            defaultValue={100}
          />
        </div>
      </div>

      {/* 3. 카드 색상 피커 (배경 / 텍스트 / 액센트) */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <label className="text-[11px] font-semibold text-foreground block">색상 커스텀</label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">카드 배경색</span>
            <ColorPalettePicker
              label=""
              color={currentStyle.backgroundColor}
              onChange={(c) => updateStyle({ backgroundColor: c })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">본문 텍스트</span>
            <ColorPalettePicker
              label=""
              color={currentStyle.textColor}
              onChange={(c) => updateStyle({ textColor: c })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">좋아요 강조색</span>
            <ColorPalettePicker
              label=""
              color={currentStyle.accentColor}
              onChange={(c) => updateStyle({ accentColor: c })}
            />
          </div>
        </div>
      </div>

      {/* 4. 부가 옵션 (블러, 이니셜, 투명 배경) */}
      <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">작성자 블러 처리</span>
          <input
            type="checkbox"
            checked={currentStyle.authorBlur}
            onChange={(e) => updateStyle({ authorBlur: e.target.checked })}
            className="accent-primary cursor-pointer w-4 h-4"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">첫 글자 이니셜 아바타</span>
          <input
            type="checkbox"
            checked={currentStyle.avatarInitial}
            onChange={(e) => updateStyle({ avatarInitial: e.target.checked })}
            className="accent-primary cursor-pointer w-4 h-4"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">투명 배경 (Alpha 내보내기)</span>
          <input
            type="checkbox"
            checked={currentStyle.transparentExport}
            onChange={(e) => updateStyle({ transparentExport: e.target.checked })}
            className="accent-primary cursor-pointer w-4 h-4"
          />
        </div>
      </div>
    </div>
  );
};
