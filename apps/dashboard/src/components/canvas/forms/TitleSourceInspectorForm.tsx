import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { BarGeometryControlGroup } from './shared';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';

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
            <span className="text-[9px] text-muted-foreground">좌측 정렬</span>
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

            {/* 폰트 & 굵기 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground block mb-1">폰트 서체</span>
                <select
                  value={titleFontFamily || 'Pretendard'}
                  onChange={(e) => setTitleFontFamily?.(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] bg-background border border-border rounded-[2px] font-semibold cursor-pointer"
                >
                  <option value="Pretendard">Pretendard (산세리프 깔끔형)</option>
                  <option value="GmarketSansBold">Gmarket Sans (볼드 임팩트)</option>
                  <option value="Black Han Sans">Black Han Sans (울트라 헤비)</option>
                  <option value="Noto Sans KR">Noto Sans KR (본고딕 표준)</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-semibold text-muted-foreground">볼드 (굵게)</span>
                <Switch
                  checked={titleBold !== false}
                  onCheckedChange={(val) => setTitleBold?.(val)}
                />
              </div>
            </div>

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
            {/* 1단 문구 및 색상 */}
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
            </div>

            {/* 2단 문구 및 색상 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">2단 타이틀 문구 (아래 포인트)</label>
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
            </div>

            {/* 글자 크기 및 폰트 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <UnitSliderControl
                label="대제목 글자 크기"
                value={gunlimboConfig?.titleFontSize || titleLine1SizePx || 34}
                min={20}
                max={50}
                step={1}
                unit="px"
                onChange={(val) => {
                  setTitleLine1SizePx?.(val);
                  setGunlimboConfig?.((prev: any) => ({ ...prev, titleFontSize: val }));
                }}
              />
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground block mb-1">폰트 서체</span>
                <select
                  value={titleFontFamily || 'Pretendard'}
                  onChange={(e) => setTitleFontFamily?.(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] bg-background border border-border rounded-[2px] font-semibold cursor-pointer"
                >
                  <option value="Pretendard">Pretendard (산세리프)</option>
                  <option value="GmarketSansBold">Gmarket Sans (볼드)</option>
                  <option value="Black Han Sans">Black Han Sans (울트라)</option>
                  <option value="Noto Sans KR">Noto Sans KR</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-semibold text-muted-foreground">영상 전체에서 계속 표시</span>
                <Switch
                  checked={gunlimboConfig?.keepTitleThroughout ?? true}
                  onCheckedChange={(val) => setGunlimboConfig?.((prev: any) => ({ ...prev, keepTitleThroughout: val }))}
                />
              </div>
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
                      value={titleBadgeText}
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
                      value={titleLine1}
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
                        value={titleLine2}
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
                  </div>
                )}
              </div>
            )}

            {/* 5. 글꼴 및 서체 스타일 / 정렬 */}
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">글꼴 (Font)</span>
                <select
                  value={titleFontFamily}
                  onChange={(e) => setTitleFontFamily(e.target.value)}
                  className="h-6 px-1.5 text-[10.5px] bg-background border border-border rounded text-foreground font-medium"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                <span className="text-[10.5px] text-muted-foreground font-medium">스타일 및 정렬</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTitleBold(!titleBold)}
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
                    onClick={() => setTitleItalic(!titleItalic)}
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
                      onClick={() => setTitleAlign(align)}
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
                  value={bottomSourceText}
                  onChange={(e) => setBottomSourceText(e.target.value)}
                  placeholder="출처: 공식 유튜브 영상"
                  className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-medium"
                />
              </div>

              {/* 2. 글꼴 및 서체 스타일 (Bold, Italic) */}
              <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">글꼴 (Font)</label>
                  <select
                    value={bottomSourceFontFamily || 'Pretendard'}
                    onChange={(e) => setBottomSourceFontFamily?.(e.target.value)}
                    className="w-full h-7 px-2 text-xs bg-background border border-border rounded-[2px] text-foreground"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant={bottomSourceBold ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2.5 text-xs gap-1 cursor-pointer"
                    onClick={() => setBottomSourceBold?.(!bottomSourceBold)}
                  >
                    <Bold className="w-3 h-3" />
                    <span className="text-[10px] font-bold">굵게</span>
                  </Button>
                  <Button
                    type="button"
                    variant={bottomSourceItalic ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2.5 text-xs gap-1 cursor-pointer"
                    onClick={() => setBottomSourceItalic?.(!bottomSourceItalic)}
                  >
                    <Italic className="w-3 h-3" />
                    <span className="text-[10px] font-bold">기울임</span>
                  </Button>
                </div>
              </div>

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

