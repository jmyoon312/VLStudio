import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mic, Zap, Gamepad2, Coffee, MessageCircle, Scissors, Music, Volume2, Square, Play } from 'lucide-react';
import { toast } from 'sonner';
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

    // Voice Preview & Audition state
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [previewProgress, setPreviewProgress] = useState(0);
    const [customAuditionText, setCustomAuditionText] = useState("");
    const [showCustomAudition, setShowCustomAudition] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Stop audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePreviewVoice = async (textOverride?: string) => {
        if (isPlayingPreview && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlayingPreview(false);
            setPreviewProgress(0);
            return;
        }

        if (!config.voice_id) {
            toast.error("목소리를 먼저 선택해주세요.");
            return;
        }

        try {
            setIsPreviewLoading(true);
            const sampleTexts: Record<string, string> = {
                ko: "안녕하세요! 선택하신 목소리 샘플입니다. 자연스럽게 들리시나요?",
                en: "Hello! This is a sample of the selected voice. How does it sound?",
                ja: "こんにちは！選択された音声のサンプルです。いかがでしょうか？",
                zh: "你好！这是所选语音的样本。听起来怎么样？",
                es: "¡Hola! Esta es una muestra de la voz seleccionada.",
            };
            const defaultText = sampleTexts[config.language] || sampleTexts["ko"];
            const textToSpeak = (textOverride || customAuditionText).trim() || defaultText;

            const formData = new FormData();
            formData.append("text", textToSpeak);
            formData.append("engine", config.engine);
            formData.append("language", config.language);
            formData.append("voice_id", config.voice_id);
            formData.append("rate", String(Math.round((config.speed - 1.0) * 100)));
            formData.append("pitch", String(config.pitch || 0));
            formData.append("emotion", config.emotion || "normal");
            if (config.noise_scale !== undefined) formData.append("noise_scale", String(config.noise_scale));
            if (config.mix_voice_id) formData.append("mix_voice_id", config.mix_voice_id);
            if (config.mix_ratio !== undefined) formData.append("mix_ratio", String(config.mix_ratio));

            const res = await api.post("/tools/tts/generate", formData);
            if (res.data?.url) {
                if (audioRef.current) {
                    audioRef.current.pause();
                }
                const audio = new Audio(res.data.url);
                audioRef.current = audio;
                audio.ontimeupdate = () => {
                    if (audio.duration) {
                        setPreviewProgress((audio.currentTime / audio.duration) * 100);
                    }
                };
                audio.onended = () => {
                    setIsPlayingPreview(false);
                    setPreviewProgress(0);
                };
                audio.onerror = () => {
                    setIsPlayingPreview(false);
                    setPreviewProgress(0);
                    toast.error("오디오 재생에 실패했습니다.");
                };
                await audio.play();
                setIsPlayingPreview(true);
            }
        } catch (err: any) {
            console.error("Preview voice failed:", err);
            toast.error("목소리 미리듣기 생성 실패: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsPreviewLoading(false);
        }
    };

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
                                <span className="text-slate-600 text-[10px]">(무료/자연스러움)</span>
                            </SelectItem>
                            <SelectItem value="google" className="text-xs">
                                <span className="font-semibold text-green-600 mr-1">Google</span>
                                <span className="text-slate-600 text-[10px]">(무료/기본)</span>
                            </SelectItem>
                            <SelectItem value="kokoro" className="text-xs">Kokoro (로컬)</SelectItem>
                            <SelectItem value="supertone-local" className="text-xs">Supertonic (로컬)</SelectItem>
                            <SelectItem value="elevenlabs" className="text-xs">ElevenLabs (유료)</SelectItem>
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
                        <SelectContent className="max-h-[300px]">
                            {config.engine === 'supertone-local' ? (
                                <>
                                    <SelectItem value="ko" className="text-xs">🇰🇷 한국어 (Korean)</SelectItem>
                                    <SelectItem value="en" className="text-xs">🇺🇸 영어 (English)</SelectItem>
                                    <SelectItem value="ja" className="text-xs">🇯🇵 일본어 (Japanese)</SelectItem>
                                    <SelectItem value="ar" className="text-xs">🇸🇦 아랍어 (Arabic)</SelectItem>
                                    <SelectItem value="bg" className="text-xs">🇧🇬 불가리아어 (Bulgarian)</SelectItem>
                                    <SelectItem value="cs" className="text-xs">🇨🇿 체코어 (Czech)</SelectItem>
                                    <SelectItem value="da" className="text-xs">🇩🇰 덴마크어 (Danish)</SelectItem>
                                    <SelectItem value="de" className="text-xs">🇩🇪 독일어 (German)</SelectItem>
                                    <SelectItem value="el" className="text-xs">🇬🇷 그리스어 (Greek)</SelectItem>
                                    <SelectItem value="es" className="text-xs">🇪🇸 스페인어 (Spanish)</SelectItem>
                                    <SelectItem value="et" className="text-xs">🇪🇪 에스토니아어 (Estonian)</SelectItem>
                                    <SelectItem value="fi" className="text-xs">🇫🇮 핀란드어 (Finnish)</SelectItem>
                                    <SelectItem value="fr" className="text-xs">🇫🇷 프랑스어 (French)</SelectItem>
                                    <SelectItem value="hi" className="text-xs">🇮🇳 힌디어 (Hindi)</SelectItem>
                                    <SelectItem value="hr" className="text-xs">🇭🇷 크로아티아어 (Croatian)</SelectItem>
                                    <SelectItem value="hu" className="text-xs">🇭🇺 헝가리어 (Hungarian)</SelectItem>
                                    <SelectItem value="id" className="text-xs">🇮🇩 인도네시아어 (Indonesian)</SelectItem>
                                    <SelectItem value="it" className="text-xs">🇮🇹 이탈리아어 (Italian)</SelectItem>
                                    <SelectItem value="lt" className="text-xs">🇱🇹 리투아니아어 (Lithuanian)</SelectItem>
                                    <SelectItem value="lv" className="text-xs">🇱🇻 라트비아어 (Latvian)</SelectItem>
                                    <SelectItem value="nl" className="text-xs">🇳🇱 네덜란드어 (Dutch)</SelectItem>
                                    <SelectItem value="pl" className="text-xs">🇵🇱 폴란드어 (Polish)</SelectItem>
                                    <SelectItem value="pt" className="text-xs">🇵🇹 포르투갈어 (Portuguese)</SelectItem>
                                    <SelectItem value="ro" className="text-xs">🇷🇴 루마니아어 (Romanian)</SelectItem>
                                    <SelectItem value="ru" className="text-xs">🇷🇺 러시아어 (Russian)</SelectItem>
                                    <SelectItem value="sk" className="text-xs">🇸🇰 슬로바키아어 (Slovak)</SelectItem>
                                    <SelectItem value="sl" className="text-xs">🇸🇮 슬로베니아어 (Slovenian)</SelectItem>
                                    <SelectItem value="sv" className="text-xs">🇸🇪 스웨덴어 (Swedish)</SelectItem>
                                    <SelectItem value="tr" className="text-xs">🇹🇷 터키어 (Turkish)</SelectItem>
                                    <SelectItem value="uk" className="text-xs">🇺🇦 우크라이나어 (Ukrainian)</SelectItem>
                                    <SelectItem value="vi" className="text-xs">🇻🇳 베트남어 (Vietnamese)</SelectItem>
                                </>
                            ) : (
                                <>
                                    <SelectItem value="ko" className="text-xs">🇰🇷 한국어</SelectItem>
                                    <SelectItem value="en" className="text-xs">🇺🇸 영어</SelectItem>
                                    <SelectItem value="ja" className="text-xs">🇯🇵 일본어</SelectItem>
                                    <SelectItem value="zh" className="text-xs">🇨🇳 중국어</SelectItem>
                                    <SelectItem value="es" className="text-xs">🇪🇸 스페인어</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Recommended Presets (Grid Layout) */}
            {(config.engine === 'google' || config.engine === 'edge') && (
                <div className="space-y-1.5 pt-1">
                    <Label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> Quick Style</span>
                        <span className="text-[8px] font-normal normal-case text-slate-700">Gender + Style + Speed</span>
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

                {/* 선택한 목소리 및 합성 믹스 실시간 미리듣기 / 커스텀 대사 오디션 바 */}
                <div className="pt-1.5 space-y-2 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 p-2.5 rounded-xl border border-blue-200/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Volume2 className="w-4 h-4 text-blue-600" />
                            <span>실시간 목소리 오디션 (Voice Audition)</span>
                            {config.mix_voice_id && (config.mix_ratio ?? 0) > 0 && (
                                <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                    합성 믹스 모드 ({Math.round((1 - (config.mix_ratio ?? 0)) * 100)}% + {Math.round((config.mix_ratio ?? 0) * 100)}%)
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCustomAudition(prev => !prev)}
                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                            {showCustomAudition ? "기본 예문으로" : "직접 대사 입력"}
                        </button>
                    </div>

                    {/* 커스텀 대사 입력창 (옵션) */}
                    {showCustomAudition ? (
                        <div className="space-y-1">
                            <input
                                type="text"
                                value={customAuditionText}
                                onChange={(e) => setCustomAuditionText(e.target.value)}
                                placeholder="들어보고 싶은 테스트 문장을 입력하세요..."
                                className="w-full h-7 text-xs px-2 rounded-md bg-white border border-blue-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                onKeyDown={(e) => e.key === 'Enter' && handlePreviewVoice()}
                            />
                            <div className="flex gap-1 overflow-x-auto pb-0.5">
                                {[
                                    { label: "쇼츠/바이럴", text: "절대 놓치면 안 되는 충격적인 반전, 지금 바로 확인해보세요!" },
                                    { label: "뉴스/정보", text: "오늘의 주요 뉴스를 전해드립니다. 시장이 큰 폭으로 상승했습니다." },
                                    { label: "다큐/몰입", text: "어둠이 짙게 깔린 밤, 아무도 예상하지 못한 진실이 서서히 드러납니다." },
                                ].map((p, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setCustomAuditionText(p.text);
                                            handlePreviewVoice(p.text);
                                        }}
                                        className="text-[9px] whitespace-nowrap bg-white/90 hover:bg-blue-100 text-slate-700 hover:text-blue-700 px-1.5 py-0.5 rounded border border-blue-200"
                                    >
                                        ⚡ {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-[10px] text-slate-600 line-clamp-1 bg-white/60 px-2 py-1 rounded border border-blue-100">
                            예문: "안녕하세요! 선택하신 목소리 샘플입니다. 자연스럽게 들리시나요?"
                        </div>
                    )}

                    {/* 실시간 미리듣기 실행 버튼 & 프로그레스 바 */}
                    <div className="space-y-1">
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            disabled={isPreviewLoading || !config.voice_id}
                            onClick={() => handlePreviewVoice()}
                            className={cn(
                                "w-full h-8 text-xs font-bold gap-2 transition-all shadow-md rounded-lg",
                                isPlayingPreview
                                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                            )}
                        >
                            {isPreviewLoading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>{config.mix_voice_id ? "합성 믹스 음성 생성 중..." : "목소리 샘플 생성 중..."}</span>
                                </>
                            ) : isPlayingPreview ? (
                                <>
                                    <Square className="w-3.5 h-3.5 fill-current" />
                                    <span>미리듣기 정지 (소리 재생 중...)</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>
                                        {config.mix_voice_id && (config.mix_ratio ?? 0) > 0
                                            ? `🎙️ 합성 믹스 목소리 들어보기 (${Math.round((1 - (config.mix_ratio ?? 0)) * 100)}% + ${Math.round((config.mix_ratio ?? 0) * 100)}%)`
                                            : "🔊 선택한 목소리 들어보기 (미리듣기)"}
                                    </span>
                                </>
                            )}
                        </Button>

                        {/* 재생 중 실시간 프로그레스 바 */}
                        {isPlayingPreview && (
                            <div className="w-full bg-blue-200/80 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-100"
                                    style={{ width: `${previewProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sliders (Engine Specific) */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-2.5 space-y-3 shadow-inner">
                {/* Standard Pitch/Speed for Google/Edge/Others */}
                {(!['elevenlabs', 'typecast', 'supertone-local'].includes(config.engine)) && (
                    <>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-bold text-slate-600">Speed (속도)</Label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => { const next = Math.max(0.5, +(speed - 0.05).toFixed(2)); setSpeed(next); handleSliderCommit('speed', next); }}
                                        className="h-4 w-4 bg-white border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-700 hover:bg-slate-100"
                                    >−</button>
                                    <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded", speed !== 1.0 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700")}>
                                        x{speed.toFixed(2)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { const next = Math.min(2.0, +(speed + 0.05).toFixed(2)); setSpeed(next); handleSliderCommit('speed', next); }}
                                        className="h-4 w-4 bg-white border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-700 hover:bg-slate-100"
                                    >+</button>
                                    {speed !== 1.0 && (
                                        <button
                                            type="button"
                                            onClick={() => { setSpeed(1.0); handleSliderCommit('speed', 1.0); }}
                                            className="text-[9px] text-slate-500 hover:text-blue-600 underline ml-0.5"
                                        >기본</button>
                                    )}
                                </div>
                            </div>
                            <Slider
                                value={[speed]} min={0.5} max={2.0} step={0.05}
                                onValueChange={(v) => setSpeed(v[0])}
                                onValueCommit={(v) => handleSliderCommit('speed', v[0])}
                                className="py-1"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-bold text-slate-600">Pitch (음높이)</Label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => { const next = Math.max(-20, pitch - 1); setPitch(next); handleSliderCommit('pitch', next); }}
                                        className="h-4 w-4 bg-white border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-700 hover:bg-slate-100"
                                    >−</button>
                                    <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded", pitch !== 0 ? "bg-purple-100 text-purple-800" : "bg-slate-200 text-slate-700")}>
                                        {pitch > 0 ? `+${pitch}st` : `${pitch}st`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { const next = Math.min(20, pitch + 1); setPitch(next); handleSliderCommit('pitch', next); }}
                                        className="h-4 w-4 bg-white border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-700 hover:bg-slate-100"
                                    >+</button>
                                    {pitch !== 0 && (
                                        <button
                                            type="button"
                                            onClick={() => { setPitch(0); handleSliderCommit('pitch', 0); }}
                                            className="text-[9px] text-slate-500 hover:text-blue-600 underline ml-0.5"
                                        >기본</button>
                                    )}
                                </div>
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

                {/* Supertonic Local Config Section */}
                {config.engine === 'supertone-local' && (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-bold text-slate-600">Speed (속도 미세조절)</Label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => { const next = Math.max(0.5, +(speed - 0.05).toFixed(2)); setSpeed(next); handleSliderCommit('speed', next); }}
                                        className="h-4 w-4 bg-white border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-700 hover:bg-slate-100"
                                    >−</button>
                                    <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded", speed !== 1.0 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700")}>
                                        x{speed.toFixed(2)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { const next = Math.min(2.0, +(speed + 0.05).toFixed(2)); setSpeed(next); handleSliderCommit('speed', next); }}
                                        className="h-4 w-4 bg-white border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-700 hover:bg-slate-100"
                                    >+</button>
                                    {speed !== 1.0 && (
                                        <button
                                            type="button"
                                            onClick={() => { setSpeed(1.0); handleSliderCommit('speed', 1.0); }}
                                            className="text-[9px] text-slate-500 hover:text-blue-600 underline ml-0.5"
                                        >1.0x</button>
                                    )}
                                </div>
                            </div>
                            <Slider
                                value={[speed]} min={0.5} max={2.0} step={0.05}
                                onValueChange={(v) => setSpeed(v[0])}
                                onValueCommit={(v) => handleSliderCommit('speed', v[0])}
                                className="py-1"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-700">🎭 감정 & 스타일 (Emotion Engine)</Label>
                            <div className="grid grid-cols-4 gap-1">
                                {[
                                    { id: 'normal', label: '기본 😐' },
                                    { id: 'happy', label: '기쁨 😄' },
                                    { id: 'sad', label: '슬픔 😢' },
                                    { id: 'angry', label: '분노 😡' }
                                ].map(e => (
                                    <Button
                                        key={e.id}
                                        variant={config.emotion === e.id ? "default" : "outline"}
                                        size="sm"
                                        className={cn("h-6.5 text-[10px] px-0 font-bold", config.emotion === e.id ? "bg-sky-600 hover:bg-sky-700 text-white shadow-sm" : "bg-white text-slate-700")}
                                        onClick={() => {
                                            handleChange('emotion', e.id);
                                            handleChange('noise_scale', 0.0);
                                        }}
                                    >
                                        {e.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-bold text-slate-600">감정 강도 (Noise Scale 미세조절)</Label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => { const next = Math.max(0.0, +((config.noise_scale ?? 0.0) - 0.05).toFixed(2)); handleChange('noise_scale', next); }}
                                        className="h-4 w-4 bg-white border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-700 hover:bg-slate-100"
                                    >−</button>
                                    <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                        {(config.noise_scale ?? 0.0).toFixed(2)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { const next = Math.min(2.0, +((config.noise_scale ?? 0.0) + 0.05).toFixed(2)); handleChange('noise_scale', next); }}
                                        className="h-4 w-4 bg-white border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-700 hover:bg-slate-100"
                                    >+</button>
                                </div>
                            </div>
                            <Slider
                                value={[config.noise_scale ?? 0.0]} min={0.0} max={2.0} step={0.05}
                                onValueChange={(v) => handleChange('noise_scale', v[0])}
                                className="py-1"
                            />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200/80 bg-white/70 p-2 rounded-lg border">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-extrabold text-indigo-900 flex items-center gap-1">
                                    🎙️ 목소리 믹스 합성 (Voice Blending)
                                </Label>
                                {config.mix_voice_id && (
                                    <button
                                        type="button"
                                        onClick={() => { handleChange('mix_voice_id', ''); handleChange('mix_ratio', 0.0); }}
                                        className="text-[9px] text-red-500 hover:text-red-700 underline"
                                    >
                                        믹스 해제
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-medium text-slate-600">대상 합성 목소리</Label>
                                    <Select 
                                        value={config.mix_voice_id || "none"} 
                                        onValueChange={(v) => {
                                            handleChange('mix_voice_id', v === "none" ? "" : v);
                                            if (v !== "none" && (!config.mix_ratio || config.mix_ratio === 0)) {
                                                handleChange('mix_ratio', 0.35); // 기본 35% 권장 믹스비
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-7 text-[10px] bg-white border-slate-300">
                                            <SelectValue placeholder="믹스 안함" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[160px]">
                                            <SelectItem value="none" className="text-[10px]">믹스 안함 (단독 목소리)</SelectItem>
                                            {voices?.filter(v => v.id !== config.voice_id).map((v) => (
                                                <SelectItem key={v.id} value={v.id} className="text-[10px]">
                                                    {getFriendlyVoiceName(v)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[9px] text-slate-600 font-bold">
                                        <span>믹스 비율</span>
                                        <span className="text-indigo-600 font-mono">{Math.round((config.mix_ratio ?? 0.0) * 100)}%</span>
                                    </div>
                                    <Slider
                                        value={[config.mix_ratio ?? 0.0]} min={0.0} max={1.0} step={0.01}
                                        onValueChange={(v) => handleChange('mix_ratio', v[0])}
                                        disabled={!config.mix_voice_id}
                                        className="py-1"
                                    />
                                </div>
                            </div>

                            {/* 믹스 비율 퀵 프리셋 버튼 */}
                            {config.mix_voice_id && (
                                <div className="flex items-center justify-between pt-1 text-[9px]">
                                    <span className="text-slate-500">퀵 믹스비:</span>
                                    <div className="flex gap-1">
                                        {[
                                            { label: "은은하게 20%", val: 0.20 },
                                            { label: "조화 35%", val: 0.35 },
                                            { label: "반반 50%", val: 0.50 },
                                            { label: "강하게 70%", val: 0.70 },
                                        ].map(b => (
                                            <button
                                                key={b.val}
                                                type="button"
                                                onClick={() => handleChange('mix_ratio', b.val)}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded border text-[8.5px] font-bold transition-all",
                                                    Math.abs((config.mix_ratio ?? 0) - b.val) < 0.02
                                                        ? "bg-indigo-600 text-white border-indigo-700"
                                                        : "bg-white text-slate-700 border-slate-300 hover:bg-indigo-50"
                                                )}
                                            >
                                                {b.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ... (Keep other engine sliders same but compact) ... */}
                {config.engine === 'typecast' ? (
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-600">Typecast Emotion</Label>
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
                ) : config.engine === 'elevenlabs' && (
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-600">ElevenLabs Settings</Label>
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
