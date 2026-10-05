import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Video,
  Img,
} from "remotion";
import { CaptionTheme } from "../vendor/remotion-captions-themes/CaptionTheme";
import { CaptionsData } from "../vendor/remotion-captions-themes/types";
import {
  GunlimboHookBandOverlay,
  GunlimboHookBandConfig,
} from "../components/GunlimboHookBandOverlay";
import {
  InstagramProfileOverlay,
  InstagramCommentCardOverlay,
  InstagramProfileConfig,
  InstagramCommentCardConfig,
} from "../components/InstagramOverlays";
import {
  SsulCommunityHeaderOverlay,
  SsulPostMetaOverlay,
  SsulCumulativeSubtitles,
  SsulHeaderConfig,
  SsulPostMetaConfig,
  SsulCumulativeConfig,
} from "../components/SsulOverlays";
import "../styles/fonts.css";

export interface SubtitleCue {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string; // e.g. "narrator", "character_main", "character_sub", "reaction_shock"
  color?: string; // explicit color override e.g. "#FFFFFF", "#FFE500", "#38BDF8"
  animation?: "pop" | "bounce" | "shake" | "zoom_in" | "slide_up" | "none";
}

export interface SpeakerStyle {
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  defaultAnimation?: "pop" | "bounce" | "shake" | "zoom_in" | "slide_up" | "none";
}

export const defaultSpeakerPalette: Record<string, SpeakerStyle> = {
  narrator: { color: "#FFFFFF", strokeColor: "#000000", strokeWidth: 7.5, defaultAnimation: "pop" },
  character_main: { color: "#FFE500", strokeColor: "#000000", strokeWidth: 7.5, defaultAnimation: "bounce" },
  character_sub: { color: "#38BDF8", strokeColor: "#000000", strokeWidth: 7.5, defaultAnimation: "pop" },
  character_female: { color: "#FF6B81", strokeColor: "#000000", strokeWidth: 7.5, defaultAnimation: "bounce" },
  reaction_shock: { color: "#4ADE80", strokeColor: "#000000", strokeWidth: 8.0, defaultAnimation: "shake" },
};

export interface UniversalSovereignShortsProps {
  // 0. 4대 폼팩터 아키타입 선언
  archetype?: "classic" | "gunlimbo" | "insta" | "ssul";
  gunlimboConfig?: GunlimboHookBandConfig;
  instaConfig?: {
    profile?: InstagramProfileConfig;
    commentCard?: InstagramCommentCardConfig;
  };
  ssulConfig?: {
    header?: SsulHeaderConfig;
    postMeta?: SsulPostMetaConfig;
    cumulative?: SsulCumulativeConfig;
  };

  // 1. 미디어 소스
  videoSource?: string;
  imageSource?: string;
  audioSource?: string;
  bgmSource?: string;
  muteOriginalVideo?: boolean;

  // 2. 상단 레터박스 & 대제목 지오메트리 (실측 좌표 파라메트릭 주입)
  hasTopBar?: boolean;
  topBarHeight?: number; // e.g. 515 for IlbunIlcho
  topBarBgColor?: string;

  titleLine1?: string;
  titleLine1Y?: number; // e.g. 276 for IlbunIlcho (절대 Y좌표)
  titleLine1Color?: string; // e.g. "#FFE500"
  titleLine1Size?: number; // e.g. 84
  titleLine1Stroke?: number; // e.g. 5.5

  titleLine2?: string;
  titleLine2Y?: number; // e.g. 415 for IlbunIlcho (절대 Y좌표)
  titleLine2Color?: string; // e.g. "#FF2222"
  titleLine2Size?: number; // e.g. 76
  titleLine2Stroke?: number; // e.g. 5.5

  titleFontFamily?: string; // e.g. "'YeogiOttaeJalnan', sans-serif"

  // 3. 중앙 비디오 캔버스 지오메트리
  videoTop?: number; // e.g. 515 (topBarHeight와 자동 연동)
  videoHeight?: number; // e.g. 937 (1920 - topBar - bottomBar)
  videoScaleMode?: "cover" | "contain";

  // 4. 하단 자막 지오메트리 & 화자별 팰릿 (실측치 반영)
  subtitles?: SubtitleCue[];
  speakerPalette?: Record<string, SpeakerStyle>;
  subtitleBottom?: number; // e.g. 549 for IlbunIlcho (1920 - 1371)
  subtitleY?: number; // or absolute Y (e.g. 1297)
  subtitleFontSize?: number; // e.g. 68
  subtitleFontFamily?: string; // e.g. "'SCoreDream', sans-serif"
  subtitleBaseColor?: string; // e.g. "#FFFFFF"
  subtitleHighlightColor?: string; // e.g. "#FFE500"
  subtitleStrokeWidth?: number; // e.g. 7.5

  // 4-B. 키네틱/단어 단위 자막 테마 (remotion-captions-themes)
  captionTheme?: string; // e.g. "kinetic-01", "karaoke", "beast", "pop", "hustle"
  wordLevelCaptions?: CaptionsData;

  // 5. 쨉쨉이 (Jab/Punch 훅 팝업 오버레이)
  jabOverlay?: {
    text: string;
    startMs: number;
    endMs: number;
    color?: string;
    bgColor?: string;
    borderColor?: string;
    placement?: "top-third" | "center" | "bottom-third";
    tiltDeg?: number;
    fontSize?: number;
  };

  // 6. 하단 레터박스 & 출처 표기 지오메트리
  hasBottomBar?: boolean;
  bottomBarHeight?: number; // e.g. 468 for IlbunIlcho
  bottomBarBgColor?: string;
  sourceCreditText?: string;
  sourceCreditColor?: string;
}

export const UniversalSovereignShortsComposition: React.FC<UniversalSovereignShortsProps> = ({
  archetype = "classic",
  gunlimboConfig,
  instaConfig,
  ssulConfig,
  videoSource,
  imageSource,
  audioSource,
  bgmSource,
  muteOriginalVideo = true,

  // 상단 바 & 타이틀 (일분일초 실측 기본값, 타 채널 blueprint 시 동적 덮어쓰기)
  hasTopBar = true,
  topBarHeight = 515,
  topBarBgColor = "#000000",

  titleLine1 = "흡연자 노트북을",
  titleLine1Y = 276,
  titleLine1Color = "#FFE500",
  titleLine1Size = 84,
  titleLine1Stroke = 5.5,

  titleLine2 = "중고로 사면 생기는 일",
  titleLine2Y = 415,
  titleLine2Color = "#FF2222",
  titleLine2Size = 76,
  titleLine2Stroke = 5.5,

  titleFontFamily = "'YeogiOttaeJalnan', 'SBAggroB', sans-serif",

  // 중앙 비디오
  videoTop,
  videoHeight,
  videoScaleMode = "cover",

  // 하단 자막 (실측치 100% 반영: 에스코어드림 9, 바닥 여백 549px, 외곽선 7.5px)
  subtitles = [],
  speakerPalette = defaultSpeakerPalette,
  subtitleBottom = 549,
  subtitleFontSize = 68,
  subtitleFontFamily = "'SCoreDream', sans-serif",
  subtitleBaseColor = "#FFFFFF",
  subtitleHighlightColor = "#FFE500",
  subtitleStrokeWidth = 7.5,

  // 키네틱 자막 테마 (remotion-captions-themes)
  captionTheme,
  wordLevelCaptions,

  // 쨉쨉이 (Jab/Punch 훅 팝업 오버레이)
  jabOverlay,

  // 하단 바
  hasBottomBar = true,
  bottomBarHeight = 468,
  bottomBarBgColor = "#000000",
  sourceCreditText = "출처: 일분일초 공식",
  sourceCreditColor = "#94A3B8",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  // Calculate dynamic dimensions per form factor archetype
  const isClassic = archetype === "classic";
  const isGunlimbo = archetype === "gunlimbo";
  const isInsta = archetype === "insta";
  const isSsul = archetype === "ssul";

  // 1. Root canvas background color
  const rootCanvasBg = isInsta ? "#FFFFFF" : isSsul ? "#0B0F19" : "#000000";

  // 2. Top / Bottom Bar rules:
  // - Classic: user defined topBar (515px) & bottomBar (468px)
  // - Gunlimbo: 필수 상단 24% 블랙 배경바 (460px), 하단 바 없음
  // - Insta & Ssul: 풀 캔버스 모드 (자체 컴포넌트 헤더 사용)
  const effectiveHasTopBar = isClassic ? hasTopBar : isGunlimbo ? true : false;
  const effectiveTopBarHeight = isGunlimbo ? 460 : topBarHeight;
  const effectiveTopBarBg = isGunlimbo ? "#000000" : topBarBgColor;
  const effectiveHasBottomBar = isClassic ? hasBottomBar : false;

  // 3. Central Media Canvas geometry:
  // - Ssul: 제목 바로 아래에 텍스트가 오므로, 미디어(사진/영상/밈)는 텍스트 아래인 Y=840 ~ 1840px에 배치!
  // - Insta: 상단 프로필 아래 Y=340 ~ 1340px에 1:1 / 4:5 라운드 비디오 배치!
  // - Gunlimbo: 상단 24% 블랙바(460px) 아래부터 시작
  // - Classic: computedTop ~ computedBottom
  let computedVideoTop = videoTop;
  let computedVideoHeight = videoHeight;
  let videoBoxLeft = 0;
  let videoBoxWidth = 1080;
  let videoBorderRadius = 0;
  let videoBoxShadow = "none";

  if (isSsul) {
    computedVideoTop = videoTop !== undefined ? videoTop : 840;
    computedVideoHeight = videoHeight !== undefined ? videoHeight : 1000;
    videoBoxLeft = 30;
    videoBoxWidth = 1020;
    videoBorderRadius = 22;
    videoBoxShadow = "0 12px 36px rgba(0, 0, 0, 0.7)";
  } else if (isInsta) {
    computedVideoTop = (videoTop !== undefined && videoTop > 0) ? videoTop : 340;
    computedVideoHeight = (videoHeight !== undefined && videoHeight < 1920) ? videoHeight : 1000;
    videoBoxLeft = 40;
    videoBoxWidth = 1000;
    videoBorderRadius = 20;
    videoBoxShadow = "0 10px 30px rgba(0, 0, 0, 0.08)";
  } else if (isGunlimbo) {
    computedVideoTop = videoTop !== undefined ? videoTop : 460;
    computedVideoHeight = videoHeight !== undefined ? videoHeight : 1920 - 460;
    videoBoxLeft = 0;
    videoBoxWidth = 1080;
  } else {
    // Classic
    const computedTop = effectiveHasTopBar ? effectiveTopBarHeight : 0;
    const computedBottom = effectiveHasBottomBar ? bottomBarHeight : 0;
    computedVideoTop = videoTop !== undefined ? videoTop : computedTop;
    computedVideoHeight = videoHeight !== undefined ? videoHeight : 1920 - computedVideoTop - computedBottom;
  }

  // Ken-Burns subtle zoom
  const zoomScale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  // Active Subtitle & Speaker Styling
  const activeCue = subtitles.find(
    (cue) => currentTimeMs >= cue.startMs && currentTimeMs <= cue.endMs
  );

  const cueStartFrame = activeCue ? Math.round((activeCue.startMs / 1000) * fps) : 0;
  const relativeFrame = activeCue ? Math.max(0, frame - cueStartFrame) : 0;

  // Resolve Speaker Style
  const speakerKey = activeCue?.speaker || "narrator";
  const speakerStyle =
    (speakerPalette && speakerPalette[speakerKey]) ||
    defaultSpeakerPalette[speakerKey] ||
    defaultSpeakerPalette.narrator;

  const activeSubtitleColor = activeCue?.color || speakerStyle.color || subtitleBaseColor;
  const activeStrokeWidth = speakerStyle.strokeWidth || subtitleStrokeWidth;
  const activeAnimType = activeCue?.animation || speakerStyle.defaultAnimation || "pop";

  // Calculate Dynamics Transform
  let dynamicTransform = "scale(1.0)";
  if (activeAnimType === "bounce") {
    const bounceScale = spring({
      frame: relativeFrame,
      fps,
      config: { damping: 9, stiffness: 280, mass: 0.4 },
      from: 0.68,
      to: 1.0,
    });
    dynamicTransform = `scale(${bounceScale})`;
  } else if (activeAnimType === "shake") {
    const shakeOffset = interpolate(
      relativeFrame,
      [0, 2, 4, 6, 8, 10],
      [0, -8, 8, -5, 3, 0],
      { extrapolateRight: "clamp" }
    );
    const shakeScale = spring({
      frame: relativeFrame,
      fps,
      config: { damping: 12, stiffness: 260 },
      from: 0.9,
      to: 1.0,
    });
    dynamicTransform = `scale(${shakeScale}) translateX(${shakeOffset}px)`;
  } else if (activeAnimType === "zoom_in") {
    const zoomScale = interpolate(
      relativeFrame,
      [0, 8],
      [0.82, 1.12],
      { extrapolateRight: "clamp" }
    );
    dynamicTransform = `scale(${zoomScale})`;
  } else if (activeAnimType === "slide_up") {
    const slideY = interpolate(
      relativeFrame,
      [0, 6],
      [24, 0],
      { extrapolateRight: "clamp" }
    );
    const popSpring = spring({
      frame: relativeFrame,
      fps,
      config: { damping: 14, stiffness: 240, mass: 0.5 },
      from: 0.92,
      to: 1.0,
    });
    dynamicTransform = `translateY(${slideY}px) scale(${popSpring})`;
  } else if (activeAnimType === "none") {
    dynamicTransform = "scale(1.0)";
  } else {
    // Default "pop"
    const subSpring = spring({
      frame: relativeFrame,
      fps,
      config: { damping: 14, stiffness: 240, mass: 0.5 },
      from: 0.92,
      to: 1.0,
    });
    dynamicTransform = `scale(${subSpring})`;
  }

  // Active Jab Overlay
  const isJabActive =
    jabOverlay &&
    currentTimeMs >= jabOverlay.startMs &&
    currentTimeMs <= jabOverlay.endMs;
  const jabStartFrame = jabOverlay
    ? Math.round((jabOverlay.startMs / 1000) * fps)
    : 0;
  const jabSpring = spring({
    frame: frame - jabStartFrame,
    fps,
    config: { damping: 13, stiffness: 240, mass: 0.4 },
    from: 0.85,
    to: 1.0,
  });

  // 2-Tone Keyword Parser
  const renderFormattedSubtitle = (text: string, baseColor: string) => {
    const parts = text.split(/(\[[^\]]+\]|\*\*[^\*]+\*\*)/g);
    const hiColor = baseColor.toUpperCase() === subtitleHighlightColor.toUpperCase() ? "#38BDF8" : subtitleHighlightColor;
    return parts.map((part, idx) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const clean = part.slice(1, -1);
        return (
          <span key={idx} style={{ color: hiColor }}>
            {clean}
          </span>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        const clean = part.slice(2, -2);
        return (
          <span key={idx} style={{ color: hiColor }}>
            {clean}
          </span>
        );
      }
      return <span key={idx} style={{ color: baseColor }}>{part}</span>;
    });
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: rootCanvasBg,
        width: 1080,
        height: 1920,
        overflow: "hidden",
      }}
    >
      {/* 🎬 1. 미디어 캔버스 (사진 / 비디오 / 페페 밈) */}
      <div
        style={{
          position: "absolute",
          top: computedVideoTop,
          left: videoBoxLeft,
          width: videoBoxWidth,
          height: computedVideoHeight,
          overflow: "hidden",
          borderRadius: videoBorderRadius,
          boxShadow: videoBoxShadow,
          backgroundColor: isInsta ? "#E2E8F0" : "#050505",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${zoomScale})`,
            transformOrigin: "center center",
          }}
        >
          {videoSource ? (
            <Video
              src={videoSource}
              loop
              volume={muteOriginalVideo ? 0 : 1}
              style={{
                width: "100%",
                height: "100%",
                objectFit: videoScaleMode,
              }}
            />
          ) : imageSource ? (
            <Img
              src={imageSource}
              style={{
                width: "100%",
                height: "100%",
                objectFit: videoScaleMode,
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: isInsta
                  ? "linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)"
                  : "linear-gradient(180deg, #111827 0%, #030712 100%)",
              }}
            />
          )}
        </div>
      </div>

      {/* 🏷️ 2. 상단 레터박스 (클래식 및 군림보 24% 상단바) */}
      {effectiveHasTopBar && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1080,
            height: effectiveTopBarHeight,
            backgroundColor: effectiveTopBarBg,
            zIndex: 10,
          }}
        />
      )}

      {/* 📸 2.5. 인스타형 순백색 마스크 캔버스 (영상 상위 레이어 - 가운데 사각 구멍 윈도우 보장) */}
      {isInsta && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1080,
            height: 1920,
            pointerEvents: "none",
            zIndex: 15,
          }}
        >
          {/* 상단 순백색 마스크 (Y: 0 ~ computedVideoTop) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1080,
              height: computedVideoTop ?? 340,
              backgroundColor: "#FFFFFF",
            }}
          />
          {/* 하단 순백색 마스크 (Y: computedVideoTop + computedVideoHeight ~ 1920) */}
          <div
            style={{
              position: "absolute",
              top: (computedVideoTop ?? 340) + (computedVideoHeight ?? 1000),
              left: 0,
              width: 1080,
              height: 1920 - ((computedVideoTop ?? 340) + (computedVideoHeight ?? 1000)),
              backgroundColor: "#FFFFFF",
            }}
          />
          {/* 좌측 순백색 여백 (X: 0 ~ videoBoxLeft) */}
          {(videoBoxLeft ?? 40) > 0 && (
            <div
              style={{
                position: "absolute",
                top: computedVideoTop ?? 340,
                left: 0,
                width: videoBoxLeft ?? 40,
                height: computedVideoHeight ?? 1000,
                backgroundColor: "#FFFFFF",
              }}
            />
          )}
          {/* 우측 순백색 여백 (X: videoBoxLeft + videoBoxWidth ~ 1080) */}
          {1080 - ((videoBoxLeft ?? 40) + (videoBoxWidth ?? 1000)) > 0 && (
            <div
              style={{
                position: "absolute",
                top: computedVideoTop ?? 340,
                left: (videoBoxLeft ?? 40) + (videoBoxWidth ?? 1000),
                width: 1080 - ((videoBoxLeft ?? 40) + (videoBoxWidth ?? 1000)),
                height: computedVideoHeight ?? 1000,
                backgroundColor: "#FFFFFF",
              }}
            />
          )}
        </div>
      )}

      {/* 👑 3. 상단 1단 대제목 (클래식: Y=276, 군림보: Y=140, 인스타: Y=250) */}
      {titleLine1 && !isSsul && (
        <div
          style={{
            position: "absolute",
            top: isGunlimbo ? 140 : isInsta ? 250 : titleLine1Y,
            left: 0,
            width: 1080,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: isInsta ? "'Pretendard', sans-serif" : titleFontFamily,
              fontSize: isInsta ? 40 : titleLine1Size,
              fontWeight: 900,
              color: isInsta ? "#18181B" : titleLine1Color,
              textAlign: "center",
              lineHeight: 1.15,
              letterSpacing: "-1px",
              WebkitTextStroke: isInsta ? "0px transparent" : `${titleLine1Stroke}px #000000`,
              paintOrder: "stroke fill",
              textShadow: isInsta ? "none" : "0 4px 14px rgba(0,0,0,0.95)",
              wordBreak: "keep-all",
              maxWidth: "1000px",
              padding: isInsta ? "0 40px" : "0",
            }}
          >
            {titleLine1}
          </div>
        </div>
      )}

      {/* 👑 4. 상단 2단 소제목 (클래식: Y=415, 군림보: Y=270, 인스타 제외) */}
      {titleLine2 && !isSsul && !isInsta && (
        <div
          style={{
            position: "absolute",
            top: isGunlimbo ? 270 : titleLine2Y,
            left: 0,
            width: 1080,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: titleFontFamily,
              fontSize: titleLine2Size,
              fontWeight: 900,
              color: titleLine2Color,
              textAlign: "center",
              lineHeight: 1.0,
              letterSpacing: "-2px",
              WebkitTextStroke: `${titleLine2Stroke}px #000000`,
              paintOrder: "stroke fill",
              textShadow: "0 4px 14px rgba(0,0,0,0.95)",
              wordBreak: "keep-all",
              maxWidth: "1020px",
            }}
          >
            {titleLine2}
          </div>
        </div>
      )}

      {/* 🎯 4.4. 4대 폼팩터 전용 오버레이 레이어 */}
      {/* (1) 군림보형: 24~34% 훅 밴드 와이드 박스 */}
      {(archetype === "gunlimbo" || gunlimboConfig?.enabled) && (
        <GunlimboHookBandOverlay config={gunlimboConfig} />
      )}

      {/* (2) 인스타형: 프로필 헤더 및 댓글 카드 */}
      {(archetype === "insta" || instaConfig?.profile?.enabled) && (
        <InstagramProfileOverlay
          config={{
            topPx: 140,
            ...instaConfig?.profile,
          }}
        />
      )}
      {(archetype === "insta" || instaConfig?.commentCard?.enabled) && (
        <InstagramCommentCardOverlay
          config={{
            topPx: (computedVideoTop ?? 340) + (computedVideoHeight ?? 1000) + 24,
            ...instaConfig?.commentCard,
          }}
          activeSubtitleText={activeCue?.text}
        />
      )}

      {/* (3) 썰형: 커뮤니티 상단 헤더, 메타 태그, 자막 누적 롤링 */}
      {(archetype === "ssul" || ssulConfig?.header?.enabled) && (
        <SsulCommunityHeaderOverlay config={ssulConfig?.header} />
      )}
      {(archetype === "ssul" || ssulConfig?.postMeta?.enabled) && (
        <SsulPostMetaOverlay config={ssulConfig?.postMeta} />
      )}
      {(archetype === "ssul" || ssulConfig?.cumulative?.enabled) && (
        <SsulCumulativeSubtitles
          subtitles={subtitles}
          config={ssulConfig?.cumulative}
        />
      )}

      {/* 🥊 4.5. 쨉쨉이 (Jab/Punch 훅 팝업 오버레이 - 중간 영역 앵커링) */}
      {isJabActive && jabOverlay && (
        <div
          style={{
            position: "absolute",
            top:
              jabOverlay.placement === "center"
                ? "50%"
                : jabOverlay.placement === "bottom-third"
                ? "68%"
                : "38%",
            left: 0,
            width: 1080,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 35,
            transform: `scale(${jabSpring}) rotate(${jabOverlay.tiltDeg ?? -2.5}deg)`,
            transformOrigin: "center center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              backgroundColor: jabOverlay.bgColor || "rgba(0, 0, 0, 0.92)",
              border: `3.5px solid ${jabOverlay.borderColor || jabOverlay.color || "#FFE500"}`,
              borderRadius: 16,
              padding: "12px 32px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.9)",
            }}
          >
            <span
              style={{
                fontFamily: "'SCoreDream', 'YeogiOttaeJalnan', sans-serif",
                fontSize: jabOverlay.fontSize || 52,
                fontWeight: 900,
                color: jabOverlay.color || "#FFE500",
                letterSpacing: "-1px",
                textShadow: "0 2px 10px rgba(0,0,0,0.95)",
              }}
            >
              {jabOverlay.text}
            </span>
          </div>
        </div>
      )}

      {/* 💬 5. 하단 자막 레이어: Word-level Kinetic Themes 또는 Multi-Speaker Cue 자막 (썰형 누적 또는 인스타 댓글 카드 활성화 시는 해당 모듈이 자막 전담) */}
      {archetype !== "ssul" &&
        !(archetype === "insta" && instaConfig?.commentCard?.enabled) &&
        (captionTheme && wordLevelCaptions ? (
          <div
            style={{
              position: "absolute",
              bottom: subtitleBottom,
              left: 0,
              width: 1080,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            <CaptionTheme
              data={wordLevelCaptions}
              theme={captionTheme}
              primaryColor={activeSubtitleColor || subtitleBaseColor}
              secondaryColor={subtitleHighlightColor}
              fontSize={subtitleFontSize}
            />
          </div>
        ) : activeCue ? (
          <div
            style={{
              position: "absolute",
              bottom: subtitleBottom,
              left: 0,
              width: 1080,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 30,
              pointerEvents: "none",
              transform: dynamicTransform,
              transformOrigin: "center bottom",
            }}
          >
            <div
              style={{
                fontFamily: subtitleFontFamily,
                fontSize: subtitleFontSize,
                fontWeight: 900,
                color: activeSubtitleColor,
                textAlign: "center",
                lineHeight: 1.25,
                letterSpacing: "-0.8px",
                WebkitTextStroke: `${activeStrokeWidth}px #000000`,
                paintOrder: "stroke fill",
                textShadow: "0 2px 5px rgba(0,0,0,0.8)",
                wordBreak: "keep-all",
                padding: "0 40px",
                maxWidth: "1000px",
                whiteSpace: "pre-wrap",
              }}
            >
              {renderFormattedSubtitle(activeCue.text, activeSubtitleColor)}
            </div>
          </div>
        ) : null)}

      {/* 🛡️ 6. 하단 검정 레터박스 (실측 Y: 1452 ~ 1920, 468px 세이프존 쉴드) */}
      {hasBottomBar && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 1080,
            height: bottomBarHeight,
            backgroundColor: bottomBarBgColor,
            zIndex: 10,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: "36px",
            boxSizing: "border-box",
          }}
        >
          {sourceCreditText && (
            <div
              style={{
                fontFamily: "'Pretendard', sans-serif",
                fontSize: 24,
                color: sourceCreditColor,
                fontWeight: 500,
                letterSpacing: "-0.5px",
                zIndex: 20,
              }}
            >
              {sourceCreditText}
            </div>
          )}
        </div>
      )}

      {/* 🎵 7. 오디오 트랙 */}
      {audioSource && <Audio src={audioSource} volume={1} />}
      {bgmSource && <Audio src={bgmSource} volume={0.25} />}
    </AbsoluteFill>
  );
};
