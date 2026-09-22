import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  SlidersHorizontal,
  Check,
  Tv,
  Bookmark,
  ChevronRight,
  Flame,
  Volume2,
  Trash2,
  Music,
  Zap,
  Radio,
  Globe2,
  ChevronDown,
  Type,
  Palette,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MasterPreset } from '@/types/preset';
import { GLOBAL_LANGUAGES, SUBTITLE_STYLES } from '@/types/ddalkkak';
import api from '@/lib/api';

export interface BrandChannelItem {
  id: number;
  channel_id: string;
  title: string;
  thumbnail_url?: string;
  growth_phase?: string;
  autonomy_level?: string;
  assigned_combo_model?: string;
  published_today_count?: number;
  daily_target_count?: number;
}

interface OneTakePresetSidebarProps {
  presets: MasterPreset[];
  activePresetId: string;
  onSelectPreset: (preset: MasterPreset) => void;
  onOpenConfigModal: () => void;
  onSaveAsNewPreset: () => void;
  onDeletePreset?: (presetId: string) => void;
  currentChannelId?: string;
  onChannelChange?: (channelId: string) => void;
  // Subtitle Multi-Language Target Selector
  targetLangs: string[];
  onToggleTargetLang: (code: string) => void;
  // Subtitle Design Template
  selectedSubtitleStyle: string;
  onSelectSubtitleStyle: (styleId: string) => void;
  // Current active params for quick summary
  activeArchetype: string;
  activeTone: string;
  activeVoiceId: string;
  bgmEnabled: boolean;
  bgmAutoSmart: boolean;
  sfxEnabled: boolean;
  sfxUserFirst: boolean;
}

export const OneTakePresetSidebar: React.FC<OneTakePresetSidebarProps> = ({
  presets,
  activePresetId,
  onSelectPreset,
  onOpenConfigModal,
  onSaveAsNewPreset,
  onDeletePreset,
  currentChannelId,
  onChannelChange,
  targetLangs,
  onToggleTargetLang,
  selectedSubtitleStyle,
  onSelectSubtitleStyle,
  activeArchetype,
  activeTone,
  activeVoiceId,
  bgmEnabled,
  bgmAutoSmart,
  sfxEnabled,
  sfxUserFirst,
}) => {
  const [brandChannels, setBrandChannels] = useState<BrandChannelItem[]>([]);
  const [showAllLangs, setShowAllLangs] = useState<boolean>(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);

  // 계정관리에 등록된 실제 브랜드 채널(brand_channels) 실시간 로드
  useEffect(() => {
    const fetchBrandChannels = async () => {
      setIsLoadingChannels(true);
      try {
        const res = await api.get('/brand-channels/');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const list = res.data.map((c: any) => ({
            id: c.id,
            channel_id: c.channel_id,
            title: c.title || `브랜드 채널 #${c.id}`,
            thumbnail_url: c.thumbnail_url,
            growth_phase: c.growth_phase || 'NEW',
            autonomy_level: c.autonomy_level || 'LEVEL_2',
            assigned_combo_model: c.assigned_combo_model || 'viraloop1',
            published_today_count: c.published_today_count || 0,
            daily_target_count: c.daily_target_count || 2,
          }));
          setBrandChannels(list);
          if (!currentChannelId && list[0] && onChannelChange) {
            onChannelChange(list[0].id.toString());
          }
        } else {
          // 등록된 브랜드 채널이 없을 때 기본 인큐베이팅 채널
          setBrandChannels([
            {
              id: 1,
              channel_id: 'UC_DEFAULT_BRAND_312',
              title: '⭐ 브랜드3125 (공식 메인)',
              growth_phase: 'NEW',
              autonomy_level: 'LEVEL_2',
              assigned_combo_model: 'viraloop1',
              published_today_count: 0,
              daily_target_count: 2,
            }
          ]);
        }
      } catch (err) {
        console.warn('[OneTakePresetSidebar] Failed to load brand channels, using fallback:', err);
        setBrandChannels([
          {
            id: 1,
            channel_id: 'UC_DEFAULT_BRAND_312',
            title: '⭐ 브랜드3125 (공식 메인)',
            growth_phase: 'NEW',
            autonomy_level: 'LEVEL_2',
            assigned_combo_model: 'viraloop1',
            published_today_count: 0,
            daily_target_count: 2,
          }
        ]);
      } finally {
        setIsLoadingChannels(false);
      }
    };
    fetchBrandChannels();
  }, []);

  const activeChannel = brandChannels.find(
    ch => ch.id.toString() === currentChannelId || ch.channel_id === currentChannelId
  ) || brandChannels[0];

  return (
    <aside className="w-full h-full shrink-0 flex flex-col bg-card border border-border rounded-2xl p-3 shadow-xs overflow-y-auto custom-scrollbar gap-2.5">
      {/* ─────────────────────────────────────────────────────────────
          1. 계정관리 실체화: 운영 브랜드 채널 바인딩
         ───────────────────────────────────────────────────────────── */}
      <div className="p-2.5 bg-muted/20 border border-border/80 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Tv className="w-3.5 h-3.5 text-primary" />
            <span>운영 브랜드 채널 바인딩</span>
          </span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <ShieldCheck className="w-2.5 h-2.5 mr-0.5 inline" />
            계정관리 SSOT
          </Badge>
        </div>

        <select
          value={activeChannel?.id.toString() || ''}
          onChange={(e) => onChannelChange && onChannelChange(e.target.value)}
          className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {brandChannels.map((ch) => (
            <option key={ch.id} value={ch.id.toString()}>
              {ch.title} ({ch.channel_id.slice(0, 10)}...)
            </option>
          ))}
        </select>

        {activeChannel && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>단계: <strong className="text-foreground">{activeChannel.growth_phase}</strong></span>
            </span>
            <span className="font-mono text-primary font-bold">
              {activeChannel.autonomy_level}
            </span>
            <span className="truncate max-w-[90px] text-[9.5px]">
              {activeChannel.assigned_combo_model?.split('/')[1] || activeChannel.assigned_combo_model}
            </span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 자막 생성기 20개국어 다국어 타겟 선택기 (High CPM 퀵토글)
         ───────────────────────────────────────────────────────────── */}
      <div className="p-2.5 bg-muted/20 border border-border/80 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold flex items-center gap-1.5 text-foreground">
            <Globe2 className="w-3.5 h-3.5 text-primary" />
            <span>타겟 언어 다중 선택 ({targetLangs.length}개)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAllLangs(!showAllLangs)}
            className="text-[10px] text-primary font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            <span>{showAllLangs ? '5대만' : '+15개국'}</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", showAllLangs && "rotate-180")} />
          </button>
        </div>

        {/* 5대 High CPM 핵심 언어 퀵 토글 버튼 */}
        <div className="grid grid-cols-5 gap-1">
          {GLOBAL_LANGUAGES.filter(l => l.tier === 'tier1').map(lang => {
            const isSelected = targetLangs.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => onToggleTargetLang(lang.code)}
                className={cn(
                  "py-1 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all border cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary/40"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={`${lang.name} (${lang.cpmDescription})`}
              >
                <span className="text-xs">{lang.flag}</span>
                <span className="truncate max-w-[42px] uppercase text-[9px]">{lang.code}</span>
              </button>
            );
          })}
        </div>

        {/* 15대 글로벌 확장 언어 접이식 토글 */}
        {showAllLangs && (
          <div className="pt-1.5 border-t border-border/60">
            <div className="text-[9px] font-bold text-muted-foreground mb-1">글로벌 15개국 확장 언어</div>
            <div className="flex flex-wrap gap-1">
              {GLOBAL_LANGUAGES.filter(l => l.tier === 'global').map(lang => {
                const isSelected = targetLangs.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => onToggleTargetLang(lang.code)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-medium flex items-center gap-1 transition-all border cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. 자막 생성기 6대 디자인 스타일 템플릿 연동
         ───────────────────────────────────────────────────────────── */}
      <div className="p-2.5 bg-muted/20 border border-border/80 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold flex items-center gap-1.5 text-foreground">
            <Palette className="w-3.5 h-3.5 text-primary" />
            <span>자막 디자인 스타일 템플릿</span>
          </label>
          <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary font-mono">
            자막공방 도킹
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {SUBTITLE_STYLES.map((st) => {
            const isSelected = selectedSubtitleStyle === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectSubtitleStyle(st.id)}
                className={cn(
                  "p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
                title={st.description}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold truncate">{st.title.split(' ')[1] || st.title}</span>
                  <span className="text-[8px] opacity-80">{st.badge}</span>
                </div>
                <span className="text-[8px] line-clamp-1 opacity-70 mt-0.5">
                  {st.description.split('+')[0] || st.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. 마스터 통합 프리셋 목록 (원클릭 로드)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0.5 pt-1">
        <div className="flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground">마스터 통합 프리셋</h3>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {presets.length}개 세트
        </span>
      </div>

      <div className="space-y-1.5 pr-0.5">
        {presets.map((preset) => {
          const isActive = preset.id === activePresetId;

          return (
            <div
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={cn(
                "p-2 rounded-xl border text-left cursor-pointer transition-all relative group",
                isActive
                  ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/40"
                  : "bg-background border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{preset.icon || '⚡'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        "text-[11.5px] font-bold truncate",
                        isActive ? "text-primary" : "text-foreground"
                      )}>
                        {preset.name}
                      </span>
                      {preset.isCustom && (
                        <Badge variant="secondary" className="text-[8.5px] px-1 py-0 bg-primary/20 text-primary border-none">
                          MY
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                </div>

                {isActive ? (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                ) : (
                  preset.isCustom && onDeletePreset && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePreset(preset.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                      title="프리셋 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )
                )}
              </div>

              {/* 하위 주요 속성 요약 태그 배지 */}
              <div className="flex items-center gap-1 mt-1.5 text-[9px] flex-wrap">
                <span className="px-1.5 py-0.2 rounded bg-muted font-medium text-foreground uppercase">
                  {preset.archetype}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-muted font-medium text-foreground">
                  {preset.ttsConfig.voice_id}
                </span>
                {preset.bgmEnabled && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                    BGM
                  </span>
                )}
                {preset.sfxEnabled && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    SFX
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. 하단 액션 버튼 & 통합 설정 창
         ───────────────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-border/80 space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveAsNewPreset}
            className="h-7 text-[11px] font-semibold border-border bg-background hover:bg-muted text-foreground gap-1 rounded-lg cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>MY 프리셋</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onOpenConfigModal}
            className="h-7 text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1 rounded-lg shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>세부 설정</span>
          </Button>
        </div>

        {/* 활성 세팅 실시간 칩 요약 */}
        <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-[10px] space-y-0.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>활성 폼팩터</span>
            <strong className="text-foreground capitalize">{activeArchetype}</strong>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>BGM / SFX</span>
            <span className="font-semibold text-foreground">
              {bgmEnabled ? (bgmAutoSmart ? "BGM(자동)" : "BGM(수동)") : "BGM(OFF)"} / {sfxEnabled ? (sfxUserFirst ? "SFX(보유우선)" : "SFX(자동)") : "SFX(OFF)"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default OneTakePresetSidebar;
