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
    RotateCcw, Sparkle, Video, ExternalLink, Split, Palette, Layout, MousePointer, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { SovereignPreset } from './PresetLibraryModal';

interface PresetCustomizeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preset: SovereignPreset | null;
    onPresetUpdated: (updatedPreset: SovereignPreset) => void;
    onSelectPreset?: (preset: SovereignPreset) => void;
}

export const PresetCustomizeModal: React.FC<PresetCustomizeModalProps> = ({
    open,
    onOpenChange,
    preset,
    onPresetUpdated,
    onSelectPreset,
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
    // 🌟 5-Tier Header Container Archetype: floating_capsule | letterbox_sandwich | full_width_band | social_post_bar | none
    const [containerType, setContainerType] = useState<'floating_capsule' | 'letterbox_sandwich' | 'full_width_band' | 'social_post_bar' | 'none'>('letterbox_sandwich');

    // Floating Capsule Settings (패션탐정냥 Type B)
    const [capsuleBgColor, setCapsuleBgColor] = useState<string>('#000000');
    const [capsuleBorderRadius, setCapsuleBorderRadius] = useState<number>(24);
    const [capsuleTopY, setCapsuleTopY] = useState<number>(8.0);
    const [capsuleWidthPct, setCapsuleWidthPct] = useState<number>(88);

    // Sub-tape Sticker Label (서브 테이프 라벨)
    const [subTapeEnabled, setSubTapeEnabled] = useState<boolean>(false);
    const [subTapeText, setSubTapeText] = useState<string>('손도 저렇게 작은 줄 몰랐음');
    const [subTapeEmoji, setSubTapeEmoji] = useState<string>('😲💅');
    const [subTapeBgColor, setSubTapeBgColor] = useState<string>('#FDE68A');
    const [subTapeTextColor, setSubTapeTextColor] = useState<string>('#1E293B');
    const [subTapeTopY, setSubTapeTopY] = useState<number>(19.5);

    // Visual Pointer (시각 포인터/곡선 화살표)
    const [pointerEnabled, setPointerEnabled] = useState<boolean>(false);
    const [pointerLabel, setPointerLabel] = useState<string>('168 vs 163');
    const [pointerColor, setPointerColor] = useState<string>('#EF4444');
    const [pointerX, setPointerX] = useState<number>(65);
    const [pointerY, setPointerY] = useState<number>(44);

    // Two-tone Keyword Caption (2톤 강조 자막)
    const [twoToneEnabled, setTwoToneEnabled] = useState<boolean>(false);
    const [twoToneHighlight, setTwoToneHighlight] = useState<string>('키가 5cm');
    const [twoToneHighlightColor, setTwoToneHighlightColor] = useState<string>('#FFE500');
    const [twoToneBaseText, setTwoToneBaseText] = useState<string>('더 큰');
    const [twoToneBaseColor, setTwoToneBaseColor] = useState<string>('#FFFFFF');

    // Top Source Label
    const [topSourceEnabled, setTopSourceEnabled] = useState<boolean>(false);
    const [topSourceText, setTopSourceText] = useState<string>('출처: Melon, 2025 MMA 에스파');
    const [topSourceColor, setTopSourceColor] = useState<string>('#CBD5E1');
    const [topSourceTopY, setTopSourceTopY] = useState<number>(4.0);

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

    // 🌟 6. Advanced 9:16 NLE Inspector Features (Keyframes Carousel, Safe-Zone, Fonts, Typography)
    const [keyframesList, setKeyframesList] = useState<any[]>([]);
    const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState<number>(0);
    const [showSafeZone, setShowSafeZone] = useState<boolean>(true);
    const [fontFamily, setFontFamily] = useState<string>('Pretendard');
    const [letterSpacing, setLetterSpacing] = useState<number>(-0.5);
    const [lineHeight, setLineHeight] = useState<number>(1.25);
    const [captionBgBox, setCaptionBgBox] = useState<boolean>(false);
    const [captionBgBoxColor, setCaptionBgBoxColor] = useState<string>('rgba(0,0,0,0.65)');
    const [textShadowBlur, setTextShadowBlur] = useState<number>(4);

    // 🎯 7. Source Targeting DNA (원천 소스 소싱 타겟팅 프로필 - Zero Contamination Dynamic Resolution)
    const [targetDomain, setTargetDomain] = useState<string>('시네마/드라마');
    const [targetSubGenre, setTargetSubGenre] = useState<string>('');
    const [targetEntities, setTargetEntities] = useState<string>('');
    const [sourceSearchQueries, setSourceSearchQueries] = useState<string>('');
    const [cleanZoneThreshold, setCleanZoneThreshold] = useState<number>(80);

    // Clone Modal/Field
    const [cloneName, setCloneName] = useState('');
    const [saving, setSaving] = useState(false);

    // Selected Bible section for interactive accordion view
    const [selectedBibleSection, setSelectedBibleSection] = useState<string | null>(null);
    const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);

    useEffect(() => {
        if (!preset) return;

        // 1. Basic Metadata
        setName(preset.name || '');
        setCategory(preset.category || 'custom');
        setRecipe(preset.recipe || '');
        setContentRules(preset.content_rules || []);
        setCloneName(`${preset.name} (커스텀 복제본)`);

        const rawPreset = preset as any;
        const style = preset.style || rawPreset.blueprint || rawPreset.manifest || rawPreset.layout || {};
        const vg = style.visual_geometry || {};
        const ep = style.editing_pacing || {};
        const ad = style.audio_dsp || {};
        const bible = style.production_bible_17 
            || rawPreset.production_bible_17 
            || rawPreset.manifest?.production_bible_17 
            || rawPreset.layout?.production_bible_17 
            || rawPreset.blueprint?.production_bible_17 
            || {};
        setFullBible(bible);

        const isTheater = vg.container_type === 'sandwich_theater' 
            || rawPreset.container_type === 'sandwich_theater' 
            || (preset.name && preset.name.includes('눈물한가득'));
        setIsTheaterMode(Boolean(isTheater));

        // 🌟 1.5. Container Archetype & Specialized Modern Form Factors
        const rawContainer = vg.container_type || (vg.canvas_type === 'fullscreen_overlay' ? 'floating_capsule' : 'letterbox_sandwich');
        setContainerType(rawContainer);

        // Floating Capsule
        const capBox = vg.floating_capsule || {};
        setCapsuleBgColor(capBox.bg_color || '#000000');
        setCapsuleBorderRadius(capBox.border_radius_px ?? 24);
        setCapsuleTopY(capBox.top_y_pct ?? 8.0);
        setCapsuleWidthPct(capBox.width_pct ?? 88);

        // Sub-tape sticker
        const subTape = vg.sub_tape_label || {};
        setSubTapeEnabled(Boolean(subTape.enabled));
        setSubTapeText(subTape.text || '손도 저렇게 작은 줄 몰랐음');
        setSubTapeEmoji(subTape.emoji || '😲💅');
        setSubTapeBgColor(subTape.bg_color || '#FDE68A');
        setSubTapeTextColor(subTape.text_color || '#1E293B');
        setSubTapeTopY(subTape.top_y_pct ?? 19.5);

        // Visual pointers
        const ptr = vg.visual_pointers || {};
        setPointerEnabled(Boolean(ptr.enabled));
        setPointerLabel(ptr.label || '168 vs 163');
        setPointerColor(ptr.color || '#EF4444');
        setPointerX(ptr.target_x_pct ?? 65);
        setPointerY(ptr.target_y_pct ?? 44);

        // Two-tone caption
        const twoTone = vg.two_tone_caption || {};
        setTwoToneEnabled(Boolean(twoTone.enabled));
        setTwoToneHighlight(twoTone.highlight_text || '키가 5cm');
        setTwoToneHighlightColor(twoTone.highlight_color || '#FFE500');
        setTwoToneBaseText(twoTone.base_text || '더 큰');
        setTwoToneBaseColor(twoTone.base_color || '#FFFFFF');

        // Top source
        const topSrc = vg.top_source || {};
        setTopSourceEnabled(Boolean(topSrc.enabled));
        setTopSourceText(topSrc.text || '출처: Melon, 2025 MMA 에스파');
        setTopSourceColor(topSrc.color || '#CBD5E1');
        setTopSourceTopY(topSrc.top_pct ?? 4.0);

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

        // 5. Reference Video Frame, Preserved Keyframes & Clean Thumbnail
        const kfs = (preset as any).keyframes 
            || (preset as any).extracted_keyframes 
            || style.keyframes 
            || (preset as any).manifest?.keyframes 
            || (preset as any).blueprint?.keyframes 
            || [];
        setKeyframesList(kfs);
        setSelectedKeyframeIndex(0);

        const firstKfUrl = kfs.length > 0 ? (kfs[0].url || kfs[0].local_path || '') : '';
        const resolvedBg = firstKfUrl || style.video_bg_url || (preset as any).sample_image_url || (preset as any).thumbnail_url || '';
        setVideoBgUrl(resolvedBg);
        const resolvedThumb = firstKfUrl || (preset as any).thumbnail_url || (preset as any).sample_image_url || (preset as any).sample_thumbnail || '';
        setRefThumbnailUrl(resolvedThumb);

        // Font Family & Typography
        setFontFamily(cap.font_family || cap.font_id || 'Pretendard');
        setLetterSpacing(cap.letter_spacing ?? -0.5);
        setLineHeight(cap.line_height ?? 1.25);
        setCaptionBgBox(Boolean(cap.box_enabled || cap.box_color));
        setCaptionBgBoxColor(cap.box_color || 'rgba(0,0,0,0.65)');
        setTextShadowBlur(cap.shadow_blur ?? 4);

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

        // 10. Source Targeting DNA - 프리셋별 고유 정체성 동적 바인딩 (Zero Cross-Preset Contamination)
        const st = style.source_targeting || rawPreset.source_targeting || vg.source_targeting;
        if (st && st.target_domain) {
            setTargetDomain(st.target_domain || '시네마/드라마');
            setTargetSubGenre((st.target_sub_genres && st.target_sub_genres[0]) || '');
            setTargetEntities((st.target_entities && st.target_entities.join(', ')) || '');
            setSourceSearchQueries((st.source_search_queries && st.source_search_queries.join('\n')) || '');
            setCleanZoneThreshold(st.clean_zone_threshold || 80);
        } else {
            const pName = (preset.name || '').trim();
            const pCat = (preset.category || '').trim();
            const pId = (preset.id || (rawPreset as any).preset_id || '').toLowerCase();
            const fullKey = `${pName} ${pCat} ${pId} ${style.recipe || ''}`.toLowerCase();

            let resolvedDomain = '시네마/드라마';
            let resolvedSub = '영화/드라마 명장면';
            let resolvedEntities: string[] = [];
            let resolvedQueries: string[] = [];

            if (fullKey.includes('닭강정') || fullKey.includes('커뮤니티') || fullKey.includes('썰') || fullKey.includes('사연') || fullKey.includes('네이트판') || fullKey.includes('블라인드')) {
                resolvedDomain = '커뮤니티/썰';
                resolvedSub = '화제 사연/실화 썰';
                resolvedEntities = ['익명 사연', '레전드 썰', pName.replace(/\(쇼츠\)|v\d+/g, '').trim()];
                resolvedQueries = [
                    `${pName} 레전드 실화 사연 클립`,
                    '커뮤니티 화제 사연 감동 썰 1080p',
                    '역대급 사이다 네이트판 썰 모음'
                ];
            } else if (fullKey.includes('패션') || fullKey.includes('아이돌') || fullKey.includes('연예') || fullKey.includes('걸그룹') || fullKey.includes('탐정')) {
                resolvedDomain = '아이돌/연예인';
                resolvedSub = '아이돌 패션/착장';
                resolvedEntities = ['아이돌 사복', '공항 패션', '무대 직캠'];
                resolvedQueries = [
                    `${pName} 고화질 직캠 1080p`,
                    '여자 아이돌 레전드 사복 패션 착장',
                    '연예인 실물 비율 무대 비하인드'
                ];
            } else if (fullKey.includes('눈물') || fullKey.includes('영화') || fullKey.includes('시네마') || fullKey.includes('감동')) {
                resolvedDomain = '시네마/드라마';
                resolvedSub = '감동/눈물실화';
                resolvedEntities = ['하치이야기', '인생은 아름다워', '포레스트 검프'];
                resolvedQueries = [
                    '감동 실화 영화 명장면 1080p',
                    '눈물 쏟아지는 명작 영화 하이라이트 클립',
                    '실화 바탕 인생 감동 영화 명장면 모음'
                ];
            } else if (fullKey.includes('군림보') || fullKey.includes('게임') || fullKey.includes('배그') || fullKey.includes('롤') || fullKey.includes('fps')) {
                resolvedDomain = '스포츠/피트니스';
                resolvedSub = '게임/e스포츠 하이라이트';
                resolvedEntities = ['배틀그라운드', 'FPS 클러치', '레전드 킬'];
                resolvedQueries = [
                    `${pName} 레전드 플레이 명장면 1080p`,
                    'FPS 슈퍼 플레이 하이라이트 60fps',
                    '게임 명장면 클러치 씬 모음'
                ];
            } else if (fullKey.includes('정치') || fullKey.includes('시사') || fullKey.includes('뉴스') || fullKey.includes('국회')) {
                resolvedDomain = '이슈/시사/정치';
                resolvedSub = '국회/정치 인터뷰';
                resolvedEntities = ['청문회 발언', '시사 논평', '속보 인터뷰'];
                resolvedQueries = [
                    `${pName} 주요 발언 사이다 하이라이트`,
                    '국회 청문회 핵심 쟁점 인터뷰 1080p'
                ];
            } else if (fullKey.includes('애니') || fullKey.includes('만화') || fullKey.includes('서브컬처')) {
                resolvedDomain = '서브컬처/애니';
                resolvedSub = '애니메이션 명장면';
                resolvedEntities = ['작화 명장면', '극장판 애니'];
                resolvedQueries = [
                    `${pName} 작화 폭발 명장면 1080p`,
                    '극장판 애니 감동 명대사 씬'
                ];
            } else {
                const cleanPName = pName.replace(/\(쇼츠\)|v\d+/g, '').trim() || '원천 소스';
                resolvedDomain = pCat || '커뮤니티/썰';
                resolvedSub = `${cleanPName} 관련 영상`;
                resolvedEntities = [cleanPName];
                resolvedQueries = [
                    `${cleanPName} 고화질 1080p 클립`,
                    `${cleanPName} 레전드 하이라이트`,
                    `${cleanPName} 관련 명장면 모음`
                ];
            }

            setTargetDomain(resolvedDomain);
            setTargetSubGenre(resolvedSub);
            setTargetEntities(resolvedEntities.filter(Boolean).join(', '));
            setSourceSearchQueries(resolvedQueries.join('\n'));
            setCleanZoneThreshold(80);
        }
    }, [preset, open]);

    // 🌟 Self-Healing: 비동기 프리셋 온전 데이터(17대 바이블, 실측 키프레임) 자동 하이드레이션
    useEffect(() => {
        if (!open || !preset) return;
        const targetId = preset.id || (preset as any).preset_id || (preset as any).benchmark_id;
        if (!targetId) return;

        const needsBible = !fullBible || Object.keys(fullBible).length === 0;
        const needsKeyframes = !keyframesList || keyframesList.length === 0;

        if (needsBible || needsKeyframes) {
            fetch(`/api/sovereign-presets/${encodeURIComponent(targetId)}`)
                .then(res => res.ok ? res.json() : null)
                .then(hydrated => {
                    if (!hydrated) return;
                    if (needsBible) {
                        const hydBible = hydrated.production_bible_17 
                            || hydrated.style?.production_bible_17 
                            || hydrated.manifest?.production_bible_17 
                            || hydrated.layout?.production_bible_17 
                            || hydrated.blueprint?.production_bible_17;
                        if (hydBible && Object.keys(hydBible).length > 0) {
                            setFullBible(hydBible);
                        }
                    }
                    if (needsKeyframes) {
                        const hydKfs = hydrated.keyframes 
                            || hydrated.extracted_keyframes 
                            || hydrated.style?.keyframes;
                        if (hydKfs && hydKfs.length > 0) {
                            setKeyframesList(hydKfs);
                            if (!videoBgUrl && hydKfs[0]?.url) {
                                setVideoBgUrl(hydKfs[0].url);
                            }
                            if (!refThumbnailUrl && hydKfs[0]?.url) {
                                setRefThumbnailUrl(hydKfs[0].url);
                            }
                        }
                    }
                })
                .catch(() => {});
        }
    }, [open, preset, fullBible, keyframesList, videoBgUrl, refThumbnailUrl]);

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
        const isLetterbox = containerType === 'letterbox_sandwich';
        const updatedVg = {
            container_type: containerType,
            canvas_type: isLetterbox ? 'sandwich' : 'fullscreen_overlay',
            floating_capsule: {
                enabled: containerType === 'floating_capsule',
                bg_color: capsuleBgColor,
                border_radius_px: capsuleBorderRadius,
                top_y_pct: capsuleTopY,
                width_pct: capsuleWidthPct,
            },
            sub_tape_label: {
                enabled: subTapeEnabled,
                text: subTapeText,
                emoji: subTapeEmoji,
                bg_color: subTapeBgColor,
                text_color: subTapeTextColor,
                top_y_pct: subTapeTopY,
            },
            visual_pointers: {
                enabled: pointerEnabled,
                label: pointerLabel,
                color: pointerColor,
                target_x_pct: pointerX,
                target_y_pct: pointerY,
                arrow_type: 'curved_red',
            },
            two_tone_caption: {
                enabled: twoToneEnabled,
                highlight_text: twoToneHighlight,
                highlight_color: twoToneHighlightColor,
                base_text: twoToneBaseText,
                base_color: twoToneBaseColor,
                outline_color: outlineColor,
                outline_px: outlinePx,
                font_family: fontFamily,
                safe_zone_y: 69.0,
                margin_v_pct: captionMarginBottom,
            },
            top_source: {
                enabled: topSourceEnabled,
                text: topSourceText,
                color: topSourceColor,
                top_pct: topSourceTopY,
            },
            top_bar: {
                enabled: isLetterbox,
                bg_color: topBarBgColor,
                height_pct: isLetterbox ? topBarHeightPct : 0,
                opacity: 1.0,
            },
            top_header_lines: [
                {
                    line: 1,
                    role: 'condition',
                    color: headerLine1Color,
                    size_px: headerLine1Size,
                    font_style: 'Bold',
                    font_family: fontFamily,
                    text_example: headerLine1Text,
                },
                {
                    line: 2,
                    role: 'hook_noun',
                    color: headerLine2Color,
                    size_px: headerLine2Size,
                    font_style: 'ExtraBold',
                    font_family: fontFamily,
                    text_example: headerLine2Text,
                },
            ],
            top_title_y_pct: containerType === 'floating_capsule' ? capsuleTopY : 5.2,
            caption: {
                font_family: fontFamily,
                bold: true,
                size_px: fontSize,
                color: captionColor,
                outline_color: outlineColor,
                outline_px: outlinePx,
                position: 'bottom',
                margin_v_pct: captionMarginBottom,
                letter_spacing: letterSpacing,
                line_height: lineHeight,
                box_enabled: captionBgBox,
                box_color: captionBgBoxColor,
                shadow_blur: textShadowBlur,
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
                enabled: isLetterbox,
                bg_color: '#000000',
                height_pct: isLetterbox ? bottomBarHeightPct : 0,
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

        const sourceTargetingPayload = {
            target_domain: targetDomain,
            target_sub_genres: [targetSubGenre],
            target_entities: targetEntities.split(',').map(s => s.trim()).filter(Boolean),
            source_search_queries: sourceSearchQueries.split('\n').map(s => s.trim()).filter(Boolean),
            required_media_type: targetDomain === '시네마/드라마' ? 'movie_clip' : targetDomain === '아이돌/연예인' ? 'fancam' : 'general_clip',
            min_resolution: '1080p',
            clean_zone_threshold: cleanZoneThreshold,
        };

        return {
            ...baseStyle,
            source_targeting: sourceTargetingPayload,
            schema_version: 2,
            blueprint_name: name,
            output: { size: '1080x1920', fps: 30, aspect_ratio: '9:16' },
            canvas_type: isLetterbox ? 'LETTERBOX_SOLID' : 'fullscreen_overlay',
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
                            <TabsList className="grid grid-cols-5 h-9 bg-muted/80 p-1 rounded-xl">
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
                                <TabsTrigger value="sourcing" className="text-xs gap-1 data-[state=active]:bg-background data-[state=active]:text-blue-500 font-bold">
                                    <Film className="w-3.5 h-3.5" />
                                    원천 소스 DNA
                                </TabsTrigger>
                                <TabsTrigger value="bible" className="text-xs gap-1 data-[state=active]:bg-background data-[state=active]:text-indigo-500 font-bold">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    제작 가이드
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

                                {/* 🌟 5대 헤더 컨테이너 형태 셀렉터 */}
                                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/30 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Layout className="w-3.5 h-3.5 text-primary" />
                                            헤더 컨테이너 형태 (Container Archetype)
                                        </span>
                                        <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/30">
                                            {containerType === 'floating_capsule' ? '패션탐정냥 Type B (모던 플로팅)' :
                                             containerType === 'letterbox_sandwich' ? '올뉴띵킹 Type A (정통 레터박스)' :
                                             containerType === 'full_width_band' ? '군림보 (상단 풀 띠형)' :
                                             containerType === 'social_post_bar' ? '썰형 / 소셜 바' : '헤더 없음'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                        {[
                                            { id: 'floating_capsule', label: '모던 플로팅 캡슐', desc: '패션탐정냥 (알약+테이프)' },
                                            { id: 'letterbox_sandwich', label: '정통 레터박스', desc: '올뉴띵킹 (상하단 띠)' },
                                            { id: 'full_width_band', label: '상단 풀 띠형', desc: '군림보 (100% 꽉찬 띠)' },
                                            { id: 'social_post_bar', label: '소셜 포스트 바', desc: '썰형 / 블라인드 프로필' },
                                            { id: 'none', label: '헤더 없음', desc: '미스터비스트 (자막 집중)' },
                                        ].map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setContainerType(item.id as any)}
                                                className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                                    containerType === item.id
                                                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs ring-1 ring-primary/40'
                                                        : 'border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground'
                                                }`}
                                            >
                                                <span className="text-[11px] font-bold block">{item.label}</span>
                                                <span className="text-[9px] opacity-70 block mt-0.5">{item.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Top 2-Tier Header Titles & Top Bar Geometry */}
                                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/30 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Type className="w-3.5 h-3.5 text-primary" />
                                            {containerType === 'floating_capsule' ? '플로팅 캡슐 타이틀 (Pill Title)' : '상단 2단 헤더 타이틀 (Top 2-Tier Banner)'}
                                        </span>
                                        {containerType === 'letterbox_sandwich' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-muted-foreground font-mono">
                                                    바 높이: {topBarHeightPct}%
                                                </span>
                                                <input
                                                    type="color"
                                                    value={topBarBgColor}
                                                    onChange={(e) => setTopBarBgColor(e.target.value)}
                                                    className="w-5 h-5 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                                    title="상단 바 배경색"
                                                />
                                            </div>
                                        )}
                                        {containerType === 'floating_capsule' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-muted-foreground font-mono">
                                                    상단 Y: {capsuleTopY}%
                                                </span>
                                                <input
                                                    type="color"
                                                    value={capsuleBgColor}
                                                    onChange={(e) => setCapsuleBgColor(e.target.value)}
                                                    className="w-5 h-5 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                                    title="캡슐 배경색"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Top Bar Height Slider & Font Selection */}
                                    <div className="grid grid-cols-12 gap-3 items-center bg-background/50 p-2 rounded-xl border border-border/40">
                                        <div className="col-span-5">
                                            {containerType === 'letterbox_sandwich' ? (
                                                <>
                                                    <div className="flex justify-between text-[11px] mb-1">
                                                        <span className="text-muted-foreground">상단 블랙바 높이</span>
                                                        <span className="font-bold font-mono">{topBarHeightPct}%</span>
                                                    </div>
                                                    <Slider
                                                        min={8}
                                                        max={30}
                                                        step={0.5}
                                                        value={[topBarHeightPct]}
                                                        onValueChange={([v]) => setTopBarHeightPct(v)}
                                                    />
                                                </>
                                            ) : containerType === 'floating_capsule' ? (
                                                <>
                                                    <div className="flex justify-between text-[11px] mb-1">
                                                        <span className="text-muted-foreground">캡슐 모서리 둥글기</span>
                                                        <span className="font-bold font-mono">{capsuleBorderRadius}px</span>
                                                    </div>
                                                    <Slider
                                                        min={10}
                                                        max={36}
                                                        step={1}
                                                        value={[capsuleBorderRadius]}
                                                        onValueChange={([v]) => setCapsuleBorderRadius(v)}
                                                    />
                                                </>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground">풀스크린 다이내믹 배치</span>
                                            )}
                                        </div>
                                        <div className="col-span-7">
                                            <label className="text-[11px] text-muted-foreground block mb-1">글꼴 (Font Family)</label>
                                            <div className="flex flex-wrap gap-1">
                                                {['Pretendard', 'Black Han Sans', 'Gmarket Sans', 'Noto Sans KR'].map((f) => (
                                                    <Button
                                                        key={f}
                                                        type="button"
                                                        size="sm"
                                                        variant={fontFamily === f ? 'default' : 'outline'}
                                                        onClick={() => setFontFamily(f)}
                                                        className={`h-6 text-[10px] px-2 rounded-md ${
                                                            fontFamily === f ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground border-border/60'
                                                        }`}
                                                    >
                                                        {f === 'Black Han Sans' ? '검은고딕' : f === 'Gmarket Sans' ? 'G마켓' : f}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
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

                                {/* 🌟 서브 테이프 스티커 & 시각 포인터 & 상단 출처 (패션탐정냥 시그니처 컴포넌트) */}
                                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/30 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                                            서브 테이프 라벨 (스티커 코멘트 & 이모지)
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-muted-foreground">스티커 활성화</span>
                                            <Switch checked={subTapeEnabled} onCheckedChange={setSubTapeEnabled} />
                                        </div>
                                    </div>

                                    {subTapeEnabled && (
                                        <div className="space-y-2 pt-1 border-t border-border/40">
                                            <div className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-7">
                                                    <label className="text-[11px] text-muted-foreground block mb-0.5">스티커 문구</label>
                                                    <Input
                                                        value={subTapeText}
                                                        onChange={(e) => setSubTapeText(e.target.value)}
                                                        placeholder="손도 저렇게 작은 줄 몰랐음"
                                                        className="h-7 text-xs bg-background border-border/80 font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[11px] text-muted-foreground block mb-0.5">이모지</label>
                                                    <Input
                                                        value={subTapeEmoji}
                                                        onChange={(e) => setSubTapeEmoji(e.target.value)}
                                                        placeholder="😲💅"
                                                        className="h-7 text-xs bg-background border-border/80 text-center font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-3 flex items-center gap-1.5 pt-4">
                                                    <input
                                                        type="color"
                                                        value={subTapeBgColor}
                                                        onChange={(e) => setSubTapeBgColor(e.target.value)}
                                                        className="w-6 h-6 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                                        title="테이프 배경색"
                                                    />
                                                    <input
                                                        type="color"
                                                        value={subTapeTextColor}
                                                        onChange={(e) => setSubTapeTextColor(e.target.value)}
                                                        className="w-6 h-6 rounded border border-border/80 p-0 cursor-pointer bg-transparent"
                                                        title="텍스트 색"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 시각 포인터 & 상단 출처 한 줄 추가 */}
                                    <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/40">
                                            <div>
                                                <span className="text-[11px] font-bold text-foreground block">시각 화살표 포인터</span>
                                                <span className="text-[9.5px] text-muted-foreground">붉은 곡선 화살표 + 수치 라벨</span>
                                            </div>
                                            <Switch checked={pointerEnabled} onCheckedChange={setPointerEnabled} />
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/40">
                                            <div>
                                                <span className="text-[11px] font-bold text-foreground block">상단 출처 표기</span>
                                                <span className="text-[9.5px] text-muted-foreground">Melon / 방송사 출처 라벨</span>
                                            </div>
                                            <Switch checked={topSourceEnabled} onCheckedChange={setTopSourceEnabled} />
                                        </div>
                                    </div>
                                    {pointerEnabled && (
                                        <div className="grid grid-cols-12 gap-2 items-center bg-background/50 p-2 rounded-xl border border-border/40">
                                            <div className="col-span-6">
                                                <label className="text-[11px] text-muted-foreground block mb-0.5">포인터 라벨</label>
                                                <Input
                                                    value={pointerLabel}
                                                    onChange={(e) => setPointerLabel(e.target.value)}
                                                    placeholder="168 vs 163"
                                                    className="h-7 text-xs bg-background border-border/80 font-bold text-rose-500"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[11px] text-muted-foreground block mb-0.5">X 위치 ({pointerX}%)</label>
                                                <Slider min={20} max={85} step={1} value={[pointerX]} onValueChange={([v]) => setPointerX(v)} />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[11px] text-muted-foreground block mb-0.5">Y 위치 ({pointerY}%)</label>
                                                <Slider min={20} max={75} step={1} value={[pointerY]} onValueChange={([v]) => setPointerY(v)} />
                                            </div>
                                        </div>
                                    )}
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

                                    {/* 🌟 2톤 키워드 강조 자막 설정 */}
                                    <div className="pt-2 border-t border-border/40 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                2톤 키워드 강조 자막 (Two-Tone Highlight)
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10.5px] text-muted-foreground">노란색 강조 활성화</span>
                                                <Switch checked={twoToneEnabled} onCheckedChange={setTwoToneEnabled} />
                                            </div>
                                        </div>
                                        {twoToneEnabled && (
                                            <div className="grid grid-cols-12 gap-2 items-center bg-background/50 p-2 rounded-xl border border-border/40">
                                                <div className="col-span-6">
                                                    <label className="text-[10.5px] text-muted-foreground block mb-0.5">강조 키워드 (노랑)</label>
                                                    <Input
                                                        value={twoToneHighlight}
                                                        onChange={(e) => setTwoToneHighlight(e.target.value)}
                                                        placeholder="키가 5cm"
                                                        className="h-7 text-xs bg-background border-border/80 font-black text-amber-400"
                                                    />
                                                </div>
                                                <div className="col-span-6">
                                                    <label className="text-[10.5px] text-muted-foreground block mb-0.5">기본 문구 (흰색)</label>
                                                    <Input
                                                        value={twoToneBaseText}
                                                        onChange={(e) => setTwoToneBaseText(e.target.value)}
                                                        placeholder="더 큰"
                                                        className="h-7 text-xs bg-background border-border/80 font-bold"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

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

                                    {/* Typography Fine-Tuning (Letter Spacing, Line Height, Box, Shadow) */}
                                    <div className="pt-2 border-t border-border/40 space-y-2">
                                        <span className="text-[11px] font-bold text-muted-foreground block">
                                            타이포그래피 정밀 조율 (Typography & Shadow)
                                        </span>
                                        <div className="grid grid-cols-3 gap-2 bg-background/40 p-2 rounded-xl border border-border/40">
                                            <div>
                                                <div className="flex justify-between text-[10px] mb-1">
                                                    <span className="text-muted-foreground">자간</span>
                                                    <span className="font-bold font-mono">{letterSpacing}px</span>
                                                </div>
                                                <Slider
                                                    min={-2}
                                                    max={4}
                                                    step={0.5}
                                                    value={[letterSpacing]}
                                                    onValueChange={([v]) => setLetterSpacing(v)}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[10px] mb-1">
                                                    <span className="text-muted-foreground">그림자 흐림</span>
                                                    <span className="font-bold font-mono">{textShadowBlur}px</span>
                                                </div>
                                                <Slider
                                                    min={0}
                                                    max={12}
                                                    step={1}
                                                    value={[textShadowBlur]}
                                                    onValueChange={([v]) => setTextShadowBlur(v)}
                                                />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-semibold text-muted-foreground">배경 박스</span>
                                                    <Switch checked={captionBgBox} onCheckedChange={setCaptionBgBox} />
                                                </div>
                                                {captionBgBox && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <input
                                                            type="color"
                                                            value={captionBgBoxColor.startsWith('#') ? captionBgBoxColor : '#000000'}
                                                            onChange={(e) => setCaptionBgBoxColor(e.target.value)}
                                                            className="w-5 h-5 rounded border border-border/60 p-0 cursor-pointer bg-transparent"
                                                        />
                                                        <span className="text-[9px] text-muted-foreground">반투명 박스</span>
                                                    </div>
                                                )}
                                            </div>
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

                            {/* TAB 4: Source Targeting DNA (원천 소스 소싱 타겟팅 프로필) */}
                            <TabsContent value="sourcing" className="space-y-4 pt-3">
                                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/30 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Film className="w-3.5 h-3.5 text-primary" />
                                            원천 소스 영상 타겟팅 DNA (소싱 기준 프로필)
                                        </span>
                                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                                            1080p 무자막 클린존
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        소싱 센터 및 총괄 연출 대화창에서 원천 영상을 자동 발굴할 때 기준으로 삼을 메이저 도메인, 세부 소분류, 타겟 작품/인물명, 검색 쿼리를 정의합니다.
                                    </p>

                                    {/* 1. 도메인 및 소분류 선택 */}
                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                                        <div>
                                            <label className="text-[11px] font-bold text-foreground block mb-1">타겟 메이저 도메인</label>
                                            <select
                                                value={targetDomain}
                                                onChange={(e) => setTargetDomain(e.target.value)}
                                                className="w-full h-8 text-xs bg-background border border-border/80 rounded-lg px-2 text-foreground font-semibold"
                                            >
                                                <option value="시네마/드라마">🎬 시네마/드라마</option>
                                                <option value="아이돌/연예인">✨ 아이돌/연예인</option>
                                                <option value="이슈/시사/정치">⚖️ 이슈/시사/정치</option>
                                                <option value="서브컬처/애니">🎌 서브컬처/애니</option>
                                                <option value="스포츠/피트니스">⚽ 스포츠/피트니스</option>
                                                <option value="예능/코미디">🤣 예능/코미디</option>
                                                <option value="커뮤니티/썰">💬 커뮤니티/썰</option>
                                                <option value="지식/교양/다큐">📚 지식/교양/다큐</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-foreground block mb-1">세부 장르 소분류</label>
                                            <Input
                                                value={targetSubGenre}
                                                onChange={(e) => setTargetSubGenre(e.target.value)}
                                                placeholder="예: 감동/눈물실화, 사복패션, 국회청문회"
                                                className="h-8 text-xs bg-background border-border/80 font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* 2. 타겟 핵심 작품/인물명 (엔티티) */}
                                    <div className="pt-2 border-t border-border/40">
                                        <label className="text-[11px] font-bold text-foreground block mb-1">
                                            타겟 핵심 작품/인물명 (엔티티 - 쉼표로 구분)
                                        </label>
                                        <Input
                                            value={targetEntities}
                                            onChange={(e) => setTargetEntities(e.target.value)}
                                            placeholder="예: 하치이야기, 인생은 아름다워, 포레스트 검프, 세 얼간이"
                                            className="h-8 text-xs bg-background border-border/80"
                                        />
                                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                            스카우터가 해당 작품/인물의 고화질 클립을 우선적으로 추적합니다.
                                        </span>
                                    </div>

                                    {/* 3. 소싱 탐색 검색 쿼리 목록 */}
                                    <div className="pt-2 border-t border-border/40">
                                        <label className="text-[11px] font-bold text-foreground block mb-1">
                                            소싱 탐색 정밀 검색 쿼리 (줄바꿈으로 구분)
                                        </label>
                                        <Textarea
                                            value={sourceSearchQueries}
                                            onChange={(e) => setSourceSearchQueries(e.target.value)}
                                            rows={3}
                                            placeholder="줄바꿈으로 검색 쿼리를 입력하세요"
                                            className="text-xs bg-background border-border/80 font-mono leading-relaxed"
                                        />
                                    </div>

                                    {/* 4. 클린존 적합도 기준 */}
                                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                        <div>
                                            <label className="text-[11px] font-bold text-foreground block">
                                                최소 클린존(자막 없는 안전영역) 적합도 기준
                                            </label>
                                            <span className="text-[10px] text-muted-foreground">
                                                화면 상하단에 타사 자막이나 로고가 없는 깨끗한 영상만 필터링합니다.
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Slider
                                                min={70}
                                                max={95}
                                                step={5}
                                                value={[cleanZoneThreshold]}
                                                onValueChange={([v]) => setCleanZoneThreshold(v)}
                                                className="w-28"
                                            />
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                {cleanZoneThreshold}% 이상
                                            </span>
                                        </div>
                                    </div>
                                </div>
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
                        {/* 🌟 4단 뷰 토글 버튼: [👁️ 원본] [🎨 프리셋] [⚖️ 1:1 오버레이] + [🛡️ 세이프존] */}
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
                                오버레이
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={showSafeZone ? 'default' : 'ghost'}
                                onClick={() => setShowSafeZone(!showSafeZone)}
                                className={`h-7 text-[11px] font-bold px-2 rounded-lg gap-1 cursor-pointer transition-all ${
                                    showSafeZone ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="유튜브 쇼츠 실제 UI(좋아요, 댓글, 하단 채널명) 및 세이프존 오버레이"
                            >
                                <Shield className="w-3 h-3" />
                                세이프존
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
                                        {containerType === 'floating_capsule' ? (
                                            /* 🌟 FASHION DETECTIVE (패션탐정냥 Type B: 9:16 Fullscreen Video Canvas + Floating Capsule + Sub-tape + Pointer + Two-tone Caption) */
                                            <div className="absolute inset-0 w-full h-full flex flex-col justify-between overflow-hidden">
                                                {/* Fullscreen Background Video/Keyframe */}
                                                <div className="absolute inset-0 w-full h-full bg-black z-0">
                                                    {videoBgUrl ? (
                                                        <img 
                                                            src={videoBgUrl} 
                                                            alt="Reference Keyframe" 
                                                            className="w-full h-full object-cover transition-transform duration-500 select-none pointer-events-none"
                                                            style={{ transform: `scale(${zoomPct / 100})` }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center p-3">
                                                            <Film className="w-8 h-8 text-white/30 mb-2" />
                                                            <span className="text-[11px] font-bold text-white/80 text-center">9:16 풀스크린 미디어 캔버스</span>
                                                        </div>
                                                    )}
                                                    {/* Subtle Gradient Overlays */}
                                                    <div className="absolute inset-x-0 top-0 h-32 pointer-events-none bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
                                                    <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                                </div>

                                                {/* Top Section: Top Source & Floating Capsule & Sub-tape */}
                                                <div className="w-full z-20 flex flex-col items-center px-3 pt-2">
                                                    {/* Top Source Label */}
                                                    {topSourceEnabled && (
                                                        <span 
                                                            className="text-[9px] font-medium tracking-tight mb-1 text-center"
                                                            style={{ color: topSourceColor }}
                                                        >
                                                            {topSourceText}
                                                        </span>
                                                    )}

                                                    {/* Floating Black Capsule Pill */}
                                                    <div 
                                                        className="px-3.5 py-1.5 shadow-2xl flex flex-col items-center justify-center border border-white/20 transition-all select-none"
                                                        style={{
                                                            backgroundColor: capsuleBgColor,
                                                            borderRadius: `${capsuleBorderRadius}px`,
                                                            maxWidth: `${capsuleWidthPct}%`,
                                                            width: 'auto',
                                                        }}
                                                    >
                                                        <span
                                                            className="font-bold text-center leading-tight truncate w-full"
                                                            style={{
                                                                color: headerLine1Color,
                                                                fontSize: `${Math.max(11, Math.round(headerLine1Size * 0.45))}px`,
                                                                fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
                                                                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                                            }}
                                                        >
                                                            {headerLine1Text}
                                                        </span>
                                                        <span
                                                            className="font-black text-center leading-tight truncate w-full mt-0.5"
                                                            style={{
                                                                color: headerLine2Color,
                                                                fontSize: `${Math.max(13, Math.round(headerLine2Size * 0.48))}px`,
                                                                fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
                                                                textShadow: '0 2px 5px rgba(0,0,0,0.9)',
                                                            }}
                                                        >
                                                            {headerLine2Text}
                                                        </span>
                                                    </div>

                                                    {/* Sub-tape Sticker Label right below capsule */}
                                                    {subTapeEnabled && (
                                                        <div 
                                                            className="mt-1 px-2.5 py-0.5 rounded shadow-lg flex items-center justify-center gap-1 border border-amber-300 font-bold transition-all select-none"
                                                            style={{
                                                                backgroundColor: subTapeBgColor,
                                                                color: subTapeTextColor,
                                                            }}
                                                        >
                                                            <span className="text-[10px] font-black tracking-tight whitespace-nowrap">
                                                                {subTapeText} {subTapeEmoji}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Center Section: Visual Pointer (Red curved arrow & label) */}
                                                {pointerEnabled && (
                                                    <div 
                                                        className="absolute z-30 flex items-center gap-1 pointer-events-none select-none"
                                                        style={{
                                                            left: `${pointerX}%`,
                                                            top: `${pointerY}%`,
                                                            transform: 'translate(-50%, -50%)',
                                                        }}
                                                    >
                                                        {/* Curved Arrow SVG */}
                                                        <svg className="w-6 h-6 -rotate-12 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke={pointerColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M14 9l6 6-6 6" />
                                                            <path d="M4 4v7a4 4 0 0 0 4 4h11" />
                                                        </svg>
                                                        <Badge className="bg-red-600/90 text-white font-black text-[9px] px-1.5 py-0.2 shadow-md">
                                                            {pointerLabel}
                                                        </Badge>
                                                    </div>
                                                )}

                                                {/* Jab Hook in middle if enabled */}
                                                {jabEnabled && (
                                                    <div
                                                        className="absolute top-[48%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md shadow-xl transition-all z-30"
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

                                                {/* Bottom Section: Two-Tone or Standard Captions */}
                                                <div 
                                                    className="w-full text-center px-2 z-20 pointer-events-none transition-all flex flex-col items-center justify-center"
                                                    style={{
                                                        marginBottom: `${captionMarginBottom * 0.45}%`,
                                                    }}
                                                >
                                                    {twoToneEnabled ? (
                                                        <div className="font-black leading-tight flex items-center justify-center gap-1 flex-wrap">
                                                            <span
                                                                style={{
                                                                    color: twoToneHighlightColor,
                                                                    fontSize: `${Math.max(13, Math.round(fontSize * 0.32))}px`,
                                                                    fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
                                                                    WebkitTextStroke: `${Math.max(1, outlinePx * 0.22)}px ${outlineColor}`,
                                                                    textShadow: `0 2px ${textShadowBlur}px ${outlineColor}`,
                                                                }}
                                                            >
                                                                {twoToneHighlight}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    color: twoToneBaseColor,
                                                                    fontSize: `${Math.max(13, Math.round(fontSize * 0.32))}px`,
                                                                    fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
                                                                    WebkitTextStroke: `${Math.max(1, outlinePx * 0.22)}px ${outlineColor}`,
                                                                    textShadow: `0 2px ${textShadowBlur}px ${outlineColor}`,
                                                                }}
                                                            >
                                                                {twoToneBaseText}
                                                            </span>
                                                        </div>
                                                    ) : bilingualEnabled ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span 
                                                                className="font-bold text-center leading-tight tracking-tight px-1"
                                                                style={{
                                                                    color: captionLine1Color,
                                                                    fontSize: '12px',
                                                                    fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
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
                                                                    fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
                                                                    textShadow: '0 2px 4px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                                                                }}
                                                            >
                                                                {captionLine2Ko}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className="font-black leading-tight transition-all"
                                                            style={{
                                                                color: captionColor,
                                                                fontSize: `${Math.max(12, Math.round(fontSize * 0.28))}px`,
                                                                fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : fontFamily === 'Gmarket Sans' ? '"Gmarket Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
                                                                letterSpacing: `${letterSpacing}px`,
                                                                lineHeight: lineHeight,
                                                                WebkitTextStroke: `${Math.max(1, outlinePx * 0.22)}px ${outlineColor}`,
                                                                textShadow: `0 2px ${textShadowBlur}px ${outlineColor}`,
                                                                backgroundColor: captionBgBox ? captionBgBoxColor : 'transparent',
                                                                padding: captionBgBox ? '2px 8px' : '0',
                                                                borderRadius: captionBgBox ? '6px' : '0',
                                                            }}
                                                        >
                                                            {captionText}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* CASE: 정통 레터박스 샌드위치 / 상단 띠형 (Type A & Other Archetypes) */
                                            <>
                                                {/* Layer 1: Top Black Bar & 2-Tier Header (Burgundy Velvet Curtain if Theater Mode) */}
                                                <div
                                                    className="w-full z-20 flex flex-col items-center justify-center px-2 py-1 transition-all relative overflow-hidden"
                                                    style={{
                                                        backgroundColor: topBarBgColor,
                                                        background: isTheaterMode 
                                                            ? 'linear-gradient(180deg, #4A0E17 0%, #2A080D 75%, #150305 100%)' 
                                                            : topBarBgColor,
                                                        minHeight: `${topBarHeightPct}%`,
                                                    }}
                                                >
                                                    {isTheaterMode && (
                                                        <div className="absolute inset-x-0 top-0 h-full pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/30 via-rose-950/20 to-transparent" />
                                                    )}
                                                    <span
                                                        className="font-bold text-center leading-tight truncate w-full transition-all relative z-10"
                                                        style={{
                                                            color: headerLine1Color,
                                                            fontSize: `${Math.max(11, Math.round(headerLine1Size * 0.45))}px`,
                                                            fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : fontFamily === 'Gmarket Sans' ? '"Gmarket Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
                                                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                                        }}
                                                    >
                                                        {headerLine1Text}
                                                    </span>
                                                    <span
                                                        className="font-black text-center leading-tight truncate w-full transition-all mt-0.5 relative z-10"
                                                        style={{
                                                            color: headerLine2Color,
                                                            fontSize: `${Math.max(13, Math.round(headerLine2Size * 0.48))}px`,
                                                            fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : fontFamily === 'Gmarket Sans' ? '"Gmarket Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
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
                                                                            fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
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
                                                                            fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
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
                                                        className="w-full text-center px-2 z-20 pointer-events-none transition-all flex justify-center"
                                                        style={{
                                                            marginBottom: `${captionMarginBottom * 0.45}%`,
                                                        }}
                                                    >
                                                        <span
                                                            className="font-black leading-tight transition-all"
                                                            style={{
                                                                color: captionColor,
                                                                fontSize: `${Math.max(12, Math.round(fontSize * 0.28))}px`,
                                                                fontFamily: fontFamily === 'Black Han Sans' ? '"Black Han Sans", sans-serif' : fontFamily === 'Gmarket Sans' ? '"Gmarket Sans", sans-serif' : 'Pretendard, -apple-system, sans-serif',
                                                                letterSpacing: `${letterSpacing}px`,
                                                                lineHeight: lineHeight,
                                                                WebkitTextStroke: `${Math.max(1, outlinePx * 0.22)}px ${outlineColor}`,
                                                                textShadow: `0 2px ${textShadowBlur}px ${outlineColor}`,
                                                                backgroundColor: captionBgBox ? captionBgBoxColor : 'transparent',
                                                                padding: captionBgBox ? '2px 8px' : '0',
                                                                borderRadius: captionBgBox ? '6px' : '0',
                                                            }}
                                                        >
                                                            {captionText}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Layer 5: Bottom Source Bar & Black Band (Or Cinema Seats Silhouette if Theater Mode) */}
                                                {isTheaterMode ? (
                                                    <div
                                                        className="w-full z-20 flex flex-col items-center justify-end px-2 pt-1 pb-1 transition-all border-t border-rose-950/40 relative overflow-hidden"
                                                        style={{
                                                            minHeight: `${Math.max(10, bottomBarHeightPct)}%`,
                                                            background: 'linear-gradient(0deg, #0A0203 0%, #1A0507 70%, transparent 100%)'
                                                        }}
                                                    >
                                                        {/* Cinema Seats Silhouette */}
                                                        <div className="w-full flex items-center justify-center gap-1 opacity-70 pb-0.5">
                                                            {[...Array(6)].map((_, seatIdx) => (
                                                                <div key={seatIdx} className="w-6 h-3.5 rounded-t-md bg-neutral-900 border-t border-rose-900/40 shadow-xs" />
                                                            ))}
                                                        </div>
                                                        {bottomSourceEnabled && (
                                                            <span className="text-[8.5px] text-neutral-400 truncate font-medium">
                                                                {bottomSourceText}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : bottomSourceEnabled ? (
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
                                                ) : null}
                                            </>
                                        )}
                                    </div>

                                    {/* 🛡️ YouTube Shorts Platform UI & Safe Zone Overlay */}
                                    {showSafeZone && (
                                        <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-2 select-none">
                                            {/* Safe Zone Boundary Box */}
                                            <div className="absolute inset-x-2 top-2 bottom-12 border border-dashed border-emerald-400/40 rounded-2xl pointer-events-none" />

                                            {/* Top Icons */}
                                            <div className="flex justify-between items-center text-[10px] text-white/70 px-1 pt-1">
                                                <span className="font-bold">Shorts</span>
                                                <span className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded">🔍</span>
                                            </div>

                                            {/* Right Action Icons (Like, Comment, Share, Sound) */}
                                            <div className="absolute right-2 bottom-16 flex flex-col items-center gap-3 text-white">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-xs">❤️</div>
                                                    <span className="text-[8px] font-bold mt-0.5">1.2M</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-xs">💬</div>
                                                    <span className="text-[8px] font-bold mt-0.5">3.8K</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-xs">↗️</div>
                                                    <span className="text-[8px] font-bold mt-0.5">공유</span>
                                                </div>
                                                <div className="w-6 h-6 rounded-full border border-white/60 bg-black/50 flex items-center justify-center text-[10px] animate-spin">
                                                    🎵
                                                </div>
                                            </div>

                                            {/* Bottom Channel Info & Subscribe */}
                                            <div className="absolute left-2.5 bottom-3 text-white max-w-[170px] space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-[9px] font-bold">V</div>
                                                    <span className="text-[9px] font-bold truncate">@ViraLoopStudio</span>
                                                    <span className="bg-red-600 text-white text-[7.5px] font-bold px-1.5 py-0.5 rounded-full">구독</span>
                                                </div>
                                                <p className="text-[8px] text-white/80 line-clamp-1">#쇼츠 #알고리즘 #바이럴루프</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 🎬 Preserved Keyframes Film Strip Carousel */}
                        <div className="w-full mt-3 p-2.5 rounded-2xl bg-muted/40 border border-border/80">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                    <Film className="w-3.5 h-3.5 text-primary" />
                                    추출된 씬 키프레임 {keyframesList.length > 0 ? `(${keyframesList.length}개)` : ''}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    클릭 시 해당 장면으로 대조
                                </span>
                            </div>
                            {keyframesList.length > 0 ? (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                                    {keyframesList.map((kf: any, idx: number) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setSelectedKeyframeIndex(idx);
                                                const kfUrl = kf.url || kf.local_path;
                                                setVideoBgUrl(kfUrl);
                                                setRefThumbnailUrl(kfUrl);
                                            }}
                                            className={`relative rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                                selectedKeyframeIndex === idx
                                                    ? 'border-primary ring-2 ring-primary/30 scale-105'
                                                    : 'border-border/60 hover:border-border opacity-70 hover:opacity-100'
                                            }`}
                                            style={{ width: '48px', height: '64px' }}
                                        >
                                            <img
                                                src={kf.url || kf.local_path}
                                                alt={`Keyframe ${idx}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                            <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-white text-center py-0.5">
                                                {kf.label || `${kf.time_s ?? idx}s`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-2 text-[10px] text-muted-foreground bg-background/50 rounded-lg border border-border/40">
                                    분석 영상에서 추출된 키프레임 스트립이 여기에 자동 표시됩니다.
                                </div>
                            )}
                        </div>

                        <span className="text-[10px] text-muted-foreground mt-1.5 text-center">
                            📐 원본 레퍼런스 및 1:1 오버레이 • 쇼츠 세이프존 검증 캔버스
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
                            ID: {preset.id || (preset as any).preset_id || (preset as any).benchmark_id || '-'}
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
                            className="h-8 text-xs gap-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border shadow-xs cursor-pointer"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? '저장 중...' : '프리셋 덮어쓰기 저장'}
                        </Button>

                        {onSelectPreset && (
                            <Button
                                type="button"
                                onClick={() => {
                                    onSelectPreset(preset);
                                    onOpenChange(false);
                                }}
                                className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                대화창에 이 프리셋 적용
                            </Button>
                        )}
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
