import React from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { LayerObject, Archetype, TextLayer, ShapeLayer } from "../../../types/blueprintV4";
import { createDefaultBlueprintV4 } from "../../../lib/blueprintV4Migrator";

export interface CanvasGlobalInspectorProps {
  className?: string;
}

const ARCHETYPE_INFO: Record<Archetype, { name: string; emoji: string; desc: string; badge: string }> = {
  classic: {
    name: "클래식 (샌드위치)",
    emoji: "🎬",
    desc: "상·하단 레터박스 & 2단 대제목 & 중앙 자막",
    badge: "가장 안정적인 유튜브 표준",
  },
  gunlimbo: {
    name: "군림보 (브레이킹)",
    emoji: "⚡",
    desc: "0초 시선강탈 훅 밴드 & 볼드 펀치 자막",
    badge: "숏폼 초반 이탈 방어율 98%",
  },
  instagram: {
    name: "인스타 (베댓 피드)",
    emoji: "📸",
    desc: "베스트 댓글 카드 & 작성자 프로필 & 피드 자막",
    badge: "릴스·스레드 바이럴 1위",
  },
  ssul: {
    name: "썰형 (커뮤니티)",
    emoji: "💬",
    desc: "상단 긴급 헤더바 & 실시간 자막 순차 누적",
    badge: "스토리텔링 체류시간 극대화",
  },
  bespoke: {
    name: "비스포크 (자유형)",
    emoji: "✨",
    desc: "모든 레이어 자유 배치 & 채널 DNA 맞춤형",
    badge: "채널 고유 시그니처",
  },
};

export const CanvasGlobalInspector: React.FC<CanvasGlobalInspectorProps> = ({ className = "" }) => {
  const {
    blueprint,
    setBlueprint,
    selectedLayerId,
    setSelectedLayerId,
    deleteLayer,
  } = useBlueprint();

  const currentArchInfo = ARCHETYPE_INFO[blueprint.archetype] || ARCHETYPE_INFO.classic;

  // 아키타입 전환 핸들러
  const handleSwitchArchetype = (arch: Archetype) => {
    const isDefaultTemplateName =
      !blueprint.name ||
      blueprint.name === "새 프로젝트" ||
      /^(CLASSIC|INSTA|INSTAGRAM|GUNLIMBO|SSUL|BESPOKE)\s*디자인\s*템플릿$/i.test(blueprint.name);
    const newName = isDefaultTemplateName ? `${arch.toUpperCase()} 디자인 템플릿` : blueprint.name;
    const defaultBp = createDefaultBlueprintV4(arch, newName);
    setBlueprint({
      ...blueprint,
      name: newName,
      archetype: arch,
      globalLayers: defaultBp.globalLayers,
    });
  };

  // 캔버스 배경색 변경
  const handleCanvasBgChange = (color: string) => {
    setBlueprint({
      ...blueprint,
      canvas: {
        ...blueprint.canvas,
        backgroundColor: color,
      },
    });
  };

  // 신규 텍스트 레이어 추가
  const handleAddTextLayer = () => {
    const newId = `text_${Date.now()}`;
    const newTextLayer: TextLayer = {
      id: newId,
      name: `텍스트 ${blueprint.globalLayers.length + 1}`,
      kind: "text",
      locked: false,
      hidden: false,
      transform: {
        x: 540,
        y: 960,
        width: 800,
        height: 120,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: blueprint.globalLayers.length + 10,
      },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "title_header",
      content: "새로운 텍스트",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 48,
      fontColor: "#FFFFFF",
      letterSpacing: -1,
      lineHeight: 1.2,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    };

    setBlueprint({
      ...blueprint,
      globalLayers: [...blueprint.globalLayers, newTextLayer],
    });
    setSelectedLayerId(newId);
  };

  // 신규 쉐이프(배경 박스) 레이어 추가
  const handleAddShapeLayer = () => {
    const newId = `shape_${Date.now()}`;
    const newShapeLayer: ShapeLayer = {
      id: newId,
      name: `박스 ${blueprint.globalLayers.length + 1}`,
      kind: "shape",
      locked: false,
      hidden: false,
      transform: {
        x: 540,
        y: 960,
        width: 900,
        height: 160,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: blueprint.globalLayers.length + 5,
      },
      inMs: 0,
      outMs: null,
      opacity: 0.9,
      shapeRole: "hook_band",
      fillColor: "#18181B",
      borderRadius: 12,
      borderWidth: 0,
    };

    setBlueprint({
      ...blueprint,
      globalLayers: [...blueprint.globalLayers, newShapeLayer],
    });
    setSelectedLayerId(newId);
  };

  // 레이어 가시성 토글
  const toggleLayerVisibility = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlueprint({
      ...blueprint,
      globalLayers: blueprint.globalLayers.map((l) =>
        l.id === layerId ? { ...l, hidden: !l.hidden } : l
      ),
    });
  };

  // 레이어 잠금 토글
  const toggleLayerLock = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlueprint({
      ...blueprint,
      globalLayers: blueprint.globalLayers.map((l) =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      ),
    });
  };

  return (
    <div className={`space-y-4 select-none ${className}`}>
      {/* 1. 현재 아키타입 카드 */}
      <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-base">{currentArchInfo.emoji}</span>
            <span className="font-bold text-xs text-foreground">{currentArchInfo.name}</span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
            {blueprint.archetype.toUpperCase()}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {currentArchInfo.desc}
        </p>
        <div className="text-[10px] text-primary/80 font-mono flex items-center space-x-1">
          <span>✨</span>
          <span>{currentArchInfo.badge}</span>
        </div>

        {/* 아키타입 퀵 변경 버튼 그리드 (상단 바와 100% 동일한 5대 형식) */}
        <div className="pt-2 border-t border-border grid grid-cols-3 gap-1.5">
          {(["classic", "gunlimbo", "instagram", "ssul", "bespoke"] as Archetype[]).map((arch) => {
            const isSelected = blueprint.archetype === arch;
            return (
              <button
                key={arch}
                onClick={() => handleSwitchArchetype(arch)}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                    : "bg-muted/70 text-foreground border-border hover:bg-muted hover:border-border/80"
                }`}
                title={ARCHETYPE_INFO[arch].desc}
              >
                <span>{ARCHETYPE_INFO[arch].emoji}</span>
                <span>{ARCHETYPE_INFO[arch].name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 캔버스 해상도 및 배경색 */}
      <div className="p-3 bg-card rounded-xl border border-border space-y-2.5">
        <div className="text-xs font-bold text-foreground flex items-center justify-between">
          <span>🖼️ 캔버스 마스터 설정</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {blueprint?.canvas?.width || 1080} × {blueprint?.canvas?.height || 1920} ({blueprint?.canvas?.aspectRatio || "9:16"})
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>캔버스 배경색</span>
            <span className="font-mono text-[10px] text-foreground">
              {blueprint.canvas.backgroundColor || "#000000"}
            </span>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={blueprint.canvas.backgroundColor || "#000000"}
              onChange={(e) => handleCanvasBgChange(e.target.value)}
              className="w-8 h-8 rounded-lg border border-border bg-transparent cursor-pointer"
            />
            <div className="flex items-center space-x-1 flex-1">
              {["#000000", "#09090b", "#18181b", "#ffffff", "#1e1b4b"].map((c) => (
                <button
                  key={c}
                  onClick={() => handleCanvasBgChange(c)}
                  className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                    blueprint.canvas.backgroundColor === c
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 레이어 생성 도구 */}
      <div className="p-3 bg-card rounded-xl border border-border space-y-2">
        <div className="text-xs font-bold text-foreground">➕ 레이어 추가</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleAddTextLayer}
            className="py-1.5 px-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <span>✍️</span>
            <span>텍스트 추가</span>
          </button>
          <button
            onClick={handleAddShapeLayer}
            className="py-1.5 px-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <span>▢</span>
            <span>박스(쉐이프) 추가</span>
          </button>
        </div>
      </div>

      {/* 4. 레이어 트리 목록 */}
      <div className="p-3 bg-card rounded-xl border border-border space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-foreground">
          <span>📑 레이어 계층 구조 ({blueprint.globalLayers.length})</span>
          <span className="text-[10px] text-muted-foreground font-normal">
            클릭하여 편집
          </span>
        </div>

        <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
          {blueprint.globalLayers.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              등록된 레이어가 없습니다.
            </div>
          ) : (
            blueprint.globalLayers.map((layer) => {
              const isSelected = selectedLayerId === layer.id;
              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/15 border-primary text-primary font-semibold shadow-xs"
                      : "bg-muted/40 border-border text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span className="text-xs shrink-0">
                      {layer.kind === "text" ? "🔤" : layer.kind === "shape" ? "▢" : "🖼️"}
                    </span>
                    <span className="truncate text-xs">{layer.name}</span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-1">
                    <button
                      onClick={(e) => toggleLayerVisibility(layer.id, e)}
                      className={`p-1 rounded hover:bg-background/80 text-xs transition-colors cursor-pointer ${
                        layer.hidden ? "opacity-30" : "opacity-80"
                      }`}
                      title={layer.hidden ? "표시하기" : "숨기기"}
                    >
                      {layer.hidden ? "👁️‍🗨️" : "👁️"}
                    </button>
                    <button
                      onClick={(e) => toggleLayerLock(layer.id, e)}
                      className={`p-1 rounded hover:bg-background/80 text-xs transition-colors cursor-pointer ${
                        layer.locked ? "opacity-90 text-amber-500" : "opacity-40"
                      }`}
                      title={layer.locked ? "잠금 해제" : "잠그기"}
                    >
                      {layer.locked ? "🔒" : "🔓"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-red-500 text-xs transition-colors cursor-pointer opacity-60 hover:opacity-100"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
