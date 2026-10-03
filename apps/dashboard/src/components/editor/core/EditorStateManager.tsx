import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  VLStandardBlueprintV4,
  LayerObject,
  SceneDefinition,
  TransformSpec,
} from "../../../types/blueprintV4";
import { BlueprintContext, BlueprintContextValue } from "./BlueprintContext";
import { createDefaultBlueprintV4, migrateToBlueprintV4 } from "../../../lib/blueprintV4Migrator";

export interface EditorStateManagerProps {
  initialBlueprint?: VLStandardBlueprintV4 | any;
  onSave?: (blueprint: VLStandardBlueprintV4) => Promise<void>;
  children: React.ReactNode;
}

const AUTOSAVE_STORAGE_KEY = "vlstudio_blueprint_autosave_v4";
const MAX_HISTORY_STEPS = 50;

/**
 * [EditorStateManager]
 * - 50단계 무손실 Undo/Redo 기록 보관
 * - 30초 오토세이브 심장박동 (Autosave Heartbeat)
 * - window.beforeunload 미저장 이탈 방어 가드
 * - 타임라인 컷 분할 및 동기화 엔진
 */
export const EditorStateManager: React.FC<EditorStateManagerProps> = ({
  initialBlueprint,
  onSave,
  children,
}) => {
  const [blueprint, setBlueprintState] = useState<VLStandardBlueprintV4>(() => {
    // 1. 오토세이브 복구 검사
    try {
      const cached = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 1000 * 60 * 60 * 24) {
          // initialBlueprint가 없거나, 캐시와 ID가 일치하고 레이어가 정상일 때 복원
          if (!initialBlueprint || initialBlueprint.blueprintId === parsed.data?.blueprintId) {
            if (parsed.data?.globalLayers && parsed.data.globalLayers.length >= 2) {
              return migrateToBlueprintV4(parsed.data);
            }
          }
        }
      }
    } catch (e) {
      console.warn("[EditorState] Failed to inspect autosave cache:", e);
    }
    return initialBlueprint ? migrateToBlueprintV4(initialBlueprint) : createDefaultBlueprintV4("classic");
  });

  // initialBlueprint 변경 시 즉시 동기화
  const prevInitialBlueprintId = useRef<string | undefined>(initialBlueprint?.blueprintId);
  useEffect(() => {
    if (initialBlueprint && initialBlueprint.blueprintId !== prevInitialBlueprintId.current) {
      prevInitialBlueprintId.current = initialBlueprint.blueprintId;
      setBlueprintState(migrateToBlueprintV4(initialBlueprint));
      historyRef.current = [];
      futureRef.current = [];
      setDirty(false);
    }
  }, [initialBlueprint]);

  // 기본 표준 아키타입으로 원클릭 초기화
  const resetToDefaultArchetype = useCallback((arch?: any) => {
    const targetArch = arch || blueprint.archetype || "classic";
    const fresh = createDefaultBlueprintV4(targetArch, `${targetArch.toUpperCase()} 디자인 템플릿`);
    setBlueprintState(fresh);
    historyRef.current = [];
    futureRef.current = [];
    setDirty(true);
    setSelectedLayerId(null);
    try {
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    } catch (e) {}
  }, [blueprint.archetype]);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRippleMode, setIsRippleMode] = useState<boolean>(true);
  const [isMagnetSnap, setIsMagnetSnap] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(60); // 60px per sec
  const [dirty, setDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 60fps 실시간 재생 틱커 (Playhead Ticker)
  useEffect(() => {
    if (!isPlaying) return;

    const totalDurationMs = (blueprint.scenes || []).reduce(
      (acc, sc) => acc + (sc.actualDurationMs || sc.targetDurationMs || 4000),
      0
    );

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      setCurrentTimeMs((prev) => {
        const next = prev + delta;
        if (next >= totalDurationMs) {
          setIsPlaying(false);
          return 0; // 재생 완료 시 처음으로 리와인드
        }
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, blueprint?.scenes]);

  // Undo / Redo 스택
  const historyRef = useRef<VLStandardBlueprintV4[]>([]);
  const futureRef = useRef<VLStandardBlueprintV4[]>([]);

  // 1. 상태 변경 및 히스토리 기록
  const setBlueprint = useCallback((next: VLStandardBlueprintV4, recordHistory = true) => {
    setBlueprintState((prev) => {
      if (recordHistory) {
        historyRef.current = [...historyRef.current.slice(-MAX_HISTORY_STEPS + 1), prev];
        futureRef.current = [];
      }
      setDirty(true);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [blueprint, ...futureRef.current];
    setBlueprintState(prev);
    setDirty(true);
  }, [blueprint]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    historyRef.current = [...historyRef.current, blueprint];
    setBlueprintState(next);
    setDirty(true);
  }, [blueprint]);

  // 2. [프로덕션 하드닝 2.1] 30초 오토세이브 심장박동 (Heartbeat)
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirty) {
        try {
          localStorage.setItem(
            AUTOSAVE_STORAGE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              data: blueprint,
            })
          );
          console.info("[EditorState] 30s Autosave Heartbeat: Blueprint saved safely.");
        } catch (err) {
          console.warn("[EditorState] Autosave write failed:", err);
        }
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [blueprint, dirty]);

  // 3. [프로덕션 하드닝 2.1] beforeunload 미저장 이탈 방어 가드
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "저장되지 않은 변경사항이 있습니다. 정말 나가시겠습니까?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  // 4. 레이어 및 씬 조작 핸들러
  const updateLayerTransform = useCallback(
    (layerId: string, transform: TransformSpec) => {
      setBlueprintState((prev) => {
        historyRef.current = [...historyRef.current.slice(-MAX_HISTORY_STEPS + 1), prev];
        futureRef.current = [];
        setDirty(true);

        const nextLayers = (prev.globalLayers || []).map((l) =>
          l.id === layerId ? ({ ...l, transform: { ...transform } } as LayerObject) : l
        );
        return { ...prev, globalLayers: nextLayers };
      });
    },
    []
  );

  const updateLayerContent = useCallback((layerId: string, content: string) => {
    setBlueprintState((prev) => {
      historyRef.current = [...historyRef.current.slice(-MAX_HISTORY_STEPS + 1), prev];
      futureRef.current = [];
      setDirty(true);

      const nextLayers = (prev.globalLayers || []).map((l) =>
        l.id === layerId && l.kind === "text" ? ({ ...l, content } as LayerObject) : l
      );
      return { ...prev, globalLayers: nextLayers };
    });
  }, []);

  const updateLayerStyle = useCallback((layerId: string, patch: Partial<LayerObject>) => {
    setBlueprintState((prev) => {
      historyRef.current = [...historyRef.current.slice(-MAX_HISTORY_STEPS + 1), prev];
      futureRef.current = [];
      setDirty(true);

      const nextLayers = (prev.globalLayers || []).map((l) =>
        l.id === layerId ? ({ ...l, ...patch } as LayerObject) : l
      );
      return { ...prev, globalLayers: nextLayers };
    });
  }, []);

  const updateScene = useCallback((sceneIndex: number, patch: Partial<SceneDefinition>) => {
    setBlueprintState((prev) => {
      historyRef.current = [...historyRef.current.slice(-MAX_HISTORY_STEPS + 1), prev];
      futureRef.current = [];
      setDirty(true);

      const nextScenes = (prev.scenes || []).map((sc, idx) =>
        idx === sceneIndex ? ({ ...sc, ...patch } as SceneDefinition) : sc
      );
      return { ...prev, scenes: nextScenes };
    });
  }, []);

  // 5. 0.01초 컷 분할 (C 키 / 스플릿 엔진)
  const splitSceneAtTime = useCallback(
    (timeMs: number) => {
      setBlueprintState((prev) => {
        let accTime = 0;
        let targetIdx = -1;
        let splitOffsetMs = 0;
        const currentScenes = prev.scenes || [];

        for (let i = 0; i < currentScenes.length; i++) {
          const dur = currentScenes[i].actualDurationMs || currentScenes[i].targetDurationMs || 4000;
          if (timeMs >= accTime && timeMs < accTime + dur) {
            targetIdx = i;
            splitOffsetMs = timeMs - accTime;
            break;
          }
          accTime += dur;
        }

        if (targetIdx === -1 || splitOffsetMs < 200) {
          // 분할 불가 (너무 짧거나 범위 밖)
          return prev;
        }

        const targetScene = currentScenes[targetIdx];
        const originalDur = targetScene.actualDurationMs || targetScene.targetDurationMs || 4000;
        const dur1 = splitOffsetMs;
        const dur2 = originalDur - splitOffsetMs;

        if (dur2 < 200) return prev;

        historyRef.current = [...historyRef.current.slice(-MAX_HISTORY_STEPS + 1), prev];
        futureRef.current = [];
        setDirty(true);

        const scene1: SceneDefinition = {
          ...targetScene,
          targetDurationMs: dur1,
          actualDurationMs: dur1,
        };

        const scene2: SceneDefinition = {
          ...targetScene,
          sceneId: `scene_${Date.now()}`,
          order: targetIdx + 1,
          targetDurationMs: dur2,
          actualDurationMs: dur2,
        };

        const nextScenes = [
          ...currentScenes.slice(0, targetIdx),
          scene1,
          scene2,
          ...currentScenes.slice(targetIdx + 1),
        ].map((s, idx) => ({ ...s, order: idx }));

        return { ...prev, scenes: nextScenes };
      });
    },
    []
  );

  const deleteSelected = useCallback(() => {
    if (selectedLayerId) {
      setBlueprintState((prev) => {
        historyRef.current = [...historyRef.current.slice(-MAX_HISTORY_STEPS + 1), prev];
        futureRef.current = [];
        setDirty(true);
        const nextLayers = (prev.globalLayers || []).filter((l) => l.id !== selectedLayerId);
        return { ...prev, globalLayers: nextLayers };
      });
      setSelectedLayerId(null);
    } else if (selectedSceneIndex >= 0 && (blueprint?.scenes?.length || 0) > 1) {
      setBlueprintState((prev) => {
        historyRef.current = [...historyRef.current.slice(-MAX_HISTORY_STEPS + 1), prev];
        futureRef.current = [];
        setDirty(true);
        const nextScenes = (prev.scenes || [])
          .filter((_, idx) => idx !== selectedSceneIndex)
          .map((s, idx) => ({ ...s, order: idx }));
        return { ...prev, scenes: nextScenes };
      });
      setSelectedSceneIndex(Math.max(0, selectedSceneIndex - 1));
    }
  }, [selectedLayerId, selectedSceneIndex, blueprint?.scenes?.length]);

  const saveBlueprint = useCallback(async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(blueprint);
      }
      setDirty(false);
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
      console.info("[EditorState] Blueprint saved successfully.");
    } catch (err) {
      console.error("[EditorState] Failed to save blueprint:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [blueprint, onSave]);

  const value: BlueprintContextValue = {
    blueprint,
    setBlueprint,
    selectedLayerId,
    setSelectedLayerId,
    selectedSceneIndex,
    setSelectedSceneIndex,
    currentTimeMs,
    setCurrentTimeMs,
    isPlaying,
    setIsPlaying,
    isRippleMode,
    setIsRippleMode,
    isMagnetSnap,
    setIsMagnetSnap,
    zoomLevel,
    setZoomLevel,
    updateLayerTransform,
    updateLayerContent,
    updateLayerStyle,
    updateScene,
    splitSceneAtTime,
    deleteSelected,
    undo,
    redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    dirty,
    saveBlueprint,
    isSaving,
    resetToDefaultArchetype,
  };

  return <BlueprintContext.Provider value={value}>{children}</BlueprintContext.Provider>;
};
