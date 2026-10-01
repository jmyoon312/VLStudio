import React from "react";
import { TextLayer } from "../../../types/blueprintV4";
import { ScrubInput } from "./ScrubInput";
import { ColorPalettePicker } from "./ColorPalettePicker";
import { resolveFontFamily } from "../../../lib/blueprintV4Migrator";

export interface TextInspectorPanelProps {
  layer: TextLayer;
  onChange: (patch: Partial<TextLayer>) => void;
  className?: string;
}

const FONT_OPTIONS = [
  { label: "Pretendard (표준 고딕)", value: "Pretendard, sans-serif" },
  { label: "Noto Sans KR (안정형 고딕)", value: "'Noto Sans KR', sans-serif" },
  { label: "Black Han Sans (임팩트 어그로)", value: "'Black Han Sans', sans-serif" },
  { label: "Gmarket Sans (트렌디 헤드라인)", value: "'GmarketSans', sans-serif" },
  { label: "샌드박스 어그로 (쇼츠 1위)", value: "'SBAggro', sans-serif" },
  { label: "여기어때 잘난체 (원탑 숏폼)", value: "'Jalnan', sans-serif" },
  { label: "쿠키런 폰트 (캐주얼 쇼츠)", value: "'CookieRun', sans-serif" },
  { label: "카페24 써라운드 (동글 볼드)", value: "'Cafe24Ssurround', sans-serif" },
  { label: "티머니 둥근바람 (볼드 헤드라인)", value: "'TmoneyRoundWind', sans-serif" },
  { label: "평창평화체 (스피디 액션)", value: "'PyeongChangPeace', sans-serif" },
  { label: "조선일보명조 (야담/역사/다큐)", value: "'Chosunilbo_myungjo', serif" },
  { label: "조선굵은고딕 (정통 1면 헤드라인)", value: "'ChosunKg', sans-serif" },
];

/**
 * [TextInspectorPanel]
 * 텍스트 내용, 폰트, 자간, 행간, 외곽선, 그림자, 누적 모드 설정 패널
 */
export const TextInspectorPanel: React.FC<TextInspectorPanelProps> = ({
  layer,
  onChange,
  className = "",
}) => {
  const currentFont = resolveFontFamily(layer.fontFamily);

  return (
    <div className={`space-y-4 p-3 bg-card rounded-xl border border-border ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span>텍스트 속성 (Typography)</span>
        <span className="text-[10px] text-primary font-mono">{layer.textRole}</span>
      </div>

      {/* 텍스트 내용 입력창 */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">내용</label>
        <textarea
          value={layer.content}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={2}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground outline-none focus:border-primary transition-colors resize-none"
          placeholder="자막 또는 타이틀 텍스트를 입력하세요"
        />
      </div>

      {/* 폰트 서체 선택 */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">폰트 서체</label>
        <select
          value={currentFont}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* 크기, 자간, 행간 스크럽 인풋 */}
      <div className="grid grid-cols-3 gap-2">
        <ScrubInput
          label="크기"
          value={layer.fontSize}
          onChange={(val) => onChange({ fontSize: val })}
          min={16}
          max={160}
          unit="px"
        />
        <ScrubInput
          label="자간"
          value={layer.letterSpacing}
          onChange={(val) => onChange({ letterSpacing: val })}
          min={-10}
          max={20}
          step={0.5}
          unit="px"
        />
        <ScrubInput
          label="행간"
          value={layer.lineHeight}
          onChange={(val) => onChange({ lineHeight: val })}
          min={0.8}
          max={3.0}
          step={0.05}
          sensitivity={0.01}
        />
      </div>

      {/* 글자 정렬 버튼 */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <span className="text-[11px] text-muted-foreground">정렬</span>
        <div className="flex items-center space-x-1 bg-muted/50 p-0.5 rounded border border-border">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ textAlign: align })}
              className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                layer.textAlign === align
                  ? "bg-background text-primary font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {align === "left" ? "좌" : align === "center" ? "중앙" : "우"}
            </button>
          ))}
        </div>
      </div>

      {/* 색상 선택기 */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <ColorPalettePicker
          label="글자 색상"
          color={layer.fontColor}
          onChange={(color) => onChange({ fontColor: color })}
        />

        {/* 외곽선 (Stroke) */}
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">외곽선 (Stroke)</span>
            <ScrubInput
              label="두께"
              value={layer.stroke?.width || 0}
              onChange={(val) =>
                onChange({
                  stroke: {
                    color: layer.stroke?.color || "#000000",
                    width: val,
                  },
                })
              }
              min={0}
              max={20}
              unit="px"
              className="w-24"
            />
          </div>
          <ColorPalettePicker
            label="외곽선 색상"
            color={layer.stroke?.color || "#000000"}
            onChange={(color) =>
              onChange({
                stroke: {
                  color,
                  width: layer.stroke?.width !== undefined && layer.stroke.width > 0 ? layer.stroke.width : 2,
                },
              })
            }
          />
        </div>

        {/* 그림자 (Shadow) */}
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">그림자 (Shadow)</span>
            <ScrubInput
              label="블러"
              value={layer.shadow?.blur || 0}
              onChange={(val) =>
                onChange({
                  shadow: {
                    color: layer.shadow?.color || "rgba(0,0,0,0.8)",
                    blur: val,
                    offsetX: layer.shadow?.offsetX || 0,
                    offsetY: layer.shadow?.offsetY || 2,
                  },
                })
              }
              min={0}
              max={30}
              unit="px"
              className="w-24"
            />
          </div>
          <ColorPalettePicker
            label="그림자 색상"
            color={layer.shadow?.color || "rgba(0,0,0,0.8)"}
            onChange={(color) =>
              onChange({
                shadow: {
                  color,
                  blur: layer.shadow?.blur !== undefined && layer.shadow.blur > 0 ? layer.shadow.blur : 6,
                  offsetX: layer.shadow?.offsetX || 0,
                  offsetY: layer.shadow?.offsetY || 2,
                },
              })
            }
          />
        </div>
      </div>

      {/* 썰형 자막 누적 모드 토글 (자막 레이어 전용 가드) */}
      {(layer.textRole === "subtitle_narrative" || layer.id.includes("subtitle")) && (
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div>
            <span className="text-xs text-foreground font-semibold block">썰형 자막 순차 누적 모드</span>
            <span className="text-[10px] text-muted-foreground block">이전 발화 자막을 지우지 않고 화면에 누적 표시</span>
          </div>
          <input
            type="checkbox"
            checked={layer.accumulateMode || false}
            onChange={(e) => onChange({ accumulateMode: e.target.checked })}
            className="accent-primary cursor-pointer w-4 h-4"
          />
        </div>
      )}
    </div>
  );
};
