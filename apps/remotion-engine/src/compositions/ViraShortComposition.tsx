import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Video,
  Img,
} from "remotion";

export interface SubtitleItem {
  text: string;
  startMs: number;
  endMs: number;
}

export interface JabOverlay {
  text: string;
  startMs: number;
  endMs: number;
  color?: string;
  bgColor?: string;
  placement?: "center" | "top-third" | "center-left" | "center-right" | "above-subtitle";
  tiltDeg?: number;
}

export type SubtitleStylePreset =
  | "shorts"
  | "humor"
  | "mystery"
  | "knowledge"
  | "drama"
  | "custom";

export interface ViraShortProps {
  // Media Sources
  videoSource?: string;
  imageSource?: string;
  audioSource?: string;
  ambientAudioSource?: string;
  finalMixedAudio?: string;
  bgmSource?: string;
  muteOriginalVideo?: boolean;

  // Visual Topology & Lego Blocks
  canvasType?: "FULL_BLEED_OVERLAY" | "LETTERBOX_SOLID";
  
  // 1. Top Header Block
  hasTopHeader?: boolean;
  topHeaderHeightPct?: number; // default 16%
  topHeaderBg?: string; // e.g. "#000000" or "rgba(10,15,25,0.85)"
  titleLine1?: string;
  titleLine2?: string;
  titleLine1Color?: string;
  titleLine2Color?: string;

  // 2. Bottom Credit / Source Bar Block
  hasBottomCredit?: boolean;
  bottomCreditText?: string; // e.g. "출처: YouTube @youquizontheblock"
  bottomCreditBg?: string;
  bottomCreditHeightPct?: number; // default 6%

  // 3. Subtitle Block
  subtitles?: SubtitleItem[];
  subtitleYPercent?: number; // default 68.5%
  stylePreset?: SubtitleStylePreset;

  // 4. Jab Hook Block
  jabOverlay?: JabOverlay;

  // 5. Cinematic Filters
  enableHorizontalFlip?: boolean;
  filmFilter?: "none" | "warm" | "cool" | "contrast";
}

// 6대 바이럴 자막 테마
const PRESET_STYLES: Record<
  SubtitleStylePreset,
  {
    subColor: string;
    subStroke: string;
    subBg: string;
    subFontSize: number;
    head1Color: string;
    head2Color: string;
    headBg: string;
    jabColor: string;
    jabBorder: string;
    jabBg: string;
  }
> = {
  shorts: {
    subColor: "#FFFFFF",
    subStroke: "#000000",
    subBg: "rgba(0, 0, 0, 0.45)",
    subFontSize: 50,
    head1Color: "#FFFFFF",
    head2Color: "#F5F420", // Neon Lemon Yellow
    headBg: "#000000",
    jabColor: "#F5F420",
    jabBorder: "#F5F420",
    jabBg: "rgba(0, 0, 0, 0.88)",
  },
  humor: {
    subColor: "#00FFCC",
    subStroke: "#000000",
    subBg: "rgba(10, 10, 20, 0.7)",
    subFontSize: 52,
    head1Color: "#FFE600",
    head2Color: "#FF007F",
    headBg: "#0B0C10",
    jabColor: "#FF007F",
    jabBorder: "#FFE600",
    jabBg: "rgba(20, 0, 30, 0.9)",
  },
  mystery: {
    subColor: "#FFFFFF",
    subStroke: "#111111",
    subBg: "rgba(0, 0, 0, 0.75)",
    subFontSize: 48,
    head1Color: "#D3D3D3",
    head2Color: "#FF3333",
    headBg: "#050508",
    jabColor: "#FF3333",
    jabBorder: "#FFFFFF",
    jabBg: "rgba(20, 0, 0, 0.92)",
  },
  knowledge: {
    subColor: "#00FF66",
    subStroke: "#002B11",
    subBg: "rgba(0, 20, 10, 0.65)",
    subFontSize: 48,
    head1Color: "#00E5FF",
    head2Color: "#00FF66",
    headBg: "#020D1A",
    jabColor: "#00E5FF",
    jabBorder: "#00FF66",
    jabBg: "rgba(0, 30, 40, 0.9)",
  },
  drama: {
    subColor: "#FFF8E7",
    subStroke: "#2B2010",
    subBg: "rgba(30, 20, 10, 0.55)",
    subFontSize: 46,
    head1Color: "#F5E6CC",
    head2Color: "#FFB300",
    headBg: "#120E0A",
    jabColor: "#FFD54F",
    jabBorder: "#FFA000",
    jabBg: "rgba(25, 18, 10, 0.88)",
  },
  custom: {
    subColor: "#FFFFFF",
    subStroke: "#000000",
    subBg: "rgba(0, 0, 0, 0.45)",
    subFontSize: 50,
    head1Color: "#FFFFFF",
    head2Color: "#F5F420",
    headBg: "#000000",
    jabColor: "#F5F420",
    jabBorder: "#F5F420",
    jabBg: "rgba(0, 0, 0, 0.88)",
  },
};

export const ViraShortComposition: React.FC<ViraShortProps> = ({
  videoSource,
  imageSource,
  audioSource,
  ambientAudioSource,
  finalMixedAudio,
  bgmSource,
  muteOriginalVideo = true,

  // Visual Topology
  canvasType = "LETTERBOX_SOLID",
  hasTopHeader = true,
  topHeaderHeightPct = 16,
  topHeaderBg,
  titleLine1 = "늦둥이 여동생을",
  titleLine2 = "지키는 오빠들",
  titleLine1Color,
  titleLine2Color,

  hasBottomCredit = false,
  bottomCreditText,
  bottomCreditBg = "#000000",
  bottomCreditHeightPct = 6,

  subtitles = [],
  subtitleYPercent = 68.5,
  stylePreset = "shorts",

  jabOverlay = {
    text: "*여동생을 향해 전력 질주*",
    startMs: 8200,
    endMs: 13000,
    placement: "center-left",
    tiltDeg: -3,
  },

  enableHorizontalFlip = false,
  filmFilter = "none",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  const theme = PRESET_STYLES[stylePreset] || PRESET_STYLES.shorts;

  // Dynamic Layout Calculations
  const isFullBleed = canvasType === "FULL_BLEED_OVERLAY";
  const topOffset = isFullBleed || !hasTopHeader ? 0 : topHeaderHeightPct;
  const bottomOffset = isFullBleed || !hasBottomCredit ? 0 : bottomCreditHeightPct;
  const mediaHeight = 100 - topOffset - bottomOffset;

  // 1. Ken-Burns subtle zoom
  const zoomScale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  // 2. Jab Overlay Active Check & Pulse
  const isJabActive =
    jabOverlay &&
    currentTimeMs >= jabOverlay.startMs &&
    currentTimeMs <= jabOverlay.endMs;

  const jabPulse = isJabActive ? 1.0 + Math.sin(frame * 0.8) * 0.025 : 1.0;

  // 3. Current active subtitle
  const activeSubtitle = subtitles.find(
    (sub) => currentTimeMs >= sub.startMs && currentTimeMs <= sub.endMs
  );

  // Jab Positioning Rules
  const getJabStyle = () => {
    const p = jabOverlay.placement || "center-left";
    const tilt = jabOverlay.tiltDeg !== undefined ? jabOverlay.tiltDeg : -3;
    let topVal = "38%";
    let leftVal = "8%";
    let rightVal = "8%";

    if (p === "top-third") topVal = "25%";
    else if (p === "center-left") { topVal = "40%"; leftVal = "6%"; rightVal = "28%"; }
    else if (p === "center-right") { topVal = "40%"; leftVal = "28%"; rightVal = "6%"; }
    else if (p === "above-subtitle") topVal = `${subtitleYPercent - 12}%`;

    return {
      position: "absolute" as const,
      top: topVal,
      left: leftVal,
      right: rightVal,
      transform: `rotate(${tilt}deg)`,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 40,
    };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000", overflow: "hidden" }}>
      {/* Main Media Canvas (Offset by Header / Bottom Bar) */}
      <AbsoluteFill
        style={{
          top: `${topOffset}%`,
          height: `${mediaHeight}%`,
          transform: `scale(${zoomScale * jabPulse}) ${enableHorizontalFlip ? "scaleX(-1)" : ""}`,
          transformOrigin: "center center",
          justifyContent: "center",
          alignItems: "center",
          filter: filmFilter === "warm" ? "sepia(0.15) contrast(1.08)" : filmFilter === "cool" ? "hue-rotate(180deg) contrast(1.1)" : "none",
        }}
      >
        {videoSource ? (
          <Video
            src={videoSource}
            loop={true}
            volume={muteOriginalVideo ? 0 : 1}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : imageSource ? (
          <Img
            src={imageSource}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #1e1e2f 0%, #0d0d15 100%)",
            }}
          />
        )}
      </AbsoluteFill>

      {/* Cinematic Vignette Overlay */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 🧩 1. Top Header Block */}
      {hasTopHeader && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: `${topHeaderHeightPct}%`,
            backgroundColor: topHeaderBg || theme.headBg,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 30,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
              fontSize: 52,
              fontWeight: 800,
              color: titleLine1Color || theme.head1Color,
              letterSpacing: "-1px",
              lineHeight: 1.15,
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
            }}
          >
            {titleLine1}
          </div>
          <div
            style={{
              fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
              fontSize: 58,
              fontWeight: 900,
              color: titleLine2Color || theme.head2Color,
              letterSpacing: "-1px",
              lineHeight: 1.15,
              textShadow: "0 2px 10px rgba(0,0,0,0.9)",
            }}
          >
            {titleLine2}
          </div>
        </div>
      )}

      {/* 🧩 2. Jab Pop-up Overlay with Dynamic Placement & Tilt */}
      {isJabActive && jabOverlay && (
        <div style={getJabStyle()}>
          <div
            style={{
              backgroundColor: jabOverlay.bgColor || theme.jabBg,
              border: `3px solid ${jabOverlay.color || theme.jabBorder}`,
              borderRadius: 14,
              padding: "14px 28px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.95)",
            }}
          >
            <span
              style={{
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                fontSize: 48,
                fontWeight: 900,
                color: jabOverlay.color || theme.jabColor,
                letterSpacing: "-0.5px",
                textShadow: "0 2px 12px rgba(0,0,0,0.9)",
              }}
            >
              {jabOverlay.text}
            </span>
          </div>
        </div>
      )}

      {/* 🧩 3. Subtitle Block with Optimal Safe-Zone */}
      {activeSubtitle && (
        <div
          style={{
            position: "absolute",
            top: `${subtitleYPercent}%`,
            left: "5%",
            right: "5%",
            textAlign: "center",
            zIndex: 35,
          }}
        >
          <span
            style={{
              fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
              fontSize: theme.subFontSize,
              fontWeight: 900,
              color: theme.subColor,
              textShadow: `-3px -3px 0 ${theme.subStroke}, 3px -3px 0 ${theme.subStroke}, -3px 3px 0 ${theme.subStroke}, 3px 3px 0 ${theme.subStroke}, 0 6px 15px rgba(0,0,0,0.9)`,
              backgroundColor: theme.subBg,
              padding: "10px 24px",
              borderRadius: 16,
              display: "inline-block",
              lineHeight: 1.35,
            }}
          >
            {activeSubtitle.text}
          </span>
        </div>
      )}

      {/* 🧩 4. Bottom Credit / Source Bar Block */}
      {hasBottomCredit && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${bottomCreditHeightPct}%`,
            backgroundColor: bottomCreditBg,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 30,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span
            style={{
              fontFamily: "'Pretendard', sans-serif",
              fontSize: 26,
              color: "rgba(255, 255, 255, 0.7)",
              letterSpacing: "-0.5px",
            }}
          >
            {bottomCreditText || "출처: 원본 비하인드 공식 영상"}
          </span>
        </div>
      )}

      {/* Audio Tracks */}
      {finalMixedAudio ? (
        <Audio src={finalMixedAudio} volume={1.0} />
      ) : (
        <>
          {ambientAudioSource && <Audio src={ambientAudioSource} volume={0.8} />}
          {audioSource && <Audio src={audioSource} volume={1.0} />}
        </>
      )}
      {bgmSource && (
        <Audio src={bgmSource} volume={audioSource || finalMixedAudio ? 0.15 : 0.4} />
      )}
    </AbsoluteFill>
  );
};
