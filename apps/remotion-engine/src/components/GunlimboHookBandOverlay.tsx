import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface GunlimboHookBandConfig {
  enabled?: boolean;
  text?: string;
  yPct?: number; // 24 ~ 34% (기본 28%)
  heightPx?: number; // 기본 160px
  bgColor?: string; // 기본 #FFFFFF
  textColor?: string; // 기본 #000000
  fontSize?: number; // 기본 56px
  fontFamily?: string;
  durationSec?: number; // 기본 2.5초 동안 노출
  fadeOutSec?: number; // 퇴장 페이드 시간 (기본 0.3초)
  strokeWidth?: number;
  strokeColor?: string;
}

export const GunlimboHookBandOverlay: React.FC<{
  config?: GunlimboHookBandConfig;
}> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!config || config.enabled === false) return null;

  const durationSec = config.durationSec ?? 2.5;
  const fadeOutSec = config.fadeOutSec ?? 0.3;
  const totalFrames = Math.round(durationSec * fps);
  const fadeOutFrames = Math.round(fadeOutSec * fps);

  // 지정된 노출 시간을 지나면 렌더링 안 함
  if (frame > totalFrames + fadeOutFrames) return null;

  // 진입 팝 스프링 애니메이션 (0도 수평 펀치)
  const enterScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 220, mass: 0.5 },
    from: 0.88,
    to: 1.0,
  });

  // 퇴장 페이드아웃 애니메이션
  const opacity = interpolate(
    frame,
    [totalFrames, totalFrames + fadeOutFrames],
    [1.0, 0.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const yPct = config.yPct ?? 28;
  const topPx = Math.round((1920 * yPct) / 100);
  const heightPx = config.heightPx ?? 160;
  const bgColor = config.bgColor || "#FFFFFF";
  const textColor = config.textColor || "#000000";
  const fontSize = config.fontSize ?? 56;
  const fontFamily = config.fontFamily || "'SCoreDream', 'NotoSansKR-Bold', sans-serif";
  const text = config.text || "끝까지 보면 소름 돋습니다";

  return (
    <div
      style={{
        position: "absolute",
        top: topPx,
        left: 0,
        width: 1080,
        height: heightPx,
        backgroundColor: bgColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 25,
        opacity,
        transform: `scale(${enterScale})`,
        transformOrigin: "center center",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.6)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize,
          fontWeight: 900,
          color: textColor,
          letterSpacing: "-1.5px",
          lineHeight: 1.0,
          textAlign: "center",
          wordBreak: "keep-all",
          padding: "0 30px",
          maxWidth: 1020,
        }}
      >
        {text}
      </div>
    </div>
  );
};
