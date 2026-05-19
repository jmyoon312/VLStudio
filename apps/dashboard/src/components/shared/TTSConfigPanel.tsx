import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mic, Zap, Gamepad2, Coffee, MessageCircle, Scissors, Music } from 'lucide-react';
import { cn } from "@/lib/utils";
import { TTSConfig, TTSVoice } from '@/types/tts';
import { VoicePresetList, VoicePreset } from '../VoicePresetList';

interface TTSConfigPanelProps {
    config: TTSConfig;
    onChange: (newConfig: TTSConfig) => void;
    compact?: boolean;
}

const TTSConfigPanel: React.FC<TTSConfigPanelProps> = ({ config, onChange, compact = false }) => {
    // Local state for debouncing
    const [speed, setSpeed] = useState(config.speed);
    const [pitch, setPitch] = useState(config.pitch);

    // Silence settings local state
    const [silenceThreshold, setSilenceThreshold] = useState(config.silence_threshold ?? -40);
    const [minSilenceLen, setMinSilenceLen] = useState(config.min_silence_len ?? 300);
    const [keepSilenceLen, setKeepSilenceLen] = useState(config.keep_silence_len ?? 50);

    // Filters
    const [gender, setGender] = useState<"all" | "male" | "female">("all");
    const [ageGroup, setAgeGroup] = useState<"all" | "youth" | "adult" | "senior">("all");

    // Fetch Voices
    const { data: voices, isLoading } = useQuery<TTSVoice[]>({
        queryKey: ['tts-voices', config.engine, config.language],
        queryFn: async () => (await api.get(`/tools/tts/voices?engine=${config.engine}&language=${config.language}`)).data,
        enabled: !!config.engine
    });

    // Sync from props & Auto-Reset Voice if invalid for engine
    useEffect(() => {
        setSpeed(config.speed);
        setPitch(config.pitch);
        setSilenceThreshold(config.silence_threshold ?? -40);
        setMinSilenceLen(config.min_silence_len ?? 300);
        setKeepSilenceLen(config.keep_silence_len ?? 50);

        // Auto-select first voice if current voice_id is not in list (e.g. after engine switch)
        // But only if we have voices and not loading
        if (voices && voices.length > 0 && !isLoading) {
            const currentVoiceExists = voices.find(v => v.id === config.voice_id);
            if (!currentVoiceExists) {
                // Try to find a match by gender if possible, or just first one
                let nextVoice = voices[0];
                if (gender !== 'all') {
                    const match = voices.find(v => v.gender === gender);
                    if (match) nextVoice = match;
                }
                // Avoid infinite loop by checking if we are already changing
                if (config.voice_id !== nextVoice.id) {
                    handleChange('voice_id', nextVoice.id);
                }
            }
        }
    }, [config.engine, config.voice_id, voices, isLoading]);

    const handleChange = (key: keyof TTSConfig, value: any) => {
        //If engine changes, we might want to clear voice_id directly here too to be safe/faster
        if (key === 'engine') {
            onChange({ ...config, engine: value, voice_id: '' }); // Clear voice to trigger auto-select effect
            return;
        }
        onChange({ ...config, [key]: value });
    };

    // Debounced Change Helpers
    const handleSliderCommit = (key: keyof TTSConfig, value: number) => {
        handleChange(key, value);
    };

    // Helper: Friendly Names for Kokoro
    const getFriendlyVoiceName = (v: TTSVoice) => {
        if (config.engine !== 'kokoro') return v.name;
        const map: Record<string, string> = {
            "af_bella": "🇺🇸 미국 여성 (Bella)",
            "af_sarah": "🇺🇸 미국 여성 (Sarah)",
            "am_adam": "🇺🇸 미국 남성 (Adam)",
            "am_michael": "🇺🇸 미국 남성 (Michael)",
            "bf_emma": "🇬🇧 영국 여성 (Emma)",
            "bf_isabella": "🇬🇧 영국 여성 (Isabella)",
            "bm_george": "🇬🇧 영국 남성 (George)",
            "bm_lewis": "🇬🇧 영국 남성 (Lewis)",
            "jf_alpha": "🇯🇵 일본 여성 (Yuki)",
            "jf_gongitsune": "🇯🇵 일본 여성 (Gongitsune)",
            "zm_yuxiao": "🇨🇳 중국 남성 (Yuxiao)",
        };
        return map[v.id] || v.name;
    };

    const handleUserPresetSelect = (preset: VoicePreset) => {
        onChange({
            ...config,
            engine: preset.engine,
            language: preset.language,
            voice_id: preset.voice_id,
            speed: preset.speed,
            pitch: preset.pitch
        });
    };

    // Apply Recommended Preset (Shorts, News, etc.)
    const applyRecommendedPreset = (type: string, gender: 'male' | 'female') => {
        let targetEngine = config.engine;
        if (targetEngine !== 'edge' && targetEngine !== 'google') targetEngine = 'google';

        let vid = "";
        let sp = 1.0;
        let p = 0;

        const isGoogle = targetEngine === 'google';

        switch (type) {
            case "shorts":
                vid = isGoogle ? (gender === 'female' ? "google_female_energetic" : "google_male") : "";
                sp = 1.25; p = isGoogle ? (gender === 'female' ? 2 : 1) : 4;
                break;
            case "news":
                vid = isGoogle ? (gender === 'female' ? "google_female_calm" : "google_male_calm") : "";
                sp = 1.0; p = isGoogle ? (gender === 'female' ? 0 : -1) : 0;
                break;
            case "docu":
                vid = isGoogle ? (gender === 'female' ? "google_female_calm" : "google_male_deep") : "";
                sp = 0.9; p = isGoogle ? -1 : -2;
                break;
            case "conv":
                vid = isGoogle ? (gender === 'female' ? "google_female" : "google_male") : "";
                sp = 1.0; p = 0;
                break;
            case "vlog":
                vid = isGoogle ? "google_female_energetic" : "";
                sp = 1.1; p = 1;
                break;
        }

        // Apply filters
        setGender(gender);
        setSpeed(sp);
        setPitch(p);

        const newConfig = {
            ...config,
            engine: targetEngine,
            speed: sp,
            pitch: p
        };
        if (vid) newConfig.voice_id = vid;

        onChange(newConfig);
    };

    const applySilencePreset = (t: number, m: number, k: number) => {
        setSilenceThreshold(t);
        setMinSilenceLen(m);
        setKeepSilenceLen(k);
        onChange({
            ...config,
            silence_threshold: t,
            min_silence_len: m,
            keep_silence_len: k
        });
    };

    return (
        <div className={cn("space-y-3 font-sans", compact ? "px-1" : "py-4")}>

            {!compact && (
                <VoicePresetList
                    currentConfig={config as any}
                    onSelect={handleUserPresetSelect}
                />
            )}

            {/* Engine & Language Row */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Engine</Label>
                    <Select value={config.engine} onValueChange={(v) => handleChange('engine', v)}>
                        <SelectTrigger className="h-7 text-xs bg-white border-slate-200 focus:ring-1 focus:ring-slate-300">
                            <SelectValue placeholder="Engine" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            <SelectItem value="edge" className="text-xs">
                                <span className="font-semibold text-blue-600 mr-1">Edge</span>
                                <span className="text-slate-400 text-[10px]">(무료/자연스러움)</span>
                            </SelectItem>
                            <SelectItem value="google" className="text-xs">
                                <span className="font-semibold text-green-600 mr-1">Google</span>
                                <span className="text-slate-400 text-[10px]">(무료/기본)</span>
                            </SelectItem>
                            <SelectItem value="kokoro" className="text-xs">Kokoro (로컬)</SelectItem>
                            <SelectItem value="elevenlabs" className="text-xs">ElevenLabs (유료)</SelectItem>
                            <SelectItem value="supertone" className="text-xs">Supertone (유료)</SelectItem>
                            <SelectItem value="typecast" className="text-xs">Typecast (유료)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Language</Label>
                    <Select value={config.language} onValueChange={(v) => handleChange('language', v)}>
                        <SelectTrigger className="h-7 text-xs bg-white border-slate-200">
                            <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ko" className="text-xs">🇰🇷 한국어</SelectItem>
                            <SelectItem value="en" className="text-xs">🇺🇸 영어</SelectItem>
                            <SelectItem value="ja" className="text-xs">🇯🇵 일본어</SelectItem>
                            <SelectItem value="zh" className="text-xs">🇨🇳 중국어</SelectItem>
                            <SelectItem value="es" className="text-xs">🇪🇸 스페인어</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Recommended Presets (Grid Layout) */}
            {(config.engine === 'google' || config.engine === 'edge') && (
                <div className="space-y-1.5 pt-1">
                    <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> Quick Style</span>
                        <span className="text-[8px] font-normal normal-case text-slate-300">Gender + Style + Speed</span>
                    </Label>
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            { id: 'shorts', label: '쇼츠 (속도↑)', icon: Zap },
                            { id: 'news', label: '뉴스 (차분)', icon: Mic },
                            { id: 'docu', label: '다큐 (무거움)', icon: Music },
                            { id: 'vlog', label: '브이로그', icon: Coffee },
                        ].map(p => (
                            <div key={p.id} className="flex flex-col gap-px">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 text-[9px] rounded-b-none border-b-0 bg-slate-50 hover:bg-white text-slate-600 hover:text-blue-600 justify-between px-1.5"
                                    onClick={() => applyRecommendedPreset(p.id, 'male')}
                                >
                                    <span>{p.label}</span>
                                    <span className="text-[8px] bg-slate-200 px-1 rounded text-slate-600">남</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 text-[9px] rounded-t-none bg-slate-50 hover:bg-white text-slate-600 hover:text-pink-600 justify-between px-1.5 border-t-0"
                                    onClick={() => applyRecommendedPreset(p.id, 'female')}
                                >
                                    <span>{p.label}</span>
                                    <span className="text-[8px] bg-slate-200 px-1 rounded text-slate-600">여</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Voice Selection & Filters */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Voice</Label>
                    <div className="flex gap-1">
                        <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                            <SelectTrigger className="h-5 w-[50px] text-[9px] px-1 border-slate-200 bg-slate-50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                        </Select>
                        <Select value={ageGroup} onValueChange={(v: any) => setAgeGroup(v)}>
                            <SelectTrigger className="h-5 w-[50px] text-[9px] px-1 border-slate-200 bg-slate-50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="youth">Youth</SelectItem><SelectItem value="adult">Adult</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>

                <Select value={config.voice_id || ""} onValueChange={(v) => handleChange('voice_id', v)} disabled={isLoading}>
                    <SelectTrigger className="h-8 text-xs font-medium">
                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Voice"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {voices?.filter(v => {
                            if (gender !== 'all' && v.gender && v.gender !== 'unknown' && v.gender !== gender) return false;
                            if (ageGroup !== 'all' && v.age_group && v.age_group !== 'unknown' && v.age_group !== ageGroup) return false;
                            return true;
                        }).map((v) => (
                            <SelectItem key={v.id} value={v.id} className="text-xs">
                                {getFriendlyVoiceName(v)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Sliders (Engine Specific) */}
            <div className="bg-slate-50 rounded border border-slate-100 p-2 space-y-3">
                {/* Standard Pitch/Speed for Google/Edge/Others */}
                {(!['elevenlabs', 'supertone', 'typecast'].includes(config.engine)) && (
                    <>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] text-slate-500">Speed</Label>
                                <span className={cn("text-[10px] font-mono px-1 rounded", speed !== 1.0 ? "bg-amber-100 text-amber-700" : "text-slate-400")}>x{speed.toFixed(1)}</span>
                            </div>
                            <Slider
                                value={[speed]} min={0.5} max={2.0} step={0.1}
                                onValueChange={(v) => setSpeed(v[0])}
                                onValueCommit={(v) => handleSliderCommit('speed', v[0])}
                                className="py-1"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] text-slate-500">Pitch</Label>
                                <span className={cn("text-[10px] font-mono px-1 rounded", pitch !== 0 ? "bg-purple-100 text-purple-700" : "text-slate-400")}>
                                    {pitch > 0 ? `+${pitch}` : pitch}
                                </span>
                            </div>
                            <Slider
                                value={[pitch]} min={-20} max={20} step={1}
                                onValueChange={(v) => setPitch(v[0])}
                                onValueCommit={(v) => handleSliderCommit('pitch', v[0])}
                                className="py-1"
                            />
                        </div>
                    </>
                )}

                {/* ... (Keep other engine sliders same but compact) ... */}
                {config.engine === 'typecast' ? (
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400">Typecast Emotion</Label>
                        <div className="grid grid-cols-4 gap-1">
                            {['normal', 'happy', 'sad', 'angry'].map(e => (
                                <Button
                                    key={e}
                                    variant={config.emotion === e ? "default" : "outline"}
                                    size="sm"
                                    className={cn("h-6 text-[10px] px-0 capitalize", config.emotion === e && "bg-yellow-600 hover:bg-yellow-700")}
                                    onClick={() => handleChange('emotion', e)}
                                >
                                    {e.slice(0, 3)}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : config.engine === 'supertone' ? (
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400">Supertone Style</Label>
                        <div className="flex flex-wrap gap-1">
                            <Button
                                variant={config.emotion === "normal" ? "default" : "outline"}
                                size="sm"
                                className={cn("h-6 text-[10px]", config.emotion === "normal" && "bg-purple-600 hover:bg-purple-700")}
                                onClick={() => handleChange('emotion', "normal")}
                            >
                                Normal
                            </Button>
                            {voices?.find(v => v.id === config.voice_id)?.styles?.map(style => (
                                <Button
                                    key={style}
                                    variant={config.emotion === style ? "default" : "outline"}
                                    size="sm"
                                    className={cn("h-6 text-[10px] capitalize", config.emotion === style && "bg-purple-600 hover:bg-purple-700")}
                                    onClick={() => handleChange('emotion', style)}
                                >
                                    {style}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : config.engine === 'elevenlabs' && (
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400">ElevenLabs Settings</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[9px]">Stability</Label>
                                <Slider value={[config.xi_stability ?? 0.5]} max={1} step={0.01} onValueChange={(v) => handleChange('xi_stability', v[0])} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px]">Similarity</Label>
                                <Slider value={[config.xi_similarity_boost ?? 0.75]} max={1} step={0.01} onValueChange={(v) => handleChange('xi_similarity_boost', v[0])} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Silence Removal */}
            <div className="pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Scissors className="w-3 h-3" /> SILENCE REMOVER
                    </Label>
                    <Switch checked={config.use_silence_removal} onCheckedChange={(c) => handleChange('use_silence_removal', c)} className="scale-75" />
                </div>

                {config.use_silence_removal && (
                    <div className="p-2 bg-slate-100 rounded space-y-2">
                        <div className="grid grid-cols-4 gap-1">
                            {[
                                { t: -35, m: 200, k: 10, label: 'Fast' },
                                { t: -40, m: 300, k: 50, label: 'Normal' },
                                { t: -50, m: 800, k: 300, label: 'Slow' },
                            ].map(p => (
                                <Button key={p.label} variant="outline" size="sm"
                                    className={cn("h-5 text-[9px] px-1", silenceThreshold === p.t && "bg-blue-100 border-blue-300 text-blue-700")}
                                    onClick={() => applySilencePreset(p.t, p.m, p.k)}>{p.label}</Button>
                            ))}
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-slate-500">
                                <span>Thresh: {silenceThreshold}dB</span>
                                <span>Min: {minSilenceLen}ms</span>
                            </div>
                            <Slider value={[silenceThreshold]} min={-60} max={-10} step={1} onValueChange={(v) => setSilenceThreshold(v[0])} onValueCommit={(v) => handleChange('silence_threshold', v[0])} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TTSConfigPanel;
