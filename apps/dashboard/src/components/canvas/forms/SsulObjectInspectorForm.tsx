import React from 'react';
import { Layout, Sparkles, Info, Minus, Bold, Italic, User, Clock, Eye, Dices } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { FontStyleAlignControl } from '../controls/FontStyleAlignControl';
import { BarGeometryControlGroup } from './shared';
import { getRandomSatiricalMetadata } from '../constants/canvasConstants';

export interface SsulObjectInspectorFormProps {
  mode: 'ssulHeader' | 'metadata' | 'divider';
  ssulConfig: any;
  setSsulConfig: React.Dispatch<React.SetStateAction<any>>;
}

export const SsulObjectInspectorForm: React.FC<SsulObjectInspectorFormProps> = ({
  mode,
  ssulConfig,
  setSsulConfig,
}) => {
  const { toast } = useToast();

  // 1. 📜 썰형 상단 헤더 바 설정
  if (mode === 'ssulHeader') {
    const header = {
      enabled: ssulConfig?.ssulHeader?.enabled ?? true,
      bgColor: ssulConfig?.ssulHeader?.bgColor || '#F7CF46',
      heightMultiplier: ssulConfig?.ssulHeader?.heightMultiplier ?? 1.0,
      text: ssulConfig?.ssulHeader?.text || '실시간 베스트',
      textColor: ssulConfig?.ssulHeader?.textColor || '#18181B',
      font: ssulConfig?.ssulHeader?.font || 'Pretendard',
      fontSizeMultiplier: ssulConfig?.ssulHeader?.fontSizeMultiplier ?? 1.0,
      bold: ssulConfig?.ssulHeader?.bold ?? true,
      italic: ssulConfig?.ssulHeader?.italic ?? false,
      align: ssulConfig?.ssulHeader?.align || 'center',
      logoUrl: ssulConfig?.ssulHeader?.logoUrl,
      leftIcon: ssulConfig?.ssulHeader?.leftIcon || 'arrow_back',
      rightIcon: ssulConfig?.ssulHeader?.rightIcon || 'menu',
      strokeEnabled: ssulConfig?.ssulHeader?.strokeEnabled ?? false,
      strokeWidth: ssulConfig?.ssulHeader?.strokeWidth ?? 2,
      strokeColor: ssulConfig?.ssulHeader?.strokeColor || '#000000',
      shadowEnabled: ssulConfig?.ssulHeader?.shadowEnabled ?? false,
      shadowBlur: ssulConfig?.ssulHeader?.shadowBlur ?? 4,
      shadowColor: ssulConfig?.ssulHeader?.shadowColor || 'rgba(0,0,0,0.5)',
      borderRadius: ssulConfig?.ssulHeader?.borderRadius ?? 0,
      letterSpacing: ssulConfig?.ssulHeader?.letterSpacing ?? 0,
      lineHeight: ssulConfig?.ssulHeader?.lineHeight ?? 1.2,
    };

    const updateHeader = (patch: Partial<typeof header>) => {
      setSsulConfig((prev: any) => ({
        ...prev,
        ssulHeader: {
          ...(prev?.ssulHeader || header),
          ...patch,
        },
      }));
    };

    return (
      <div className="space-y-3">
        <div className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-amber-500" />
              커뮤니티 헤더 바 설정
            </span>
            <Switch
              checked={header.enabled}
              onCheckedChange={(c) => updateHeader({ enabled: c })}
            />
          </div>

          {header.enabled && (
            <div className="space-y-2 pt-1">
              {/* 채널명/게시판명 텍스트 */}
              <div>
                <span className="text-[9.5px] font-semibold text-muted-foreground block mb-0.5">헤더 타이틀 텍스트</span>
                <input
                  type="text"
                  value={header.text}
                  onChange={(e) => updateHeader({ text: e.target.value })}
                  placeholder="실시간 베스트"
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px] focus:outline-hidden focus:ring-1 focus:ring-primary font-bold"
                />
              </div>

              {/* 헤더 배경색 */}
              <ColorPicker8Preset
                label="헤더 배경색"
                value={header.bgColor}
                onChange={(val) => updateHeader({ bgColor: val })}
              />

              {/* 글자 색상 */}
              <ColorPicker8Preset
                label="글자 색상"
                value={header.textColor}
                onChange={(val) => updateHeader({ textColor: val })}
              />

              {/* 헤더 글꼴 및 서체 스타일 / 정렬 */}
              <FontStyleAlignControl
                label="헤더 글꼴 (Font)"
                font={header.font}
                setFont={(f) => updateHeader({ font: f })}
                bold={header.bold}
                setBold={(b) => updateHeader({ bold: b })}
                italic={header.italic}
                setItalic={(i) => updateHeader({ italic: i })}
                align={header.align || 'center'}
                setAlign={(a) => updateHeader({ align: a })}
                letterSpacing={header.letterSpacing}
                setLetterSpacing={(ls) => updateHeader({ letterSpacing: ls })}
                lineHeight={header.lineHeight}
                setLineHeight={(lh) => updateHeader({ lineHeight: lh })}
              />

              {/* 글자 테두리 (외곽선) */}
              <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">글자 테두리 (외곽선)</span>
                  <Switch
                    checked={!!header.strokeEnabled}
                    onCheckedChange={(c) => updateHeader({ strokeEnabled: c })}
                  />
                </div>
                {header.strokeEnabled && (
                  <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
                    <UnitSliderControl
                      label="외곽선 두께"
                      value={header.strokeWidth ?? 2}
                      min={1}
                      max={6}
                      step={1}
                      unit="px"
                      onChange={(v) => updateHeader({ strokeWidth: v })}
                    />
                    <ColorPicker8Preset
                      label="외곽선 색상"
                      value={header.strokeColor || '#000000'}
                      onChange={(c) => updateHeader({ strokeColor: c })}
                    />
                  </div>
                )}
              </div>

              {/* 글자 입체 그림자 */}
              <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">글자 입체 그림자</span>
                  <Switch
                    checked={!!header.shadowEnabled}
                    onCheckedChange={(c) => updateHeader({ shadowEnabled: c })}
                  />
                </div>
                {header.shadowEnabled && (
                  <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
                    <UnitSliderControl
                      label="그림자 흐림"
                      value={header.shadowBlur ?? 4}
                      min={0}
                      max={16}
                      step={1}
                      unit="px"
                      onChange={(v) => updateHeader({ shadowBlur: v })}
                    />
                    <ColorPicker8Preset
                      label="그림자 색상"
                      value={header.shadowColor || 'rgba(0,0,0,0.5)'}
                      onChange={(c) => updateHeader({ shadowColor: c })}
                    />
                  </div>
                )}
              </div>

              {/* 헤더 모서리 둥글기 */}
              <UnitSliderControl
                label="헤더 모서리 둥글기"
                value={header.borderRadius ?? 0}
                min={0}
                max={24}
                step={2}
                unit="px"
                onChange={(val) => updateHeader({ borderRadius: val })}
              />

              {/* 좌측 아이콘 선택 */}
              <div>
                <span className="text-[9.5px] font-semibold text-muted-foreground block mb-0.5">좌측 아이콘</span>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'arrow_back', label: '뒤로가기' },
                    { id: 'home', label: '홈' },
                    { id: 'close', label: '닫기' },
                    { id: 'none', label: '없음' },
                  ].map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => updateHeader({ leftIcon: ic.id as any })}
                      className={`py-1 text-[10px] rounded border transition-colors ${
                        header.leftIcon === ic.id
                          ? 'bg-primary text-primary-foreground border-primary font-bold'
                          : 'bg-background border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {ic.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 헤더 높이 배율 */}
              <UnitSliderControl
                label="헤더 높이 배율"
                value={Math.round(header.heightMultiplier * 100)}
                min={70}
                max={150}
                step={5}
                unit="%"
                onChange={(val) => updateHeader({ heightMultiplier: val / 100 })}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. 🏷️ 메타데이터 설정 (작성자, 시간, 조회수)
  if (mode === 'metadata') {
    const meta = {
      showAuthor: ssulConfig?.metadata?.showAuthor ?? true,
      authorText: ssulConfig?.metadata?.authorText || ssulConfig?.author || '익명 직장인',
      showTime: ssulConfig?.metadata?.showTime ?? true,
      timeText: ssulConfig?.metadata?.timeText || ssulConfig?.timeText || '10분 전',
      showViews: ssulConfig?.metadata?.showViews ?? true,
      viewsText: ssulConfig?.metadata?.viewsText || ssulConfig?.viewsText || '조회 2.4만',
      separator: ssulConfig?.metadata?.separator || 'dot',
      color: ssulConfig?.metadata?.color || '#71717A',
      font: ssulConfig?.metadata?.font || 'Pretendard',
      bold: ssulConfig?.metadata?.bold ?? false,
      italic: ssulConfig?.metadata?.italic ?? false,
      strokeEnabled: ssulConfig?.metadata?.strokeEnabled ?? false,
      strokeWidth: ssulConfig?.metadata?.strokeWidth ?? 1,
      strokeColor: ssulConfig?.metadata?.strokeColor || '#000000',
      shadowEnabled: ssulConfig?.metadata?.shadowEnabled ?? false,
      shadowBlur: ssulConfig?.metadata?.shadowBlur ?? 3,
      shadowColor: ssulConfig?.metadata?.shadowColor || 'rgba(0,0,0,0.5)',
      letterSpacing: ssulConfig?.metadata?.letterSpacing ?? 0,
      lineHeight: ssulConfig?.metadata?.lineHeight ?? 1.2,
    };

    const updateMeta = (patch: Partial<typeof meta>) => {
      setSsulConfig((prev: any) => ({
        ...prev,
        author: patch.authorText !== undefined ? patch.authorText : prev.author,
        timeText: patch.timeText !== undefined ? patch.timeText : prev.timeText,
        viewsText: patch.viewsText !== undefined ? patch.viewsText : prev.viewsText,
        metadata: {
          ...(prev?.metadata || meta),
          ...patch,
        },
      }));
    };

    const handleRandomSatirical = () => {
      const rand = getRandomSatiricalMetadata();
      updateMeta({
        authorText: rand.author,
        timeText: rand.timeText,
        viewsText: rand.viewsText,
      });
      toast({
        title: '풍자 메타데이터 주입 완료',
        description: `${rand.author} · ${rand.timeText} · ${rand.viewsText}`,
      });
    };

    return (
      <div className="space-y-3">
        <div className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-500" />
              게시글 메타데이터 설정
            </span>
            <button
              type="button"
              onClick={handleRandomSatirical}
              className="px-1.5 py-0.5 text-[9.5px] font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              🎲 풍자 랜덤
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {/* 작성자 */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9.5px] font-semibold text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" /> 작성자 닉네임
                </span>
                <Switch
                  checked={meta.showAuthor}
                  onCheckedChange={(c) => updateMeta({ showAuthor: c })}
                />
              </div>
              {meta.showAuthor && (
                <input
                  type="text"
                  value={meta.authorText}
                  onChange={(e) => updateMeta({ authorText: e.target.value })}
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px]"
                />
              )}
            </div>

            {/* 작성 시간 */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9.5px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 작성 시간
                </span>
                <Switch
                  checked={meta.showTime}
                  onCheckedChange={(c) => updateMeta({ showTime: c })}
                />
              </div>
              {meta.showTime && (
                <input
                  type="text"
                  value={meta.timeText}
                  onChange={(e) => updateMeta({ timeText: e.target.value })}
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px]"
                />
              )}
            </div>

            {/* 조회수 */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9.5px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" /> 조회수 텍스트
                </span>
                <Switch
                  checked={meta.showViews}
                  onCheckedChange={(c) => updateMeta({ showViews: c })}
                />
              </div>
              {meta.showViews && (
                <input
                  type="text"
                  value={meta.viewsText}
                  onChange={(e) => updateMeta({ viewsText: e.target.value })}
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px]"
                />
              )}
            </div>

            {/* 글자 색상 */}
            <ColorPicker8Preset
              label="메타데이터 색상"
              value={meta.color}
              onChange={(val) => updateMeta({ color: val })}
            />

            {/* 메타데이터 글꼴 및 서체 스타일 */}
            <FontStyleAlignControl
              label="메타데이터 글꼴 (Font)"
              font={meta.font}
              setFont={(f) => updateMeta({ font: f })}
              bold={meta.bold}
              setBold={(b) => updateMeta({ bold: b })}
              italic={meta.italic}
              setItalic={(i) => updateMeta({ italic: i })}
              letterSpacing={meta.letterSpacing}
              setLetterSpacing={(ls) => updateMeta({ letterSpacing: ls })}
              lineHeight={meta.lineHeight}
              setLineHeight={(lh) => updateMeta({ lineHeight: lh })}
            />

            {/* 글자 테두리 (외곽선) */}
            <div className="space-y-1.5 pt-1.5 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground">글자 테두리 (외곽선)</span>
                <Switch
                  checked={!!meta.strokeEnabled}
                  onCheckedChange={(c) => updateMeta({ strokeEnabled: c })}
                />
              </div>
              {meta.strokeEnabled && (
                <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
                  <UnitSliderControl
                    label="외곽선 두께"
                    value={meta.strokeWidth ?? 1}
                    min={1}
                    max={6}
                    step={1}
                    unit="px"
                    onChange={(v) => updateMeta({ strokeWidth: v })}
                  />
                  <ColorPicker8Preset
                    label="외곽선 색상"
                    value={meta.strokeColor || '#000000'}
                    onChange={(c) => updateMeta({ strokeColor: c })}
                  />
                </div>
              )}
            </div>

            {/* 글자 입체 그림자 */}
            <div className="space-y-1.5 pt-1.5 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground">글자 입체 그림자</span>
                <Switch
                  checked={!!meta.shadowEnabled}
                  onCheckedChange={(c) => updateMeta({ shadowEnabled: c })}
                />
              </div>
              {meta.shadowEnabled && (
                <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
                  <UnitSliderControl
                    label="그림자 흐림"
                    value={meta.shadowBlur ?? 3}
                    min={0}
                    max={16}
                    step={1}
                    unit="px"
                    onChange={(v) => updateMeta({ shadowBlur: v })}
                  />
                  <ColorPicker8Preset
                    label="그림자 색상"
                    value={meta.shadowColor || 'rgba(0,0,0,0.5)'}
                    onChange={(c) => updateMeta({ shadowColor: c })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. ➖ 구분선 설정 (Divider)
  if (mode === 'divider') {
    const divider = {
      enabled: ssulConfig?.divider?.enabled ?? true,
      style: ssulConfig?.divider?.style || 'solid',
      thickness: ssulConfig?.divider?.thickness ?? 1,
      widthPercent: ssulConfig?.divider?.widthPercent ?? 100,
      color: ssulConfig?.divider?.color || '#E4E4E7',
      opacity: ssulConfig?.divider?.opacity ?? 100,
    };

    const updateDivider = (patch: Partial<typeof divider>) => {
      setSsulConfig((prev: any) => ({
        ...prev,
        divider: {
          ...(prev?.divider || divider),
          ...patch,
        },
      }));
    };

    return (
      <div className="space-y-3">
        <div className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5 text-slate-400" />
              구분선 (Divider) 설정
            </span>
            <Switch
              checked={divider.enabled}
              onCheckedChange={(c) => updateDivider({ enabled: c })}
            />
          </div>

          {divider.enabled && (
            <div className="space-y-2.5 pt-1">
              {/* 선 두께 */}
              <UnitSliderControl
                label="구분선 두께"
                value={divider.thickness}
                min={1}
                max={6}
                step={1}
                unit="px"
                onChange={(val) => updateDivider({ thickness: val })}
              />

              {/* 선 스타일 (solid / dashed / dotted) */}
              <div>
                <span className="text-[9.5px] font-semibold text-muted-foreground block mb-0.5">선 모양</span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'solid', label: '실선' },
                    { id: 'dashed', label: '파선' },
                    { id: 'dotted', label: '점선' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => updateDivider({ style: st.id as any })}
                      className={`py-1 text-[10px] rounded border transition-colors ${
                        divider.style === st.id
                          ? 'bg-primary text-primary-foreground border-primary font-bold'
                          : 'bg-background border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 선 색상 */}
              <ColorPicker8Preset
                label="구분선 색상"
                value={divider.color}
                onChange={(val) => updateDivider({ color: val })}
              />

              {/* 너비 비율 */}
              <UnitSliderControl
                label="구분선 너비"
                value={divider.widthPercent}
                min={20}
                max={100}
                step={5}
                unit="%"
                onChange={(val) => updateDivider({ widthPercent: val })}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default SsulObjectInspectorForm;
