/**
 * ViraLoop Studio - NLE Layer Objectification Core Data Model (SSOT)
 * 표준 NLE 규격 레이어 객체화 및 변형(Transform) 인터페이스
 */

export type LayerType = 'video' | 'title' | 'subtitle' | 'jab' | 'audio' | 'sfx';

export interface NleLayerTransform {
  xPct: number;        // 캔버스 중심 기준 X 위치 (0 ~ 100%, 기본 50%)
  yPct: number;        // 캔버스 중심 기준 Y 위치 (0 ~ 100%)
  widthPct: number;    // 너비 비율 (기본 100%)
  heightPct: number;   // 높이 비율
  scale: number;       // 확대/축소 (0.1x ~ 5.0x, 기본 1.0)
  rotationDeg: number; // 회전 각도 (-180° ~ +180°, 기본 0°)
  isFlippedH: boolean; // 좌우반전 토글 (기본 false)
  opacity: number;     // 불투명도 (0 ~ 1, 기본 1.0)
  zIndex: number;      // 레이어 순서 (기본 1)
}

export interface NleLayerObject {
  id: string;
  type: LayerType;
  name: string;
  startMs: number;
  endMs: number;
  locked: boolean;     // 레이어 잠금 (드래그/편집 방지)
  visible: boolean;    // 레이어 표시/숨김 토글
  transform: NleLayerTransform;
  styleProps: Record<string, any>; // 폰트, 외곽선두께, 배경색, 글자색 등
  data: any;           // 텍스트 내용 또는 미디어 파일 경로/URL
}

export interface NleProjectState {
  id: string;
  title: string;
  durationMs: number;
  fps: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  currentTimeMs: number;
  isPlaying: boolean;
  safeZoneVisible: boolean;
  selectedLayerId: string | null;

  // 🌟 레이어 객체 스택 (Z-Index 순)
  layers: NleLayerObject[];

  // 채널 DNA 템플릿 프로파일
  channelProfile?: {
    channelName?: string;
    style?: string;
    topHeaderHeightPct?: number;
    titleColor1?: string;
    titleColor2?: string;
    subtitleYPercent?: number;
    subtitleStrokeWidth?: number;
  };
}

export function createDefaultTransform(overrides?: Partial<NleLayerTransform>): NleLayerTransform {
  return {
    xPct: 50,
    yPct: 50,
    widthPct: 100,
    heightPct: 100,
    scale: 1.0,
    rotationDeg: 0,
    isFlippedH: false,
    opacity: 1.0,
    zIndex: 1,
    ...overrides
  };
}
