import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';

const FONT_OPTIONS = ['Pretendard', 'GmarketSans', 'TmoneyRoundWind', 'Paperlogy', 'ChosunCentennial', 'Noto Sans KR'];

export interface TitleFloatingConfig {
  hasTopTitle?: boolean;
  titleLinesMode?: 'single' | 'double';
  hasTitleBadge?: boolean;
  titleBadgeText?: string;
  titleBadgeBg?: string;
  titleBadgeColor?: string;
  titleBadgeSizePx?: number;
  hasTitleLine1?: boolean;
  titleLine1?: string;
  titleLine1SizePx?: number;
  titleLine1Color?: string;
  hasTitleLine2?: boolean;
  titleLine2?: string;
  titleLine2SizePx?: number;
  titleLine2Color?: string;
  titleFontFamily?: string;
  titleBold?: boolean;
  titleItalic?: boolean;
  titleAlign?: 'left' | 'center' | 'right';
  titleStroke?: boolean;
  titleStrokeWidth?: number;
  titleStrokeColor?: string;
  titleShadow?: boolean;
  titleShadowBlur?: number;
  titleShadowColor?: string;
  titleBgMode?: 'none' | 'box' | 'pill';
  titleBgColor?: string;
  titlePaddingX?: number;
  titleBorderRadius?: number;
}

export interface TitleFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: TitleFloatingConfig;
  onChange: (patch: Partial<TitleFloatingConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const TitleFloatingInspector: React.FC<TitleFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  const {
    hasTopTitle = true,
    titleLinesMode = 'double',
    hasTitleBadge = true,
    titleBadgeText = '속보',
    titleBadgeBg = '#EF4444',
    titleBadgeColor = '#FFFFFF',
    titleBadgeSizePx = 11,
    hasTitleLine1 = true,
    titleLine1 = '조코비치 몰래카메라 ㅋㅋ',
    titleLine1SizePx = 20,
    titleLine1Color = '#FFFFFF',
    hasTitleLine2 = true,
    titleLine2 = '상대 선수 멘붕 직전',
    titleLine2SizePx = 24,
    titleLine2Color = '#FFE500',
    titleFontFamily = 'Pretendard',
    titleBold = true,
    titleItalic = false,
    titleAlign = 'center',
    titleStroke = true,
    titleStrokeWidth = 2,
    titleStrokeColor = '#000000',
    titleShadow = true,
    titleShadowBlur = 4,
    titleShadowColor = '#000000',
    titleBgMode = 'none',
    titleBgColor = '#000000',
    titlePaddingX = 8,
    titleBorderRadius = 4,
  } = config;

  return (
    <BaseFloatingInspectorCard
      title="상단 타이틀 & 뱃지"
      icon={<Type className="w-4 h-4 text-primary" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      <div className="space-y-3">
        {/* 1. 줄 수 설정 */}
        <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-[2px]">
          <span className="text-[10px] font-semibold text-foreground">줄 수 설정</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange({ titleLinesMode: 'single' })}
              className={cn(
                "px-2.5 py-0.5 text-[10px] font-bold rounded-[2px] transition cursor-pointer",
                titleLinesMode === 'single'
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              )}
            >
              1줄 고정
            </button>
            <button
              type="button"
              onClick={() => onChange({ titleLinesMode: 'double' })}
              className={cn(
                "px-2.5 py-0.5 text-[10px] font-bold rounded-[2px] transition cursor-pointer",
                titleLinesMode === 'double'
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              )}
            >
              2줄 고정 (추천)
            </button>
          </div>
        </div>

        {/* 2. 상단 뱃지 태그 설정 */}
        <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-foreground font-semibold flex items-center gap-1">
              <span>상단 뱃지 태그</span>
              {hasTitleBadge && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-mono font-bold">
                  {titleBadgeSizePx}px
                </span>
              )}
            </span>
            <Switch
              checked={hasTitleBadge}
              onCheckedChange={(checked) => onChange({ hasTitleBadge: checked })}
            />
          </div>

          {hasTitleBadge && (
            <div className="space-y-2.5 pt-1.5 border-t border-border/50">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">뱃지 문구</label>
                <input
                  type="text"
                  value={titleBadgeText}
                  onChange={(e) => onChange({ titleBadgeText: e.target.value })}
                  className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="예: [단독], [속보], [실화]"
                />
              </div>

              {/* 뱃지 배경 색상 */}
              <ColorPicker8Preset
                label="뱃지 배경 색상"
                value={titleBadgeBg}
                onChange={(c) => onChange({ titleBadgeBg: c })}
              />

              {/* 뱃지 글자 색상 */}
              <ColorPicker8Preset
                label="뱃지 글자 색상"
                value={titleBadgeColor}
                onChange={(c) => onChange({ titleBadgeColor: c })}
              />

              {/* 뱃지 글자 크기 */}
              <UnitSliderControl
                label="뱃지 글자 크기"
                value={titleBadgeSizePx}
                min={8}
                max={24}
                step={1}
                unit="px"
                onChange={(v) => onChange({ titleBadgeSizePx: v })}
              />
            </div>
          )}
        </div>

        {/* 3. 1단 타이틀 (상단 텍스트) */}
        <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-foreground font-semibold flex items-center gap-1">
              <span>1단 텍스트 (상단)</span>
              {hasTitleLine1 && (
                <span className="font-mono text-primary font-bold text-[9px]">{titleLine1SizePx}px</span>
              )}
            </span>
            <Switch
              checked={hasTitleLine1}
              onCheckedChange={(checked) => onChange({ hasTitleLine1: checked })}
            />
          </div>

          {hasTitleLine1 && (
            <div className="space-y-2.5 pt-1.5 border-t border-border/50">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">1단 타이틀 문구</label>
                <input
                  type="text"
                  value={titleLine1}
                  onChange={(e) => onChange({ titleLine1: e.target.value })}
                  className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="1단 타이틀 입력..."
                />
              </div>

              {/* 1단 글자 색상 */}
              <ColorPicker8Preset
                label="1단 글자 색상"
                value={titleLine1Color}
                onChange={(c) => onChange({ titleLine1Color: c })}
              />

              {/* 1단 글자 크기 */}
              <UnitSliderControl
                label="1단 글자 크기"
                value={titleLine1SizePx ?? 20}
                min={12}
                max={40}
                step={1}
                unit="px"
                onChange={(v) => onChange({ titleLine1SizePx: v })}
              />
            </div>
          )}
        </div>

        {/* 4. 2단 타이틀 (하단 핵심 후킹 - double 모드일 때) */}
        {titleLinesMode === 'double' && (
          <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-foreground font-semibold flex items-center gap-1">
                <span>2단 텍스트 (하단 핵심 후킹)</span>
                {hasTitleLine2 && (
                  <span className="font-mono text-amber-500 font-bold text-[9px]">{titleLine2SizePx}px</span>
                )}
              </span>
              <Switch
                checked={hasTitleLine2}
                onCheckedChange={(checked) => onChange({ hasTitleLine2: checked })}
              />
            </div>

            {hasTitleLine2 && (
              <div className="space-y-2.5 pt-1.5 border-t border-border/50">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">2단 타이틀 문구</label>
                  <input
                    type="text"
                    value={titleLine2}
                    onChange={(e) => onChange({ titleLine2: e.target.value })}
                    className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="2단 타이틀 입력..."
                  />
                </div>

                {/* 2단 글자 색상 */}
                <ColorPicker8Preset
                  label="2단 글자 색상"
                  value={titleLine2Color}
                  onChange={(c) => onChange({ titleLine2Color: c })}
                />

                {/* 2단 글자 크기 */}
                <UnitSliderControl
                  label="2단 글자 크기"
                  value={titleLine2SizePx ?? 24}
                  min={12}
                  max={44}
                  step={1}
                  unit="px"
                  onChange={(v) => onChange({ titleLine2SizePx: v })}
                />
              </div>
            )}
          </div>
        )}

        {/* 5. 글꼴 및 서체 스타일 / 정렬 */}
        <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-foreground">글꼴 (Font)</span>
            <select
              value={titleFontFamily}
              onChange={(e) => onChange({ titleFontFamily: e.target.value })}
              className="h-6 px-1.5 text-[10px] bg-background border border-border rounded text-foreground font-medium"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">스타일 및 정렬</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange({ titleBold: !titleBold })}
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer",
                  titleBold ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"
                )}
                title="굵게 (Bold)"
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onChange({ titleItalic: !titleItalic })}
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer",
                  titleItalic ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"
                )}
                title="기울임 (Italic)"
              >
                <Italic className="w-3 h-3" />
              </button>
              <div className="w-[1px] h-4 bg-border mx-0.5" />
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => onChange({ titleAlign: align })}
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-xs transition cursor-pointer",
                    titleAlign === align ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"
                  )}
                  title={`정렬: ${align}`}
                >
                  {align === 'left' ? <AlignLeft className="w-3 h-3" /> : align === 'center' ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 6. 🎨 테두리(외곽선) 상세 제어 */}
        <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
            <Switch
              checked={titleStroke}
              onCheckedChange={(checked) => onChange({ titleStroke: checked })}
            />
          </div>
          {titleStroke && (
            <div className="space-y-2 pt-1.5 border-t border-border/50">
              <UnitSliderControl
                label="테두리 두께"
                value={titleStrokeWidth}
                min={1}
                max={10}
                step={1}
                unit="px"
                onChange={(v) => onChange({ titleStrokeWidth: v })}
              />
              <ColorPicker8Preset
                label="테두리 색상"
                value={titleStrokeColor}
                onChange={(c) => onChange({ titleStrokeColor: c })}
              />
            </div>
          )}
        </div>

        {/* 7. 🌌 그림자 상세 제어 */}
        <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
            <Switch
              checked={titleShadow}
              onCheckedChange={(checked) => onChange({ titleShadow: checked })}
            />
          </div>
          {titleShadow && (
            <div className="space-y-2 pt-1.5 border-t border-border/50">
              <UnitSliderControl
                label="그림자 흐림 (Blur)"
                value={titleShadowBlur}
                min={0}
                max={20}
                step={1}
                unit="px"
                onChange={(v) => onChange({ titleShadowBlur: v })}
              />
              <ColorPicker8Preset
                label="그림자 색상"
                value={titleShadowColor}
                onChange={(c) => onChange({ titleShadowColor: c })}
              />
            </div>
          )}
        </div>

        {/* 8. 🔲 배경 박스 제어 */}
        <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">배경 박스</span>
            <div className="flex gap-1">
              {(['none', 'box', 'pill'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange({ titleBgMode: m })}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded font-medium cursor-pointer transition",
                    titleBgMode === m ? "bg-primary text-primary-foreground shadow-2xs font-bold" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === 'none' ? '없음' : m === 'box' ? '박스' : '알약'}
                </button>
              ))}
            </div>
          </div>

          {titleBgMode !== 'none' && (
            <div className="space-y-2 pt-1.5 border-t border-border/50">
              <ColorPicker8Preset
                label="배경 색상"
                value={titleBgColor}
                onChange={(c) => onChange({ titleBgColor: c })}
              />
              {titleBgMode === 'box' && (
                <UnitSliderControl
                  label="모서리 둥글기"
                  value={titleBorderRadius}
                  min={0}
                  max={30}
                  step={1}
                  unit="px"
                  onChange={(v) => onChange({ titleBorderRadius: v })}
                />
              )}
              <UnitSliderControl
                label="내부 패딩"
                value={titlePaddingX}
                min={2}
                max={30}
                step={1}
                unit="px"
                onChange={(v) => onChange({ titlePaddingX: v })}
              />
            </div>
          )}
        </div>
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default TitleFloatingInspector;

