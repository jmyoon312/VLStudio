import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '@/components/theme-provider';
import { PlayerEngine } from '@/features/editor/components/player/PlayerEngine';
import { TimelineCore } from '@/features/editor/components/timeline/TimelineCore';
import { useEditorStore } from '@/features/editor/store/useEditorStore';
import { Sun, Moon, Download, Settings, Play, Pause, SkipBack, SkipForward, Maximize, MousePointer2, Scissors, Type, Image as ImageIcon, Music, Sparkles, Layers, SlidersHorizontal, Plus, MousePointerClick } from 'lucide-react';

const queryClient = new QueryClient();

// Mock injection
const injectBriefData = (brief: any, addItem: any) => {
    if (brief && brief.scenes) {
        let currentTime = 0;
        brief.scenes.forEach((scene: any, index: number) => {
            const duration = 5000;
            addItem({
                trackId: 'track-main',
                type: 'video',
                source: scene.videoUrl || '',
                startTime: currentTime,
                duration: duration,
                offset: 0,
                sourceDuration: duration,
                layer: 1,
                name: `Scene ${index + 1}`,
                transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
                properties: { volume: 100 }
            });
            currentTime += duration;
        });
    }
};

const Header = () => {
    const { theme, setTheme } = useTheme();
    
    return (
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 select-none shrink-0 z-50">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">VL</div>
                <div className="flex flex-col">
                    <span className="text-foreground text-sm font-semibold tracking-tight">Agent Cut Editor</span>
                    <span className="text-muted-foreground text-[10px] uppercase font-medium">Auto-Save Enabled</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 flex-1 justify-center max-w-md">
                {/* Center Toolbar / Project Name */}
                <div className="bg-muted/50 border border-border px-4 py-1.5 rounded-md flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted transition">
                    Untitled Project <Settings className="w-3 h-3" />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <div className="w-px h-6 bg-border mx-1"></div>
                <button className="px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md text-sm font-medium transition">
                    Shortcut
                </button>
                <button className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition shadow-sm flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export
                </button>
            </div>
        </header>
    );
};

const ResourcePanel = () => {
    const [activeTab, setActiveTab] = useState('Media');
    const addItem = useEditorStore(state => state.addItem);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        Array.from(files).forEach(file => {
            // Harness: Create a Blob URL directly in browser memory to bypass Electron strict local file restrictions
            const blobUrl = URL.createObjectURL(file);
            const isVideo = file.type.startsWith('video/');
            const isAudio = file.type.startsWith('audio/');
            
            // Add to store
            addItem({
                trackId: isAudio ? 'track-audio-1' : 'track-main',
                type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
                source: blobUrl,
                startTime: 0,
                duration: 5000, // Default 5s, would normally read metadata
                offset: 0,
                sourceDuration: 5000,
                layer: 1,
                name: file.name,
                transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
                properties: { volume: 100 }
            });
        });
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const tabs = [
        { id: 'Media', icon: <ImageIcon className="w-4 h-4" /> },
        { id: 'Audio', icon: <Music className="w-4 h-4" /> },
        { id: 'Text', icon: <Type className="w-4 h-4" /> },
        { id: 'Effects', icon: <Sparkles className="w-4 h-4" /> }
    ];

    return (
        <aside className="w-[340px] bg-card border-r border-border flex flex-col select-none shrink-0 z-40 relative">
            {/* Horizontal Tabs similar to CapCut */}
            <div className="flex px-2 pt-2 border-b border-border overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                            ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-md'}`}
                    >
                        {tab.icon} {tab.id}
                    </button>
                ))}
            </div>
            
            {/* Filter / Submenu Bar */}
            <div className="p-3 border-b border-border flex gap-2">
                <button className="px-3 py-1 bg-muted text-foreground text-xs font-medium rounded-full">Local</button>
                <button className="px-3 py-1 text-muted-foreground hover:bg-muted text-xs font-medium rounded-full">Cloud</button>
                <button className="px-3 py-1 text-muted-foreground hover:bg-muted text-xs font-medium rounded-full">Library</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto bg-background/50">
                <input 
                    type="file" 
                    multiple 
                    accept="video/*,audio/*,image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition bg-card group"
                >
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Import</span>
                    <span className="text-xs mt-1">Drag & Drop Media Here</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                    {/* Mock Items */}
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="group relative aspect-video bg-muted rounded-md overflow-hidden border border-border cursor-grab">
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition" />
                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded backdrop-blur-sm">
                                00:05
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
};

const PropertiesPanel = () => {
    const { selectedItemIds, items, updateItem } = useEditorStore();
    const selectedItem = selectedItemIds.length > 0 ? items[selectedItemIds[0]] : null;

    const handleTransformChange = (key: string, value: number) => {
        if (!selectedItem) return;
        updateItem(selectedItem.id, {
            transform: { ...selectedItem.transform, [key]: value }
        });
    };

    return (
        <aside className="w-[320px] bg-card border-l border-border flex flex-col select-none shrink-0 z-40 overflow-y-auto">
            <div className="h-12 border-b border-border flex items-center px-4 bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                <span className="text-foreground text-sm font-semibold flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" /> Properties
                </span>
            </div>
            
            {selectedItem ? (
                <div className="p-4 flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-foreground text-xs font-bold uppercase tracking-widest">Transform</span>
                            <button 
                                className="text-[10px] text-primary hover:underline"
                                onClick={() => updateItem(selectedItem.id, { transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 } })}
                            >Reset</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex justify-between">
                                    <label className="text-xs text-muted-foreground">Scale</label>
                                    <span className="text-xs text-foreground font-mono bg-muted px-1 rounded">{Math.round((selectedItem.transform?.scale || 1) * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" 
                                    min="0.1" max="3" step="0.05" 
                                    value={selectedItem.transform?.scale || 1}
                                    onChange={(e) => handleTransformChange('scale', parseFloat(e.target.value))}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between">
                                    <label className="text-xs text-muted-foreground">Opacity</label>
                                    <span className="text-xs text-foreground font-mono bg-muted px-1 rounded">{Math.round((selectedItem.transform?.opacity ?? 1) * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" 
                                    min="0" max="1" step="0.05" 
                                    value={selectedItem.transform?.opacity ?? 1}
                                    onChange={(e) => handleTransformChange('opacity', parseFloat(e.target.value))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Position X</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground" 
                                            value={selectedItem.transform?.x || 0} 
                                            onChange={(e) => handleTransformChange('x', parseInt(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">px</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Position Y</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground" 
                                            value={selectedItem.transform?.y || 0} 
                                            onChange={(e) => handleTransformChange('y', parseInt(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">px</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-full h-px bg-border"></div>

                    {selectedItem.type === 'video' && (
                        <div className="flex flex-col gap-3">
                            <span className="text-foreground text-xs font-bold uppercase tracking-widest">Blend Mode</span>
                            <select className="w-full bg-background border border-border rounded p-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary">
                                <option>Normal</option>
                                <option>Multiply</option>
                                <option>Screen</option>
                                <option>Overlay</option>
                            </select>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <MousePointerClick className="w-12 h-12 mb-3 text-muted-foreground/50 stroke-[1px]" />
                    <p className="text-sm font-medium">No clip selected</p>
                    <p className="text-xs mt-1">Select a clip on the timeline to edit its properties.</p>
                </div>
            )}
        </aside>
    );
};

const EditorMain = () => {
    const { isPlaying, togglePlay, playhead, duration, width, height, setProjectConfig } = useEditorStore();
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const frames = Math.floor((ms % 1000) / (1000/30)); // Assuming 30fps
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-muted/20 relative z-10">
            {/* Canvas Area */}
            <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
                {/* Chessboard background pattern to simulate transparency */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" 
                     style={{ backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }} />
                
                <PlayerEngine />
            </div>

            {/* Playback Controls Toolbar */}
            <div className="h-12 bg-card border-y border-border flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="font-mono text-xs font-semibold text-primary">{formatTime(playhead)}</span>
                    <span className="font-mono text-[10px]">/ {formatTime(duration)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                    <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded transition"><SkipBack className="w-4 h-4 fill-current" /></button>
                    <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center text-foreground hover:text-primary transition hover:scale-105 active:scale-95">
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded transition"><SkipForward className="w-4 h-4 fill-current" /></button>
                </div>
                
                <div className="flex items-center gap-2">
                    <select 
                        className="bg-transparent text-xs text-muted-foreground font-medium outline-none cursor-pointer"
                        value={`${width}x${height}`}
                        onChange={(e) => {
                            const [w, h] = e.target.value.split('x').map(Number);
                            setProjectConfig({ width: w, height: h });
                        }}
                    >
                        <option value="1080x1920">9:16 (Shorts)</option>
                        <option value="1920x1080">16:9 (YouTube)</option>
                        <option value="1080x1080">1:1 (Insta)</option>
                    </select>
                    <div className="w-px h-4 bg-border mx-1"></div>
                    <select className="bg-transparent text-xs text-muted-foreground font-medium outline-none cursor-pointer">
                        <option>Fit</option>
                        <option>100%</option>
                        <option>50%</option>
                    </select>
                    <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded transition"><Maximize className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};

// Must pass defaultTheme="light" down, but we will use the provider internally or let App's provider manage it.
export default function AgentCutEditor() {
    const location = useLocation();
    const addItem = useEditorStore(state => state.addItem);

    useEffect(() => {
        if (location.state?.brief) {
            injectBriefData(location.state.brief, addItem);
        }
    }, [location.state, addItem]);

    return (
        <QueryClientProvider client={queryClient}>
            {/* Force Light mode as Default if not set */}
            <ThemeProvider defaultTheme="light" storageKey="vlstudio-editor-theme">
                <div className="w-full h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
                    <Header />
                    
                    <div className="flex flex-1 min-h-0 relative">
                        <ResourcePanel />
                        <EditorMain />
                        <PropertiesPanel />
                    </div>
                    
                    <div className="h-[33vh] min-h-[250px] border-t border-border bg-card shrink-0 z-20 flex flex-col relative">
                        <TimelineCore />
                    </div>
                </div>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
