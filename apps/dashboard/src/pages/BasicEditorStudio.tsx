import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Palette, Sliders, Type, Layers, Video, Play, Pause, Save, RotateCcw, 
  Undo2, Redo2, Eye, EyeOff, Lock, Unlock, Shield, Smartphone, Sparkles, 
  Check, Plus, Trash2, Film, MessageSquare, Swords, Clapperboard, 
  ChevronRight, ChevronLeft, Copy, ExternalLink, Move, ZoomIn, ZoomOut, 
  Maximize2, RefreshCw, FolderOpen, AlignLeft, AlignCenter, AlignRight,
  Zap, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';
import { VLStandardBlueprint, VLLayerObject, VLTextLayer, VLMediaLayer, VLShapeLayer } from '@/types/blueprint';
import { getArchetypePreset } from '@/lib/archetypePresets';
import { CanvasKitViewportStage } from '@/components/canvas/stage/CanvasKitViewportStage';
import { generateCapcutDraftLocal } from '@/services/capcutLocalGenerator';

export const BasicEditorStudio: React.FC = () => {
  const { mode } = useParams<{ mode?: string }>();
  const navigate = useNavigate();

  // 1. 현재 아키타입 모드 ('ssul' | 'gunlimbo' | 'instagram' | 'classic')
  const validModes: Array<'ssul' | 'gunlimbo' | 'instagram' | 'classic'> = ['ssul', 'gunlimbo', 'instagram', 'classic'];
  const initialMode = mode && validModes.includes(mode as any) ? (mode as any) : 'ssul';
  const [currentArchetype, setCurrentArchetype] = useState<'ssul' | 'gunlimbo' | 'instagram' | 'classic'>(initialMode);

  // 2. 단일 진실 공급원 청사진 (VLStandardBlueprint v3)
  const [blueprint, setBlueprint] = useState<VLStandardBlueprint>(() => getArchetypePreset(initialMode));
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // 3. 뷰포트 상태
  const [canvasScale, setCanvasScale] = useState<number>(0.38); // 1080x1920 기준 축소
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 아키타입 전환 시 청사진 동기화
  const handleSwitchArchetype = (archetype: 'ssul' | 'gunlimbo' | 'instagram' | 'classic') => {
    setCurrentArchetype(archetype);
    const newBp = getArchetypePreset(archetype);
    setBlueprint(newBp);
    setSelectedLayerId(null);
    toast.success(`${archetype.toUpperCase()} 원형 프리셋으로 전환되었습니다.`);
  };

  // 선택된 레이어 객체
  const selectedLayer = blueprint.layers.find((l) => l.id === selectedLayerId);

  // 레이어 속성 업데이트 핸들러
  const handleUpdateLayer = (layerId: string, patch: Partial<VLLayerObject>) => {
    setBlueprint((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? ({ ...l, ...patch } as VLLayerObject) : l)),
    }));
  };

  // 캔버스 뷰포트 내 드래그를 통한 레이어 위치/크기 실시간 변형
  const handleUpdateLayerTransform = (
    layerId: string,
    patch: { x?: number; y?: number; width?: number; height?: number }
  ) => {
    setBlueprint((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId ? ({ ...l, transform: { ...l.transform, ...patch } } as VLLayerObject) : l
      ),
    }));
  };

  // 레이어 추가 핸들러
  const handleAddLayer = (kind: 'text' | 'media' | 'shape') => {
    const newId = `layer_${kind}_${Date.now().toString(36)}`;
    const maxZ = Math.max(...blueprint.layers.map((l) => l.transform.zIndex), 0);

    let newLayer: VLLayerObject;
    if (kind === 'text') {
      newLayer = {
        id: newId,
        name: '새 텍스트 레이어',
        kind: 'text',
        textRole: 'subtitle_narrative',
        locked: false,
        hidden: false,
        transform: { x: 540, y: 960, width: 800, height: 120, rotation: 0, scale: 1, origin: 'center', zIndex: maxZ + 1 },
        inMs: 0,
        outMs: null,
        opacity: 1,
        content: '새 자막 문구를 입력하세요',
        fontFamily: 'NotoSansKR-Bold',
        fontSize: 48,
        fontColor: '#FFFFFF',
        letterSpacing: -1,
        lineHeight: 1.3,
        textAlign: 'center',
        stroke: { color: '#000000', width: 4 },
        borderRadius: 0,
        padding: [0, 0, 0, 0],
        accumulateMode: false,
      };
    } else if (kind === 'media') {
      newLayer = {
        id: newId,
        name: '새 미디어 레이어',
        kind: 'media',
        mediaRole: 'b_roll',
        locked: false,
        hidden: false,
        transform: { x: 540, y: 960, width: 600, height: 600, rotation: 0, scale: 1, origin: 'center', zIndex: maxZ + 1 },
        inMs: 0,
        outMs: null,
        opacity: 1,
        assetId: 'sample2',
        fit: 'cover',
        focus: [0.5, 0.5],
        motion: { type: 'zoom_in', strength: 0.1, durationMs: 3000 },
        clipFromMs: 0,
      };
    } else {
      newLayer = {
        id: newId,
        name: '새 박스 도형 레이어',
        kind: 'shape',
        shapeRole: 'hook_band',
        locked: false,
        hidden: false,
        transform: { x: 540, y: 960, width: 800, height: 200, rotation: 0, scale: 1, origin: 'center', zIndex: maxZ + 1 },
        inMs: 0,
        outMs: null,
        opacity: 0.9,
        fillColor: '#FBBF24',
        borderRadius: 16,
        borderWidth: 0,
      };
    }

    setBlueprint((prev) => ({
      ...prev,
      layers: [...prev.layers, newLayer],
    }));
    setSelectedLayerId(newId);
    toast.success(`새 ${kind.toUpperCase()} 레이어가 추가되었습니다.`);
  };

  // 레이어 삭제
  const handleDeleteLayer = (layerId: string) => {
    setBlueprint((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== layerId),
    }));
    if (selectedLayerId === layerId) setSelectedLayerId(null);
    toast.info('레이어가 삭제되었습니다.');
  };

  // 프리셋 영구 저장
  const handleSavePreset = async () => {
    setIsSaving(true);
    try {
      await api.post('/sovereign-presets/basic-editor/save', {
        archetype: currentArchetype,
        name: blueprint.name,
        blueprint: blueprint,
        style: blueprint,
      });
      toast.success(`'${blueprint.name}' 프리셋이 viral_loop.db 및 03_Assets/presets에 영구 보관되었습니다.`);
    } catch (err: any) {
      toast.error(err.message || '프리셋 저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  // 🎬 CapCut PC 1클릭 내보내기
  const handleExportCapCut = async () => {
    try {
      const draftResult = await generateCapcutDraftLocal({
        preset: blueprint,
        projectName: blueprint.name || 'ViraLoop_Shorts_Draft',
        videoDurationMs: 15000,
        cues: [
          { start_ms: 0, end_ms: 3000, text: '0.8초 쨉쨉이 충격 반전 실화!' },
          { start_ms: 3000, end_ms: 6000, text: '자막은 여기에 강조해서 보여요' },
        ],
      });
      toast.success(`🎬 CapCut PC 프로젝트가 성공적으로 생성되었습니다: ${draftResult.draftPath}`);
    } catch (err: any) {
      toast.error(err.message || 'CapCut 프로젝트 내보내기 실패');
    }
  };

  // 🚀 백엔드 무인 자동 렌더링 발주
  const handleProduceAutonomous = async () => {
    try {
      // 1. 프리셋 저장
      await api.post('/sovereign-presets/basic-editor/save', {
        archetype: currentArchetype,
        name: blueprint.name,
        blueprint: blueprint,
        style: blueprint,
      });

      // 2. 무인 렌더링 발주
      const res = await api.post('/video-director/produce-autonomous', {
        preset_name: blueprint.name,
        archetype: currentArchetype,
        manifest: blueprint,
        auto_enqueue: true,
      });

      const queueMsg = res.data?.queue_item_id ? ` (대기열 #${res.data.queue_item_id})` : '';
      toast.success(`🚀 '${blueprint.name}' 무인 렌더링이 시작되었습니다. 완성본은 05_Exports 저장 후 /work-queue로 직결됩니다.${queueMsg}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || '무인 렌더링 발주 실패');
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden select-none">
      {/* ── 1. 최상단 헤더 툴바 ── */}
      <header className="h-12 border-b border-border bg-card/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
            <Cpu className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>기본 에디터</span>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/40 bg-emerald-500/10">
              SKIA CANVASKIT
            </Badge>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 4대 아키타입 스위처 */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border gap-0.5">
            {[
              { id: 'ssul', label: '썰형', icon: '📜' },
              { id: 'gunlimbo', label: '군림보', icon: '🎬' },
              { id: 'instagram', label: '인스타', icon: '📱' },
              { id: 'classic', label: '클래식', icon: '🥪' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSwitchArchetype(t.id as any)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentArchetype === t.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* 프리셋 이름 인풋 */}
          <Input
            value={blueprint.name}
            onChange={(e) => setBlueprint((prev) => ({ ...prev, name: e.target.value }))}
            className="h-7 w-52 text-xs font-semibold bg-background/50 border-border"
            placeholder="프리셋 이름"
          />
        </div>

        {/* 우측 액션 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 안전영역 가이드 토글 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSafeZone(!showSafeZone)}
            className={`h-7 text-xs px-2.5 gap-1 border-border ${showSafeZone ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : ''}`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>안전영역</span>
          </Button>

          {/* 캡컷 내보내기 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCapCut}
            className="h-7 text-xs px-2.5 gap-1 border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold cursor-pointer"
          >
            <span>🎬 캡컷 내보내기</span>
          </Button>

          {/* 무인 렌더링 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleProduceAutonomous}
            className="h-7 text-xs px-2.5 gap-1 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>🚀 무인 렌더링</span>
          </Button>

          {/* 프리셋 저장 */}
          <Button
            size="sm"
            onClick={handleSavePreset}
            disabled={isSaving}
            className="h-7 text-xs px-3 gap-1 bg-primary text-primary-foreground font-bold shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>💾 프리셋 저장</span>
          </Button>
        </div>
      </header>

      {/* ── 2. 메인 3-Pane 작업실: 좌측 레이어 목록(240px) + 중앙 CanvasKit 뷰포트 + 우측 속성 인스펙터(320px) ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* ◀️ 좌측: 레이어 객체 스택 관리자 (240px) */}
        <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0 z-20 select-none">
          <div className="h-9 px-3 border-b border-border flex items-center justify-between bg-muted/30">
            <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
              <Layers className="w-3.5 h-3.5 text-primary" />
              레이어 객체 스택 ({blueprint.layers.length})
            </span>
          </div>

          {/* 레이어 추가 버튼 군 */}
          <div className="p-2 border-b border-border grid grid-cols-3 gap-1 bg-background/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddLayer('text')}
              className="h-7 text-[10px] px-1 gap-1 border-border hover:bg-muted"
            >
              <Type className="w-3 h-3 text-amber-400" />
              <span>+텍스트</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddLayer('media')}
              className="h-7 text-[10px] px-1 gap-1 border-border hover:bg-muted"
            >
              <Video className="w-3 h-3 text-sky-400" />
              <span>+미디어</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddLayer('shape')}
              className="h-7 text-[10px] px-1 gap-1 border-border hover:bg-muted"
            >
              <Sliders className="w-3 h-3 text-emerald-400" />
              <span>+도형</span>
            </Button>
          </div>

          {/* 레이어 리스트 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {[...blueprint.layers].reverse().map((layer) => {
              const isSelected = selectedLayerId === layer.id;
              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border/70 bg-background hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {layer.kind === 'text' && <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {layer.kind === 'media' && <Video className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    {layer.kind === 'shape' && <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    <span className="font-medium text-foreground truncate">{layer.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateLayer(layer.id, { hidden: !layer.hidden });
                      }}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                    >
                      {layer.hidden ? <EyeOff className="w-3 h-3 text-zinc-500" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayer(layer.id);
                      }}
                      className="text-muted-foreground hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* 🌟 중앙: Google Skia CanvasKit 60fps 뷰포트 스테이지 */}
        <main className="flex-1 flex flex-col items-center justify-center bg-zinc-950/95 overflow-hidden relative">
          <CanvasKitViewportStage
            blueprint={blueprint}
            currentTimeMs={currentTimeMs}
            scale={canvasScale}
            selectedLayerId={selectedLayerId}
            onSelectLayer={(id) => setSelectedLayerId(id)}
            onUpdateLayerTransform={handleUpdateLayerTransform}
            showSafeZone={showSafeZone}
            showGrid={showGrid}
          />

          {/* 하단 줌 컨트롤 바 */}
          <div className="absolute bottom-4 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 shadow-xl z-20">
            <button
              type="button"
              onClick={() => setCanvasScale((prev) => Math.max(0.2, prev - 0.05))}
              className="text-zinc-400 hover:text-white p-1"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-zinc-300 min-w-12 text-center">
              {Math.round(canvasScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setCanvasScale((prev) => Math.min(1.0, prev + 0.05))}
              className="text-zinc-400 hover:text-white p-1"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3 bg-zinc-700 mx-1" />
            <button
              type="button"
              onClick={() => setCanvasScale(0.38)}
              className="text-[11px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-zinc-800"
            >
              맞춤 (Fit)
            </button>
          </div>
        </main>

        {/* ▶️ 우측: 선택 레이어 프로퍼티 인스펙터 (320px) */}
        <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0 z-20 select-none overflow-y-auto">
          <div className="h-9 px-3 border-b border-border flex items-center justify-between bg-muted/30">
            <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              {selectedLayer ? `${selectedLayer.name} 속성` : '프리셋 전역 속성'}
            </span>
          </div>

          <div className="p-3 space-y-4 text-xs">
            {selectedLayer ? (
              <div className="space-y-4">
                {/* 1. 레이어 이름 및 좌표 */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-foreground">레이어 기본</span>
                  <Input
                    value={selectedLayer.name}
                    onChange={(e) => handleUpdateLayer(selectedLayer.id, { name: e.target.value })}
                    className="h-7 text-xs bg-background"
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground">X 좌표</span>
                      <Input
                        type="number"
                        value={selectedLayer.transform.x}
                        onChange={(e) =>
                          handleUpdateLayer(selectedLayer.id, {
                            transform: { ...selectedLayer.transform, x: Number(e.target.value) },
                          })
                        }
                        className="h-7 text-xs bg-background"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Y 좌표</span>
                      <Input
                        type="number"
                        value={selectedLayer.transform.y}
                        onChange={(e) =>
                          handleUpdateLayer(selectedLayer.id, {
                            transform: { ...selectedLayer.transform, y: Number(e.target.value) },
                          })
                        }
                        className="h-7 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. 텍스트 레이어 전용 인스펙터 */}
                {selectedLayer.kind === 'text' && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <span className="text-[11px] font-bold text-foreground">텍스트 내용 및 스타일</span>
                    <Input
                      value={(selectedLayer as VLTextLayer).content}
                      onChange={(e) => handleUpdateLayer(selectedLayer.id, { content: e.target.value })}
                      className="h-8 text-xs bg-background font-semibold"
                    />

                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>글자 크기</span>
                        <span>{(selectedLayer as VLTextLayer).fontSize}px</span>
                      </div>
                      <Slider
                        value={[(selectedLayer as VLTextLayer).fontSize]}
                        min={20}
                        max={120}
                        step={2}
                        onValueChange={([val]) => handleUpdateLayer(selectedLayer.id, { fontSize: val })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground">글자 색상</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={(selectedLayer as VLTextLayer).fontColor}
                            onChange={(e) => handleUpdateLayer(selectedLayer.id, { fontColor: e.target.value })}
                            className="w-6 h-6 rounded border cursor-pointer"
                          />
                          <span className="text-[10px] font-mono">{(selectedLayer as VLTextLayer).fontColor}</span>
                        </div>
                      </div>

                      {/* 감정 이모지 슬롯 토글 */}
                      <div>
                        <span className="text-[10px] text-muted-foreground">감정 이모지 슬롯</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Switch
                            checked={(selectedLayer as VLTextLayer).emojiSlot?.enabled ?? false}
                            onCheckedChange={(checked) =>
                              handleUpdateLayer(selectedLayer.id, {
                                emojiSlot: {
                                  enabled: checked,
                                  position: 'inline_end',
                                  gap: 12,
                                  scaleRatio: 1.2,
                                  animation: 'pop_bounce',
                                  fallbackEmoji: '🔥',
                                  allowedTaxonomy: ['shock', 'rage', 'laughter'],
                                },
                              })
                            }
                          />
                          <span className="text-[10px] font-bold">{(selectedLayer as VLTextLayer).emojiSlot?.enabled ? '활성 (😱)' : '비활성'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. 도형 레이어 전용 인스펙터 */}
                {selectedLayer.kind === 'shape' && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <span className="text-[11px] font-bold text-foreground">도형 채우기 & 모서리</span>
                    <div>
                      <span className="text-[10px] text-muted-foreground">배경 채우기 색상</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={(selectedLayer as VLShapeLayer).fillColor}
                          onChange={(e) => handleUpdateLayer(selectedLayer.id, { fillColor: e.target.value })}
                          className="w-7 h-7 rounded border cursor-pointer"
                        />
                        <span className="text-[10px] font-mono">{(selectedLayer as VLShapeLayer).fillColor}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>모서리 둥글기 (Radius)</span>
                        <span>{(selectedLayer as VLShapeLayer).borderRadius}px</span>
                      </div>
                      <Slider
                        value={[(selectedLayer as VLShapeLayer).borderRadius]}
                        min={0}
                        max={60}
                        step={2}
                        onValueChange={([val]) => handleUpdateLayer(selectedLayer.id, { borderRadius: val })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-muted-foreground">
                <p className="text-[11px] leading-5">
                  좌측 레이어 스택에서 객체를 선택하거나 캔버스 객체를 클릭하면 상세 속성(크기, 색상, 자간, 감정 이모지 슬롯)을 직접 편집할 수 있습니다.
                </p>

                <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-2">
                  <span className="text-[11px] font-bold text-foreground block">캔버스 기본 정보</span>
                  <div className="flex justify-between text-[10px]">
                    <span>기준 해상도</span>
                    <span className="font-mono font-bold text-primary">1080 × 1920 (9:16)</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>그래픽 가속 엔진</span>
                    <span className="font-mono font-bold text-emerald-500">Google Skia WASM</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>레이어 개수</span>
                    <span className="font-mono">{blueprint.layers.length}개</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default BasicEditorStudio;
