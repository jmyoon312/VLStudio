import React, { createContext, useContext } from "react";
import {
  VLStandardBlueprintV4,
  LayerObject,
  SceneDefinition,
  TransformSpec,
} from "../../../types/blueprintV4";

export interface BlueprintContextValue {
  blueprint: VLStandardBlueprintV4;
  setBlueprint: (bp: VLStandardBlueprintV4 | ((prev: VLStandardBlueprintV4) => VLStandardBlueprintV4), recordHistory?: boolean) => void;
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
  selectedSceneIndex: number;
  setSelectedSceneIndex: (idx: number) => void;
  currentTimeMs: number;
  setCurrentTimeMs: (ms: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isRippleMode: boolean;
  setIsRippleMode: (ripple: boolean) => void;
  isMagnetSnap: boolean;
  setIsMagnetSnap: (magnet: boolean) => void;
  zoomLevel: number; // px per second
  setZoomLevel: (zoom: number) => void;
  updateLayerTransform: (layerId: string, transform: TransformSpec) => void;
  updateLayerContent: (layerId: string, content: string) => void;
  updateLayerStyle: (layerId: string, patch: Partial<LayerObject>) => void;
  updateScene: (sceneIndex: number, patch: Partial<SceneDefinition>) => void;
  splitSceneAtTime: (timeMs: number) => void;
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  saveBlueprint: () => Promise<void>;
  isSaving: boolean;
  resetToDefaultArchetype: (archetype?: any) => void;
}

export const BlueprintContext = createContext<BlueprintContextValue | null>(null);

export const useBlueprint = (): BlueprintContextValue => {
  const ctx = useContext(BlueprintContext);
  if (!ctx) {
    throw new Error("useBlueprint must be used within an EditorStateManager or BlueprintProvider");
  }
  return ctx;
};
