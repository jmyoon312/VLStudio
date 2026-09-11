
import React, { useEffect, useState, useCallback } from 'react';
import { SubtitleConfig, KOREAN_FONTS, ANIMATIONS } from '@/types/subtitle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Bold, Italic, Type, Palette, Layout, Move,
    Scissors, AlignCenter, AlignJustify, BoxSelect, ArrowRight
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { SubtitlePresetManager } from './SubtitlePresetManager';
import { toast } from 'sonner';

interface SubtitleConfigPanelProps {
    config: SubtitleConfig;
    onChange: (newConfig: SubtitleConfig) => void;
    compact?: boolean;
}

// Helper for debouncing updates
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function safeHexColor(c?: string, fallback: string = '#FFFFFF'): string {
    if (!c || typeof c !== 'string') return fallback;
    const clean = c.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean;
    if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
        return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
    }
    return fallback;
}

const SubtitleConfigPanel: React.FC<SubtitleConfigPanelProps> = ({ config, onChange, compact = false }) => {
    // Local state for immediate UI feedback
    const [localConfig, setLocalConfig] = useState<SubtitleConfig>(config);

    // Sync external config to local state when it changes (upstream update)
    useEffect(() => {
        if (JSON.stringify(config) !== JSON.stringify(localConfig)) {
            setLocalConfig(config);
        }
    }, [config]);

    const [debouncedConfig] = useState(config);

    const updateDebounced = useCallback((key: keyof SubtitleConfig, value: any) => {
        setLocalConfig(prev => {
            const next = { ...prev, [key]: value };
            return next;
        });
    }, []);

    // Effect: Sync Local -> Parent with Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (JSON.stringify(localConfig) !== JSON.stringify(config)) {
                onChange(localConfig);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localConfig, onChange]);

    const updateInstant = (key: keyof SubtitleConfig, value: any) => {
        const newConf = { ...localConfig, [key]: value };
        setLocalConfig(newConf);
        onChange(newConf);
    };

    const handlePresetLoad = (newConfig: SubtitleConfig) => {
        setLocalConfig(newConfig);
        onChange(newConfig); // Immediate update for presets
        toast.success("프리셋이 적용되었습니다");
    };

    return (
        <div className={cn("w-full transition-all text-[11px]", compact ? "p-0" : "p-4")}>
            {/* Header for Subtitle Config Panel */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-card-foreground">자막 상세 설정</span>
                <SubtitlePresetManager
                    currentConfig={localConfig}
                    onLoad={handlePresetLoad}
                />
            </div>

            <Tabs defaultValue="style" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-2.5 h-8 bg-muted/60 p-0.5 border border-border rounded-lg">
                    <TabsTrigger value="style" title="스타일" className="text-[10px] h-7 px-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground font-semibold"><Palette className="w-3.5 h-3.5 mr-1 text-purple-500" /> 스타일</TabsTrigger>
                    <TabsTrigger value="layout" title="배경/위치" className="text-[10px] h-7 px-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground font-semibold"><Layout className="w-3.5 h-3.5 mr-1 text-blue-500" /> 위치</TabsTrigger>
                    <TabsTrigger value="anim" title="애니메이션" className="text-[10px] h-7 px-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground font-semibold"><Move className="w-3.5 h-3.5 mr-1 text-emerald-500" /> 효과</TabsTrigger>
                    <TabsTrigger value="segment" title="분절" className="text-[10px] h-7 px-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground font-semibold"><Scissors className="w-3.5 h-3.5 mr-1 text-amber-500" /> 분절</TabsTrigger>
                </TabsList>

                {/* --- 1. Style Tab --- */}
                <TabsContent value="style" className="space-y-3">
                    {/* Font & Size */}
                    <div className="grid grid-cols-5 gap-2 items-end">
                        <div className="col-span-3 space-y-1">
                            <Label className="text-[10.5px] text-muted-foreground font-semibold">폰트 (Font)</Label>
                            <Select
                                value={localConfig.font}
                                onValueChange={(v) => updateInstant('font', v)}
                            >
                                <SelectTrigger className="h-8 text-[11px] bg-background border-input text-foreground focus:ring-1 focus:ring-primary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground">
                                    {KOREAN_FONTS.map(f => (
                                        <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }} className="text-xs text-popover-foreground focus:bg-primary focus:text-primary-foreground">
                                            {f.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10.5px] text-muted-foreground font-semibold">크기 (CapCut)</Label>
                                <span className="text-[10px] text-foreground font-mono font-bold">{localConfig.fontSize}px</span>
                            </div>
                            <Slider
                                value={[localConfig.fontSize]}
                                min={16} max={72} step={1}
                                onValueChange={(v) => updateDebounced('fontSize', v[0])}
                                className="py-1.5"
                            />
                        </div>
                    </div>

                    {/* Colors & Toggles */}
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/40 border border-border">
                        <input
                            type="color"
                            value={safeHexColor(localConfig.textColor, '#FFFFFF')}
                            onChange={(e) => updateDebounced('textColor', e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer border border-border bg-transparent shrink-0"
                            title="텍스트 색상"
                        />
                        <span className="text-[10px] text-muted-foreground font-mono flex-1">{(localConfig.textColor || '#FFFFFF').toUpperCase()}</span>

                        <div className="h-4 w-px bg-border mx-1" />

                        {/* Alignment */}
                        <div className="flex gap-0.5">
                            <button
                                onClick={() => updateInstant('textAlign', 'left')}
                                className={cn("p-1 rounded transition-colors", localConfig.textAlign === 'left' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
                                title="왼쪽 정렬"
                            >
                                <AlignJustify className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => updateInstant('textAlign', 'center')}
                                className={cn("p-1 rounded transition-colors", (localConfig.textAlign === 'center' || !localConfig.textAlign) ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
                                title="가운데 정렬"
                            >
                                <AlignCenter className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => updateInstant('textAlign', 'right')}
                                className={cn("p-1 rounded transition-colors", localConfig.textAlign === 'right' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
                                title="오른쪽 정렬"
                            >
                                <AlignJustify className="w-3.5 h-3.5 scale-x-[-1]" />
                            </button>
                        </div>

                        <div className="h-4 w-px bg-border mx-1" />

                        <div className="flex gap-0.5">
                            <button
                                onClick={() => updateInstant('isBold', !localConfig.isBold)}
                                className={cn("p-1 rounded transition-colors", localConfig.isBold ? "bg-primary text-primary-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
                                title="굵게"
                            >
                                <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => updateInstant('isItalic', !localConfig.isItalic)}
                                className={cn("p-1 rounded transition-colors", localConfig.isItalic ? "bg-primary text-primary-foreground shadow-xs italic" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
                                title="기울임"
                            >
                                <Italic className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Outline */}
                    <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
                                <div
                                    className="w-2.5 h-2.5 rounded-full border border-border shadow-2xs"
                                    style={{ backgroundColor: localConfig.outlineColor }}
                                />
                                외곽선 (Outline)
                            </Label>
                            <input
                                type="color"
                                value={safeHexColor(localConfig.outlineColor, '#000000')}
                                onChange={(e) => updateDebounced('outlineColor', e.target.value)}
                                className="w-0 h-0 opacity-0 absolute"
                                id="outline-color-picker"
                            />
                            <Label htmlFor="outline-color-picker" className="text-[9.5px] text-primary cursor-pointer hover:underline font-semibold">색상변경</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Slider
                                value={[localConfig.outlineSize]}
                                min={0} max={10} step={0.5}
                                onValueChange={(v) => updateDebounced('outlineSize', v[0])}
                                className="flex-1"
                            />
                            <span className="text-[9.5px] w-5 text-right font-mono text-foreground font-semibold">{localConfig.outlineSize}</span>
                        </div>
                    </div>

                    {/* Shadow */}
                    <div className="space-y-1 pt-1 border-t border-dashed border-border">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
                                <div
                                    className="w-2.5 h-2.5 rounded-full border border-border shadow-2xs"
                                    style={{ backgroundColor: localConfig.shadowColor }}
                                />
                                그림자 (Shadow)
                            </Label>
                            <input
                                type="color"
                                value={safeHexColor(localConfig.shadowColor, '#000000')}
                                onChange={(e) => updateDebounced('shadowColor', e.target.value)}
                                className="w-0 h-0 opacity-0 absolute"
                                id="shadow-color-picker"
                            />
                            <Label htmlFor="shadow-color-picker" className="text-[9.5px] text-primary cursor-pointer hover:underline font-semibold">색상변경</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Slider
                                value={[localConfig.shadowSize]}
                                min={0} max={10} step={0.5}
                                onValueChange={(v) => updateDebounced('shadowSize', v[0])}
                                className="flex-1"
                            />
                            <span className="text-[9.5px] w-5 text-right font-mono text-foreground font-semibold">{localConfig.shadowSize}</span>
                        </div>
                    </div>
                </TabsContent>

                {/* --- 2. Layout Tab --- */}
                <TabsContent value="layout" className="space-y-3">
                    {/* Position Presets */}
                    <div className="grid grid-cols-3 gap-1">
                        {['top', 'middle', 'bottom'].map((pos) => (
                            <button
                                key={pos}
                                onClick={() => updateInstant('position', pos)}
                                className={cn(
                                    "px-2 py-1.5 text-[10px] border rounded-lg transition-all",
                                    localConfig.position === pos
                                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {pos === 'top' && '상단'}
                                {pos === 'middle' && '중앙'}
                                {pos === 'bottom' && '하단'}
                            </button>
                        ))}
                    </div>

                    {/* Detailed Positioning */}
                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border space-y-2">
                        {localConfig.position !== 'custom' ? (
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <Label className="text-[10px] text-muted-foreground font-medium">수직 여백 (Margin Y)</Label>
                                    <span className="text-[9.5px] text-foreground font-mono font-bold">{localConfig.marginV}px</span>
                                </div>
                                <Slider
                                    value={[localConfig.marginV]}
                                    min={0} max={500} step={10}
                                    onValueChange={(v) => updateDebounced('marginV', v[0])}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">X 좌표</Label>
                                    <Input
                                        type="number"
                                        className="h-7 text-[10px] bg-background border-border text-foreground"
                                        value={localConfig.customX}
                                        onChange={(e) => updateDebounced('customX', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Y 좌표</Label>
                                    <Input
                                        type="number"
                                        className="h-7 text-[10px] bg-background border-border text-foreground"
                                        value={localConfig.customY}
                                        onChange={(e) => updateDebounced('customY', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="pt-1 border-t border-border mt-1 flex items-center justify-between">
                            <button
                                onClick={() => updateInstant('position', 'custom')}
                                className={cn(
                                    "text-[9px] px-2 py-0.5 rounded border transition-colors",
                                    localConfig.position === 'custom' ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-400/40 font-bold" : "bg-background text-muted-foreground border-border"
                                )}
                            >
                                사용자 지정 좌표 모드
                            </button>
                        </div>
                    </div>

                    {/* Background Box */}
                    <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                                <BoxSelect className="w-3 h-3 text-muted-foreground" /> 배경 박스 (Background Box)
                            </Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={safeHexColor(localConfig.backgroundColor, '#000000')}
                                    onChange={(e) => updateDebounced('backgroundColor', e.target.value)}
                                    className="w-4 h-4 rounded cursor-pointer border border-border"
                                />
                                <Switch
                                    checked={localConfig.useBox}
                                    onCheckedChange={(c) => updateInstant('useBox', c)}
                                    className="scale-75 origin-right"
                                />
                            </div>
                        </div>
                        {localConfig.useBox && (
                            <div className="space-y-1 pl-3 border-l-2 border-border">
                                <div className="flex justify-between">
                                    <Label className="text-[9px] text-muted-foreground">투명도 (Opacity)</Label>
                                    <span className="text-[9px] text-foreground font-mono font-bold">{localConfig.backgroundOpacity}%</span>
                                </div>
                                <Slider
                                    value={[localConfig.backgroundOpacity]}
                                    min={0} max={100} step={5}
                                    onValueChange={(v) => updateDebounced('backgroundOpacity', v[0])}
                                />
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* --- 3. Animation Tab --- */}
                <TabsContent value="anim" className="space-y-4">
                    {/* Visual Timeline for Animation Config */}
                    <div className="relative pl-3 border-l border-border text-[10px] space-y-5">

                        {/* 1. Entrance */}
                        <div className="relative group">
                            <span className="absolute -left-[17px] top-0 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-background" />
                            <Label className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1.5">1. 등장 효과 (Entrance)</Label>

                            <div className="space-y-2 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                                <Select
                                    value={localConfig.animationEntrance || 'none'}
                                    onValueChange={(v) => updateInstant('animationEntrance', v)}
                                >
                                    <SelectTrigger className="h-7 text-[10.5px] bg-background border-border text-foreground">
                                        <SelectValue placeholder="효과 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                        <SelectItem value="none">없음</SelectItem>
                                        <SelectItem value="fade">페이드 인 (Fade In)</SelectItem>
                                        <SelectItem value="pop_up">팝업 (Pop Up)</SelectItem>
                                        <SelectItem value="slide_up">위로 슬라이드</SelectItem>
                                        <SelectItem value="typewriter">타자기 효과</SelectItem>
                                        <SelectItem value="blur_in">블러 인</SelectItem>
                                    </SelectContent>
                                </Select>
                                {localConfig.animationEntrance !== 'none' && (
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                                <span>지속 시간</span>
                                                <span className="font-mono text-foreground">{localConfig.animationEntranceDuration}s</span>
                                            </div>
                                            <Slider
                                                value={[localConfig.animationEntranceDuration || 0.5]}
                                                min={0.1} max={3} step={0.1}
                                                onValueChange={(v) => updateDebounced('animationEntranceDuration', v[0])}
                                                className="h-4"
                                            />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                                <span>시작 지연</span>
                                                <span className="font-mono text-foreground">{localConfig.animationEntranceDelay}s</span>
                                            </div>
                                            <Slider
                                                value={[localConfig.animationEntranceDelay || 0]}
                                                min={0} max={2} step={0.1}
                                                onValueChange={(v) => updateDebounced('animationEntranceDelay', v[0])}
                                                className="h-4"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Emphasis (Middle) */}
                        <div className="relative group">
                            <span className="absolute -left-[17px] top-0 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-background" />
                            <Label className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 block mb-1.5">2. 강조/유지 효과 (Emphasis)</Label>

                            <div className="space-y-2 bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                                <Select
                                    value={localConfig.animationEmphasis || 'none'}
                                    onValueChange={(v) => updateInstant('animationEmphasis', v)}
                                >
                                    <SelectTrigger className="h-7 text-[10.5px] bg-background border-border text-foreground">
                                        <SelectValue placeholder="효과 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                        <SelectItem value="none">없음</SelectItem>
                                        <SelectItem value="pulse">펄스 (Pulse)</SelectItem>
                                        <SelectItem value="shake">흔들림 (Shake)</SelectItem>
                                        <SelectItem value="neon">네온 (Neon)</SelectItem>
                                        <SelectItem value="bounce">바운스 (Bounce)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {localConfig.animationEmphasis !== 'none' && (
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                                <span>속도/주기</span>
                                                <span className="font-mono text-foreground">{localConfig.animationEmphasisDuration}s</span>
                                            </div>
                                            <Slider
                                                value={[localConfig.animationEmphasisDuration || 1.0]}
                                                min={0.5} max={5} step={0.5}
                                                onValueChange={(v) => updateDebounced('animationEmphasisDuration', v[0])}
                                                className="h-4"
                                            />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                                <span>대기 시간</span>
                                                <span className="font-mono text-foreground">{localConfig.animationEmphasisDelay}s</span>
                                            </div>
                                            <Slider
                                                value={[localConfig.animationEmphasisDelay || 0]}
                                                min={0} max={5} step={0.5}
                                                onValueChange={(v) => updateDebounced('animationEmphasisDelay', v[0])}
                                                className="h-4"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Exit */}
                        <div className="relative group">
                            <span className="absolute -left-[17px] top-0 w-2 h-2 rounded-full bg-rose-500 ring-4 ring-background" />
                            <Label className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 block mb-1.5">3. 퇴장 효과 (Exit)</Label>

                            <div className="space-y-2 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                                <Select
                                    value={localConfig.animationExit || 'none'}
                                    onValueChange={(v) => updateInstant('animationExit', v)}
                                >
                                    <SelectTrigger className="h-7 text-[10.5px] bg-background border-border text-foreground">
                                        <SelectValue placeholder="효과 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                        <SelectItem value="none">없음</SelectItem>
                                        <SelectItem value="fade_out">페이드 아웃</SelectItem>
                                        <SelectItem value="zoom_out">줌 아웃</SelectItem>
                                        <SelectItem value="slide_out_down">아래로 슬라이드</SelectItem>
                                    </SelectContent>
                                </Select>
                                {localConfig.animationExit !== 'none' && (
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                                <span>지속 시간</span>
                                                <span className="font-mono text-foreground">{localConfig.animationExitDuration}s</span>
                                            </div>
                                            <Slider
                                                value={[localConfig.animationExitDuration || 0.5]}
                                                min={0.1} max={3} step={0.1}
                                                onValueChange={(v) => updateDebounced('animationExitDuration', v[0])}
                                                className="h-4"
                                            />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                                <span>퇴장 지연</span>
                                                <span className="font-mono text-foreground">{localConfig.animationExitDelay}s</span>
                                            </div>
                                            <Slider
                                                value={[localConfig.animationExitDelay || 0]}
                                                min={0} max={2} step={0.1}
                                                onValueChange={(v) => updateDebounced('animationExitDelay', v[0])}
                                                className="h-4"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* --- 4. Segmentation Tab --- */}
                <TabsContent value="segment" className="space-y-3">
                    <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10.5px] font-semibold text-foreground flex items-center gap-1.5">
                                    <Scissors className="w-3.5 h-3.5 text-amber-500" /> 줄바꿈 제한 (Split Limit)
                                </Label>
                                <span className="text-[10px] bg-background text-foreground px-2 py-0.5 rounded-md border border-border font-mono font-bold">
                                    {localConfig.splitLimit}자
                                </span>
                            </div>
                            <Slider
                                value={[localConfig.splitLimit]}
                                min={5} max={50} step={1}
                                onValueChange={(v) => updateDebounced('splitLimit', v[0])}
                            />
                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                <span>Shorts 권장 (10-15자)</span>
                                <span>Longform 권장 (20-30자)</span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2.5 border-t border-border">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10.5px] font-semibold text-foreground">최대 줄 수 (Max Lines)</Label>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3].map((num) => (
                                        <button
                                            key={num}
                                            className={cn(
                                                "w-7 h-7 rounded-lg border text-[11px] font-bold transition-all",
                                                localConfig.maxLines === num
                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                    : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                            )}
                                            onClick={() => updateDebounced('maxLines', num)}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SubtitleConfigPanel;
