import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Tag } from 'lucide-react';
import { BarGeometryControlGroup } from './shared';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { FontStyleAlignControl } from '../controls/FontStyleAlignControl';

export interface TitleSourceInspectorFormProps {
  mode?: 'all' | 'title' | 'sourceCredit' | 'topBottomBar';
  [key: string]: any;
}

const FONT_OPTIONS = ['Pretendard', 'GmarketSans', 'TmoneyRoundWind', 'Paperlogy', 'ChosunCentennial', 'Noto Sans KR'];

export const TitleSourceInspectorForm: React.FC<TitleSourceInspectorFormProps> = (props) => {
  const {
    mode = 'all',
    hasTopTitle = true, setHasTopTitle = () => {},
    titleLinesMode = 'double', setTitleLinesMode = () => {},
    hasTitleBadge = true, setHasTitleBadge = () => {},
    titleBadgeText = '속보', setTitleBadgeText = () => {},
    titleBadgeBg = '#EF4444', setTitleBadgeBg = () => {},
    titleBadgeColor = '#FFFFFF', setTitleBadgeColor = () => {},
    titleBadgeSizePx = 11, setTitleBadgeSizePx = () => {},
    titleBadgeRadius = 4, setTitleBadgeRadius = () => {},
    hasTitleLine1 = true, setHasTitleLine1 = () => {},
    titleLine1 = '조코비치 몰래카메라 ㅋㅋ', setTitleLine1 = () => {},
    titleLine1SizePx = 20, setTitleLine1SizePx = () => {},
    titleLine1Color = '#FFFFFF', setTitleLine1Color = () => {},
    hasTitleLine2 = true, setHasTitleLine2 = () => {},
    titleLine2 = '상대 선수 멘붕 직전', setTitleLine2 = () => {},
    titleLine2SizePx = 24, setTitleLine2SizePx = () => {},
    titleLine2Color = '#FFE500', setTitleLine2Color = () => {},
    titleFontFamily = 'Pretendard', setTitleFontFamily = () => {},
    titleBold = true, setTitleBold = () => {},
    titleItalic = false, setTitleItalic = () => {},
    titleAlign = 'center', setTitleAlign = () => {},
    titleStroke = true, setTitleStroke = () => {},
    titleStrokeWidth = 2, setTitleStrokeWidth = () => {},
    titleStrokeColor = '#000000', setTitleStrokeColor = () => {},
    titleShadow = true, setTitleShadow = () => {},
    titleShadowBlur = 4, setTitleShadowBlur = () => {},
    titleShadowColor = '#000000', setTitleShadowColor = () => {},
    titleBgMode = 'none', setTitleBgMode = () => {},
    titleBgColor = '#000000', setTitleBgColor = () => {},
    titlePaddingX = 8, setTitlePaddingX = () => {},
    titleBorderRadius = 4, setTitleBorderRadius = () => {},
    hasTopBarBg = true, setHasTopBarBg = () => {},
    topBarBg = '#000000', setTopBarBg = () => {},
    topBarHeightPct = 18.3, setTopBarHeightPct = () => {},
    topBarOpacity = 100, setTopBarOpacity = () => {},
    topBarRadius = 0, setTopBarRadius = () => {},
    hasBottomBarBg = true, setHasBottomBarBg = () => {},
    bottomBarBg = '#000000', setBottomBarBg = () => {},
    bottomBarHeightPct = 6.0, setBottomBarHeightPct = () => {},
    bottomBarOpacity = 100, setBottomBarOpacity = () => {},
    bottomBarRadius = 0, setBottomBarRadius = () => {},
    hasBottomSource = true, setHasBottomSource = () => {},
    bottomSourceText = '출처: 공식 유튜브 영상', setBottomSourceText = () => {},
    bottomSourceColor = '#94A3B8', setBottomSourceColor = () => {},
    bottomSourceSizePx = 10, setBottomSourceSizePx,
    bottomSourceFontFamily = 'Pretendard', setBottomSourceFontFamily,
    bottomSourceBold = false, setBottomSourceBold = () => {},
    bottomSourceItalic = false, setBottomSourceItalic = () => {},
    bottomSourceAlign = 'center', setBottomSourceAlign = () => {},
    bottomSourceBottomPct = 3.5, setBottomSourceBottomPct = () => {},
    bottomSourceStroke = false, setBottomSourceStroke = () => {},
    bottomSourceStrokeWidth = 1, setBottomSourceStrokeWidth = () => {},
    bottomSourceStrokeColor = '#000000', setBottomSourceStrokeColor = () => {},
    bottomSourceShadow = true, setBottomSourceShadow = () => {},
    bottomSourceShadowBlur = 4, setBottomSourceShadowBlur = () => {},
    bottomSourceShadowColor = 'rgba(0,0,0,0.9)', setBottomSourceShadowColor = () => {},
    bottomSourceBg = false, setBottomSourceBg = () => {},
    bottomSourceBgColor = 'rgba(0,0,0,0.7)', setBottomSourceBgColor = () => {},
    bottomSourceBorderRadius = 4, setBottomSourceBorderRadius = () => {},
    sourceTransform, setSourceTransform = () => {},
    layoutTemplateMode = 'classic',
    instaConfig, setInstaConfig,
    gunlimboConfig, setGunlimboConfig,
    ssulConfig, setSsulConfig,
    topTitleText, setTopTitleText,
    titleTransform, setTitleTransform,
    setTopTitleYPct,
    titleLetterSpacing = -0.5, setTitleLetterSpacing,
    titleLineHeight = 1.2, setTitleLineHeight,
    bottomSourceLetterSpacing = 0, setBottomSourceLetterSpacing,
    bottomSourceLineHeight = 1.2, setBottomSourceLineHeight,
    titleLine1FontFamily, setTitleLine1FontFamily,
    titleLine1Bold, setTitleLine1Bold,
    titleLine1Italic, setTitleLine1Italic,
    titleLine1Align, setTitleLine1Align,
    titleLine1LetterSpacing, setTitleLine1LetterSpacing,
    titleLine1LineHeight, setTitleLine1LineHeight,
    titleLine2FontFamily, setTitleLine2FontFamily,
    titleLine2Bold, setTitleLine2Bold,
    titleLine2Italic, setTitleLine2Italic,
    titleLine2Align, setTitleLine2Align,
    titleLine2LetterSpacing, setTitleLine2LetterSpacing,
    titleLine2LineHeight, setTitleLine2LineHeight,
  } = props;

  const showTitle = mode === 'all' || mode === 'title';
  const showSource = mode === 'all' || mode === 'sourceCredit';
  const showBars = mode === 'all' || mode === 'topBottomBar';

  // 📱 인스타형 독립 헤드라인 대제목 인스펙터
  if (showTitle && layoutTemplateMode === 'instagram') {
    return (
      <div className="space-y-3">
        <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground">✍️ 인스타 헤드라인 대제목</span>
            </div>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30 font-bold">
              인스타형
            </Badge>
          </div>

          <div className="space-y-3">
            {/* 문구 입력 */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground">대제목 문구 (엔터로 줄바꿈)</label>
              <textarea
                rows={2}
                value={topTitleText || titleLine1 || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setTopTitleText?.(val);
                  setTitleLine1?.(val);
                  setInstaConfig?.((prev: any) => ({ ...prev, titleText: val }));
                }}
                placeholder="제목을\n입력하세요"
                className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-[2px] resize-none font-bold leading-tight"
              />
            </div>

            {/* 글자 크기 & 색상 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <UnitSliderControl
                label="글자 크기 (폰트 사이즈)"
                value={titleLine1SizePx || 22}
                min={14}
                max={42}
                step={1}
                unit="px"
                onChange={(val) => {
                  setTitleLine1SizePx?.(val);
                  setInstaConfig?.((prev: any) => ({ ...prev, titleSize: val }));
                }}
              />
              <ColorPicker8Preset
                label="글자 색상"
                value={titleLine1Color || '#000000'}
                onChange={(val) => {
                  setTitleLine1Color?.(val);
                  setInstaConfig?.((prev: any) => ({ ...prev, titleColor: val }));
                }}
              />
            </div>

            {/* 글꼴 (Font) & 스타일 및 정렬 (Bold, Italic, Align) */}
            <FontStyleAlignControl
              label="대제목 글꼴 (Font)"
              font={titleFontFamily || instaConfig?.titleFont || 'Pretendard'}
              setFont={(f) => {
                setTitleFontFamily?.(f);
                setInstaConfig?.((prev: any) => ({ ...prev, titleFont: f }));
              }}
              bold={titleBold !== false}
              setBold={(b) => {
                setTitleBold?.(b);
                setInstaConfig?.((prev: any) => ({ ...prev, titleBold: b }));
              }}
              italic={titleItalic ?? false}
              setItalic={(i) => {
                setTitleItalic?.(i);
                setInstaConfig?.((prev: any) => ({ ...prev, titleItalic: i }));
              }}
              align={titleAlign || instaConfig?.titleAlign || 'left'}
              setAlign={(a) => {
                setTitleAlign?.(a);
                setInstaConfig?.((prev: any) => ({ ...prev, titleAlign: a }));
              }}
              letterSpacing={titleLetterSpacing ?? instaConfig?.titleLetterSpacing ?? -0.5}
              setLetterSpacing={(ls) => {
                setTitleLetterSpacing?.(ls);
                setInstaConfig?.((prev: any) => ({ ...prev, titleLetterSpacing: ls }));
              }}
              lineHeight={titleLineHeight ?? instaConfig?.titleLineHeight ?? 1.2}
              setLineHeight={(lh) => {
                setTitleLineHeight?.(lh);
                setInstaConfig?.((prev: any) => ({ ...prev, titleLineHeight: lh }));
              }}
            />

            {/* 정밀 위치 & 스케일 */}
            {titleTransform && (
              <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                <span className="text-[10px] font-semibold text-muted-foreground block">정밀 위치 & 스케일</span>
                <div className="grid grid-cols-2 gap-2">
                  <UnitSliderControl
                    label="X 위치"
                    value={titleTransform.xPct ?? 6.0}
                    min={2}
                    max={35}
                    step={0.5}
                    unit="%"
                    onChange={(val) => setTitleTransform?.((prev: any) => ({ ...prev, xPct: val }))}
                  />
                  <UnitSliderControl
                    label="Y 위치"
                    value={titleTransform.yPct ?? 12.0}
                    min={5}
                    max={25}
                    step={0.5}
                    unit="%"
                    onChange={(val) => {
                      setTitleTransform?.((prev: any) => ({ ...prev, yPct: val }));
                      setTopTitleYPct?.(val);
                    }}
                  />
                </div>
              </div>
            )}

            {/* 🎨 글자 테두리 (외곽선) */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                <Switch checked={titleStroke} onCheckedChange={setTitleStroke} />
              </div>
              {titleStroke && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <UnitSliderControl
                    label="테두리 두께"
                    value={titleStrokeWidth ?? 2}
                    min={1}
                    max={10}
                    step={1}
                    unit="px"
                    onChange={setTitleStrokeWidth}
                  />
                  <ColorPicker8Preset
                    label="테두리 색상"
                    value={titleStrokeColor}
                    onChange={setTitleStrokeColor}
                  />
                </div>
              )}
            </div>

            {/* 🌌 글자 그림자 (Shadow) */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
                <Switch checked={titleShadow} onCheckedChange={setTitleShadow} />
              </div>
              {titleShadow && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <UnitSliderControl
                    label="그림자 흐림 (Blur)"
                    value={titleShadowBlur ?? 4}
                    min={0}
                    max={20}
                    step={1}
                    unit="px"
                    onChange={setTitleShadowBlur}
                  />
                  <ColorPicker8Preset
                    label="그림자 색상"
                    value={titleShadowColor || '#000000'}
                    onChange={setTitleShadowColor}
                  />
                </div>
              )}
            </div>

            {/* 🔲 배경 박스 & 모서리 둥글기 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">배경 박스</span>
                <div className="flex gap-1">
                  {(['none', 'box', 'pill'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTitleBgMode(m)}
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
                    value={titleBgColor || '#000000'}
                    onChange={setTitleBgColor}
                  />
                  {titleBgMode === 'box' && (
                    <UnitSliderControl
                      label="모서리 모양 (둥글기)"
                      value={titleBorderRadius ?? 4}
                      min={0}
                      max={30}
                      step={1}
                      unit="px"
                      onChange={setTitleBorderRadius}
                    />
                  )}
                  <UnitSliderControl
                    label="내부 패딩"
                    value={titlePaddingX ?? 8}
                    min={2}
                    max={24}
                    step={1}
                    unit="px"
                    onChange={setTitlePaddingX}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🎯 군림보형 독립 상단 2줄 대제목 인스펙터
  if (showTitle && layoutTemplateMode === 'gunlimbo') {
    return (
      <div className="space-y-3">
        <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground">👑 군림보 상단 2줄 대제목</span>
            </div>
          </div>
          <div className="space-y-3">
            {/* 🏷️ 상단 뱃지 태그 (HOT, 특종 등) */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>상단 뱃지 태그</span>
                </span>
                <Switch
                  checked={gunlimboConfig?.hasTitleBadge ?? hasTitleBadge}
                  onCheckedChange={(val) => {
                    setHasTitleBadge?.(val);
                    setGunlimboConfig?.((prev: any) => ({ ...prev, hasTitleBadge: val }));
                  }}
                />
              </div>

              {(gunlimboConfig?.hasTitleBadge ?? hasTitleBadge) && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">뱃지 문구</label>
                    <input
                      type="text"
                      value={gunlimboConfig?.titleBadgeText ?? titleBadgeText ?? 'HOT'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTitleBadgeText?.(val);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeText: val }));
                      }}
                      className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                      placeholder="뱃지 문구 (예: HOT, 특종, 속보)"
                    />
                  </div>
                  <ColorPicker8Preset
                    label="뱃지 배경색"
                    value={gunlimboConfig?.titleBadgeBg || titleBadgeBg || '#EF4444'}
                    onChange={(val) => {
                      setTitleBadgeBg?.(val);
                      setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeBg: val }));
                    }}
                  />
                  <ColorPicker8Preset
                    label="뱃지 글자색"
                    value={gunlimboConfig?.titleBadgeColor || titleBadgeColor || '#FFFFFF'}
                    onChange={(val) => {
                      setTitleBadgeColor?.(val);
                      setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeColor: val }));
                    }}
                  />
                  <UnitSliderControl
                    label="뱃지 크기"
                    value={gunlimboConfig?.titleBadgeSizePx || titleBadgeSizePx || 11}
                    min={9}
                    max={18}
                    step={1}
                    unit="px"
                    onChange={(val) => {
                      setTitleBadgeSizePx?.(val);
                      setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeSizePx: val }));
                    }}
                  />
                  <UnitSliderControl
                    label="뱃지 모서리 둥글기 (Radius)"
                    value={gunlimboConfig?.titleBadgeRadius ?? titleBadgeRadius ?? 4}
                    min={0}
                    max={16}
                    step={1}
                    unit="px"
                    onChange={(val) => {
                      setTitleBadgeRadius?.(val);
                      setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeRadius: val }));
                    }}
                  />
                </div>
              )}
            </div>

            {/* 📏 타이틀 줄 수 선택 (1줄 고정 vs 2줄 포인트 후킹) */}
            <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
              <label className="text-[10px] font-semibold text-muted-foreground">타이틀 줄 수 모드</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTitleLinesMode?.('single');
                    setGunlimboConfig?.((prev: any) => ({ ...prev, titleLinesMode: 'single' }));
                  }}
                  className={cn(
                    "h-7 rounded-[2px] text-[11px] font-bold border flex items-center justify-center transition-all cursor-pointer",
                    (gunlimboConfig?.titleLinesMode ?? titleLinesMode) === 'single'
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  1줄 고정
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitleLinesMode?.('double');
                    setGunlimboConfig?.((prev: any) => ({ ...prev, titleLinesMode: 'double' }));
                  }}
                  className={cn(
                    "h-7 rounded-[2px] text-[11px] font-bold border flex items-center justify-center transition-all cursor-pointer",
                    (gunlimboConfig?.titleLinesMode ?? titleLinesMode) === 'double'
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  2줄 (포인트 후킹)
                </button>
              </div>
            </div>

            {/* 1단 문구, 색상, 크기, 서체 및 스타일/정렬 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">1단 타이틀 문구 (위)</label>
                <input
                  type="text"
                  value={gunlimboConfig?.titleLine1 || titleLine1 || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTitleLine1?.(val);
                    setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1: val }));
                  }}
                  className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                  placeholder="제목 1행"
                />
              </div>
              <ColorPicker8Preset
                label="1단 글자 색상"
                value={gunlimboConfig?.titleLine1Color || titleLine1Color || '#FFFFFF'}
                onChange={(val) => {
                  setTitleLine1Color?.(val);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Color: val }));
                }}
              />
              <UnitSliderControl
                label="1단 글자 크기"
                value={gunlimboConfig?.titleLine1FontSize || gunlimboConfig?.titleFontSize || titleLine1SizePx || 34}
                min={16}
                max={50}
                step={1}
                unit="px"
                onChange={(val) => {
                  setTitleLine1SizePx?.(val);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1FontSize: val, titleFontSize: val }));
                }}
              />
              <FontStyleAlignControl
                label="1단 글꼴 (Font)"
                font={gunlimboConfig?.titleLine1Font || gunlimboConfig?.titleFont || titleLine1FontFamily || titleFontFamily || 'Pretendard'}
                setFont={(f) => {
                  setTitleLine1FontFamily?.(f);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Font: f }));
                }}
                bold={gunlimboConfig?.titleLine1Bold !== undefined ? gunlimboConfig.titleLine1Bold : (titleLine1Bold !== undefined ? titleLine1Bold : (titleBold !== false))}
                setBold={(b) => {
                  setTitleLine1Bold?.(b);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Bold: b }));
                }}
                italic={gunlimboConfig?.titleLine1Italic !== undefined ? gunlimboConfig.titleLine1Italic : (titleLine1Italic ?? titleItalic ?? false)}
                setItalic={(i) => {
                  setTitleLine1Italic?.(i);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Italic: i }));
                }}
                align={gunlimboConfig?.titleLine1Align || titleLine1Align || titleAlign || 'center'}
                setAlign={(a) => {
                  setTitleLine1Align?.(a);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Align: a }));
                }}
                letterSpacing={gunlimboConfig?.titleLine1LetterSpacing !== undefined ? gunlimboConfig.titleLine1LetterSpacing : (titleLine1LetterSpacing ?? -0.5)}
                setLetterSpacing={(ls) => {
                  setTitleLine1LetterSpacing?.(ls);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1LetterSpacing: ls }));
                }}
                lineHeight={gunlimboConfig?.titleLineHeight ?? titleLineHeight ?? 1.2}
                setLineHeight={(lh) => {
                  setTitleLineHeight?.(lh);
                  setTitleLine1LineHeight?.(lh);
                  setTitleLine2LineHeight?.(lh);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleLineHeight: lh, titleLine1LineHeight: lh, titleLine2LineHeight: lh }));
                }}
              />
            </div>

            {/* 2단 문구, 색상, 크기, 서체 및 스타일/정렬 (double 모드일 때만 표시) */}
            {(gunlimboConfig?.titleLinesMode ?? titleLinesMode ?? 'double') === 'double' && (
              <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <span>2단 타이틀 문구 (아래 포인트)</span>
                    {(gunlimboConfig?.hasTitleLine2 ?? hasTitleLine2 ?? true) && (
                      <span className="font-mono text-amber-500 font-bold text-[9px]">
                        {gunlimboConfig?.titleLine2FontSize || gunlimboConfig?.titleFontSize || titleLine2SizePx || 34}px
                      </span>
                    )}
                  </span>
                  <Switch
                    checked={gunlimboConfig?.hasTitleLine2 ?? hasTitleLine2 ?? true}
                    onCheckedChange={(val) => {
                      setHasTitleLine2?.(val);
                      setGunlimboConfig?.((prev: any) => ({ ...prev, hasTitleLine2: val }));
                    }}
                  />
                </div>

                {(gunlimboConfig?.hasTitleLine2 ?? hasTitleLine2 ?? true) && (
                  <div className="space-y-2 pt-1.5 border-t border-border/50">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground">2단 문구 내용</label>
                      <input
                        type="text"
                        value={gunlimboConfig?.titleLine2 || titleLine2 || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTitleLine2?.(val);
                          setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2: val }));
                        }}
                        className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                        placeholder="제목 2행"
                      />
                    </div>
                    <ColorPicker8Preset
                      label="2단 포인트 색상"
                      value={gunlimboConfig?.titleLine2Color || titleLine2Color || '#FFE500'}
                      onChange={(val) => {
                        setTitleLine2Color?.(val);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Color: val }));
                      }}
                    />
                    <UnitSliderControl
                      label="2단 글자 크기"
                      value={gunlimboConfig?.titleLine2FontSize || gunlimboConfig?.titleFontSize || titleLine2SizePx || 34}
                      min={16}
                      max={50}
                      step={1}
                      unit="px"
                      onChange={(val) => {
                        setTitleLine2SizePx?.(val);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2FontSize: val }));
                      }}
                    />
                    <FontStyleAlignControl
                      label="2단 글꼴 (Font)"
                      font={gunlimboConfig?.titleLine2Font || gunlimboConfig?.titleFont || titleLine2FontFamily || titleFontFamily || 'Pretendard'}
                      setFont={(f) => {
                        setTitleLine2FontFamily?.(f);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Font: f }));
                      }}
                      bold={gunlimboConfig?.titleLine2Bold !== undefined ? gunlimboConfig.titleLine2Bold : (titleLine2Bold !== undefined ? titleLine2Bold : (titleBold !== false))}
                      setBold={(b) => {
                        setTitleLine2Bold?.(b);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Bold: b }));
                      }}
                      italic={gunlimboConfig?.titleLine2Italic !== undefined ? gunlimboConfig.titleLine2Italic : (titleLine2Italic ?? titleItalic ?? false)}
                      setItalic={(i) => {
                        setTitleLine2Italic?.(i);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Italic: i }));
                      }}
                      align={gunlimboConfig?.titleLine2Align || titleLine2Align || titleAlign || 'center'}
                      setAlign={(a) => {
                        setTitleLine2Align?.(a);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Align: a }));
                      }}
                      letterSpacing={gunlimboConfig?.titleLine2LetterSpacing !== undefined ? gunlimboConfig.titleLine2LetterSpacing : (titleLine2LetterSpacing ?? -0.5)}
                      setLetterSpacing={(ls) => {
                        setTitleLine2LetterSpacing?.(ls);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2LetterSpacing: ls }));
                      }}
                      lineHeight={gunlimboConfig?.titleLineHeight ?? titleLineHeight ?? 1.2}
                      setLineHeight={(lh) => {
                        setTitleLineHeight?.(lh);
                        setTitleLine1LineHeight?.(lh);
                        setTitleLine2LineHeight?.(lh);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleLineHeight: lh, titleLine1LineHeight: lh, titleLine2LineHeight: lh }));
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 노출 설정 */}
            <div className="p-2 bg-muted/20 border border-border rounded-[2px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground">영상 전체에서 계속 표시</span>
                <Switch
                  checked={gunlimboConfig?.keepTitleThroughout ?? true}
                  onCheckedChange={(val) => setGunlimboConfig?.((prev: any) => ({ ...prev, keepTitleThroughout: val }))}
                />
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                <div>
                  <div className="text-[10px] font-semibold text-foreground">쿠팡 파트너스 안심존</div>
                  <div className="text-[9px] text-muted-foreground">자막 좌측 38% 편향 & 우하단 여백 확보</div>
                </div>
                <Switch
                  checked={gunlimboConfig?.coupangSafeZone ?? false}
                  onCheckedChange={(val) => setGunlimboConfig?.((prev: any) => ({ ...prev, coupangSafeZone: val }))}
                />
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                <div>
                  <div className="text-[10px] font-semibold text-foreground">0초 켄 번스(Ken Burns) 줌인</div>
                  <div className="text-[9px] text-muted-foreground">초반 2.5초간 카메라 1.0x → 1.08x 서서히 줌</div>
                </div>
                <Switch
                  checked={gunlimboConfig?.kenBurnsMotion !== false}
                  onCheckedChange={(val) => setGunlimboConfig?.((prev: any) => ({ ...prev, kenBurnsMotion: val }))}
                />
              </div>
            </div>

            {/* 🎨 글자 테두리 (외곽선) */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                <Switch checked={titleStroke} onCheckedChange={setTitleStroke} />
              </div>
              {titleStroke && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <UnitSliderControl
                    label="테두리 두께"
                    value={titleStrokeWidth ?? 2}
                    min={1}
                    max={10}
                    step={1}
                    unit="px"
                    onChange={setTitleStrokeWidth}
                  />
                  <ColorPicker8Preset
                    label="테두리 색상"
                    value={titleStrokeColor}
                    onChange={setTitleStrokeColor}
                  />
                </div>
              )}
            </div>

            {/* 🌌 글자 그림자 (Shadow) */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
                <Switch checked={titleShadow} onCheckedChange={setTitleShadow} />
              </div>
              {titleShadow && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <UnitSliderControl
                    label="그림자 흐림 (Blur)"
                    value={titleShadowBlur ?? 4}
                    min={0}
                    max={20}
                    step={1}
                    unit="px"
                    onChange={setTitleShadowBlur}
                  />
                  <ColorPicker8Preset
                    label="그림자 색상"
                    value={titleShadowColor || '#000000'}
                    onChange={setTitleShadowColor}
                  />
                </div>
              )}
            </div>

            {/* 🔲 배경 박스 & 모서리 둥글기 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">배경 박스</span>
                <div className="flex gap-1">
                  {(['none', 'box', 'pill'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setTitleBgMode(m);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleBgMode: m }));
                      }}
                      className={cn(
                        "px-2 py-0.5 text-[10px] rounded font-medium cursor-pointer transition",
                        (gunlimboConfig?.titleBgMode ?? titleBgMode) === m ? "bg-primary text-primary-foreground shadow-2xs font-bold" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {m === 'none' ? '없음' : m === 'box' ? '박스' : '알약'}
                    </button>
                  ))}
                </div>
              </div>

              {(gunlimboConfig?.titleBgMode ?? titleBgMode) !== 'none' && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <ColorPicker8Preset
                    label="배경 색상"
                    value={gunlimboConfig?.titleBgColor || titleBgColor || '#000000'}
                    onChange={(val) => {
                      setTitleBgColor(val);
                      setGunlimboConfig?.((prev: any) => ({ ...prev, titleBgColor: val }));
                    }}
                  />
                  {(gunlimboConfig?.titleBgMode ?? titleBgMode) === 'box' && (
                    <UnitSliderControl
                      label="모서리 모양 (둥글기)"
                      value={gunlimboConfig?.titleBorderRadius ?? titleBorderRadius ?? 4}
                      min={0}
                      max={30}
                      step={1}
                      unit="px"
                      onChange={(val) => {
                        setTitleBorderRadius(val);
                        setGunlimboConfig?.((prev: any) => ({ ...prev, titleBorderRadius: val }));
                      }}
                    />
                  )}
                  <UnitSliderControl
                    label="내부 패딩"
                    value={gunlimboConfig?.titlePaddingX ?? titlePaddingX ?? 8}
                    min={2}
                    max={24}
                    step={1}
                    unit="px"
                    onChange={(val) => {
                      setTitlePaddingX(val);
                      setGunlimboConfig?.((prev: any) => ({ ...prev, titlePaddingX: val }));
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 📜 썰형 독립 게시글 제목 인스펙터
  if (showTitle && layoutTemplateMode === 'ssul') {
    return (
      <div className="space-y-3">
        <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground">📰 썰형 게시글 제목</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground">게시글 본문 제목</label>
              <textarea
                rows={2}
                value={ssulConfig?.postTitle?.text || topTitleText || titleLine1 || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setTopTitleText?.(val);
                  setTitleLine1?.(val);
                  setSsulConfig?.((prev: any) => ({
                    ...prev,
                    postTitle: { ...(prev?.postTitle || {}), text: val },
                  }));
                }}
                placeholder="게시글 제목"
                className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-[2px] resize-none font-bold"
              />
            </div>
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <UnitSliderControl
                label="글자 크기 배율"
                value={ssulConfig?.postTitle?.fontSizeMultiplier || 1.0}
                min={0.8}
                max={1.6}
                step={0.05}
                unit="x"
                onChange={(val) => {
                  setSsulConfig?.((prev: any) => ({
                    ...prev,
                    postTitle: { ...(prev?.postTitle || {}), fontSizeMultiplier: val },
                  }));
                }}
              />
              <ColorPicker8Preset
                label="글자 색상"
                value={ssulConfig?.postTitle?.color || '#18181B'}
                onChange={(val) => {
                  setSsulConfig?.((prev: any) => ({
                    ...prev,
                    postTitle: { ...(prev?.postTitle || {}), color: val },
                  }));
                }}
              />
            </div>

            {/* 글꼴 (Font) & 스타일 및 정렬 (Bold, Italic, Align) */}
            <FontStyleAlignControl
              label="게시글 제목 글꼴 (Font)"
              font={ssulConfig?.postTitle?.font || titleFontFamily || 'Pretendard'}
              setFont={(f) => {
                setTitleFontFamily?.(f);
                setSsulConfig?.((prev: any) => ({
                  ...prev,
                  postTitle: { ...(prev?.postTitle || {}), font: f },
                }));
              }}
              bold={ssulConfig?.postTitle?.bold ?? (titleBold !== false)}
              setBold={(b) => {
                setTitleBold?.(b);
                setSsulConfig?.((prev: any) => ({
                  ...prev,
                  postTitle: { ...(prev?.postTitle || {}), bold: b },
                }));
              }}
              italic={ssulConfig?.postTitle?.italic ?? (titleItalic || false)}
              setItalic={(i) => {
                setTitleItalic?.(i);
                setSsulConfig?.((prev: any) => ({
                  ...prev,
                  postTitle: { ...(prev?.postTitle || {}), italic: i },
                }));
              }}
              align={ssulConfig?.postTitle?.align || titleAlign || 'left'}
              setAlign={(a) => {
                setTitleAlign?.(a);
                setSsulConfig?.((prev: any) => ({
                  ...prev,
                  postTitle: { ...(prev?.postTitle || {}), align: a },
                }));
              }}
              letterSpacing={ssulConfig?.postTitle?.letterSpacing ?? titleLetterSpacing ?? -0.5}
              setLetterSpacing={(ls) => {
                setTitleLetterSpacing?.(ls);
                setSsulConfig?.((prev: any) => ({
                  ...prev,
                  postTitle: { ...(prev?.postTitle || {}), letterSpacing: ls },
                }));
              }}
              lineHeight={ssulConfig?.postTitle?.lineHeight ?? titleLineHeight ?? 1.25}
              setLineHeight={(lh) => {
                setTitleLineHeight?.(lh);
                setSsulConfig?.((prev: any) => ({
                  ...prev,
                  postTitle: { ...(prev?.postTitle || {}), lineHeight: lh },
                }));
              }}
            />

            {/* 🎨 글자 테두리 (외곽선) */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                <Switch
                  checked={ssulConfig?.postTitle?.strokeEnabled ?? titleStroke}
                  onCheckedChange={(chk) => {
                    setTitleStroke(chk);
                    setSsulConfig?.((prev: any) => ({
                      ...prev,
                      postTitle: { ...(prev?.postTitle || {}), strokeEnabled: chk },
                    }));
                  }}
                />
              </div>
              {(ssulConfig?.postTitle?.strokeEnabled ?? titleStroke) && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <UnitSliderControl
                    label="테두리 두께"
                    value={ssulConfig?.postTitle?.strokeWidth ?? titleStrokeWidth ?? 2}
                    min={1}
                    max={10}
                    step={1}
                    unit="px"
                    onChange={(val) => {
                      setTitleStrokeWidth(val);
                      setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: { ...(prev?.postTitle || {}), strokeWidth: val },
                      }));
                    }}
                  />
                  <ColorPicker8Preset
                    label="테두리 색상"
                    value={ssulConfig?.postTitle?.strokeColor || titleStrokeColor}
                    onChange={(val) => {
                      setTitleStrokeColor(val);
                      setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: { ...(prev?.postTitle || {}), strokeColor: val },
                      }));
                    }}
                  />
                </div>
              )}
            </div>

            {/* 🌌 글자 그림자 (Shadow) */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
                <Switch
                  checked={ssulConfig?.postTitle?.shadowEnabled ?? titleShadow}
                  onCheckedChange={(chk) => {
                    setTitleShadow(chk);
                    setSsulConfig?.((prev: any) => ({
                      ...prev,
                      postTitle: { ...(prev?.postTitle || {}), shadowEnabled: chk },
                    }));
                  }}
                />
              </div>
              {(ssulConfig?.postTitle?.shadowEnabled ?? titleShadow) && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <UnitSliderControl
                    label="그림자 흐림 (Blur)"
                    value={ssulConfig?.postTitle?.shadowBlur ?? titleShadowBlur ?? 4}
                    min={0}
                    max={20}
                    step={1}
                    unit="px"
                    onChange={(val) => {
                      setTitleShadowBlur(val);
                      setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: { ...(prev?.postTitle || {}), shadowBlur: val },
                      }));
                    }}
                  />
                  <ColorPicker8Preset
                    label="그림자 색상"
                    value={ssulConfig?.postTitle?.shadowColor || titleShadowColor || '#000000'}
                    onChange={(val) => {
                      setTitleShadowColor(val);
                      setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: { ...(prev?.postTitle || {}), shadowColor: val },
                      }));
                    }}
                  />
                </div>
              )}
            </div>

            {/* 🔲 배경 박스 & 모서리 둥글기 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">배경 박스</span>
                <Switch
                  checked={(ssulConfig?.postTitle?.bgMode && ssulConfig.postTitle.bgMode !== 'none') || titleBgMode !== 'none'}
                  onCheckedChange={(chk) => {
                    const mode = chk ? 'box' : 'none';
                    setTitleBgMode(mode);
                    setSsulConfig?.((prev: any) => ({
                      ...prev,
                      postTitle: { ...(prev?.postTitle || {}), bgMode: mode },
                    }));
                  }}
                />
              </div>

              {((ssulConfig?.postTitle?.bgMode && ssulConfig.postTitle.bgMode !== 'none') || titleBgMode !== 'none') && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <ColorPicker8Preset
                    label="배경 색상"
                    value={ssulConfig?.postTitle?.bgColor || titleBgColor || '#F3F4F6'}
                    onChange={(val) => {
                      setTitleBgColor(val);
                      setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: { ...(prev?.postTitle || {}), bgColor: val },
                      }));
                    }}
                  />
                  <UnitSliderControl
                    label="모서리 모양 (둥글기)"
                    value={ssulConfig?.postTitle?.borderRadius ?? titleBorderRadius ?? 4}
                    min={0}
                    max={30}
                    step={1}
                    unit="px"
                    onChange={(val) => {
                      setTitleBorderRadius(val);
                      setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: { ...(prev?.postTitle || {}), borderRadius: val },
                      }));
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 🏛️ 상단 고정 타이틀 카드 */}
      {showTitle && (
        <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border pb-1.5">
          <div className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-foreground">상단 고정 타이틀</span>
          </div>
          <Switch checked={hasTopTitle} onCheckedChange={setHasTopTitle} />
        </div>

        {hasTopTitle && (
          <div className="space-y-3">
            {/* 1. 줄 수 설정 */}
            <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-[2px]">
              <span className="text-[10px] font-semibold text-foreground">줄 수 설정</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTitleLinesMode('single')}
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
                  onClick={() => setTitleLinesMode('double')}
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
                <Switch checked={hasTitleBadge} onCheckedChange={setHasTitleBadge} />
              </div>

              {hasTitleBadge && (
                <div className="space-y-2.5 pt-1.5 border-t border-border/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">뱃지 문구</label>
                    <input
                      type="text"
                      value={titleBadgeText || ''}
                      onChange={(e) => setTitleBadgeText(e.target.value)}
                      className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary"
                      placeholder="예: [단독], [속보], [실화]"
                    />
                  </div>

                  {/* 뱃지 배경 색상 */}
                  <ColorPicker8Preset
                    label="뱃지 배경 색상"
                    value={titleBadgeBg || '#EF4444'}
                    onChange={setTitleBadgeBg}
                  />

                  {/* 뱃지 글자 색상 */}
                  <ColorPicker8Preset
                    label="뱃지 글자 색상"
                    value={titleBadgeColor || '#FFFFFF'}
                    onChange={setTitleBadgeColor}
                  />

                  {/* 뱃지 글자 크기 */}
                  <UnitSliderControl
                    label="뱃지 글자 크기"
                    value={titleBadgeSizePx ?? 11}
                    min={8}
                    max={24}
                    step={1}
                    unit="px"
                    onChange={setTitleBadgeSizePx}
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
                <Switch checked={hasTitleLine1} onCheckedChange={setHasTitleLine1} />
              </div>

              {hasTitleLine1 && (
                <div className="space-y-2.5 pt-1.5 border-t border-border/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">1단 타이틀 문구</label>
                    <input
                      type="text"
                      value={titleLine1 || ''}
                      onChange={(e) => setTitleLine1(e.target.value)}
                      className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary"
                      placeholder="1단 타이틀 입력..."
                    />
                  </div>

                  {/* 1단 글자 색상 */}
                  <ColorPicker8Preset
                    label="1단 글자 색상"
                    value={titleLine1Color}
                    onChange={setTitleLine1Color}
                  />

                  {/* 1단 글자 크기 */}
                  <UnitSliderControl
                    label="1단 글자 크기"
                    value={titleLine1SizePx ?? 20}
                    min={12}
                    max={40}
                    step={1}
                    unit="px"
                    onChange={setTitleLine1SizePx}
                  />

                  {/* 1단 글꼴 & 스타일 및 정렬 & 자간/줄간격 */}
                  <FontStyleAlignControl
                    label="1단 글꼴 (Font)"
                    font={titleLine1FontFamily || titleFontFamily}
                    setFont={(f) => {
                      setTitleLine1FontFamily?.(f);
                      if (titleLinesMode === 'single') setTitleFontFamily?.(f);
                    }}
                    bold={titleLine1Bold !== undefined ? titleLine1Bold : (titleBold !== false)}
                    setBold={(b) => {
                      setTitleLine1Bold?.(b);
                      if (titleLinesMode === 'single') setTitleBold?.(b);
                    }}
                    italic={titleLine1Italic !== undefined ? titleLine1Italic : (titleItalic ?? false)}
                    setItalic={(i) => {
                      setTitleLine1Italic?.(i);
                      if (titleLinesMode === 'single') setTitleItalic?.(i);
                    }}
                    align={titleLine1Align || titleAlign || 'center'}
                    setAlign={(a) => {
                      setTitleLine1Align?.(a);
                      if (titleLinesMode === 'single') setTitleAlign?.(a);
                    }}
                    letterSpacing={titleLine1LetterSpacing !== undefined ? titleLine1LetterSpacing : -0.5}
                    setLetterSpacing={(ls) => {
                      setTitleLine1LetterSpacing?.(ls);
                      if (titleLinesMode === 'single') setTitleLetterSpacing?.(ls);
                    }}
                    lineHeight={titleLineHeight ?? 1.2}
                    setLineHeight={(lh) => {
                      setTitleLineHeight?.(lh);
                      setTitleLine1LineHeight?.(lh);
                      setTitleLine2LineHeight?.(lh);
                    }}
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
                  <Switch checked={hasTitleLine2} onCheckedChange={setHasTitleLine2} />
                </div>

                {hasTitleLine2 && (
                  <div className="space-y-2.5 pt-1.5 border-t border-border/50">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground">2단 타이틀 문구</label>
                      <input
                        type="text"
                        value={titleLine2 || ''}
                        onChange={(e) => setTitleLine2(e.target.value)}
                        className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary"
                        placeholder="2단 타이틀 입력..."
                      />
                    </div>

                    {/* 2단 글자 색상 */}
                    <ColorPicker8Preset
                      label="2단 글자 색상"
                      value={titleLine2Color}
                      onChange={setTitleLine2Color}
                    />

                    {/* 2단 글자 크기 */}
                    <UnitSliderControl
                      label="2단 글자 크기"
                      value={titleLine2SizePx ?? 24}
                      min={12}
                      max={44}
                      step={1}
                      unit="px"
                      onChange={setTitleLine2SizePx}
                    />

                    {/* 2단 글꼴 & 스타일 및 정렬 & 자간/줄간격 */}
                    <FontStyleAlignControl
                      label="2단 글꼴 (Font)"
                      font={titleLine2FontFamily || titleFontFamily}
                      setFont={setTitleLine2FontFamily}
                      bold={titleLine2Bold !== undefined ? titleLine2Bold : (titleBold !== false)}
                      setBold={setTitleLine2Bold}
                      italic={titleLine2Italic !== undefined ? titleLine2Italic : (titleItalic ?? false)}
                      setItalic={setTitleLine2Italic}
                      align={titleLine2Align || titleAlign || 'center'}
                      setAlign={setTitleLine2Align}
                      letterSpacing={titleLine2LetterSpacing !== undefined ? titleLine2LetterSpacing : -0.5}
                      setLetterSpacing={setTitleLine2LetterSpacing}
                      lineHeight={titleLineHeight ?? 1.2}
                      setLineHeight={(lh) => {
                        setTitleLineHeight?.(lh);
                        setTitleLine1LineHeight?.(lh);
                        setTitleLine2LineHeight?.(lh);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 6. 🎨 테두리(외곽선) 상세 제어 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                <Switch checked={titleStroke} onCheckedChange={setTitleStroke} />
              </div>
              {titleStroke && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <UnitSliderControl
                    label="테두리 두께"
                    value={titleStrokeWidth ?? 2}
                    min={1}
                    max={10}
                    step={1}
                    unit="px"
                    onChange={setTitleStrokeWidth}
                  />
                  <ColorPicker8Preset
                    label="테두리 색상"
                    value={titleStrokeColor}
                    onChange={setTitleStrokeColor}
                  />
                </div>
              )}
            </div>

            {/* 7. 🌌 그림자 상세 제어 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
                <Switch checked={titleShadow} onCheckedChange={setTitleShadow} />
              </div>
              {titleShadow && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  <UnitSliderControl
                    label="그림자 흐림 (Blur)"
                    value={titleShadowBlur ?? 4}
                    min={0}
                    max={20}
                    step={1}
                    unit="px"
                    onChange={setTitleShadowBlur}
                  />
                  <ColorPicker8Preset
                    label="그림자 색상"
                    value={titleShadowColor || '#000000'}
                    onChange={setTitleShadowColor}
                  />
                </div>
              )}
            </div>

            {/* 8. 🔲 배경 박스 & 모서리 둥글기 제어 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">배경 박스</span>
                <div className="flex gap-1">
                  {(['none', 'box', 'pill'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTitleBgMode(m)}
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
                    value={titleBgColor || '#000000'}
                    onChange={setTitleBgColor}
                  />
                  {titleBgMode === 'box' && (
                    <UnitSliderControl
                      label="모서리 모양 (둥글기)"
                      value={titleBorderRadius ?? 4}
                      min={0}
                      max={30}
                      step={1}
                      unit="px"
                      onChange={setTitleBorderRadius}
                    />
                  )}
                  <UnitSliderControl
                    label="내부 패딩"
                    value={titlePaddingX ?? 8}
                    min={2}
                    max={30}
                    step={1}
                    unit="px"
                    onChange={setTitlePaddingX}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* 🏷️ 하단 출처 표기 카드 (글자/테두리/그림자/배경 풀세트) */}
      {showSource && (
        <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-[11px] font-bold text-foreground">하단 출처 표기</span>
            <Switch checked={hasBottomSource} onCheckedChange={setHasBottomSource} />
          </div>
          {hasBottomSource && (
            <div className="space-y-3">
              {/* 1. 출처 문구 */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">출처 문구</label>
                <input
                  type="text"
                  value={bottomSourceText || ''}
                  onChange={(e) => setBottomSourceText(e.target.value)}
                  placeholder="출처: 공식 유튜브 영상"
                  className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-medium"
                />
              </div>

              {/* 2. 글꼴 및 서체 스타일 / 정렬 */}
              <FontStyleAlignControl
                label="출처 글꼴 (Font)"
                font={bottomSourceFontFamily || 'Pretendard'}
                setFont={(f) => setBottomSourceFontFamily?.(f)}
                bold={bottomSourceBold}
                setBold={(b) => setBottomSourceBold?.(b)}
                italic={bottomSourceItalic}
                setItalic={(i) => setBottomSourceItalic?.(i)}
                align={bottomSourceAlign}
                setAlign={(a) => setBottomSourceAlign?.(a)}
                letterSpacing={bottomSourceLetterSpacing ?? 0}
                setLetterSpacing={setBottomSourceLetterSpacing}
                lineHeight={bottomSourceLineHeight ?? 1.2}
                setLineHeight={setBottomSourceLineHeight}
              />

              {/* 3. 글자 색상 & 크기 */}
              <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                <ColorPicker8Preset
                  label="출처 글자 색상"
                  value={bottomSourceColor || '#94A3B8'}
                  onChange={setBottomSourceColor}
                />
                <UnitSliderControl
                  label="출처 글자 크기"
                  value={bottomSourceSizePx || 10}
                  min={8}
                  max={22}
                  step={1}
                  unit="px"
                  onChange={(v) => setBottomSourceSizePx?.(v)}
                />
              </div>

              {/* 4. 🎨 글자 테두리 (외곽선 Stroke) */}
              <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                  <Switch checked={bottomSourceStroke} onCheckedChange={setBottomSourceStroke} />
                </div>
                {bottomSourceStroke && (
                  <div className="space-y-2 pt-1.5 border-t border-border/50">
                    <UnitSliderControl
                      label="테두리 두께"
                      value={bottomSourceStrokeWidth || 1}
                      min={0.5}
                      max={8}
                      step={0.5}
                      unit="px"
                      onChange={setBottomSourceStrokeWidth}
                    />
                    <ColorPicker8Preset
                      label="테두리 색상"
                      value={bottomSourceStrokeColor || '#000000'}
                      onChange={setBottomSourceStrokeColor}
                    />
                  </div>
                )}
              </div>

              {/* 5. 🌌 입체 그림자 (Shadow) */}
              <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
                  <Switch checked={bottomSourceShadow} onCheckedChange={setBottomSourceShadow} />
                </div>
                {bottomSourceShadow && (
                  <div className="space-y-2 pt-1.5 border-t border-border/50">
                    <UnitSliderControl
                      label="그림자 흐림 (Blur)"
                      value={bottomSourceShadowBlur !== undefined ? bottomSourceShadowBlur : 4}
                      min={0}
                      max={20}
                      step={1}
                      unit="px"
                      onChange={setBottomSourceShadowBlur}
                    />
                    <ColorPicker8Preset
                      label="그림자 색상"
                      value={bottomSourceShadowColor || '#000000'}
                      onChange={setBottomSourceShadowColor}
                    />
                  </div>
                )}
              </div>

              {/* 6. 🔲 배경 박스 (Box) */}
              <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground">배경 박스</span>
                  <Switch checked={bottomSourceBg} onCheckedChange={setBottomSourceBg} />
                </div>
                {bottomSourceBg && (
                  <div className="space-y-2 pt-1.5 border-t border-border/50">
                    <ColorPicker8Preset
                      label="배경 색상"
                      value={bottomSourceBgColor || 'rgba(0,0,0,0.7)'}
                      onChange={setBottomSourceBgColor}
                    />
                    <UnitSliderControl
                      label="모서리 둥글기"
                      value={bottomSourceBorderRadius !== undefined ? bottomSourceBorderRadius : 4}
                      min={0}
                      max={24}
                      step={1}
                      unit="px"
                      onChange={setBottomSourceBorderRadius}
                    />
                  </div>
                )}
              </div>

              {/* 7. 🏷️ 하단 출처 표기 세부 위치 & 높낮이 */}
              <div className="p-2 bg-muted/20 border border-border rounded-[2px]">
                <UnitSliderControl
                  label="🏷️ 바닥 위치 (Y)"
                  value={bottomSourceBottomPct ?? 3.5}
                  min={0}
                  max={25}
                  step={0.5}
                  unit="%"
                  onChange={(val) => {
                    setBottomSourceBottomPct?.(val);
                    setSourceTransform?.((prev: any) => ({ ...prev, yPct: 100 - val }));
                  }}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground pt-1">
                  <span>0% (맨 바닥)</span>
                  <span>하단 바 위/안쪽 자유 배치</span>
                  <span>25%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📏 상단 및 하단 배경 바 카드 */}
      {showBars && (
        <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-[11px] font-bold text-foreground">상하단 배경 바</span>
          </div>
          <BarGeometryControlGroup
            label="상단 배경 바"
            enabled={hasTopBarBg}
            setEnabled={setHasTopBarBg}
            bgColor={topBarBg}
            setBgColor={setTopBarBg}
            heightPct={topBarHeightPct}
            setHeightPct={setTopBarHeightPct}
            opacity={topBarOpacity !== undefined ? (topBarOpacity > 1 ? topBarOpacity : topBarOpacity * 100) : 100}
            setOpacity={(val) => setTopBarOpacity?.(val / 100)}
            radius={topBarRadius}
            setRadius={setTopBarRadius}
          />
          <BarGeometryControlGroup
            label="하단 배경 바"
            enabled={hasBottomBarBg}
            setEnabled={setHasBottomBarBg}
            bgColor={bottomBarBg}
            setBgColor={setBottomBarBg}
            heightPct={bottomBarHeightPct}
            setHeightPct={setBottomBarHeightPct}
            opacity={bottomBarOpacity !== undefined ? (bottomBarOpacity > 1 ? bottomBarOpacity : bottomBarOpacity * 100) : 100}
            setOpacity={(val) => setBottomBarOpacity?.(val / 100)}
            radius={bottomBarRadius}
            setRadius={setBottomBarRadius}
          />
        </div>
      )}
    </div>
  );
};

export const TitleInspectorForm: React.FC<TitleSourceInspectorFormProps> = (props) => (
  <TitleSourceInspectorForm mode="title" {...props} />
);

export const SourceCreditInspectorForm: React.FC<TitleSourceInspectorFormProps> = (props) => (
  <TitleSourceInspectorForm mode="sourceCredit" {...props} />
);

export const TopBottomBarInspectorForm: React.FC<TitleSourceInspectorFormProps> = (props) => (
  <TitleSourceInspectorForm mode="topBottomBar" {...props} />
);

export default TitleSourceInspectorForm;

