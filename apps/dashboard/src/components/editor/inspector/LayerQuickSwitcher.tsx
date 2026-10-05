import React, { useState } from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { LayerObject, TextLayer, ShapeLayer } from "../../../types/blueprintV4";

export interface LayerQuickSwitcherProps {
  className?: string;
}

/**
 * [LayerQuickSwitcher]
 * 우측 인스펙터 상시 레이어 퀵 스위처
 * - 레이어가 선택되어 있든 없든 상시 상단에 위치하여 1초 만에 다른 레이어로 전환
 * - 눈(가시성), 자물쇠(잠금), 레이어 추가, 레이어 삭제 기능 통합
 */
export const LayerQuickSwitcher: React.FC<LayerQuickSwitcherProps> = ({ className = "" }) => {
  const {
    blueprint,
    setBlueprint,
    selectedLayerId,
    setSelectedLayerId,
    deleteLayer,
  } = useBlueprint();

  const [isOpen, setIsOpen] = useState(false);

  const globalLayers = blueprint?.globalLayers || [];
  const selectedLayer = globalLayers.find((l) => l.id === selectedLayerId) || null;

  // 가시성 토글
  const toggleVisibility = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlueprint({
      ...blueprint,
      globalLayers: globalLayers.map((l) =>
        l.id === layerId ? { ...l, hidden: !l.hidden } : l
      ),
    });
  };

  // 잠금 토글
  const toggleLock = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlueprint({
      ...blueprint,
      globalLayers: globalLayers.map((l) =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      ),
    });
  };

  // 텍스트 레이어 추가
  const handleAddText = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `text_${Date.now()}`;
    const newText: TextLayer = {
      id: newId,
      name: `텍스트 ${globalLayers.length + 1}`,
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
      content: "새 텍스트",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 52,
      fontColor: "#FFFFFF",
      letterSpacing: -1,
      lineHeight: 1.2,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
      multiLineStyles: [],
      verticalPosition: 0,
    };
    setBlueprint({
      ...blueprint,
      globalLayers: [...globalLayers, newText],
    });
    setSelectedLayerId(newId);
    setIsOpen(false);
  };

  // 박스 레이어 추가
  const handleAddShape = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `shape_${Date.now()}`;
    const newShape: ShapeLayer = {
      id: newId,
      name: `박스 ${globalLayers.length + 1}`,
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
        zIndex: globalLayers.length + 5,
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
      globalLayers: [...globalLayers, newShape],
    });
    setSelectedLayerId(newId);
    setIsOpen(false);
  };

  const getLayerIcon = (l: LayerObject) => {
    if (l.kind === "text") return "✏️";
    if (l.kind === "shape") return "⏹️";
    return "🖼️";
  };

  return (
    <div className={`relative select-none ${className}`}>
      {/* 상시 컴팩트 바 */}
      <div className="flex items-center justify-between p-1.5 bg-muted/60 hover:bg-muted/80 rounded-xl border border-border text-xs transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center space-x-1.5 px-1.5 py-0.5 min-w-0 text-left cursor-pointer"
          title="클릭하여 전체 레이어 목록 열기"
        >
          <span className="text-sm shrink-0">
            {selectedLayer ? getLayerIcon(selectedLayer) : "📑"}
          </span>
          <span className="font-semibold truncate text-foreground flex-1">
            {selectedLayer ? selectedLayer.name : "레이어 선택 (미선택)"}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {isOpen ? "▲" : "▼"}
          </span>
        </button>

        {/* 선택된 레이어가 있을 때: 즉시 눈/자물쇠 제어 */}
        {selectedLayer && (
          <div className="flex items-center space-x-0.5 shrink-0 px-1 border-l border-border/60 ml-1">
            <button
              type="button"
              onClick={(e) => toggleVisibility(selectedLayer.id, e)}
              className={`p-1 rounded hover:bg-background/80 transition-colors cursor-pointer ${
                selectedLayer.hidden ? "opacity-40" : "text-foreground"
              }`}
              title={selectedLayer.hidden ? "표시하기" : "숨기기"}
            >
              {selectedLayer.hidden ? "👁️‍🗨️" : "👁️"}
            </button>
            <button
              type="button"
              onClick={(e) => toggleLock(selectedLayer.id, e)}
              className={`p-1 rounded hover:bg-background/80 transition-colors cursor-pointer ${
                selectedLayer.locked ? "text-amber-500 font-bold" : "opacity-40 hover:opacity-100"
              }`}
              title={selectedLayer.locked ? "잠금 해제" : "잠그기"}
            >
              {selectedLayer.locked ? "🔒" : "🔓"}
            </button>
          </div>
        )}

        {/* 신규 레이어 추가 퀵 버튼 */}
        <div className="flex items-center space-x-0.5 shrink-0 pl-1 border-l border-border/60">
          <button
            type="button"
            onClick={handleAddText}
            className="p-1 rounded hover:bg-primary/20 text-primary font-bold transition-colors cursor-pointer text-xs"
            title="텍스트 레이어 추가"
          >
            +T
          </button>
          <button
            type="button"
            onClick={handleAddShape}
            className="p-1 rounded hover:bg-primary/20 text-primary font-bold transition-colors cursor-pointer text-xs"
            title="박스(쉐이프) 레이어 추가"
          >
            +■
          </button>
        </div>
      </div>

      {/* 레이어 목록 드롭다운 팝오버 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 p-1.5 space-y-1 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/50">
            <span>레이어 목록 ({globalLayers.length})</span>
            <button
              type="button"
              onClick={() => {
                setSelectedLayerId(null);
                setIsOpen(false);
              }}
              className="text-[10px] text-primary hover:underline cursor-pointer"
            >
              선택 해제
            </button>
          </div>

          {globalLayers.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              레이어가 없습니다. 상단 + 버튼으로 추가하세요.
            </div>
          ) : (
            globalLayers.map((layer, idx) => {
              const isSelected = layer.id === selectedLayerId;
              return (
                <div
                  key={layer.id}
                  onClick={() => {
                    setSelectedLayerId(layer.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                    <span className="text-xs">{getLayerIcon(layer)}</span>
                    <span className="truncate">{layer.name}</span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => toggleVisibility(layer.id, e)}
                      className={`p-0.5 rounded transition-opacity cursor-pointer ${
                        layer.hidden ? "opacity-30" : "opacity-80 hover:opacity-100"
                      }`}
                      title={layer.hidden ? "표시하기" : "숨기기"}
                    >
                      {layer.hidden ? "👁️‍🗨️" : "👁️"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleLock(layer.id, e)}
                      className={`p-0.5 rounded transition-opacity cursor-pointer ${
                        layer.locked ? "opacity-100 text-amber-400" : "opacity-30 hover:opacity-80"
                      }`}
                      title={layer.locked ? "잠금 해제" : "잠그기"}
                    >
                      {layer.locked ? "🔒" : "🔓"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      className="p-0.5 rounded text-destructive/80 hover:text-destructive transition-colors cursor-pointer"
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
      )}
    </div>
  );
};
