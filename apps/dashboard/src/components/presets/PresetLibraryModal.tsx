import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Download, Check, RefreshCw, Film, Sliders, Layers, FileCode, CheckCircle2, Trash2, Edit3, Play, Pause, Music, Mic, Volume2, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { PresetCustomizeModal } from './PresetCustomizeModal';


export interface SovereignPreset {
    id: string;
    name: string;
    category: string;
    source: string;
    style: {
        output?: { size: string; fps: string };
        caption?: {
            font_id?: string;
            size_px?: number;
            color?: string;
            outline_color?: string;
            position?: string;
        };
        title?: {
            enabled?: boolean;
            size_px?: number;
            color?: string;
            box_color?: string | null;
        };
        video?: {
            zoom_pct?: number;
        };
        audio_dsp?: any;
    };
    recipe?: string;
    content_rules?: string[];
    preview_video_url?: string;
    thumbnail_url?: string;
    keyframes?: Array<{ url: string; label?: string; index?: number } | string>;
    voice_signature?: {
        voice_role?: string;
        tone_summary?: string;
        gemini_voice?: string;
        supertonic_voice?: string;
        elevenlabs_voice?: string;
        emotion_prompt?: string;
        target_wpm?: number;
    };
    bgm_signature?: {
        genre?: string;
        mood?: string;
        bpm_range?: string;
        ducking_db?: number;
        track_style?: string;
    };
    sfx_signature?: {
        hook_sfx?: string;
        transition_sfx?: string;
        accent_sfx?: string;
        climax_sfx?: string;
    };
    editing_pacing?: {
        asl_seconds?: number;
        scene_change_count?: number;
        pacing_level?: string;
    };
    source_video_path?: string;
    metrics?: { likes: number; views: number; saves: number };
    is_favorite?: boolean;
    category_tab?: 'favorites' | 'personal' | 'community' | 'pixeling';
    version?: number;
}

interface PresetLibraryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activePresetId?: string | null;
    onSelectPreset: (preset: SovereignPreset) => void;
}

export const PresetLibraryModal: React.FC<PresetLibraryModalProps> = ({
    open,
    onOpenChange,
    activePresetId,
    onSelectPreset,
}) => {
    const [presets, setPresets] = useState<SovereignPreset[]>([]);
    const [loading, setLoading] = useState(false);
    const [harvesting, setHarvesting] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'official' | 'harvested' | 'user'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [customizingPreset, setCustomizingPreset] = useState<SovereignPreset | null>(null);
    const [customizeModalOpen, setCustomizeModalOpen] = useState(false);

    const fetchPresets = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sovereign-presets');
            if (res.ok) {
                const data = await res.json();
                setPresets(data);
            }
        } catch (err) {
            console.error('Failed to load presets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('이 커스텀 프리셋을 정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/sovereign-presets/${presetId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success('프리셋이 삭제되었습니다.');
                fetchPresets();
            } else {
                const err = await res.json();
                toast.error(err.detail || '삭제 실패');
            }
        } catch {
            toast.error('프리셋 삭제 중 오류가 발생했습니다.');
        }
    };


    useEffect(() => {
        if (open) {
            fetchPresets();
        }
    }, [open]);

    const handleHarvestPixeling = async () => {
        setHarvesting(true);
        try {
            const res = await fetch('/api/sovereign-presets/harvest-pixeling', {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`픽셀링 프리셋 ${data.harvest.total_harvested}개를 성공적으로 흡수했습니다!`);
                await fetchPresets();
            } else {
                toast.error(data.detail || '픽셀링 프리셋 가져오기 실패');
            }
        } catch (err) {
            toast.error('픽셀링 프리셋 흡수 요청 중 오류가 발생했습니다.');
        } finally {
            setHarvesting(false);
        }
    };

    const filteredPresets = presets.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.recipe?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;
        if (activeTab === 'official') return p.source === 'pixeling_official' || p.source === 'viraloop_official';
        if (activeTab === 'harvested') return p.source === 'pixeling_user' || p.source === 'pixeling_official';
        if (activeTab === 'user') return p.source === 'viraloop_user' || p.source === 'user';
        return true;
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-card border-border/80 text-card-foreground shadow-xs">
                <DialogHeader className="pb-3 border-b border-border/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-primary" />
                            <DialogTitle className="text-xl font-bold">주권형 프리셋 보관함 (Preset Library)</DialogTitle>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleHarvestPixeling}
                            disabled={harvesting}
                            className="gap-2 h-8 text-xs border-border/80 hover:bg-muted"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${harvesting ? 'animate-spin' : ''}`} />
                            픽셀링 프리셋 일괄 흡수
                        </Button>
                    </div>
                    <DialogDescription className="text-muted-foreground text-xs">
                        검증된 연출 절차(Recipe), 자막 스타일, 자연어 규칙이 포함된 프리셋을 선택하여 대화형 제작에 적용합니다.
                    </DialogDescription>
                </DialogHeader>

                {/* Search & Tabs */}
                <div className="flex flex-col sm:flex-row gap-3 py-2 items-center justify-between">
                    <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border/60">
                        <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                                activeTab === 'all'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            전체 ({presets.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('official')}
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                                activeTab === 'official'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            공식 5대 카탈로그
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('harvested')}
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                                activeTab === 'harvested'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            픽셀링 흡수본
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('user')}
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                                activeTab === 'user'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            내 저장 프리셋
                        </button>
                    </div>

                    <div className="w-full sm:w-64">
                        <Input
                            placeholder="프리셋 이름 또는 연출 규칙 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 text-xs bg-background border-border/80"
                        />
                    </div>
                </div>

                {/* Preset Grid */}
                <div className="flex-1 overflow-y-auto pr-1 py-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-xs">프리셋 목록을 불러오는 중...</p>
                        </div>
                    ) : filteredPresets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border/80 rounded-xl">
                            <Film className="w-8 h-8 opacity-40 mb-2" />
                            <p className="text-sm font-medium text-foreground">조건에 맞는 프리셋이 없습니다.</p>
                            <p className="text-xs text-muted-foreground mt-1">상단의 '픽셀링 프리셋 일괄 흡수'를 눌러 기본 프리셋을 가져와 보세요.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {filteredPresets.map((preset) => {
                                const isSelected = activePresetId === preset.id;
                                const isPlaying = playingVideoId === preset.id;
                                const size = preset.style?.output?.size || '1080x1920';
                                const capSize = preset.style?.caption?.size_px || 64;
                                const capColor = preset.style?.caption?.color || '#FFFFFF';
                                const kfs = (preset.keyframes || []) as Array<{ url: string; label?: string } | string>;
                                const hasMedia = Boolean(preset.preview_video_url || preset.thumbnail_url || kfs.length > 0);

                                return (
                                    <div
                                        key={preset.id}
                                        className={`group relative p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                                            isSelected
                                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                                                : 'border-border/80 bg-card hover:border-primary/50 hover:shadow-xs'
                                        }`}
                                    >
                                        <div>
                                            {/* 1. Media Preview & Keyframe Contact Sheet */}
                                            {hasMedia && (
                                                <div className="relative w-full h-44 rounded-lg overflow-hidden bg-black/80 border border-border/70 group/media mb-3">
                                                    {isPlaying && preset.preview_video_url ? (
                                                        <div className="relative w-full h-full">
                                                            <video
                                                                src={preset.preview_video_url}
                                                                autoPlay
                                                                controls
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPlayingVideoId(null);
                                                                }}
                                                                className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white/90 hover:text-white hover:bg-black transition-colors z-10"
                                                                title="미리보기 닫기"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="relative w-full h-full cursor-pointer"
                                                            onClick={() => {
                                                                if (preset.preview_video_url) {
                                                                    setPlayingVideoId(preset.id);
                                                                }
                                                            }}
                                                        >
                                                            {preset.thumbnail_url ? (
                                                                <img
                                                                    src={preset.thumbnail_url}
                                                                    alt={preset.name}
                                                                    className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-muted/40">
                                                                    <Film className="w-8 h-8 text-muted-foreground/50" />
                                                                </div>
                                                            )}

                                                            {/* Play Button Overlay */}
                                                            {preset.preview_video_url && (
                                                                <div className="absolute inset-0 bg-black/25 group-hover/media:bg-black/10 flex items-center justify-center transition-colors">
                                                                    <div className="w-10 h-10 rounded-full bg-background/85 backdrop-blur-xs flex items-center justify-center shadow-lg group-hover/media:scale-110 transition-transform">
                                                                        <Play className="w-5 h-5 text-foreground fill-foreground ml-0.5" />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Top Badge: ASL & Scene Cuts */}
                                                            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                                                                {preset.editing_pacing?.asl_seconds ? (
                                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/75 text-emerald-400 border border-emerald-500/30 backdrop-blur-xs flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        컷 {preset.editing_pacing.asl_seconds}s
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/75 text-white/90 border border-white/20 backdrop-blur-xs">
                                                                        {size}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Bottom 6-Keyframe Contact Sheet */}
                                                            {kfs.length > 0 && (
                                                                <div className="absolute bottom-1.5 left-2 right-2 flex gap-1 bg-black/75 backdrop-blur-xs p-1 rounded-md border border-white/10 z-10">
                                                                    {kfs.slice(0, 6).map((kf: any, i: number) => {
                                                                        const kfUrl = typeof kf === 'string' ? kf : kf?.url;
                                                                        return (
                                                                            <img
                                                                                key={i}
                                                                                src={kfUrl}
                                                                                alt={`kf-${i}`}
                                                                                className="h-6 flex-1 object-cover rounded-xs border border-white/20 hover:scale-110 transition-transform"
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 2. Title & Recipe */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                        <span className="font-semibold text-sm text-foreground truncate">
                                                            {preset.name}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border/80">
                                                            {size}
                                                        </Badge>
                                                        {preset.source?.includes('pixeling') && (
                                                            <Badge className="text-[10px] h-5 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none">
                                                                Pixeling
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {preset.recipe || '자연어 지침 및 고품질 자막이 결합된 연출 프리셋입니다.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 3. Audio Triad (Voice + BGM + SFX) Badges */}
                                            <div className="mt-2.5 p-2 rounded-lg bg-muted/40 border border-border/50 text-[11px] space-y-1">
                                                {preset.voice_signature && (
                                                    <div className="flex items-center gap-1.5 text-foreground/90 truncate">
                                                        <Mic className="w-3.5 h-3.5 text-primary shrink-0" />
                                                        <span className="font-semibold text-primary">음성:</span>
                                                        <span className="text-muted-foreground truncate">
                                                            Gemini 3.8 '{preset.voice_signature.gemini_voice || 'Charon'}' · {preset.voice_signature.voice_role || preset.voice_signature.tone_summary}
                                                        </span>
                                                    </div>
                                                )}
                                                {preset.bgm_signature && (
                                                    <div className="flex items-center gap-1.5 text-foreground/90 truncate">
                                                        <Music className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                        <span className="font-semibold text-blue-500">BGM:</span>
                                                        <span className="text-muted-foreground truncate">
                                                            {preset.bgm_signature.genre} ({preset.bgm_signature.ducking_db || -20}dB)
                                                        </span>
                                                    </div>
                                                )}
                                                {preset.sfx_signature && (
                                                    <div className="flex items-center gap-1.5 text-foreground/90 truncate">
                                                        <Volume2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                        <span className="font-semibold text-amber-500">SFX:</span>
                                                        <span className="text-muted-foreground truncate">
                                                            {preset.sfx_signature.hook_sfx}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 4. Style & Rules Badges */}
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1 border border-border/60">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: capColor }} />
                                                    자막 {capSize}px
                                                </span>
                                                {preset.content_rules && preset.content_rules.length > 0 && (
                                                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        규칙 {preset.content_rules.length}개
                                                    </span>
                                                )}
                                                {preset.style?.video?.zoom_pct && preset.style.video.zoom_pct > 100 && (
                                                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                        줌 {preset.style.video.zoom_pct}%
                                                    </span>
                                                )}
                                            </div>

                                            {/* Content Rules snippet */}
                                            {preset.content_rules && preset.content_rules.length > 0 && (
                                                <div className="mt-2 p-2 rounded-lg bg-muted/60 text-[11px] text-muted-foreground border border-border/40">
                                                    <span className="font-semibold text-foreground/80 block mb-0.5">핵심 연출 지침:</span>
                                                    <ul className="list-disc list-inside space-y-0.5">
                                                        {preset.content_rules.slice(0, 2).map((rule, idx) => (
                                                            <li key={idx} className="truncate">{rule}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCustomizingPreset(preset);
                                                        setCustomizeModalOpen(true);
                                                    }}
                                                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    title="프리셋 세부 수정 및 커스텀 복제"
                                                >
                                                    <Sliders className="w-3.5 h-3.5" />
                                                    수정/복제
                                                </Button>

                                                {(preset.source === 'viraloop_user' || preset.source === 'user') && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={(e) => handleDeletePreset(preset.id, e)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        title="프리셋 삭제"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>

                                            <Button
                                                size="sm"
                                                variant={isSelected ? 'default' : 'outline'}
                                                className={`h-7 px-3 text-xs gap-1.5 ${
                                                    isSelected ? 'bg-primary text-primary-foreground' : 'border-border/80 hover:bg-primary hover:text-primary-foreground'
                                                }`}
                                                onClick={() => {
                                                    onSelectPreset(preset);
                                                    onOpenChange(false);
                                                    toast.success(`'${preset.name}' 프리셋이 대화창에 적용되었습니다.`);
                                                }}
                                            >
                                                {isSelected ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" />
                                                        적용 중
                                                    </>
                                                ) : (
                                                    '이 프리셋 선택'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>

            <PresetCustomizeModal
                open={customizeModalOpen}
                onOpenChange={setCustomizeModalOpen}
                preset={customizingPreset}
                onPresetUpdated={(updated) => {
                    fetchPresets();
                    onSelectPreset(updated);
                }}
            />
        </Dialog>
    );
};

