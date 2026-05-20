import React, { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useEditorStore, Track, Clip } from '../hooks/useEditorStore';
import CanvasPlayer from '../components/CanvasPlayer';
import ErrorBoundary from '../components/ErrorBoundary';
import {
    Play, Pause, Scissors, Trash2,
    ZoomIn, ZoomOut, MousePointer2, Type, Image as ImageIcon,
    Video, Wand2, Undo, Redo, Eye, EyeOff, Lock, Unlock, Volume2, VolumeX, Plus,
    Smartphone, Monitor, FolderOpen, Music, Sticker, Sparkles, LayoutTemplate,
    RotateCcw, Magnet, Settings, Mic, Subtitles, Crop as CropIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn, formatDuration } from '@/lib/utils';
import PropertyPanel from '../components/PropertyPanel';
import AssetBrowser from '../components/AssetBrowser';
import TemplateManager from '../components/TemplateManager';
import MotionSettingsDialog, { MotionConfig } from '../components/MotionSettingsDialog';
import SubtitleSettingsDialog, { SubtitleConfig } from '../components/SubtitleSettingsDialog';
import TTSSettingsDialog from '../components/TTSSettingsDialog';
import MediaPanel from '../components/panels/MediaPanel';
import AudioPanel from '../components/panels/AudioPanel';
import TTSPanel from '../components/panels/TTSPanel';
import TextPanel from '../components/panels/TextPanel';
import CaptionPanel from '../components/panels/CaptionPanel';
import StickerPanel from '../components/panels/StickerPanel';
import EffectsPanel from '../components/panels/EffectsPanel';
import CropSettingsDialog from '../components/CropSettingsDialog';
import ExportModal, { ExportConfig } from '../components/ExportModal';
import Draggable from 'react-draggable';
import axios from 'axios';
import html2canvas from 'html2canvas';

// Helper for downloading blobs without file-saver
const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const DEFAULT_MOTION_CONFIG: MotionConfig = { enable: false, direction: 'zoom_in', speed: 1.0, shake: false };
const DEFAULT_SUBTITLE_CONFIG: SubtitleConfig = { enabled: true, font: 'Malgun Gothic', fontSize: 40, isBold: true, isItalic: false, textColor: '#ffffff', outlineSize: 2, outlineColor: '#000000', shadowSize: 2, shadowColor: '#000000', useBox: false, boxColor: '#000000', boxOpacity: 50, position: 'bottom', marginV: 50, customX: 0, customY: 0, splitLimit: 20, animation: 'none', maxLines: 2 };

const CutEditor = () => {
    const { tracks, currentTime, duration, scale, isPlaying, selectedClipId, canvasMode, aspectRatio, addClip, removeClip, moveClip, resizeClip, splitClip, updateClip, setCurrentTime, setIsPlaying, setScale, setSelectedClipId, setAspectRatio, setCanvasMode, addTrack, removeTrack, toggleTrackLock, toggleTrackHide, toggleTrackMute, setSubtitleConfig, toggleMagnetic, copyClip, pasteClip, resetEditor, previewScale, setPreviewScale } = useEditorStore();
    useEffect(() => { (window as any).editorStore = useEditorStore; }, []);
    const [activeTool, setActiveTool] = useState<'select' | 'split'>('select');
    const [isDetectingScenes, setIsDetectingScenes] = useState(false);
    const [isMotionOpen, setIsMotionOpen] = useState(false);
    const [isSubtitleOpen, setIsSubtitleOpen] = useState(false);
    const [isTTSOpen, setIsTTSOpen] = useState(false);
    const [isCropOpen, setIsCropOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<string>('media');
    const timelineRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => { if (headerRef.current) headerRef.current.scrollTop = e.currentTarget.scrollTop; };
    const handleHeaderWheel = (e: React.WheelEvent) => { if (timelineRef.current) timelineRef.current.scrollTop += e.deltaY; };
    const handleTimelineClick = (e: React.MouseEvent) => { if (!timelineRef.current) return; const rect = timelineRef.current.getBoundingClientRect(); const time = Math.max(0, (e.clientX - rect.left + timelineRef.current.scrollLeft) / scale); setCurrentTime(time); };
    const handleAutoCut = async () => { const mainTrack = tracks.find(t => t.id === 'main-video'); if (!mainTrack || mainTrack.clips.length === 0) return toast.error("No video"); setIsDetectingScenes(true); toast.info("AI Cut..."); setTimeout(() => { splitClip('main-video', mainTrack.clips[0].id, 2); toast.success("Done"); setIsDetectingScenes(false); }, 2000); };

    const handleExport = async (config: ExportConfig) => {
        toast.info("Exporting...");

        // 1. Subtitle Export
        if (config.subtitle.enabled) {
            try {
                const subtitleTracks = tracks.filter(t => t.type === 'text' || t.type === 'caption');
                let content = "";
                let index = 1;

                subtitleTracks.forEach(track => {
                    track.clips.sort((a, b) => a.start - b.start).forEach(clip => {
                        const start = formatTime(clip.start);
                        const end = formatTime(clip.start + clip.duration);
                        const text = clip.content || clip.name;

                        if (config.subtitle.format === 'srt') {
                            content += `${index++}\n${start} --> ${end}\n${text}\n\n`;
                        } else {
                            content += `[${start} - ${end}] ${text}\n`;
                        }
                    });
                });

                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                downloadBlob(blob, `subtitles.${config.subtitle.format}`);
                toast.success(`Exported Subtitles (${config.subtitle.format.toUpperCase()})`);
            } catch (e) {
                console.error(e);
                toast.error("Failed to export subtitles");
            }
        }

        // 2. Image Export
        if (config.image.enabled) {
            try {
                const stage = document.getElementById('canvas-stage');
                if (stage) {
                    const canvas = await html2canvas(stage, { useCORS: true, scale: 2 });
                    canvas.toBlob((blob: Blob | null) => {
                        if (blob) downloadBlob(blob, `snapshot.${config.image.format}`);
                    }, config.image.format === 'jpg' ? 'image/jpeg' : 'image/png');
                    toast.success("Exported Image");
                } else {
                    toast.error("Canvas stage not found");
                }
            } catch (e) {
                console.error(e);
                toast.error("Failed to export image");
            }
        }

        // 3. Video/Audio Export
        if (config.video.enabled || config.audio.enabled) {
            try {
                toast.loading("Rendering on server...");

                // 1. Determine Dimensions
                const isPortrait = aspectRatio === '9:16';
                let width = 1080;
                let height = 1920;

                // Resolution mapping
                if (config.video.enabled && config.video.resolution) {
                    const resMap: Record<string, [number, number]> = {
                        '4k': isPortrait ? [2160, 3840] : [3840, 2160],
                        '1080p': isPortrait ? [1080, 1920] : [1920, 1080],
                        '720p': isPortrait ? [720, 1280] : [1280, 720],
                    };
                    const res = resMap[config.video.resolution];
                    if (res) {
                        width = res[0];
                        height = res[1];
                    }
                } else if (isPortrait) {
                    width = 1080;
                    height = 1920;
                } else {
                    width = 1920;
                    height = 1080;
                }

                // 2. Determine Format
                let format = 'mp4';
                if (config.audio.enabled && !config.video.enabled) {
                    format = config.audio.format;
                } else if (config.video.enabled) {
                    format = config.video.format;
                }

                console.log(`Exporting: ${width}x${height} (${format})`);

                const backendClips = tracks.flatMap(t => t.clips.map(c => ({
                    id: c.id,
                    path: c.path || "",
                    start: c.start,
                    duration: c.duration,
                    offset: c.trimStart,
                    type: c.type,
                    layer: (tracks.length - tracks.findIndex(tr => tr.id === t.id)) * 10,
                    transform: c.transform,
                    style: c.style,
                    speed: c.speed,
                    audio: c.audio,
                    text: c.content ? { content: c.content, ...c.style } : undefined,
                    filter: c.filter
                })));

                const payload = {
                    clips: backendClips,
                    width: width,
                    height: height,
                    format: format,
                    quality: config.video?.quality || 'high'
                };

                const response = await axios.post('/editor/render', payload);
                if (response.data.status === 'success') {
                    toast.dismiss();
                    toast.success("Render Complete!");
                    toast.success(`Saved to: ${response.data.output_path}`, { duration: 5000 });

                    // Trigger Browser Download
                    if (response.data.download_url) {
                        const link = document.createElement('a');
                        link.href = `${response.data.download_url}`;
                        link.download = response.data.filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }
            } catch (e) {
                console.error(e);
                toast.dismiss();
                toast.error("Render failed (Backend)");
            }
        }
    };

    const formatTime = (seconds: number) => {
        const date = new Date(0);
        date.setSeconds(seconds);
        date.setMilliseconds((seconds % 1) * 1000);
        return date.toISOString().substr(11, 12).replace('.', ',');
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            switch (e.key.toLowerCase()) {
                case ' ': e.preventDefault(); setIsPlaying(!isPlaying); break;
                case 's': setActiveTool('split'); break;
                case 'v': if (e.ctrlKey || e.metaKey) { e.preventDefault(); pasteClip(); toast.success("Pasted"); } else setActiveTool('select'); break;
                case 'c': if ((e.ctrlKey || e.metaKey) && selectedClipId) { e.preventDefault(); copyClip(selectedClipId); toast.success("Copied"); } break;
                case 'delete': case 'backspace': if (selectedClipId) { const track = tracks.find(t => t.clips.some(c => c.id === selectedClipId)); if (track) removeClip(track.id, selectedClipId); } break;
                case 'z': if (e.ctrlKey || e.metaKey) { e.shiftKey ? useEditorStore.temporal.getState().redo() : useEditorStore.temporal.getState().undo(); } break;
                case 'y': if (e.ctrlKey || e.metaKey) useEditorStore.temporal.getState().redo(); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, selectedClipId, tracks]);

    useEffect(() => {
        let raf: number; let lastTime = performance.now();
        const loop = () => { if (isPlaying) { const now = performance.now(); setCurrentTime(prev => Math.min(prev + (now - lastTime) / 1000, duration)); lastTime = now; raf = requestAnimationFrame(loop); } };
        if (isPlaying) { lastTime = performance.now(); loop(); } else cancelAnimationFrame(raf!); return () => cancelAnimationFrame(raf);
    }, [isPlaying, duration]);

    const sidebarItems = [{ id: 'media', label: 'Media', icon: FolderOpen }, { id: 'tts', label: 'TTS', icon: Mic }, { id: 'caption', label: 'Caption', icon: Subtitles }, { id: 'text', label: 'Text', icon: Type }, { id: 'audio', label: 'Audio', icon: Music }, { id: 'sticker', label: 'Sticker', icon: Sticker }, { id: 'effect', label: 'Effect', icon: Sparkles }, { id: 'stock', label: 'Stock', icon: ImageIcon }, { id: 'template', label: 'Template', icon: LayoutTemplate }];

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden text-foreground font-sans selection:bg-primary/20">
            <header className="h-12 border-b border-border bg-card flex items-center px-4 justify-between shadow-sm z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">SA</div>
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        <Button variant={canvasMode === 'shorts' ? 'default' : 'ghost'} size="sm" className={cn("h-7 px-3 text-xs", canvasMode === 'shorts' && "bg-primary text-primary-foreground")} onClick={() => { setCanvasMode('shorts'); setAspectRatio('9:16'); }}>Shorts</Button>
                        <Button variant={canvasMode === 'wide' ? 'default' : 'ghost'} size="sm" className={cn("h-7 px-3 text-xs", canvasMode === 'wide' && "bg-primary text-primary-foreground")} onClick={() => { setCanvasMode('wide'); setAspectRatio('16:9'); }}>Wide</Button>
                    </div>
                </div>
                <div className="flex items-center gap-2"><Button variant="outline" size="sm" className="h-8 border-border" onClick={() => setIsExportModalOpen(true)}>Export</Button><Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground">Save</Button></div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex h-full border-r border-border bg-card z-30 shadow-sm shrink-0">
                    <nav className="w-16 flex flex-col items-center py-4 gap-2 bg-muted/20 border-r border-border">{sidebarItems.map(i => <button key={i.id} onClick={() => setActiveSidebarTab(i.id)} className={cn("w-12 p-2 rounded flex flex-col items-center gap-1 transition-colors", activeSidebarTab === i.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}><i.icon className="w-5 h-5" /><span className="text-[10px]">{i.label}</span></button>)}</nav>
                    <aside className="w-64 flex flex-col border-r border-border"><div className="h-12 border-b border-border px-4 flex items-center font-semibold text-sm">{sidebarItems.find(i => i.id === activeSidebarTab)?.label}</div><div className="flex-1 overflow-auto">
                        {activeSidebarTab === 'media' && <MediaPanel />} {activeSidebarTab === 'tts' && <TTSPanel />} {activeSidebarTab === 'caption' && <CaptionPanel />} {activeSidebarTab === 'text' && <TextPanel />} {activeSidebarTab === 'audio' && <AudioPanel />} {activeSidebarTab === 'sticker' && <StickerPanel />} {activeSidebarTab === 'effect' && <EffectsPanel />} {activeSidebarTab === 'stock' && <AssetBrowser />} {activeSidebarTab === 'template' && <TemplateManager />}
                    </div></aside>
                </div>

                <main className="flex-1 overflow-hidden flex flex-col items-center justify-center bg-muted/40 relative min-w-0">
                    <div className="absolute top-6 z-50 flex gap-2 bg-card/90 backdrop-blur px-4 py-1 rounded-full border border-border shadow-sm">
                        {selectedClipId ? <><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsMotionOpen(true)}><Wand2 className="w-3.5 h-3.5 mr-1" />효과</Button>
                            <div className="w-px h-4 bg-border" />
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsCropOpen(true)}><CropIcon className="w-3.5 h-3.5 mr-1" />자르기</Button>
                            <div className="w-px h-4 bg-border" />
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive/90" onClick={() => { const t = tracks.find(t => t.clips.some(c => c.id === selectedClipId)); if (t) removeClip(t.id, selectedClipId); }}><Trash2 className="w-3.5 h-3.5 mr-1" />삭제</Button></> : <span className="text-xs text-muted-foreground">클립을 선택하세요</span>}
                    </div>
                    {/* Center Canvas Area */}
                    <div className="flex-1 bg-muted/30 flex items-center justify-center relative overflow-hidden w-full">
                        <div className="w-full h-full flex items-center justify-center p-8"> {/* Add padding wrapper */}
                            <ErrorBoundary>
                                <CanvasPlayer className="w-full h-full" canvasMode={canvasMode} />
                            </ErrorBoundary>
                        </div>
                    </div>

                    {/* Floating Toolbar: Zoom & Playback */}
                    <div className="absolute bottom-6 z-50 flex flex-col items-center gap-3">
                        {/* Zoom Controls */}
                        <div className="flex items-center gap-2 bg-popover/95 backdrop-blur px-3 py-1.5 rounded-full shadow-xl border border-border text-popover-foreground">
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => setPreviewScale(Math.max(0.1, previewScale - 0.1))}><ZoomOut className="w-3.5 h-3.5" /></Button>
                            <Slider value={[previewScale * 100]} min={10} max={400} step={10} onValueChange={v => setPreviewScale(v[0] / 100)} className="w-20 cursor-pointer" />
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => setPreviewScale(Math.min(4, previewScale + 0.1))}><ZoomIn className="w-3.5 h-3.5" /></Button>
                            <div className="w-px h-3 bg-border mx-1" />
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-muted text-muted-foreground hover:text-foreground rounded-full" onClick={() => setPreviewScale(1)}>Fit</Button>
                            <span className="text-[10px] font-mono w-8 text-center">{Math.round(previewScale * 100)}%</span>
                        </div>

                        {/* Playback Controls */}
                        <div className="flex gap-4 bg-card/90 backdrop-blur px-5 py-2 rounded-full shadow-xl border border-border"><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted text-foreground" onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}</Button></div>
                    </div>
                </main>

                <aside className="w-[380px] border-l border-border bg-card h-full overflow-y-auto z-20 shrink-0 shadow-lg">
                    <div className="h-12 border-b border-border px-4 flex items-center font-semibold text-sm">Properties</div>
                    {selectedClipId ? <PropertyPanel /> : <div className="p-10 text-center text-muted-foreground text-sm">Select clip</div>}
                </aside>
            </div >

            <footer className="h-[35vh] border-t border-border bg-card flex flex-col z-50 shadow-lg shrink-0">
                <div className="h-10 border-b border-border px-4 flex items-center justify-between">
                    <div className="flex gap-1"><Button variant="ghost" size="sm" className="w-7 h-7 p-0 hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => useEditorStore.temporal.getState().undo()}><Undo className="w-4 h-4" /></Button><Button variant="ghost" size="sm" className="w-7 h-7 p-0 hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => useEditorStore.temporal.getState().redo()}><Redo className="w-4 h-4" /></Button></div>
                    <div className="flex gap-2"><Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive/95" onClick={() => resetEditor()}><RotateCcw className="w-3.5 h-3.5 mr-1" />초기화</Button><div className="w-px h-4 bg-border" /><Button variant={activeTool === 'select' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setActiveTool('select')}><MousePointer2 className="w-3.5 h-3.5 mr-1" />선택</Button><Button variant={activeTool === 'split' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setActiveTool('split')}><Scissors className="w-3.5 h-3.5 mr-1" />분할</Button><Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/95" onClick={handleAutoCut} disabled={isDetectingScenes}><Wand2 className="w-3.5 h-3.5 mr-1" />AI 자르기</Button></div>
                    <div className="flex gap-3"><Button variant={tracks.find(t => t.id === 'main-video')?.isMagnetic ? 'secondary' : 'ghost'} size="sm" className="w-7 h-7 p-0" onClick={() => toggleMagnetic('main-video')}><Magnet className="w-4 h-4" /></Button><div className="w-px h-4 bg-border" /><Slider value={[scale]} min={10} max={200} step={10} onValueChange={v => setScale(v[0])} className="w-28" /></div>
                </div>
                <div className="flex-1 flex overflow-hidden bg-muted/20">
                    <div ref={headerRef} className="w-[173px] shrink-0 bg-card border-r border-border flex flex-col" onWheel={handleHeaderWheel}><div className="h-8 border-b border-border bg-muted/30 shrink-0" /><div className="p-2 space-y-2">{tracks.map((t, i) => <div key={t.id} className="h-16 flex items-center px-2 text-xs bg-muted/40 border border-border rounded-lg"><div className="flex-1 min-w-0 flex gap-2 items-center">{t.type === 'video' ? <Video className="w-3.5 h-3.5 text-primary" /> : t.type === 'audio' ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> : t.type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-orange-500" /> : <Type className="w-3.5 h-3.5 text-purple-500" />}<span className="truncate">{t.label}</span></div><div className="flex gap-1">{(t.type === 'video' || t.type === 'audio') && <button onClick={e => { e.stopPropagation(); toggleTrackMute(t.id) }} className="p-1 text-muted-foreground hover:text-foreground">{t.muted ? <VolumeX className="w-3 h-3 text-destructive" /> : <Volume2 className="w-3 h-3" />}</button>}<button onClick={e => { e.stopPropagation(); toggleTrackHide(t.id) }} className="p-1 text-muted-foreground hover:text-foreground">{t.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button><button onClick={e => { e.stopPropagation(); addTrack(t.type, i) }} className="p-1 text-muted-foreground hover:text-foreground"><Plus className="w-3 h-3" /></button>{!t.isDefault && <button onClick={e => { e.stopPropagation(); removeTrack(t.id) }} className="p-1 text-destructive hover:text-destructive/90"><Trash2 className="w-3 h-3" /></button>}</div></div>)}</div></div>
                    <div ref={timelineRef} className="flex-1 overflow-auto relative" onScroll={handleScroll} onClick={handleTimelineClick} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const d = e.dataTransfer.getData('application/json'); if (d) addClip(null, null, JSON.parse(d).source, JSON.parse(d).type, Math.max(0, (e.clientX - timelineRef.current!.getBoundingClientRect().left + timelineRef.current!.scrollLeft) / scale)) }}>
                        <div className="relative min-h-full" style={{ width: duration * scale + 500 }}>
                            <div className="h-8 border-b border-border bg-card sticky top-0 z-20 flex items-end">{Array.from({ length: Math.ceil(duration) + 5 }).map((_, i) => <div key={i} className="border-l border-border h-3 relative" style={{ width: scale }}><span className="absolute -top-4 left-1 text-[10px] text-muted-foreground">{i}s</span></div>)}</div>
                            <div className="absolute top-8 bottom-0 left-0 right-0 pointer-events-none">{Array.from({ length: Math.ceil(duration) + 5 }).map((_, i) => <div key={i} className="absolute top-0 bottom-0 border-l border-border/30" style={{ left: i * scale }} />)}</div>
                            <div className="absolute top-0 bottom-0 w-px bg-destructive z-50 pointer-events-none" style={{ transform: `translateX(${currentTime * scale}px)` }}><div className="absolute -top-1 -left-1.5 w-3 h-3 bg-destructive rotate-45" /><div className="absolute top-0 bottom-0 w-px bg-destructive/50" /></div>
                            <div className="py-2 space-y-2 relative z-10">{tracks.map(t => <div key={t.id} data-track-id={t.id} className="h-16 relative bg-muted/10 rounded-lg border border-border">{t.clips.map(c => <ClipItem key={c.id} clip={c} track={t} scale={scale} selectedClipId={selectedClipId} onDrag={(tr: string, cl: string, d: any, tg: any) => moveClip(tr, cl, Math.max(0, d.x / scale), tg)} onSelect={setSelectedClipId} onResize={resizeClip} />)}</div>)}</div>
                        </div>
                    </div>
                </div>
            </footer>
            <MotionSettingsDialog open={isMotionOpen} onOpenChange={setIsMotionOpen} initialConfig={DEFAULT_MOTION_CONFIG} onSave={() => { }} /><SubtitleSettingsDialog open={isSubtitleOpen} onOpenChange={setIsSubtitleOpen} initialConfig={DEFAULT_SUBTITLE_CONFIG} onSave={setSubtitleConfig} /><TTSSettingsDialog open={isTTSOpen} onOpenChange={setIsTTSOpen} onSave={() => { }} />
            <CropSettingsDialog open={isCropOpen} onOpenChange={setIsCropOpen} />
            <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={handleExport} />
        </div >
    );
};
const ClipItem: React.FC<any> = ({ clip, track, scale, selectedClipId, onDrag, onSelect, onResize }) => {
    const nodeRef = useRef(null);
    return <Draggable nodeRef={nodeRef} grid={[1, 1]} position={{ x: clip.start * scale, y: 0 }} onStop={(e, d) => { const m = e as MouseEvent; const tg = document.elementsFromPoint(m.clientX, m.clientY).find(el => el.hasAttribute('data-track-id'))?.getAttribute('data-track-id'); onDrag(track.id, clip.id, d, tg) }} disabled={track.locked}>
        <div ref={nodeRef} className={cn("absolute top-1 bottom-1 rounded border cursor-pointer", selectedClipId === clip.id ? "ring-2 ring-primary z-20" : "z-10", clip.type === 'video' ? "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300" : clip.type === 'audio' ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300")} style={{ width: clip.duration * scale }} onClick={e => { e.stopPropagation(); onSelect(clip.id) }}>
            <div className="px-2 py-1 text-xs truncate">{clip.name}</div>
            {selectedClipId === clip.id && <><div className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize z-30 flex items-center justify-center hover:bg-black/10" onMouseDown={e => {
                e.preventDefault(); e.stopPropagation(); const startX = e.clientX; const initStart = clip.start; const initDur = clip.duration; const initTrim = clip.trimStart;
                const mm = (ev: MouseEvent) => { const d = (ev.clientX - startX) / scale; let ns = initStart + d; let nd = initDur - d; let nts = initTrim + d; if (ns < 0) { nts += ns; nd += ns; ns = 0; } onResize(track.id, clip.id, ns, Math.max(0.1, nd), nts); };
                const mu = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }; window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
            }}><div className="w-0.5 h-3 bg-black/30 rounded-full" /></div>
                <div className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize z-30 flex items-center justify-center hover:bg-black/10" onMouseDown={e => {
                    e.preventDefault(); e.stopPropagation(); const startX = e.clientX; const initDur = clip.duration;
                    const mm = (ev: MouseEvent) => { onResize(track.id, clip.id, clip.start, Math.max(0.1, initDur + (ev.clientX - startX) / scale), clip.trimStart); };
                    const mu = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }; window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
                }}><div className="w-0.5 h-3 bg-black/30 rounded-full" /></div></>}
        </div>
    </Draggable>
}
export default CutEditor;
