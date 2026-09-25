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

export interface SongLyricLine {
  id: string;
  startMs: number;
  endMs: number;
  original: string;
  pronunciation?: string;
  meaning?: string;
}

export type SongVisualTheme = "vinyl" | "visualizer" | "jacket" | "poster";

export interface SongKaraokeProps {
  // 미디어 소스
  videoSource?: string;
  audioSource?: string;
  albumCover?: string;

  // 곡 정보 메타데이터
  songTitle?: string;
  artistName?: string;

  // 3-트랙 가사 데이터
  lyrics?: SongLyricLine[];

  // 테마 및 표시 옵션
  visualTheme?: SongVisualTheme;
  enableOriginal?: boolean;
  enablePronunciation?: boolean;
  enableMeaning?: boolean;
  syncOffsetMs?: number;

  // 자막 스타일 및 위치
  originalColor?: string;
  pronunciationColor?: string;
  meaningColor?: string;
  textPosition?: "bottom" | "middle" | "top";
}

export const defaultSongKaraokeProps: SongKaraokeProps = {
  songTitle: "Golden Hour",
  artistName: "JVKE",
  visualTheme: "vinyl",
  enableOriginal: true,
  enablePronunciation: true,
  enableMeaning: true,
  syncOffsetMs: 0,
  lyrics: [
    {
      id: "song-1",
      startMs: 0,
      endMs: 3500,
      original: "It was just two lovers",
      pronunciation: "잇 워즈 저스트 투 러버스",
      meaning: "그저 사랑하는 두 사람이었어",
    },
    {
      id: "song-2",
      startMs: 3500,
      endMs: 7200,
      original: "Sittin' in the car, listenin' to Blonde",
      pronunciation: "시틴 인 더 카, 리스닌 투 블론드",
      meaning: "차 안에 앉아 Blonde 앨범을 들으며",
    },
    {
      id: "song-3",
      startMs: 7200,
      endMs: 10800,
      original: "Fallin' for each other",
      pronunciation: "폴린 포 이치 아더",
      meaning: "서로에게 깊이 빠져들었지",
    },
    {
      id: "song-4",
      startMs: 10800,
      endMs: 14500,
      original: "Pink and orange skies, feelin' super alive",
      pronunciation: "핑크 앤 오렌지 스카이즈, 필린 슈퍼 얼라이브",
      meaning: "분홍빛과 주황빛 노을 아래, 온몸이 살아있음을 느껴",
    },
    {
      id: "song-5",
      startMs: 14500,
      endMs: 20000,
      original: "You look like the golden hour",
      pronunciation: "유 룩 라이크 더 골든 아워",
      meaning: "넌 마치 황금빛 노을 같아",
    },
  ],
};

export const SongKaraokeComposition: React.FC<SongKaraokeProps> = ({
  videoSource,
  audioSource,
  albumCover,
  songTitle = "Untitled Song",
  artistName = "Unknown Artist",
  lyrics = [],
  visualTheme = "vinyl",
  enableOriginal = true,
  enablePronunciation = true,
  enableMeaning = true,
  syncOffsetMs = 0,
  originalColor = "#FFFFFF",
  pronunciationColor = "#34D399",
  meaningColor = "#FBBF24",
  textPosition = "bottom",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 현재 타임코드 (밀리초)
  const currentMs = (frame / fps) * 1000 + syncOffsetMs;

  // 현재 활성화된 가사 라인 탐색
  const currentLineIndex = lyrics.findIndex(
    (l) => currentMs >= l.startMs && currentMs < l.endMs
  );
  const activeLine =
    currentLineIndex !== -1 ? lyrics[currentLineIndex] : null;

  // 회전 애니메이션 (LP 바이닐용)
  const rotationDeg = (frame * 1.5) % 360;

  // 비주얼라이저 바 애니메이션
  const barCount = 18;
  const barHeights = Array.from({ length: barCount }, (_, i) => {
    const wave = Math.sin((frame * 0.15) + i * 0.45);
    return Math.max(16, 20 + Math.abs(wave) * 90);
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0A0B0E",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', Roboto, sans-serif",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* ── 1. 오디오 소스 ── */}
      {audioSource && <Audio src={audioSource} />}

      {/* ── 2. 배경 비주얼 레이어 ── */}
      {videoSource ? (
        <AbsoluteFill style={{ zIndex: 0 }}>
          <Video
            src={videoSource}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted={!!audioSource}
          />
          {/* 어두운 비네팅 오버레이 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(10,11,14,0.7) 0%, rgba(10,11,14,0.3) 50%, rgba(10,11,14,0.85) 100%)",
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            zIndex: 0,
            background:
              "radial-gradient(circle at 50% 35%, #1e1b4b 0%, #090a0f 75%, #050508 100%)",
          }}
        />
      )}

      {/* ── 3. 테마별 그래픽 오버레이 (상단 55% 영역) ── */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: 0,
          right: 0,
          height: "45%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        {/* 곡명 & 아티스트 뱃지 */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 24px",
            borderRadius: 9999,
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10B981",
              boxShadow: "0 0 10px #10B981",
            }}
          />
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
            {songTitle}
          </span>
          <span style={{ fontSize: 22, opacity: 0.6 }}>•</span>
          <span style={{ fontSize: 22, opacity: 0.8, fontWeight: 600 }}>
            {artistName}
          </span>
        </div>

        {/* 1) LP 바이닐 테마 */}
        {visualTheme === "vinyl" && (
          <div
            style={{
              position: "relative",
              width: 380,
              height: 380,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #1a1a1a 0%, #0d0d0d 60%, #050505 100%)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.85), inset 0 0 15px rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${rotationDeg}deg)`,
              border: "3px solid #222",
            }}
          >
            {/* 바이닐 홈 패턴 */}
            <div
              style={{
                position: "absolute",
                width: 320,
                height: 320,
                borderRadius: "50%",
                border: "1px dashed rgba(255,255,255,0.08)",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 260,
                height: 260,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            {/* 중앙 앨범 라벨 */}
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                backgroundColor: "#F59E0B",
                background:
                  albumCover
                    ? `url(${albumCover}) center/cover`
                    : "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(0,0,0,0.6)",
              }}
            >
              {/* 스핀들 홀 */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: "#0A0B0E",
                  border: "2px solid #333",
                }}
              />
            </div>
          </div>
        )}

        {/* 2) 오디오 스펙트럼 비주얼라이저 테마 */}
        {visualTheme === "visualizer" && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              height: 180,
              padding: "0 40px",
            }}
          >
            {barHeights.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: `${h}px`,
                  borderRadius: 6,
                  background:
                    "linear-gradient(180deg, #38BDF8 0%, #818CF8 50%, #C084FC 100%)",
                  boxShadow: "0 0 12px rgba(56,189,248,0.5)",
                  transition: "height 0.05s ease",
                }}
              />
            ))}
          </div>
        )}

        {/* 3) 블러 자켓 테마 */}
        {visualTheme === "jacket" && (
          <div
            style={{
              width: 320,
              height: 320,
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 30px 70px rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.2)",
              backgroundColor: "rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {albumCover ? (
              <Img
                src={albumCover}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background:
                    "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 64 }}>🎵</span>
                <span style={{ fontSize: 24, fontWeight: 700, opacity: 0.8 }}>
                  {artistName}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 4) 타이포그래피 포스터 테마 */}
        {visualTheme === "poster" && (
          <div
            style={{
              textAlign: "center",
              padding: "0 40px",
            }}
          >
            <div
              style={{
                fontSize: 54,
                fontWeight: 900,
                letterSpacing: -1.5,
                background: "linear-gradient(180deg, #FFFFFF 0%, #94A3B8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: 8,
              }}
            >
              {songTitle}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#38BDF8",
                textTransform: "uppercase",
                letterSpacing: 4,
              }}
            >
              {artistName}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. 3중 트랙 가사 렌더러 ── */}
      <div
        style={{
          position: "absolute",
          top: textPosition === "top" ? "12%" : textPosition === "middle" ? "42%" : undefined,
          bottom: textPosition === "bottom" ? "10%" : undefined,
          transform: textPosition === "middle" ? "translateY(-50%)" : undefined,
          left: 40,
          right: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          zIndex: 2,
        }}
      >
        {activeLine ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              width: "100%",
              maxWidth: 960,
              padding: "24px 32px",
              borderRadius: 24,
              backgroundColor: "rgba(10, 11, 14, 0.75)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
            }}
          >
            {/* Track 1: 원어 가사 */}
            {enableOriginal && (
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  color: originalColor,
                  letterSpacing: -0.5,
                  lineHeight: 1.25,
                  textShadow:
                    "0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.2)",
                }}
              >
                {activeLine.original}
              </div>
            )}

            {/* Track 2: 한글 발음 표기 */}
            {enablePronunciation && activeLine.pronunciation && (
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: pronunciationColor,
                  fontFamily:
                    "'SF Mono', 'Pretendard', Monaco, Consolas, monospace",
                  letterSpacing: -0.3,
                  lineHeight: 1.25,
                  textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                  opacity: 0.95,
                }}
              >
                {activeLine.pronunciation}
              </div>
            )}

            {/* Track 3: 한국어 뜻 번역 */}
            {enableMeaning && activeLine.meaning && (
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: meaningColor,
                  letterSpacing: -0.5,
                  lineHeight: 1.25,
                  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
                }}
              >
                {activeLine.meaning}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: 2,
            }}
          >
            ♪ ♪ ♪
          </div>
        )}
      </div>

      {/* ── 5. 하단 출처 & 프로덕션 서명 ── */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 18,
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.4)",
          letterSpacing: 1,
          zIndex: 2,
        }}
      >
        VIRALOOP MUSIC SHORTS • 3-TRACK SYNC
      </div>
    </AbsoluteFill>
  );
};
