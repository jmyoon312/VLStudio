import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiLong } from '@/lib/api';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
    Loader2, ImageIcon, Music, Film, Upload, Download, Clapperboard, Plus, Trash2,
    Sparkles, Copy, ChevronDown, ChevronUp, RefreshCw, Save, Wand2, RotateCcw, Play,
    MonitorPlay, Smartphone, Eye, EyeOff, Mic, DollarSign, Globe, SlidersHorizontal,
    List, Search, Grid3X3, LayoutGrid, FolderOpen, Type, Sparkle
} from "lucide-react";
import { cn } from '@/lib/utils';
import TTSSettingsDialog from '@/components/TTSSettingsDialog';
import MotionSettingsDialog from '@/components/MotionSettingsDialog';
import SubtitleSettingsDialog, { SubtitleConfig } from '@/components/SubtitleSettingsDialog';
import AudioSettingsDialog, { AudioConfig } from '@/components/AudioSettingsDialog';
import { v4 as uuidv4 } from 'uuid';
import AIModelSelector from '@/components/shared/AIModelSelector';
import { StyleGalleryModal } from '@/components/shared/StyleGalleryModal';
import { ExportModal } from '../features/flow2capcut/components/ExportModal';
import { generateCapcutProject } from '../features/flow2capcut/exporters/capcutLocalGenerator';
import { generateSRT } from '../features/flow2capcut/exporters/capcut';
import { WatermarkSettingsDialog, WatermarkConfig } from '../features/creativeStudio/components/WatermarkSettingsDialog';
import { TransitionSettingsDialog, TransitionConfig } from '../features/creativeStudio/components/TransitionSettingsDialog';
import { CollapsibleTimelinePreview } from '../features/creativeStudio/components/CollapsibleTimelinePreview';
import { ProjectManagerDialog } from '../features/creativeStudio/components/ProjectManagerDialog';
import { flowQueue, QueueState } from '../features/flow2capcut/services/flowQueueManager';

interface SceneSegment {
    id: string; // Unique ID for frontend tracking
    scene_id: number; // Display number (1-based index)
    script: string;
    visual_prompt: string;
    video_prompt?: string; // [NEW] Prompt strictly for video motion
    is_continuous_motion?: boolean; // [NEW] Flag to use previous scene's last frame
    media_url?: string; // Source Image URL
    media_path?: string; // Absolute path on server (Image)
    task_id?: string;
    status?: 'idle' | 'generating' | 'completed' | 'failed';
    progress?: number;
    audio_url?: string;
    audio_path?: string; // Absolute path on server (Audio)
    video_url?: string; // Rendered Video URL
    video_path?: string; // Absolute path on server (Video)

    // Decoupled Statuses
    audioStatus?: 'idle' | 'generating' | 'completed' | 'failed';
    visualStatus?: 'idle' | 'generating' | 'completed' | 'failed';
    renderStatus?: 'idle' | 'generating' | 'completed' | 'failed';

    // View State
    viewMode?: 'source' | 'render'; // Controls which media is shown

    // Flow AI Integration
    mediaId?: string; // Flow media reference ID for I2V generation

    // Manual Asset Override
    is_manual_asset?: boolean;
    frozen_effect?: string; // static, zoom, pan_left, pan_right
    asset_score?: number;
}

interface ScriptStyle {
    id: number;
    name: string;
    system_instruction: string;
    sample_text?: string;
}

const DEFAULT_MODEL_OPTIONS = {
    // Legacy: Kept for reference if needed, but AIModelSelector uses its own.
};

const CreativeStudio = () => {
    const [selectedPresetId, setSelectedPresetId] = useState<string>(() => localStorage.getItem('vlstudio_selected_style_preset_id') || "");
    const [presetName, setPresetName] = useState("");
    const [stylePrompt, setStylePrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const queryClient = useQueryClient();

    // Fetch Presets
    const { data: presets } = useQuery({
        queryKey: ['stylePresets'],
        queryFn: async () => (await api.get('/creative/styles')).data
    });

    // 프리셋 목록이 로드되었을 때 이전에 선택한 프리셋을 자동 복원 및 유지
    useEffect(() => {
        if (!presets || presets.length === 0) return;
        const savedId = localStorage.getItem('vlstudio_selected_style_preset_id') || selectedPresetId;
        if (savedId && savedId !== 'new') {
            const found = presets.find((p: any) => String(p.id) === String(savedId));
            if (found) {
                setSelectedPresetId(String(found.id));
                setPresetName(found.name);
                setStylePrompt(found.positive_prompt);
                setNegativePrompt(found.negative_prompt || "");
                return;
            }
        }
        // 저장된 것이 없거나 못 찾은 경우 첫 번째 프리셋 기본 활성화
        if (presets[0]) {
            const first = presets[0];
            setSelectedPresetId(String(first.id));
            localStorage.setItem('vlstudio_selected_style_preset_id', String(first.id));
            setPresetName(first.name);
            setStylePrompt(first.positive_prompt);
            setNegativePrompt(first.negative_prompt || "");
        }
    }, [presets]);

    // [SOVEREIGN TRUTH] 작업 환경 설정(Settings) 실시간 동적 연동 (Single Source of Truth)
    const { data: userSettings } = useQuery({
        queryKey: ['workspaceSettings'],
        queryFn: async () => (await api.get('/settings/')).data
    });

    // 작업 환경 설정값이 로드/변경되면 기본 모델을 자동으로 동기화 (하드코딩 배제)
    useEffect(() => {
        if (userSettings) {
            const dynamicProvider = userSettings.script_analysis_provider || userSettings.default_llm_provider || userSettings.paperclip_provider || '';
            const dynamicModel = userSettings.script_analysis_model || userSettings.default_llm_model || userSettings.paperclip_model || '';
            if (dynamicProvider) setScriptProvider(dynamicProvider);
            if (dynamicModel) setScriptModel(dynamicModel);
        }
    }, [userSettings]);

    // Mutations
    const createPresetMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/creative/styles', data)).data,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['stylePresets'] });
            setSelectedPresetId(String(data.id));
            localStorage.setItem('vlstudio_selected_style_preset_id', String(data.id));
            toast.success("스타일 프리셋 저장 완료!");
        }
    });

    const updatePresetMutation = useMutation({
        mutationFn: async (data: any) => (await api.put(`/creative/styles/${selectedPresetId}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stylePresets'] });
            if (selectedPresetId && selectedPresetId !== 'new') {
                localStorage.setItem('vlstudio_selected_style_preset_id', String(selectedPresetId));
            }
            toast.success("스타일 프리셋 수정 완료!");
        }
    });

    const deletePresetMutation = useMutation({
        mutationFn: async (id: number) => (await api.delete(`/creative/styles/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stylePresets'] });
            localStorage.removeItem('vlstudio_selected_style_preset_id');
            handleNewPreset();
            toast.success("스타일 프리셋 삭제 완료!");
        }
    });

    // Handlers
    const handleSelectPreset = (val: string) => {
        if (val === "new") {
            handleNewPreset();
            return;
        }
        const preset = presets?.find((p: any) => String(p.id) === val);
        if (preset) {
            setSelectedPresetId(String(preset.id));
            localStorage.setItem('vlstudio_selected_style_preset_id', String(preset.id));
            setPresetName(preset.name);
            setStylePrompt(preset.positive_prompt);
            setNegativePrompt(preset.negative_prompt || "");
        }
    };

    const handleNewPreset = () => {
        setSelectedPresetId("new");
        localStorage.removeItem('vlstudio_selected_style_preset_id');
        setPresetName("");
        setStylePrompt("");
        setNegativePrompt("");
    };

    const handleSavePreset = () => {
        const payload = {
            name: presetName,
            positive_prompt: stylePrompt,
            negative_prompt: negativePrompt
        };

        if (selectedPresetId && selectedPresetId !== "new") {
            updatePresetMutation.mutate(payload);
        } else {
            createPresetMutation.mutate(payload);
        }
    };

    const handleDeletePreset = (id: number) => {
        if (confirm("정말 이 프리셋을 삭제하시겠습니까?")) {
            deletePresetMutation.mutate(id);
        }
    };

    // Style Analysis
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const analyzeStyleMutation = useMutation({
        mutationFn: async (data: { file: File, provider: string, model: string }) => {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('provider', data.provider);
            formData.append('model', data.model);

            const res = await api.post('/creative/analyze-style', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data;
        },
        onSuccess: (data) => {
            setStylePrompt(data.style_prompt);
            setNegativePrompt(data.negative_prompt);
            toast.success("스타일 분석 완료!");
        },
        onError: (err) => {
            toast.error("스타일 분석 실패: " + err);
        }
    });

    const handleAnalyzeStyle = (file: File) => {
        setIsAnalyzing(true);
        analyzeStyleMutation.mutate({
            file,
            provider: scriptProvider,
            model: scriptModel
        }, {
            onSettled: () => setIsAnalyzing(false)
        });
    };

    // State: Script Workspace (DB Settings 기반 동적 연동)
    const [scriptMode, setScriptMode] = useState("manual"); // Default to Manual
    const [fullScript, setFullScript] = useState(() => {
        return localStorage.getItem('viral_loop_creative_full_script') || "";
    });
    const [scriptProvider, setScriptProvider] = useState<string>("");
    const [scriptModel, setScriptModel] = useState<string>("");

    // Flow Multi-Window & Headless Queue States
    const [flowViews, setFlowViews] = useState<string[]>([]);
    const [currentFlowProfile, setCurrentFlowProfile] = useState<string>('default');
    const [queueState, setQueueState] = useState<QueueState>(flowQueue.getState());

    useEffect(() => {
        const unsubscribe = flowQueue.subscribe((state) => {
            setQueueState(state);
        });
        return unsubscribe;
    }, []);

    const syncFlowWindowState = async () => {
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.getActiveViews) {
                const res = await apiObj.getActiveViews();
                if (res?.views) setFlowViews(res.views);
                if (res?.activeProfileId) setCurrentFlowProfile(res.activeProfileId);
            }
        } catch (e) {
            // silent catch
        }
    };

    useEffect(() => {
        syncFlowWindowState();
    }, []);

    const handleSwitchFlowProfile = async (profId: string) => {
        const apiObj = (window as any).electronAPI;
        if (!apiObj) return;
        try {
            await apiObj.createFlowView?.({ profileId: profId });
            await apiObj.switchProfile?.({ profileId: profId });
            await apiObj.focusFlowView?.({ profileId: profId });
            setCurrentFlowProfile(profId);
            syncFlowWindowState();
            toast.success(`Google Flow [${profId === 'default' ? '1번창' : profId.replace('profile', '') + '번창'}] 활성화 완료!`);
        } catch (e: any) {
            toast.error("다중창 전환 실패: " + e.message);
        }
    };

    // State: Script Styles
    const [scriptStyles, setScriptStyles] = useState<ScriptStyle[]>([]);
    const [selectedStyleId, setSelectedStyleId] = useState<string>("");
    const [scriptInput, setScriptInput] = useState(() => {
        return localStorage.getItem('viral_loop_creative_script_input') || "";
    });
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [useWebSearchCreative, setUseWebSearchCreative] = useState<boolean>(true);

    // Auto-save script drafts to localStorage
    useEffect(() => {
        localStorage.setItem('viral_loop_creative_full_script', fullScript);
    }, [fullScript]);

    useEffect(() => {
        localStorage.setItem('viral_loop_creative_script_input', scriptInput);
    }, [scriptInput]);

    // Style Management Dialog
    const [isStyleDialogOpen, setIsStyleDialogOpen] = useState(false);
    const [editingStyle, setEditingStyle] = useState<Partial<ScriptStyle>>({ name: "", system_instruction: "", sample_text: "" });

    // Fetch Script Styles
    const { data: fetchedScriptStyles, refetch: refetchScriptStyles } = useQuery({
        queryKey: ['scriptStyles'],
        queryFn: async () => {
            const res = await api.get('/creative/script-styles');
            return res.data;
        }
    });

    // Fetch Available Models


    useEffect(() => {
        if (fetchedScriptStyles) {
            setScriptStyles(fetchedScriptStyles);
        }
    }, [fetchedScriptStyles]);

    // Create/Update Style Mutation
    const saveStyleMutation = useMutation({
        mutationFn: async (style: Partial<ScriptStyle>) => {
            if (style.id) {
                const res = await api.put(`/creative/script-styles/${style.id}`, style);
                return res.data;
            } else {
                const res = await api.post('/creative/script-styles', style);
                return res.data;
            }
        },
        onSuccess: () => {
            toast.success("스타일 저장 완료");
            setIsStyleDialogOpen(false);
            refetchScriptStyles();
        },
        onError: (err: any) => toast.error("스타일 저장 실패: " + err)
    });

    // Delete Style Mutation
    const deleteStyleMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/creative/script-styles/${id}`);
        },
        onSuccess: () => {
            toast.success("스타일 삭제 완료");
            refetchScriptStyles();
            if (selectedStyleId) setSelectedStyleId("");
        },
        onError: (err: any) => toast.error("스타일 삭제 실패: " + err)
    });

    const generateScriptMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/creative/generate-script', {
                input_text: scriptInput,
                style_id: selectedStyleId ? Number(selectedStyleId) : null,
                model_name: scriptModel,
                config: { use_web_search: useWebSearchCreative }
            });
            return res.data;
        },
        onSuccess: (data) => {
            setFullScript(data.script);
            toast.success("대본 생성 완료!");
        },
        onError: (err: any) => toast.error("대본 생성 실패: " + err)
    });

    const handleSaveStyle = () => {
        if (!editingStyle.name || !editingStyle.system_instruction) {
            toast.error("이름과 지침을 입력해주세요.");
            return;
        }
        saveStyleMutation.mutate(editingStyle);
    };

    const handleEditStyle = () => {
        if (!selectedStyleId) return;
        const style = scriptStyles.find(s => s.id === Number(selectedStyleId));
        if (style) {
            setEditingStyle(style);
            setIsStyleDialogOpen(true);
        }
    };

    const handleCreateStyle = () => {
        setEditingStyle({ name: "", system_instruction: "", sample_text: "" });
        setIsStyleDialogOpen(true);
    };

    const handleGenerateScript = () => {
        if (!scriptInput) {
            toast.error("입력 내용을 작성해주세요.");
            return;
        }
        setIsGeneratingScript(true);
        generateScriptMutation.mutate(undefined, {
            onSettled: () => setIsGeneratingScript(false)
        });
    };



    // State: Scene Board
    const [scenes, setScenes] = useState<SceneSegment[]>(() => {
        try {
            const saved = localStorage.getItem('viral_loop_creative_scenes');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed.map((s: SceneSegment) => ({
                        ...s,
                        visualStatus: s.visualStatus === 'generating' 
                            ? (s.media_url || s.video_url ? 'completed' : 'idle') 
                            : (s.visualStatus || 'idle'),
                        audioStatus: s.audioStatus === 'generating' 
                            ? (s.audio_url ? 'completed' : 'idle') 
                            : (s.audioStatus || 'idle'),
                        renderStatus: s.renderStatus === 'generating' ? 'idle' : (s.renderStatus || 'idle')
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to load saved creative scenes:", e);
        }
        return [];
    });
    const [isSegmenting, setIsSegmenting] = useState(false);
    const [splitMethod, setSplitMethod] = useState("ai_smart");
    const [segmentMode, setSegmentMode] = useState(() => {
        return localStorage.getItem('viral_loop_segment_mode') || 'shorts';
    });

    useEffect(() => {
        localStorage.setItem('viral_loop_segment_mode', segmentMode);
    }, [segmentMode]);

    // Auto-save creative scene board to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('viral_loop_creative_scenes', JSON.stringify(scenes));
        } catch (e) {
            console.error("Failed to save creative scenes:", e);
        }
    }, [scenes]);

    // Self-healing: Reset any orphaned 'generating' states on window focus or visibility change
    useEffect(() => {
        const handleFocusOrVisible = () => {
            setScenes(prev => {
                let hasStale = false;
                const cleaned = prev.map(s => {
                    if (s.visualStatus === 'generating') {
                        hasStale = true;
                        return { ...s, visualStatus: s.media_url || s.video_url ? 'completed' : 'idle' };
                    }
                    if (s.audioStatus === 'generating') {
                        hasStale = true;
                        return { ...s, audioStatus: s.audio_url ? 'completed' : 'idle' };
                    }
                    if (s.renderStatus === 'generating') {
                        hasStale = true;
                        return { ...s, renderStatus: 'idle' };
                    }
                    return s;
                });
                return hasStale ? cleaned : prev;
            });
        };

        window.addEventListener('focus', handleFocusOrVisible);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') handleFocusOrVisible();
        });
        return () => {
            window.removeEventListener('focus', handleFocusOrVisible);
        };
    }, []);

    // Auto-update aspect ratio in existing prompts when segmentMode changes
    useEffect(() => {
        setScenes(prev => prev.map(scene => {
            if (!scene.visual_prompt) return scene;
            const targetPrefix = segmentMode === 'shorts' ? '9:16' : '16:9';
            const oldPrefix = segmentMode === 'shorts' ? '16:9' : '9:16';
            
            if (scene.visual_prompt.startsWith(oldPrefix)) {
                return {
                    ...scene,
                    visual_prompt: scene.visual_prompt.replace(oldPrefix, targetPrefix)
                };
            }
            return scene;
        }));
    }, [segmentMode]);

    // State: Project Folder Name (05_Exports 하위 임의 규칙 자동 생성 및 관리)
    const [currentProjectName, setCurrentProjectName] = useState<string>(() => {
        const saved = localStorage.getItem('creative_current_project_name');
        if (saved) return saved;
        return 'project_01';
    });

    // 마운트 시 기획 & 리서치 랩(ResearchConceptLab)으로부터 넘어온 대본/기획 자동 로드
    useEffect(() => {
        const initialScript = sessionStorage.getItem('creative_studio_initial_script');
        const initialTitle = sessionStorage.getItem('creative_studio_initial_title');
        if (initialScript) {
            setFullScript(initialScript);
            sessionStorage.removeItem('creative_studio_initial_script');
            toast.success('기획 & 리서치 랩에서 대본을 성공적으로 불러왔습니다!');
        }
        if (initialTitle) {
            const sanitized = initialTitle.replace(/[^a-zA-Z0-9가-힣_]/g, '_').slice(0, 20);
            const newProjName = `project_${sanitized || '01'}`;
            setCurrentProjectName(newProjName);
            localStorage.setItem('creative_current_project_name', newProjName);
            sessionStorage.removeItem('creative_studio_initial_title');
        }
    }, []);

    // State: TTS Config
    const [isTTSDialogOpen, setIsTTSDialogOpen] = useState(false);
    const [ttsConfig, setTTSConfig] = useState<any>(() => {
        const defaults = {
            engine: "supertone-local",
            language: "ko",
            voice_id: "M1",
            speed: 1.0,
            pitch: 0,
            emotion: "normal"
        };
        const saved = localStorage.getItem('viral_loop_tts_config');
        if (saved) {
            try { return { ...defaults, ...JSON.parse(saved) }; } catch (e) { console.error(e); }
        }
        return defaults;
    });
    const ttsConfigRef = useRef(ttsConfig);

    useEffect(() => {
        ttsConfigRef.current = ttsConfig;
        if (ttsConfig) {
            localStorage.setItem('viral_loop_tts_config', JSON.stringify(ttsConfig));
        }
    }, [ttsConfig]);

    const [isMotionDialogOpen, setIsMotionDialogOpen] = useState(false);
    const [motionConfig, setMotionConfig] = useState<any>(() => {
        const defaults = {
            enable: true,
            direction: 'random',
            speed: 1.0,
            shake: false
        };
        const saved = localStorage.getItem('viral_loop_motion_config');
        if (saved) {
            try { return { ...defaults, ...JSON.parse(saved) }; } catch (e) { console.error(e); }
        }
        return defaults;
    });

    useEffect(() => {
        localStorage.setItem('viral_loop_motion_config', JSON.stringify(motionConfig));
    }, [motionConfig]);

    // State: Subtitle Config
    const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);
    const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>(() => {
        const defaults = {
            enabled: true,
            font: 'Wanted Sans',
            fontSize: 40,
            isBold: true,
            isItalic: false,
            textColor: '#FFFFFF',
            outlineSize: 2,
            outlineColor: '#000000',
            shadowSize: 2,
            shadowColor: '#000000',
            useBox: true,
            boxColor: '#000000',
            boxOpacity: 75,
            position: 'bottom' as const,
            marginV: 24,
            customX: 0,
            customY: 0,
            animation: 'none' as const,
            splitLimit: 20,
            maxLines: 2
        };
        const saved = localStorage.getItem('viral_loop_subtitle_config');
        if (saved) {
            try { 
                const parsed = JSON.parse(saved);
                if (parsed.textColor && (parsed.textColor.toLowerCase() === '#000000' || parsed.textColor.toLowerCase() === '#111111' || parsed.textColor.toLowerCase() === '#222222')) {
                    parsed.textColor = '#FFFFFF';
                }
                return { ...defaults, ...parsed }; 
            } catch (e) { console.error(e); }
        }
        return defaults;
    });

    const [srtEntries, setSrtEntries] = useState<any[]>([]);

    useEffect(() => {
        localStorage.setItem('viral_loop_subtitle_config', JSON.stringify(subtitleConfig));
    }, [subtitleConfig]);

    const [isAudioDialogOpen, setIsAudioDialogOpen] = useState(false);
    const [audioConfig, setAudioConfig] = useState<AudioConfig>(() => {
        const defaults = {
            keepOriginalAudio: true,
            originalVolume: 50,
        };
        const saved = localStorage.getItem('viral_loop_audio_config');
        if (saved) {
            try { return { ...defaults, ...JSON.parse(saved) }; } catch (e) { console.error(e); }
        }
        return defaults;
    });

    useEffect(() => {
        localStorage.setItem('viral_loop_audio_config', JSON.stringify(audioConfig));
    }, [audioConfig]);

    // State: Projects Management (05_Exports 다중 프로젝트 목록 및 전환)
    const { data: creativeProjects, refetch: refetchProjects } = useQuery({
        queryKey: ['creativeProjects'],
        queryFn: async () => {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.listProjects) {
                try {
                    const res = await apiObj.listProjects();
                    if (res?.success && Array.isArray(res.projects)) {
                        return res.projects;
                    }
                } catch (e) {
                    console.warn('[listProjects electron error]', e);
                }
            }
            try {
                const res = await api.get('/creative/projects');
                return res.data || [];
            } catch {
                return [];
            }
        }
    });

    const handleSwitchProject = async (targetProjName: string) => {
        if (!targetProjName || targetProjName === currentProjectName) return;
        try {
            toast.info(`프로젝트 '${targetProjName}' 로드 중...`);
            let data: any = null;
            const apiObj = (window as any).electronAPI;
            if (apiObj?.loadProjectData) {
                try {
                    const fsRes = await apiObj.loadProjectData({ project: targetProjName });
                    if (fsRes?.success && fsRes.data) {
                        data = fsRes.data;
                    }
                } catch (fsErr) {
                    console.warn('[loadProjectData error]', fsErr);
                }
            }
            if (!data) {
                const res = await api.get(`/creative/projects/${targetProjName}`);
                data = res.data;
            }

            if (data) {
                setCurrentProjectName(targetProjName);
                localStorage.setItem('creative_current_project_name', targetProjName);
                
                if (data.scenes && Array.isArray(data.scenes)) {
                    setScenes(data.scenes);
                    localStorage.setItem('viral_loop_creative_scenes', JSON.stringify(data.scenes));
                } else {
                    setScenes([]);
                    localStorage.setItem('viral_loop_creative_scenes', '[]');
                }
                
                if (typeof data.script === 'string') {
                    setFullScript(data.script);
                    localStorage.setItem('viral_loop_creative_full_script', data.script);
                }
                
                if (data.subtitle_config) {
                    setSubtitleConfig(data.subtitle_config);
                }
                
                toast.success(`프로젝트 '${targetProjName}' 로드 완료! (${data.scenes?.length || 0}개 씬)`);
                queryClient.invalidateQueries({ queryKey: ['creativeProjects'] });
            }
        } catch (err: any) {
            toast.error(`프로젝트 로드 실패: ${err.message || err}`);
        }
    };

    const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

    const handleCreateProjectModal = async (newProjName: string, initialScript?: string) => {
        try {
            await api.post('/creative/init-project', {
                project_name: newProjName,
                script: initialScript || "",
                scenes: []
            });
            setCurrentProjectName(newProjName);
            localStorage.setItem('creative_current_project_name', newProjName);
            setScenes([]);
            localStorage.setItem('viral_loop_creative_scenes', '[]');
            setFullScript(initialScript || "");
            localStorage.setItem('viral_loop_creative_full_script', initialScript || "");
            toast.success(`새 프로젝트 '${newProjName}'가 생성되었습니다!`);
            refetchProjects();
            queryClient.invalidateQueries({ queryKey: ['creativeProjects'] });
        } catch (e: any) {
            toast.error("새 프로젝트 생성 실패: " + e.message);
        }
    };

    // 현재 프로젝트의 씬 및 대본 상태를 05_Exports/<ProjectName>/project.json에 실시간 백그라운드 자동 동기화
    useEffect(() => {
        if (!currentProjectName) return;
        const timer = setTimeout(async () => {
            const payload = {
                project_name: currentProjectName,
                script: fullScript,
                scenes: scenes,
                subtitle_config: subtitleConfig,
                updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
            };
            try {
                const apiObj = (window as any).electronAPI;
                if (apiObj?.saveProjectData) {
                    await apiObj.saveProjectData({ project: currentProjectName, data: payload });
                }
            } catch (_) {}
            try {
                await api.post('/creative/save-project', payload);
            } catch (_) {}
        }, 1000);
        return () => clearTimeout(timer);
    }, [scenes, fullScript, currentProjectName, subtitleConfig]);

    // State: UI Toggles (기본적으로 접힌 상태 유지)
    const [isStyleCollapsed, setIsStyleCollapsed] = useState(true);
    const [isScriptCollapsed, setIsScriptCollapsed] = useState(true);
    const [isStyleGalleryOpen, setIsStyleGalleryOpen] = useState(false);

    // [NEW] Timeline & Watermark & Transition States
    const [isTimelineOpen, setIsTimelineOpen] = useState(true);
    const [isWatermarkDialogOpen, setIsWatermarkDialogOpen] = useState(false);
    const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
    const [isFlowBatchGenerating, setIsFlowBatchGenerating] = useState(false);
    const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({
        enabled: false,
        type: 'image',
        imageUrl: '',
        autoRemoveBg: false,
        badgeMask: 'none',
        colorKeying: 'none',
        text: '@ViralShorts',
        fontFamily: 'Pretendard',
        fontSize: 16,
        textColor: '#ffffff',
        textShadow: true,
        textStroke: false,
        position: 'top-right',
        scale: 15,
        opacity: 80,
        marginX: 20,
        marginY: 20,
        durationMode: 'full'
    });
    const [transitionConfig, setTransitionConfig] = useState<TransitionConfig>({
        mode: 'random',
        fixedType: 'dissolve',
        durationSec: 0.5,
        randomPool: ['dissolve', 'flash_white', 'zoom_in', 'whip_pan', 'glitch']
    });

    // ── 롱폼 대규모 씬보드 전용 스마트 관리 상태 ──
    const [sceneBoardViewMode, setSceneBoardViewMode] = useState<'card' | 'list' | 'grid'>('card');
    const [sceneSearchQuery, setSceneSearchQuery] = useState('');
    const [sceneFilterStatus, setSceneFilterStatus] = useState<'all' | 'uncompleted' | 'tts_done' | 'video_done'>('all');
    const [highlightedSceneId, setHighlightedSceneId] = useState<string | null>(null);
    const sceneScrollContainerRef = React.useRef<HTMLDivElement | null>(null);

    const handleScrollToScene = React.useCallback((sceneId: string) => {
        setHighlightedSceneId(sceneId);
        const el = document.getElementById(`scene-${sceneId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        setTimeout(() => setHighlightedSceneId(null), 2000);
    }, []);

    const filteredScenes = React.useMemo(() => {
        return scenes.filter(scene => {
            if (sceneSearchQuery.trim()) {
                const q = sceneSearchQuery.toLowerCase();
                const matchScript = (scene.script || '').toLowerCase().includes(q);
                const matchPrompt = (scene.visual_prompt || '').toLowerCase().includes(q) || (scene.video_prompt || '').toLowerCase().includes(q);
                const matchId = String(scene.scene_id).includes(q);
                if (!matchScript && !matchPrompt && !matchId) return false;
            }
            if (sceneFilterStatus === 'uncompleted') {
                const hasMedia = !!(scene.media_url || scene.video_url);
                const hasAudio = !!(scene.audio_url);
                if (hasMedia && hasAudio) return false;
            } else if (sceneFilterStatus === 'tts_done') {
                if (!scene.audio_url) return false;
            } else if (sceneFilterStatus === 'video_done') {
                if (!scene.video_url) return false;
            }
            return true;
        });
    }, [scenes, sceneSearchQuery, sceneFilterStatus]);

    // [ENHANCED] Flow AI 1:1 무결점 매칭 순차 큐 이미지 일괄 생성 (레이스 컨디션 및 씬 뒤섞임 원천 방지)
    const handleBatchFlowImages = async () => {
        const targetScenes = scenes.filter(s => s.visual_prompt);
        if (targetScenes.length === 0) {
            toast.error("생성할 씬이 없습니다. 대본을 먼저 분할해주세요.");
            return;
        }

        setIsFlowBatchGenerating(true);
        toast.info(`총 ${targetScenes.length}개 씬에 대해 Google Flow AI 1:1 정밀 이미지 생성을 시작합니다...`);

        let completedCount = 0;
        let successCount = 0;

        for (let i = 0; i < targetScenes.length; i++) {
            const scene = targetScenes[i];
            if (!scene) continue;

            try {
                toast.info(`[${i + 1}/${targetScenes.length}] Scene #${scene.scene_id} 이미지 생성 진행 중...`);
                await handleGenerateImage(scene.scene_id, scene.id, scene.visual_prompt);
                successCount++;
            } catch (err) {
                console.error(`[Batch Flow Image] Scene #${scene.scene_id} error:`, err);
            } finally {
                completedCount++;
            }

            // 다음 씬 생성 전 Flow DOM/네트워크 안정화 버퍼 딜레이
            if (i < targetScenes.length - 1) {
                await new Promise(r => setTimeout(r, 400));
            }
        }

        setIsFlowBatchGenerating(false);
        toast.success(`전체 ${targetScenes.length}개 씬 중 ${successCount}개 Flow 이미지 생성이 완료되었습니다!`);
    };

    // [NEW] Flow AI 일괄 영상(I2V) 생성 핸들러 (조건부 필터링 지원)
    const [isSelectiveVideoModalOpen, setIsSelectiveVideoModalOpen] = useState(false);
    const [selectiveVideoStrategy, setSelectiveVideoStrategy] = useState<'all' | 'first_n' | 'first_seconds' | 'interval' | 'selected'>('first_n');
    const [selectiveVideoN, setSelectiveVideoN] = useState<number>(3);
    const [selectiveVideoSeconds, setSelectiveVideoSeconds] = useState<number>(60);
    const [selectiveVideoInterval, setSelectiveVideoInterval] = useState<number>(2);
    const [selectedSceneIdsForVideo, setSelectedSceneIdsForVideo] = useState<string[]>([]);

    const handleBatchFlowVideos = async (overrideStrategy?: 'all' | 'first_n' | 'first_seconds' | 'interval' | 'selected') => {
        const availableScenes = scenes.filter(s => s.media_url);
        if (availableScenes.length === 0) {
            toast.error("영상을 생성하려면 먼저 이미지가 생성되어 있어야 합니다.");
            return;
        }

        const strategy = overrideStrategy || selectiveVideoStrategy;
        let targetScenes: SceneSegment[] = [];

        if (strategy === 'all') {
            targetScenes = availableScenes;
        } else if (strategy === 'first_n') {
            targetScenes = availableScenes.slice(0, selectiveVideoN);
        } else if (strategy === 'first_seconds') {
            let accumulatedTime = 0;
            targetScenes = [];
            for (const s of availableScenes) {
                targetScenes.push(s);
                accumulatedTime += (s.duration || 5);
                if (accumulatedTime >= selectiveVideoSeconds) break;
            }
        } else if (strategy === 'interval') {
            const step = Math.max(1, selectiveVideoInterval);
            targetScenes = availableScenes.filter((_, idx) => idx % step === 0);
        } else if (strategy === 'selected') {
            targetScenes = availableScenes.filter(s => selectedSceneIdsForVideo.includes(s.id));
            if (targetScenes.length === 0) {
                targetScenes = availableScenes.slice(0, 3);
            }
        }

        if (targetScenes.length === 0) {
            toast.error("조건에 일치하는 대상 씬이 없습니다.");
            return;
        }

        setIsFlowBatchGenerating(true);
        setIsSelectiveVideoModalOpen(false);
        toast.info(`총 ${targetScenes.length}개 씬에 대해 Google Flow AI 1:1 정밀 영상(I2V) 생성을 시작합니다...`);

        let successCount = 0;

        for (let i = 0; i < targetScenes.length; i++) {
            const scene = targetScenes[i];
            if (!scene) continue;

            try {
                toast.info(`[${i + 1}/${targetScenes.length}] Scene #${scene.scene_id} 영상(I2V) 생성 진행 중...`);
                await handleGenerateVideo(scene);
                successCount++;
            } catch (err: any) {
                console.error(`Scene #${scene.scene_id} Flow video error:`, err);
                updateScene(scene.id, { visualStatus: 'failed' });
            }

            // 다음 씬 영상 생성 전 Flow DOM/네트워크 안정화 버퍼 딜레이
            if (i < targetScenes.length - 1) {
                await new Promise(r => setTimeout(r, 400));
            }
        }

        setIsFlowBatchGenerating(false);
        toast.success(`영상 생성 완료! (${successCount}/${targetScenes.length}개 완료)`);
    };
    
    // [NEW] CapCut Export States
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [exportPhase, setExportPhase] = useState<'launching' | 'processing'>('processing');
    const handleExportToCapcut = () => setIsExportModalOpen(true);

    // [NEW] Auto-Gen Options
    const [autoGenerateImages, setAutoGenerateImages] = useState(false);
    const [autoGenerateAudio, setAutoGenerateAudio] = useState(false);

    // [NEW] Pacing Options
    const [pacingStrategy, setPacingStrategy] = useState<'ai' | 'rule'>('ai');
    const [pacingUnit, setPacingUnit] = useState<'sentence' | 'time'>('sentence');
    const [pacingValue, setPacingValue] = useState(2);

    // [MODAL VISIBILITY FIX] 모달 다이얼로그 오픈 시 네이티브 Flow WebContentsView 가림 방지 자동 숨김/복원
    const isAnyModalOpen = isStyleGalleryOpen || isWatermarkDialogOpen || isTransitionDialogOpen || isExportModalOpen || isTTSDialogOpen || isMotionDialogOpen || isAudioDialogOpen || isSelectiveVideoModalOpen || isSubtitleDialogOpen;
    useEffect(() => {
        const apiObj = (window as any).electronAPI;
        if (apiObj && typeof apiObj.setModalVisible === 'function') {
            apiObj.setModalVisible({ visible: isAnyModalOpen });
        }
    }, [isAnyModalOpen]);

    const handleManualSyncSubtitles = async () => {
        if (scenes.length === 0) {
            toast.error("동기화할 씬이 없습니다.");
            return;
        }
        await syncSubtitlesToDisk(scenes);
        toast.success(`오탈자 없는 대본 기준 총 ${scenes.length}개 씬의 정밀 SRT 자막이 생성 및 동기화되었습니다!`);
    };

    // Effect: Set defaults based on Segment Mode (Shorts vs Video)
    useEffect(() => {
        if (segmentMode === 'shorts') {
            // Shorts: 1-2 sentences per image
            setPacingUnit('sentence');
            setPacingValue(2);
        } else {
            // Long-form: ~30s per image
            setPacingUnit('time');
            setPacingValue(30);
        }
    }, [segmentMode]);

    const cleanupMutation = useMutation({
        mutationFn: async (paths: string[]) => {
            await api.post('/creative/cleanup', { file_paths: paths });
        }
    });

    const handleResetScenes = async () => {
        if (scenes.length === 0) return;
        if (confirm("정말 모든 씬과 생성된 프로젝트 폴더를 삭제하시겠습니까?\n05_Exports 폴더 내의 생성된 모든 이미지/영상 파일이 디스크에서 영구 삭제됩니다.")) {
            try {
                const apiObj = (window as any).electronAPI;
                if (apiObj?.deleteProject && currentProjectName) {
                    const defaultFolderRes = await apiObj.getDefaultWorkFolder?.();
                    const workFolder = defaultFolderRes?.path || '';
                    if (workFolder) {
                        await apiObj.deleteProject({ workFolder, project: currentProjectName });
                        console.log(`[Storage] Cleaned up project folder: ${workFolder}/${currentProjectName}`);
                    }
                }
            } catch (err) {
                console.error("[Storage] Failed to delete project folder:", err);
            }

            // Collect all paths to clean up via backend fallback
            const pathsToClean: string[] = [];
            scenes.forEach(s => {
                if (s.media_path) pathsToClean.push(s.media_path);
                if (s.audio_path) pathsToClean.push(s.audio_path);
                if (s.video_path) pathsToClean.push(s.video_path);
            });

            if (pathsToClean.length > 0) {
                cleanupMutation.mutate(pathsToClean);
            }

            setScenes([]);
            // 새 프로젝트 폴더 규칙 자동 생성 (예: project_260830_221000)
            const projName2 = currentProjectName || (() => {
                const now = new Date();
                const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
                const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
                return `project_${dateStr}_${timeStr}`;
            })();
            
            if (!currentProjectName) {
                setCurrentProjectName(projName2);
                localStorage.setItem('creative_current_project_name', projName2);
            }

            toast.success("프로젝트 폴더 및 생성물이 디스크에서 완전히 삭제되었습니다.");
        }
    };

    // [NEW] 종류별 전체 삭제 (TTS 음성 & 자막 / 이미지 / 영상) + 디스크 파일 물리 삭제 연동
    const handleClearAllAudio = async () => {
        if (scenes.length === 0) return;
        const hasAudio = scenes.some(s => s.audio_url || s.audio_path);
        if (!hasAudio) {
            toast.info("삭제할 TTS 음성이 없습니다.");
            return;
        }
        if (!confirm("모든 씬의 TTS 음성을 삭제하시겠습니까?\n타임라인의 음성 및 SRT 자막, 05_Exports 폴더 내 음성 파일이 디스크에서 함께 영구 삭제됩니다.")) return;

        // 디스크 상의 오디오 파일 물리 삭제
        const pathsToClean: string[] = [];
        scenes.forEach(s => {
            if (s.audio_path) pathsToClean.push(s.audio_path);
        });
        if (pathsToClean.length > 0) {
            cleanupMutation.mutate(pathsToClean);
        }

        const next = scenes.map(s => ({
            ...s,
            audio_url: undefined,
            audio_path: undefined,
            audioStatus: 'idle' as const
        }));
        setScenes(next);
        await syncSubtitlesToDisk(next);
        toast.success("모든 씬의 TTS 음성 및 자막이 디스크와 화면에서 완전히 삭제되었습니다.");
    };

    const handleClearAllImages = () => {
        if (scenes.length === 0) return;
        const hasImages = scenes.some(s => s.media_url || s.media_path);
        if (!hasImages) {
            toast.info("삭제할 이미지가 없습니다.");
            return;
        }
        if (!confirm("모든 씬의 생성된 이미지를 삭제하시겠습니까?\n05_Exports 폴더 내의 이미지 파일도 디스크에서 함께 영구 삭제됩니다.")) return;

        // 디스크 상의 이미지 파일 물리 삭제
        const pathsToClean: string[] = [];
        scenes.forEach(s => {
            if (s.media_path) pathsToClean.push(s.media_path);
        });
        if (pathsToClean.length > 0) {
            cleanupMutation.mutate(pathsToClean);
        }

        setScenes(prev => prev.map(s => ({
            ...s,
            media_url: undefined,
            media_path: undefined,
            mediaId: undefined,
            visualStatus: s.video_url ? s.visualStatus : ('idle' as const)
        })));
        toast.success("모든 씬의 이미지가 디스크와 화면에서 완전히 삭제되었습니다.");
    };

    const handleClearAllVideos = () => {
        if (scenes.length === 0) return;
        const hasVideos = scenes.some(s => s.video_url || s.video_path);
        if (!hasVideos) {
            toast.info("삭제할 영상이 없습니다.");
            return;
        }
        if (!confirm("모든 씬의 생성된 영상을 삭제하시겠습니까?\n05_Exports 폴더 내의 영상 파일도 디스크에서 함께 영구 삭제됩니다.")) return;

        // 디스크 상의 비디오 파일 물리 삭제
        const pathsToClean: string[] = [];
        scenes.forEach(s => {
            if (s.video_path) pathsToClean.push(s.video_path);
        });
        if (pathsToClean.length > 0) {
            cleanupMutation.mutate(pathsToClean);
        }

        setScenes(prev => prev.map(s => ({
            ...s,
            video_url: undefined,
            video_path: undefined,
            viewMode: 'source' as const,
            visualStatus: s.media_url ? 'completed' as const : ('idle' as const)
        })));
        toast.success("모든 씬의 영상이 디스크와 화면에서 완전히 삭제되었습니다.");
    };

    // Polling for Video Generation
    useEffect(() => {
        const interval = setInterval(async () => {
            const activeTasks = scenes.filter(s => s.visualStatus === 'generating' && s.task_id);
            if (activeTasks.length === 0) return;

            for (const scene of activeTasks) {
                try {
                    const res = await api.get(`/video/status/${scene.task_id}`);
                    const { status, url, progress } = res.data;

                    if (status === 'succeeded') {
                        updateScene(scene.id, { visualStatus: 'completed', media_url: url, progress: 100 });
                        toast.success(`Scene #${scene.scene_id} 영상 생성 완료!`);
                    } else if (status === 'failed') {
                        updateScene(scene.id, { visualStatus: 'failed', progress: 0 });
                        toast.error(`Scene #${scene.scene_id} 영상 생성 실패.`);
                    } else {
                        updateScene(scene.id, { progress: progress || 0 });
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [scenes]);

    const updateScene = (id: string, updates: Partial<SceneSegment>) => {
        setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    // Mutations
    const segmentScriptMutation = useMutation({
        mutationFn: async (data: { text: string, mode: string, provider: string, model: string, stylePrompt: string, split_method?: string, auto_generate_images: boolean, auto_generate_audio: boolean, pacing_config?: any }) => {
            const res = await apiLong.post('/creative/split-script', {
                text: data.text,
                mode: data.mode,
                provider: data.provider,
                model: data.model,
                style_prompt: data.stylePrompt,
                split_method: data.split_method || 'ai_smart',
                auto_generate_images: data.auto_generate_images,
                auto_generate_audio: data.auto_generate_audio,
                pacing_config: data.pacing_config
            });
            return res.data;
        },
        onSuccess: async (data) => {
            const mappedScenes: SceneSegment[] = data.map((s: any) => ({
                ...s,
                id: uuidv4(),
                audioStatus: 'idle',
                visualStatus: 'idle',
                renderStatus: 'idle',
                viewMode: 'source'
            }));
            setScenes(mappedScenes);
            setSrtEntries([]); // TTS 생성 전까지 타임라인 자막 트랙 비움 (음성 기반 실제 SRT 생성 대기)

            // [PROJECT LIFECYCLE] 기존 프로젝트가 있으면 재사용, 없으면 새 프로젝트 생성
            const projName = currentProjectName || (() => {
                const now = new Date();
                const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
                const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
                return `project_${dateStr}_${timeStr}`;
            })();
            
            if (!currentProjectName) {
                setCurrentProjectName(projName);
                localStorage.setItem('creative_current_project_name', projName);
            }

            try {
                await api.post('/creative/init-project', {
                    project_name: projName,
                    scenes: mappedScenes,
                    script: fullScript
                });
                console.log(`[Storage] Project folder initialized: 05_Exports/${projName}`);
            } catch (e) {
                console.warn("Project init warning:", e);
            }

            toast.success(`${data.length}개 씬 구성 완료! 프로젝트(${projName})${currentProjectName ? '에 씬 추가됨' : '가 생성되었습니다.'}`);
        },
        onError: async (err) => {
            console.warn("Backend split failed, activating client self-healing fallback:", err);
            // 자가치유 폴백: 대본을 줄바꿈/문장 단위로 즉시 로컬 분할하여 복원
            const lines = fullScript.split('\n').map(l => l.trim()).filter(Boolean);
            const fallbackLines = lines.length > 0 ? lines : [fullScript];
            const fallbackScenes: SceneSegment[] = fallbackLines.map((line, idx) => ({
                id: uuidv4(),
                scene_id: idx + 1,
                script: line,
                visual_prompt: `${segmentMode === 'shorts' ? '9:16' : '16:9'}, ${line}${stylePrompt ? `, ${stylePrompt}` : ''}`,
                video_prompt: 'Camera slowly zooms in, subtle cinematic motion',
                audioStatus: 'idle',
                visualStatus: 'idle',
                renderStatus: 'idle',
                viewMode: 'source'
            }));
            setScenes(fallbackScenes);
            setSrtEntries([]);

            const now = new Date();
            const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
            const newProjName = `project_${dateStr}_${timeStr}`;
            setCurrentProjectName(newProjName);
            localStorage.setItem('creative_current_project_name', newProjName);

            try {
                await api.post('/creative/init-project', {
                    project_name: projName2,
                    scenes: fallbackScenes,
                    script: fullScript
                });
            } catch (e) {
                console.warn("Fallback project init warning:", e);
            }

            toast.info(`스마트 로컬 분석으로 ${fallbackScenes.length}개 씬 분할 복구 완료! (05_Exports/${newProjName})`);
        }
    });

    const generateVideoMutation = useMutation({
        mutationFn: async (data: { id: string, sceneId: number, prompt: string, model: string, is_continuous_motion?: boolean }) => {
            const aspectRatio = segmentMode === 'shorts' ? "9:16" : "16:9";
            const res = await api.post('/video/generate', {
                prompt: data.prompt,
                model: data.model,
                aspect_ratio: aspectRatio,
                is_continuous_motion: data.is_continuous_motion,
                scene_id: data.sceneId // Send scene_id so backend can fetch previous scene if needed
            });
            return { id: data.id, sceneId: data.sceneId, taskId: res.data.task_id };
        },
        onSuccess: ({ id, sceneId, taskId }) => {
            updateScene(id, { visualStatus: 'generating', task_id: taskId, progress: 0 });
            toast.info(`Scene #${sceneId} 영상 생성을 시작했습니다.`);
        },
        onError: (err, variables) => {
            updateScene(variables.id, { visualStatus: 'failed' });
            toast.error("영상 생성 요청 실패: " + err);
        }
    });

    const uploadVideoMutation = useMutation({
        mutationFn: async (data: { id: string, sceneId: number, file: File }) => {
            const formData = new FormData();
            formData.append('file', data.file);
            const res = await api.post('/video/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return { id: data.id, sceneId: data.sceneId, url: res.data.web_url, path: res.data.server_path };
        },
        onSuccess: ({ id, sceneId, url, path }) => {
            // FIX: Only update media_url/path, DO NOT trigger render
            updateScene(id, { 
                visualStatus: 'completed', 
                media_url: url, 
                media_path: path, 
                viewMode: 'source',
                is_manual_asset: true // [NEW] Flag as manual
            });
            toast.success(`Scene #${sceneId} 영상 업로드 완료!`);
        },
        onError: (err, variables) => {
            updateScene(variables.id, { visualStatus: 'failed' });
            toast.error("업로드 실패: " + err);
        }
    });

    const generateImageMutation = useMutation({
        mutationFn: async (data: { id: string, sceneId: number, prompt: string }) => {
            const res = await api.post('/creative/generate-image', {
                prompt: data.prompt,
                provider: "openai",
                model: "dall-e-3"
            });
            return {
                id: data.id,
                sceneId: data.sceneId,
                url: res.data.web_url,
                path: res.data.server_path
            };
        },
        onSuccess: ({ id, sceneId, url, path }) => {
            updateScene(id, { visualStatus: 'completed', media_url: url, media_path: path, viewMode: 'source' });
            toast.success(`Scene #${sceneId} 이미지 생성 완료!`);
        },
        onError: (err, variables) => {
            updateScene(variables.id, { visualStatus: 'failed' });
            toast.error("이미지 생성 실패: " + err);
        }
    });


    const handleGenerateImage = async (sceneId: number, id: string, prompt: string) => {
        const scene = scenes.find(s => s.id === id || s.scene_id === sceneId);
        const basePrompt = (prompt || scene?.visual_prompt || scene?.script_text || '').trim();

        // 스마트 문화 오염 방지 Negative Guardrails: 한국 사극/조선 야담 테마 시 일본/중국 복식 및 건축물 자동 배제
        const isKoreanTheme = /조선|한복|선비|사극|야담|hanbok|joseon|korea|hanok|k-drama/i.test(basePrompt + ' ' + (stylePrompt || ''));
        const culturalNegatives = isKoreanTheme 
            ? "japanese clothing, kimono, yukata, samurai, katana, geta, tatami, fusuma, japanese temple, torii, chinese clothing, hanfu, qipao, modern western clothing, cars, sunglasses, distorted face, extra limbs"
            : "distorted face, extra limbs, bad anatomy, deformed";

        const combinedNegative = [negativePrompt, culturalNegatives].filter(Boolean).join(', ');

        // 화풍 프롬프트가 기본 프롬프트에 중복 포함되지 않도록 깔끔하게 결합
        let effectiveVisualPrompt = basePrompt;
        if (stylePrompt && !basePrompt.toLowerCase().includes(stylePrompt.toLowerCase().trim())) {
            effectiveVisualPrompt = `${stylePrompt}, ${basePrompt}`.trim();
        }
        if (!effectiveVisualPrompt) {
            effectiveVisualPrompt = stylePrompt || 'Cinematic picturesque scene';
        }

        // Google Flow AI(Imagen)는 --no 네거티브 프롬프트 구문을 지원하지 않음
        // Flow AI 경로에는 깔끔한 프롬프트만, 백엔드 폴백에만 --no 포함
        const flowPrompt = effectiveVisualPrompt;
        const finalPrompt = `${effectiveVisualPrompt}${combinedNegative ? ` --no ${combinedNegative}` : ''}`.trim();
        updateScene(id, { visualStatus: 'generating' });

        const apiObj = (window as any).electronAPI;
        if (apiObj && (apiObj.flowGenerateImage || apiObj.generateImage)) {
            try {
                toast.info(`Scene #${sceneId} Google Flow AI 이미지 생성을 시작합니다...`);
                const fn = apiObj.flowGenerateImage || apiObj.generateImage;
                const res = await fn({
                    prompt: flowPrompt,
                    aspectRatio: segmentMode === 'shorts' ? '9:16' : '16:9',
                    batchCount: 1
                });

                if (res?.success && (res?.images?.[0]?.base64 || res?.base64 || res?.url || res?.image_url)) {
                    const mediaUrl = res.images?.[0]?.base64 || res.base64 || res.url || res.image_url;
                    const mediaId = res.images?.[0]?.mediaId || (res as any).mediaId || undefined;
                    
                    // 05_Exports 디스크에 자동 저장
                    let localPath = '';
                    if (mediaUrl.startsWith('data:image')) {
                        try {
                            const saveRes = await api.post('/creative/save-base64-asset', {
                                project_name: currentProjectName,
                                scene_id: sceneId,
                                base64: mediaUrl,
                                asset_type: 'image'
                            });
                            localPath = saveRes.data?.local_path || '';
                        } catch (saveErr) {
                            console.warn('[Save Image Error]', saveErr);
                        }
                    }

                    const finalMediaUrl = localPath 
                        ? (localPath.startsWith('http') ? localPath : `file://${localPath.replace(/\\/g, '/')}`)
                        : mediaUrl;

                    updateScene(id, { 
                        visualStatus: 'completed', 
                        media_url: finalMediaUrl, 
                        media_path: localPath || undefined,
                        mediaId: mediaId,
                        viewMode: 'source' 
                    });
                    toast.success(`Scene #${sceneId} Flow 이미지 생성 및 저장 완료!`);
                    return;
                } else if (res?.error) {
                    throw new Error(res.error);
                }
            } catch (err: any) {
                console.error(`[Flow Image] Scene #${sceneId} error:`, err);
                toast.error(`Scene #${sceneId} Flow 이미지 생성 실패: ` + (err.message || err));
                updateScene(id, { visualStatus: 'failed' });
                return;
            }
        }

        // Electron 외 브라우저 환경 전용 폴백
        generateImageMutation.mutate({ id, sceneId, prompt: finalPrompt });
    };

    const handleSegmentScript = () => {
        if (!fullScript.trim()) {
            toast.error("대본을 입력해주세요.");
            return;
        }
        setIsSegmenting(true);
        segmentScriptMutation.mutate({
            text: fullScript,
            mode: segmentMode,
            provider: scriptProvider || undefined,
            model: scriptModel || undefined,
            stylePrompt: stylePrompt || "",
            split_method: pacingStrategy === 'rule' ? 'custom_rule' : (splitMethod || 'ai_smart'),
            auto_generate_images: autoGenerateImages,
            auto_generate_audio: autoGenerateAudio,
            pacing_config: pacingStrategy === 'rule' ? {
                strategy: 'rule',
                unit: pacingUnit,
                value: pacingValue
            } : undefined
        }, {
            onSettled: () => setIsSegmenting(false)
        });
    };

    const handleGenerateVideo = async (scene: SceneSegment) => {
        // Validation: If continuous motion, check if previous scene has a video
        if (scene.is_continuous_motion) {
            const prevScene = scenes.find(s => s.scene_id === scene.scene_id - 1);
            if (!prevScene || (!prevScene.video_url && !prevScene.media_url)) {
                toast.error("이전 씬과 연결 모드입니다. 선행 씬의 영상 생성을 먼저 완료해 주세요.");
                return;
            }
        }
        
        // Validation: If NOT continuous, ensure we have an image
        if (!scene.is_continuous_motion && !scene.media_url) {
            toast.error("영상을 생성하기 전에 반드시 이미지를 먼저 생성해야 합니다.");
            return;
        }

        const promptBase = scene.video_prompt || scene.visual_prompt || 'Slow cinematic push-in tracking shot, subtle emotional gaze shift and natural blinking, gentle breeze softly rippling the silk Hanbok fabric, 24fps fluid motion';
        const isKoreanTheme = /조선|한복|선비|사극|야담|hanbok|joseon|korea|hanok|k-drama/i.test(promptBase + ' ' + (scene.visual_prompt || '') + ' ' + (stylePrompt || ''));
        const culturalNegatives = isKoreanTheme 
            ? "kimono, yukata, samurai, katana, tatami, japanese architecture, chinese clothing, modern clothing, distorted anatomy, morphing"
            : "distorted, morphing, jittery, low quality";
        const combinedNegative = [negativePrompt, culturalNegatives].filter(Boolean).join(', ');
                // Google Flow AI(Veo)는 --no 네거티브 프롬프트 구문을 지원하지 않음
        // Flow AI 경로에는 깔끔한 프롬프트만, 백엔드 폴백에만 --no 포함
        const flowPrompt = promptBase;
const finalPrompt = `${promptBase}${combinedNegative ? " --no " + combinedNegative : ""}`;
        
        updateScene(scene.id, { visualStatus: 'generating', progress: 0 });
        toast.info(`Scene #${scene.scene_id} Google Flow AI 영상(I2V) 생성을 시작합니다...`);

        const apiObj = (window as any).electronAPI;
        if (apiObj && (apiObj.flowGenerateVideoI2V || apiObj.generateVideoI2V || apiObj.generateVideoT2V)) {
            try {
                // Flow AI Access Token & Project ID 획득 (useFlowAPI.js와 동일 패턴)
                let flowToken = '';
                let flowProjectId = '';
                try {
                    const tokenRes = await apiObj.extractToken();
                    if (tokenRes?.success && tokenRes?.token) {
                        flowToken = tokenRes.token;
                    }
                    const pidRes = await apiObj.extractProjectId();
                    if (pidRes?.success && pidRes?.projectId) {
                        flowProjectId = pidRes.projectId;
                    }
                } catch (e) {
                    console.warn('[CreativeStudio] Flow token/projectId extraction failed:', e);
                }

                // Flow AI 기본 영상 설정 (IPC 핸들러에서 optional이지만 명시적으로 전달)
                const VIDEO_MODEL_DEFAULT = 'veo-3.1-fast-generate-preview';
                const VIDEO_DURATION_DEFAULT = 8; // Veo 3.1 기본 영상 길이 (초)
                const currentAspectRatio = segmentMode === 'shorts' ? '9:16' : '16:9';

                let startImageMediaId = (scene as any).mediaId || '';
                
                // 1. mediaId가 없고 media_url이 base64/파일경로이면 Flow에 레퍼런스로 업로드하여 mediaId 획득
                // 1. mediaId가 없으면 media_url을 Flow에 업로드하여 mediaId 획득
                if (!startImageMediaId && scene.media_url && (apiObj.flowUploadReference || apiObj.uploadReference)) {
                    const uploadFn = apiObj.flowUploadReference || apiObj.uploadReference;
                    let base64Data = '';
                    if (scene.media_url.startsWith('data:')) {
                        // base64 data URL
                        base64Data = scene.media_url.replace(/^data:[^;]+;base64,/, '');
                    } else if (scene.media_url.startsWith('file://') || scene.media_url.includes(':/') || scene.media_url.startsWith('/')) {
                        // 로컬 파일 경로 → Electron에서 base64로 변환
                        try {
                            const filePath = scene.media_url.replace('file:///', '').replace('file://', '');
                            const readRes = await apiObj.readFileAsBase64?.({ path: filePath });
                            if (readRes?.success && readRes?.base64) base64Data = readRes.base64;
                        } catch (e) { console.warn('[CreativeStudio] Failed to read local file for upload:', e.message); }
                    }
                    if (base64Data) {
                        const upRes = await uploadFn({ token: flowToken, base64: base64Data, projectId: flowProjectId });
                        if (upRes?.success && upRes?.mediaId) {
                            startImageMediaId = upRes.mediaId;
                            updateScene(scene.id, { mediaId: startImageMediaId });
                        } else {
                            console.warn('[CreativeStudio] Flow upload-reference failed:', upRes?.error);
                        }
                    } else {
                        console.warn('[CreativeStudio] No base64 data available for start image upload');
                    }
                }

                // 2. I2V 생성 트리거
                const genI2VFn = apiObj.flowGenerateVideoI2V || apiObj.generateVideoI2V;
                const genT2VFn = apiObj.flowGenerateVideoT2V || apiObj.generateVideoT2V;
                
                let res: any = null;
                if ((startImageMediaId || scene.media_url) && genI2VFn) {
                    // flow:generate-video-i2v IPC에 token, projectId, model, duration, seed 포함
                    res = await genI2VFn({
                        token: flowToken,
                        prompt: flowPrompt,
                        startImageMediaId: startImageMediaId || (scene as any).mediaId || undefined,
                        startImage: scene.media_url,
                        projectId: flowProjectId,
                        model: VIDEO_MODEL_DEFAULT,
                        aspectRatio: currentAspectRatio,
                        duration: VIDEO_DURATION_DEFAULT,
                        seed: null,
                        videoBatchCount: 1
                    });
                } else if (genT2VFn) {
                    // flow:generate-video-t2v IPC에 token, projectId, model, duration, seed 포함
                    res = await genT2VFn({
                        token: flowToken,
                        prompt: flowPrompt,
                        projectId: flowProjectId,
                        model: VIDEO_MODEL_DEFAULT,
                        aspectRatio: currentAspectRatio,
                        duration: VIDEO_DURATION_DEFAULT,
                        seed: null
                    });
                }

                if (res?.success) {
                    // 비디오 URL이 즉시 반환된 경우 (DOM probe 또는 direct return)
                    if (res.videoUrl || res.video_url || res.url) {
                        const vUrl = res.videoUrl || res.video_url || res.url;
                        updateScene(scene.id, {
                            visualStatus: 'completed',
                            video_url: vUrl,
                            viewMode: 'render'
                        });
                        toast.success(`Scene #${scene.scene_id} 영상 생성이 완료되었습니다!`);
                        return;
                    }

                    // generationId 또는 mediaId로 완료 상태 폴링
                    const genId = res.generationId || res.mediaId || res.taskId;
                    if (genId && (apiObj.flowCheckVideoStatus || apiObj.checkVideoStatus)) {
                        const checkFn = apiObj.flowCheckVideoStatus || apiObj.checkVideoStatus;
                        for (let p = 0; p < 60; p++) {
                            await new Promise(r => setTimeout(r, 2000));
                            // flow:check-video-status IPC는 token, generationIds, projectId 필수
                            const statusRes = await checkFn({ token: flowToken, generationIds: [genId], projectId: flowProjectId });
                            if (statusRes?.success && Array.isArray(statusRes.statuses)) {
                                const st = statusRes.statuses[0];
                                if (st?.status === 'complete' && st?.videoUrl) {
                                    updateScene(scene.id, {
                                        visualStatus: 'completed',
                                        video_url: st.videoUrl,
                                        viewMode: 'render'
                                    });
                                    toast.success(`Scene #${scene.scene_id} 영상 생성이 완료되었습니다!`);
                                    return;
                                } else if (st?.status === 'failed') {
                                    throw new Error(st.error || 'Video generation failed');
                                }
                            }
                        }
                    }
                    
                    updateScene(scene.id, { visualStatus: 'completed', viewMode: 'render' });
                    toast.success(`Scene #${scene.scene_id} 영상 생성이 제출되었습니다.`);
                } else {
                    throw new Error(res?.error || 'Video generation failed');
                }
            } catch (err: any) {
                console.error('[Flow Video Error]', err);
                updateScene(scene.id, { visualStatus: 'failed' });
                toast.error(`Scene #${scene.scene_id} 영상 생성 실패: ${err?.message || err}`);
            }
        } else {
            generateVideoMutation.mutate({ 
                id: scene.id, 
                sceneId: scene.scene_id, 
                prompt: finalPrompt, 
                model: "flow-video",
                is_continuous_motion: scene.is_continuous_motion
            });
        }
    };

    const handleVideoUpload = (sceneId: number, id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            updateScene(id, { visualStatus: 'generating' });
            uploadVideoMutation.mutate({ id, sceneId, file: e.target.files[0] });
        }
    };

    // Batch Mutations
    const batchImageMutation = useMutation({
        mutationFn: async (scenes: SceneSegment[]) => {
            const res = await api.post('/creative/batch-image', {
                scenes: scenes,
                provider: "openai",
                model: "dall-e-3"
            });
            return res.data;
        },
        onSuccess: (updatedScenes) => {
            setScenes(prev => prev.map(s => {
                const updated = updatedScenes.find((u: any) => u.scene_id === s.scene_id);
                return updated ? {
                    ...s,
                    media_url: updated.media_url,
                    media_path: updated.media_path,   // 로컬 경로도 저장 → batch-render 에서 직접 사용
                    visualStatus: 'completed',
                    viewMode: 'source'
                } : s;
            }));
            toast.success("전체 이미지 생성 완료!");
        },

        onError: (err) => {
            toast.error("배치 이미지 생성 실패: " + err);
        }
    });

    const handleBatchImageGen = () => {
        if (scenes.length === 0) return;
        if (!confirm("모든 씬에 대해 이미지를 생성하시겠습니까? (기존 이미지는 덮어씌워집니다)")) return;
        setScenes(prev => prev.map(s => ({ ...s, visualStatus: 'generating' })));
        batchImageMutation.mutate(scenes);
    };

    const batchRenderMutation = useMutation({
        mutationFn: async (scenes: SceneSegment[]) => {
            // 전체 씬 렌더링은 씬 수 × 씬당 시간 → 5분 타임아웃 인스턴스 사용
            const currentAspectRatio = segmentMode === 'shorts' ? "9:16" : "16:9";
            const res = await apiLong.post('/creative/batch-render', {
                scenes: scenes,
                voice_id: "af_heart",
                speed: 1.0,
                aspect_ratio: currentAspectRatio,
                motion_config: motionConfig,
                subtitle_config: subtitleConfig,
                audio_config: audioConfig
            });
            return res.data;
        },
        onSuccess: (updatedScenes) => {
            setScenes(prev => prev.map(s => {
                const updated = updatedScenes.find((u: any) => u.scene_id === s.scene_id);
                return updated ? { 
                    ...s, 
                    video_url: updated.video_url, 
                    video_path: updated.video_path, 
                    renderStatus: 'completed', 
                    viewMode: 'render' 
                } : s;
            }));
            toast.success("전체 영상 렌더링 완료!");
        },
        onError: (err) => {
            toast.error("배치 렌더링 실패: " + err);
        }
    });

    const handleBatchRender = () => {
        if (scenes.length === 0) return;
        if (!confirm("모든 씬을 영상으로 렌더링하시겠습니까? (이미지가 생성되어 있어야 합니다)")) return;
        setScenes(prev => prev.map(s => ({ ...s, renderStatus: 'generating' })));
        batchRenderMutation.mutate(scenes);
    };

    const handleRoughCut = () => {
        if (scenes.length === 0) return;

        // 사전 검증: 이미지가 없는 씬 확인
        const scenesWithoutImage = scenes.filter(s => !s.media_path && !s.media_url);
        if (scenesWithoutImage.length > 0) {
            toast.error(
                `씬 ${scenesWithoutImage.map(s => `#${s.scene_id}`).join(', ')}에 이미지가 없습니다. ` +
                `"전체 이미지 생성" 또는 각 씬의 "이미지 생성" 버튼을 먼저 눌러주세요.`
            );
            return;
        }

        if (!confirm("✨ 원클릭 러프컷: 모든 씬을 렌더링하고 하나로 합칩니다. 진행하시겠습니까?")) return;

        setScenes(prev => prev.map(s => ({ ...s, renderStatus: 'generating' })));

        // Chain: Batch Render -> Merge
        batchRenderMutation.mutate(scenes, {
            onSuccess: (updatedScenes) => {
                // Ensure state is updated before merge? 
                // Passed 'updatedScenes' contains the paths, so we can pass it directly.
                setIsMerging(true);
                mergeScenesMutation.mutate(updatedScenes, {
                    onSettled: () => setIsMerging(false)
                });
            }
        });
    };

    // Merge Scenes
    const [isMerging, setIsMerging] = useState(false);
    const [fullVideoPath, setFullVideoPath] = useState<string | null>(null);
    const mergeScenesMutation = useMutation({
        mutationFn: async (scenes: SceneSegment[]) => {
            // 영상 머지도 오래 걸리므로 5분 타임아웃 인스턴스 사용
            const res = await apiLong.post('/creative/merge-scenes', { scenes });
            return res.data;
        },
        onSuccess: (data) => {
            setFullVideoPath(data.server_path);
            toast.success("씬 영상 통합 완료! (ZIP 다운로드)", {
                action: {
                    label: "다운로드",
                    onClick: () => window.open(data.web_url, '_blank')
                }
            });
            // Optional: Automatically trigger download
            // window.open(data.web_url, '_blank');
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || err.message || "알 수 없는 오류";
            toast.error("영상 통합 실패: " + msg);
        }
    });

    const handleMergeScenes = () => {
        // Filter scenes that have a video_path
        const validScenes = scenes.filter(s => s.video_path);
        if (validScenes.length === 0) {
            toast.error("통합할 렌더링된 영상이 없습니다. 먼저 씬 영상을 렌더링하세요.");
            return;
        }

        if (validScenes.length < scenes.length) {
            if (!confirm(`전체 ${scenes.length}개 씬 중 ${validScenes.length}개만 렌더링되었습니다. 이대로 통합하시겠습니까?`)) {
                return;
            }
        }

        setIsMerging(true);
        mergeScenesMutation.mutate(scenes, {
            onSettled: () => setIsMerging(false)
        });
    };
    const renderSceneMutation = useMutation({
        mutationFn: async (data: { id: string, sceneId: number, image_path: string, audio_path: string, aspect_ratio: string, script: string, old_file_path?: string }) => {
            // 영상 렌더링은 오래 걸리므로 5분 타임아웃 인스턴스 사용
            const res = await apiLong.post('/creative/render-scene', {
                scene_id: data.sceneId,
                image_path: data.image_path,
                audio_path: data.audio_path,
                aspect_ratio: data.aspect_ratio,
                motion_config: motionConfig,
                subtitle_config: subtitleConfig,
                audio_config: audioConfig,
                script: data.script,
                old_file_path: data.old_file_path
            });
            return {
                id: data.id,
                sceneId: data.sceneId,
                url: res.data.web_url,
                path: res.data.server_path
            };
        },
        onSuccess: ({ id, sceneId, url, path }) => {
            // FIX: Update video_url, NOT media_url, and switch viewMode to 'render'
            updateScene(id, { renderStatus: 'completed', video_url: url, video_path: path, viewMode: 'render' });
            toast.success(`Scene #${sceneId} 영상 렌더링 완료!`);
        },
        onError: (err: any, variables) => {
            console.error("Render Failed:", err);
            updateScene(variables.id, { renderStatus: 'failed' });
            const msg = err.response?.data?.detail || err.message || "알 수 없는 오류";
            toast.error(`씬 렌더링 실패: ${msg}`);
        }
    });

    const handleRenderScene = (scene: SceneSegment) => {
        if (!scene.media_path) {
            toast.error("이미지 경로가 없습니다. 이미지를 먼저 생성하세요.");
            return;
        }
        if (!scene.audio_path) {
            toast.error("오디오 경로가 없습니다. TTS를 먼저 생성하세요.");
            return;
        }

        console.log(`[Render] Scene #${scene.scene_id} - Image: ${scene.media_path}, Audio: ${scene.audio_path}`);

        updateScene(scene.id, { renderStatus: 'generating' });
        const aspectRatio = segmentMode === 'shorts' ? "9:16" : "16:9";

        const payload = {
            id: scene.id,
            sceneId: scene.scene_id,
            image_path: scene.media_path,
            audio_path: scene.audio_path,
            aspect_ratio: aspectRatio,
            script: scene.script,
            old_file_path: scene.video_path
        };
        console.log("[Render] Sending Payload:", payload);

        renderSceneMutation.mutate(payload);
    };

    const syncSubtitlesToDisk = async (targetScenes: SceneSegment[], customCfg?: SubtitleConfig) => {
        if (!currentProjectName || targetScenes.length === 0) return;
        const activeCfg = customCfg || subtitleConfig;
        try {
            const res = await api.post('/creative/sync-subtitles', {
                project_name: currentProjectName,
                scenes: targetScenes.map(s => ({
                    scene_id: s.scene_id,
                    script: s.script,
                    duration: s.duration || 5.0
                })),
                subtitle_config: activeCfg
            });
            if (res.data?.entries && Array.isArray(res.data.entries)) {
                setSrtEntries(res.data.entries);
            }
            console.log(`[Subtitles] Synced SRT to disk: 05_Exports/${currentProjectName}/subtitles/subtitles.srt (cues: ${res.data?.entries?.length || 0})`);
            return res.data?.entries;
        } catch (e) {
            console.warn("Subtitles sync warning:", e);
        }
    };

    const generateTTSMutation = useMutation({
        mutationFn: async (data: { id: string, sceneId: number, script: string, config?: any }) => {
            const activeConfig = data.config || ttsConfigRef.current || ttsConfig;
            const res = await apiLong.post('/creative/scene-tts', {
                scene_id: data.sceneId,
                script: data.script,
                image_url: "",
                tts_config: activeConfig,
                project_name: currentProjectName,
                // @ts-ignore
                old_file_path: scenes.find(s => s.id === data.id)?.audio_path
            });
            return {
                id: data.id,
                sceneId: data.sceneId,
                url: res.data.web_url,
                path: res.data.server_path,
                duration: res.data.duration || 5.0
            };
        },
        onSuccess: ({ id, sceneId, url, path, duration }) => {
            toast.success(`Scene #${sceneId} TTS 생성 완료! (${duration}초)`);
            setScenes(prev => {
                const next = prev.map(s => s.id === id ? { ...s, audio_url: url, audio_path: path, duration: duration, audioStatus: 'completed' as const } : s);
                syncSubtitlesToDisk(next);
                return next;
            });
        },
        onError: (err: any, variables) => {
            updateScene(variables.id, { audioStatus: 'failed' });
            toast.error("TTS 생성 실패: " + err.message);
        }
    });

    const handleGenerateTTS = (scene: SceneSegment) => {
        if (!scene.script) {
            toast.error("대본이 없습니다.");
            return;
        }
        const activeConfig = ttsConfigRef.current || ttsConfig;
        updateScene(scene.id, { audioStatus: 'generating' });
        generateTTSMutation.mutate({ id: scene.id, sceneId: scene.scene_id, script: scene.script, config: activeConfig });
    };

    const batchTTSMutation = useMutation({
        mutationFn: async ({ scenes, config }: { scenes: SceneSegment[], config?: any }) => {
            const activeConfig = config || ttsConfigRef.current || ttsConfig;
            console.log("[Batch TTS] Generating with active TTS config:", activeConfig);
            // 배치 TTS는 씬 수만큼 순차 처리하므로 5분 타임아웃 사용
            const promises = scenes.map(s =>
                apiLong.post('/creative/scene-tts', {
                    scene_id: s.scene_id,
                    script: s.script,
                    image_url: "",
                    tts_config: activeConfig,
                    project_name: currentProjectName
                }).then(res => ({
                    id: s.id,
                    scene_id: s.scene_id,
                    audio_url: res.data.web_url,
                    audio_path: res.data.server_path,
                    duration: res.data.duration || 5.0
                }))
            );
            return Promise.all(promises);
        },
        onSuccess: (results) => {
            setScenes(prev => {
                const next = prev.map(s => {
                    const res = results.find(r => r.scene_id === s.scene_id);
                    return res ? { ...s, audio_url: res.audio_url, audio_path: res.audio_path, duration: res.duration, audioStatus: 'completed' as const } : s;
                });
                syncSubtitlesToDisk(next);
                return next;
            });
            toast.success("전체 TTS 생성 완료! SRT 자막 파일(subtitles.srt)이 자동 생성되었습니다.");
        },
        onError: (err) => {
            toast.error("배치 TTS 생성 실패: " + err);
        }
    });

    const handleBatchTTS = () => {
        if (scenes.length === 0) return;
        if (!confirm("모든 씬에 대해 TTS를 생성하시겠습니까?")) return;
        const activeConfig = ttsConfigRef.current || ttsConfig;
        setScenes(prev => prev.map(s => ({ ...s, audioStatus: 'generating' })));
        batchTTSMutation.mutate({ scenes, config: activeConfig });
    };

    const triggerDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('다운로드 실패');
        }
    };

    // Keyboard Shortcuts Handler (Split/Merge)
    const handleScriptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
        // Ctrl + Enter: Split Scene
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const cursorPosition = target.selectionStart;
            const currentScript = scenes[index].script;

            const partA = currentScript.substring(0, cursorPosition).trim();
            const partB = currentScript.substring(cursorPosition).trim();

            // 1. Update current scene with Part A
            updateScene(scenes[index].id, { script: partA });

            // 2. Insert new scene with Part B after current scene
            const newScene: SceneSegment = {
                id: uuidv4(),
                scene_id: 0, // Will be re-indexed
                script: partB,
                visual_prompt: `${segmentMode === 'shorts' ? '9:16' : '16:9'}, Cinematic scene, ${stylePrompt}`,
                audioStatus: 'idle',
                visualStatus: 'idle',
                renderStatus: 'idle',
                viewMode: 'source'
            };

            setScenes(prev => {
                const newScenes = [...prev];
                newScenes.splice(index + 1, 0, newScene);
                // Re-index scene_ids
                return newScenes.map((s, i) => ({ ...s, scene_id: i + 1 }));
            });

            toast.success("씬이 분할되었습니다.");
        }
        // Ctrl + Backspace: Merge with Previous
        else if (e.ctrlKey && e.key === 'Backspace') {
            const target = e.target as HTMLTextAreaElement;
            // Only merge if cursor is at the beginning (or very close to it)
            if (target.selectionStart <= 1 && index > 0) {
                e.preventDefault();
                const currentScript = scenes[index].script;
                const prevScene = scenes[index - 1];

                // 1. Append current script to previous scene
                const mergedScript = (prevScene.script + " " + currentScript).trim();
                updateScene(prevScene.id, { script: mergedScript });

                // 2. Remove current scene
                setScenes(prev => {
                    const newScenes = prev.filter((_, i) => i !== index);
                    return newScenes.map((s, i) => ({ ...s, scene_id: i + 1 }));
                });

                toast.success("이전 씬과 병합되었습니다.");
            }
        }
    };

    const handleBatchDownload = async (type: string) => {
        try {
            toast.info(`${type === 'visual' ? '이미지' : '영상'} ZIP 다운로드 시작...`);
            const response = await api.post('/creative/batch-download', {
                scenes: scenes,
                target_type: type,
                full_video_path: type === 'video' ? fullVideoPath : undefined
            }, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `batch_${type}_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("다운로드 완료!");
        } catch (error) {
            console.error('Batch download failed:', error);
            toast.error('배치 다운로드 실패 (파일이 없거나 오류 발생)');
        }
    };

    const getAudioDuration = (url: string): Promise<number> => {
        return new Promise((resolve) => {
            if (!url || url.startsWith('file://')) {
                resolve(3000);
                return;
            }
            const audio = new Audio(url);
            let resolved = false;
            const finish = (duration: number) => {
                if (!resolved) {
                    resolved = true;
                    resolve(duration);
                }
            };
            audio.addEventListener('loadedmetadata', () => finish(audio.duration * 1000));
            audio.addEventListener('error', () => finish(3000));
            
            // Timeout after 500ms to prevent UI freezing
            setTimeout(() => finish(3000), 500);
        });
    };

    const handleCapCutExport = async (settings: any) => {
        let currentScenes = scenes;

        // TTS 누락 씬 감지 및 자동 생성 프로세스
        const missingTTSScenes = currentScenes.filter(seg => !seg.audio_url && !seg.audio_path && seg.script);
        if (missingTTSScenes.length > 0) {
            if (!confirm(`일부 씬(${missingTTSScenes.length}개)에 TTS 음성이 없습니다.\n음성이 없으면 해당 씬은 강제로 3초로 지정되며 소리가 나지 않습니다.\n\n내보내기 전에 누락된 씬의 TTS를 일괄 생성하시겠습니까?`)) {
                return; // 취소를 누르면 내보내기 진행 자체를 중단
            }
            
            setIsExportModalOpen(false); // 진행 상황을 볼 수 있게 모달을 닫음
            toast.info("누락된 TTS를 자동 생성합니다. 완료되면 캡컷 내보내기가 즉시 이어집니다.", { duration: 5000 });
            setScenes(prev => prev.map(s => missingTTSScenes.some(m => m.id === s.id) ? { ...s, audioStatus: 'generating' } : s));
            
            try {
                const results = await batchTTSMutation.mutateAsync(missingTTSScenes);
                
                // Read-only React state를 직접 수정하지 않고 새로운 배열로 매핑하여 내보내기 로직에 사용
                currentScenes = currentScenes.map(s => {
                    const res = results.find((r: any) => r.scene_id === s.scene_id);
                    return res ? { ...s, audio_url: res.audio_url, audio_path: res.audio_path, audioStatus: 'completed' } : s;
                });
                
                // UI용 상태 업데이트
                setScenes(currentScenes);
                toast.success("TTS 자동 생성 완료! 이어서 캡컷 내보내기를 시작합니다.");
            } catch (e: any) {
                console.error("Batch TTS Error:", e);
                toast.error("TTS 생성 중 오류가 발생하여 내보내기가 취소되었습니다.");
                return;
            }
        }

        setIsExportModalOpen(true); // 만약 모달이 닫혔었다면 다시 로딩창을 띄우기 위해 (혹은 그대로 유지)
        setExportLoading(true);
        setExportPhase('processing');
        try {
            const aspectRatio = segmentMode === 'shorts' ? "9:16" : "16:9";
            
            const mappedScenes = [];
            const voiceFiles = [];
            let cumulativeTime = 0;

            for (let idx = 0; idx < currentScenes.length; idx++) {
                const seg = currentScenes[idx];
                
                let audioDurationMs = 3000;
                const audioSrc = seg.audio_url || (seg.audio_path ? `file://${seg.audio_path}` : null);
                if (audioSrc) {
                    audioDurationMs = await getAudioDuration(audioSrc);
                }

                const sceneDurationSec = audioDurationMs / 1000;

                mappedScenes.push({
                    id: `scene_${idx}`,
                    duration: sceneDurationSec,
                    image_duration: sceneDurationSec,
                    video_duration: sceneDurationSec,
                    media_path: seg.media_path,
                    video_path: seg.video_path || seg.video_url || null,
                    media_url: seg.media_url,
                    image_url: seg.media_url,
                    imageUrl: seg.media_url,
                    subtitle_ko: seg.script,
                    subtitle_en: seg.script,
                    subtitle: seg.script,
                    image_size: { width: aspectRatio === '9:16' ? 1080 : 1920, height: aspectRatio === '9:16' ? 1920 : 1080 }
                });

                if (seg.audio_path || audioSrc) {
                    voiceFiles.push({
                        filename: `narrator_scene_${idx}.mp3`,
                        path: seg.audio_path || audioSrc,
                        durationMs: audioDurationMs,
                        timecodeMs: cumulativeTime
                    });
                }
                
                cumulativeTime += audioDurationMs;
            }

            // Map segments to CapCut project payload
            const projectData = {
                format: aspectRatio === '9:16' ? 'portrait' : 'landscape',
                aspectRatio: aspectRatio,
                scenes: mappedScenes
            };

            const audioPackage = {
                voices: voiceFiles.length > 0 ? [
                    {
                        character: "NARRATOR",
                        files: voiceFiles
                    }
                ] : []
            };

            // Call generator directly to bypass any cloud wrappers
            const generatorOptions = {
                targetPath: settings.capcutProjectNumber,
                projectName: "CreativeStudio_Project",
                subtitleOption: settings.subtitleOption,
                subtitleConfig: subtitleConfig,
                subtitleFontSize: subtitleConfig.fontSize,
                audioPackage: audioPackage,
                transitionConfig: transitionConfig,
                watermarkConfig: watermarkConfig,
                scaleMode: settings.scaleMode,
                kenBurns: settings.kenBurns,
                kenBurnsMode: settings.kenBurnsMode,
                kenBurnsCycle: settings.kenBurnsCycle,
                kenBurnsScaleMin: settings.kenBurnsScaleMin,
                kenBurnsScaleMax: settings.kenBurnsScaleMax
            };

            const { draftContent, draftMetaInfo, timelineLayout, extraFiles, mediaFiles } = await generateCapcutProject(projectData, generatorOptions);

            let srtContent = null;
            let srtFilename = null;
            if (settings.subtitleOption !== 'none') {
                srtContent = generateSRT(projectData, settings.subtitleOption || 'ko', generatorOptions);
                srtFilename = `subtitles_${settings.subtitleOption || 'ko'}.srt`;
            }

            // Write files via Electron IPC directly
            const writeResult = await window.electronAPI.writeCapcutProject({
                targetPath: settings.capcutProjectNumber,
                draftInfo: draftContent,
                draftMetaInfo,
                timelineLayout,
                extraFiles,
                mediaFiles,
                srtContent,
                srtFilename
            });

            if (!writeResult.success) {
                throw new Error(writeResult.error || "Failed to write local CapCut project");
            }

            toast.success('CapCut 내보내기 완료!');
            
            if (window.electronAPI?.openCapcut) {
                try {
                    const openResult = await window.electronAPI.openCapcut(settings.capcutProjectNumber);
                    if (openResult && openResult.success) {
                        toast.info('CapCut 앱이 실행되었습니다.', 5000);
                    } else {
                        toast.warning('CapCut을 자동으로 실행하지 못했습니다. 수동으로 열어주세요.');
                    }
                } catch (e) {
                    toast.warning('CapCut을 자동으로 실행하지 못했습니다. 수동으로 열어주세요.');
                }
            }

            setIsExportModalOpen(false);
        } catch (error: any) {
            console.error('CapCut Export error:', error);
            toast.error(`CapCut 내보내기 실패: ${error.message}`);
        } finally {
            setExportLoading(false);
        }
    };

    // Manual Scene Management
    const handleAddScene = () => {
        const newScene: SceneSegment = {
            id: uuidv4(),
            scene_id: scenes.length + 1,
            script: "",
            visual_prompt: "",
            audioStatus: 'idle',
            visualStatus: 'idle',
            renderStatus: 'idle',
            viewMode: 'source'
        };
        setScenes(prev => [...prev, newScene]);
        toast.success(`Scene #${newScene.scene_id} 추가됨`);
    };

    const handleDeleteScene = (id: string) => {
        if (!confirm(`해당 씬을 삭제하시겠습니까? (관련 파일도 함께 삭제됩니다)`)) return;

        // Find the scene to get file paths
        const sceneToDelete = scenes.find(s => s.id === id);
        if (sceneToDelete) {
            const pathsToClean: string[] = [];
            if (sceneToDelete.media_path) pathsToClean.push(sceneToDelete.media_path);
            if (sceneToDelete.audio_path) pathsToClean.push(sceneToDelete.audio_path);
            if (sceneToDelete.video_path) pathsToClean.push(sceneToDelete.video_path);

            if (pathsToClean.length > 0) {
                cleanupMutation.mutate(pathsToClean);
            }
        }

        setScenes(prev => {
            const filtered = prev.filter(s => s.id !== id);
            // Renumber
            return filtered.map((s, i) => ({ ...s, scene_id: i + 1 }));
        });
        toast.success("씬 및 관련 파일 삭제 완료");
    };

    const handleInsertScene = (index: number) => {
        const newScene: SceneSegment = {
            id: uuidv4(),
            scene_id: 0, // Will be renumbered
            script: "",
            visual_prompt: "",
            audioStatus: 'idle',
            visualStatus: 'idle',
            renderStatus: 'idle',
            viewMode: 'source'
        };
        const updatedScenes = [...scenes];
        // Insert AT index (before the current scene at index)
        updatedScenes.splice(index, 0, newScene);

        // Renumber
        const renumbered = updatedScenes.map((s, i) => ({ ...s, scene_id: i + 1 }));
        setScenes(renumbered);
        toast.success("새로운 씬이 추가되었습니다.");
    };

    const handleMoveScene = (index: number, direction: number) => {
        if (index + direction < 0 || index + direction >= scenes.length) return;
        const updatedScenes = [...scenes];
        const temp = updatedScenes[index];
        updatedScenes[index] = updatedScenes[index + direction];
        updatedScenes[index + direction] = temp;

        // Renumber
        const renumbered = updatedScenes.map((s, i) => ({ ...s, scene_id: i + 1 }));
        setScenes(renumbered);
    };

    // AI Prompt Generation
    const generatePromptMutation = useMutation({
        mutationFn: async (data: { id: string, sceneId: number, script: string }) => {
            const res = await api.post('/creative/generate-prompt', {
                script: data.script,
                style_context: stylePrompt,
                provider: scriptProvider, // Use AI Writer settings
                model: scriptModel        // Use AI Writer settings
            });
            return { id: data.id, sceneId: data.sceneId, prompt: res.data.prompt };
        },
        onSuccess: ({ id, sceneId, prompt }) => {
            updateScene(id, { visual_prompt: prompt });
            toast.success(`Scene #${sceneId} 프롬프트 생성 완료!`);
        },
        onError: (err) => {
            toast.error("프롬프트 생성 실패: " + err);
        }
    });

    const handleGeneratePrompt = (scene: SceneSegment) => {
        if (!scene.script) {
            toast.error("대본을 먼저 입력해주세요.");
            return;
        }
        generatePromptMutation.mutate({ id: scene.id, sceneId: scene.scene_id, script: scene.script });
    };

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col gap-3.5 p-3 sm:p-5 pb-24 bg-background text-foreground">
            {/* 1. 상단 타이틀 헤더 바 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full pb-3 border-b border-border">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                            <Clapperboard className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
                            <span>AI 미디어 일괄 생성</span>
                        </h1>
                        <Badge variant="outline" className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Google Flow 연동 준비 완료</span>
                        </Badge>
                        {queueState.isProcessing && (
                            <Badge variant="outline" className="text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shadow-2xs animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                <span>백그라운드 생성 중: {queueState.completedCount}/{queueState.totalCount} ({queueState.progressPct}%)</span>
                            </Badge>
                        )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        구글 Flow AI 다중창과 실시간 연동하여 이미지/영상 일괄 생성 및 CapCut 완제품 내보내기
                    </p>
                </div>

                {/* Quick Action Navigation Bar */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const el = document.getElementById('scene-board-container');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="h-8 text-xs font-bold bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shadow-2xs gap-1.5"
                    >
                        <Film className="w-3.5 h-3.5" /> 씬보드로 바로가기 ({scenes.length}개)
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                        className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground border border-border/60"
                    >
                        {isTimelineOpen ? "타임라인 접기 ▲" : "타임라인 펼치기 ▼"}
                    </Button>
                </div>
            </div>

            {/* Zone 1 & Zone 2: Style Presets & Script Workspace (2-Column Grid 50:50 Side-by-Side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
                {/* Zone 1: Style Presets & Configuration (Collapsible) */}
                <Card className="border-l-4 border-l-purple-500 shadow-2xs bg-card border-border">
                    <CardHeader className="py-2 px-3.5 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/70" onClick={() => setIsStyleCollapsed(!isStyleCollapsed)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-foreground">
                                <Wand2 className="w-3.5 h-3.5 text-purple-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">스타일 및 비주얼 프롬프트</span>
                                {presetName && (
                                    <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-300/40">
                                        {presetName}
                                    </Badge>
                                )}
                            </div>
                            {isStyleCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                    </CardHeader>

                    {!isStyleCollapsed && (
                        <CardContent className="space-y-2.5 p-3 sm:p-3.5">
                            {/* Row 1: Preset Selection & Management */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                                <div className="md:col-span-6 space-y-1">
                                    <Label className="text-[11px] font-bold text-foreground">스타일 프리셋 (Style Preset)</Label>
                                    <div className="flex items-center gap-1.5">
                                        <Select value={selectedPresetId} onValueChange={handleSelectPreset}>
                                            <SelectTrigger className="flex-1 h-8 text-xs bg-background border-border shadow-2xs">
                                                <SelectValue placeholder="프리셋 선택..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="new">+ 새 프리셋 만들기</SelectItem>
                                                {presets?.map((p: any) => (
                                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedPresetId && selectedPresetId !== "new" && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDeletePreset(Number(selectedPresetId))} title="프리셋 삭제">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" className="h-8 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-300/60 dark:border-purple-800/60 shrink-0 font-semibold gap-1 px-2.5" onClick={() => setIsStyleGalleryOpen(true)}>
                                            <Sparkles className="w-3 h-3" />
                                            <span>갤러리</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="md:col-span-6 space-y-1">
                                    <Label className="text-[11px] font-bold text-foreground">프리셋 이름 및 저장</Label>
                                    <div className="flex items-center gap-1.5">
                                        <Input 
                                            value={presetName} 
                                            onChange={(e) => setPresetName(e.target.value)} 
                                            placeholder="예: 지브리 애니메이션..." 
                                            className="flex-1 h-8 text-xs bg-background border-border shadow-2xs" 
                                        />
                                        <Button onClick={handleSavePreset} disabled={!presetName} size="sm" className="h-8 px-3 text-xs font-bold shrink-0 bg-purple-600 hover:bg-purple-700 text-white gap-1 shadow-2xs">
                                            <Save className="w-3 h-3" /> 저장
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Analysis & Prompts */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                                {/* Analysis Drop Zone (3 cols) */}
                                <div className="md:col-span-3 relative border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-2 hover:bg-muted/40 transition-colors cursor-pointer bg-muted/10 group min-h-[80px]">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={(e) => e.target.files?.[0] && handleAnalyzeStyle(e.target.files[0])}
                                    />
                                    <Label className="absolute top-1.5 left-2 text-[9.5px] font-bold text-muted-foreground pointer-events-none flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5 text-purple-500" /> 스타일 분석
                                    </Label>
                                    {isAnalyzing ? (
                                        <div className="flex flex-col items-center gap-1 py-1">
                                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                            <span className="text-[10px] text-muted-foreground font-medium">분석 중...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-0.5 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors py-1">
                                            <Upload className="w-3.5 h-3.5 text-purple-500" />
                                            <span className="text-[10.5px] font-bold text-foreground">이미지 업로드</span>
                                            <span className="text-[8.5px] text-muted-foreground">클릭/드래그</span>
                                        </div>
                                    )}
                                </div>

                                {/* Positive Prompt (5 cols) */}
                                <div className="md:col-span-5 space-y-1 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            긍정 프롬프트
                                        </Label>
                                        <span className="text-[9px] font-mono text-muted-foreground">{stylePrompt.length}자</span>
                                    </div>
                                    <Textarea
                                        value={stylePrompt}
                                        onChange={(e) => setStylePrompt(e.target.value)}
                                        className="flex-1 resize-none text-xs font-mono leading-relaxed bg-background border-border text-foreground min-h-[65px] max-h-[90px] p-2 rounded-lg shadow-2xs"
                                        placeholder="공통 비주얼 화풍 (예: Japanese anime style...)"
                                    />
                                </div>

                                {/* Negative Prompt (4 cols) */}
                                <div className="md:col-span-4 space-y-1 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            부정 프롬프트
                                            <span className="text-[8px] font-normal text-muted-foreground/60 ml-1">(Flow AI 미지원)</span>
                                        </Label>
                                        <span className="text-[9px] font-mono text-muted-foreground">{negativePrompt.length}자</span>
                                    </div>
                                    <Textarea
                                        value={negativePrompt}
                                        onChange={(e) => setNegativePrompt(e.target.value)}
                                        className="flex-1 resize-none text-xs font-mono leading-relaxed bg-background border-border text-foreground min-h-[65px] max-h-[90px] p-2 rounded-lg shadow-2xs"
                                        placeholder="제외할 요소 (백엔드 렌더러용, Flow AI에서는 무시됨)"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* Zone 2: Script Workspace & Segmentation (Collapsible) */}
                <Card className="border-l-4 border-l-blue-500 shadow-2xs bg-card border-border">
                    <CardHeader className="py-2 px-3.5 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/70" onClick={() => setIsScriptCollapsed(!isScriptCollapsed)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-foreground">
                                <Clapperboard className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">대본 작업실 및 씬 분할</span>
                                {fullScript && (
                                    <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-300/40">
                                        {fullScript.length}자
                                    </Badge>
                                )}
                            </div>
                            {isScriptCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                    </CardHeader>

                    {!isScriptCollapsed && (
                        <CardContent className="space-y-2.5 p-3 sm:p-3.5">
                            {/* Mode Tabs */}
                            <Tabs value={scriptMode} onValueChange={setScriptMode} className="w-full">
                                <TabsList className="inline-flex bg-muted/80 p-0.5 rounded-lg h-7.5 border border-border/60">
                                    <TabsTrigger value="manual" className="text-xs font-bold px-3 h-6.5 rounded-md">📝 직접 입력</TabsTrigger>
                                    <TabsTrigger value="creative" className="text-xs font-bold px-3 h-6.5 rounded-md">✨ AI 작가 생성</TabsTrigger>
                                </TabsList>

                                <TabsContent value="creative" className="space-y-2 pt-1">
                                    <div className="p-2.5 bg-muted/20 rounded-xl border border-border space-y-2">
                                        <AIModelSelector
                                            provider={scriptProvider}
                                            onProviderChange={setScriptProvider}
                                            model={scriptModel}
                                            onModelChange={setScriptModel}
                                            presetId={selectedStyleId}
                                            onPresetChange={setSelectedStyleId}
                                            showPreset={true}
                                            onCreatePreset={handleCreateStyle}
                                            onEditPreset={handleEditStyle}
                                        />

                                        <div className="flex items-center justify-between pt-0.5">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id="creative-web-search"
                                                    checked={useWebSearchCreative}
                                                    onCheckedChange={setUseWebSearchCreative}
                                                />
                                                <Label htmlFor="creative-web-search" className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                    <Globe className="w-3 h-3 text-primary" />
                                                    웹 검색
                                                </Label>
                                                <Badge variant={useWebSearchCreative ? "default" : "outline"} className="text-[9px] px-1.5 py-0">
                                                    {useWebSearchCreative ? "ON" : "OFF"}
                                                </Badge>
                                            </div>

                                            <Button onClick={handleGenerateScript} disabled={isGeneratingScript || !scriptInput} size="sm" className="h-7 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1 shadow-2xs">
                                                {isGeneratingScript ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                대본 생성
                                            </Button>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-bold text-foreground">주제 또는 아이디어</Label>
                                            <Textarea
                                                value={scriptInput}
                                                onChange={(e) => setScriptInput(e.target.value)}
                                                placeholder="원하는 스토리 주제나 핵심 키워드를 입력하세요..."
                                                className="min-h-[55px] text-xs bg-background border-border text-foreground rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            {/* Full Script Text Area */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-bold text-foreground">전체 대본 (Full Script)</Label>
                                    <span className="text-[10px] font-mono text-muted-foreground">총 {fullScript.length} 글자</span>
                                </div>
                                <Textarea
                                    value={fullScript}
                                    onChange={(e) => setFullScript(e.target.value)}
                                    className="min-h-[75px] max-h-[120px] font-sans text-xs leading-relaxed bg-background border-border text-foreground rounded-lg p-2.5 shadow-2xs"
                                    placeholder="여기에 전체 대본을 입력하거나 붙여넣으세요..."
                                />
                            </div>

                            {/* 씬 분할 전략 (Segmentation Strategy) Compact Panel */}
                            <div className="flex flex-col gap-2 p-2.5 bg-muted/20 rounded-xl border border-border">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-primary" /> 씬 분할 전략
                                    </Label>
                                    <div className="flex bg-muted rounded-lg p-0.5 border border-border/60 self-start sm:self-auto">
                                        <Button
                                            variant={pacingStrategy === 'ai' ? 'secondary' : 'ghost'}
                                            size="sm" className={`h-6 text-[11px] px-2 font-semibold ${pacingStrategy === 'ai' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground'}`}
                                            onClick={() => { setPacingStrategy('ai'); setSplitMethod('ai_smart'); }}
                                        >
                                            ✨ AI 스마트
                                        </Button>
                                        <Button
                                            variant={pacingStrategy === 'rule' ? 'secondary' : 'ghost'}
                                            size="sm" className={`h-6 text-[11px] px-2 font-semibold ${pacingStrategy === 'rule' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground'}`}
                                            onClick={() => { setPacingStrategy('rule'); setSplitMethod('custom_rule'); }}
                                        >
                                            ⚙️ 규칙
                                        </Button>
                                    </div>
                                </div>

                                {pacingStrategy === 'ai' ? (
                                    <Select value={splitMethod} onValueChange={setSplitMethod}>
                                        <SelectTrigger className="w-full h-7.5 text-xs bg-background border-border shadow-2xs">
                                            <SelectValue placeholder="AI 분석 방식" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ai_smart">✨ AI 스마트 분석 (Visual Flow)</SelectItem>
                                            <SelectItem value="visual_change">🎥 시각 전환 기준</SelectItem>
                                            <SelectItem value="semantic">🧠 의미/길이 자동 최적화</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                                        <Select value={pacingUnit} onValueChange={(v: any) => setPacingUnit(v)}>
                                            <SelectTrigger className="w-full sm:w-[110px] h-7.5 text-xs bg-background border-border shadow-2xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sentence">📝 문장 단위</SelectItem>
                                                <SelectItem value="time">⏱️ 시간 단위</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="flex-1 flex items-center justify-between bg-background border border-border rounded-lg px-2.5 h-7.5 shadow-2xs">
                                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                {pacingUnit === 'sentence' ? '문장 수:' : '예상 시간:'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={pacingValue}
                                                    onChange={(e) => setPacingValue(Number(e.target.value))}
                                                    className="h-5 w-10 text-xs font-bold text-right border-none shadow-none focus-visible:ring-0 p-0 bg-transparent"
                                                    min={1}
                                                />
                                                <span className="text-xs font-bold text-primary">
                                                    {pacingUnit === 'sentence' ? '개' : '초'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Execution Footer Bar */}
                                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-1.5 gap-2 border-t border-border/60">
                                    <div className="flex items-center justify-around sm:justify-start gap-2 px-2.5 bg-background h-7.5 rounded-lg border border-border shadow-2xs">
                                        <Label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer text-foreground select-none">
                                            <input type="checkbox" checked={autoGenerateImages} onChange={e => setAutoGenerateImages(e.target.checked)} className="rounded border-border text-primary focus:ring-primary w-3 h-3" />
                                            <span>🖼️ 이미지</span>
                                        </Label>
                                        <div className="w-px h-3 bg-border" />
                                        <Label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer text-foreground select-none">
                                            <input type="checkbox" checked={autoGenerateAudio} onChange={e => setAutoGenerateAudio(e.target.checked)} className="rounded border-border text-primary focus:ring-primary w-3 h-3" />
                                            <span>🎙️ TTS</span>
                                        </Label>
                                    </div>

                                    <Button onClick={handleSegmentScript} disabled={isSegmenting || !fullScript} size="sm" className="h-7.5 px-3 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg gap-1">
                                        {isSegmenting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clapperboard className="w-3 h-3" />}
                                        <span>🎬 씬 분할 시작</span>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Zone 2.5: Collapsible Timeline & Real-time Preview (Script 하단) */}
            <CollapsibleTimelinePreview
                scenes={scenes}
                aspectRatio={segmentMode === 'shorts' ? '9:16' : '16:9'}
                onAspectRatioChange={(r) => setSegmentMode(r === '9:16' ? 'shorts' : 'landscape')}
                srtEntries={srtEntries}
                subtitleConfig={subtitleConfig}
                onSubtitleConfigChange={setSubtitleConfig}
                watermarkConfig={watermarkConfig}
                onWatermarkConfigChange={setWatermarkConfig}
                transitionConfig={transitionConfig}
                onTransitionConfigChange={setTransitionConfig}
                isOpen={isTimelineOpen}
                onToggle={() => setIsTimelineOpen(!isTimelineOpen)}
                onSelectScene={(idx) => {
                    const scene = scenes[idx];
                    if (scene) {
                        const el = document.getElementById(`scene-${scene.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }}
                onSplitScene={(idx, _timeOffset) => {
                    if (!scenes[idx]) return;
                    const targetScene = scenes[idx];
                    const scriptText = targetScene.script || '';
                    const midPoint = Math.floor(scriptText.length / 2);
                    const part1 = scriptText.slice(0, midPoint).trim() || scriptText;
                    const part2 = scriptText.slice(midPoint).trim() || '추가 분할 대본';

                    const newSceneA: SceneSegment = {
                        ...targetScene,
                        script: part1,
                        duration: Math.max(2.0, Number((targetScene.duration || 3.5) / 2))
                    };
                    const newSceneB: SceneSegment = {
                        id: uuidv4(),
                        scene_id: targetScene.scene_id + 1,
                        script: part2,
                        visual_prompt: targetScene.visual_prompt,
                        video_prompt: targetScene.video_prompt,
                        duration: Math.max(2.0, Number((targetScene.duration || 3.5) / 2)),
                        audioStatus: 'idle',
                        visualStatus: 'idle',
                        renderStatus: 'idle',
                        viewMode: 'source'
                    };

                    const nextScenes = [...scenes];
                    nextScenes.splice(idx, 1, newSceneA, newSceneB);
                    const renumbered = nextScenes.map((s, i) => ({ ...s, scene_id: i + 1 }));
                    setScenes(renumbered);
                    toast.success(`Scene #${targetScene.scene_id}이 2개 씬으로 분할되었습니다.`);
                }}
                onBatchFlowImages={handleBatchFlowImages}
                onBatchFlowVideos={handleBatchFlowVideos}
                onExportCapcut={() => setIsExportModalOpen(true)}
                onBatchTTS={handleBatchTTS}
                onRoughCut={handleRoughCut}
                isFlowBatchGenerating={isFlowBatchGenerating}
                onGenerateSceneFlow={(s) => handleGenerateImage(s.scene_id, s.id, s.visual_prompt)}
                onUpdateScene={updateScene}
                scriptInput={scriptInput}
                onScriptInputChange={setScriptInput}
                onGenerateScript={handleGenerateScript}
                isGeneratingScript={isGeneratingScript}
                onApplyStylePromptToAll={(promptText) => {
                    if (!scenes || scenes.length === 0) return;
                    const updated = scenes.map(s => ({
                        ...s,
                        visual_prompt: `${s.visual_prompt || ''}, ${promptText}`.trim()
                    }));
                    setScenes(updated);
                    toast.success(`전체 ${scenes.length}개 씬에 [${promptText}] 화풍이 적용되었습니다.`);
                }}
            />

            {/* Zone 3: Master Scene Board Container (롱폼 대규모 씬 스마트 관리 시스템) */}
            <Card id="scene-board-container" className="border rounded-2xl shadow-sm bg-card border-border overflow-hidden flex flex-col transition-all">
                {/* 1. Master Sticky Header */}
                <div className="bg-card p-3 sm:p-3.5 border-b border-border space-y-2.5">
                    {/* Row 1: Title, Project Folder, View Mode Switcher, Screen Ratio, Delete All */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-foreground">
                            <Film className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider">Scene Board</span>
                            <Badge variant="secondary" className="h-5 text-[11px] font-bold bg-primary/10 text-primary">
                                {filteredScenes.length} / {scenes.length} Scenes
                            </Badge>
                            
                            {/* Project Selector Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-[11px] font-bold bg-primary/5 hover:bg-primary/10 text-primary gap-1.5 border-primary/20 shadow-2xs rounded-md"
                                        title="작업 프로젝트 전환 및 관리"
                                    >
                                        <FolderOpen className="w-3 h-3 text-amber-500" />
                                        <span className="max-w-[130px] truncate">{currentProjectName}</span>
                                        <ChevronDown className="w-3 h-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64 max-h-[320px] overflow-y-auto">
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        05_Exports 작업 프로젝트
                                    </div>
                                    <DropdownMenuSeparator />
                                    {creativeProjects && creativeProjects.length > 0 ? (
                                        creativeProjects.map((p: any) => (
                                            <DropdownMenuItem
                                                key={p.name}
                                                onClick={() => handleSwitchProject(p.name)}
                                                className={`flex items-center justify-between text-xs cursor-pointer py-1.5 ${p.name === currentProjectName ? 'bg-primary/10 font-bold text-primary' : ''}`}
                                            >
                                                <div className="flex flex-col gap-0.5 truncate max-w-[170px]">
                                                    <span className="truncate">{p.name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-normal truncate">
                                                        {p.scene_count > 0 ? `${p.scene_count}개 씬` : '씬 없음'} • {p.updated_at?.split(' ')[0]}
                                                    </span>
                                                </div>
                                                {p.name === currentProjectName && (
                                                    <Badge variant="default" className="h-4 px-1 text-[9px] font-bold">
                                                        현재
                                                    </Badge>
                                                )}
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                                            프로젝트 없음
                                        </div>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setIsProjectManagerOpen(true)}
                                        className="text-xs font-bold text-primary cursor-pointer flex items-center gap-1.5 py-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>새 프로젝트 생성...</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setIsProjectManagerOpen(true)}
                                        className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-1.5 py-1.5"
                                    >
                                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                                        <span>전체 프로젝트 관리자 열기...</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Compact Open Folder in Explorer Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        const apiObj = (window as any).electronAPI;
                                        if (apiObj?.openProjectFolder) {
                                            const res = await apiObj.openProjectFolder(currentProjectName);
                                            if (res?.success) toast.success(`폴더 열기: 05_Exports/${currentProjectName}`);
                                        } else if (apiObj?.openWorkFolder) {
                                            await apiObj.openWorkFolder();
                                        }
                                    } catch (e: any) {
                                        toast.error("폴더 열기 실패: " + e.message);
                                    }
                                }}
                                className="h-6 px-2 text-[11px] font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground gap-1 border-border shadow-2xs rounded-md"
                                title={`05_Exports/${currentProjectName} 폴더 열기`}
                            >
                                <FolderOpen className="w-3 h-3 text-amber-500" />
                                <span>탐색기</span>
                            </Button>
                        </div>

                        {/* View Modes, Screen Ratio & Actions */}
                        <div className="flex items-center gap-2">
                            {/* 3-Way View Mode Switcher */}
                            <div className="flex bg-muted p-0.5 rounded-lg border border-border/70 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setSceneBoardViewMode('card')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${sceneBoardViewMode === 'card' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="상세 카드 뷰 (기본)"
                                >
                                    <LayoutGrid className="w-3 h-3" /> 카드 뷰
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSceneBoardViewMode('list')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${sceneBoardViewMode === 'list' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="컴팩트 리스트 뷰 (엑셀 스프레드시트형 빠른 대본 검수)"
                                >
                                    <List className="w-3 h-3" /> 리스트 뷰
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSceneBoardViewMode('grid')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${sceneBoardViewMode === 'grid' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="스토리보드 그리드 뷰 (비주얼 흐름 파악)"
                                >
                                    <Grid3X3 className="w-3 h-3" /> 그리드 뷰
                                </button>
                            </div>

                            <div className="flex items-center space-x-1.5 bg-muted/40 px-2 py-0.5 rounded-lg border border-border shrink-0">
                                <Label className="text-[11px] font-semibold whitespace-nowrap">비율:</Label>
                                <Select value={segmentMode} onValueChange={setSegmentMode}>
                                    <SelectTrigger className="w-[124px] h-7 text-xs bg-background whitespace-nowrap">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="shorts">📱 9:16 쇼츠</SelectItem>
                                        <SelectItem value="video">📺 16:9 비디오</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleMergeScenes} disabled={isMerging}>
                                {isMerging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Film className="w-3 h-3" />}
                                영상 통합
                            </Button>

                            {/* [삭제 및 초기화 드롭다운] */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1 text-red-600 dark:text-red-400 border-red-200 dark:border-red-950/60 bg-red-500/5 hover:bg-red-500/15 shadow-2xs"
                                        disabled={scenes.length === 0}
                                        title="생성물 종류별 삭제 또는 프로젝트 전체 삭제"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>삭제/초기화 ▼</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-popover border-border shadow-xl z-50">
                                    <DropdownMenuItem onClick={handleClearAllAudio} className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer py-1.5 focus:bg-blue-500/10">
                                        <Mic className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                        <span className="font-semibold">음성(TTS) & 자막 전체 삭제</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleClearAllImages} className="text-xs text-purple-600 dark:text-purple-400 cursor-pointer py-1.5 focus:bg-purple-500/10">
                                        <Sparkles className="w-3.5 h-3.5 mr-2 text-purple-500" />
                                        <span className="font-semibold">이미지 전체 삭제</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleClearAllVideos} className="text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer py-1.5 focus:bg-indigo-500/10">
                                        <Film className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                                        <span className="font-semibold">영상 전체 삭제</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleResetScenes} className="text-xs text-red-600 dark:text-red-400 font-bold cursor-pointer py-1.5 focus:bg-red-500/10">
                                        <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
                                        <span>모든 씬 & 프로젝트 전체 삭제</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Row 2: Search, Filters & Batch Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        {/* Search & Status Filters */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-[280px]">
                            <div className="relative flex-1 max-w-[240px]">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="text"
                                    value={sceneSearchQuery}
                                    onChange={(e) => setSceneSearchQuery(e.target.value)}
                                    placeholder="씬 검색 (대본, 프롬프트, 번호)..."
                                    className="h-7.5 pl-8 pr-2 text-xs bg-background border-border shadow-2xs rounded-lg"
                                />
                            </div>

                            {/* Filter Chips */}
                            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border text-[11px]">
                                <button
                                    onClick={() => setSceneFilterStatus('all')}
                                    className={`px-2 py-0.5 rounded-md font-medium ${sceneFilterStatus === 'all' ? 'bg-background font-bold text-foreground shadow-2xs' : 'text-muted-foreground'}`}
                                >
                                    전체 ({scenes.length})
                                </button>
                                <button
                                    onClick={() => setSceneFilterStatus('uncompleted')}
                                    className={`px-2 py-0.5 rounded-md font-medium ${sceneFilterStatus === 'uncompleted' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold' : 'text-muted-foreground'}`}
                                >
                                    ⚠️ 미완료
                                </button>
                                <button
                                    onClick={() => setSceneFilterStatus('tts_done')}
                                    className={`px-2 py-0.5 rounded-md font-medium ${sceneFilterStatus === 'tts_done' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-muted-foreground'}`}
                                >
                                    🎙️ TTS완료
                                </button>
                                <button
                                    onClick={() => setSceneFilterStatus('video_done')}
                                    className={`px-2 py-0.5 rounded-md font-medium ${sceneFilterStatus === 'video_done' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold' : 'text-muted-foreground'}`}
                                >
                                    🎬 영상완료
                                </button>
                            </div>
                        </div>

                        {/* Batch Action Buttons */}
                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs font-semibold bg-background hover:bg-muted shadow-2xs" onClick={handleBatchTTS}>
                                <Mic className="w-3 h-3 mr-1 text-blue-500" /> 전체 TTS
                            </Button>
                            <Button variant="outline" size="sm" disabled={isFlowBatchGenerating} className="h-7 text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-300/60 dark:border-purple-800/60 hover:bg-purple-500/20 shadow-2xs" onClick={handleBatchFlowImages}>
                                {isFlowBatchGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />} Flow 이미지
                            </Button>
                            <Button variant="outline" size="sm" disabled={isFlowBatchGenerating} className="h-7 text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-300/60 dark:border-indigo-800/60 hover:bg-indigo-500/20 shadow-2xs" onClick={() => handleBatchFlowVideos('all')}>
                                <Film className="w-3 h-3 mr-1" /> Flow 영상
                            </Button>
                            <Button variant="default" size="sm" className="h-7 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs" onClick={() => setIsExportModalOpen(true)}>
                                ✂️ CapCut 내보내기
                            </Button>
                        </div>
                    </div>

                    {/* Row 3: Feature Configuration Buttons (기능별 환경설정 모달 트리거) */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-border/60">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground mr-0.5 flex items-center gap-1">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> 기능별 설정:
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted shadow-2xs gap-1"
                                onClick={() => setIsTTSDialogOpen(true)}
                            >
                                <Mic className="w-3 h-3 text-blue-500" /> 음성(TTS) 설정
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted shadow-2xs gap-1 ${subtitleConfig.enabled ? 'border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10' : ''}`}
                                onClick={() => setIsSubtitleDialogOpen(true)}
                            >
                                <Type className="w-3 h-3 text-amber-500" /> 자막 설정
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-500/10 shadow-2xs gap-1 font-semibold"
                                onClick={handleManualSyncSubtitles}
                                title="오탈자 없는 대본과 음성 재생 시간을 기준으로 정밀 SRT 자막 즉시 생성 및 디스크 동기화"
                            >
                                <RefreshCw className="w-3 h-3" /> 자막 SRT 동기화
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted shadow-2xs gap-1"
                                onClick={() => setIsMotionDialogOpen(true)}
                            >
                                <Film className="w-3 h-3 text-purple-500" /> 카메라 모션
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted shadow-2xs gap-1 ${watermarkConfig?.enabled ? 'border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10' : ''}`}
                                onClick={() => setIsWatermarkDialogOpen(true)}
                            >
                                <Sparkle className="w-3 h-3 text-indigo-500" /> 워터마크 {watermarkConfig?.enabled ? '(ON)' : ''}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted shadow-2xs gap-1 ${transitionConfig?.enabled ? 'border-pink-500/50 text-pink-600 dark:text-pink-400 bg-pink-500/10' : ''}`}
                                onClick={() => setIsTransitionDialogOpen(true)}
                            >
                                <Sparkles className="w-3 h-3 text-pink-500" /> 전환효과 {transitionConfig?.enabled ? '(ON)' : ''}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted shadow-2xs gap-1"
                                onClick={() => setIsAudioDialogOpen(true)}
                            >
                                <Music className="w-3 h-3 text-teal-500" /> BGM / 오디오
                            </Button>
                        </div>
                    </div>

                    {/* Quick Jump Bar (when > 10 scenes) */}
                    {scenes.length > 10 && (
                        <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar border-t border-border/50 text-[10.5px]">
                            <span className="text-muted-foreground font-semibold shrink-0 mr-1">⚡ 씬 점프:</span>
                            {Array.from({ length: Math.ceil(scenes.length / 15) }, (_, pIdx) => {
                                const start = pIdx * 15 + 1;
                                const end = Math.min(scenes.length, (pIdx + 1) * 15);
                                return (
                                    <button
                                        key={pIdx}
                                        type="button"
                                        onClick={() => {
                                            const targetScene = scenes[start - 1];
                                            if (targetScene) handleScrollToScene(targetScene.id);
                                        }}
                                        className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/20 text-muted-foreground hover:text-primary font-mono transition-colors shrink-0"
                                    >
                                        #{start}~#{end}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. Internal Scrollable Body */}
                <div
                    ref={sceneScrollContainerRef}
                    className="h-[640px] max-h-[calc(100vh-260px)] overflow-y-auto p-3 space-y-2.5 bg-muted/5 select-text"
                >
                    {/* Empty State Banner when no scenes match */}
                    {filteredScenes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border/80 rounded-xl bg-card/50 my-2">
                            <Clapperboard className="w-12 h-12 text-muted-foreground/30 mb-3" />
                            {scenes.length === 0 ? (
                                <>
                                    <h3 className="text-sm font-bold text-foreground mb-1">등록된 씬이 없습니다</h3>
                                    <p className="text-xs text-muted-foreground max-w-md mb-4 leading-relaxed">
                                        상단 <strong>[📜 대본 작업실]</strong>에서 대본을 입력하고 [🎬 씬 분할 시작]을 누르거나,<br />
                                        아래 버튼을 눌러 직접 첫 번째 씬을 추가하세요.
                                    </p>
                                    <Button onClick={handleAddScene} size="sm" className="h-8 text-xs font-bold gap-1.5 shadow-sm bg-primary text-primary-foreground">
                                        <Plus className="w-4 h-4" /> 첫 번째 씬 추가하기
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-sm font-bold text-foreground mb-1">일치하는 씬이 없습니다</h3>
                                    <p className="text-xs text-muted-foreground max-w-md mb-4">
                                        입력하신 검색어 또는 선택하신 상태 필터 조건에 해당하는 씬이 없습니다.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSceneSearchQuery('');
                                            setSceneFilterStatus('all');
                                        }}
                                        className="h-8 text-xs font-semibold"
                                    >
                                        검색 & 필터 초기화
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Mode A: Card View (Detail Compact) */}
                    {sceneBoardViewMode === 'card' && filteredScenes.length > 0 && (
                        <div className="space-y-2.5">
                            {filteredScenes.map((scene, index) => (
                                <React.Fragment key={scene.id}>
                                    {/* Insert Button between scenes */}
                                    <div className="flex justify-center py-0.5 group">
                                        <Button variant="ghost" size="sm" className="rounded-full h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary" onClick={() => handleInsertScene(index)} title="이 위치에 씬 추가">
                                            <Plus className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>

                                    {/* Compact Scene Card */}
                                    <div
                                        id={`scene-${scene.id}`}
                                        className={`flex flex-col md:flex-row border rounded-xl shadow-2xs overflow-hidden bg-card transition-all duration-300 ${highlightedSceneId === scene.id ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                                    >
                                        {/* Left Panel: Inputs (Flex-1) */}
                                        <div className="flex-1 p-3 space-y-2 border-r border-border">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className="h-5 text-[11px] font-bold">Scene #{scene.scene_id}</Badge>
                                                    <Badge variant="secondary" className="h-5 text-[10px]">{segmentMode === 'shorts' ? '9:16' : '16:9'}</Badge>
                                                    {scene.is_manual_asset && (
                                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-[9.5px] h-4.5 gap-0.5 px-1.5">
                                                            <DollarSign className="w-2.5 h-2.5" /> 수동에셋
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex gap-0.5">
                                                    <Button variant="ghost" size="icon" className="h-5.5 w-5.5 text-muted-foreground" onClick={() => handleMoveScene(index, -1)} title="위로 이동"><ChevronUp className="w-3 h-3" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-5.5 w-5.5 text-muted-foreground" onClick={() => handleMoveScene(index, 1)} title="아래로 이동"><ChevronDown className="w-3 h-3" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-5.5 w-5.5 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteScene(scene.id)} title="씬 삭제"><Trash2 className="w-3 h-3" /></Button>
                                                </div>
                                            </div>

                                            {/* Script Section */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-[11px] font-bold text-muted-foreground">대본 (SCRIPT / AUDIO)</Label>
                                                    <Button variant="ghost" size="sm" className="h-5.5 text-[11px] px-2" onClick={() => handleGenerateTTS(scene)} disabled={scene.audioStatus === 'generating'}>
                                                        {scene.audioStatus === 'generating' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Music className="w-3 h-3 mr-1" />}
                                                        {scene.audio_url ? "TTS 재생성" : "TTS 생성"}
                                                    </Button>
                                                </div>
                                                <Textarea
                                                    value={scene.script}
                                                    onChange={(e) => updateScene(scene.id, { script: e.target.value })}
                                                    onKeyDown={(e) => handleScriptKeyDown(e, index)}
                                                    className="min-h-[55px] max-h-[85px] text-xs leading-relaxed resize-y p-2"
                                                    placeholder="대본을 입력하세요... (Ctrl+Enter: 분할, Ctrl+Backspace: 병합)"
                                                />
                                                {scene.audio_url && (
                                                    <div className="flex items-center gap-1.5 mt-0.5 bg-muted/20 p-1 rounded-md">
                                                        <audio controls src={scene.audio_url} className="h-5 w-full" />
                                                        <Button variant="ghost" size="icon" className="h-5.5 w-5.5" onClick={() => triggerDownload(scene.audio_url!, `scene_${scene.scene_id}_audio.mp3`)}>
                                                            <Download className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Visual/Video Prompt Section */}
                                            <div className="space-y-1.5 flex-1 flex flex-col">
                                                <div className="space-y-0.5 flex-1 flex flex-col">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-[11px] font-bold text-muted-foreground">이미지 프롬프트 (IMAGE)</Label>
                                                        <Button variant="ghost" size="sm" className="h-5 text-[10.5px] px-1.5" onClick={() => handleGeneratePrompt(scene)}>
                                                            <Sparkles className="w-2.5 h-2.5 mr-1 text-purple-500" /> AI 프롬프트 생성
                                                        </Button>
                                                    </div>
                                                    <Textarea
                                                        value={scene.visual_prompt}
                                                        onChange={(e) => updateScene(scene.id, { visual_prompt: e.target.value })}
                                                        className="min-h-[45px] max-h-[70px] text-xs font-mono leading-relaxed resize-y bg-muted/10 p-1.5"
                                                        placeholder="이미지 생성 구도, 배경, 피사체 묘사..."
                                                        disabled={scene.is_continuous_motion}
                                                    />
                                                </div>
                                                <div className="space-y-0.5 flex-1 flex flex-col">
                                                    <Label className="text-[11px] font-bold text-muted-foreground">영상 프롬프트 (VIDEO MOTION)</Label>
                                                    <Textarea
                                                        value={scene.video_prompt || ''}
                                                        onChange={(e) => updateScene(scene.id, { video_prompt: e.target.value })}
                                                        className="min-h-[40px] max-h-[60px] text-xs font-mono leading-relaxed resize-y bg-muted/10 p-1.5"
                                                        placeholder="카메라 무빙 및 피사체 움직임..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Panel: Visual Source (Compact Slim Player) */}
                                        <div className="w-full md:w-[320px] lg:w-[340px] bg-muted/10 p-2.5 flex flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-border">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-bold text-muted-foreground flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-foreground font-semibold text-[11px]">
                                                        <ImageIcon className="w-3 h-3 text-primary" /> 비주얼 플레이어
                                                    </div>
                                                    {index > 0 && (
                                                        <Label className="flex items-center gap-1 mt-0.5 cursor-pointer hover:text-primary transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={scene.is_continuous_motion || false} 
                                                                onChange={(e) => updateScene(scene.id, { is_continuous_motion: e.target.checked })}
                                                                className="rounded border-gray-400 text-primary focus:ring-primary w-2.5 h-2.5" 
                                                            />
                                                            <span className="text-[9.5px] whitespace-nowrap">이전 씬 프레임 연결</span>
                                                        </Label>
                                                    )}
                                                </div>
                                                {(scene.video_url && scene.media_url) && (
                                                    <div className="flex bg-muted/80 rounded-md p-0.5 border shadow-2xs gap-0.5">
                                                        <Button
                                                            variant={scene.viewMode !== 'render' ? 'secondary' : 'ghost'}
                                                            size="sm"
                                                            className={`h-5 text-[10px] px-2 font-semibold transition-all ${scene.viewMode !== 'render' ? 'bg-background shadow-2xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                                            onClick={() => updateScene(scene.id, { viewMode: 'source' })}
                                                        >
                                                            이미지
                                                        </Button>
                                                        <Button
                                                            variant={scene.viewMode === 'render' ? 'secondary' : 'ghost'}
                                                            size="sm"
                                                            className={`h-5 text-[10px] px-2 font-semibold transition-all ${scene.viewMode === 'render' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                                                            onClick={() => updateScene(scene.id, { viewMode: 'render' })}
                                                        >
                                                            영상
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Media Preview Container (h-[135px]) */}
                                            <div className="w-full h-[135px] bg-slate-950 rounded-lg overflow-hidden border border-border/80 shadow-inner relative group flex items-center justify-center">
                                                {scene.viewMode === 'render' && scene.video_url ? (
                                                    <video src={scene.video_url} controls className="w-full h-full object-contain" />
                                                ) : scene.media_url ? (
                                                    scene.media_url.endsWith('.mp4') ?
                                                        <video src={scene.media_url} controls className="w-full h-full object-contain" /> :
                                                        <img src={scene.media_url} alt="Source" className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                                                        <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                                        <span className="text-[11px] font-medium">미디어 대기 중</span>
                                                    </div>
                                                )}

                                                {scene.visualStatus === 'generating' && (
                                                    <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10 gap-1.5 p-1.5 text-center">
                                                        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                                        <span className="text-[11px] font-bold animate-pulse">생성 중...</span>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-5 text-[9px] text-zinc-300 hover:text-white hover:bg-white/20 px-1.5 py-0 border border-white/20 rounded"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateScene(scene.id, { visualStatus: scene.media_url ? 'completed' : 'idle' });
                                                                toast.info(`Scene #${scene.scene_id} 생성을 취소했습니다.`);
                                                            }}
                                                        >
                                                            취소
                                                        </Button>
                                                    </div>
                                                )}

                                                {(scene.video_url || scene.media_url) && (
                                                    <Button variant="secondary" size="icon" className="absolute top-1.5 right-1.5 h-6 w-6 bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                                                        onClick={() => triggerDownload(scene.video_url || scene.media_url!, `scene_${scene.scene_id}_media`)}>
                                                        <Download className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Control Grid (Compact) */}
                                            <div className="grid grid-cols-2 gap-1.5 mt-auto">
                                                <Button variant="outline" size="sm" className="h-7 text-[11px] font-medium" onClick={() => handleGenerateImage(scene.scene_id, scene.id, scene.visual_prompt)} disabled={scene.visualStatus === 'generating' || scene.is_continuous_motion}>
                                                    {scene.visualStatus === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />} 이미지 생성
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-7 text-[11px] font-medium" onClick={() => handleGenerateVideo(scene)} disabled={scene.visualStatus === 'generating'}>
                                                    {scene.visualStatus === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Film className="w-3 h-3 mr-1" />} 영상 생성
                                                </Button>
                                                
                                                <div className="relative col-span-2">
                                                    <Button variant="outline" size="sm" className={`w-full h-7 text-[11px] font-medium ${scene.is_manual_asset ? 'border-green-500 bg-green-500/10' : ''}`}>
                                                        <Upload className="w-3 h-3 mr-1" /> {scene.is_manual_asset ? '수동 에셋 변경' : '수동 에셋 업로드'}
                                                    </Button>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleVideoUpload(scene.scene_id, scene.id, e)} />
                                                </div>

                                                <Button
                                                    className="w-full h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-2xs col-span-2"
                                                    onClick={() => handleRenderScene(scene)}
                                                    disabled={scene.renderStatus === 'generating'}
                                                >
                                                    {scene.renderStatus === 'generating' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Clapperboard className="w-3.5 h-3.5 mr-1.5" />}
                                                    씬 영상 렌더링
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Mode B: Compact List/Table View (엑셀 스프레드시트형 빠른 대본 검수) */}
                    {sceneBoardViewMode === 'list' && filteredScenes.length > 0 && (
                        <div className="bg-card border rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-muted/60 text-muted-foreground border-b select-none">
                                    <tr>
                                        <th className="p-2 w-12 text-center">#</th>
                                        <th className="p-2 w-24">미디어</th>
                                        <th className="p-2">대본 (직접 수정)</th>
                                        <th className="p-2 w-48">프롬프트</th>
                                        <th className="p-2 w-16 text-center">길이</th>
                                        <th className="p-2 w-40 text-center">액션</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredScenes.map((scene, index) => (
                                        <tr
                                            key={scene.id}
                                            id={`scene-${scene.id}`}
                                            className={`hover:bg-muted/30 transition-colors ${highlightedSceneId === scene.id ? 'bg-blue-500/15' : ''}`}
                                        >
                                            <td className="p-2 font-mono font-bold text-center text-primary">
                                                #{scene.scene_id}
                                            </td>
                                            <td className="p-2">
                                                <div className="w-20 h-11 bg-slate-950 rounded overflow-hidden flex items-center justify-center border">
                                                    {scene.video_url ? (
                                                        <video src={scene.video_url} className="w-full h-full object-cover" />
                                                    ) : scene.media_url ? (
                                                        <img src={scene.media_url} alt="Thumbnail" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={scene.script}
                                                    onChange={(e) => updateScene(scene.id, { script: e.target.value })}
                                                    className="w-full h-8 px-2 bg-background border rounded text-xs text-foreground focus:outline-hidden focus:border-primary"
                                                    placeholder="대본 입력..."
                                                />
                                            </td>
                                            <td className="p-2">
                                                <span className="text-[11px] font-mono text-muted-foreground line-clamp-2" title={scene.visual_prompt}>
                                                    {scene.visual_prompt || '—'}
                                                </span>
                                            </td>
                                            <td className="p-2 font-mono text-center text-muted-foreground text-[11px]">
                                                {scene.duration || 3.5}s
                                            </td>
                                            <td className="p-2">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10.5px]" onClick={() => handleGenerateTTS(scene)} title="TTS">
                                                        <Mic className="w-3 h-3 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10.5px]" onClick={() => handleGenerateImage(scene.scene_id, scene.id, scene.visual_prompt)} title="이미지 생성">
                                                        <Sparkles className="w-3 h-3 text-purple-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10.5px]" onClick={() => handleGenerateVideo(scene)} title="영상 변환">
                                                        <Film className="w-3 h-3 text-indigo-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteScene(scene.id)} title="삭제">
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Mode C: Storyboard Grid View (썸네일 바둑판 비주얼 흐름 파악) */}
                    {sceneBoardViewMode === 'grid' && filteredScenes.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                            {filteredScenes.map((scene) => (
                                <div
                                    key={scene.id}
                                    id={`scene-${scene.id}`}
                                    className={`bg-card border rounded-xl overflow-hidden shadow-2xs flex flex-col group hover:border-primary transition-all ${highlightedSceneId === scene.id ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
                                >
                                    <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                                        {scene.video_url ? (
                                            <video src={scene.video_url} className="w-full h-full object-cover" />
                                        ) : scene.media_url ? (
                                            <img src={scene.media_url} alt="Scene" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                                        )}
                                        <Badge variant="secondary" className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                                            #{scene.scene_id}
                                        </Badge>
                                        <span className="absolute bottom-1 right-1.5 text-[9.5px] font-mono text-white/80 bg-black/60 px-1 rounded">
                                            {scene.duration || 3.5}s
                                        </span>
                                    </div>
                                    <div className="p-2 flex-1 flex flex-col justify-between gap-1.5">
                                        <p className="text-[11px] line-clamp-2 leading-relaxed text-foreground" title={scene.script}>
                                            {scene.script || '— 대본 없음 —'}
                                        </p>
                                        <div className="flex items-center justify-between pt-1 border-t border-border/60">
                                            <span className="text-[9.5px] text-muted-foreground">
                                                {scene.audio_url ? '🎙️ 음성완료' : '음성대기'}
                                            </span>
                                            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] font-bold" onClick={() => handleGenerateImage(scene.scene_id, scene.id, scene.visual_prompt)}>
                                                생성
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Scene Button (Slim Minimal) */}
                    <Button
                        variant="outline"
                        className="w-full h-9 border-dashed border-2 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors text-xs font-semibold rounded-xl"
                        onClick={handleAddScene}
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> 새로운 씬 추가하기
                    </Button>
                </div>
            </Card>

                {/* TTS Dialog & Modals */}
                <TTSSettingsDialog
                    open={isTTSDialogOpen}
                    onOpenChange={setIsTTSDialogOpen}
                    initialConfig={ttsConfig}
                    onSave={(cfg) => {
                        setTTSConfig(cfg);
                        ttsConfigRef.current = cfg;
                        localStorage.setItem('viral_loop_tts_config', JSON.stringify(cfg));
                        toast.success(`TTS 설정이 저장되었습니다. (엔진: ${cfg.engine || '기본'}, 목소리: ${cfg.voice_id || '기본'})`);
                    }}
                />

                <MotionSettingsDialog
                    open={isMotionDialogOpen}
                    onOpenChange={setIsMotionDialogOpen}
                    initialConfig={motionConfig}
                    onSave={(cfg) => {
                        setMotionConfig(cfg);
                        toast.success("모션 설정이 저장되었습니다.");
                    }}
                />

                <SubtitleSettingsDialog
                    open={isSubtitleDialogOpen}
                    onOpenChange={setIsSubtitleDialogOpen}
                    initialConfig={subtitleConfig}
                    onSave={(cfg) => {
                        setSubtitleConfig(cfg);
                        toast.success("자막 설정이 저장되었습니다.");
                        // 설정된 분절 규칙(splitLimit, maxLines 등)으로 즉시 자막 재분절 & 타임라인 동기화
                        syncSubtitlesToDisk(scenes, cfg);
                    }}
                />

                <AudioSettingsDialog
                    open={isAudioDialogOpen}
                    onOpenChange={setIsAudioDialogOpen}
                    initialConfig={audioConfig}
                    onSave={(newConfig) => {
                        setAudioConfig(newConfig);
                        toast.success("오디오 설정이 저장되었습니다.");
                    }}
                />

                {/* Style Management Dialog */}
                <Dialog open={isStyleDialogOpen} onOpenChange={setIsStyleDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingStyle.id ? "지침서 수정" : "새 지침서 만들기"}</DialogTitle>
                            <DialogDescription>AI 작가에게 부여할 역할과 지침을 설정합니다.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>이름 (Name)</Label>
                                <Input value={editingStyle.name} onChange={(e) => setEditingStyle({ ...editingStyle, name: e.target.value })} placeholder="예: 영화 요약 작가" />
                            </div>
                            <div className="space-y-2">
                                <Label>시스템 지침 (System Instruction)</Label>
                                <Textarea
                                    value={editingStyle.system_instruction}
                                    onChange={(e) => setEditingStyle({ ...editingStyle, system_instruction: e.target.value })}
                                    placeholder="AI에게 부여할 역할과 규칙을 상세히 적어주세요."
                                    className="min-h-[150px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>예시 출력 (Sample Output) - 선택사항</Label>
                                <Textarea
                                    value={editingStyle.sample_text}
                                    onChange={(e) => setEditingStyle({ ...editingStyle, sample_text: e.target.value })}
                                    placeholder="AI가 참고할 예시 출력 형식을 적어주세요."
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between w-full">
                            {editingStyle.id ? (
                                <Button variant="destructive" onClick={() => {
                                    if (confirm("정말 이 지침서를 삭제하시겠습니까?")) {
                                        deleteStyleMutation.mutate(Number(editingStyle.id));
                                        setIsStyleDialogOpen(false);
                                    }
                                }}>
                                    <Trash2 className="w-4 h-4 mr-2" /> 삭제
                                </Button>
                            ) : <div></div>}
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsStyleDialogOpen(false)}>취소</Button>
                                <Button onClick={handleSaveStyle}>저장</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            
            <StyleGalleryModal
                open={isStyleGalleryOpen}
                onOpenChange={setIsStyleGalleryOpen}
                onSelectStyle={(style) => {
                    // "웹툰/만화" 키워드가 들어가면 글자나 말풍선이 생성될 확률이 높으므로 방지 키워드 추가
                    const antiTextModifier = ", textless, no text, no speech bubbles, no comic panels";
                    setStylePrompt(style.prompt_en + antiTextModifier);
                    setPresetName(style.name_ko);
                    
                    // 부정 프롬프트가 비어있다면 글자 방지 기본값 세팅
                    setNegativePrompt(prev => prev || "text, words, fonts, speech bubbles, dialog, comic panels, watermark, signature, UI");
                }}
            />
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleCapCutExport}
                projectName="creative_studio"
                loading={exportLoading}
                exportPhase={exportPhase}
                hasSubtitles={scenes.some(seg => seg.script && seg.script.trim().length > 0)}
                onUpgradeClick={() => { /* Handled elsewhere if needed */ }}
            />

            {/* Watermark Dialog */}
            <WatermarkSettingsDialog
                open={isWatermarkDialogOpen}
                onOpenChange={setIsWatermarkDialogOpen}
                config={watermarkConfig}
                onChange={setWatermarkConfig}
            />

            {/* Transition Dialog */}
            <TransitionSettingsDialog
                open={isTransitionDialogOpen}
                onOpenChange={setIsTransitionDialogOpen}
                config={transitionConfig}
                onChange={setTransitionConfig}
            />

            {/* [NEW] Selective Video Conversion Dialog */}
            <Dialog open={isSelectiveVideoModalOpen} onOpenChange={setIsSelectiveVideoModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
                            Flow 조건부 선택적 영상(I2V) 변환
                        </DialogTitle>
                        <DialogDescription>
                            이미지가 생성된 씬 중 원하는 조건에 부합하는 씬만 선별하여 비디오로 변환합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">변환 조건 선택 (Strategy)</Label>
                            <Select value={selectiveVideoStrategy} onValueChange={(val: any) => setSelectiveVideoStrategy(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="조건 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="first_n">🎯 초반 후킹 (시작 N개 씬 변환)</SelectItem>
                                    <SelectItem value="first_seconds">⏱️ 시작 N초 분량 변환 (약 1분간)</SelectItem>
                                    <SelectItem value="interval">🔀 간격 변환 (N개 씬마다 1개씩)</SelectItem>
                                    <SelectItem value="all">🎬 전체 씬 영상 변환</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectiveVideoStrategy === 'first_n' && (
                            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs">시작 씬 개수 (N)</Label>
                                    <span className="text-xs font-bold text-indigo-500">{selectiveVideoN}개 씬</span>
                                </div>
                                <Input
                                    type="number"
                                    min={1}
                                    max={scenes.length || 10}
                                    value={selectiveVideoN}
                                    onChange={(e) => setSelectiveVideoN(Number(e.target.value))}
                                    className="h-8"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    도입부 1~{selectiveVideoN}번 씬에 영상 모션을 주어 시청 지속시간을 극대화합니다.
                                </p>
                            </div>
                        )}

                        {selectiveVideoStrategy === 'first_seconds' && (
                            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs">시작 시간 (초)</Label>
                                    <span className="text-xs font-bold text-indigo-500">{selectiveVideoSeconds}초 ({Math.round(selectiveVideoSeconds / 60)}분)</span>
                                </div>
                                <Input
                                    type="number"
                                    min={5}
                                    max={600}
                                    step={5}
                                    value={selectiveVideoSeconds}
                                    onChange={(e) => setSelectiveVideoSeconds(Number(e.target.value))}
                                    className="h-8"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    영상 시작 후 누적 재생시간 {selectiveVideoSeconds}초 이내에 해당하는 씬들만 비디오로 변환합니다.
                                </p>
                            </div>
                        )}

                        {selectiveVideoStrategy === 'interval' && (
                            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs">간격 단위 (씬)</Label>
                                    <span className="text-xs font-bold text-indigo-500">{selectiveVideoInterval}씬마다 1개</span>
                                </div>
                                <Input
                                    type="number"
                                    min={2}
                                    max={10}
                                    value={selectiveVideoInterval}
                                    onChange={(e) => setSelectiveVideoInterval(Number(e.target.value))}
                                    className="h-8"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    {selectiveVideoInterval}개 씬마다 1개씩 비디오로 변환하고 나머지는 정지 이미지(Ken Burns 모션)를 유지합니다.
                                </p>
                            </div>
                        )}

                        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
                            💡 <strong>안내:</strong> 이미지가 먼저 생성된 씬만 비디오로 변환됩니다. 변환 완료 시 타임라인과 플레이어에서 즉시 비디오 프리뷰가 재생됩니다.
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsSelectiveVideoModalOpen(false)}>
                            취소
                        </Button>
                        <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => handleBatchFlowVideos()}
                        >
                            <Film className="w-4 h-4 mr-1" /> 선택 조건으로 영상 생성 시작
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 05_Exports 작업 프로젝트 관리자 & 검색 다이얼로그 */}
            <ProjectManagerDialog
                open={isProjectManagerOpen}
                onOpenChange={setIsProjectManagerOpen}
                currentProjectName={currentProjectName}
                onSelectProject={handleSwitchProject}
                onCreateProject={handleCreateProjectModal}
            />
        </div >
    );
};

export default CreativeStudio;