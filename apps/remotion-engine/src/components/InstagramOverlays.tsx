import React from "react";
import { Img } from "remotion";

export interface InstagramProfileConfig {
  enabled?: boolean;
  avatarUrl?: string;
  name?: string;
  handle?: string;
  isVerified?: boolean;
  postCaption?: string; // 프로필 아래 인스타 캡션/제목
  topPx?: number; // 기본 80px
}

export interface InstagramCommentCardConfig {
  enabled?: boolean;
  author?: string;
  content?: string;
  likesText?: string;
  commentsCountText?: string;
  timeText?: string;
  topPx?: number; // 비디오 아래 Y좌표 (기본 1420px)
  widthPx?: number; // 기본 1000px
}

/**
 * 📸 인스타그램 상단 프로필 헤더 (순백색 배경 전용)
 * - 인스타 스토리 그라데이션 링 아바타 + 계정명 + 블루 체크 + 팔로우 버튼 + 더보기(•••)
 * - 프로필 바로 아래 1~2줄 인스타 피드 캡션 텍스트
 * - 어두운 배경 박스 0% (순백색 바탕 위 완벽한 클린 UI)
 */
export const InstagramProfileOverlay: React.FC<{
  config?: InstagramProfileConfig;
}> = ({ config }) => {
  if (!config || config.enabled === false) return null;

  const topPx = config.topPx ?? 140;
  const name = config.name || "viraloop_official";
  const isVerified = config.isVerified !== false;
  const postCaption = config.postCaption;
  const avatarUrl =
    config.avatarUrl ||
    "https://api.dicebear.com/9.x/lorelei/svg?seed=viraloop_insta";

  return (
    <div
      style={{
        position: "absolute",
        top: topPx,
        left: 40,
        width: 1000,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        pointerEvents: "none",
      }}
    >
      {/* 1. 상단 프로필 바 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* 인스타그램 스토리 그라데이션 링 아바타 */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              padding: 3,
              background: "linear-gradient(45deg, #FCAF45, #F77737, #E1306C, #C13584)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid #FFFFFF",
                backgroundColor: "#F1F5F9",
              }}
            >
              <Img
                src={avatarUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>

          {/* 계정명 & 공식 뱃지 & 위치/음원 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: "'Pretendard', sans-serif",
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#18181B",
                  letterSpacing: "-0.5px",
                }}
              >
                {name}
              </span>
              {isVerified && (
                <svg
                  style={{ width: 24, height: 24, fill: "#0095F6", flexShrink: 0 }}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
              {/* 점 구분 기호 */}
              <span style={{ color: "#94A3B8", fontSize: 20 }}>•</span>
              {/* 팔로우 버튼 (인스타 공식 파란 텍스트) */}
              <span
                style={{
                  fontFamily: "'Pretendard', sans-serif",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#0095F6",
                  letterSpacing: "-0.3px",
                }}
              >
                팔로우
              </span>
            </div>
            <span
              style={{
                fontFamily: "'Pretendard', sans-serif",
                fontSize: 22,
                color: "#64748B",
                fontWeight: 500,
              }}
            >
              릴스 원본 오디오 • 추천 피드
            </span>
          </div>
        </div>

        {/* 우측 점 3개 메뉴 */}
        <div style={{ color: "#18181B", fontSize: 32, fontWeight: 900, paddingRight: 8 }}>
          •••
        </div>
      </div>

      {/* 2. 프로필 바로 아래 게시글 캡션 (선택적) */}
      {postCaption && (
        <div
          style={{
            fontFamily: "'Pretendard', sans-serif",
            fontSize: 34,
            fontWeight: 700,
            color: "#18181B",
            lineHeight: 1.35,
            letterSpacing: "-0.5px",
            wordBreak: "keep-all",
            padding: "0 4px",
          }}
        >
          {postCaption}
        </div>
      )}
    </div>
  );
};

/**
 * 💬 인스타그램 하단 액션 바 및 베스트 댓글 카드 (순백색 배경 전용)
 * - 인스타 공식 인터랙션 아이콘 (하트, 댓글, 공유, 북마크)
 * - 순백색 배경에 완벽히 어울리는 라이트 그레이(#F8FAFC) 베스트 댓글 박스
 * - 어두운 박스 0% 철저 격리
 */
export const InstagramCommentCardOverlay: React.FC<{
  config?: InstagramCommentCardConfig;
  activeSubtitleText?: string;
}> = ({ config, activeSubtitleText }) => {
  if (!config || config.enabled === false) return null;

  const topPx = config.topPx ?? 1400; // 중앙 비디오 바로 아래
  const widthPx = config.widthPx ?? 1000;
  const author = config.author || "best_commenter";
  const content =
    activeSubtitleText || config.content || "진짜 이건 볼 때마다 감탄만 나온다 ㅋㅋㅋ";
  const likesText = config.likesText || "4.8만";
  const commentsCountText = config.commentsCountText || "1,240";
  const timeText = config.timeText || "30분 전";

  return (
    <div
      style={{
        position: "absolute",
        top: topPx,
        left: 540 - widthPx / 2,
        width: widthPx,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        pointerEvents: "none",
      }}
    >
      {/* 1. 인스타그램 공식 반응 아이콘 바 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* 하트 아이콘 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 36, color: "#EF4444" }}>❤️</span>
            <span
              style={{
                fontFamily: "'Pretendard', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#18181B",
              }}
            >
              {likesText}
            </span>
          </div>

          {/* 댓글 말풍선 아이콘 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 34 }}>💬</span>
            <span
              style={{
                fontFamily: "'Pretendard', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#18181B",
              }}
            >
              {commentsCountText}
            </span>
          </div>

          {/* DM 공유 종이비행기 아이콘 */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 32 }}>✈️</span>
          </div>
        </div>

        {/* 우측 북마크 저장 아이콘 */}
        <div style={{ display: "flex", alignItems: "center", paddingRight: 8 }}>
          <span style={{ fontSize: 32 }}>🔖</span>
        </div>
      </div>

      {/* 2. 라이트 테마 베스트 댓글 버블 카드 */}
      <div
        style={{
          backgroundColor: "#F8FAFC",
          borderRadius: 22,
          padding: "20px 28px",
          border: "1.5px solid #E2E8F0",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* 상단: 작성자 및 시간 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "#2563EB",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {author.charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                fontFamily: "'Pretendard', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: "#18181B",
              }}
            >
              {author}
            </span>
            <span
              style={{
                fontFamily: "'Pretendard', sans-serif",
                fontSize: 20,
                fontWeight: 500,
                color: "#64748B",
              }}
            >
              · {timeText}
            </span>
          </div>

          <div
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1px solid #F59E0B",
              borderRadius: 10,
              padding: "2px 10px",
            }}
          >
            <span
              style={{
                fontFamily: "'Pretendard', sans-serif",
                fontSize: 18,
                fontWeight: 800,
                color: "#D97706",
              }}
            >
              베스트 댓글 👍
            </span>
          </div>
        </div>

        {/* 댓글 본문 (자막과 실시간 연동) */}
        <div
          style={{
            fontFamily: "'Pretendard', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#18181B",
            lineHeight: 1.35,
            letterSpacing: "-0.5px",
            wordBreak: "keep-all",
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};
