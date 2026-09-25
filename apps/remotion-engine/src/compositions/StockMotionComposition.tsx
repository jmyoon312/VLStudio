import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Video,
  Img,
} from "remotion";

export type StockMotionStyle =
  | "bw-sketch"
  | "ink-doodle"
  | "paper-cutout"
  | "neon-cyberpunk"
  | "vintage-comic"
  | "manga-screentone";

export interface StockMotionProps {
  videoSource?: string;
  sketchImageSource?: string;
  sketchFrames?: string[];
  audioSource?: string;
  title?: string;
  customMarker?: string;
  stylePreset?: StockMotionStyle;
  frameCount?: number; // 4 ~ 20, default 8
  holdSeconds?: number; // 0.8s ~ 3.2s, default 1.6s
  timestampSec?: number; // default 0.9s
  durationMode?: "hook-only" | "full-continuation";
  postContinuationSec?: number; // default 15.0s
  enableSpeedlines?: boolean; // default true
  includeSfx?: boolean;
  includeCaption?: boolean;
}

export const defaultStockMotionProps: StockMotionProps = {
  title: "역대급 스톡모션 반전 씬",
  stylePreset: "bw-sketch",
  frameCount: 8,
  holdSeconds: 1.6,
  timestampSec: 0.9,
  durationMode: "full-continuation",
  postContinuationSec: 15.0,
  enableSpeedlines: true,
  includeSfx: true,
  includeCaption: true,
};

// 방사형 만화 집중선 (Manga Action Speedlines) 오버레이 컴포넌트
const MangaSpeedlinesOverlay: React.FC<{
  frameIndex: number;
  width: number;
  height: number;
}> = ({ frameIndex, width, height }) => {
  const cx = width / 2;
  const cy = height / 2;
  const numLines = 40;
  const rInner = Math.min(width, height) * 0.22;
  const rOuter = Math.max(width, height) * 0.88;

  const lines = useMemo(() => {
    const list = [];
    for (let i = 0; i < numLines; i++) {
      const angle =
        (2 * Math.PI * i) / numLines + (((frameIndex * 13 + i * 7) % 11) - 5) * 0.015;
      const rIn = rInner + ((i * 23 + frameIndex * 31) % 45);
      const x1 = cx + rIn * Math.cos(angle);
      const y1 = cy + rIn * Math.sin(angle);
      const x2 = cx + rOuter * Math.cos(angle);
      const y2 = cy + rOuter * Math.sin(angle);
      const strokeW = 1.8 + ((i + frameIndex * 2) % 4) * 1.4;
      list.push({ id: i, x1, y1, x2, y2, strokeW });
    }
    return list;
  }, [cx, cy, frameIndex, numLines, rInner, rOuter]);

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 6,
        opacity: 0.8,
      }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {lines.map((l) => (
        <line
          key={l.id}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="#0f172a"
          strokeWidth={l.strokeW}
          strokeLinecap="round"
          opacity={0.75}
        />
      ))}
    </svg>
  );
};

export const StockMotionComposition: React.FC<StockMotionProps> = ({
  videoSource,
  sketchImageSource,
  sketchFrames,
  audioSource,
  title = "역대급 스톡모션 반전 씬",
  customMarker,
  stylePreset = "bw-sketch",
  frameCount = 8,
  holdSeconds = 1.6,
  timestampSec = 0.9,
  durationMode = "full-continuation",
  postContinuationSec = 15.0,
  enableSpeedlines = true,
  includeSfx = true,
  includeCaption = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 타임코드 연산 (픽셀링 JI, J$ 알고리즘 100% 동일 + 가변 피크 타임스탬프 + 풀 쇼츠 이어보기)
  const sourceActionMs = Math.max(100, Math.round(timestampSec * 1000));
  const holdMs = Math.max(800, Math.round(1000 * holdSeconds));
  const frameMs = 160;
  const clampedFrameCount = Math.max(4, Math.min(20, frameCount));
  const motionDurationMs = sourceActionMs + holdMs + frameMs * clampedFrameCount;

  const isContinuationMode = durationMode === "full-continuation";
  const postContinuationMs = isContinuationMode
    ? Math.max(3000, Math.round(postContinuationSec * 1000))
    : 0;
  const totalDurationMs = motionDurationMs + postContinuationMs;

  const currentMs = (frame / fps) * 1000;

  // 4대 구간 판정 (풀 쇼츠 이어보기 지원)
  const isSourceAction = currentMs < sourceActionMs;
  const isFreeze = currentMs >= sourceActionMs && currentMs < sourceActionMs + holdMs;
  const isMotion = currentMs >= sourceActionMs + holdMs && currentMs < motionDurationMs;
  const isPostContinuation = currentMs >= motionDurationMs;

  // 지터 모션 프레임 계산 (6.25fps, 160ms 주기)
  const motionElapsedMs = Math.max(0, currentMs - (sourceActionMs + holdMs));
  const motionStepIndex = Math.min(
    clampedFrameCount - 1,
    Math.floor(motionElapsedMs / frameMs)
  );

  // 미세 지터 트랜스폼 (Pixeling 원천 공식: n%2===0 ? -0.012 : 0.012, rot: 120*r, scale: 1.04)
  const isEven = motionStepIndex % 2 === 0;
  const jitterRatio = isEven ? -0.008 : 0.008;
  const jitterScale = isMotion ? 1.03 : isFreeze ? 1.015 : 1.0;
  const jitterRotationDeg = isMotion ? 80 * jitterRatio : 0;
  const jitterX = isMotion ? jitterRatio * width * 0.7 : 0;
  const jitterY = isMotion ? -jitterRatio * height * 0.7 : 0;

  // 스타일 라벨 매핑 (7대 바이럴 스타일 지원)
  const styleLabel =
    stylePreset === "neon-cyberpunk"
      ? "네온 사이버펑크"
      : stylePreset === "vintage-comic"
      ? "빈티지 코믹스"
      : stylePreset === "manga-screentone"
      ? "망가 스크린톤"
      : stylePreset === "ink-doodle"
      ? "잉크 낙서"
      : stylePreset === "paper-cutout"
      ? "종이 컷아웃"
      : "흑백 스케치";

  const styleEmoji =
    stylePreset === "neon-cyberpunk"
      ? "⚡"
      : stylePreset === "vintage-comic"
      ? "💥"
      : stylePreset === "manga-screentone"
      ? "📖"
      : stylePreset === "ink-doodle"
      ? "🖋️"
      : stylePreset === "paper-cutout"
      ? "✂️"
      : "✏️";

  // 스케치 필터 CSS 에뮬레이션 (원본 비디오에 적용 시 백업)
  const sketchFilterStyle: React.CSSProperties =
    stylePreset === "neon-cyberpunk"
      ? { filter: "invert(100%) hue-rotate(180deg) contrast(200%)" }
      : stylePreset === "vintage-comic"
      ? { filter: "contrast(180%) saturate(180%)" }
      : stylePreset === "manga-screentone"
      ? { filter: "grayscale(100%) contrast(250%)" }
      : stylePreset === "ink-doodle"
      ? { filter: "grayscale(100%) contrast(220%) brightness(110%)" }
      : stylePreset === "paper-cutout"
      ? { filter: "grayscale(100%) contrast(180%)" }
      : { filter: "grayscale(100%) contrast(160%) brightness(105%)" };

  // 현재 표시할 이미지 (8-프레임 Line-Boil 시퀀스 지원)
  const hasFrames = sketchFrames && sketchFrames.length > 0;
  const currentMotionFrame = hasFrames
    ? sketchFrames[motionStepIndex % sketchFrames.length]
    : sketchImageSource;
  const freezeFrame = hasFrames ? sketchFrames[0] : sketchImageSource;

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
        ) : isFreeze ? (
          freezeFrame ? (
            <Img
              src={freezeFrame}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
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
              {styleLabel} 프리즈
            </div>
          )
        ) : isMotion ? (
          currentMotionFrame ? (
            <Img
              key={`motion_frame_${motionStepIndex}`}
              src={currentMotionFrame}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
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
              {styleLabel} 스톡모션 프레임 #{motionStepIndex + 1}
            </div>
          )
        ) : isPostContinuation && videoSource ? (
          /* [혁신: 풀 쇼츠 이어보기] 피크 액션 지점부터 원본 영상이 끝까지 이어 재생됨 */
          <Video
            src={videoSource}
            startFrom={Math.round(fps * timestampSec)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        {/* 스톱모션 종이 섬유 질감 (모션 구간에 페이퍼 노이즈 오버레이) */}
        {isMotion && (
          <AbsoluteFill
            style={{
              backgroundColor: isEven ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
              mixBlendMode: "overlay",
              pointerEvents: "none",
            }}
          />
        )}
      </AbsoluteFill>

      {/* ── 방사형 만화 집중선 (Manga Speedlines) 레이어 (사전 베이킹 프레임 없을 시 실시간 렌더링) ── */}
      {enableSpeedlines && !hasFrames && (isFreeze || isMotion) && (
        <MangaSpeedlinesOverlay
          frameIndex={isMotion ? motionStepIndex : 0}
          width={width}
          height={height}
        />
      )}

      {/* ── 전환 순간 셔터 플래시 효과 (피크 액션 시점 2프레임 카메라 셔터 섬광) ── */}
      {currentMs >= sourceActionMs - 35 && currentMs <= sourceActionMs + 35 && (
        <AbsoluteFill
          style={{
            backgroundColor: "#ffffff",
            opacity: interpolate(
              currentMs,
              [sourceActionMs - 35, sourceActionMs, sourceActionMs + 35],
              [0, 0.85, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            ),
            pointerEvents: "none",
            zIndex: 8,
          }}
        />
      )}

      {/* ── 상단 섀도우 비네팅 (원본 자막과의 간섭 방지) ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "25%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 9,
        }}
      />

      {/* ── 2. 상단 2단 헤드라인 자막 (JE 규격: Y: -0.42, 화이트 볼드, 두께 6 블랙 스트로크) ── */}
      {title && title.trim() !== "" && (
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
              textShadow:
                "0 4px 16px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)",
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
              boxShadow:
                "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(255, 255, 255, 0.9)",
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 900 }}>
              {isFreeze ? styleEmoji : "⚡"}
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              {customMarker || (isFreeze ? `${styleLabel} 프리즈` : "스톡모션 변환")}
            </span>
          </div>
        </div>
      )}

      {/* ── 4. 오디오 트랙 ── */}
      {audioSource && <Audio src={audioSource} />}
    </AbsoluteFill>
  );
};

