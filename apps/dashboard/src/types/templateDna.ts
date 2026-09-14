/**
 * 🏛️ ViraLoop Studio - 차세대 주권 템플릿 DNA 스키마 (Single Source of Truth)
 * 
 * 4대 표준 아키타입(스탠다드, 인스타, 군림보, 썰형) 및 채널별 무한 응용 템플릿의
 * 지오메트리, 스타일, 미디어 소싱 전략, CapCut 모션 바인딩을 완전 선언형으로 정의합니다.
 */

export type TemplateArchetype = 'classic' | 'instagram' | 'gunlimbo' | 'ssul';
export type LayoutTemplateMode = TemplateArchetype;

export type AspectRatioType = '9:16' | '16:9' | '1:1';

export type PlatformSafeZone = 'none' | 'youtube_shorts' | 'instagram_reels' | 'tiktok';

export type MediaSourcingPriority = 'web_search_first' | 'flow_ai_first' | 'video_crop_only';

export type CapCutTitleMotion = 'zoom_in_1' | 'typewriter' | 'fade_in' | 'bounce' | 'slide_down' | 'none';
export type CapCutHookMotion = 'fade_in_pulse' | 'word_pop' | 'pop_in' | 'none';
export type CapCutCaptionMotion = 'word_pop' | 'karaoke' | 'smooth_slide' | 'typewriter' | 'none';

/**
 * 📐 캔버스 3단/4단 영역 지오메트리 (0~100% 상대 좌표)
 */
export interface TemplateGeometry {
  // 1. 상단 대제목 영역
  topTitleZone: {
    enabled: boolean;
    topPct: number;          // 예: 0%
    heightPct: number;       // 예: 24% (군림보), 18.3% (스탠다드)
    bgColor: string;         // 예: "#000000"
    opacity: number;
    keepThroughout: boolean; // 영상 끝까지 유지 여부
  };

  // 2. 소제목 후킹 밴드 (군림보/속보형 특화)
  hookBandZone?: {
    enabled: boolean;
    topPct: number;          // 예: 24%
    heightPct: number;       // 예: 10%
    bgBarColor: string;      // 짙은 회색 밴드 (예: "#3F3F46")
    boxColor: string;        // 내부 흰색 띠 박스 (예: "#FFFFFF")
    textColor: string;       // 텍스트 (예: "#000000")
    paddingX: number;
    paddingY: number;
    borderRadius: number;
  };

  // 3. 인스타형 SVG 마스크 구멍 윈도우 (인스타형 특화)
  holeWindowZone?: {
    enabled: boolean;
    widthPct: number;        // 예: 92%
    heightPct: number;       // 예: 50%
    yPct: number;            // 예: 50%
    roundness: number;       // 예: 24px
    borderWidth: number;
    borderColor: string;
    shadow: boolean;
    cardBgColor: string;     // 예: "#FFFFFF"
  };

  // 4. 중앙 미디어(비디오/이미지) 영역
  mediaZone: {
    introTopPct: number;     // 인트로 구간 Y (예: 34%)
    introHeightPct: number;  // 인트로 구간 높이 (예: 36%)
    normalTopPct: number;    // 평상시 Y (예: 24%)
    normalHeightPct: number; // 평상시 높이 (예: 46% or 60%)
    fitMode: 'sandwich' | 'fullscreen' | 'original';
    kenBurnsIntroZoom: boolean; // 0~2.5초 느린 줌인(100% -> 110%) 활성화
    kenBurnsScaleEnd: number;   // 기본 1.10 (110%)
    introDurationSec: number;   // 인트로 지속 시간 (기본 2.5초)
  };

  // 5. 하단 자막 안전지대 영역
  captionZone: {
    enabled: boolean;
    topPct: number;          // 예: 70%
    heightPct: number;       // 예: 30%
    safeZoneYPct: number;    // 자막 Y축 기준 (예: 75%)
    bgColor: string;         // 예: "#000000"
    hideDuringIntro: boolean; // 0~2.5초 인트로 동안 하단 자막 완전 숨김 여부
  };

  // 6. 하단 출처 표기 영역
  sourceZone?: {
    enabled: boolean;
    yPct: number;            // 예: 92%
    defaultText: string;
    textColor: string;
    fontSize: number;
    bgEnabled?: boolean;
    bgColor?: string;
    borderRadius?: number;
  };

  // 7. 댓글 카드 영역 (인스타/소셜 특화 및 전 템플릿 장착 가능)
  commentCardZone?: {
    enabled: boolean;
    yPct: number;            // 예: 82%
    scale: number;
    theme: 'insta' | 'yt-dark' | 'yt-light' | 'glass';
    author?: string;
    handle?: string;
    text?: string;
    likes?: string;
    timeText?: string;
    blurId?: boolean;
    anonymous?: boolean;
  };

  // 8. 긴박 쨉쨉이 훅 영역 (-15° ~ +15° 틸트 회전 & 3초 임팩트 텍스트)
  jabHookZone?: {
    enabled: boolean;
    xPct: number;            // X축 (기본 50%)
    yPct: number;            // Y축 (기본 28%)
    tiltDeg: number;         // -15° ~ +15° 회전 각도
    text: string;            // 훅 문구 (예: "*3초 만에 몰입되는 반전!*")
    fontSize: number;        // 기본 20
    textColor: string;       // 기본 #FFFFFF or #000000
    stroke: boolean;         // 외곽선 여부
    strokeWidth: number;     // 외곽선 두께 (1~8)
    strokeColor: string;     // 외곽선 색상
    shadow: boolean;         // 그림자 여부
    shadowBlur: number;      // 그림자 흐림 (1~16)
    bgEnabled: boolean;      // 배경 박스 여부
    bgColor: string;         // 배경 박스 색상
    borderRadius: number;    // 모서리 둥글기 (0~30)
  };
}

/**
 * 🎨 타이포그래피 및 스타일 시그니처
 */
export interface TemplateStyleSignature {
  // 대제목 타이포그래피
  titleFont: string;
  titleLinesMode?: 'single' | 'double';
  titleBadgeText?: string;
  titleBadgeColor?: string;
  titleLine1Color: string;
  titleLine2Color: string;
  titleFontSize: number;
  titleLine2FontSize?: number;
  titleBgMode?: 'none' | 'box' | 'pill' | 'highlighter' | 'glass';
  titleBgColor?: string;
  titleBorderRadius?: number;
  titleStroke: boolean;
  titleStrokeWidth: number;
  titleStrokeColor: string;
  titleShadow: boolean;
  titleShadowBlur: number;
  titleShadowColor: string;

  // 소제목/후킹 띠 바 폰트
  hookFont?: string;
  hookFontSize?: number;

  // 본문 자막 타이포그래피
  captionFont: string;
  captionFontSize: number;
  captionDefaultColor: string;
  captionStrokeWidth: number;
  captionStrokeColor: string;
  captionShadowBlur: number;
  captionShadowColor: string;
  captionUseBox: boolean;
  captionBoxColor: string;
  captionBoxOpacity: number;
  // 감정별 4색 프리셋 컬러
  emotionColors: {
    normal: string;    // 기본 (노랑 #FFE500)
    highlight: string; // 강조 (민트 #00F0FF)
    impact: string;    // 충격 (레드 #FF3366)
    white: string;     // 차분 (화이트 #FFFFFF)
  };
}

/**
 * 🧩 지능형 미디어 소싱 룰셋
 */
export interface TemplateMediaSourcingRule {
  priority: MediaSourcingPriority;
  promptPrefix: string;      // 생성형 프롬프트 기본 스타일 접두사 (예: "cinematic ultra-realistic 8k photography")
  enableMemeReactions: boolean; // 밈 스티커(페페/이라스토야) 슬롯 활성화 여부
  memePlacement: 'bottom_left' | 'bottom_right' | 'center_right';
  memeScale: number;
  memeDurationSec: number;
}

/**
 * 🎬 CapCut 12종 네이티브 모션 사전 바인딩
 */
export interface TemplateCapCutBindings {
  titleMotion: CapCutTitleMotion;
  hookMotion: CapCutHookMotion;
  captionMotion: CapCutCaptionMotion;
}

/**
 * 🏛️ 완전한 단일 템플릿 매니페스트 (Template Manifest)
 */
export interface TemplateManifest {
  id: string;                          // 예: "preset_gunlimbo_breaking" or "custom_noejeongu_01"
  name: string;                        // 표시 이름
  badge: string;                       // 예: "뉴스 속보", "골든 표준"
  description: string;                 // 설명
  archetype: TemplateArchetype;        // 기반 4대 아키타입
  aspectRatio?: AspectRatioType;       // 9:16 (쇼츠) | 16:9 (롱폼/영화리뷰) | 1:1 (피드)
  isSystem: boolean;                   // 시스템 표준 프리셋 여부 (삭제 불가)
  channelId?: number;                  // 특정 채널 전용 바인딩 (null이면 전역 사용)
  channelTitle?: string;               // 바인딩된 채널명
  version: number;                     // 템플릿 버전 (기본 1)
  createdAt: string;                   // ISO 타임스탬프
  updatedAt: string;

  // 세부 스펙
  geometry: TemplateGeometry;
  style: TemplateStyleSignature;
  sourcing: TemplateMediaSourcingRule;
  capcut: TemplateCapCutBindings;

  // 🏛️ 캔버스 2D 기즈모 좌표 및 정밀 레이아웃 100% 복원용 전역 상태 (Single Source of Truth)
  canvasState?: TemplateCanvasState;
}

/**
 * 🏛️ 캔버스 2D 기즈모 좌표 및 모든 폼팩터 파라미터 완전 보존 인터페이스
 */
export interface TemplateCanvasState {
  titleTransform?: any;
  jabTransform?: any;
  subTransform?: any;
  commentTransform?: any;
  profileTransform?: any;
  sourceTransform?: any;
  gunlimboConfig?: any;
  instaConfig?: any;
  ssulConfig?: any;
  commentCard?: any;
  videoFitMode?: 'sandwich' | 'fullscreen';
  videoBlurBg?: boolean;
  videoFocusXPct?: number;
  videoFocusYPct?: number;
  videoZoomScale?: number;
  videoRotationDeg?: number;
  videoHorizontalFlip?: boolean;
  videoVerticalFlip?: boolean;
  videoFilter?: any;
  hasTopBarBg?: boolean;
  topBarBg?: string;
  topBarHeightPct?: number;
  topBarOpacity?: number;
  topBarRadius?: number;
  hasBottomBarBg?: boolean;
  bottomBarBg?: string;
  bottomBarHeightPct?: number;
  bottomBarOpacity?: number;
  bottomBarRadius?: number;
  hasTopTitle?: boolean;
  topTitleText?: string;
  titleLinesMode?: 'single' | 'double';
  hasTitleLine1?: boolean;
  hasTitleLine2?: boolean;
  titleLine1?: string;
  titleLine2?: string;
  titleLine1Color?: string;
  titleLine2Color?: string;
  titleLine1SizePx?: number;
  titleLine2SizePx?: number;
  titleFontFamily?: string;
  titleStroke?: boolean;
  titleStrokeWidth?: number;
  titleStrokeColor?: string;
  titleShadow?: boolean;
  titleShadowBlur?: number;
  titleShadowColor?: string;
  titleBgMode?: 'none' | 'box' | 'pill' | 'highlighter' | 'glass';
  titleBgColor?: string;
  titleBgOpacity?: number;
  titlePaddingX?: number;
  titlePaddingY?: number;
  titleBorderRadius?: number;
  hasTitleBadge?: boolean;
  titleBadgeText?: string;
  titleBadgeBg?: string;
  titleBadgeColor?: string;
  titleBadgeSizePx?: number;
  hasJab?: boolean;
  jabText?: string;
  jabTiltDeg?: number;
  jabFontSize?: number;
  jabTextColor?: string;
  jabStroke?: boolean;
  jabStrokeWidth?: number;
  jabStrokeColor?: string;
  jabShadow?: boolean;
  jabShadowBlur?: number;
  jabBgEnabled?: boolean;
  jabBgColor?: string;
  jabBorderRadius?: number;
  hasBottomSource?: boolean;
  bottomSourceText?: string;
  bottomSourceColor?: string;
  bottomSourceSizePx?: number;
  bottomSourceFontFamily?: string;
  bottomSourceBottomPct?: number;
  bottomSourceStroke?: boolean;
  bottomSourceShadow?: boolean;
  bottomSourceBg?: boolean;
  bottomSourceBorderRadius?: number;
  hasSubtitle?: boolean;
  subtitleConfig?: any;
  subtitleStrokeEnabled?: boolean;
  subtitleStrokeWidth?: number;
  subtitleStrokeColor?: string;
  subtitleShadowEnabled?: boolean;
  subtitleShadowBlur?: number;
  subtitleShadowColor?: string;
  subtitleUseBox?: boolean;
  subtitleBoxColor?: string;
  subtitleBorderRadius?: number;
  hasCommentCard?: boolean;
}
