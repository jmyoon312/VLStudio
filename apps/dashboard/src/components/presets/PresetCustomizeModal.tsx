import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Sliders, Copy, Save, Sparkles, X, Plus, Type, Eye, Trash2, Check,
    Layers, Clock, Volume2, BookOpen, Film, Flame, Shield, HelpCircle,
    RotateCcw, Sparkle, Video, ExternalLink, Split, Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { SovereignPreset } from './PresetLibraryModal';

interface PresetCustomizeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preset: SovereignPreset | null;
    onPresetUpdated: (updatedPreset: SovereignPreset) => void;
}

export const PresetCustomizeModal: React.FC<PresetCustomizeModalProps> = ({
    open,
    onOpenChange,
    preset,
    onPresetUpdated,
}) => {
    const navigate = useNavigate();
    const [inspectorTab, setInspectorTab] = useState<'visual' | 'pacing' | 'audio' | 'bible'>('visual');

    // 🌟 A/B Onion Skin Comparison View Mode: 'preset' (복제 레이어) | 'original' (원본 캡처) | 'overlay' (1:1 반투명 겹침)
    const [previewViewMode, setPreviewViewMode] = useState<'preset' | 'original' | 'overlay'>('preset');
    const [overlayOpacity, setOverlayOpacity] = useState<number>(50);
    const [refThumbnailUrl, setRefThumbnailUrl] = useState<string>('');
    const [exportingCapcut, setExportingCapcut] = useState<boolean>(false);

    // 🌟 CapCut Draft Design Injection State (픽셀링/기존 캡컷 드래프트에 이 프리셋 입히기)
    const [injectModalOpen, setInjectModalOpen] = useState<boolean>(false);
    const [capcutDraftsList, setCapcutDraftsList] = useState<any[]>([]);
    const [loadingDrafts, setLoadingDrafts] = useState<boolean>(false);
    const [injectingDraft, setInjectingDraft] = useState<boolean>(false);

    // 1. Basic Metadata
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [recipe, setRecipe] = useState('');
    const [contentRules, setContentRules] = useState<string[]>([]);
    const [newRuleInput, setNewRuleInput] = useState('');

    // 2. Visual Geometry (6-Tier Layers)
    const [topBarHeightPct, setTopBarHeightPct] = useState<number>(18.3);
    const [topBarBgColor, setTopBarBgColor] = useState<string>('#000000');
    
    // Top 2-Tier Header Lines
    const [headerLine1Text, setHeaderLine1Text] = useState<string>('여돌들 중 누가');
    const [headerLine1Color, setHeaderLine1Color] = useState<string>('#FFFFFF');
    const [headerLine1Size, setHeaderLine1Size] = useState<number>(28);

    const [headerLine2Text, setHeaderLine2Text] = useState<string>('진짜 대식가일까?');
    const [headerLine2Color, setHeaderLine2Color] = useState<string>('#F5F420');
    const [headerLine2Size, setHeaderLine2Size] = useState<number>(32);

    // Caption (본문 자막 & 바이링구얼 자막)
    const [captionText, setCaptionText] = useState<string>('하루에 라면 8봉지 기본으로 먹는데');
    const [fontSize, setFontSize] = useState<number>(64);
    const [captionColor, setCaptionColor] = useState<string>('#FFFFFF');
    const [outlineColor, setOutlineColor] = useState<string>('#000000');
    const [outlinePx, setOutlinePx] = useState<number>(6);
    const [captionMarginBottom, setCaptionMarginBottom] = useState<number>(32);

    // Bilingual Caption (이중 언어 자막: 영문 원어 노랑 + 국문 번역 흰색)
    const [bilingualEnabled, setBilingualEnabled] = useState<boolean>(false);
    const [captionLine1En, setCaptionLine1En] = useState<string>('You have two kids.');
    const [captionLine1Color, setCaptionLine1Color] = useState<string>('#FFE838');
    const [captionLine2Ko, setCaptionLine2Ko] = useState<string>('아이가 둘 있으시죠.');
    const [captionLine2Color, setCaptionLine2Color] = useState<string>('#FFFFFF');

    // Reference Video Frame URL
    const [videoBgUrl, setVideoBgUrl] = useState<string>('');

    // Jab Hook (돌발 쨉쨉이)
    const [jabEnabled, setJabEnabled] = useState<boolean>(true);
    const [jabText, setJabText] = useState<string>('⚡ 진짜 대식가 ⚡');
    const [jabColor, setJabColor] = useState<string>('#F5F420');
    const [jabInterval, setJabInterval] = useState<number>(8.5);
    const [jabTilt, setJabTilt] = useState<number>(-4);

    // Bottom Source & Bar
    const [bottomSourceEnabled, setBottomSourceEnabled] = useState<boolean>(true);
    const [bottomSourceText, setBottomSourceText] = useState<string>('출처: 원본 비하인드 공식 영상');
    const [bottomBarHeightPct, setBottomBarHeightPct] = useState<number>(6.0);

    // 3. Editing Pacing
    const [zoomPct, setZoomPct] = useState<number>(112);
    const [openingZoomDuration, setOpeningZoomDuration] = useState<number>(2.5);
    const [avgCutSec, setAvgCutSec] = useState<number>(2.66);
    const [cameraPulseOnJab, setCameraPulseOnJab] = useState<boolean>(true);

    // 4. Audio DSP
    const [wpm, setWpm] = useState<number>(410);
    const [silenceCutS, setSilenceCutS] = useState<number>(0.15);
    const [bgmVolumeDb, setBgmVolumeDb] = useState<number>(-20.0);
    const [vocalDucking, setVocalDucking] = useState<boolean>(true);

    // 5. 17-Tier Full Bible Data
    const [fullBible, setFullBible] = useState<any>({});

    // Clone Modal/Field
    const [cloneName, setCloneName] = useState('');
    const [saving, setSaving] = useState(false);

    // Selected Bible section for interactive accordion view
    const [selectedBibleSection, setSelectedBibleSection] = useState<string | null>(null);

    useEffect(() => {
        if (!preset) return;

        // 1. Basic Metadata
        setName(preset.name || '');
        setCategory(preset.category || 'custom');
        setRecipe(preset.recipe || '');
        setContentRules(preset.content_rules || []);
        setCloneName(`${preset.name} (커스텀 복제본)`);

        const style = preset.style || {};
        const vg = style.visual_geometry || {};
        const ep = style.editing_pacing || {};
        const ad = style.audio_dsp || {};
        const bible = style.production_bible_17 || (preset as any).production_bible_17 || {};
        setFullBible(bible);

        // 2. Top Bar & 2-Tier Header
        const topBar = vg.top_bar || style.top_header || {};
        setTopBarHeightPct(topBar.height_pct ?? 18.0);
        setTopBarBgColor(topBar.bg_color || topBar.bar_bg || '#000000');

        const topHeader = style.top_header || {};
        const hLines = vg.top_header_lines || [];

        // Header Line 1
        if (topHeader.line1?.text) {
            setHeaderLine1Text(topHeader.line1.text);
            setHeaderLine1Color(topHeader.line1.color || '#FFFFFF');
            setHeaderLine1Size(topHeader.line1.size_px || 28);
        } else if (hLines[0]?.text_example || hLines[0]?.text) {
            setHeaderLine1Text(hLines[0].text_example || hLines[0].text);
            setHeaderLine1Color(hLines[0].color || '#FFFFFF');
            setHeaderLine1Size(hLines[0].size_px || 28);
        } else {
            setHeaderLine1Text(preset.name || '영상 대제목 1줄');
            setHeaderLine1Color(style.title?.color || '#FFFFFF');
            setHeaderLine1Size(style.title?.size_px ? Math.min(style.title.size_px, 32) : 28);
        }

        // Header Line 2
        if (topHeader.line2?.text) {
            setHeaderLine2Text(topHeader.line2.text);
            setHeaderLine2Color(topHeader.line2.color || '#FFE838');
            setHeaderLine2Size(topHeader.line2.size_px || 32);
        } else if (hLines[1]?.text_example || hLines[1]?.text) {
            setHeaderLine2Text(hLines[1].text_example || hLines[1].text);
            setHeaderLine2Color(hLines[1].color || '#FFE838');
            setHeaderLine2Size(hLines[1].size_px || 32);
        } else {
            setHeaderLine2Text('핵심 훅 명사');
            setHeaderLine2Color('#FFE838');
            setHeaderLine2Size(32);
        }

        // 3. Bilingual Caption
        const bilingual = style.bilingual_caption || {};
        const isBilingual = Boolean(bilingual.enabled || bilingual.primary_en);
        setBilingualEnabled(isBilingual);

        if (bilingual.primary_en?.text) {
            setCaptionLine1En(bilingual.primary_en.text);
            setCaptionLine1Color(bilingual.primary_en.color || '#FFE838');
        } else {
            setCaptionLine1En('');
            setCaptionLine1Color('#FFE838');
        }

        if (bilingual.secondary_ko?.text) {
            setCaptionLine2Ko(bilingual.secondary_ko.text);
            setCaptionLine2Color(bilingual.secondary_ko.color || '#FFFFFF');
        } else {
            setCaptionLine2Ko('');
            setCaptionLine2Color('#FFFFFF');
        }

        // 4. Standard Caption
        const cap = vg.caption || style.caption || {};
        const defaultCaption = isBilingual 
            ? (bilingual.secondary_ko?.text || `${preset.name} 자막`)
            : (cap.example || `${preset.name} 본문 자막`);
        setCaptionText(defaultCaption);
        setFontSize(cap.size_px || 32);
        setCaptionColor(cap.color || '#FFFFFF');
        setOutlineColor(cap.outline_color || '#000000');
        setOutlinePx(cap.outline_px || 6);
        setCaptionMarginBottom(cap.margin_v_pct || 28);

        // 5. Reference Video Frame & Clean Thumbnail
        const resolvedBg = style.video_bg_url || (preset as any).sample_image_url || '';
        setVideoBgUrl(resolvedBg);
        const resolvedThumb = (preset as any).thumbnail_url || (preset as any).sample_image_url || '';
        setRefThumbnailUrl(resolvedThumb);

        // 6. Jab Hook
        const jab = vg.jab_hook || style.jab_hook || {};
        const isJabOn = Boolean(jab.enabled);
        setJabEnabled(isJabOn);
        setJabText(jab.text || (isJabOn ? '⚡ 핵심 강조 키워드 ⚡' : ''));
        setJabColor(jab.color || '#FFE838');
        setJabInterval(jab.avg_interval_sec || 8.5);
        setJabTilt(jab.tilt_deg ?? -4);

        // 7. Bottom Source
        const bot = vg.bottom_source || style.bottom_source || {};
        setBottomSourceEnabled(Boolean(bot.enabled));
        setBottomSourceText(bot.text || `출처: ${preset.name}`);
        setBottomBarHeightPct(vg.bottom_bar?.height_pct ?? 6.0);

        // 8. Editing Pacing
        setZoomPct(Math.round((ep.opening_hook_zoom ?? 1.12) * 100));
        setOpeningZoomDuration(ep.opening_hook_duration_s ?? 2.5);
        setAvgCutSec(ep.avg_cut_sec ?? 2.66);
        setCameraPulseOnJab(ep.camera_pulse_on_jab ?? true);

        // 9. Audio DSP
        setWpm(ad.wpm ?? 410);
        setSilenceCutS(ad.silence_cut_threshold_s ?? 0.15);
        setBgmVolumeDb(ad.bgm_volume_db ?? -20.0);
        setVocalDucking(ad.vocal_ducking ?? true);
    }, [preset, open]);

    if (!preset) return null;

    const handleAddRule = () => {
        const text = newRuleInput.trim();
        if (text && !contentRules.includes(text)) {
            setContentRules([...contentRules, text]);
            setNewRuleInput('');
        }
    };

    const handleRemoveRule = (index: number) => {
        setContentRules(contentRules.filter((_, i) => i !== index));
    };

    const buildFullStylePayload = () => {
        const baseStyle = preset.style || {};
        const updatedVg = {
            canvas_type: 'sandwich',
            top_bar: {
                enabled: true,
                bg_color: topBarBgColor,
                height_pct: topBarHeightPct,
                opacity: 1.0,
            },
            top_header_lines: [
                {
                    line: 1,
                    role: 'condition',
                    color: headerLine1Color,
                    size_px: headerLine1Size,
                    font_style: 'Bold',
                    font_family: 'Pretendard',
                    text_example: headerLine1Text,
                },
                {
                    line: 2,
                    role: 'hook_noun',
                    color: headerLine2Color,
                    size_px: headerLine2Size,
                    font_style: 'ExtraBold',
                    font_family: 'Pretendard',
                    text_example: headerLine2Text,
                },
            ],
            top_title_y_pct: 5.2,
            caption: {
                font_family: 'Pretendard',
                bold: true,
                size_px: fontSize,
                color: captionColor,
                outline_color: outlineColor,
                outline_px: outlinePx,
                position: 'bottom',
                margin_v_pct: captionMarginBottom,
                motion_preset: 'word_pop',
                safe_zone: 'OPTIMAL_68',
            },
            jab_hook: {
                enabled: jabEnabled,
                text: jabText,
                avg_interval_sec: jabInterval,
                color: jabColor,
                bg_color: '#000000',
                tilt_deg: jabTilt,
                y_pct: 41.4,
                size_px: 22,
                symbol: '⚡',
            },
            bottom_source: {
                enabled: bottomSourceEnabled,
                color: '#94A3B8',
                size_px: 13,
                bottom_pct: 2.2,
                text: bottomSourceText,
            },
            bottom_bar: {
                enabled: true,
                bg_color: '#000000',
                height_pct: bottomBarHeightPct,
            },
        };

        const updatedEp = {
            opening_hook_zoom: Number((zoomPct / 100).toFixed(2)),
            opening_hook_duration_s: openingZoomDuration,
            avg_cut_sec: avgCutSec,
            camera_pulse_on_jab: cameraPulseOnJab,
        };

        const updatedAd = {
            voice_profile: 'charismatic_narrator',
            wpm: wpm,
            silence_cut_threshold_s: silenceCutS,
            bgm_volume_db: bgmVolumeDb,
            vocal_ducking: vocalDucking,
        };

        return {
            ...baseStyle,
            schema_version: 2,
            blueprint_name: name,
            output: { size: '1080x1920', fps: 30, aspect_ratio: '9:16' },
            canvas_type: 'LETTERBOX_SOLID',
            video_bg_url: videoBgUrl,
            top_header: {
                enabled: true,
                bar_bg: topBarBgColor,
                height_pct: topBarHeightPct,
                line1: { text: headerLine1Text, color: headerLine1Color, size_px: headerLine1Size },
                line2: { text: headerLine2Text, color: headerLine2Color, size_px: headerLine2Size },
            },
            bilingual_caption: {
                enabled: bilingualEnabled,
                primary_en: { text: captionLine1En, color: captionLine1Color },
                secondary_ko: { text: captionLine2Ko, color: captionLine2Color },
            },
            visual_geometry: updatedVg,
            editing_pacing: updatedEp,
            audio_dsp: updatedAd,
            production_bible_17: fullBible,
            // Backwards compatibility keys
            caption: updatedVg.caption,
            title: {
                enabled: true,
                size_px: headerLine2Size * 2,
                color: headerLine2Color,
                box_color: topBarBgColor,
            },
            video: {
                zoom_pct: zoomPct,
            },
        };
    };

    const handleUpdateCurrent = async () => {
        setSaving(true);
        try {
            const updatedPayload = {
                name,
                category,
                recipe,
                content_rules: [
                    `상단 바 높이: ${topBarHeightPct}%`,
                    `평균 컷 전환 주기: ${avgCutSec}초`,
                    `WPM 발화 속도: ${wpm}`,
                    `자막 세이프존: OPTIMAL_68`,
                    ...contentRules.filter(r => !r.includes('상단 바') && !r.includes('WPM') && !r.includes('컷 전환'))
                ],
                style: buildFullStylePayload(),
            };

            const res = await fetch(`/api/sovereign-presets/${preset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPayload),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`'${name}' 쇼츠 스타일 프리셋이 성공적으로 저장되었습니다.`);
                onPresetUpdated(data.preset);
                onOpenChange(false);
            } else {
                const errData = await res.json();
                toast.error(errData.detail || '프리셋 수정 실패');
            }
        } catch (err) {
            toast.error('프리셋 저장 중 통신 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleCloneAsCustom = async () => {
        if (!cloneName.trim()) {
            toast.error('복제할 프리셋 이름을 입력해 주세요.');
            return;
        }

        setSaving(true);
        try {
            const clonePayload = {
                target_name: cloneName.trim(),
                custom_recipe: recipe,
                custom_style: buildFullStylePayload(),
            };

            const res = await fetch(`/api/sovereign-presets/${preset.id}/clone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clonePayload),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`'${cloneName}' 프리셋으로 독립 복제되었습니다!`);
                onPresetUpdated(data.cloned_preset);
                onOpenChange(false);
            } else {
                const err = await res.json();
                toast.error(err.detail || '프리셋 복제 실패');
            }
        } catch (err) {
            toast.error('프리셋 복제 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const [deleting, setDeleting] = useState(false);

    const handleDeletePreset = async () => {
        if (!preset) return;
        if (!window.confirm(`'${preset.name}' 프리셋을 정말 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/sovereign-presets/${preset.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success(`'${preset.name}' 프리셋이 성공적으로 삭제되었습니다.`);
                onOpenChange(false);
                onPresetUpdated(preset);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || '프리셋 삭제에 실패했습니다.');
            }
        } catch (e) {
            toast.error('프리셋 삭제 중 네트워크 오류가 발생했습니다.');
        } finally {
            setDeleting(false);
        }
    };

    // 🎬 CapCut PC 드래프트 직접 내보내기 & 자동 실행
    const handleExportCapcut = async () => {
        if (!preset) return;
        setExportingCapcut(true);
        try {
            const res = await fetch(`/api/sovereign-presets/${preset.id}/export-capcut`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    custom_style: buildFullStylePayload(),
                }),
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`CapCut 드래프트 '${data.project_name || preset.name}'가 생성되어 열렸습니다!`);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || 'CapCut 프로젝트 내보내기에 실패했습니다.');
            }
        } catch (e) {
            toast.error('CapCut 내보내기 통신 오류가 발생했습니다.');
        } finally {
            setExportingCapcut(false);
        }
    };

    // 🎨 템플릿 디자인 공방으로 이동하여 전문 캔버스 정밀 편집
    const handleOpenInTemplateStudio = () => {
        if (!preset) return;
        onOpenChange(false);
        navigate('/shorts-template', {
            state: {
                presetId: preset.id,
                presetName: preset.name,
                style: buildFullStylePayload(),
            }
        });
    };

    // 💉 캡컷 드래프트 목록 열기 & 디자인 주입
    const handleOpenInjectModal = async () => {
        setInjectModalOpen(true);
        setLoadingDrafts(true);
        try {
            const res = await fetch('/api/sovereign-presets/capcut/drafts');
            if (res.ok) {
                const data = await res.json();
                setCapcutDraftsList(data || []);
            } else {
                toast.error('CapCut 드래프트 목록 조회 실패');
            }
        } catch (e) {
            toast.error('CapCut 드래프트 조회 네트워크 오류');
        } finally {
            setLoadingDrafts(false);
        }
    };

    const handleExecuteInject = async (draftFolder: string, draftName: string) => {
        if (!preset) return;
        if (!window.confirm(`'${draftName}' 프로젝트에 현재 프리셋 디자인을 즉시 입히시겠습니까?\n(기존 draft_content.json은 .bak으로 안전하게 자동 백업됩니다)`)) return;

        setInjectingDraft(true);
        try {
            const res = await fetch(`/api/sovereign-presets/${preset.id}/inject-capcut`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draft_folder: draftFolder,
                    custom_style: buildFullStylePayload(),
                    open_after: true,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`'${draftName}' 드래프트에 스타일이 완벽하게 주입되었습니다! CapCut이 실행됩니다.`);
                setInjectModalOpen(false);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || '디자인 주입 실패');
            }
        } catch (e) {
            toast.error('디자인 주입 통신 오류');
        } finally {
            setInjectingDraft(false);
        }
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 bg-card text-card-foreground border border-border shadow-2xl">
                <DialogHeader className="border-b border-border/60 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-primary" />
                            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                                쇼츠 스타일 상세 설정
                            </DialogTitle>
                        </div>
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            제작 가이드라인 연동
                        </Badge>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                        상하단 레이아웃, 상단 헤더 타이틀, 컷 호흡, 오디오 사운드, 자막 스타일을 실시간으로 조율합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                    {/* Left: 4-Axis Inspector Tabs (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <Tabs value={inspectorTab} onValueChange={(v: any) => setInspectorTab(v)} className="w-full">
                            <TabsList className="grid grid-cols-4 h-9 bg-muted/80 p-1 rounded-xl">
                                <TabsTrigger value="visual" className="text-xs gap-1 data-[state=active]:bg-background data-[state=active]:text-primary font-bold">
                                    <Layers className="w-3.5 h-3.5" />
                                    시각 레이어
                                </TabsTrigger>
                                <TabsTrigger value="pacing" className="text-xs gap-1 data-[state=active]:bg-background data-[state=active]:text-amber-500 font-bold">
                                    <Clock className="w-3.5 h-3.5" />
                                    컷 호흡
                                </TabsTrigger>
                                <TabsTrigger value="audio" className="text-xs gap-1 data-[state=active]:bg-background data-[state=active]:text-emerald-500 font-bold">
                                    <Volume2 className="w-3.5 h-3.5" />
                                    사운드 DSP
                                </TabsTrigger>
                                <TabsTrigger value="bible" className="text-xs gap-1 data-[state=active]:bg-background data-[state=active]:text-indigo-500 font-bold">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    제작 가이드라인
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: Visual Geometry */}
                            <TabsContent value="visual" className="space-y-4 pt-3">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-foreground block mb-1">프리셋 이름</label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-8 text-xs bg-background border-border/80 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-foreground block mb-1">카테고리</label>
                                        <Input
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="h-8 text-xs bg-background border-border/80"
                                        />
                                    </div>
                                </div>

                                {/* Top 2-Tier Header Titles */}
                                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/30 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Type className="w-3.5 h-3.5 text-primary" />
                                            상단 2단 헤더 타이틀 (Top 2-Tier Banner)
                                        </span>
                                        <span className="text-[11px] text-muted-foreground font-mono">
                                            상단 바 높이: {topBarHeightPct}%
                                        </span>
                                    </div>

                                    {/* Line 1 */}
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-6">
                                            <label className="text-[11px] text-muted-foreground block mb-0.5">1단 (조건절/상황)</label>
                                            <Input
                                                value={headerLine1Text}
                                                onChange={(e) => setHeaderLine1Text(e.target.value)}
                                                className="h-7 text-xs bg-background border-border/80"
                                            />
                                        </div>
                                        <div className="col-span-3 flex items-center gap-1.5 pt-4">
                                            <input
                                                type="color"
                                                value={headerLine1Color}
                                                onChange={(e) => setHeaderLine1Color(e.target.value)}
                                                className="w-6 h-6 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                            />
                                            <span className="text-[11px] font-mono">{headerLine1Color}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[11px] text-muted-foreground block mb-0.5">크기 ({headerLine1Size}px)</label>
                                            <Slider
                                                min={20}
                                                max={40}
                                                step={1}
                                                value={[headerLine1Size]}
                                                onValueChange={([v]) => setHeaderLine1Size(v)}
                                            />
                                        </div>
                                    </div>

                                    {/* Line 2 */}
                                    <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-border/40">
                                        <div className="col-span-6">
                                            <label className="text-[11px] text-muted-foreground block mb-0.5">2단 (핵심 훅 명사 - 강조)</label>
                                            <Input
                                                value={headerLine2Text}
                                                onChange={(e) => setHeaderLine2Text(e.target.value)}
                                                className="h-7 text-xs bg-background border-border/80 font-black text-amber-500"
                                            />
                                        </div>
                                        <div className="col-span-3 flex items-center gap-1.5 pt-4">
                                            <input
                                                type="color"
                                                value={headerLine2Color}
                                                onChange={(e) => setHeaderLine2Color(e.target.value)}
                                                className="w-6 h-6 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                            />
                                            <span className="text-[11px] font-mono">{headerLine2Color}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[11px] text-muted-foreground block mb-0.5">크기 ({headerLine2Size}px)</label>
                                            <Slider
                                                min={24}
                                                max={46}
                                                step={1}
                                                value={[headerLine2Size]}
                                                onValueChange={([v]) => setHeaderLine2Size(v)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Caption Style & Bilingual Support */}
                                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/30 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Type className="w-3.5 h-3.5 text-emerald-500" />
                                            본문 자막 (Caption) 스타일
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-muted-foreground">이중 언어(영한) 자막</span>
                                            <Switch checked={bilingualEnabled} onCheckedChange={setBilingualEnabled} />
                                        </div>
                                    </div>

                                    {bilingualEnabled ? (
                                        <div className="space-y-2 pt-1 border-t border-border/40">
                                            {/* Bilingual Line 1 (English) */}
                                            <div className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-8">
                                                    <label className="text-[11px] text-muted-foreground block mb-0.5">1단 영문 원어 (하이라이트)</label>
                                                    <Input
                                                        value={captionLine1En}
                                                        onChange={(e) => setCaptionLine1En(e.target.value)}
                                                        placeholder="English Original..."
                                                        className="h-7 text-xs bg-background border-border/80 font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-4 flex items-center gap-1.5 pt-4">
                                                    <input
                                                        type="color"
                                                        value={captionLine1Color}
                                                        onChange={(e) => setCaptionLine1Color(e.target.value)}
                                                        className="w-6 h-6 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                                    />
                                                    <span className="text-[11px] font-mono">{captionLine1Color}</span>
                                                </div>
                                            </div>

                                            {/* Bilingual Line 2 (Korean) */}
                                            <div className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-8">
                                                    <label className="text-[11px] text-muted-foreground block mb-0.5">2단 국문 번역 (본문)</label>
                                                    <Input
                                                        value={captionLine2Ko}
                                                        onChange={(e) => setCaptionLine2Ko(e.target.value)}
                                                        placeholder="한국어 번역..."
                                                        className="h-7 text-xs bg-background border-border/80 font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-4 flex items-center gap-1.5 pt-4">
                                                    <input
                                                        type="color"
                                                        value={captionLine2Color}
                                                        onChange={(e) => setCaptionLine2Color(e.target.value)}
                                                        className="w-6 h-6 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                                    />
                                                    <span className="text-[11px] font-mono">{captionLine2Color}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Input
                                                value={captionText}
                                                onChange={(e) => setCaptionText(e.target.value)}
                                                placeholder="샘플 자막 텍스트"
                                                className="h-7 text-xs bg-background border-border/80"
                                            />
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-[11px] text-muted-foreground block mb-1">글자색</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={captionColor}
                                                            onChange={(e) => setCaptionColor(e.target.value)}
                                                            className="w-6 h-6 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                                        />
                                                        <span className="text-xs font-mono">{captionColor}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-muted-foreground block mb-1">외곽선색</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={outlineColor}
                                                            onChange={(e) => setOutlineColor(e.target.value)}
                                                            className="w-6 h-6 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                                        />
                                                        <span className="text-xs font-mono">{outlineColor}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-muted-foreground block mb-1">외곽선 두께 ({outlinePx}px)</label>
                                                    <Slider
                                                        min={1}
                                                        max={12}
                                                        step={1}
                                                        value={[outlinePx]}
                                                        onValueChange={([v]) => setOutlinePx(v)}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
                                        <div>
                                            <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-muted-foreground">폰트 크기</span>
                                                <span className="font-bold">{fontSize}px</span>
                                            </div>
                                            <Slider
                                                min={20}
                                                max={80}
                                                step={2}
                                                value={[fontSize]}
                                                onValueChange={([v]) => setFontSize(v)}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-muted-foreground">하단 여백 (세이프존)</span>
                                                <span className="font-bold">하단 {captionMarginBottom}%</span>
                                            </div>
                                            <Slider
                                                min={15}
                                                max={45}
                                                step={1}
                                                value={[captionMarginBottom]}
                                                onValueChange={([v]) => setCaptionMarginBottom(v)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Jab Hook & Bottom Source */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-2xl border border-border/80 bg-muted/30 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                                <Flame className="w-3.5 h-3.5 text-amber-500" />
                                                돌발 쨉쨉이 훅
                                            </span>
                                            <Switch checked={jabEnabled} onCheckedChange={setJabEnabled} />
                                        </div>
                                        {jabEnabled && (
                                            <>
                                                <Input
                                                    value={jabText}
                                                    onChange={(e) => setJabText(e.target.value)}
                                                    className="h-7 text-xs bg-background border-border/80"
                                                />
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-muted-foreground">출현 주기:</span>
                                                    <span className="font-bold">{jabInterval}초 간격</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="p-3 rounded-2xl border border-border/80 bg-muted/30 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                                <Shield className="w-3.5 h-3.5 text-blue-500" />
                                                하단 출처 표기
                                            </span>
                                            <Switch checked={bottomSourceEnabled} onCheckedChange={setBottomSourceEnabled} />
                                        </div>
                                        {bottomSourceEnabled && (
                                            <Input
                                                value={bottomSourceText}
                                                onChange={(e) => setBottomSourceText(e.target.value)}
                                                className="h-7 text-xs bg-background border-border/80"
                                            />
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 2: Editing Pacing */}
                            <TabsContent value="pacing" className="space-y-4 pt-3">
                                <div className="p-4 rounded-2xl border border-border/80 bg-muted/30 space-y-4">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Film className="w-4 h-4 text-amber-500" />
                                        0초 켄 번스 오프닝 줌인 (Hook Zoom)
                                    </span>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-muted-foreground">시작 줌 확대 배율</span>
                                            <span className="font-bold text-primary font-mono">{zoomPct}%</span>
                                        </div>
                                        <Slider
                                            min={100}
                                            max={140}
                                            step={1}
                                            value={[zoomPct]}
                                            onValueChange={([v]) => setZoomPct(v)}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-muted-foreground">줌인 지속 시간</span>
                                            <span className="font-bold font-mono">{openingZoomDuration}초</span>
                                        </div>
                                        <Slider
                                            min={1.0}
                                            max={5.0}
                                            step={0.5}
                                            value={[openingZoomDuration]}
                                            onValueChange={([v]) => setOpeningZoomDuration(v)}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-border/80 bg-muted/30 space-y-4">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-primary" />
                                        평균 컷 전환 주기 (Cutting Rhythm)
                                    </span>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-muted-foreground">장면당 평균 호흡</span>
                                            <span className="font-bold text-emerald-500 font-mono">{avgCutSec}초 간격</span>
                                        </div>
                                        <Slider
                                            min={1.0}
                                            max={5.0}
                                            step={0.1}
                                            value={[avgCutSec]}
                                            onValueChange={([v]) => setAvgCutSec(v)}
                                        />
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            {avgCutSec < 2.0 ? '⚡ 초고속 도파민 템포 (이탈율 최소화)' : '🎬 안정적인 내러티브 템포'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                        <div>
                                            <span className="text-xs font-semibold text-foreground block">쨉쨉이 훅 등장 시 카메라 펄스 진동</span>
                                            <span className="text-[11px] text-muted-foreground">핵심 단어 등장 시 화면을 살짝 바운스하여 주의 집중</span>
                                        </div>
                                        <Switch checked={cameraPulseOnJab} onCheckedChange={setCameraPulseOnJab} />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 3: Audio DSP */}
                            <TabsContent value="audio" className="space-y-4 pt-3">
                                <div className="p-4 rounded-2xl border border-border/80 bg-muted/30 space-y-4">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Volume2 className="w-4 h-4 text-emerald-500" />
                                        음성 발화 및 무음 점프컷 (Speech Cadence)
                                    </span>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-muted-foreground">발화 속도 (WPM)</span>
                                            <span className="font-bold text-primary font-mono">{wpm} WPM</span>
                                        </div>
                                        <Slider
                                            min={300}
                                            max={500}
                                            step={5}
                                            value={[wpm]}
                                            onValueChange={([v]) => setWpm(v)}
                                        />
                                        <span className="text-[11px] text-muted-foreground mt-1 block">
                                            표준: 360 WPM / 숏폼 최적화 고속: 410~450 WPM
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-muted-foreground">무음 점프컷 임계값 (Silence Threshold)</span>
                                            <span className="font-bold font-mono">{silenceCutS}초</span>
                                        </div>
                                        <Slider
                                            min={0.05}
                                            max={0.4}
                                            step={0.05}
                                            value={[silenceCutS]}
                                            onValueChange={([v]) => setSilenceCutS(v)}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-border/80 bg-muted/30 space-y-4">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Sliders className="w-4 h-4 text-indigo-500" />
                                        BGM 믹싱 & 사이드체인 보컬 덕킹
                                    </span>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-muted-foreground">BGM 기본 볼륨</span>
                                            <span className="font-bold font-mono">{bgmVolumeDb} dB</span>
                                        </div>
                                        <Slider
                                            min={-35.0}
                                            max={-10.0}
                                            step={1.0}
                                            value={[bgmVolumeDb]}
                                            onValueChange={([v]) => setBgmVolumeDb(v)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                        <div>
                                            <span className="text-xs font-semibold text-foreground block">자동 보컬 사이드체인 덕킹 (Vocal Ducking)</span>
                                            <span className="text-[11px] text-muted-foreground">나레이션 발화 시 BGM을 자동으로 -12dB 감쇠하여 음성 가독성 확보</span>
                                        </div>
                                        <Switch checked={vocalDucking} onCheckedChange={setVocalDucking} />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 4: 17-Tier Full Bible */}
                            <TabsContent value="bible" className="space-y-2.5 pt-3 max-h-[52vh] overflow-y-auto pr-1">
                                {fullBible && Object.keys(fullBible).length > 0 ? (
                                    Object.entries(fullBible).map(([key, section]: [string, any], idx) => {
                                        const isExpanded = selectedBibleSection === key || (selectedBibleSection === null && idx === 0);
                                        const cleanTitle = key.replace(/^[0-9]+_/, '').replace(/_/g, ' ');

                                        return (
                                            <div 
                                                key={key} 
                                                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                                    isExpanded 
                                                        ? 'border-primary/60 bg-card shadow-xs' 
                                                        : 'border-border/60 bg-muted/20 hover:border-border'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedBibleSection(isExpanded ? '' : key)}
                                                    className="w-full p-3 flex items-center justify-between text-left cursor-pointer hover:bg-muted/30 transition-colors"
                                                >
                                                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black ${
                                                            isExpanded 
                                                                ? 'bg-primary text-primary-foreground' 
                                                                : 'bg-muted text-muted-foreground'
                                                        }`}>
                                                            {idx + 1}
                                                        </span>
                                                        <span className="capitalize">{section?.title || cleanTitle}</span>
                                                    </span>
                                                    <Badge variant={isExpanded ? 'default' : 'outline'} className="text-[10px] font-mono px-2 py-0.2">
                                                        {isExpanded ? '접기 ▲' : '상세보기 ▼'}
                                                    </Badge>
                                                </button>

                                                {isExpanded && (
                                                    <div className="p-3.5 pt-1 border-t border-border/40 text-xs space-y-2.5 bg-muted/10">
                                                        {/* 1) If section is a simple string */}
                                                        {typeof section === 'string' && (
                                                            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{section}</p>
                                                        )}

                                                        {/* 2) If section is an Array */}
                                                        {Array.isArray(section) && (
                                                            <ul className="space-y-1.5 pl-1">
                                                                {section.map((item: any, iIdx: number) => (
                                                                    <li key={iIdx} className="flex items-start gap-2 text-foreground/80">
                                                                        <span className="text-primary font-bold shrink-0">{iIdx + 1}.</span>
                                                                        <span>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}

                                                        {/* 3) If section is an Object/Dict */}
                                                        {typeof section === 'object' && !Array.isArray(section) && section !== null && (
                                                            <div className="space-y-2">
                                                                {Object.entries(section).map(([k, val]: [string, any]) => (
                                                                    <div key={k} className="p-2 rounded-xl bg-background/60 border border-border/50 space-y-1">
                                                                        <span className="text-[11px] font-bold text-primary block">
                                                                            • {k.replace(/_/g, ' ')}
                                                                        </span>
                                                                        {typeof val === 'object' && val !== null ? (
                                                                            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap bg-muted/40 p-2 rounded-lg">
                                                                                {JSON.stringify(val, null, 2)}
                                                                            </pre>
                                                                        ) : (
                                                                            <p className="text-[11.5px] text-foreground/90 pl-2 leading-relaxed">
                                                                                {String(val)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-border/60">
                                        제작 가이드라인이 준비되었습니다. 상단 [현재 프리셋에 덮어쓰기 저장]을 누르면 가이드라인이 저장됩니다.
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>

                        {/* Clone Section */}
                        <div className="p-3 rounded-2xl border border-border/80 bg-muted/40 flex items-center gap-3">
                            <div className="flex-1">
                                <label className="text-[11px] font-bold text-foreground block mb-0.5">새 커스텀 프리셋으로 복제 저장</label>
                                <Input
                                    value={cloneName}
                                    onChange={(e) => setCloneName(e.target.value)}
                                    placeholder="프리셋 복제 이름"
                                    className="h-7 text-xs bg-background border-border/80"
                                />
                            </div>
                            <Button
                                onClick={handleCloneAsCustom}
                                disabled={saving}
                                size="sm"
                                className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground font-bold mt-4 shrink-0 shadow-xs cursor-pointer"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                복제 저장
                            </Button>
                        </div>
                    </div>

                    {/* Right: True 9:16 Live Canvas Engine (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col items-center justify-start">
                        {/* 🌟 3단 뷰 토글 버튼: [👁️ 원본] [🎨 프리셋] [⚖️ 1:1 오버레이] */}
                        <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl mb-2.5 w-full justify-between border border-border/60">
                            <Button
                                type="button"
                                size="sm"
                                variant={previewViewMode === 'original' ? 'default' : 'ghost'}
                                onClick={() => setPreviewViewMode('original')}
                                className={`h-7 text-[11px] font-bold px-2 rounded-lg gap-1 cursor-pointer flex-1 transition-all ${
                                    previewViewMode === 'original' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="분석 대상 원본 영상 프레임 단독 보기"
                            >
                                <Eye className="w-3 h-3" />
                                원본
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={previewViewMode === 'preset' ? 'default' : 'ghost'}
                                onClick={() => setPreviewViewMode('preset')}
                                className={`h-7 text-[11px] font-bold px-2 rounded-lg gap-1 cursor-pointer flex-1 transition-all ${
                                    previewViewMode === 'preset' ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="조율된 가상 레이어(헤더/비디오/자막) 실제 결과물 보기"
                            >
                                <Palette className="w-3 h-3" />
                                프리셋
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={previewViewMode === 'overlay' ? 'default' : 'ghost'}
                                onClick={() => setPreviewViewMode('overlay')}
                                className={`h-7 text-[11px] font-bold px-2 rounded-lg gap-1 cursor-pointer flex-1 transition-all ${
                                    previewViewMode === 'overlay' ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="원본 위에 복제 레이어를 반투명으로 겹쳐 1:1 오차 대조"
                            >
                                <Split className="w-3 h-3" />
                                1:1 오버레이
                            </Button>
                        </div>

                        {/* 오버레이 모드 전용 투명도 조절 바 */}
                        {previewViewMode === 'overlay' && (
                            <div className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-1.5 mb-2.5 flex items-center justify-between gap-2 animate-in fade-in duration-200">
                                <span className="text-[10.5px] font-bold text-foreground shrink-0">오버레이 투명도 {overlayOpacity}%</span>
                                <Slider
                                    min={10}
                                    max={90}
                                    step={5}
                                    value={[overlayOpacity]}
                                    onValueChange={([v]) => setOverlayOpacity(v)}
                                    className="flex-1 max-w-[130px]"
                                />
                            </div>
                        )}

                        {/* Smartphone Canvas Device Frame */}
                        <div className="w-full max-w-[270px] aspect-[9/16] rounded-3xl bg-black border-4 border-neutral-800 shadow-2xl relative overflow-hidden flex flex-col justify-between select-none">
                            {/* CASE A: 원본 레퍼런스 단독 보기 */}
                            {previewViewMode === 'original' ? (
                                <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                                    {refThumbnailUrl ? (
                                        <img 
                                            src={refThumbnailUrl} 
                                            alt="Clean Reference Frame" 
                                            className="w-full h-full object-cover pointer-events-none select-none"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="text-center p-4 space-y-2">
                                            <Film className="w-8 h-8 text-neutral-600 mx-auto" />
                                            <p className="text-xs text-neutral-400 font-bold">원본 캡처 이미지가 없습니다.</p>
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 z-30">
                                        <Badge className="bg-indigo-600/90 text-white text-[9px] px-2 py-0.5 font-bold">
                                            원본 레퍼런스
                                        </Badge>
                                    </div>
                                </div>
                            ) : (
                                /* CASE B & C: 복제 프리셋 레이어 or 1:1 오버레이 비교 */
                                <div className="w-full h-full relative overflow-hidden flex flex-col justify-between">
                                    {/* 오버레이 모드일 때 배경에 원본 캡처 배치 */}
                                    {previewViewMode === 'overlay' && refThumbnailUrl && (
                                        <img 
                                            src={refThumbnailUrl} 
                                            alt="Overlay Background" 
                                            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}

                                    {/* 상단 뱃지 표시 */}
                                    {previewViewMode === 'overlay' && (
                                        <div className="absolute top-2 left-2 z-30">
                                            <Badge className="bg-amber-600/90 text-white text-[9px] px-2 py-0.5 font-bold">
                                                1:1 오버레이 ({overlayOpacity}%)
                                            </Badge>
                                        </div>
                                    )}

                                    {/* 가상 렌더링 레이어 컨테이너 (오버레이 모드일 경우 opacity 적용) */}
                                    <div 
                                        className="w-full h-full flex flex-col justify-between relative z-10"
                                        style={{
                                            opacity: previewViewMode === 'overlay' ? overlayOpacity / 100 : 1.0,
                                        }}
                                    >
                                        {/* Layer 1: Top Black Bar & 2-Tier Header */}
                                        <div
                                            className="w-full z-20 flex flex-col items-center justify-center px-2 py-1 transition-all"
                                            style={{
                                                backgroundColor: topBarBgColor,
                                                minHeight: `${topBarHeightPct}%`,
                                            }}
                                        >
                                            <span
                                                className="font-bold text-center leading-tight truncate w-full transition-all"
                                                style={{
                                                    color: headerLine1Color,
                                                    fontSize: `${Math.max(11, Math.round(headerLine1Size * 0.45))}px`,
                                                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                                }}
                                            >
                                                {headerLine1Text}
                                            </span>
                                            <span
                                                className="font-black text-center leading-tight truncate w-full transition-all mt-0.5"
                                                style={{
                                                    color: headerLine2Color,
                                                    fontSize: `${Math.max(13, Math.round(headerLine2Size * 0.48))}px`,
                                                    textShadow: '0 2px 5px rgba(0,0,0,0.9)',
                                                }}
                                            >
                                                {headerLine2Text}
                                            </span>
                                        </div>

                                        {/* Layer 2: Center Sandwich Media Canvas (Real Reference Video / 16:9 Letterbox) */}
                                        <div className="flex-1 w-full relative overflow-hidden flex items-center justify-center z-10 bg-black">
                                            {videoBgUrl ? (
                                                <div className="w-full aspect-[16/9] relative overflow-hidden flex items-center justify-center bg-black">
                                                    <img 
                                                        src={videoBgUrl} 
                                                        alt="Reference Keyframe" 
                                                        className="w-full h-full object-cover transition-transform duration-500 select-none pointer-events-none"
                                                        style={{ transform: `scale(${zoomPct / 100})` }}
                                                    />
                                                    {/* Subtle Vignette */}
                                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                                                    
                                                    {/* Bilingual Captions Overlay (In-Video Optimal Placement) */}
                                                    {bilingualEnabled && (
                                                        <div className="absolute bottom-2 inset-x-2 flex flex-col items-center justify-center gap-0.5 pointer-events-none select-none z-30">
                                                            <span 
                                                                className="font-bold text-center leading-tight tracking-tight px-1"
                                                                style={{
                                                                    color: captionLine1Color,
                                                                    fontSize: '12px',
                                                                    textShadow: '0 2px 4px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                                                                }}
                                                            >
                                                                {captionLine1En}
                                                            </span>
                                                            <span 
                                                                className="font-black text-center leading-tight tracking-tight px-1 mt-0.5"
                                                                style={{
                                                                    color: captionLine2Color,
                                                                    fontSize: '13px',
                                                                    textShadow: '0 2px 4px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                                                                }}
                                                            >
                                                                {captionLine2Ko}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Jab Hook Overlay */}
                                                    {jabEnabled && (
                                                        <div
                                                            className="absolute top-[28%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md shadow-xl transition-all z-30"
                                                            style={{
                                                                backgroundColor: '#000000',
                                                                border: `1.5px solid ${jabColor}`,
                                                                color: jabColor,
                                                                transform: `translateX(-50%) rotate(${jabTilt}deg)`,
                                                            }}
                                                        >
                                                            <span className="text-[10px] font-black tracking-tight flex items-center gap-1 whitespace-nowrap">
                                                                {jabText}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-[16/9] bg-neutral-900 border-y border-neutral-800 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                                                    <Film className="w-8 h-8 text-white/30 mb-2" />
                                                    <span className="text-[11px] font-bold text-white/80 text-center">
                                                        16:9 와이드 미디어 샌드위치 캔버스
                                                    </span>
                                                    <span className="text-[9px] text-white/50 mt-1 font-mono">
                                                        0초 훅 줌 {zoomPct}% • {avgCutSec}s 컷 리듬
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Layer 4: Caption Subtitle (Single Line Mode when bilingual is disabled) */}
                                        {!bilingualEnabled && (
                                            <div
                                                className="w-full text-center px-2 font-black leading-tight z-20 pointer-events-none transition-all"
                                                style={{
                                                    marginBottom: `${captionMarginBottom * 0.45}%`,
                                                    color: captionColor,
                                                    fontSize: `${Math.max(12, Math.round(fontSize * 0.28))}px`,
                                                    WebkitTextStroke: `${Math.max(1, outlinePx * 0.22)}px ${outlineColor}`,
                                                    textShadow: `0 2px 6px ${outlineColor}`,
                                                }}
                                            >
                                                {captionText}
                                            </div>
                                        )}

                                        {/* Layer 5: Bottom Source Bar & Black Band (Only if explicitly enabled) */}
                                        {bottomSourceEnabled && (
                                            <div
                                                className="w-full z-20 flex items-center justify-center px-2 transition-all border-t border-white/5"
                                                style={{
                                                    backgroundColor: '#000000',
                                                    minHeight: `${bottomBarHeightPct}%`,
                                                }}
                                            >
                                                <span className="text-[9px] text-neutral-400 truncate font-medium">
                                                    {bottomSourceText}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <span className="text-[10px] text-muted-foreground mt-2 text-center">
                            📐 원본 레퍼런스 및 1:1 오버레이 검증 캔버스
                        </span>
                    </div>
                </div>

                <DialogFooter className="border-t border-border/60 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDeletePreset}
                            disabled={deleting || saving}
                            className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 cursor-pointer font-bold"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deleting ? '삭제 중...' : '프리셋 삭제'}
                        </Button>
                        <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                            ID: {preset.id}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* 🎨 템플릿 디자인 공방 이동 버튼 */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenInTemplateStudio}
                            className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted font-bold cursor-pointer"
                            title="템플릿 디자인 공방에서 캔버스 객체로 마우스 드래그/리사이즈 정밀 편집"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                            템플릿 디자인 공방
                        </Button>

                        {/* 💉 기존 캡컷 드래프트에 스타일 입히기 버튼 (픽셀링/기존 프로젝트 탈바꿈) */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenInjectModal}
                            className="h-8 text-xs gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold cursor-pointer"
                            title="픽셀링이나 외부에서 만든 밋밋한 캡컷 프로젝트에 이 프리셋의 디자인(상하단바, 타이틀, 자막)을 1:1로 덮어쓰기"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            기존 캡컷에 디자인 입히기
                        </Button>

                        {/* 🎬 CapCut PC 드래프트 내보내기 & 자동 실행 버튼 */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleExportCapcut}
                            disabled={exportingCapcut}
                            className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold cursor-pointer"
                            title="현재 프리셋의 지오메트리를 CapCut PC 프로젝트로 1:1 즉시 생성하고 실행"
                        >
                            <Film className={`w-3.5 h-3.5 ${exportingCapcut ? 'animate-spin' : ''}`} />
                            {exportingCapcut ? '캡컷 생성 중...' : '새 캡컷으로 내보내기'}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-8 text-xs border-border/80"
                        >
                            닫기
                        </Button>

                        <Button
                            type="button"
                            onClick={handleUpdateCurrent}
                            disabled={saving}
                            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-xs cursor-pointer"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? '저장 중...' : '현재 프리셋에 덮어쓰기 저장'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* 🌟 기존 캡컷 드래프트 선택 & 디자인 주입 팝업 모달 */}
        <Dialog open={injectModalOpen} onOpenChange={setInjectModalOpen}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-5 bg-card text-card-foreground border border-border shadow-2xl">
                <DialogHeader className="border-b border-border/60 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <DialogTitle className="text-base font-black text-foreground">
                                캡컷 드래프트에 스타일 입히기 (Design Injection)
                            </DialogTitle>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenInjectModal}
                            disabled={loadingDrafts}
                            className="h-7 text-xs gap-1 border-border/80"
                        >
                            <RotateCcw className={`w-3 h-3 ${loadingDrafts ? 'animate-spin' : ''}`} />
                            새로고침
                        </Button>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground pt-1">
                        픽셀링 등 외부에서 생성된 밋밋한 캡컷 프로젝트를 선택하면, 현재 프리셋의 <b>상하단 바, 2단 헤더 타이틀, 자막 폰트·컬러·위치</b>를 1:1로 덮어써서 CapCut을 즉시 실행합니다. (기존 파일은 .bak으로 자동 백업)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 py-3">
                    {loadingDrafts ? (
                        <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                            <RotateCcw className="w-6 h-6 animate-spin mx-auto text-primary" />
                            <p>CapCut PC 프로젝트 목록을 스캔하는 중...</p>
                        </div>
                    ) : capcutDraftsList.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/80 p-6">
                            <Film className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                            <p className="font-bold text-foreground">발견된 CapCut 프로젝트가 없습니다.</p>
                            <p className="text-[11px] text-muted-foreground mt-1">CapCut PC가 설치되어 있고 프로젝트가 1개 이상 저장되어 있어야 합니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                            {capcutDraftsList.map((draft) => (
                                <div
                                    key={draft.folder_name}
                                    className="p-3 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/60 hover:border-amber-500/50 transition-all flex items-center justify-between gap-3 group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-14 bg-black rounded-lg border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                                            {draft.thumbnail_url ? (
                                                <img src={draft.thumbnail_url} alt="Cover" className="w-full h-full object-cover" />
                                            ) : (
                                                <Film className="w-4 h-4 text-white/40" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-black text-foreground truncate group-hover:text-amber-500 transition-colors">
                                                {draft.draft_name}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                                                <span>폴더: {draft.folder_name}</span>
                                                <span>·</span>
                                                <span>{new Date(draft.modified_ts * 1000).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={() => handleExecuteInject(draft.path, draft.draft_name)}
                                        disabled={injectingDraft}
                                        className="h-8 text-xs font-bold gap-1.5 bg-amber-500 hover:bg-amber-600 text-black shadow-xs shrink-0 cursor-pointer"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        {injectingDraft ? '주입 중...' : '이 프로젝트에 입히기'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-border/60 pt-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInjectModalOpen(false)}
                        className="h-8 text-xs border-border/80"
                    >
                        닫기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
};
export default PresetCustomizeModal;
