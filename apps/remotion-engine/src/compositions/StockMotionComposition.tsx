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

export type StockMotionStyle = "bw-sketch" | "ink-doodle" | "paper-cutout";

export interface StockMotionProps {
  videoSource?: string;
  sketchImageSource?: string;
  audioSource?: string;
  title?: string;
  stylePreset?: StockMotionStyle;
  frameCount?: number; // 4 ~ 12, default 8
  holdSeconds?: number; // 0.8s ~ 3.2s, default 1.6s
  includeSfx?: boolean;
  includeCaption?: boolean;
}

export const defaultStockMotionProps: StockMotionProps = {
  title: "역대급 스톡모션 반전 씬",
  stylePreset: "bw-sketch",
  frameCount: 8,
  holdSeconds: 1.6,
  includeSfx: true,
  includeCaption: true,
};

export const StockMotionComposition: React.FC<StockMotionProps> = ({
  videoSource,
  sketchImageSource,
  audioSource,
  title = "역대급 스톡모션 반전 씬",
  stylePreset = "bw-sketch",
  frameCount = 8,
  holdSeconds = 1.6,
  includeSfx = true,
  includeCaption = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 타임코드 연산 (픽셀링 JI, J$ 알고리즘 100% 동일)
  const sourceActionMs = 900;
  const holdMs = Math.max(800, Math.round(1000 * holdSeconds));
  const frameMs = 160;
  const clampedFrameCount = Math.max(4, Math.min(20, frameCount));
  const totalDurationMs = sourceActionMs + holdMs + frameMs * clampedFrameCount;

  const currentMs = (frame / fps) * 1000;

  // 3대 구간 판정
  const isSourceAction = currentMs < sourceActionMs;
  const isFreeze = currentMs >= sourceActionMs && currentMs < sourceActionMs + holdMs;
  const isMotion = currentMs >= sourceActionMs + holdMs;

  // 지터 모션 프레임 계산 (6.25fps, 160ms 주기)
  const motionElapsedMs = Math.max(0, currentMs - (sourceActionMs + holdMs));
  const motionStepIndex = Math.min(
    clampedFrameCount - 1,
    Math.floor(motionElapsedMs / frameMs)
  );

  // 미세 지터 트랜스폼 (Pixeling 원천 공식: n%2===0 ? -0.012 : 0.012, rot: 120*r, scale: 1.04)
  const isEven = motionStepIndex % 2 === 0;
  const jitterRatio = isEven ? -0.012 : 0.012;
  const jitterScale = isMotion ? 1.04 : isFreeze ? 1.02 : 1.0;
  const jitterRotationDeg = isMotion ? 120 * jitterRatio : 0; // +/- 1.44도
  const jitterX = isMotion ? jitterRatio * width : 0;
  const jitterY = isMotion ? -jitterRatio * height : 0;

  // 스타일 라벨 매핑
  const styleLabel =
    stylePreset === "ink-doodle"
      ? "잉크 낙서"
      : stylePreset === "paper-cutout"
      ? "종이 컷아웃"
      : "흑백 스케치";

  // 스케치 필터 CSS 에뮬레이션 (원본 비디오 또는 이미지에 적용)
  const sketchFilterStyle: React.CSSProperties =
    stylePreset === "ink-doodle"
      ? { filter: "grayscale(100%) contrast(220%) brightness(110%)" }
      : stylePreset === "paper-cutout"
      ? { filter: "grayscale(100%) contrast(180%) posterize(4)" }
      : { filter: "grayscale(100%) contrast(160%) brightness(105%)" };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily: "'Pretendard', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── 1. 메인 비주얼 레이어 ── */}
      <AbsoluteFill
        style={{
          transform: `translate(${jitterX}px, ${jitterY}px) rotate(${jitterRotationDeg}deg) scale(${jitterScale})`,
          transformOrigin: "center center",
          transition: "transform 0.05s ease-out",
        }}
      >
        {isSourceAction && videoSource ? (
          <Video
            src={videoSource}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : sketchImageSource ? (
          <Img
            src={sketchImageSource}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              ...sketchFilterStyle,
            }}
          />
        ) : videoSource ? (
          <Video
            src={videoSource}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              ...sketchFilterStyle,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#18181b",
              color: "#a1a1aa",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {styleLabel} 스톡모션 프레임
          </div>
        )}

        {/* 스톱모션 질감 (모션 구간에 페이퍼 노이즈 오버레이) */}
        {isMotion && (
          <AbsoluteFill
            style={{
              backgroundColor: isEven ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              mixBlendMode: "overlay",
              pointerEvents: "none",
            }}
          />
        )}
      </AbsoluteFill>

      {/* ── 2. 상단 2단 헤드라인 자막 (JE 규격: Y: -0.42, 화이트 볼드, 두께 6 블랙 스트로크) ── */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: "8%",
            left: "5%",
            right: "5%",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <h1
            style={{
              margin: 0,
              padding: "0 16px",
              fontSize: 48,
              fontWeight: 900,
              color: "#ffffff",
              textShadow: "0 4px 16px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)",
              WebkitTextStroke: "6px #000000",
              paintOrder: "stroke fill",
              letterSpacing: "-0.03em",
              lineHeight: 1.25,
            }}
          >
            {title}
          </h1>
        </div>
      )}

      {/* ── 3. 하단 리액션 마커 뱃지 (JT 규격: Y: 0.36, 둥근 흰색 박스 + 블랙 텍스트) ── */}
      {includeCaption && (isFreeze || isMotion) && (
        <div
          style={{
            position: "absolute",
            bottom: "16%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              borderRadius: 9999,
              backgroundColor: "rgba(248, 250, 252, 0.95)",
              color: "#0f172a",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(255, 255, 255, 0.9)",
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 900 }}>
              {isFreeze ? "✏️" : "⚡"}
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              {isFreeze ? `${styleLabel} 프리즈` : "스톡모션 변환"}
            </span>
          </div>
        </div>
      )}

      {/* ── 4. 오디오 트랙 ── */}
      {audioSource && <Audio src={audioSource} />}
    </AbsoluteFill>
  );
};
