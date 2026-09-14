/**
 * 🏛️ ViraLoop Studio - 4대 표준 아키타입 템플릿 정의 (단일 진실 공급원)
 * 
 * 1. classic_standard: 스탠다드 레터박스형 (18.3% 상단 바 + 2줄 타이틀 + 6.0% 하단 출처)
 * 2. instagram_card: 인스타 화이트카드형 (SVG 홀펀치 마스크 + 프로필 + 82% 댓글 카드)
 * 3. gunlimbo_breaking: 군림보/뇌전구 브레이킹형 (상단 24% 2줄 대제목 + 24~34% 짙은 회색 밴드 위 순백색 띠 박스 + 34~70% Ken Burns 줌 비디오 + 70~100% 하단 75% 자막)
 * 4. ssul_community: 커뮤니티 썰형 (디시/펨코 상단 헤더 + 본문 텍스트 카드 + 밈 스티커)
 */

import { TemplateManifest } from '@/types/templateDna';

export const STANDARD_TEMPLATES: Record<string, TemplateManifest> = {
  // 1. 기본형 (classic)
  classic_standard: {
    id: 'preset_classic_standard',
    name: '🌟 스탠다드 레터박스형',
    badge: '골든 표준',
    description: '상단 블랙 바 18.3% + 2줄 헤드라인 타이틀 + 하단 6.0% 출처 바의 검증된 유튜브 쇼츠 대표 포맷.',
    archetype: 'classic',
    aspectRatio: '9:16',
    isSystem: true,
    version: 1,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    geometry: {
      topTitleZone: {
        enabled: true,
        topPct: 0,
        heightPct: 18.3,
        bgColor: '#000000',
        opacity: 1.0,
        keepThroughout: true,
      },
      mediaZone: {
        introTopPct: 18.3,
        introHeightPct: 75.7,
        normalTopPct: 18.3,
        normalHeightPct: 75.7,
        fitMode: 'sandwich',
        kenBurnsIntroZoom: false,
        kenBurnsScaleEnd: 1.0,
        introDurationSec: 0,
      },
      captionZone: {
        enabled: true,
        topPct: 70,
        heightPct: 24,
        safeZoneYPct: 75.0,
        bgColor: 'transparent',
        hideDuringIntro: false,
      },
      sourceZone: {
        enabled: true,
        yPct: 94.0,
        defaultText: '출처: 공식 유튜브 영상',
        textColor: '#94A3B8',
        fontSize: 10,
      },
    },
    style: {
      titleFont: 'Pretendard',
      titleLine1Color: '#FFFFFF',
      titleLine2Color: '#FFE500',
      titleFontSize: 20,
      titleLine2FontSize: 24,
      titleStroke: false,
      titleStrokeWidth: 0,
      titleStrokeColor: '#000000',
      titleShadow: true,
      titleShadowBlur: 4,
      titleShadowColor: 'rgba(0,0,0,0.8)',
      captionFont: 'Pretendard',
      captionFontSize: 18,
      captionDefaultColor: '#FFE500',
      captionStrokeWidth: 4,
      captionStrokeColor: '#000000',
      captionShadowBlur: 4,
      captionShadowColor: 'rgba(0,0,0,0.9)',
      captionUseBox: false,
      captionBoxColor: '#000000',
      captionBoxOpacity: 0.6,
      emotionColors: {
        normal: '#FFE500',
        highlight: '#00F0FF',
        impact: '#FF3366',
        white: '#FFFFFF',
      },
    },
    sourcing: {
      priority: 'web_search_first',
      promptPrefix: 'cinematic 4k realism, dramatic studio lighting',
      enableMemeReactions: true,
      memePlacement: 'bottom_left',
      memeScale: 1.0,
      memeDurationSec: 0.8,
    },
    capcut: {
      titleMotion: 'none',
      hookMotion: 'none',
      captionMotion: 'word_pop',
    },
  },

  // 2. 인스타형 (instagram)
  instagram_card: {
    id: 'preset_instagram_card',
    name: '📸 인스타 화이트카드형',
    badge: '인스타 바이럴',
    description: '100% SVG 홀펀치 마스크 카드 + 좌상단 원형 프로필 + 중앙 구멍 비디오 + 하단 82% 가변 댓글 카드.',
    archetype: 'instagram',
    aspectRatio: '9:16',
    isSystem: true,
    version: 1,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    geometry: {
      topTitleZone: {
        enabled: true,
        topPct: 12.0,
        heightPct: 15.0,
        bgColor: 'transparent',
        opacity: 1.0,
        keepThroughout: true,
      },
      holeWindowZone: {
        enabled: true,
        widthPct: 88,
        heightPct: 47,
        yPct: 44.5,
        roundness: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadow: true,
        cardBgColor: '#FFFFFF',
      },
      mediaZone: {
        introTopPct: 0,
        introHeightPct: 100,
        normalTopPct: 0,
        normalHeightPct: 100,
        fitMode: 'sandwich',
        kenBurnsIntroZoom: false,
        kenBurnsScaleEnd: 1.0,
        introDurationSec: 0,
      },
      captionZone: {
        enabled: true,
        topPct: 70,
        heightPct: 30,
        safeZoneYPct: 71.5,
        bgColor: 'transparent',
        hideDuringIntro: false,
      },
      commentCardZone: {
        enabled: true,
        yPct: 82.0,
        scale: 0.95,
        theme: 'insta',
      },
    },
    style: {
      titleFont: 'Pretendard',
      titleLine1Color: '#111827',
      titleLine2Color: '#374151',
      titleFontSize: 20,
      titleStroke: false,
      titleStrokeWidth: 0,
      titleStrokeColor: 'transparent',
      titleShadow: false,
      titleShadowBlur: 0,
      titleShadowColor: 'transparent',
      captionFont: 'Pretendard',
      captionFontSize: 15,
      captionDefaultColor: '#374151',
      captionStrokeWidth: 0,
      captionStrokeColor: 'transparent',
      captionShadowBlur: 0,
      captionShadowColor: 'transparent',
      captionUseBox: false,
      captionBoxColor: '#000000',
      captionBoxOpacity: 0.0,
      emotionColors: {
        normal: '#374151',
        highlight: '#2563EB',
        impact: '#DC2626',
        white: '#111827',
      },
    },
    sourcing: {
      priority: 'web_search_first',
      promptPrefix: 'clean studio photography, pastel tones, aesthetic composition',
      enableMemeReactions: false,
      memePlacement: 'bottom_right',
      memeScale: 0.9,
      memeDurationSec: 0.8,
    },
    capcut: {
      titleMotion: 'none',
      hookMotion: 'none',
      captionMotion: 'none',
    },
  },

  // 3. 군림보형 (gunlimbo)
  gunlimbo_breaking: {
    id: 'preset_gunlimbo_breaking',
    name: '🎯 군림보/뇌전구 브레이킹형',
    badge: '뇌전구 실측',
    description: '상단 24% 2줄 대제목(흰색/형광노랑) + 24~34% 짙은 회색 밴드 위 100% 순백색 띠 바 + 0~2.5초 Ken Burns 느린 줌인(100%➔110%) + 70% 이하 자막 정밀 타이밍.',
    archetype: 'gunlimbo',
    aspectRatio: '9:16',
    isSystem: true,
    version: 1,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    geometry: {
      topTitleZone: {
        enabled: true,
        topPct: 0,
        heightPct: 24,
        bgColor: '#000000',
        opacity: 1.0,
        keepThroughout: true,
      },
      hookBandZone: {
        enabled: true,
        topPct: 24,
        heightPct: 10,
        bgBarColor: '#3F3F46',
        boxColor: '#FFFFFF',
        textColor: '#000000',
        paddingX: 0,
        paddingY: 8,
        borderRadius: 0,
      },
      mediaZone: {
        introTopPct: 34,
        introHeightPct: 36,
        normalTopPct: 24,
        normalHeightPct: 46,
        fitMode: 'sandwich',
        kenBurnsIntroZoom: true,
        kenBurnsScaleEnd: 1.10,
        introDurationSec: 2.5,
      },
      captionZone: {
        enabled: true,
        topPct: 70,
        heightPct: 30,
        safeZoneYPct: 75,
        bgColor: '#000000',
        hideDuringIntro: true,
      },
      sourceZone: {
        enabled: false,
        yPct: 92,
        defaultText: '출처: 온라인 커뮤니티',
        textColor: '#94A3B8',
        fontSize: 10,
      },
    },
    style: {
      titleFont: 'Pretendard',
      titleLine1Color: '#FFFFFF',
      titleLine2Color: '#FFE500',
      titleFontSize: 22,
      titleLine2FontSize: 24,
      titleStroke: false,
      titleStrokeWidth: 0,
      titleStrokeColor: '#000000',
      titleShadow: true,
      titleShadowBlur: 4,
      titleShadowColor: 'rgba(0,0,0,0.8)',
      hookFont: 'Pretendard',
      hookFontSize: 14,
      captionFont: 'Pretendard',
      captionFontSize: 18,
      captionDefaultColor: '#FFE500',
      captionStrokeWidth: 4,
      captionStrokeColor: '#000000',
      captionShadowBlur: 4,
      captionShadowColor: 'rgba(0,0,0,0.9)',
      captionUseBox: false,
      captionBoxColor: '#000000',
      captionBoxOpacity: 0.6,
      emotionColors: {
        normal: '#FFE500',
        highlight: '#00F0FF',
        impact: '#FF3366',
        white: '#FFFFFF',
      },
    },
    sourcing: {
      priority: 'web_search_first',
      promptPrefix: 'cinematic high quality photo, editorial news style, realistic lighting',
      enableMemeReactions: true,
      memePlacement: 'bottom_left',
      memeScale: 1.0,
      memeDurationSec: 0.8,
    },
    capcut: {
      titleMotion: 'none',
      hookMotion: 'fade_in_pulse',
      captionMotion: 'word_pop',
    },
  },

  // 4. 썰형 (ssul)
  ssul_community: {
    id: 'preset_ssul_community',
    name: '💬 커뮤니티 썰형',
    badge: '커뮤니티 썰',
    description: '디시인사이드/에펨코리아 상단 헤더 + 본문 텍스트 박스 모드 + 페페/이라스토야 밈 리액션 결합.',
    archetype: 'ssul',
    aspectRatio: '9:16',
    isSystem: true,
    version: 1,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    geometry: {
      topTitleZone: {
        enabled: true,
        topPct: 2.0,
        heightPct: 12.0,
        bgColor: '#1E293B',
        opacity: 0.95,
        keepThroughout: true,
      },
      mediaZone: {
        introTopPct: 14.0,
        introHeightPct: 84.0,
        normalTopPct: 14.0,
        normalHeightPct: 84.0,
        fitMode: 'sandwich',
        kenBurnsIntroZoom: false,
        kenBurnsScaleEnd: 1.0,
        introDurationSec: 0,
      },
      captionZone: {
        enabled: true,
        topPct: 65.0,
        heightPct: 30.0,
        safeZoneYPct: 70.0,
        bgColor: 'transparent',
        hideDuringIntro: false,
      },
      sourceZone: {
        enabled: true,
        yPct: 96.0,
        defaultText: '출처: 에펨코리아 유저게시판',
        textColor: '#64748B',
        fontSize: 10,
      },
    },
    style: {
      titleFont: 'Pretendard',
      titleLine1Color: '#F8FAFC',
      titleLine2Color: '#94A3B8',
      titleFontSize: 18,
      titleLine2FontSize: 20,
      titleStroke: false,
      titleStrokeWidth: 0,
      titleStrokeColor: '#000000',
      titleShadow: false,
      titleShadowBlur: 0,
      titleShadowColor: 'transparent',
      captionFont: 'Pretendard',
      captionFontSize: 16,
      captionDefaultColor: '#FFFFFF',
      captionStrokeWidth: 3,
      captionStrokeColor: '#000000',
      captionShadowBlur: 3,
      captionShadowColor: 'rgba(0,0,0,0.8)',
      captionUseBox: true,
      captionBoxColor: '#0F172A',
      captionBoxOpacity: 0.75,
      emotionColors: {
        normal: '#FFFFFF',
        highlight: '#38BDF8',
        impact: '#F43F5E',
        white: '#E2E8F0',
      },
    },
    sourcing: {
      priority: 'flow_ai_first',
      promptPrefix: 'illustration, comic webtoon style, vibrant colors',
      enableMemeReactions: true,
      memePlacement: 'bottom_left',
      memeScale: 1.1,
      memeDurationSec: 1.0,
    },
    capcut: {
      titleMotion: 'none',
      hookMotion: 'none',
      captionMotion: 'typewriter',
    },
  },

  // 5. 롱폼·영화리뷰 (16:9 와이드)
  movie_review_horizontal: {
    id: 'preset_movie_review_horizontal',
    name: '🎬 영화리뷰 16:9 롱폼 시네마틱',
    badge: '16:9 롱폼',
    description: '16:9 와이드스크린 + 상단 영화 타이틀 뱃지 + 시네마틱 2줄 나레이션 자막 + 하단 챕터 출처 바.',
    archetype: 'classic',
    aspectRatio: '16:9',
    isSystem: true,
    version: 1,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    geometry: {
      topTitleZone: {
        enabled: true,
        topPct: 4.0,
        heightPct: 12.0,
        bgColor: 'transparent',
        opacity: 1.0,
        keepThroughout: true,
      },
      mediaZone: {
        introTopPct: 0,
        introHeightPct: 100,
        normalTopPct: 0,
        normalHeightPct: 100,
        fitMode: 'fullscreen',
        kenBurnsIntroZoom: false,
        kenBurnsScaleEnd: 1.0,
        introDurationSec: 0,
      },
      captionZone: {
        enabled: true,
        topPct: 78.0,
        heightPct: 18.0,
        safeZoneYPct: 82.0,
        bgColor: 'transparent',
        hideDuringIntro: false,
      },
      sourceZone: {
        enabled: true,
        yPct: 94.0,
        defaultText: '작품명: 인셉션 (2010) Warner Bros.',
        textColor: '#CBD5E1',
        fontSize: 13,
      },
    },
    style: {
      titleFont: 'Pretendard',
      titleLine1Color: '#FFFFFF',
      titleLine2Color: '#38BDF8',
      titleFontSize: 24,
      titleStroke: false,
      titleStrokeWidth: 0,
      titleStrokeColor: '#000000',
      titleShadow: true,
      titleShadowBlur: 6,
      titleShadowColor: 'rgba(0,0,0,0.85)',
      captionFont: 'Pretendard',
      captionFontSize: 24,
      captionDefaultColor: '#FFFFFF',
      captionStrokeWidth: 4,
      captionStrokeColor: '#000000',
      captionShadowBlur: 4,
      captionShadowColor: 'rgba(0,0,0,0.9)',
      captionUseBox: true,
      captionBoxColor: '#000000',
      captionBoxOpacity: 0.55,
      emotionColors: {
        normal: '#FFFFFF',
        highlight: '#38BDF8',
        impact: '#F43F5E',
        white: '#F8FAFC',
      },
    },
    sourcing: {
      priority: 'video_crop_only',
      promptPrefix: 'cinematic movie still, anamorphic lens flare, photorealistic 8k',
      enableMemeReactions: false,
      memePlacement: 'bottom_left',
      memeScale: 1.0,
      memeDurationSec: 0.8,
    },
    capcut: {
      titleMotion: 'none',
      hookMotion: 'none',
      captionMotion: 'word_pop',
    },
  },
};

/**
 * 템플릿 아키타입별 기본 표준 템플릿 반환 헬퍼
 */
export const getStandardTemplateByArchetype = (archetype: string): TemplateManifest => {
  if (archetype === 'classic') return STANDARD_TEMPLATES.classic_standard;
  if (archetype === 'instagram') return STANDARD_TEMPLATES.instagram_card;
  if (archetype === 'gunlimbo') return STANDARD_TEMPLATES.gunlimbo_breaking;
  if (archetype === 'ssul') return STANDARD_TEMPLATES.ssul_community;
  return STANDARD_TEMPLATES.classic_standard;
};

/**
 * 🎯 캔버스 최적 규격 정규화 헬퍼 (단일 진실 공급원)
 * 기존 저장/캐시된 매니페스트의 과도하게 팽창된 글자 크기(36px, 40px 등)를
 * 9:16 쇼츠 캔버스 골든 비율(대제목 20/24px, 쨉쨉이 13px, 본문자막 18px, 출처 10px)로
 * 안전하게 정규화/보정합니다.
 */
export const normalizeTemplateManifest = (manifest: TemplateManifest): TemplateManifest => {
  if (!manifest) return manifest;
  try {
    const clone: TemplateManifest = JSON.parse(JSON.stringify(manifest));
    return clone;
  } catch (e) {
    return manifest;
  }
};

/**
 * 🏛️ 폼팩터별 마스터 템플릿 반환 헬퍼 (단일 진실 공급원 SSOT)
 * 1. 사용자가 [⭐ 마스터로 저장]한 사용자 커스텀 마스터 템플릿 최우선
 * 2. 없으면 ViraLoop 공식 표준 골든 스탠다드 템플릿 반환
 */
export const getMasterTemplate = (archetype: string): TemplateManifest => {
  try {
    const raw = localStorage.getItem(`master_manifest_${archetype}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.archetype === archetype || !parsed.archetype)) {
        return normalizeTemplateManifest(parsed);
      }
    }
  } catch (e) {
    console.warn(`[getMasterTemplate] Failed to load master manifest for ${archetype}:`, e);
  }
  return normalizeTemplateManifest(getStandardTemplateByArchetype(archetype));
};

/**
 * 💾 폼팩터별 마스터 템플릿 로컬 캐시 저장 및 이벤트 발행
 */
export const saveMasterTemplateLocal = (archetype: string, manifest: TemplateManifest): void => {
  try {
    const normalized = normalizeTemplateManifest(manifest);
    localStorage.setItem(`master_manifest_${archetype}`, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('vl_master_template_updated', { detail: { archetype, manifest: normalized } }));
    try {
      const ch = new BroadcastChannel('vl_master_template_channel');
      ch.postMessage({ archetype, manifest: normalized });
      ch.close();
    } catch (_) {}
  } catch (e) {
    console.error(`[saveMasterTemplateLocal] Failed to save master manifest for ${archetype}:`, e);
  }
};
