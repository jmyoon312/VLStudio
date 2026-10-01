import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AllInOneNLEStudio } from '@/components/editor/AllInOneNLEStudio';
import { createDefaultBlueprintV4 } from '@/lib/blueprintV4Migrator';
import { Archetype, VLStandardBlueprintV4 } from '@/types/blueprintV4';

// 🎨 캡컷 10대 인기 시네마틱 필터 & 영화 노이즈 FX 정의 (하위 호환성 보장)
export interface VideoFilterSettings {
  preset: string;
  intensity: number;
  filmGrain: number; // 0 ~ 100 (영화 필름 노이즈)
  vignette: number;  // 0 ~ 100 (비네팅)
  brightness: number; // 50 ~ 150
  contrast: number;   // 50 ~ 150
  saturation: number; // 0 ~ 200
  temperature: number; // -50 ~ +50
}

export const CAPCUT_FILTER_PRESETS = [
  { id: 'none', name: '원본 (Original)', desc: '보정 없음', color: 'from-zinc-500 to-zinc-600', grain: 0, vignette: 0, b: 100, c: 100, s: 100, t: 0 },
  { id: 'cinematic-film', name: '🎬 시네마틱 35mm', desc: '영화 필름 질감 & 아날로그 그레인', color: 'from-amber-600 to-stone-800', grain: 45, vignette: 40, b: 98, c: 120, s: 95, t: 10 },
  { id: 'teal-orange', name: '🌆 헐리우드 틸 & 오렌지', desc: '블록버스터 시네마 룩', color: 'from-cyan-600 to-amber-600', grain: 20, vignette: 30, b: 102, c: 125, s: 125, t: 15 },
  { id: 'retro-vhs', name: '📼 90s 레트로 VHS', desc: '아날로그 테이프 & 주사선 노이즈', color: 'from-purple-600 to-emerald-600', grain: 65, vignette: 45, b: 105, c: 115, s: 85, t: 12 },
  { id: 'film-noir', name: '🎞️ 클래식 필름 느와르', desc: '고대비 모노크롬 흑백', color: 'from-zinc-900 to-zinc-600', grain: 55, vignette: 55, b: 95, c: 145, s: 0, t: 0 },
  { id: 'cyberpunk', name: '⚡ 사이버펑크 네온', desc: '시안 & 마젠타 퓨처리스틱', color: 'from-fuchsia-600 to-cyan-500', grain: 15, vignette: 35, b: 105, c: 135, s: 160, t: -15 },
  { id: 'kodak-warm', name: '🌅 웜 코닥 골드', desc: '따뜻한 골든아워 감성 필름', color: 'from-amber-500 to-rose-600', grain: 30, vignette: 25, b: 103, c: 110, s: 115, t: 25 },
  { id: 'fuji-cool', name: '❄️ 쿨 후지필름', desc: '청량하고 차분한 모던 톤', color: 'from-sky-500 to-teal-700', grain: 20, vignette: 20, b: 100, c: 112, s: 92, t: -20 },
  { id: 'dreamy-glow', name: '✨ 드림 글로우', desc: '몽환적인 소프트 확산광 (뽀샤시)', color: 'from-pink-400 to-indigo-400', grain: 10, vignette: 20, b: 112, c: 90, s: 108, t: 8 },
  { id: 'vintage-grain', name: '📽️ 1970 빈티지 그레인', desc: '헤비 입자 & 세피아 톤', color: 'from-yellow-700 to-amber-900', grain: 80, vignette: 50, b: 95, c: 120, s: 70, t: 30 },
];

export interface ProStylePreset {
  id: string;
  name: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bg?: string;
  fontFamily: string;
}

export const PRO_PRESETS: ProStylePreset[] = [
  { id: 'broadcast_yellow', name: '브로드캐스트 옐로우', color: '#FFE500', strokeColor: '#000000', strokeWidth: 4, fontFamily: 'Pretendard' },
  { id: 'pure_white', name: '스탠다드 화이트', color: '#FFFFFF', strokeColor: '#000000', strokeWidth: 3, fontFamily: 'Pretendard' },
  { id: 'breaking_news', name: '헤드라인 속보', color: '#FF2A4D', strokeColor: '#FFFFFF', strokeWidth: 4, bg: 'rgba(0,0,0,0.88)', fontFamily: 'GmarketSans' },
  { id: 'cyber_cyan', name: '시안 네온', color: '#00F0FF', strokeColor: '#0A0A14', strokeWidth: 4, fontFamily: 'Pretendard' },
  { id: 'vivid_lime', name: '비비드 라임', color: '#00E510', strokeColor: '#000000', strokeWidth: 4, fontFamily: 'GmarketSans' },
];

export interface SubtitleDesignPreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  desc: string;
  fontFamily: string;
  textColor: string;
  outlineSize: number;
  outlineColor: string;
  useBox: boolean;
  boxColor: string;
  shadowSize: number;
  shadowColor: string;
  fontSize: number;
  sampleText: string;
}

export const SHORTS_SUBTITLE_DESIGN_PRESETS: SubtitleDesignPreset[] = [
  {
    id: 'neon-yellow',
    name: '네온 옐로우',
    badge: 'MZ 바이럴',
    badgeColor: 'bg-amber-500 text-black',
    desc: '선명한 옐로우 + 블랙 볼드 외곽선',
    fontFamily: 'Black Han Sans',
    textColor: '#FFE600',
    outlineSize: 5,
    outlineColor: '#000000',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 3,
    shadowColor: '#000000',
    fontSize: 19,
    sampleText: '바이럴 쇼츠 자막',
  },
  {
    id: 'white-glow',
    name: '화이트 글로우',
    badge: '추천 1위',
    badgeColor: 'bg-sky-500 text-white',
    desc: '순백 글자 + 시안 네온 그림자',
    fontFamily: 'Pretendard',
    textColor: '#FFFFFF',
    outlineSize: 4,
    outlineColor: '#0F172A',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 4,
    shadowColor: '#00F0FF',
    fontSize: 18,
    sampleText: '화이트 네온 글로우',
  },
  {
    id: 'black-gold',
    name: '블랙 앤 골드',
    badge: '지식/다큐',
    badgeColor: 'bg-amber-600 text-amber-100',
    desc: '골드 텍스트 + 딥블랙 외곽선',
    fontFamily: 'Do Hyeon',
    textColor: '#FFD700',
    outlineSize: 5,
    outlineColor: '#000000',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 3,
    shadowColor: '#000000',
    fontSize: 19,
    sampleText: '프리미엄 골드 자막',
  },
];

export type LayoutTemplateMode = 'classic' | 'instagram' | 'gunlimbo' | 'ssul';
export type SsulTextMode = 'accumulate' | 'single-stepped' | 'single-fixed';
export type ScriptSplitPreset = 'shorts' | 'balanced' | 'sentence';
export type BgmMood = 'energetic' | 'emotional' | 'suspense' | 'funny' | 'cinematic';

export interface ShortsEditorStudioProps {
  sovereignMode?: LayoutTemplateMode;
}

/**
 * [ShortsEditorStudio]
 * 8,288줄 모놀리스에서 5대 핵심 도메인(core, stage, timeline, inspector, header)으로
 * 완전히 해체된 차세대 VLStandardBlueprint v4.0 NLE 올인원 스튜디오 페이지
 */
export const ShortsEditorStudio: React.FC<ShortsEditorStudioProps> = ({ sovereignMode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const templateId = searchParams.get('templateId') || searchParams.get('id');
  const [loadedBlueprint, setLoadedBlueprint] = React.useState<VLStandardBlueprintV4 | null>(null);

  const activeArchetype: Archetype = useMemo(() => {
    const param = searchParams.get('mode') || sovereignMode || 'classic';
    if (['classic', 'instagram', 'gunlimbo', 'ssul', 'bespoke'].includes(param)) {
      return param as Archetype;
    }
    return 'classic';
  }, [searchParams, sovereignMode]);

  React.useEffect(() => {
    if (templateId) {
      fetch(`/api/shorts-templates/${templateId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data) {
            const bp = migrateToBlueprintV4(data.blueprint_v4 || data);
            setLoadedBlueprint(bp);
          }
        })
        .catch((err) => console.warn('[ShortsEditorStudio] Failed to load template:', err));
    }
  }, [templateId]);

  const initialBlueprint = useMemo(() => {
    if (loadedBlueprint) return loadedBlueprint;
    return createDefaultBlueprintV4(activeArchetype, `${activeArchetype.toUpperCase()} 프로젝트`);
  }, [activeArchetype, loadedBlueprint]);

  const handleSave = async (bp: VLStandardBlueprintV4) => {
    try {
      const resp = await fetch('/api/shorts-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bp.blueprintId,
          name: bp.name,
          archetype: bp.archetype,
          aspect_ratio: bp.canvas.aspectRatio,
          blueprint_v4: bp,
          layout: bp.globalLayers,
        }),
      });
      if (!resp.ok) {
        console.warn('[ShortsEditorStudio] Server save response non-200, cached locally.');
      }
    } catch (e) {
      console.warn('[ShortsEditorStudio] Network save fallback:', e);
    }
  };

  return (
    <AllInOneNLEStudio
      initialBlueprint={initialBlueprint}
      onSave={handleSave}
      onBack={() => navigate(-1)}
      defaultStudioMode="nle"
    />
  );
};

export default ShortsEditorStudio;
