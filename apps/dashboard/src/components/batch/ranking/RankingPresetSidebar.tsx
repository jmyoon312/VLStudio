import React from 'react';
import {
  Award,
  Volume2,
  Sliders,
  Sparkles,
  Layers,
  Palette,
  RotateCcw,
  Music,
  Check,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  RankingTemplateId,
  RankingOptions,
  RANKING_TEMPLATES,
  RANKING_SOUND_STYLES,
  HeaderBarShape,
  RankDisplayMode,
  RankOrder,
  TransitionSoundStyle
} from '@/types/ranking';
import { playSfxWebAudio } from '@/config/sfxCatalog';

interface RankingPresetSidebarProps {
  options: RankingOptions;
  onChangeOptions: (opts: RankingOptions | ((prev: RankingOptions) => RankingOptions)) => void;
}

export const RankingPresetSidebar: React.FC<RankingPresetSidebarProps> = ({
  options,
  onChangeOptions
}) => {
  const currentTemplate = RANKING_TEMPLATES[options.templateId] || RANKING_TEMPLATES['failsup-ranking'];

  // 템플릿 변경 핸들러
  const handleSelectTemplate = (tplId: RankingTemplateId) => {
    const tpl = RANKING_TEMPLATES[tplId];
    if (!tpl) return;

    onChangeOptions(prev => ({
      ...prev,
      templateId: tpl.id,
      shape: tpl.shape,
      headerBackgroundColor: tpl.palette.headerBackground,
      headlineColor: tpl.palette.headline,
      subtitleColor: tpl.palette.subtitle,
      accentColor: tpl.palette.accent,
      strokeColor: tpl.palette.stroke,
      rankDisplayMode: tpl.rankDisplayMode,
      transitionSoundStyle: tpl.defaultSoundStyle,
      transitionSoundVolume: tpl.defaultSoundVolume,
      transitionSoundOffsetMs: tpl.defaultSoundOffsetMs,
      transitionBlackoutMs: tpl.defaultBlackoutMs
    }));
  };

  // 사운드 미리듣기
  const handlePreviewSound = () => {
    if (options.transitionSoundStyle === 'click') {
      playSfxWebAudio('sfx_pixeling_type');
    } else if (options.transitionSoundStyle === 'whoosh') {
      playSfxWebAudio('sfx_cinematic_boom');
    } else {
      // impact
      playSfxWebAudio('sfx_punch_hit');
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. 9대 공식 랭킹 템플릿 프리셋 */}
      <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
            <Palette className="w-3.5 h-3.5 text-primary" />
            9대 공식 랭킹 템플릿
          </span>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary">
            {currentTemplate.category}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-1.5 max-h-[170px] overflow-y-auto custom-scrollbar pr-1">
          {Object.values(RANKING_TEMPLATES).map(tpl => {
            const isSelected = options.templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl.id)}
                className={cn(
                  "p-2 rounded-lg border text-left transition flex flex-col justify-between h-[68px] cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-2xs"
                    : "border-border hover:bg-muted/40 bg-background"
                )}
              >
                <div className="font-bold text-[11px] truncate text-foreground">{tpl.name.split(' ')[0]}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: tpl.palette.headerBackground }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: tpl.palette.headline }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: tpl.palette.accent }}
                  />
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
          {currentTemplate.description}
        </p>
      </div>

      {/* 2. 상단 헤더바(배경 띠) 커스터마이징 */}
      <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-primary" />
            상단 배경 띠(Header Ribbon) 연출
          </span>
        </div>

        {/* 띠 형태 모양 */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">배경 띠 형태</label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: 'pill', label: '알약형' },
              { id: 'rounded', label: '둥근형' },
              { id: 'rect', label: '직각' },
              { id: 'ellipse', label: '타원형' },
            ].map(shape => (
              <button
                key={shape.id}
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, shape: shape.id as HeaderBarShape }))}
                className={cn(
                  "py-1.5 rounded-md border text-center text-[10.5px] font-semibold transition cursor-pointer",
                  options.shape === shape.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background text-foreground hover:bg-muted/40"
                )}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </div>

        {/* 순위 카운트다운 정렬 및 표시 모드 */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">카운트다운 순서</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, order: 'reverse' }))}
                className={cn(
                  "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                  options.order === 'reverse'
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40"
                    : "border-border text-muted-foreground"
                )}
              >
                5위 ➔ 1위
              </button>
              <button
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, order: 'input' }))}
                className={cn(
                  "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                  options.order === 'input'
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "border-border text-muted-foreground"
                )}
              >
                1위 ➔ 5위
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">순위 표시 모드</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, rankDisplayMode: 'cumulative' }))}
                className={cn(
                  "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                  options.rankDisplayMode === 'cumulative'
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                누적형
              </button>
              <button
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, rankDisplayMode: 'current' }))}
                className={cn(
                  "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                  options.rankDisplayMode === 'current'
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                단독강조
              </button>
            </div>
          </div>
        </div>

        {/* 픽셀링 원천: 비디오 맞춤(videoFit) & 클립 길이(clipDurationPreset) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">화면 맞춤 방식</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, videoFit: 'contain' }))}
                className={cn(
                  "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                  options.videoFit === 'contain'
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "border-border text-muted-foreground"
                )}
              >
                비율유지(블러)
              </button>
              <button
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, videoFit: 'cover' }))}
                className={cn(
                  "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                  options.videoFit === 'cover'
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "border-border text-muted-foreground"
                )}
              >
                꽉채움(크롭)
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">클립 재생 길이</label>
            <div className="flex gap-1">
              {[
                { id: 'short', label: '3초' },
                { id: 'medium', label: '4.5초' },
                { id: 'full', label: '6초' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onChangeOptions(prev => ({ ...prev, clipDurationPreset: d.id as any }))}
                  className={cn(
                    "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                    options.clipDurationPreset === d.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 픽셀링 원천: 폰트 패밀리(fontFamily) & 라벨 스타일(rankLabelStyle) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">자막 폰트</label>
            <select
              value={options.fontFamily}
              onChange={e => onChangeOptions(prev => ({ ...prev, fontFamily: e.target.value as any }))}
              className="w-full text-[10.5px] font-bold p-1 rounded border border-border bg-background text-foreground"
            >
              <option value="pretendard">프리텐다드 (기본)</option>
              <option value="do-hyeon">배민 도현체</option>
              <option value="black-han-sans">검은고딕</option>
              <option value="noto-sans-kr">본고딕</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">순위 표기 형태</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, rankLabelStyle: 'numbered' }))}
                className={cn(
                  "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                  options.rankLabelStyle === 'numbered'
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "border-border text-muted-foreground"
                )}
              >
                번호+제목
              </button>
              <button
                type="button"
                onClick={() => onChangeOptions(prev => ({ ...prev, rankLabelStyle: 'title-only' }))}
                className={cn(
                  "flex-1 py-1 rounded text-[10.5px] font-bold border transition cursor-pointer",
                  options.rankLabelStyle === 'title-only'
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "border-border text-muted-foreground"
                )}
              >
                제목 단독
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 사운드 연출 & 전환 암전 시퀀서 */}
      <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            사운드 & 전환 암전 시퀀서
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="transitionSound"
              checked={options.transitionSound}
              onChange={e => onChangeOptions(prev => ({ ...prev, transitionSound: e.target.checked }))}
              className="w-3.5 h-3.5 accent-primary cursor-pointer"
            />
            <label htmlFor="transitionSound" className="text-[11px] font-bold text-foreground cursor-pointer">
              효과음 켜기
            </label>
          </div>
        </div>

        {/* 3대 효과음 스타일 선택 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-muted-foreground">순위 전환 효과음 종류</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviewSound}
              disabled={!options.transitionSound}
              className="h-6 px-2 text-[10px] gap-1 font-bold cursor-pointer"
            >
              <Play className="w-2.5 h-2.5" />
              듣기
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {RANKING_SOUND_STYLES.map(s => (
              <button
                key={s.id}
                type="button"
                disabled={!options.transitionSound}
                onClick={() => onChangeOptions(prev => ({
                  ...prev,
                  transitionSoundStyle: s.id,
                  transitionSoundOffsetMs: s.defaultOffsetMs
                }))}
                className={cn(
                  "p-1.5 rounded-lg border text-center transition font-semibold text-[10.5px] cursor-pointer",
                  options.transitionSoundStyle === s.id
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400"
                    : "border-border bg-background text-foreground hover:bg-muted/40",
                  !options.transitionSound && "opacity-50 cursor-not-allowed"
                )}
              >
                <div>{s.label.split(' ')[0]} {s.id}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 효과음 볼륨 슬라이더 */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10.5px]">
            <span className="text-muted-foreground font-medium">효과음 볼륨</span>
            <span className="font-bold text-primary tabular-nums">{options.transitionSoundVolume}%</span>
          </div>
          <Slider
            value={[options.transitionSoundVolume]}
            min={0}
            max={100}
            step={2}
            disabled={!options.transitionSound}
            onValueChange={([val]) => onChangeOptions(prev => ({ ...prev, transitionSoundVolume: val }))}
          />
        </div>

        {/* 검은 화면 암전 넣기 (transitionBlackoutMs) */}
        <div className="space-y-1 pt-1 border-t border-border">
          <div className="flex justify-between text-[10.5px]">
            <span className="text-muted-foreground font-medium">순위 전환 암전(검은 화면)</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {options.transitionBlackoutMs === 0 ? '끔' : `${(options.transitionBlackoutMs / 1000).toFixed(1)}초`}
            </span>
          </div>
          <Slider
            value={[options.transitionBlackoutMs]}
            min={0}
            max={600}
            step={50}
            onValueChange={([val]) => onChangeOptions(prev => ({ ...prev, transitionBlackoutMs: val }))}
          />
          <p className="text-[10px] text-muted-foreground">
            {options.transitionBlackoutMs === 0
              ? '순위가 바뀌는 순간 끊김 없이 즉시 전환됩니다.'
              : '순위마다 화면이 잠깐 암전되며 효과음이 강조됩니다.'}
          </p>
        </div>
      </div>
    </div>
  );
};
