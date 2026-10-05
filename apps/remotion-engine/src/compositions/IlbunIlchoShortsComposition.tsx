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
import "../styles/fonts.css";

export interface SubtitleCue {
  text: string;
  startMs: number;
  endMs: number;
}

export interface IlbunIlchoShortsProps {
  // 미디어 소스
  videoSource?: string;
  imageSource?: string;
  audioSource?: string;
  bgmSource?: string;
  muteOriginalVideo?: boolean;

  // 상단 2단 헤더
  titleLine1?: string;
  titleLine2?: string;
  titleLine1Color?: string;
  titleLine2Color?: string;
  titleFontSize?: number;
  titleFontFamily?: string;

  // 자막 설정
  subtitles?: SubtitleCue[];
  subtitleFontSize?: number;
  subtitleFontFamily?: string;
  subtitleHighlightColor?: string;
  subtitleBaseColor?: string;

  // 출처 표기
  sourceCreditText?: string;

  // 레이아웃 지오메트리 (일분일초 시그니처 표준)
  topBarHeight?: number; // 270px (14.06%)
  bottomBarHeight?: number; // 470px (24.48%)
}

export const IlbunIlchoShortsComposition: React.FC<IlbunIlchoShortsProps> = ({
  videoSource,
  imageSource,
  audioSource,
  bgmSource,
  muteOriginalVideo = true,

  // 1단 대제목 & 2단 소제목 기본값
  titleLine1 = "하루 1분 투자로",
  titleLine2 = "인생을 바꾸는 기적의 습관",
  titleLine1Color = "#FFE500", // 선명한 옐로우
  titleLine2Color = "#FF2222", // 강렬한 레드
  titleFontSize = 82,
  titleFontFamily = "'SBAggroB', 'GmarketSansBold', 'twayair', sans-serif",

  // 자막 설정 기본값
  subtitles = [],
  subtitleFontSize = 66,
  subtitleFontFamily = "'BMDOHYEON', 'SCoreDream', sans-serif",
  subtitleHighlightColor = "#FFE500",
  subtitleBaseColor = "#FFFFFF",

  // 출처
  sourceCreditText = "출처: 일분일초 공식",

  // 레이아웃
  topBarHeight = 270,
  bottomBarHeight = 470,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  // 1. Ken-Burns subtle zoom for main visual
  const zoomScale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  // 2. Active Subtitle Search
  const activeCue = subtitles.find(
    (cue) => currentTimeMs >= cue.startMs && currentTimeMs <= cue.endMs
  );

  // 3. HyperFrames Spring Animation for Subtitle Pop-in
  const cueStartFrame = activeCue ? Math.round((activeCue.startMs / 1000) * fps) : 0;
  const subSpring = spring({
    frame: frame - cueStartFrame,
    fps,
    config: { damping: 14, stiffness: 240, mass: 0.5 },
    from: 0.94,
    to: 1.0,
  });

  // 4. Parse 2-Tone Keywords in Subtitle ([키워드] or **키워드**)
  const renderFormattedSubtitle = (text: string) => {
    const parts = text.split(/(\[[^\]]+\]|\*\*[^\*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const clean = part.slice(1, -1);
        return (
          <span key={idx} style={{ color: subtitleHighlightColor }}>
            {clean}
          </span>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        const clean = part.slice(2, -2);
        return (
          <span key={idx} style={{ color: subtitleHighlightColor }}>
            {clean}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const centerHeight = 1920 - topBarHeight - bottomBarHeight;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        width: 1080,
        height: 1920,
        overflow: "hidden",
        fontFamily: "'Pretendard', sans-serif",
      }}
    >
      {/* 🎬 1. 중앙 메인 비디오 캔버스 (Y: 270 ~ 1450) */}
      <div
        style={{
          position: "absolute",
          top: topBarHeight,
          left: 0,
          width: 1080,
          height: centerHeight,
          overflow: "hidden",
          backgroundColor: "#050505",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
                background: "linear-gradient(180deg, #111827 0%, #030712 100%)",
              }}
            />
          )}
        </div>
      </div>

      {/* 🏷️ 2. 상단 검정 레터박스 & 2단 대제목 헤더 (Y: 0 ~ 270) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1080,
          height: topBarHeight,
          backgroundColor: "#000000",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px 32px 14px 32px",
          boxSizing: "border-box",
        }}
      >
        {/* 1단 타이틀 (노란색) */}
        {titleLine1 && (
          <div
            style={{
              fontFamily: titleFontFamily,
              fontSize: titleFontSize,
              fontWeight: 900,
              color: titleLine1Color,
              textAlign: "center",
              lineHeight: 1.15,
              letterSpacing: "-2px",
              WebkitTextStroke: "6px #000000",
              paintOrder: "stroke fill",
              textShadow: "0 4px 14px rgba(0,0,0,0.95)",
              wordBreak: "keep-all",
              maxWidth: "1020px",
            }}
          >
            {titleLine1}
          </div>
        )}

        {/* 2단 타이틀 (빨간색) */}
        {titleLine2 && (
          <div
            style={{
              fontFamily: titleFontFamily,
              fontSize: titleFontSize,
              fontWeight: 900,
              color: titleLine2Color,
              textAlign: "center",
              lineHeight: 1.15,
              letterSpacing: "-2px",
              WebkitTextStroke: "6px #000000",
              paintOrder: "stroke fill",
              textShadow: "0 4px 14px rgba(0,0,0,0.95)",
              wordBreak: "keep-all",
              maxWidth: "1020px",
              marginTop: "4px",
            }}
          >
            {titleLine2}
          </div>
        )}
      </div>

      {/* 💬 3. 하단 자막 레이어 (Y: 1260 ~ 1400 부근, bottom: 530px) */}
      {activeCue && (
        <div
          style={{
            position: "absolute",
            bottom: bottomBarHeight + 50, // 470 + 50 = 520px 위 (Y: 1400 부근)
            left: 0,
            width: 1080,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 30,
            pointerEvents: "none",
            transform: `scale(${subSpring})`,
            transformOrigin: "center bottom",
          }}
        >
          <div
            style={{
              fontFamily: subtitleFontFamily,
              fontSize: subtitleFontSize,
              fontWeight: 900,
              color: subtitleBaseColor,
              textAlign: "center",
              lineHeight: 1.25,
              letterSpacing: "-0.8px",
              WebkitTextStroke: "8px #000000",
              paintOrder: "stroke fill",
              textShadow: "0 5px 18px rgba(0,0,0,0.98), 0 2px 4px rgba(0,0,0,0.9)",
              wordBreak: "keep-all",
              padding: "0 40px",
              maxWidth: "1000px",
              whiteSpace: "pre-wrap",
            }}
          >
            {renderFormattedSubtitle(activeCue.text)}
          </div>
        </div>
      )}

      {/* 🛡️ 4. 하단 검정 레터박스 (Y: 1450 ~ 1920, 470px 세이프존 쉴드) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 1080,
          height: bottomBarHeight,
          backgroundColor: "#000000",
          zIndex: 20,
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
              color: "#94A3B8",
              fontWeight: 500,
              letterSpacing: "-0.5px",
            }}
          >
            {sourceCreditText}
          </div>
        )}
      </div>

      {/* 🎵 5. 오디오 트랙 */}
      {audioSource && <Audio src={audioSource} volume={1} />}
      {bgmSource && <Audio src={bgmSource} volume={0.25} />}
    </AbsoluteFill>
  );
};
