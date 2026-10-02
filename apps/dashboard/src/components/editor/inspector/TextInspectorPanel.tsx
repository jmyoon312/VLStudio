import React, { useState } from "react";
import { TextLayer, LineStyleSpec } from "../../../types/blueprintV4";
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

type TextTab = "style" | "fonts" | "sample";

/**
 * [TextInspectorPanel]
 * 3탭 구조 (스타일 | 글꼴 | 샘플 글) 텍스트 인스펙터
 * - 줄 크기 (1·2·3) 및 줄 색상 (1·2·3) 개별 제어 완비
 * - 세로 위치, 줄간격, 자간, 외곽선, 그림자 정밀 슬라이더
 * - 썰형 순차 누적 모드 토글
 */
export const TextInspectorPanel: React.FC<TextInspectorPanelProps> = ({
  layer,
  onChange,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<TextTab>("style");
  const currentFont = resolveFontFamily(layer.fontFamily);

  // 텍스트 내용 기반 줄(Line) 분할 (\n 줄바꿈 기준)
  const contentText = layer.content || "";
  const rawLines = contentText.split("\n");
  const lines = rawLines.length > 0 ? rawLines : [contentText];
  const isMultiLine = lines.length > 1 || Boolean(layer.multiLineStyles && layer.multiLineStyles.length > 1);

  // 1·2·3 줄 스타일 기본값 구성 (군림보/쇼츠 표준: 1줄 58px #FBBF24, 2줄 54px #FFFFFF, 3줄 54px #FFFFFF)
  const lineStyles: LineStyleSpec[] = [
    layer.multiLineStyles?.[0] || { fontSize: layer.fontSize, fontColor: layer.fontColor || "#FBBF24" },
    layer.multiLineStyles?.[1] || { fontSize: Math.max(16, layer.fontSize - 4), fontColor: "#FFFFFF" },
    layer.multiLineStyles?.[2] || { fontSize: Math.max(16, layer.fontSize - 4), fontColor: "#FFFFFF" },
  ];

  // 특정 줄의 스타일 패치
  const updateLineStyle = (index: number, patch: Partial<LineStyleSpec>) => {
    const nextStyles = [...lineStyles];
    nextStyles[index] = { ...nextStyles[index], ...patch };
    onChange({ multiLineStyles: nextStyles });
  };

  return (
    <div className={`space-y-3.5 p-3 bg-card rounded-xl border border-border select-none ${className}`}>
      {/* 1. 상단 3탭 스위처: [스타일] | [글꼴] | [샘플 글] */}
      <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("style")}
          className={`flex-1 py-1 rounded-md font-semibold transition-all cursor-pointer ${
            activeTab === "style"
              ? "bg-background text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🎨 스타일
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fonts")}
          className={`flex-1 py-1 rounded-md font-semibold transition-all cursor-pointer ${
            activeTab === "fonts"
              ? "bg-background text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🔤 글꼴
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sample")}
          className={`flex-1 py-1 rounded-md font-semibold transition-all cursor-pointer ${
            activeTab === "sample"
              ? "bg-background text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📝 샘플 글
        </button>
      </div>

      {/* 2. [스타일] 탭: 줄별 크기/색상 및 정밀 위치·효과 */}
      {activeTab === "style" && (
        <div className="space-y-3.5 animate-in fade-in-50 duration-150">
          {/* 글자 크기: 1줄 vs 1·2·3줄 개별 제어 슬라이더 바 */}
          {isMultiLine ? (
            <div className="space-y-2.5 p-2.5 bg-muted/30 rounded-xl border border-border/60">
              <span className="text-[11px] font-bold text-foreground block">
                줄별 글자 크기 (1·2·3)
              </span>
              <div className="space-y-2">
                <ScrubInput
                  label="1줄 크기"
                  value={lineStyles[0]?.fontSize || layer.fontSize}
                  onChange={(val) => {
                    updateLineStyle(0, { fontSize: val });
                    onChange({ fontSize: val });
                  }}
                  min={16}
                  max={160}
                  unit="px"
                  defaultValue={58}
                />
                <ScrubInput
                  label="2줄 크기"
                  value={lineStyles[1]?.fontSize || layer.fontSize}
                  onChange={(val) => updateLineStyle(1, { fontSize: val })}
                  min={16}
                  max={160}
                  unit="px"
                  defaultValue={54}
                />
                {(lines.length > 2 || (layer.multiLineStyles && layer.multiLineStyles.length > 2)) && (
                  <ScrubInput
                    label="3줄 크기"
                    value={lineStyles[2]?.fontSize || layer.fontSize}
                    onChange={(val) => updateLineStyle(2, { fontSize: val })}
                    min={16}
                    max={160}
                    unit="px"
                    defaultValue={54}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-muted/30 rounded-xl border border-border/60">
              <ScrubInput
                label="글자 크기"
                value={layer.fontSize}
                onChange={(val) => onChange({ fontSize: val })}
                min={16}
                max={200}
                unit="px"
                defaultValue={48}
              />
            </div>
          )}

          {/* 줄 색 (1·2·3) 개별 제어 */}
          {isMultiLine ? (
            <div className="space-y-2 p-2.5 bg-muted/30 rounded-xl border border-border/60">
              <span className="text-[11px] font-bold text-foreground block">
                줄별 색상 (1·2·3)
              </span>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">1줄 색</span>
                  <ColorPalettePicker
                    label=""
                    color={lineStyles[0]?.fontColor || layer.fontColor || "#FBBF24"}
                    onChange={(color) => {
                      updateLineStyle(0, { fontColor: color });
                      onChange({ fontColor: color });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">2줄 색</span>
                  <ColorPalettePicker
                    label=""
                    color={lineStyles[1]?.fontColor || "#FFFFFF"}
                    onChange={(color) => updateLineStyle(1, { fontColor: color })}
                  />
                </div>
                {(lines.length > 2 || (layer.multiLineStyles && layer.multiLineStyles.length > 2)) && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">3줄 색</span>
                    <ColorPalettePicker
                      label=""
                      color={lineStyles[2]?.fontColor || "#FFFFFF"}
                      onChange={(color) => updateLineStyle(2, { fontColor: color })}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-muted/30 rounded-xl border border-border/60">
              <ColorPalettePicker
                label="글자 색상"
                color={layer.fontColor || "#FFFFFF"}
                onChange={(fontColor) => onChange({ fontColor })}
              />
            </div>
          )}

          {/* 세로 위치, 줄간격, 자간 슬라이더 바 (픽셀링 1:1 완비) */}
          <div className="space-y-2.5 p-2.5 bg-muted/20 rounded-xl border border-border/50">
            <ScrubInput
              label="세로 위치"
              value={layer.verticalPosition || 0}
              onChange={(val) => onChange({ verticalPosition: val })}
              min={-200}
              max={400}
              unit="px"
              defaultValue={0}
            />
            <ScrubInput
              label="줄간격 (행간)"
              value={layer.lineHeight}
              onChange={(val) => onChange({ lineHeight: val })}
              min={0.8}
              max={2.5}
              step={0.05}
              defaultValue={1.2}
            />
            <ScrubInput
              label="자간"
              value={layer.letterSpacing}
              onChange={(val) => onChange({ letterSpacing: val })}
              min={-10}
              max={20}
              step={0.5}
              unit="px"
              defaultValue={-1}
            />
          </div>

          {/* 외곽선 (Stroke) */}
          <div className="p-2.5 bg-muted/20 rounded-xl border border-border/50 space-y-2">
            <span className="text-[11px] font-bold text-foreground block">외곽선 (Stroke)</span>
            <ScrubInput
              label="외곽선 두께"
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
              defaultValue={0}
            />
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
          <div className="p-2.5 bg-muted/20 rounded-xl border border-border/50 space-y-2">
            <span className="text-[11px] font-bold text-foreground block">그림자 (Shadow)</span>
            <ScrubInput
              label="그림자 블러"
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
              defaultValue={0}
            />
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

          {/* 썰형 자막 누적 모드 토글 */}
          {(layer.textRole === "subtitle_narrative" || layer.id.includes("subtitle")) && (
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div>
                <span className="text-xs text-foreground font-semibold block">썰형 자막 순차 누적</span>
                <span className="text-[10px] text-muted-foreground block">이전 발화를 지우지 않고 화면에 누적 표시</span>
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
      )}

      {/* 3. [글꼴] 탭: 서체 선택 및 정렬 */}
      {activeTab === "fonts" && (
        <div className="space-y-3.5 animate-in fade-in-50 duration-150">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">폰트 서체</label>
            <select
              value={currentFont}
              onChange={(e) => onChange({ fontFamily: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* 글자 정렬 버튼 */}
          <div className="flex items-center justify-between pt-1 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground">정렬</span>
            <div className="flex items-center space-x-1 bg-muted/50 p-0.5 rounded border border-border">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => onChange({ textAlign: align })}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
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

          <div className="p-2.5 bg-muted/40 rounded-lg border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
            💡 쇼츠 및 릴스에서는 굵고 주목도가 높은 <span className="text-foreground font-semibold">샌드박스 어그로</span> 또는 <span className="text-foreground font-semibold">Black Han Sans</span> 서체를 추천합니다.
          </div>
        </div>
      )}

      {/* 4. [샘플 글] 탭: 실시간 내용 입력창 */}
      {activeTab === "sample" && (
        <div className="space-y-2.5 animate-in fade-in-50 duration-150">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            미리보기에만 쓰는 글이에요. 실제 영상 제작 시에는 AI 대본이 자동으로 채워집니다. 줄바꿈(엔터)으로 1·2·3줄을 분리할 수 있습니다.
          </p>
          <textarea
            value={layer.content}
            onChange={(e) => onChange({ content: e.target.value })}
            rows={4}
            className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:border-primary transition-colors resize-none leading-relaxed font-sans"
            placeholder="1줄: 이거 모르면 평생 후회&#10;2줄: 한국인 99% 모르는 상식&#10;3줄: 지금 바로 확인하세요"
          />
        </div>
      )}
    </div>
  );
};
