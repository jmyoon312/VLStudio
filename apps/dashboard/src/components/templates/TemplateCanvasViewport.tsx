import React from 'react';
import { TemplateManifest, PlatformSafeZone } from '@/types/templateDna';
import { Heart, MessageCircle, Share2, MoreVertical, Music2, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransformGizmo } from '@/components/canvas/TransformGizmo';
import { NleLayerTransform, createDefaultTransform } from '@/types/nle';

export interface SampleContent {
  titleLine1: string;
  titleLine2: string;
  hookPhrase: string;
  captionText: string;
  profileName: string;
  profileHandle: string;
  commentAuthor: string;
  commentText: string;
  videoSrc?: string;
  imageSrc?: string;
}

export const SAMPLE_CONTENTS: SampleContent[] = [
  {
    titleLine1: '손흥민 80m 단독 폭풍 드리블',
    titleLine2: '푸스카스상 후보 원더골 작렬',
    hookPhrase: '현지 해설진 전원 기립 극찬 폭발',
    captionText: '경기장을 뒤흔든 손흥민의 역사적인 질주, 수비수 5명을 단숨에 제치며 골망을 갈랐습니다.',
    profileName: '축구 하이라이트 매거진',
    profileHandle: '@football_korea_tv',
    commentAuthor: '축구도사',
    commentText: '진짜 이 골은 봐도 봐도 소름 돋네요 ㄷㄷ 월드클래스 인정',
    imageSrc: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
  },
  {
    titleLine1: '백두산 지하 3000m 미스터리',
    titleLine2: '지질학계 발칵 뒤집힌 실체',
    hookPhrase: '역대급 마그마 방 대규모 포착',
    captionText: '천지 아래 깊은 곳에서 상상 이상의 거대한 마그마방이 최초로 정밀 탐지되었습니다.',
    profileName: '미스터리 미디어 랩',
    profileHandle: '@mystery_vault_lab',
    commentAuthor: '호기심천국',
    commentText: '폭발하면 진짜 어떻게 되는 건가요? 너무 무섭네요...',
    imageSrc: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
  },
  {
    titleLine1: '전국 편의점 초토화 사태',
    titleLine2: '오픈런까지 벌어진 신상템',
    hookPhrase: '출시 3일 만에 100만 개 완판',
    captionText: '출시되자마자 전 지점 품절 대란을 일으킨 역대급 디저트, 도대체 무슨 맛이길래 이럴까요?',
    profileName: '트렌드 핫스팟 뉴스',
    profileHandle: '@trend_hotspot_kr',
    commentAuthor: '디저트러버',
    commentText: '우리 동네 편의점 5군데 돌았는데 다 품절이었음 ㅠㅠ',
    imageSrc: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
  },
];

interface TemplateCanvasViewportProps {
  manifest: TemplateManifest;
  onUpdateManifest?: (updater: (prev: TemplateManifest) => TemplateManifest) => void;
  selectedZone: string | null;
  onSelectZone?: (zoneId: string) => void;
  scale?: number;
  sampleContent?: SampleContent;
  platformSafeZone?: PlatformSafeZone;
  safeZoneVisible?: boolean;
  showHeatmap?: boolean;
  showGuidelines?: boolean;
  currentTimeMs?: number;
  canvasClassName?: string;
  isInteractive?: boolean;
}

export const TemplateCanvasViewport: React.FC<TemplateCanvasViewportProps> = ({
  manifest,
  onUpdateManifest,
  selectedZone,
  onSelectZone,
  scale = 1.0,
  sampleContent = SAMPLE_CONTENTS[0],
  platformSafeZone = 'none',
  safeZoneVisible = false,
  showHeatmap = false,
  showGuidelines = true,
  currentTimeMs = 0,
  canvasClassName,
  isInteractive = true,
}) => {
  const { geometry, style, archetype } = manifest;

  const aspectRatio = manifest.aspectRatio || '9:16';
  let canvasWidth = 360;
  let canvasHeight = 640;
  if (aspectRatio === '16:9') {
    canvasWidth = 640;
    canvasHeight = 360;
  } else if (aspectRatio === '1:1') {
    canvasWidth = 480;
    canvasHeight = 480;
  }

  // 인트로 구간 계산 (예: 0~2.5초)
  const introDurationMs = (geometry.mediaZone.introDurationSec || 2.5) * 1000;
  const isDuringIntro = introDurationMs > 0 && currentTimeMs <= introDurationMs;
  const introProgress = introDurationMs > 0 ? Math.min(1, Math.max(0, currentTimeMs / introDurationMs)) : 0;

  // Ken Burns 줌인 배율 계산
  const kenBurnsScale = (geometry.mediaZone.kenBurnsIntroZoom && isDuringIntro)
    ? 1.0 + (introProgress * ((geometry.mediaZone.kenBurnsScaleEnd || 1.10) - 1.0))
    : 1.0;

  // 비디오 도킹 영역 (인트로 vs 평상시)
  const videoTopPct = isDuringIntro ? geometry.mediaZone.introTopPct : geometry.mediaZone.normalTopPct;
  const videoHeightPct = isDuringIntro ? geometry.mediaZone.introHeightPct : geometry.mediaZone.normalHeightPct;

  // 자막 표시 여부 (인트로 동안 숨김 규칙)
  const isCaptionHidden = geometry.captionZone.hideDuringIntro && isDuringIntro;

  // 제목 배경 스타일 계산
  const titleBgMode = style.titleBgMode || 'none';
  const titleLinesMode = style.titleLinesMode || 'double';

  return (
    <div
      className={cn(
        "relative overflow-hidden select-none bg-black rounded-xs shadow-2xl transition-transform origin-center",
        canvasClassName
      )}
      style={{
        width: canvasWidth,
        height: canvasHeight,
        aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '1:1' ? '1/1' : '9/16',
        transform: `scale(${scale})`,
      }}
    >
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. LAYER 0: 중앙 비디오 / 미디어 배경                        */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div
        onClick={() => isInteractive && onSelectZone?.('media')}
        className={cn(
          "absolute left-0 right-0 overflow-hidden flex items-center justify-center transition-all cursor-pointer z-10",
          selectedZone === 'media' && isInteractive && "ring-2 ring-sky-400 ring-offset-1"
        )}
        style={{
          top: `${videoTopPct}%`,
          height: `${videoHeightPct}%`,
          backgroundColor: archetype === 'instagram' ? 'transparent' : '#000000',
        }}
        title="중앙 미디어 영역 (클릭하여 설정)"
      >
        <div
          className="w-full h-full relative overflow-hidden flex items-center justify-center"
          style={{
            transform: `scale(${kenBurnsScale})`,
            transition: 'transform 0.05s ease-out',
          }}
        >
          {sampleContent.imageSrc ? (
            <img
              src={sampleContent.imageSrc}
              alt="Sample"
              className="w-full h-full object-cover pointer-events-none select-none"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600 text-xs font-mono">
              🎬 {aspectRatio} 비디오 샘플
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. LAYER 0.5: [인스타형 전용] SVG 홀펀치 화이트카드 마스크   */}
      {/* ─────────────────────────────────────────────────────────── */}
      {archetype === 'instagram' && geometry.holeWindowZone?.enabled && (
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{ zIndex: 20 }}
        >
          <svg
            className="w-full h-full absolute inset-0 pointer-events-none"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            <defs>
              <mask id={`insta-mask-${manifest.id}`}>
                <rect width="1000" height="1000" fill="white" />
                <rect
                  x={((100 - geometry.holeWindowZone.widthPct) / 2) * 10}
                  y={(geometry.holeWindowZone.yPct - (geometry.holeWindowZone.heightPct / 2)) * 10}
                  width={geometry.holeWindowZone.widthPct * 10}
                  height={geometry.holeWindowZone.heightPct * 10}
                  rx={geometry.holeWindowZone.roundness * 2.5}
                  ry={geometry.holeWindowZone.roundness * 2.5}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="1000"
              height="1000"
              fill={geometry.holeWindowZone.cardBgColor || '#FFFFFF'}
              mask={`url(#insta-mask-${manifest.id})`}
            />
          </svg>

          {/* 중앙 구멍 윈도우 테두리 & 인터랙션 클릭 존 */}
          <div
            onClick={() => isInteractive && onSelectZone?.('holeWindow')}
            className={cn(
              "absolute cursor-pointer pointer-events-auto transition-all",
              selectedZone === 'holeWindow' && isInteractive && "ring-2 ring-sky-400 ring-offset-2"
            )}
            style={{
              top: `${geometry.holeWindowZone.yPct - (geometry.holeWindowZone.heightPct / 2)}%`,
              height: `${geometry.holeWindowZone.heightPct}%`,
              left: `${(100 - geometry.holeWindowZone.widthPct) / 2}%`,
              right: `${(100 - geometry.holeWindowZone.widthPct) / 2}%`,
              borderRadius: `${geometry.holeWindowZone.roundness}px`,
              border: `${geometry.holeWindowZone.borderWidth}px solid ${geometry.holeWindowZone.borderColor}`,
              boxShadow: geometry.holeWindowZone.shadow
                ? '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                : undefined,
            }}
            title="중앙 구멍 윈도우 (클릭하여 설정)"
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. LAYER 1: 상단 배경 바 & 대제목 (TransformGizmo 장착)     */}
      {/* ─────────────────────────────────────────────────────────── */}
      {geometry.topTitleZone.enabled && (
        <div
          onClick={() => isInteractive && onSelectZone?.('topTitle')}
          className="absolute left-0 right-0 select-none transition-all z-25 pointer-events-auto cursor-pointer"
          style={{
            top: `${geometry.topTitleZone.topPct}%`,
            height: `${geometry.topTitleZone.heightPct}%`,
            backgroundColor: geometry.topTitleZone.bgColor,
            borderBottom: showGuidelines && archetype !== 'instagram' ? '1px dashed rgba(255,255,255,0.2)' : 'none',
          }}
          title="상단 배경 영역 (클릭하여 설정)"
        />
      )}

      {geometry.topTitleZone.enabled && (
        <TransformGizmo
          transform={{
            xPct: 50,
            yPct: Math.round((geometry.topTitleZone.topPct + (geometry.topTitleZone.heightPct / 2)) * 10) / 10,
            scale: (style.titleFontSize || 32) / 32,
            rotationDeg: 0,
            widthPct: 92,
            heightPct: geometry.topTitleZone.heightPct,
            isFlippedH: false,
            opacity: 1,
            zIndex: 30,
          }}
          selected={selectedZone === 'topTitle'}
          name="상단 대제목 (Title)"
          canvasScale={scale}
          onSelect={() => isInteractive && onSelectZone?.('topTitle')}
          onChange={(newT) => {
            if (!onUpdateManifest) return;
            onUpdateManifest(prev => ({
              ...prev,
              geometry: {
                ...prev.geometry,
                topTitleZone: {
                  ...prev.geometry.topTitleZone,
                  topPct: Math.max(0, Math.min(60, Math.round((newT.yPct - (prev.geometry.topTitleZone.heightPct / 2)) * 10) / 10)),
                }
              },
              style: {
                ...prev.style,
                titleFontSize: Math.max(16, Math.min(64, Math.round(newT.scale * 32))),
              }
            }));
          }}
        >
          {archetype === 'instagram' ? (
            /* 인스타형 프로필 헤더 */
            <div className="w-full flex items-center justify-between px-2 pt-1 select-none">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full border-2 border-blue-500 overflow-hidden bg-white shadow-xs shrink-0 flex items-center justify-center">
                  <img
                    src="https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue"
                    alt="Avatar"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-zinc-900 leading-tight">
                    {sampleContent.profileName}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {sampleContent.profileHandle}
                  </span>
                </div>
              </div>
              <button type="button" className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition pointer-events-none">
                팔로우
              </button>
            </div>
          ) : (
            /* 대제목 (1줄/2줄 모드 & 배경 스타일 & 뱃지) */
            <div
              className={cn(
                "flex flex-col items-center text-center leading-tight transition-all select-none",
                titleBgMode === 'box' && "px-4 py-2 shadow-lg",
                titleBgMode === 'pill' && "px-5 py-2 rounded-full shadow-lg",
                titleBgMode === 'highlighter' && "px-3 py-1 shadow-xs border-b-4 border-amber-400",
                titleBgMode === 'glass' && "px-4 py-2 rounded-xl backdrop-blur-md bg-black/40 border border-white/20 shadow-xl"
              )}
              style={{
                backgroundColor: titleBgMode === 'box' || titleBgMode === 'pill'
                  ? (style.titleBgColor || '#000000')
                  : undefined,
                borderRadius: titleBgMode === 'box' ? `${style.titleBorderRadius || 4}px` : undefined,
              }}
            >
              {/* 상단 뱃지 */}
              {style.titleBadgeText && (
                <span
                  className="text-[9px] font-black px-2 py-0.5 uppercase tracking-wider mb-1 rounded-[2px] shadow-xs"
                  style={{
                    backgroundColor: style.titleBadgeColor || '#EF4444',
                    color: '#FFFFFF',
                  }}
                >
                  {style.titleBadgeText}
                </span>
              )}

              {/* 1줄 텍스트 */}
              <span
                className="font-black tracking-tight whitespace-pre-line"
                style={{
                  color: style.titleLine1Color,
                  fontSize: `${Math.round((style.titleFontSize || 32) * (canvasWidth / 1080) * 1.7)}px`,
                  fontFamily: style.titleFont,
                  lineHeight: 1.15,
                  textShadow: style.titleShadow ? `0 2px ${style.titleShadowBlur}px ${style.titleShadowColor}` : 'none',
                  WebkitTextStroke: style.titleStroke ? `${style.titleStrokeWidth}px ${style.titleStrokeColor}` : 'none',
                }}
              >
                {sampleContent.titleLine1}
              </span>

              {/* 2줄 텍스트 (double 모드일 때 표시) */}
              {titleLinesMode === 'double' && (
                <span
                  className="font-black tracking-tight whitespace-pre-line mt-0.5"
                  style={{
                    color: style.titleLine2Color,
                    fontSize: `${Math.round((style.titleLine2FontSize || style.titleFontSize || 32) * (canvasWidth / 1080) * 1.7)}px`,
                    fontFamily: style.titleFont,
                    lineHeight: 1.15,
                    textShadow: style.titleShadow ? `0 2px ${style.titleShadowBlur}px ${style.titleShadowColor}` : 'none',
                    WebkitTextStroke: style.titleStroke ? `${style.titleStrokeWidth}px ${style.titleStrokeColor}` : 'none',
                  }}
                >
                  {sampleContent.titleLine2}
                </span>
              )}
            </div>
          )}
        </TransformGizmo>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 4. LAYER 2: [군림보/속보형 특화] 소제목 후킹 밴드             */}
      {/* ─────────────────────────────────────────────────────────── */}
      {archetype === 'gunlimbo' && geometry.hookBandZone?.enabled && (
        <div
          onClick={() => isInteractive && onSelectZone?.('hookBand')}
          className={cn(
            "absolute left-0 right-0 flex items-center justify-center shadow-md transition-all cursor-pointer z-35",
            selectedZone === 'hookBand' && isInteractive && "ring-2 ring-sky-400"
          )}
          style={{
            top: `${geometry.hookBandZone.topPct}%`,
            height: `${geometry.hookBandZone.heightPct}%`,
            backgroundColor: geometry.hookBandZone.bgBarColor || '#3F3F46',
            borderBottom: showGuidelines ? '1px dashed rgba(255,255,255,0.2)' : 'none',
            opacity: isDuringIntro || !isInteractive ? 1 : 0.35,
          }}
          title="소제목 후킹 밴드 (클릭하여 설정)"
        >
          <div
            className="w-full flex items-center justify-center py-1.5 px-3 shadow-xs transition-all"
            style={{
              backgroundColor: geometry.hookBandZone.boxColor || '#FFFFFF',
            }}
          >
            <span
              className="font-black tracking-tight text-center leading-snug break-keep select-none"
              style={{
                color: geometry.hookBandZone.textColor || '#000000',
                fontSize: `${Math.round((style.hookFontSize || 22) * (canvasWidth / 1080) * 1.6)}px`,
                fontFamily: style.hookFont || style.titleFont,
              }}
            >
              {sampleContent.hookPhrase}
            </span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 5. LAYER 2.5: 긴박 쨉쨉이 훅 (TransformGizmo 장착)          */}
      {/* ─────────────────────────────────────────────────────────── */}
      {geometry.jabHookZone?.enabled && (
        <TransformGizmo
          transform={{
            xPct: geometry.jabHookZone.xPct ?? 50,
            yPct: geometry.jabHookZone.yPct ?? 24,
            scale: (geometry.jabHookZone.fontSize || 20) / 20,
            rotationDeg: geometry.jabHookZone.tiltDeg ?? 0,
            widthPct: 80,
            heightPct: 10,
            isFlippedH: false,
            opacity: 1,
            zIndex: 42,
          }}
          selected={selectedZone === 'jabHook'}
          name="긴박 쨉쨉이 훅 (Jab Hook)"
          canvasScale={scale}
          onSelect={() => isInteractive && onSelectZone?.('jabHook')}
          onChange={(newT) => {
            if (!onUpdateManifest) return;
            onUpdateManifest(prev => ({
              ...prev,
              geometry: {
                ...prev.geometry,
                jabHookZone: {
                  ...(prev.geometry.jabHookZone || { enabled: true }),
                  xPct: Math.max(5, Math.min(95, Math.round(newT.xPct * 10) / 10)),
                  yPct: Math.max(5, Math.min(95, Math.round(newT.yPct * 10) / 10)),
                  tiltDeg: newT.rotationDeg,
                  fontSize: Math.max(12, Math.min(48, Math.round(newT.scale * 20))),
                }
              }
            }));
          }}
        >
          <div
            className="font-black px-3.5 py-1.5 flex items-center justify-center whitespace-nowrap shadow-xl transition-all select-none"
            style={{
              backgroundColor: geometry.jabHookZone.bgEnabled ? geometry.jabHookZone.bgColor : 'transparent',
              borderRadius: `${geometry.jabHookZone.borderRadius || 4}px`,
              boxShadow: geometry.jabHookZone.shadow ? `0 4px ${geometry.jabHookZone.shadowBlur * 2}px rgba(0,0,0,0.85)` : 'none',
              border: (geometry.jabHookZone.bgEnabled && geometry.jabHookZone.stroke) ? '1px solid rgba(0,0,0,0.2)' : 'none',
            }}
          >
            <span
              style={{
                fontSize: `${Math.round((geometry.jabHookZone.fontSize || 20) * (canvasWidth / 1080) * 1.6)}px`,
                color: geometry.jabHookZone.textColor || '#FFFFFF',
                fontFamily: style.titleFont,
                WebkitTextStroke: geometry.jabHookZone.stroke ? `${geometry.jabHookZone.strokeWidth}px ${geometry.jabHookZone.strokeColor}` : 'none',
                paintOrder: 'stroke fill',
                textShadow: geometry.jabHookZone.shadow ? `0 2px ${geometry.jabHookZone.shadowBlur}px rgba(0,0,0,0.9)` : 'none',
              }}
            >
              {geometry.jabHookZone.text || sampleContent.hookPhrase}
            </span>
          </div>
        </TransformGizmo>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 6. LAYER 3: 본문 자막 (TransformGizmo 장착)                 */}
      {/* ─────────────────────────────────────────────────────────── */}
      {geometry.captionZone.enabled && !isCaptionHidden && (
        <TransformGizmo
          transform={{
            xPct: 50,
            yPct: geometry.captionZone.safeZoneYPct,
            scale: (style.captionFontSize || 20) / 20,
            rotationDeg: 0,
            widthPct: 90,
            heightPct: 12,
            isFlippedH: false,
            opacity: 1,
            zIndex: 40,
          }}
          selected={selectedZone === 'caption'}
          name="본문 자막 (Subtitle)"
          canvasScale={scale}
          onSelect={() => isInteractive && onSelectZone?.('caption')}
          onChange={(newT) => {
            if (!onUpdateManifest) return;
            onUpdateManifest(prev => ({
              ...prev,
              geometry: {
                ...prev.geometry,
                captionZone: {
                  ...prev.geometry.captionZone,
                  safeZoneYPct: Math.max(10, Math.min(95, Math.round(newT.yPct * 10) / 10)),
                }
              },
              style: {
                ...prev.style,
                captionFontSize: Math.max(12, Math.min(40, Math.round(newT.scale * 20))),
              }
            }));
          }}
        >
          <div
            className={cn(
              "font-black leading-snug tracking-tight text-center px-3 py-1 select-none",
              style.captionUseBox && "rounded shadow-md"
            )}
            style={{
              color: style.captionDefaultColor,
              fontSize: `${Math.round((style.captionFontSize || 20) * (canvasWidth / 1080) * 1.65)}px`,
              fontFamily: style.captionFont,
              backgroundColor: style.captionUseBox ? style.captionBoxColor : 'transparent',
              textShadow: style.captionShadowBlur > 0 ? `0 2px ${style.captionShadowBlur}px ${style.captionShadowColor}` : 'none',
              WebkitTextStroke: style.captionStrokeWidth > 0 ? `${style.captionStrokeWidth}px ${style.captionStrokeColor}` : 'none',
            }}
          >
            {sampleContent.captionText}
          </div>
        </TransformGizmo>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 7. LAYER 4: 가변 댓글 카드 (TransformGizmo 장착)            */}
      {/* ─────────────────────────────────────────────────────────── */}
      {geometry.commentCardZone?.enabled && (
        <TransformGizmo
          transform={{
            xPct: geometry.commentCardZone.xPct ?? 50,
            yPct: geometry.commentCardZone.yPct ?? 80,
            scale: (geometry.commentCardZone.scale || 100) / 100,
            rotationDeg: 0,
            widthPct: 88,
            heightPct: 20,
            isFlippedH: false,
            opacity: 1,
            zIndex: 45,
          }}
          selected={selectedZone === 'commentCard'}
          name="하단 바이럴 댓글 카드"
          canvasScale={scale}
          onSelect={() => isInteractive && onSelectZone?.('commentCard')}
          onChange={(newT) => {
            if (!onUpdateManifest) return;
            onUpdateManifest(prev => ({
              ...prev,
              geometry: {
                ...prev.geometry,
                commentCardZone: {
                  ...(prev.geometry.commentCardZone || { enabled: true, theme: 'yt-dark' }),
                  xPct: Math.max(5, Math.min(95, Math.round(newT.xPct * 10) / 10)),
                  yPct: Math.max(10, Math.min(95, Math.round(newT.yPct * 10) / 10)),
                  scale: Math.max(50, Math.min(150, Math.round(newT.scale * 100))),
                }
              }
            }));
          }}
        >
          <div
            className={cn(
              "p-2.5 shadow-xl flex items-start gap-2.5 select-none transition-all",
              geometry.commentCardZone.theme === 'yt-dark' && "bg-zinc-900/95 border border-zinc-700 text-zinc-100 rounded-lg",
              geometry.commentCardZone.theme === 'yt-light' && "bg-zinc-100/95 border border-zinc-300 text-zinc-900 rounded-lg",
              geometry.commentCardZone.theme === 'insta' && "bg-white/95 border border-zinc-200 text-zinc-900 rounded-xl",
              geometry.commentCardZone.theme === 'glass' && "bg-black/60 border border-white/20 text-white rounded-xl backdrop-blur-md"
            )}
          >
            {/* 아바타 */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-[11px] overflow-hidden mt-0.5",
              geometry.commentCardZone.theme === 'insta' ? "border border-zinc-200 bg-zinc-100" : "bg-primary text-primary-foreground"
            )}>
              {geometry.commentCardZone.theme === 'insta' ? (
                <img src="https://api.dicebear.com/9.x/bottts/svg?seed=commenter" alt="Avatar" className="w-full h-full object-cover pointer-events-none" />
              ) : (
                (geometry.commentCardZone.author || sampleContent.commentAuthor).charAt(0)
              )}
            </div>

            {/* 본문 정보 */}
            <div className="flex flex-col text-left overflow-hidden flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-[11px] font-bold leading-tight truncate",
                  geometry.commentCardZone.blurId && "blur-[3px]"
                )}>
                  {geometry.commentCardZone.anonymous ? '익명_유저' : (geometry.commentCardZone.author || sampleContent.commentAuthor)}
                </span>
                <span className={cn(
                  "text-[9px] opacity-60 font-mono truncate",
                  geometry.commentCardZone.blurId && "blur-[3px]"
                )}>
                  {geometry.commentCardZone.anonymous ? '@user_***' : (geometry.commentCardZone.handle || sampleContent.profileHandle)}
                </span>
                <span className="text-[9px] opacity-50 shrink-0 ml-auto">{geometry.commentCardZone.timeText || '3시간 전'}</span>
              </div>
              <p className="text-[10.5px] leading-snug break-keep line-clamp-2 mt-1 opacity-90">
                {geometry.commentCardZone.text || sampleContent.commentText}
              </p>
              {/* 하단 좋아요 & 답글 바 */}
              <div className="flex items-center justify-between text-[9px] opacity-75 pt-1.5 mt-1 border-t border-current/10">
                <span className="flex items-center gap-1 font-semibold">
                  {geometry.commentCardZone.theme === 'insta' ? '❤️' : '👍'} {geometry.commentCardZone.likes || '1.4만'}
                </span>
                <span className="text-[8px] bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded-xs">
                  📌 베댓
                </span>
              </div>
            </div>
          </div>
        </TransformGizmo>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 8. LAYER 5: 하단 출처 표기 (TransformGizmo 장착)            */}
      {/* ─────────────────────────────────────────────────────────── */}
      {geometry.sourceZone?.enabled && (
        <TransformGizmo
          transform={{
            xPct: 50,
            yPct: geometry.sourceZone.yPct ?? 94,
            scale: (geometry.sourceZone.fontSize || 11) / 11,
            rotationDeg: 0,
            widthPct: 80,
            heightPct: 5,
            isFlippedH: false,
            opacity: 1,
            zIndex: 35,
          }}
          selected={selectedZone === 'source'}
          name="하단 출처 표기 바"
          canvasScale={scale}
          onSelect={() => isInteractive && onSelectZone?.('source')}
          onChange={(newT) => {
            if (!onUpdateManifest) return;
            onUpdateManifest(prev => ({
              ...prev,
              geometry: {
                ...prev.geometry,
                sourceZone: {
                  ...(prev.geometry.sourceZone || { enabled: true, defaultText: '출처' }),
                  yPct: Math.max(10, Math.min(99, Math.round(newT.yPct * 10) / 10)),
                  fontSize: Math.max(8, Math.min(20, Math.round(newT.scale * 11))),
                }
              }
            }));
          }}
        >
          <div
            className="px-2.5 py-0.5 flex items-center justify-center select-none"
            style={{
              backgroundColor: geometry.sourceZone.bgEnabled ? (geometry.sourceZone.bgColor || 'rgba(0,0,0,0.6)') : 'transparent',
              borderRadius: `${geometry.sourceZone.borderRadius || 2}px`,
            }}
          >
            <span
              className="font-medium text-center"
              style={{
                color: geometry.sourceZone.textColor || '#94A3B8',
                fontSize: `${geometry.sourceZone.fontSize || 11}px`,
              }}
            >
              {geometry.sourceZone.defaultText}
            </span>
          </div>
        </TransformGizmo>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 9. OVERLAY: 📱 쇼츠 안전영역 (실측 모바일 UI 가림 영역)      */}
      {/* ─────────────────────────────────────────────────────────── */}
      {(safeZoneVisible || platformSafeZone === 'youtube_shorts') && aspectRatio === '9:16' && (
        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-amber-500/70 z-50 bg-amber-500/[0.03] flex flex-col justify-between p-2 select-none">
          <div className="bg-black/85 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-[2px] border border-amber-500/40 self-center shadow-md">
            ⚠️ 상단 10% 헤더·검색 영역 (텍스트 금지)
          </div>
          <div className="flex justify-between items-end pb-1">
            <div className="bg-black/85 text-amber-300 text-[8px] font-bold p-1 rounded-[2px] border border-amber-500/40 max-w-[130px] leading-tight shadow-md">
              ⚠️ 하단 제목 & 사운드 UI
            </div>
            <div className="bg-black/85 text-amber-300 text-[8px] font-bold p-1 rounded-[2px] border border-amber-500/40 text-right leading-tight shadow-md">
              ⚠️ 우측 인터랙션 바<br/>(좋아요·댓글·공유)
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 10. OVERLAY: 📐 프로 3분할선 및 센터 십자선 가이드 오버레이 */}
      {/* ─────────────────────────────────────────────────────────── */}
      {showGuidelines && (
        <div className="absolute inset-0 pointer-events-none z-45">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400/40 border-r border-dashed border-cyan-400/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-cyan-400/40 border-r border-dashed border-cyan-400/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-cyan-400/40 border-b border-dashed border-cyan-400/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-cyan-400/40 border-b border-dashed border-cyan-400/30" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 pointer-events-none flex items-center justify-center">
            <div className="w-6 h-px bg-red-500/70" />
            <div className="h-6 w-px bg-red-500/70 absolute" />
          </div>
        </div>
      )}
    </div>
  );
};
