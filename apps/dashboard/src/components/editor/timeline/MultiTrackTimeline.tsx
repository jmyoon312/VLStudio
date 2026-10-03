import React, { useRef, useEffect } from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { TimelineRuler } from "./TimelineRuler";
import { TimelineToolbar } from "./TimelineToolbar";
import { ClipTrackItem } from "./ClipTrackItem";
import { WaveformRenderer } from "./WaveformRenderer";

export interface MultiTrackTimelineProps {
  className?: string;
  onToggleCollapse?: () => void;
}

/**
 * [MultiTrackTimeline]
 * 전문 NLE 멀티트랙 타임라인 (5단 트랙)
 * - Track 1: 메인 비주얼 (V1)
 * - Track 2: 오버레이 & 쉐이프 (T1)
 * - Track 3: 키네틱 자막 (T2)
 * - Track 4: 나레이션 음성 TTS (A1)
 * - Track 5: BGM & SFX (A2) with -24dB 덕킹
 */
export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  className = "",
  onToggleCollapse,
}) => {
  const {
    blueprint,
    currentTimeMs,
    setCurrentTimeMs,
    isPlaying,
    selectedSceneIndex,
    setSelectedSceneIndex,
    selectedLayerId,
    setSelectedLayerId,
    zoomLevel,
    updateScene,
  } = useBlueprint();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLDivElement>(null);

  // 총 길이 계산 (씬 길이의 합)
  const totalDurationMs = (blueprint?.scenes || []).reduce(
    (acc, sc) => acc + (sc.actualDurationMs || sc.targetDurationMs || 4000),
    0
  );

  const totalWidthPx = (totalDurationMs / 1000) * zoomLevel;
  const playheadLeftPx = (currentTimeMs / 1000) * zoomLevel;

  // 재생 시 플레이헤드 추적 자동 스크롤
  useEffect(() => {
    if (!isPlaying || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const playheadX = (currentTimeMs / 1000) * zoomLevel;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;

    if (playheadX > scrollLeft + clientWidth * 0.85) {
      container.scrollLeft = playheadX - clientWidth * 0.2;
    } else if (playheadX < scrollLeft) {
      container.scrollLeft = Math.max(0, playheadX - 50);
    }
  }, [currentTimeMs, isPlaying, zoomLevel]);

  // 트랙 영역 클릭 시 해당 시간으로 재생 헤드 즉시 탐색(Seek)
  const handleTrackAreaMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetSec = clickX / zoomLevel;
    const targetMs = Math.max(0, Math.min(totalDurationMs, targetSec * 1000));
    setCurrentTimeMs(Math.round(targetMs));
  };

  // 수직 스크롤 시 좌측 트랙 라벨 헤더와 1:1 동기화
  const handleTrackAreaScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerContainerRef.current) {
      headerContainerRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div className={`flex flex-col bg-card border-t border-border ${className}`}>
      {/* 1. 상단 툴바 */}
      <TimelineToolbar
        totalDurationMs={totalDurationMs}
        onToggleCollapse={onToggleCollapse}
      />

      {/* 2. 타임라인 메인 뷰 (좌측 트랙 헤더 + 우측 스크롤 트랙) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 좌측: 트랙 라벨 헤더 */}
        <div
          ref={headerContainerRef}
          className="w-36 bg-muted/40 border-r border-border flex flex-col select-none shrink-0 z-20 overflow-hidden"
        >
          {/* 눈금자와 일치하는 상단 헤더 공간 */}
          <div className="h-7 border-b border-border/80 bg-muted/70 px-3 flex items-center text-[10px] font-semibold text-muted-foreground shrink-0 sticky top-0 z-10">
            <span>트랙 목록</span>
          </div>

          <div className="h-14 border-b border-border/80 px-3 flex items-center justify-between text-xs font-semibold text-foreground shrink-0">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>V1 비디오</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">1080p</span>
          </div>

          <div className="h-12 border-b border-border/80 px-3 flex items-center justify-between text-xs font-semibold text-foreground shrink-0">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>T1 쉐이프</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">배너</span>
          </div>

          <div className="h-12 border-b border-border/80 px-3 flex items-center justify-between text-xs font-semibold text-foreground shrink-0">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>T2 자막</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">키네틱</span>
          </div>

          <div className="h-14 border-b border-border/80 px-3 flex items-center justify-between text-xs font-semibold text-foreground shrink-0">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>A1 음성 TTS</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Kore</span>
          </div>

          <div className="h-14 border-b border-border/80 px-3 flex items-center justify-between text-xs font-semibold text-foreground shrink-0">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>A2 BGM</span>
            </span>
            <span className="text-[10px] text-primary font-mono font-bold">-24dB</span>
          </div>

          {/* 스크롤바 세이프존 하단 여백 */}
          <div className="h-4 shrink-0" />
        </div>

        {/* 우측: 수평/수직 스크롤 트랙 영역 */}
        <div
          ref={scrollContainerRef}
          onScroll={handleTrackAreaScroll}
          className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar"
        >
          <div
            className="relative select-none cursor-crosshair pb-4"
            style={{ width: `${Math.max(1000, totalWidthPx + 200)}px` }}
            onMouseDown={handleTrackAreaMouseDown}
          >
            {/* 눈금자 (상단 sticky 고정) */}
            <div className="sticky top-0 z-40 bg-card">
              <TimelineRuler
                totalDurationMs={totalDurationMs}
                currentTimeMs={currentTimeMs}
                zoomLevel={zoomLevel}
                onSeek={setCurrentTimeMs}
              />
            </div>

            {/* 수직 관통 플레이헤드 바 (적색/청록색 라인) */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 w-0.5 bg-primary shadow-sm"
              style={{ left: `${playheadLeftPx}px` }}
            />

            {/* 트랙 1: V1 메인 비디오 씬 */}
            <div className="h-14 border-b border-border/40 relative bg-background/50">
              {(() => {
                let startAcc = 0;
                return (blueprint?.scenes || []).map((sc, idx) => {
                  const dur = sc.actualDurationMs || sc.targetDurationMs || 4000;
                  const itemStart = startAcc;
                  const item = (
                    <ClipTrackItem
                      key={sc.sceneId}
                      id={sc.sceneId}
                      title={`씬 ${idx + 1}: ${sc.role}`}
                      startMs={itemStart}
                      durationMs={dur}
                      zoomLevel={zoomLevel}
                      isSelected={selectedSceneIndex === idx}
                      color="cyan"
                      onSelect={() => {
                        setSelectedSceneIndex(idx);
                        setSelectedLayerId(null);
                        setCurrentTimeMs(itemStart);
                      }}
                      onTrimChange={(_newStart, newDur) => {
                        updateScene(idx, { actualDurationMs: newDur, targetDurationMs: newDur });
                      }}
                    >
                      <div className="w-full h-full flex items-center px-2 text-[10px] text-muted-foreground truncate">
                        {sc.scriptText}
                      </div>
                    </ClipTrackItem>
                  );
                  startAcc += dur;
                  return item;
                });
              })()}
            </div>

            {/* 트랙 2: T1 글로벌 쉐이프 레이어 */}
            <div className="h-12 border-b border-border/40 relative bg-muted/20">
              {(blueprint?.globalLayers || [])
                .filter((l) => l.kind === "shape")
                .map((layer) => (
                  <ClipTrackItem
                    key={layer.id}
                    id={layer.id}
                    title={layer.name}
                    startMs={layer.inMs}
                    durationMs={layer.outMs ? layer.outMs - layer.inMs : totalDurationMs}
                    zoomLevel={zoomLevel}
                    isSelected={selectedLayerId === layer.id}
                    color="purple"
                    onSelect={() => {
                      setSelectedLayerId(layer.id);
                      setCurrentTimeMs(layer.inMs);
                    }}
                  />
                ))}
            </div>

            {/* 트랙 3: T2 키네틱 자막 워드 */}
            <div className="h-12 border-b border-border/40 relative bg-background/50">
              {(() => {
                let startAcc = 0;
                return (blueprint?.scenes || []).map((sc) => {
                  const dur = sc.actualDurationMs || sc.targetDurationMs || 4000;
                  const sceneStart = startAcc;
                  startAcc += dur;

                  return (
                    <React.Fragment key={sc.sceneId}>
                      {sc.words?.map((w, wIdx) => (
                        <div
                          key={wIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTimeMs(sceneStart + w.startMs);
                          }}
                          className="absolute top-1.5 bottom-1.5 rounded bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/50 px-1 text-[9px] text-amber-600 dark:text-amber-300 font-bold truncate flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
                          style={{
                            left: `${((sceneStart + w.startMs) / 1000) * zoomLevel}px`,
                            width: `${Math.max(16, ((w.endMs - w.startMs) / 1000) * zoomLevel)}px`,
                          }}
                          title={`클릭 시 해당 시점으로 이동: ${w.word} (${w.startMs}ms ~ ${w.endMs}ms)`}
                        >
                          {w.word}
                        </div>
                      ))}
                    </React.Fragment>
                  );
                });
              })()}
            </div>

            {/* 트랙 4: A1 나레이션 TTS 음성 (파형 렌더러 탑재) */}
            <div className="h-14 border-b border-border/40 relative bg-muted/20">
              {(() => {
                let startAcc = 0;
                return (blueprint?.scenes || []).map((sc, idx) => {
                  const dur = sc.actualDurationMs || sc.targetDurationMs;
                  const voxStart = startAcc;
                  const wPx = Math.max(20, (dur / 1000) * zoomLevel);
                  const item = (
                    <ClipTrackItem
                      key={sc.sceneId}
                      id={`vox_${sc.sceneId}`}
                      title={`보이스 ${idx + 1} (${sc.role})`}
                      startMs={voxStart}
                      durationMs={dur}
                      zoomLevel={zoomLevel}
                      color="emerald"
                      onSelect={() => {
                        setSelectedSceneIndex(idx);
                        setCurrentTimeMs(voxStart);
                      }}
                    >
                      <WaveformRenderer
                        durationMs={dur}
                        widthPx={wPx}
                        heightPx={28}
                        color="#10b981"
                      />
                    </ClipTrackItem>
                  );
                  startAcc += dur;
                  return item;
                });
              })()}
            </div>

            {/* 트랙 5: A2 BGM & -24dB 자동 덕킹 */}
            <div className="h-14 border-b border-border/40 relative bg-background/50">
              <ClipTrackItem
                id="bgm_main"
                title={`BGM: ${blueprint.audioDSP.bgmSignature.genre} (덕킹: -24dB)`}
                startMs={0}
                durationMs={totalDurationMs}
                zoomLevel={zoomLevel}
                color="blue"
              >
                <WaveformRenderer
                  durationMs={totalDurationMs}
                  widthPx={totalWidthPx}
                  heightPx={28}
                  color="#3b82f6"
                />
              </ClipTrackItem>
            </div>

            {/* 가로 스크롤바 가림 방지 세이프존 여백 */}
            <div className="h-4 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
