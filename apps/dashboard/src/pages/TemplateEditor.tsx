import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text as KonvaText, Transformer, Group } from 'react-konva';
import { LayoutGrid, Type, Video, User, Save, MousePointer2, Trash2, SlidersHorizontal, AlignLeft, AlignCenter, AlignRight, Type as TypeIcon } from 'lucide-react';
import Konva from 'konva';

// --- Types ---
type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '3:4';

interface ElementBase {
    id: string;
    type: 'text' | 'video' | 'avatar' | 'shape';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    bindingKey?: string; // e.g., 'title', 'video_main'
    motionPreset?: 'none' | 'fade' | 'pop' | 'slide_up';
}

interface TextElement extends ElementBase {
    type: 'text';
    text: string;
    fontSize: number;
    fontFamily: string;
    fill: string;
    align: 'left' | 'center' | 'right';
    autoFit: boolean;
}

interface VideoElement extends ElementBase {
    type: 'video';
    fill: string;
    cornerRadius: number;
}

interface AvatarElement extends ElementBase {
    type: 'avatar';
    fill: string;
    cornerRadius: number;
}

type CanvasElement = TextElement | VideoElement | AvatarElement;

const RATIOS: Record<AspectRatio, { w: number; h: number }> = {
    '9:16': { w: 360, h: 640 },
    '16:9': { w: 640, h: 360 },
    '1:1': { w: 500, h: 500 },
    '4:5': { w: 400, h: 500 },
    '3:4': { w: 450, h: 600 },
};

export default function TemplateEditor() {
    const [ratio, setRatio] = useState<AspectRatio>('9:16');
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [selectedId, selectShape] = useState<string | null>(null);
    const [stageScale, setStageScale] = useState(1);

    const stageRef = useRef<Konva.Stage>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const layerRef = useRef<Konva.Layer>(null);

    const canvasSize = RATIOS[ratio];

    // --- Selection & Transformer Logic ---
    useEffect(() => {
        if (selectedId && trRef.current && layerRef.current) {
            const node = layerRef.current.findOne('#' + selectedId);
            if (node) {
                trRef.current.nodes([node]);
                trRef.current.getLayer()?.batchDraw();
            }
        } else if (trRef.current) {
            trRef.current.nodes([]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [selectedId, elements]);

    const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.id() === 'bg';
        if (clickedOnEmpty) {
            selectShape(null);
        }
    };

    // --- Element Actions ---
    const addElement = (type: CanvasElement['type'], bindingKey: string) => {
        const base = {
            id: `el_${Date.now()}`,
            x: 50,
            y: 50,
            rotation: 0,
            bindingKey,
            motionPreset: 'none' as const,
        };

        let newEl: CanvasElement;

        if (type === 'text') {
            newEl = { ...base, type, width: 200, height: 50, text: `{{${bindingKey}}}`, fontSize: 24, fontFamily: 'Pretendard', fill: '#ffffff', align: 'center', autoFit: true };
        } else if (type === 'video') {
            newEl = { ...base, type, width: 200, height: 200, fill: '#3b82f6', cornerRadius: 0 };
        } else {
            // avatar
            newEl = { ...base, type: 'avatar', width: 60, height: 60, fill: '#ec4899', cornerRadius: 30 };
        }

        setElements([...elements, newEl]);
        selectShape(newEl.id);
    };

    const updateElement = (id: string, newAttrs: Partial<CanvasElement>) => {
        setElements(els => els.map(el => el.id === id ? { ...el, ...newAttrs } as CanvasElement : el));
    };

    const deleteSelected = () => {
        if (selectedId) {
            setElements(els => els.filter(el => el.id !== selectedId));
            selectShape(null);
        }
    };

    // Keyboard shortcut for delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId && e.target === document.body) { // Ensure not typing in input
                    deleteSelected();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId]);

    const selectedElement = elements.find(e => e.id === selectedId);

    // --- Render ---
    return (
        <div className="flex-1 flex flex-col min-h-0 w-full h-full relative bg-gray-50 dark:bg-zinc-950 text-slate-800 dark:text-slate-100 font-sans">
            {/* Header */}
            <header className="h-14 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <LayoutGrid className="w-5 h-5 text-indigo-500" />
                    <h1 className="text-lg font-bold tracking-tight">템플릿 에디터 <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ml-2 border border-indigo-200 dark:border-indigo-800">Advanced Engine</span></h1>
                </div>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow-sm transition-all flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    템플릿 JSON 내보내기
                </button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Toolbar */}
                <aside className="w-20 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center py-4 gap-4 z-10 shrink-0">
                    <button className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors group relative" title="선택 도구">
                        <MousePointer2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </button>
                    <div className="w-10 h-px bg-gray-200 dark:bg-zinc-800 my-1" />
                    
                    <button onClick={() => addElement('video', 'video_main')} className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <Video className="w-6 h-6" />
                        <span className="text-[9px] font-bold">비디오</span>
                    </button>
                    <button onClick={() => addElement('text', 'title')} className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <Type className="w-6 h-6" />
                        <span className="text-[9px] font-bold">텍스트</span>
                    </button>
                    <button onClick={() => addElement('avatar', 'avatarUrl')} className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <User className="w-6 h-6" />
                        <span className="text-[9px] font-bold">아바타</span>
                    </button>
                </aside>

                {/* Center Canvas Workspace */}
                <main className="flex-1 bg-gray-200/50 dark:bg-zinc-950 flex flex-col relative overflow-hidden">
                    {/* Ratio Selector bar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700 p-1 z-10">
                        {(Object.keys(RATIOS) as AspectRatio[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRatio(r)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${ratio === r ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    {/* Konva Canvas Container */}
                    <div className="flex-1 w-full h-full flex items-center justify-center overflow-auto" id="canvas-container">
                        {/* We add a wrapper to show drop shadow nicely outside canvas */}
                        <div className="bg-white dark:bg-black shadow-2xl transition-all duration-300" style={{ width: canvasSize.w, height: canvasSize.h }}>
                            <Stage 
                                width={canvasSize.w} 
                                height={canvasSize.h} 
                                onMouseDown={checkDeselect}
                                onTouchStart={checkDeselect}
                                ref={stageRef}
                            >
                                <Layer ref={layerRef}>
                                    {/* Base Background (Transparent pattern or color) */}
                                    <Rect id="bg" x={0} y={0} width={canvasSize.w} height={canvasSize.h} fill="#18181b" />
                                    
                                    {elements.map((el) => {
                                        if (el.type === 'video' || el.type === 'avatar') {
                                            return (
                                                <Rect
                                                    key={el.id}
                                                    id={el.id}
                                                    x={el.x}
                                                    y={el.y}
                                                    width={el.width}
                                                    height={el.height}
                                                    fill={el.fill}
                                                    rotation={el.rotation}
                                                    cornerRadius={(el as any).cornerRadius || 0}
                                                    draggable
                                                    opacity={selectedId === el.id ? 0.8 : 0.6}
                                                    stroke={selectedId === el.id ? '#4f46e5' : undefined}
                                                    strokeWidth={2}
                                                    onDragEnd={(e) => {
                                                        updateElement(el.id, { x: e.target.x(), y: e.target.y() });
                                                    }}
                                                    onClick={() => selectShape(el.id)}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        const scaleX = node.scaleX();
                                                        const scaleY = node.scaleY();
                                                        node.scaleX(1);
                                                        node.scaleY(1);
                                                        updateElement(el.id, {
                                                            x: node.x(),
                                                            y: node.y(),
                                                            rotation: node.rotation(),
                                                            width: Math.max(5, node.width() * scaleX),
                                                            height: Math.max(5, node.height() * scaleY),
                                                        });
                                                    }}
                                                />
                                            );
                                        }

                                        if (el.type === 'text') {
                                            const tEl = el as TextElement;
                                            return (
                                                <KonvaText
                                                    key={el.id}
                                                    id={el.id}
                                                    x={el.x}
                                                    y={el.y}
                                                    width={el.width}
                                                    height={tEl.autoFit ? undefined : el.height}
                                                    text={tEl.text}
                                                    fontSize={tEl.fontSize}
                                                    fontFamily={tEl.fontFamily}
                                                    fill={tEl.fill}
                                                    align={tEl.align}
                                                    rotation={el.rotation}
                                                    draggable
                                                    onClick={() => selectShape(el.id)}
                                                    onDragEnd={(e) => {
                                                        updateElement(el.id, { x: e.target.x(), y: e.target.y() });
                                                    }}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        const scaleX = node.scaleX();
                                                        node.scaleX(1);
                                                        node.scaleY(1);
                                                        updateElement(el.id, {
                                                            x: node.x(),
                                                            y: node.y(),
                                                            rotation: node.rotation(),
                                                            width: Math.max(5, node.width() * scaleX),
                                                        });
                                                    }}
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                    
                                    <Transformer 
                                        ref={trRef} 
                                        boundBoxFunc={(oldBox, newBox) => {
                                            if (newBox.width < 5 || newBox.height < 5) return oldBox;
                                            return newBox;
                                        }}
                                        borderStroke="#4f46e5"
                                        anchorStroke="#4f46e5"
                                        anchorFill="#ffffff"
                                        anchorSize={8}
                                    />
                                </Layer>
                            </Stage>
                        </div>
                    </div>
                </main>

                {/* Right Inspector Panel */}
                <aside className="w-80 border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col z-10 shrink-0 shadow-xl overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                        <h2 className="font-bold text-sm">속성 인스펙터 (Inspector)</h2>
                    </div>

                    {!selectedElement ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                            캔버스에서 객체를 선택하면<br/>상세 속성을 조절할 수 있습니다.
                        </div>
                    ) : (
                        <div className="p-4 space-y-6">
                            {/* Layout & Transform */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Transform</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold">X 좌표</label>
                                        <input type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })} className="w-full bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500 mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold">Y 좌표</label>
                                        <input type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })} className="w-full bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500 mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold">가로 폭 (W)</label>
                                        <input type="number" value={Math.round(selectedElement.width)} onChange={(e) => updateElement(selectedElement.id, { width: Math.max(5, Number(e.target.value)) })} className="w-full bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500 mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold">세로 높이 (H)</label>
                                        <input type="number" value={Math.round(selectedElement.height)} onChange={(e) => updateElement(selectedElement.id, { height: Math.max(5, Number(e.target.value)) })} className="w-full bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500 mt-1" disabled={selectedElement.type === 'text' && (selectedElement as TextElement).autoFit} />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-zinc-800" />

                            {/* Binding Config */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">데이터 바인딩</h3>
                                <label className="text-[10px] text-slate-500 font-bold">매핑 변수명</label>
                                <select 
                                    value={selectedElement.bindingKey || ''}
                                    onChange={(e) => updateElement(selectedElement.id, { bindingKey: e.target.value })}
                                    className="w-full bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-500 mt-1"
                                >
                                    <option value="">선택 안함</option>
                                    <option value="video_main">video_main (메인 영상)</option>
                                    <option value="title">title (주요 제목)</option>
                                    <option value="subtitle">subtitle (부제목)</option>
                                    <option value="caption">caption (자동 자막)</option>
                                    <option value="avatarUrl">avatarUrl (프로필)</option>
                                </select>
                            </div>

                            {/* Conditional Rendering based on Type */}
                            {selectedElement.type === 'text' && (
                                <>
                                    <hr className="border-gray-200 dark:border-zinc-800" />
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1"><TypeIcon className="w-3 h-3"/> 타이포그래피 (고도화)</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold">다이내믹 오토핏(Auto-Shrink)</label>
                                                <input type="checkbox" checked={(selectedElement as TextElement).autoFit} onChange={(e) => updateElement(selectedElement.id, { autoFit: e.target.checked })} className="accent-indigo-600 w-4 h-4" />
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-tight">텍스트 길이가 길어져도 레이아웃 박스를 넘지 않도록 폰트 크기를 자동으로 줄입니다.</p>
                                            
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 font-bold">폰트 크기</label>
                                                    <input type="number" value={(selectedElement as TextElement).fontSize} onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })} className="w-full bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-sm outline-none mt-1" disabled={(selectedElement as TextElement).autoFit} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 font-bold">색상 (Fill)</label>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <input type="color" value={(selectedElement as TextElement).fill} onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                                                        <span className="text-xs font-mono uppercase">{(selectedElement as TextElement).fill}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold">정렬 (Align)</label>
                                                <div className="flex bg-gray-100 dark:bg-zinc-950 rounded p-1 mt-1 border border-gray-200 dark:border-zinc-800">
                                                    {(['left', 'center', 'right'] as const).map(align => (
                                                        <button 
                                                            key={align}
                                                            onClick={() => updateElement(selectedElement.id, { align })}
                                                            className={`flex-1 flex justify-center py-1 rounded transition-colors ${
                                                                (selectedElement as TextElement).align === align ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-500' : 'text-slate-500 hover:bg-gray-200 dark:hover:bg-zinc-900'
                                                            }`}
                                                        >
                                                            {align === 'left' ? <AlignLeft className="w-4 h-4"/> : align === 'center' ? <AlignCenter className="w-4 h-4"/> : <AlignRight className="w-4 h-4"/>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {(selectedElement.type === 'video' || selectedElement.type === 'avatar') && (
                                <>
                                    <hr className="border-gray-200 dark:border-zinc-800" />
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">마스킹 & 클리핑</h3>
                                        <label className="text-[10px] text-slate-500 font-bold">라운드 코너 (Border Radius)</label>
                                        <input type="range" min="0" max={Math.min(selectedElement.width, selectedElement.height) / 2} value={(selectedElement as any).cornerRadius || 0} onChange={(e) => updateElement(selectedElement.id, { cornerRadius: Number(e.target.value) })} className="w-full mt-2 accent-indigo-600" />
                                        <div className="text-right text-[10px] text-slate-500 mt-1">{(selectedElement as any).cornerRadius || 0}px</div>
                                    </div>
                                </>
                            )}

                            <hr className="border-gray-200 dark:border-zinc-800" />
                            
                            {/* Motion Presets */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">모션 프리셋 (애니메이션)</h3>
                                <select 
                                    value={selectedElement.motionPreset || 'none'}
                                    onChange={(e) => updateElement(selectedElement.id, { motionPreset: e.target.value as any })}
                                    className="w-full bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-500 mt-1"
                                >
                                    <option value="none">없음 (Static)</option>
                                    <option value="fade">페이드 인 (Fade In)</option>
                                    <option value="pop">팝 튀어오르기 (Spring Pop)</option>
                                    <option value="slide_up">아래에서 위로 슬라이드 (Slide Up)</option>
                                </select>
                                <p className="text-[10px] text-slate-500 leading-tight mt-2">지정된 모션은 렌더링 엔진(Remotion)에서 실제 비디오로 렌더링될 때 적용됩니다.</p>
                            </div>

                            <button onClick={deleteSelected} className="w-full mt-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                <Trash2 className="w-4 h-4" /> 객체 삭제
                            </button>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
