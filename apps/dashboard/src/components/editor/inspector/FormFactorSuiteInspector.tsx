import React, { useState } from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { LayerObject, TextLayer, ShapeLayer } from "../../../types/blueprintV4";
import { INSTA_PROFILE_PRESETS, getRandomSatiricalMetadata } from "../../canvas/constants/canvasConstants";
import { MEME_EMOTION_PRESETS } from "../../memeAssets";
import { ColorPalettePicker } from "./ColorPalettePicker";
import { ScrubInput } from "./ScrubInput";
import {
  Sparkles,
  Camera,
  Crown,
  Zap,
  FileText,
  Check,
  Shuffle,
  Smile,
  Split,
  Music,
  MessageSquare,
  Maximize2,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export interface FormFactorSuiteInspectorProps {
  className?: string;
}

export const FormFactorSuiteInspector: React.FC<FormFactorSuiteInspectorProps> = ({
  className = "",
}) => {
  const { blueprint, setBlueprint, setSelectedLayerId } = useBlueprint();
  const archetype = blueprint.archetype || "classic";

  // 아코디언 접기/펼치기 상태
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // 레이어 검색 헬퍼
  const findLayer = (predicate: (l: LayerObject) => boolean): LayerObject | undefined => {
    return blueprint.globalLayers.find(predicate);
  };

  const updateSpecificLayer = (layerId: string, patch: Partial<LayerObject>) => {
    setBlueprint({
      ...blueprint,
      globalLayers: blueprint.globalLayers.map((l) =>
        l.id === layerId ? ({ ...l, ...patch } as LayerObject) : l
      ),
    });
  };

  // -------------------------------------------------------------
  // [1] 인스타형 헬퍼 & 핸들러
  // -------------------------------------------------------------
  const profileTextLayer = findLayer(
    (l) => l.id === "profile_text" || l.id === "layer_insta_profile_text" || (l.kind === "text" && l.id.includes("profile"))
  ) as TextLayer | undefined;

  const profileHeaderLayer = findLayer(
    (l) => l.id === "profile_header" || l.id === "insta_profile_card" || (l.kind === "shape" && l.id.includes("profile"))
  ) as ShapeLayer | undefined;

  const videoHoleLayer = findLayer(
    (l) => l.id === "video_hole_window" || l.id === "video_guide" || l.id.includes("hole")
  ) as ShapeLayer | undefined;

  const commentCardLayer = findLayer(
    (l) => l.id === "comment_card" || (l.kind === "shape" && (l as ShapeLayer).shapeRole === "comment_card")
  ) as ShapeLayer | undefined;

  const commentBodyLayer = findLayer(
    (l) => l.id === "comment_body" || (l.kind === "text" && l.id.includes("comment_body"))
  ) as TextLayer | undefined;

  const commentMetaLayer = findLayer(
    (l) => l.id === "comment_meta" || (l.kind === "text" && l.id.includes("comment_meta"))
  ) as TextLayer | undefined;

  const handleRandomInstaProfile = () => {
    const randomIndex = Math.floor(Math.random() * INSTA_PROFILE_PRESETS.length);
    const chosen = INSTA_PROFILE_PRESETS[randomIndex];
    const newContent = `📸 @${chosen.handle.replace("@", "")}  ✓  •  추천 베스트 댓글`;

    setBlueprint({
      ...blueprint,
      globalLayers: blueprint.globalLayers.map((l) => {
        if (l.id === profileTextLayer?.id) {
          return { ...l, content: newContent } as LayerObject;
        }
        return l;
      }),
    });
    toast.success(`🎲 프로필 적용: ${chosen.name} (${chosen.handle})`);
  };

  const handleSetHoleRatio = (ratio: "1:1" | "4:5" | "16:9" | "full") => {
    if (!videoHoleLayer) return;
    let newWidth = 960;
    let newHeight = 960;

    if (ratio === "1:1") {
      newWidth = 960;
      newHeight = 960;
    } else if (ratio === "4:5") {
      newWidth = 960;
      newHeight = 1200;
    } else if (ratio === "16:9") {
      newWidth = 960;
      newHeight = 540;
    } else if (ratio === "full") {
      newWidth = 1040;
      newHeight = 1040;
    }

    updateSpecificLayer(videoHoleLayer.id, {
      transform: {
        ...videoHoleLayer.transform,
        width: newWidth,
        height: newHeight,
      },
    });
    toast.success(`구멍 윈도우 비율이 ${ratio}로 변경되었습니다.`);
  };

  // -------------------------------------------------------------
  // [2] 군림보형 헬퍼 & 핸들러
  // -------------------------------------------------------------
  const breakingTitleLayer = findLayer(
    (l) => l.id === "breaking_title" || l.id === "title_bar" || (l.kind === "text" && l.id.includes("title"))
  ) as TextLayer | undefined;

  const hookBandLayer = findLayer(
    (l) => l.id === "hook_band" || l.id === "urgent_banner" || (l.kind === "shape" && l.id.includes("hook"))
  ) as ShapeLayer | undefined;

  const hookTextLayer = findLayer(
    (l) => l.id === "hook_text" || l.id === "urgent_text" || (l.kind === "text" && l.id.includes("hook"))
  ) as TextLayer | undefined;

  const subtitleAnchorLayer = findLayer(
    (l) => l.id === "subtitle_anchor" || (l.kind === "text" && (l as TextLayer).textRole === "subtitle_narrative")
  ) as TextLayer | undefined;

  const handleSyncFirstSubtitleToHook = () => {
    const firstScene = blueprint.scenes[0];
    const candidateText =
      firstScene?.words?.[0]?.word ||
      subtitleAnchorLayer?.content?.split("\n")[0] ||
      "🚨 첫 문장 핵심 카피";

    if (hookTextLayer) {
      updateSpecificLayer(hookTextLayer.id, {
        content: `⚡ ${candidateText}`,
      });
      toast.success(`⚡ 첫 문장 자막("${candidateText}")이 훅 밴드에 동기화되었습니다.`);
    }
  };

  const handleGunlimboSubColor = (color: string, label: string) => {
    if (!subtitleAnchorLayer) return;
    updateSpecificLayer(subtitleAnchorLayer.id, {
      fontColor: color,
    });
    toast.success(`자막 색상이 '${label}' (${color})로 변경되었습니다.`);
  };

  // -------------------------------------------------------------
  // [3] 썰형 헬퍼 & 핸들러
  // -------------------------------------------------------------
  const articleMetaLayer = findLayer(
    (l) => l.id === "article_meta" || (l.kind === "text" && l.id.includes("meta"))
  ) as TextLayer | undefined;

  const articleTitleLayer = findLayer(
    (l) => l.id === "article_title" || (l.kind === "text" && l.id.includes("article_title"))
  ) as TextLayer | undefined;

  const headerBarLayer = findLayer(
    (l) => l.id === "header_bar" || (l.kind === "shape" && l.id.includes("header"))
  ) as ShapeLayer | undefined;

  const memeCaptionLayer = findLayer(
    (l) => l.id === "meme_caption" || (l.kind === "text" && l.id.includes("meme"))
  ) as TextLayer | undefined;

  const handleInjectSatiricalMeta = () => {
    const rand = getRandomSatiricalMetadata();
    const upvotes = Math.floor(Math.random() * 450 + 50);
    const newContent = `${rand.author}  •  ${rand.timeText}  •  ${rand.viewsText}  •  추천 ${upvotes}`;

    if (articleMetaLayer) {
      updateSpecificLayer(articleMetaLayer.id, {
        content: newContent,
      });
      toast.success(`🎲 풍자 메타 주입: ${rand.author} · ${rand.viewsText}`);
    }
  };

  const handleSetSsulTextMode = (mode: "accumulate" | "single") => {
    if (!subtitleAnchorLayer) return;
    const isAccum = mode === "accumulate";
    updateSpecificLayer(subtitleAnchorLayer.id, {
      accumulateMode: isAccum,
    });
    toast.success(isAccum ? "📜 문단 실시간 누적 모드가 활성화되었습니다." : "📄 단일 컷 자막 모드로 전환되었습니다.");
  };

  const handleSelectMemeEmotion = (emotionPreset: typeof MEME_EMOTION_PRESETS[0]) => {
    if (memeCaptionLayer) {
      updateSpecificLayer(memeCaptionLayer.id, {
        content: `🐸 (${emotionPreset.label.split("/")[0].trim()} 리액션 짤)`,
      });
      toast.success(`🎭 ${emotionPreset.emoji} ${emotionPreset.label} 밈 스티커 적용`);
    }
  };

  // -------------------------------------------------------------
  // [4] 공통 영상 제작 엔진 핸들러 (대본 분할 & 무드 BGM)
  // -------------------------------------------------------------
  const handleScriptSplitPreset = (type: "shorts" | "balanced" | "sentence", label: string) => {
    toast.success(`✂️ AI 대본 분할: '${label}' 모드로 설정되었습니다.`);
  };

  const handleBgmMood = (mood: string, emoji: string) => {
    toast.success(`🎵 ${emoji} '${mood}' 스마트 BGM 무드가 설정되었습니다.`);
  };

  return (
    <div className={`p-3 bg-card rounded-xl border border-primary/25 shadow-xs space-y-3 ${className}`}>
      {/* 헤더 & 아코디언 토글 */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">
            {archetype === "instagram" && "📱 인스타 릴스 전용 스튜디오 도구"}
            {archetype === "gunlimbo" && "⚡ 군림보 와이드 훅 전용 도구"}
            {archetype === "ssul" && "💬 썰형 커뮤니티 전용 도구"}
            {archetype === "classic" && "👑 클래식 표준 쇼츠 전용 도구"}
            {archetype === "bespoke" && "🎨 비스포크 자유 디자인 도구"}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          title={isExpanded ? "도구 접기" : "도구 펼치기"}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3.5 pt-0.5">
          {/* ======================================================== */}
          {/* [1] 인스타형 전용 컨트롤 */}
          {/* ======================================================== */}
          {archetype === "instagram" && (
            <div className="space-y-3">
              {/* 1. 프로필 아이덴티티 */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                    <Camera className="w-3.5 h-3.5 text-pink-500" />
                    <span>프로필 아이덴티티</span>
                  </span>
                  <button
                    onClick={handleRandomInstaProfile}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>🎲 랜덤 추천</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">프로필 핸들 & 태그라인</span>
                  <input
                    type="text"
                    value={profileTextLayer?.content || ""}
                    onChange={(e) => {
                      if (profileTextLayer) {
                        updateSpecificLayer(profileTextLayer.id, { content: e.target.value });
                      }
                    }}
                    placeholder="📸 @viral_shorts  ✓  •  추천 베스트 댓글"
                    className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md font-semibold text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* 2. 중앙 구멍 윈도우 (Hole Window) 마스크 */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                    <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>중앙 비디오 홀 마스크 비율</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {videoHoleLayer ? `${videoHoleLayer.transform.width}×${videoHoleLayer.transform.height}` : "960×960"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {[
                    { id: "1:1", label: "1:1 정사각" },
                    { id: "4:5", label: "4:5 세로형" },
                    { id: "16:9", label: "16:9 와이드" },
                    { id: "full", label: "풀너비" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSetHoleRatio(item.id as any)}
                      className="py-1 px-1.5 text-[10px] font-bold rounded-md bg-background border border-border/80 hover:border-primary hover:text-primary transition-all text-center cursor-pointer shadow-2xs"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {videoHoleLayer && (
                  <div className="pt-1.5 border-t border-border/40 grid grid-cols-2 gap-2">
                    <ScrubInput
                      label="모서리 둥글기"
                      value={videoHoleLayer.borderRadius || 24}
                      onChange={(val) => updateSpecificLayer(videoHoleLayer.id, { borderRadius: val })}
                      min={0}
                      max={60}
                      step={2}
                      unit="px"
                    />
                    <ScrubInput
                      label="테두리 두께"
                      value={videoHoleLayer.borderWidth || 2}
                      onChange={(val) => updateSpecificLayer(videoHoleLayer.id, { borderWidth: val })}
                      min={0}
                      max={10}
                      step={1}
                      unit="px"
                    />
                  </div>
                )}
              </div>

              {/* 3. 하단 가변 베댓 카드 */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>하단 가변 베댓 카드</span>
                  </span>
                  <button
                    onClick={() => {
                      if (commentCardLayer) setSelectedLayerId(commentCardLayer.id);
                    }}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    카드 선택
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">베댓 본문 (자동 줄바꿈 확장)</span>
                    <textarea
                      rows={2}
                      value={commentBodyLayer?.content || ""}
                      onChange={(e) => {
                        if (commentBodyLayer) {
                          updateSpecificLayer(commentBodyLayer.id, { content: e.target.value });
                        }
                      }}
                      placeholder="댓글 내용을 입력하세요"
                      className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md font-semibold text-foreground resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">반응 지표 (좋아요/답글 등)</span>
                    <input
                      type="text"
                      value={commentMetaLayer?.content || ""}
                      onChange={(e) => {
                        if (commentMetaLayer) {
                          updateSpecificLayer(commentMetaLayer.id, { content: e.target.value });
                        }
                      }}
                      placeholder="❤️ 2.4만 • 답글 1,420개 • 공유"
                      className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md font-medium text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* [2] 군림보형 전용 컨트롤 */}
          {/* ======================================================== */}
          {archetype === "gunlimbo" && (
            <div className="space-y-3">
              {/* 1. 상단 2줄 속보 대제목 */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>상단 2줄 속보 대제목</span>
                </span>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={breakingTitleLayer?.content || ""}
                    onChange={(e) => {
                      if (breakingTitleLayer) {
                        updateSpecificLayer(breakingTitleLayer.id, { content: e.target.value });
                      }
                    }}
                    placeholder="🚨 긴급 단독 속보\n이거 모르면 평생 후회합니다"
                    className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md font-bold text-foreground"
                  />

                  {breakingTitleLayer && (
                    <ScrubInput
                      label="대제목 글자 크기"
                      value={breakingTitleLayer.fontSize || 48}
                      onChange={(val) => updateSpecificLayer(breakingTitleLayer.id, { fontSize: val })}
                      min={24}
                      max={72}
                      step={1}
                      unit="px"
                    />
                  )}
                </div>
              </div>

              {/* 2. 중앙 100% 와이드 훅 밴드 */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>중앙 와이드 100% 훅 밴드</span>
                  </span>
                  <button
                    onClick={handleSyncFirstSubtitleToHook}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <span>⚡ 첫 문장 동기화</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={hookTextLayer?.content || ""}
                  onChange={(e) => {
                    if (hookTextLayer) {
                      updateSpecificLayer(hookTextLayer.id, { content: e.target.value });
                    }
                  }}
                  placeholder="⚡ 0초 시선강탈 훅 카피가 여기에 들어갑니다"
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md font-bold text-foreground"
                />

                {hookBandLayer && (
                  <div className="pt-1">
                    <ColorPalettePicker
                      label="훅 밴드 배경색"
                      color={hookBandLayer.fillColor || "#FFFFFF"}
                      onChange={(c) => updateSpecificLayer(hookBandLayer.id, { fillColor: c })}
                    />
                  </div>
                )}
              </div>

              {/* 3. 감정별 4색 컬러 자막 프리셋 (72% 세이프존) */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  <span>감정별 4색 자막 프리셋 (72% 세이프존)</span>
                </span>

                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {[
                    { label: "노랑(팩트)", color: "#FFE500", bg: "bg-[#FFE500] text-black" },
                    { label: "주황(경고)", color: "#FF8A00", bg: "bg-[#FF8A00] text-black" },
                    { label: "핑크(비꼼)", color: "#FF5588", bg: "bg-[#FF5588] text-white" },
                    { label: "흰색(설명)", color: "#FFFFFF", bg: "bg-white text-black border border-zinc-300" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      onClick={() => handleGunlimboSubColor(item.color, item.label)}
                      className={`py-1 px-1 rounded-md text-[10px] font-bold truncate text-center transition-all cursor-pointer shadow-2xs ${item.bg}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* [3] 썰형 전용 컨트롤 */}
          {/* ======================================================== */}
          {archetype === "ssul" && (
            <div className="space-y-3">
              {/* 1. 직장인/커뮤니티 풍자 메타 주입 */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>커뮤니티 게시글 & 메타데이터</span>
                  </span>
                  <button
                    onClick={handleInjectSatiricalMeta}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>🎲 풍자 메타 주입</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">썰 제목</span>
                    <input
                      type="text"
                      value={articleTitleLayer?.content || ""}
                      onChange={(e) => {
                        if (articleTitleLayer) {
                          updateSpecificLayer(articleTitleLayer.id, { content: e.target.value });
                        }
                      }}
                      placeholder="오늘자 역대급 실화 사건 🔥"
                      className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md font-bold text-foreground"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">작성자 및 조회 메타</span>
                    <input
                      type="text"
                      value={articleMetaLayer?.content || ""}
                      onChange={(e) => {
                        if (articleMetaLayer) {
                          updateSpecificLayer(articleMetaLayer.id, { content: e.target.value });
                        }
                      }}
                      placeholder="익명  •  10분 전  •  조회 3.8만  •  추천 412"
                      className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md font-medium text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* 2. 텍스트 디스플레이 누적 모드 */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                  <Split className="w-3.5 h-3.5 text-emerald-500" />
                  <span>썰 자막 재생 방식</span>
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleSetSsulTextMode("accumulate")}
                    className={`py-1.5 px-2 rounded-md text-xs font-bold border transition-all cursor-pointer text-center ${
                      subtitleAnchorLayer?.accumulateMode
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                        : "bg-background border-border text-foreground hover:bg-muted/40"
                    }`}
                  >
                    📜 문단 누적 모드
                  </button>
                  <button
                    onClick={() => handleSetSsulTextMode("single")}
                    className={`py-1.5 px-2 rounded-md text-xs font-bold border transition-all cursor-pointer text-center ${
                      !subtitleAnchorLayer?.accumulateMode
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                        : "bg-background border-border text-foreground hover:bg-muted/40"
                    }`}
                  >
                    📄 단일 컷 자막
                  </button>
                </div>
              </div>

              {/* 3. 상징 밈 캐릭터 감정 팩 (10대 프리셋) */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                  <Smile className="w-3.5 h-3.5 text-emerald-500" />
                  <span>🐸 페페 & 이라스토야 10대 감정 칩</span>
                </span>

                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {MEME_EMOTION_PRESETS.slice(0, 10).map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => handleSelectMemeEmotion(ep)}
                      className="p-1 rounded-md bg-background border border-border/80 hover:border-emerald-500 hover:bg-emerald-500/10 text-center transition-all cursor-pointer flex flex-col items-center shadow-2xs"
                      title={ep.description}
                    >
                      <span className="text-sm">{ep.emoji}</span>
                      <span className="text-[8px] font-bold text-foreground truncate max-w-full">
                        {ep.label.split("/")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* [4] 클래식형 전용 컨트롤 */}
          {/* ======================================================== */}
          {archetype === "classic" && (
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center space-x-1">
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span>클래식 표준 쇼츠 레이아웃</span>
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                상단 1~3줄 타이틀과 중앙 9:16 비디오, 하단 펀치라인 자막으로 구성된 국민 표준 레이아웃입니다.
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* [5] 공통 부가 엔진 (AI 대본 분할 & 무드 BGM) */}
          {/* ======================================================== */}
          <div className="pt-2 border-t border-border/60 space-y-2.5">
            {/* 3대 AI 대본 분할 */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-foreground flex items-center space-x-1">
                <Split className="w-3 h-3 text-primary" />
                <span>3대 AI 대본 분할 프리셋</span>
              </span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "shorts", label: "쇼츠형", sub: "10~15자" },
                  { id: "balanced", label: "균형형", sub: "15~25자" },
                  { id: "sentence", label: "문장형", sub: "완전문장" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleScriptSplitPreset(item.id as any, item.label)}
                    className="p-1 rounded-md bg-background border border-border/80 hover:border-primary text-center transition-all cursor-pointer flex flex-col items-center shadow-2xs"
                  >
                    <span className="text-[10px] font-bold text-foreground">{item.label}</span>
                    <span className="text-[8px] text-muted-foreground">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5대 스마트 무드 BGM */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-foreground flex items-center space-x-1">
                <Music className="w-3 h-3 text-primary" />
                <span>5대 스마트 무드 BGM 선곡</span>
              </span>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: "energetic", label: "도파민", emoji: "⚡" },
                  { id: "emotional", label: "감성", emoji: "🎹" },
                  { id: "suspense", label: "긴장감", emoji: "🔥" },
                  { id: "funny", label: "코믹", emoji: "🤣" },
                  { id: "cinematic", label: "웅장", emoji: "🎬" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleBgmMood(item.label, item.emoji)}
                    className="p-1 rounded-md bg-background border border-border/80 hover:border-primary text-center transition-all cursor-pointer flex flex-col items-center shadow-2xs"
                  >
                    <span className="text-xs">{item.emoji}</span>
                    <span className="text-[8px] font-medium text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormFactorSuiteInspector;
