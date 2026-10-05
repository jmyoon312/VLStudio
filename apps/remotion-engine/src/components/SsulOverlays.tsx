import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface SsulHeaderConfig {
  enabled?: boolean;
  bgColor?: string; // 기본 #F7CF46 (디시/에펨 옐로우)
  title?: string; // 기본 "실시간 베스트"
  textColor?: string;
  heightPx?: number; // 기본 110px
}

export interface SsulPostMetaConfig {
  enabled?: boolean;
  postTitle?: string;
  author?: string;
  timeText?: string;
  viewsText?: string;
  upvotesText?: string;
  topPx?: number; // 기본 120px
}

export interface SsulSubtitleCue {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
}

export interface SsulCumulativeConfig {
  enabled?: boolean;
  maxLines?: number; // 화면에 동시에 보일 최대 줄 수 (기본 4줄)
  fontSize?: number; // 기본 44px
  fontFamily?: string;
  baseColor?: string;
  highlightColor?: string;
  boxBgColor?: string;
  topPx?: number; // 기본 275px (제목 바로 아래)
  minHeightPx?: number;
}

export const SsulCommunityHeaderOverlay: React.FC<{
  config?: SsulHeaderConfig;
}> = ({ config }) => {
  if (!config || config.enabled === false) return null;

  const bgColor = config.bgColor || "#F7CF46";
  const title = config.title || "실시간 베스트";
  const textColor = config.textColor || "#18181B";
  const heightPx = config.heightPx ?? 110;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 1080,
        height: heightPx,
        backgroundColor: bgColor,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: textColor }}>←</span>
        <span
          style={{
            fontFamily: "'Pretendard', sans-serif",
            fontSize: 34,
            fontWeight: 900,
            color: textColor,
            letterSpacing: "-0.5px",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ fontSize: 26, color: textColor }}>🔍</span>
        <span style={{ fontSize: 28, color: textColor }}>☰</span>
      </div>
    </div>
  );
};

export const SsulPostMetaOverlay: React.FC<{
  config?: SsulPostMetaConfig;
}> = ({ config }) => {
  if (!config || config.enabled === false) return null;

  const topPx = config.topPx ?? 125;
  const postTitle = config.postTitle || "오늘자 레전드 썰 풀어본다";
  const author = config.author || "대기업 익명";
  const timeText = config.timeText || "10분 전";
  const viewsText = config.viewsText || "조회 2.4만";
  const upvotesText = config.upvotesText || "추천 382";

  return (
    <div
      style={{
        position: "absolute",
        top: topPx,
        left: 30,
        width: 1020,
        zIndex: 35,
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        borderRadius: 20,
        padding: "18px 28px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {/* 글 대제목 */}
      <div
        style={{
          fontFamily: "'Pretendard', sans-serif",
          fontSize: 38,
          fontWeight: 900,
          color: "#FFFFFF",
          letterSpacing: "-1px",
          lineHeight: 1.25,
        }}
      >
        {postTitle}
      </div>

      {/* 작성자 & 통계 메타 태그 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: "'Pretendard', sans-serif",
          fontSize: 22,
          fontWeight: 500,
          color: "#94A3B8",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          paddingTop: 10,
        }}
      >
        <span style={{ color: "#38BDF8", fontWeight: 700 }}>{author}</span>
        <span>·</span>
        <span>{timeText}</span>
        <span>·</span>
        <span>{viewsText}</span>
        <span>·</span>
        <span style={{ color: "#F59E0B", fontWeight: 700 }}>{upvotesText}</span>
      </div>
    </div>
  );
};

export const SsulCumulativeSubtitles: React.FC<{
  subtitles: SsulSubtitleCue[];
  config?: SsulCumulativeConfig;
}> = ({ subtitles, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  if (!subtitles || subtitles.length === 0) return null;

  const maxLines = config?.maxLines ?? 4;
  const fontSize = config?.fontSize ?? 42;
  const fontFamily = config?.fontFamily || "'Pretendard', 'NotoSansKR-Bold', sans-serif";
  const baseColor = config?.baseColor || "rgba(255, 255, 255, 0.75)";
  const highlightColor = config?.highlightColor || "#FFE500";
  const topPx = config?.topPx ?? 275; // 🎯 제목 바로 아래 배치!

  // 현재 시간 이전에 시작된 자막들을 시간순으로 필터링
  const pastAndActiveCues = subtitles.filter((cue) => cue.startMs <= currentTimeMs);
  if (pastAndActiveCues.length === 0) return null;

  // 최근 maxLines개만 유지하여 화면에 표시
  const displayedCues = pastAndActiveCues.slice(-maxLines);

  return (
    <div
      style={{
        position: "absolute",
        top: topPx, // 🎯 제목 바로 아래
        left: 30,
        width: 1020,
        zIndex: 35,
        backgroundColor: config?.boxBgColor || "rgba(10, 15, 29, 0.92)",
        borderRadius: 22,
        padding: "22px 28px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
        border: "1.5px solid rgba(255, 255, 255, 0.14)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        pointerEvents: "none",
        minHeight: config?.minHeightPx ?? 280,
      }}
    >
      {displayedCues.map((cue, idx) => {
        const isActive = currentTimeMs >= cue.startMs && currentTimeMs <= cue.endMs;
        const isLatest = idx === displayedCues.length - 1;

        return (
          <div
            key={idx}
            style={{
              fontFamily,
              fontSize: isActive ? fontSize + 4 : fontSize,
              fontWeight: isActive ? 900 : 700,
              color: isActive ? highlightColor : isLatest ? "#FFFFFF" : baseColor,
              lineHeight: 1.35,
              letterSpacing: "-0.5px",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              wordBreak: "keep-all",
            }}
          >
            <span style={{ opacity: 0.6, fontSize: fontSize - 10, marginTop: 4 }}>•</span>
            <span>{cue.text}</span>
          </div>
        );
      })}
    </div>
  );
};
