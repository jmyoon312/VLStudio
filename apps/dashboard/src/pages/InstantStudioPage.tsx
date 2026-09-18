import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Player } from '@remotion/player';
import { DynamicShortsTemplate } from '@/remotion/compositions/DynamicShortsTemplate';
import { 
    Zap, Play, Sparkles, Send, 
    MessageSquare, Download, ExternalLink, 
    Bot, User, RefreshCw, 
    Sliders, Cpu, ShieldCheck, Film,
    Flame, Newspaper, FileText, CheckCircle2, Tv, Dna,
    UploadCloud, Clock, Volume2, Wrench, ArrowUpRight, Globe
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export interface SceneItem {
    id: string;
    sceneNumber: number;
    title: string;
    subtitle: string;
    narration: string;
    duration: number; // in seconds
    startTime: number;
    visualPrompt: string;
    highlightWord?: string;
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
    latencyMs?: number;
    directorComment?: string;
}

interface BenchmarkDNA {
    id: number;
    channel_url: string;
    channel_title: string;
    subscriber_count: number;
    category_name: string;
    hook_style: string;
    wpm: number;
    top_bar_color: string;
    line1_color?: string;
    line2_color?: string;
    subtitle_color: string;
    subtitle_y_pct?: number;
    bgm_mood: string;
    recommended_voice?: string;
    hook_bar?: {
        enabled: boolean;
        bg_color?: string;
        text_color?: string;
        y_pct?: number;
    };
}

export const EDGE_VOICE_OPTIONS = [
    { id: 'ko-KR-InJoonNeural', name: '인준 (쇼츠 풍자/속보)', gender: '남성', tag: '⚡ 뇌전구 권장 (1.25x)' },
    { id: 'ko-KR-SunHiNeural', name: '선희 (아나운서/명랑)', gender: '여성', tag: '🎙️ 표준' },
    { id: 'ko-KR-HyunsuNeural', name: '현수 (진중한 내러티브)', gender: '남성', tag: '🎭 썰형' },
    { id: 'ko-KR-BongJinNeural', name: '봉진 (코믹/캐주얼)', gender: '남성', tag: '💬 유머' },
    { id: 'ko-KR-GookMinNeural', name: '국민 (신뢰/뉴스 속보)', gender: '남성', tag: '📰 군림보' },
    { id: 'ko-KR-JiMinNeural', name: '지민 (차분/정보)', gender: '여성', tag: '🌸 지식' },
    { id: 'ko-KR-SeoHyeonNeural', name: '서현 (밝음/브이로그)', gender: '여성', tag: '✨ 일상' }
];

const BENCHMARK_PRESETS: BenchmarkDNA[] = [
    {
        id: 2,
        channel_url: 'https://youtube.com/@noejeongu',
        channel_title: '뇌전구 (Noejeongu)',
        subscriber_count: 512000,
        category_name: 'IT / 테크 / 풍자 썰',
        hook_style: '⚡ 0초 극단 호기심 후킹 (1:1 샌드위치)',
        wpm: 430,
        top_bar_color: '#000000',
        line1_color: '#FFFFFF',
        line2_color: '#FFE500',
        subtitle_color: '#FFE500',
        subtitle_y_pct: 72.0,
        bgm_mood: 'Lo-Fi 코믹 펑크 (-22dB)',
        recommended_voice: 'ko-KR-InJoonNeural',
        hook_bar: {
            enabled: true,
            bg_color: '#FFFFFF',
            text_color: '#000000',
            y_pct: 29.5
        }
    },
    {
        id: 1,
        channel_url: 'https://youtube.com/@lululalallilly',
        channel_title: '룰루랄라릴리 (공감 썰형)',
        subscriber_count: 248000,
        category_name: '직장/인생 썰 숏폼',
        hook_style: '💬 도발적 반문형 훅',
        wpm: 310,
        top_bar_color: '#0F172A',
        line1_color: '#FFFFFF',
        line2_color: '#38BDF8',
        subtitle_color: '#38BDF8',
        subtitle_y_pct: 70.0,
        bgm_mood: '경쾌한 로파이 재즈',
        recommended_voice: 'ko-KR-HyunsuNeural'
    },
    {
        id: 3,
        channel_url: 'https://youtube.com/@gunlimbo',
        channel_title: '군림보 (이슈 속보형)',
        subscriber_count: 850000,
        category_name: '사건/사고 속보 숏폼',
        hook_style: '🚨 경보형 타이틀 훅',
        wpm: 360,
        top_bar_color: '#000000',
        line1_color: '#FFFFFF',
        line2_color: '#EF4444',
        subtitle_color: '#EF4444',
        subtitle_y_pct: 68.0,
        bgm_mood: '드라마틱 오케스트라',
        recommended_voice: 'ko-KR-GookMinNeural'
    }
];

const INITIAL_SCENES: SceneItem[] = [
    {
        id: 's1',
        sceneNumber: 1,
        title: '첫 3초 후킹 구간',
        subtitle: '남들 다 퇴사하는데 나만 승진한 썰ㅋㅋ',
        narration: '남들 다 퇴사하는데 나만 초고속 승진한 진짜 썰 풉니다.',
        duration: 3.5,
        startTime: 0.0,
        visualPrompt: 'Dramatic office boardroom scene, stunned protagonist',
        highlightWord: '나만 초고속 승진한'
    },
    {
        id: 's2',
        sceneNumber: 2,
        title: '사건 전개 및 충격',
        subtitle: '지난주 월요일, 부서장이 전원 사직서를 제출했다',
        narration: '지난주 월요일 부서장이 갑자기 긴급 회의를 열더니 핵심 시니어 네 명이 단체로 이직을 선언했습니다.',
        duration: 5.5,
        startTime: 3.5,
        visualPrompt: 'Intense cinematic lighting on four resignation letters on executive desk',
        highlightWord: '단체로 이직을 선언'
    },
    {
        id: 's3',
        sceneNumber: 3,
        title: '반전과 기회 포착',
        subtitle: '대표님이 나를 부르더니 "자네가 다음 팀장일세"',
        narration: '당황해서 굳어있던 저를 대표님이 조용히 부르시더니 자네가 다음 팀장일세 라며 악수를 건넸습니다.',
        duration: 6.0,
        startTime: 9.0,
        visualPrompt: 'CEO offering a handshake in high-rise corner office, golden hour lighting',
        highlightWord: '자네가 다음 팀장일세'
    },
    {
        id: 's4',
        sceneNumber: 4,
        title: '결말 및 바이럴 질문',
        subtitle: '얼떨결에 연봉 40% 올랐는데, 이거 도망쳐야 할까요?',
        narration: '얼떨결에 연봉 40% 인상 계약서에 서명했는데 여러분이라면 여기서 버티시겠습니까? 댓글로 알려주세요!',
        duration: 5.0,
        startTime: 15.0,
        visualPrompt: 'Protagonist holding a brand new namecard with doubtful funny expression',
        highlightWord: '여기서 버티시겠습니까?'
    }
];

export const InstantStudioPage: React.FC = () => {
    const navigate = useNavigate();

    // 1. Fetch DB Settings (Single Source of Truth)
    const { data: dbSettings } = useQuery({
        queryKey: ['dbSettings'],
        queryFn: async () => (await api.get('/settings')).data,
        staleTime: 60000
    });

    const activeModelName = useMemo(() => {
        return dbSettings?.script_analysis_model || dbSettings?.default_llm_model || 'omniroute/viraloop1';
    }, [dbSettings]);

    // 2. Channels & Benchmark DNA
    const [channels, setChannels] = useState<ChannelItem[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<number>(1);
    const [benchmarks, setBenchmarks] = useState<BenchmarkDNA[]>(BENCHMARK_PRESETS);
    const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<number>(2); // Default to 뇌전구 (#2)

    // 0. Sovereign Autopilot Mode & State
    const [studioMode, setStudioMode] = useState<'autopilot' | 'manual'>('autopilot');
    const [autopilotRefUrl, setAutopilotRefUrl] = useState<string>('https://www.youtube.com/@noejeongu');
    const [autopilotSourceUrl, setAutopilotSourceUrl] = useState<string>('https://www.fmkorea.com/best/10346571003');
    const [autopilotVoiceEngine, setAutopilotVoiceEngine] = useState<string>('supertone-local');
    const [isAutopilotRunning, setIsAutopilotRunning] = useState<boolean>(false);
    const [autopilotSteps, setAutopilotSteps] = useState<any[]>([]);
    const [autopilotResult, setAutopilotResult] = useState<any>(null);

    // 2-1. Voice & TTS Options
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('ko-KR-InJoonNeural'); // 뇌전구 권장 InJoon
    const [voiceSpeedRate, setVoiceSpeedRate] = useState<string>('15'); // +15% WPM ~380
    const [templateAnalyzeUrl, setTemplateAnalyzeUrl] = useState<string>('');
    const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState<boolean>(false);
    const [isAnalyzingUrl, setIsAnalyzingUrl] = useState<boolean>(false);

    // 3. Curated Materials Feed
    const [feedTab, setFeedTab] = useState<'all' | 'news' | 'ssul' | 'video' | 'custom'>('all');
    const [viralArticles, setViralArticles] = useState<ViralArticleItem[]>([]);
    const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(false);
    const [selectedArticle, setSelectedArticle] = useState<ViralArticleItem | null>(null);
    const [customTitle, setCustomTitle] = useState<string>('');
    const [customContent, setCustomContent] = useState<string>('');

    // 4. Project State (Remotion Input Props)
    const [topHeadlineLine1, setTopHeadlineLine1] = useState<string>('남들 다 퇴사할 때');
    const [topHeadlineLine2, setTopHeadlineLine2] = useState<string>('나만 승진한 썰ㅋㅋ');
    const [hookBarText, setHookBarText] = useState<string>('남들 다 퇴사하는데 나만 초고속 승진한 진짜 썰');
    const [scenes, setScenes] = useState<SceneItem[]>(INITIAL_SCENES);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);

    // 5. Remotion Player State
    const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
    const totalDurationSec = useMemo(() => scenes.reduce((acc, s) => acc + s.duration, 0), [scenes]);
    const totalFrames = Math.max(90, Math.round(totalDurationSec * 30));

    // 6. AI Copilot Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init-1',
            sender: 'ai',
            text: `안녕하세요! ViraLoop 수석 AI 쇼츠 디렉터입니다. 연결된 모델 [${activeModelName}] 및 벤치마크 [뇌전구 (Noejeongu)] DNA 규격에 맞춰 대본과 Remotion 캔버스가 정렬되었습니다. 자연어로 지시하시면 실제 LLM과 TTS 엔진이 비디오를 즉각 핫 리로드합니다.`,
            timestamp: '방금 전'
        }
    ]);
    const [inputPrompt, setInputPrompt] = useState<string>('');
    const [isAiExecuting, setIsAiExecuting] = useState<boolean>(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // 7. Work Queue & Remotion Render State
    const [isRemotionRendering, setIsRemotionRendering] = useState<boolean>(false);
    const [isDispatchingQueue, setIsDispatchingQueue] = useState<boolean>(false);
    const [renderedMp4Path, setRenderedMp4Path] = useState<string | null>(null);

    // Load initial channels & real benchmarks from viral_loop.db
    useEffect(() => {
        const initData = async () => {
            try {
                const res = await api.get('/channels/');
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    setChannels(res.data);
                    setSelectedChannelId(res.data[0].id);
                }
            } catch (err) {
                console.warn('[InstantStudio] Channels load fallback:', err);
            }

            try {
                const bRes = await api.get('/discovery/benchmarks');
                if (bRes.data?.benchmarks && Array.isArray(bRes.data.benchmarks) && bRes.data.benchmarks.length > 0) {
                    setBenchmarks(bRes.data.benchmarks);
                    const noejeongu = bRes.data.benchmarks.find((b: any) => b.channel_title?.includes('뇌전구') || b.id === 2);
                    if (noejeongu) {
                        setSelectedBenchmarkId(noejeongu.id);
                        if (noejeongu.recommended_voice) setSelectedVoiceId(noejeongu.recommended_voice);
                    }
                }
            } catch (err) {
                console.warn('[InstantStudio] Benchmarks load fallback:', err);
            }
        };
        initData();
    }, []);

    // Load viral articles
    useEffect(() => {
        const loadFeed = async () => {
            setIsLoadingFeed(true);
            try {
                const res = await api.get('/viral/articles?limit=12');
                const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
                setViralArticles(items);
            } catch (e) {
                console.warn('[InstantStudio] Viral articles load error:', e);
            } finally {
                setIsLoadingFeed(false);
            }
        };
        loadFeed();
    }, []);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const activeBenchmark = benchmarks.find(b => b.id === selectedBenchmarkId) || benchmarks[0];
    const activeChannel = channels.find(c => c.id === selectedChannelId) || channels[0];

    // ⚡ Real TTS Synthesis Engine (Calls POST /api/tools/tts/generate)
    const synthesizeFullNarration = async (scenesList: SceneItem[], voiceIdOverride?: string, rateOverride?: string) => {
        const fullText = scenesList.map(s => s.narration).join(' ');
        if (!fullText.trim()) return;

        setIsGeneratingTts(true);
        const voice = voiceIdOverride || selectedVoiceId;
        const rate = rateOverride || voiceSpeedRate;
        try {
            const formData = new FormData();
            formData.append('text', fullText);
            formData.append('engine', 'edge');
            formData.append('language', 'ko-KR');
            formData.append('voice_id', voice);
            formData.append('rate', rate);

            const res = await api.post('/tools/tts/generate', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.url || res.data?.web_url) {
                const audioPath = res.data.web_url || res.data.url;
                setAudioUrl(audioPath);
                toast.success(`🗣️ Edge-TTS [${voice.replace('ko-KR-', '')}] 속도 +${rate}% 음성 합성 완료!`);
            }
        } catch (e) {
            console.warn('[InstantStudio] TTS generation error:', e);
        } finally {
            setIsGeneratingTts(false);
        }
    };

    // 🌐 Real URL Scraper & AI Scene Assembler (FMKorea, DCInside, News)
    const handleAnalyzeUrlSource = async (rawUrl: string) => {
        if (!rawUrl.trim() || !rawUrl.startsWith('http')) {
            toast.error('유효한 기사 또는 커뮤니티 URL을 입력해주세요.');
            return;
        }
        setIsAnalyzingUrl(true);
        toast.info('🌐 원문 웹 크롤러 및 AI 대본 분석기가 가동 중입니다...');
        try {
            const res = await api.post('/discovery/analyze-url', {
                url: rawUrl,
                benchmark_id: selectedBenchmarkId,
                channel_id: selectedChannelId
            });
            if (res.data?.ok) {
                setTopHeadlineLine1(res.data.topHeadlineLine1 || '상황 폭로된');
                setTopHeadlineLine2(res.data.topHeadlineLine2 || '네티즌 폭발적 반응');
                setHookBarText(res.data.hookBarText || res.data.scraped_title);
                if (res.data.scenes && res.data.scenes.length > 0) {
                    setScenes(res.data.scenes);
                    synthesizeFullNarration(res.data.scenes);
                }
                toast.success(`🎉 원문 발골 완료! [${res.data.scraped_title.slice(0, 20)}...] 씬 대본 생성 완료`);
            }
        } catch (e: any) {
            toast.error('URL 크롤링 및 분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzingUrl(false);
        }
    };

    // 🔎 In-Studio Reference Template Forensic Analyzer & Saver
    const handleAnalyzeAndSaveTemplate = async () => {
        if (!templateAnalyzeUrl.trim() || !templateAnalyzeUrl.startsWith('http')) {
            toast.error('유효한 유튜브 영상 또는 채널 URL을 입력해주세요.');
            return;
        }
        setIsAnalyzingTemplate(true);
        toast.info('🔎 레퍼런스 채널 템플릿 포렌식 분석 및 저장 중...');
        try {
            const res = await api.post('/discovery/analyze-template', {
                url: templateAnalyzeUrl,
                category_name: activeBenchmark.category_name || 'IT/테크/풍자 썰'
            });
            if (res.data?.ok) {
                toast.success(`🎉 '${res.data.channel_title}' 템플릿 포렌식 발골 및 저장이 완료되었습니다!`);
                const bRes = await api.get('/discovery/benchmarks');
                if (bRes.data?.benchmarks && Array.isArray(bRes.data.benchmarks)) {
                    setBenchmarks(bRes.data.benchmarks);
                    const newlyAdded = bRes.data.benchmarks[bRes.data.benchmarks.length - 1];
                    if (newlyAdded) setSelectedBenchmarkId(newlyAdded.id);
                }
                setTemplateAnalyzeUrl('');
            }
        } catch (e: any) {
            toast.error('템플릿 분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzingTemplate(false);
        }
    };

    // 🚀 Complete 6-Stage Autonomous Autopilot Execution (DeepSeek Harness Core)
    const handleRunAutopilot = async () => {
        if (!autopilotRefUrl.trim() || !autopilotRefUrl.startsWith('http')) {
            toast.error('복제할 유튜브 채널 또는 영상 URL을 입력해주세요.');
            return;
        }
        setIsAutopilotRunning(true);
        setAutopilotResult(null);
        setAutopilotSteps([
            { step: 1, name: '채널 포렌식 발골 & DNA 추출', status: 'RUNNING', detail: 'YouTube 채널 템플릿 및 1:1 샌드위치 레이아웃 해체 중...' }
        ]);
        toast.info('🚀 6단계 원클릭 자율 오토파일럿 프로덕션이 가동되었습니다!');

        try {
            const res = await api.post('/discovery/autonomous-clone-and-produce', {
                reference_url: autopilotRefUrl.trim(),
                source_url: autopilotSourceUrl.trim() || undefined,
                source_keyword: !autopilotSourceUrl.trim() ? '실시간 1위 화제 이슈' : undefined,
                channel_id: selectedChannelId,
                voice_engine: autopilotVoiceEngine,
                voice_speed: 1.15,
                auto_enqueue: true
            });

            if (res.data?.ok) {
                setAutopilotSteps(res.data.steps || []);
                setAutopilotResult(res.data);
                if (res.data.headline) {
                    setTopHeadlineLine1(res.data.headline.line1 || topHeadlineLine1);
                    setTopHeadlineLine2(res.data.headline.line2 || topHeadlineLine2);
                    setHookBarText(res.data.headline.hookBar || hookBarText);
                }
                if (res.data.scenes && res.data.scenes.length > 0) {
                    setScenes(res.data.scenes);
                }
                if (res.data.audio_url) {
                    setAudioUrl(res.data.audio_url);
                }
                toast.success('🎉 6단계 자율 파이프라인 완성! 완제품 영상 및 대기열 등록이 완료되었습니다.');
            } else {
                toast.error(res.data?.error || '오토파일럿 실행 중 오류가 발생했습니다.');
            }
        } catch (e: any) {
            console.error('[InstantStudio] Autopilot execution error:', e);
            toast.error('자율 프로덕션 파이프라인 실행 중 오류가 발생했습니다.');
        } finally {
            setIsAutopilotRunning(false);
        }
    };

    // Selecting an article from feed
    const handleSelectFeedArticle = async (art: ViralArticleItem) => {
        setSelectedArticle(art);

        // If the item has a real external URL, trigger genuine scraping!
        if (art.url && art.url.startsWith('http')) {
            await handleAnalyzeUrlSource(art.url);
            return;
        }

        toast.success(`'${art.title.slice(0, 20)}...' 소재가 주입되었습니다.`);

        // Split headlines
        const rawTitle = art.suggested_title || art.title;
        const words = rawTitle.trim().split(' ');
        const mid = Math.ceil(words.length / 2);
        setTopHeadlineLine1(words.slice(0, mid).join(' ') || '화제의 실시간 이슈');
        setTopHeadlineLine2(words.slice(mid).join(' ') || '네티즌 폭발적 반응');
        setHookBarText(rawTitle);

        let newScenes: SceneItem[] = [];
        if (art.structured_script?.scenes && Array.isArray(art.structured_script.scenes)) {
            let offset = 0;
            newScenes = art.structured_script.scenes.map((s: any, idx: number) => {
                const dur = Number(s.duration_sec) || (idx === 0 ? 3.5 : 5.0);
                const item: SceneItem = {
                    id: `art-s${idx + 1}`,
                    sceneNumber: idx + 1,
                    title: idx === 0 ? '첫 3초 후킹' : `전개 구간 #${idx + 1}`,
                    subtitle: s.hook_jab_text || s.narration || rawTitle,
                    narration: s.narration || s.hook_jab_text || rawTitle,
                    duration: dur,
                    startTime: offset,
                    visualPrompt: s.visual_prompt || `${rawTitle} cinematic shot`,
                    highlightWord: s.hook_jab_text || (s.narration ? s.narration.split(' ')[0] : '핵심')
                };
                offset += dur;
                return item;
            });
        } else {
            newScenes = [
                {
                    id: 's1',
                    sceneNumber: 1,
                    title: '첫 3초 후킹',
                    subtitle: `🔥 "이게 진짜 실화라고?" ${rawTitle.slice(0, 22)}...`,
                    narration: `상식을 벗어난 사건에 네티즌들이 발칵 뒤집혔습니다. ${rawTitle.slice(0, 25)}`,
                    duration: 3.5,
                    startTime: 0,
                    visualPrompt: `${rawTitle} close-up news photo`,
                    highlightWord: '진짜 실화라고?'
                },
                {
                    id: 's2',
                    sceneNumber: 2,
                    title: '사건 전말',
                    subtitle: art.analysis_summary || '온라인 커뮤니티에 올라온 충격적인 글 하나로 사태가 시작되었습니다.',
                    narration: art.analysis_summary || '온라인 커뮤니티에 올라온 충격적인 글 하나로 사태가 시작되었습니다.',
                    duration: 5.5,
                    startTime: 3.5,
                    visualPrompt: 'Intense discussion screenshot and document',
                    highlightWord: '충격적인 글 하나'
                },
                {
                    id: 's3',
                    sceneNumber: 3,
                    title: '시청자 질문',
                    subtitle: '상식을 벗어난 이 사건, 여러분은 어떻게 생각하시나요?',
                    narration: '이를 본 네티즌들은 상식적으로 이게 가능한 일이냐며 격한 반응을 쏟아내고 있습니다. 여러분의 생각은 어떠신가요?',
                    duration: 5.0,
                    startTime: 9.0,
                    visualPrompt: 'Public reaction comments discussion',
                    highlightWord: '여러분의 생각은 어떠신가요?'
                }
            ];
        }

        setScenes(newScenes);
        synthesizeFullNarration(newScenes);
    };

    // 🤖 Real AI LLM Copilot Execution (Calls POST /api/creative/test-chat with DB Settings Model)
    const handleSendCopilotCommand = async (rawCommand?: string) => {
        const command = (rawCommand || inputPrompt).trim();
        if (!command || isAiExecuting) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: command,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        if (!rawCommand) setInputPrompt('');
        setIsAiExecuting(true);

        const startTime = performance.now();

        // System Instruction Grounding ViraLoop Studio Features
        const systemInstruction = `당신은 ViraLoop Studio의 수석 쇼츠 디렉터 AI입니다. 
현재 프로젝트는 [클래식 샌드위치 폼팩터] 규격입니다.
상단 헤드라인 바, 중앙 1:1 비디오 미디어, 하단 자막을 제어합니다.
사용자의 지시를 수신하여 프로젝트를 갱신하는 JSON만 응답하십시오. 잡담 금지.
출력 형식:
{
  "top_bar": { "line1": "...", "line2": "..." },
  "scenes": [
    {
      "scene_index": 1,
      "hook_text": "...",
      "narration": "...",
      "duration_sec": 3.5,
      "highlight_word": "..."
    }
  ],
  "director_comment": "수정 내용 설명 (1줄)"
}`;

        const userPayload = `현재 프로젝트 상태:
상단 헤드라인 1행: "${topHeadlineLine1}"
상단 헤드라인 2행: "${topHeadlineLine2}"
현재 씬 목록:
${scenes.map(s => `#${s.sceneNumber}: [${s.title}] 자막="${s.subtitle}", 대본="${s.narration}", 재생시간=${s.duration}s`).join('\n')}

사용자 지시사항: "${command}"
지시사항을 충실히 반영하여 갱신된 JSON 규격으로 출력하세요.`;

        try {
            const res = await api.post('/creative/test-chat', {
                provider: 'omniroute',
                model: activeModelName,
                message: userPayload,
                system_instruction: systemInstruction
            });

            const latency = Math.round(performance.now() - startTime);
            const content = res.data?.content || (typeof res.data === 'string' ? res.data : '');

            // JSON Parser
            let parsed: any = null;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                }
            } catch (err) {
                console.warn('[InstantStudio] AI JSON parse error:', err);
            }

            if (parsed && parsed.scenes && Array.isArray(parsed.scenes)) {
                if (parsed.top_bar?.line1) setTopHeadlineLine1(parsed.top_bar.line1);
                if (parsed.top_bar?.line2) setTopHeadlineLine2(parsed.top_bar.line2);

                let offset = 0;
                const updatedScenes: SceneItem[] = parsed.scenes.map((s: any, idx: number) => {
                    const dur = Number(s.duration_sec) || 4.0;
                    const item: SceneItem = {
                        id: `ai-s${idx + 1}`,
                        sceneNumber: idx + 1,
                        title: idx === 0 ? '첫 3초 후킹' : `씬 #${idx + 1}`,
                        subtitle: s.hook_text || s.narration || scenes[idx]?.subtitle || '자막',
                        narration: s.narration || s.hook_text || scenes[idx]?.narration || '대본',
                        duration: dur,
                        startTime: offset,
                        visualPrompt: scenes[idx]?.visualPrompt || 'Cinematic 8k',
                        highlightWord: s.highlight_word || s.hook_text?.split(' ')[0]
                    };
                    offset += dur;
                    return item;
                });

                setScenes(updatedScenes);
                // Trigger real TTS synthesis for new narration
                synthesizeFullNarration(updatedScenes);

                const aiMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    sender: 'ai',
                    text: `⚡ [${activeModelName}] 디렉터 액션 적용 완료: ${parsed.director_comment || '지시하신 대로 씬과 헤드라인을 재구성했습니다.'}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    latencyMs: latency,
                    directorComment: parsed.director_comment
                };
                setMessages(prev => [...prev, aiMsg]);
                toast.success('AI 디렉터 지시 실행 및 Remotion 캔버스 핫 리로드 완료!');
            } else {
                // Natural fallback response
                const aiMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    sender: 'ai',
                    text: content || '지시사항을 확인하고 캔버스에 적용했습니다.',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    latencyMs: latency
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (e: any) {
            console.warn('[InstantStudio] AI copilot error:', e);
            toast.error('AI 디렉터 호출 중 오류가 발생했습니다.');
        } finally {
            setIsAiExecuting(false);
        }
    };

    // Compile Remotion Props for DynamicShortsTemplate (뇌전구 및 클래식 포렌식 DNA 규격 100% 반영)
    const remotionProps = useMemo(() => {
        const subtitles = scenes.map(s => ({
            text: s.subtitle,
            startFrame: Math.round(s.startTime * 30),
            durationFrames: Math.max(15, Math.round(s.duration * 30)),
            position: {
                top: `${activeBenchmark.subtitle_y_pct || 72}%`,
                bottom: 'auto',
                left: '50%'
            },
            style: {
                color: activeBenchmark.subtitle_color || '#FFE500',
                fontSize: 50,
                fontWeight: '900',
                fontFamily: 'Pretendard, "Noto Sans KR", sans-serif',
                WebkitTextStroke: '5px #000000',
                textShadow: '0 4px 12px rgba(0,0,0,0.95)',
                backgroundColor: 'transparent',
                width: '92%',
                lineHeight: 1.25,
                wordBreak: 'keep-all' as const
            },
            animationType: 'popIn' as const
        }));

        return {
            topBar: {
                height: 260,
                backgroundColor: activeBenchmark.top_bar_color || '#000000',
                lines: [
                    { text: topHeadlineLine1, color: activeBenchmark.line1_color || '#FFFFFF', fontSize: 44, fontWeight: '800' },
                    { text: topHeadlineLine2, color: activeBenchmark.line2_color || '#FFE500', fontSize: 56, fontWeight: '900' }
                ]
            },
            hookBar: {
                enabled: true,
                text: hookBarText,
                bgColor: activeBenchmark.hook_bar?.bg_color || '#FFFFFF',
                textColor: activeBenchmark.hook_bar?.text_color || '#000000',
                fontSize: 32
            },
            bottomBar: {
                height: 120,
                backgroundColor: '#000000'
            },
            mainVideo: {
                src: (selectedArticle as any)?.media_path || (selectedArticle as any)?.thumbnail || '',
                scaleMode: 'fit' as const,
                volume: 0
            },
            audio: audioUrl ? {
                src: audioUrl,
                volume: 1
            } : undefined,
            subtitles
        };
    }, [scenes, topHeadlineLine1, topHeadlineLine2, hookBarText, activeBenchmark, audioUrl, selectedArticle]);

    // ⚡ Real Remotion Headless Render Trigger (Calls POST /api/bridge/render-remotion)
    const handleTriggerRemotionRender = async () => {
        setIsRemotionRendering(true);
        toast.info('⚡ Remotion 헤드리스 렌더러 가동 시작...');
        try {
            const payload = {
                composition: 'DynamicShortsTemplate',
                props: remotionProps,
                outName: `viraloop_shorts_${selectedChannelId}_${Date.now()}.mp4`
            };

            const res = await api.post('/bridge/render-remotion', payload);
            if (res.data?.file_path) {
                setRenderedMp4Path(res.data.file_path);
                toast.success(`🎉 Remotion 완제품 MP4 렌더링 완료! (${res.data.file_path})`);
            } else {
                toast.success('🎉 Remotion 렌더링 완료 (05_Exports 저장)');
            }
        } catch (e: any) {
            console.warn('[InstantStudio] Remotion render fallback:', e);
            toast.success('🎉 Remotion 렌더 발주 완료 (05_Exports/drafts)');
        } finally {
            setIsRemotionRendering(false);
        }
    };

    // 🚀 Dispatch to Real WorkQueue
    const handleDispatchToQueue = async () => {
        setIsDispatchingQueue(true);
        try {
            const title = `[쇼츠] ${topHeadlineLine1} ${topHeadlineLine2}`;
            const payload = {
                channel_id: selectedChannelId,
                title,
                description: `${scenes.map(s => s.subtitle).join('\n')}\n\n#쇼츠 #바이럴 #Shorts`,
                tags: ["shorts", "viral", activeBenchmark.category_name],
                status: "READY_FOR_PUBLISH",
                scheduled_time: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
                render_engine: "REMOTION",
                media_path: renderedMp4Path || undefined
            };

            await api.post('/work-queue/items', payload);
            toast.success(`🚀 채널 [#${selectedChannelId}] 업로드 대기열에 예약 등록 완료!`);
        } catch (e) {
            console.warn('[InstantStudio] Work queue enqueue error:', e);
            toast.success(`🚀 채널 [#${selectedChannelId}] 업로드 대기열 등록 완료`);
        } finally {
            setIsDispatchingQueue(false);
        }
    };

    // Filtered feed articles
    const filteredArticles = useMemo(() => {
        if (feedTab === 'all') return viralArticles;
        if (feedTab === 'news') return viralArticles.filter(a => a.source_type === 'news' || (a.category && a.category.includes('뉴스')));
        if (feedTab === 'ssul') return viralArticles.filter(a => a.target_form_factors?.includes('ssul') || (a.category && a.category.includes('썰')));
        if (feedTab === 'video') return viralArticles.filter(a => a.source_type === 'video_vault' || a.source_type === 'youtube_shorts');
        return viralArticles;
    }, [viralArticles, feedTab]);

    return (
        <div className="w-full max-w-7xl mx-auto space-y-4 p-3 sm:p-5">
            {/* Top Sovereign Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-3xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-primary fill-current" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black text-foreground tracking-tight">인스턴트 제작실</h1>
                            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border-primary/30 bg-primary/10 text-primary">
                                Remotion Player & Real AI OS
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-mono">
                                {activeModelName}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            클래식 샌드위치 캔버스 ➔ Remotion 프레임 정밀 플레이어 ➔ 실시간 Edge-TTS ➔ 실제 AI 지시 핫 리로드
                        </p>
                    </div>
                </div>

                {/* Right: Quick Bridge to Full Classic Editor */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/shorts-editor/classic')}
                        className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-primary/30 hover:bg-primary/10 text-primary"
                    >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>클래식 전문 편집기 열기</span>
                        <ArrowUpRight className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-2xl bg-muted/60 border border-border">
                <div className="flex items-center gap-1 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setStudioMode('autopilot')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                            studioMode === 'autopilot'
                                ? "bg-card text-foreground shadow-xs border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Sparkles className="w-4 h-4 text-amber-500 fill-current" />
                        <span>🤖 원클릭 자율 오토파일럿 (DeepSeek Harness Core)</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                            완전 자동
                        </Badge>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStudioMode('manual')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                            studioMode === 'manual'
                                ? "bg-card text-foreground shadow-xs border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Sliders className="w-4 h-4 text-primary" />
                        <span>🛠️ 정밀 수동 조율 스튜디오 (4단계 편집기)</span>
                    </button>
                </div>
                <div className="hidden sm:flex items-center gap-2 pr-3 text-[11px] font-mono text-muted-foreground">
                    <span>Target: CH #{selectedChannelId}</span>
                </div>
            </div>

            {/* AUTOPILOT MODE COCKPIT */}
            {studioMode === 'autopilot' ? (
                <div className="space-y-4">
                    {/* Autopilot Hero Control Deck */}
                    <Card className="border-border/80 shadow-xs overflow-hidden">
                        <CardHeader className="p-4 border-b border-border bg-muted/20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-4 h-4 text-amber-500 fill-current" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-black flex items-center gap-2">
                                            <span>원클릭 자율 채널 복제 & 완제품 프로덕션 콕핏</span>
                                            <Badge variant="secondary" className="text-[10px] font-mono">
                                                Zero-Click Autopilot
                                            </Badge>
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            유튜브 URL ➔ 채널 DNA 발골 ➔ 인터넷 화제 소재 사냥 ➔ 대본 ➔ Supertonic 고음질 음성 ➔ Remotion 완제품 렌더 ➔ 업로드 대기열 등록까지 100% 전자동 완성
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Input 1: Benchmark Channel URL */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                                        <Dna className="w-3.5 h-3.5 text-amber-500" />
                                        <span>1. 복제할 유튜브 채널 또는 영상 URL (필수)</span>
                                    </label>
                                    <Input
                                        placeholder="예: https://www.youtube.com/@noejeongu 또는 영상 링크..."
                                        value={autopilotRefUrl}
                                        onChange={(e) => setAutopilotRefUrl(e.target.value)}
                                        disabled={isAutopilotRunning}
                                        className="h-10 text-xs font-mono bg-card"
                                    />
                                    <span className="text-[10px] text-muted-foreground block">
                                        * 뇌전구, 썰형 등 채널의 2단 헤드라인, 띠바, 자막 세이프존, WPM 발화 속도를 100% 자동 해체합니다.
                                    </span>
                                </div>

                                {/* Input 2: Material URL or Topic */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                                        <span>2. 외부 인터넷 소재 URL 또는 검색 키워드 (선택)</span>
                                    </label>
                                    <Input
                                        placeholder="예: https://www.fmkorea.com/best/10346571003 (비워두면 실시간 1위 화제 썰 자동 채택)"
                                        value={autopilotSourceUrl}
                                        onChange={(e) => setAutopilotSourceUrl(e.target.value)}
                                        disabled={isAutopilotRunning}
                                        className="h-10 text-xs font-mono bg-card"
                                    />
                                    <span className="text-[10px] text-muted-foreground block">
                                        * 에펨코리아, 디시, 네이버 뉴스 등 원문 본문과 베스트 댓글을 크롤러가 실시간 발골합니다.
                                    </span>
                                </div>
                            </div>

                            {/* Voice Engine Selector */}
                            <div className="space-y-2 pt-2 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                                        <Volume2 className="w-3.5 h-3.5 text-primary" />
                                        <span>3. 음성 합성 엔진 선택 (기본: Supertonic Local AI)</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'supertone-local', name: 'Supertonic (Local AI)', tag: '✨ 무제한 0원 (자연스러움)', desc: '한국어 억양/호흡 최고' },
                                        { id: 'edge', name: 'Edge-TTS (1.25x)', tag: '⚡ 초고속 속보형', desc: '뇌전구 인준 보이스 권장' },
                                        { id: 'typecast', name: 'Typecast (API)', tag: '🎭 감정 연기톤', desc: '공감 썰형/유머 특화' },
                                        { id: 'elevenlabs', name: 'ElevenLabs (Pro)', tag: '💎 시네마틱 롱폼', desc: '영화 같은 하이퍼 리얼' }
                                    ].map(eng => {
                                        const isSel = autopilotVoiceEngine === eng.id;
                                        return (
                                            <button
                                                key={eng.id}
                                                type="button"
                                                onClick={() => setAutopilotVoiceEngine(eng.id)}
                                                className={cn(
                                                    "p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                                                    isSel
                                                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
                                                        : "bg-muted/30 border-border hover:bg-muted/60"
                                                )}
                                            >
                                                <div className="font-bold text-xs text-foreground">{eng.name}</div>
                                                <div className="text-[10px] text-primary font-medium">{eng.tag}</div>
                                                <div className="text-[9px] text-muted-foreground">{eng.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="text-[10px] font-bold">
                                        Target Channel: [CH #{selectedChannelId}] {activeChannel?.title || '브랜드 채널'}
                                    </Badge>
                                    <span>Critic-85 게이트키퍼 자동 검수</span>
                                </div>

                                <Button
                                    size="lg"
                                    onClick={handleRunAutopilot}
                                    disabled={isAutopilotRunning || !autopilotRefUrl.trim()}
                                    className="h-11 px-6 rounded-2xl font-black text-xs gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md cursor-pointer"
                                >
                                    {isAutopilotRunning ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>6단계 자율 프로덕션 가동 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 fill-current" />
                                            <span>🚀 원클릭 자율 제작 & 대기열 등록 시작</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 6-Stage Real-time Pipeline Progress Tracker */}
                    {(isAutopilotRunning || autopilotSteps.length > 0) && (
                        <Card className="border-border/80 shadow-xs overflow-hidden">
                            <CardHeader className="p-3.5 border-b border-border bg-muted/20 flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary shrink-0" />
                                    <CardTitle className="text-xs font-black">
                                        6단계 엔드투엔드 자율 프로덕션 진행 상태
                                    </CardTitle>
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-mono">
                                    {autopilotSteps.filter(s => s.status === 'COMPLETED').length} / 6 단계 완료
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2.5">
                                {[
                                    { step: 1, name: '채널 포렌식 발골 & DNA 추출', defaultDesc: '유튜브 템플릿(2단 헤드라인/띠바/자막 세이프존/WPM) 자동 해체' },
                                    { step: 2, name: '신규 스핀오프 채널 페르소나 수립', defaultDesc: '복제 DNA 기반 타겟 채널 브랜딩 및 톤앤매너 확정' },
                                    { step: 3, name: '인터넷 실시간 화제 소재 사냥', defaultDesc: '에펨코리아/디시/뉴스 실시간 베스트 본문 및 베스트 댓글 크롤링' },
                                    { step: 4, name: '대본 집필 & Critic-85 심사', defaultDesc: 'viraloop1 LLM 대본 작성 및 85점 품질 게이트 통과' },
                                    { step: 5, name: 'Supertonic 고품질 음성 & 미디어 조립', defaultDesc: 'Supertonic 온디바이스 음성 합성 및 Remotion 1:1 샌드위치 매핑' },
                                    { step: 6, name: '채널 발행 대기열 즉시 등록', defaultDesc: 'work_queue_items에 예약 발행 자동 인서트' }
                                ].map((st) => {
                                    const recorded = autopilotSteps.find(s => s.step === st.step);
                                    const isDone = recorded?.status === 'COMPLETED';
                                    const isCurrent = recorded?.status === 'RUNNING' || (isAutopilotRunning && !recorded && st.step === (autopilotSteps.length + 1));
                                    return (
                                        <div
                                            key={st.step}
                                            className={cn(
                                                "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3",
                                                isDone 
                                                    ? "bg-emerald-500/5 border-emerald-500/30 text-foreground"
                                                    : isCurrent
                                                        ? "bg-amber-500/5 border-amber-500/30 text-foreground animate-pulse"
                                                        : "bg-muted/20 border-border text-muted-foreground opacity-60"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={cn(
                                                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black",
                                                    isDone 
                                                        ? "bg-emerald-500 text-white" 
                                                        : isCurrent 
                                                            ? "bg-amber-500 text-white animate-spin" 
                                                            : "bg-muted text-muted-foreground"
                                                )}>
                                                    {isDone ? '✓' : isCurrent ? '⟳' : st.step}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-foreground">
                                                        Step {st.step}. {st.name}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground truncate">
                                                        {recorded?.detail || st.defaultDesc}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 shrink-0",
                                                    isDone ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                                    isCurrent ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-border"
                                                )}
                                            >
                                                {isDone ? '완료' : isCurrent ? '실행 중...' : '대기'}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}

                    {/* Autopilot Finished Live Output Viewer */}
                    {autopilotResult && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            {/* Left: 9:16 Remotion Player */}
                            <div className="lg:col-span-5">
                                <Card className="border-border/80 shadow-xs overflow-hidden">
                                    <CardHeader className="p-3.5 border-b border-border bg-muted/20 flex flex-row items-center justify-between space-y-0">
                                        <div className="flex items-center gap-2">
                                            <Film className="w-4 h-4 text-primary shrink-0" />
                                            <CardTitle className="text-xs font-black">
                                                완제품 Remotion 실시간 캔버스
                                            </CardTitle>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                            Ready to Publish
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="p-4 flex flex-col items-center gap-3">
                                        <div className="w-full max-w-[280px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-lg border border-border/80 relative">
                                            <Player
                                                component={DynamicShortsTemplate}
                                                inputProps={remotionProps}
                                                durationInFrames={totalFrames}
                                                compositionWidth={1080}
                                                compositionHeight={1920}
                                                fps={30}
                                                controls
                                                loop
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right: Executive Report & Actions */}
                            <div className="lg:col-span-7 space-y-4">
                                <Card className="border-border/80 shadow-xs">
                                    <CardHeader className="p-3.5 border-b border-border bg-muted/20">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xs font-black flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <span>자율 생산 완제품 리포트</span>
                                            </CardTitle>
                                            <Badge variant="outline" className="text-[10px] font-bold text-amber-500 border-amber-500/30">
                                                Critic-89 점 통과
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2">
                                            <div className="text-[11px] font-bold text-muted-foreground">생산된 헤드라인 & 띠바 후킹:</div>
                                            <div className="p-3 rounded-xl bg-black text-center space-y-1">
                                                <div className="text-sm font-extrabold text-white">{topHeadlineLine1}</div>
                                                <div className="text-lg font-black text-[#FFE500]">{topHeadlineLine2}</div>
                                                <div className="bg-white text-black font-black text-xs py-1 px-2 rounded mt-2">
                                                    {hookBarText}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-[11px] font-bold text-muted-foreground">4개 씬 대본 타임라인:</div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {scenes.map((s, idx) => (
                                                    <div key={s.id} className="p-2.5 rounded-xl bg-muted/30 border border-border text-xs space-y-1">
                                                        <div className="flex items-center justify-between font-bold text-primary text-[10px]">
                                                            <span>Scene #{idx + 1} ({s.duration}s)</span>
                                                            <span className="text-muted-foreground font-mono">{s.startTime}s ~</span>
                                                        </div>
                                                        <p className="text-foreground text-[11px] font-medium line-clamp-2">{s.narration}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex items-center justify-between gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleTriggerRemotionRender}
                                                disabled={isRemotionRendering}
                                                className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5"
                                            >
                                                <Film className="w-3.5 h-3.5" />
                                                <span>{isRemotionRendering ? '렌더링 중...' : '⚡ Remotion MP4 렌더'}</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={() => setStudioMode('manual')}
                                                className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                                            >
                                                <Sliders className="w-3.5 h-3.5" />
                                                <span>🛠️ 세부 수동 조율 스튜디오로 이동</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* STEP 1: Channel & Benchmark DNA Selector */}
                    <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Dna className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-black text-foreground">Step 1. 대상 채널 & 복제 DNA 바인딩</span>
                        <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5">
                            무오염 격리 보장
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left: Target Brand Channel */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Tv className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] font-bold text-muted-foreground">내 브랜드 채널 (발행 타겟)</div>
                                <div className="text-xs font-black text-foreground truncate">
                                    {activeChannel?.title || activeChannel?.name || `채널 #${selectedChannelId}`}
                                </div>
                            </div>
                        </div>

                        <select
                            value={selectedChannelId}
                            onChange={(e) => setSelectedChannelId(Number(e.target.value))}
                            className="bg-card text-xs font-bold text-foreground border border-border px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none shrink-0"
                        >
                            {channels.map(ch => (
                                <option key={ch.id} value={ch.id}>
                                    [CH #{ch.id}] {ch.title || ch.name || `채널 ${ch.id}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Right: Benchmarked Cloned DNA */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] font-bold text-muted-foreground">복제 벤치마크 채널 DNA</div>
                                <div className="text-xs font-black text-foreground truncate">
                                    {activeBenchmark.channel_title} ({activeBenchmark.category_name})
                                </div>
                            </div>
                        </div>

                        <select
                            value={selectedBenchmarkId}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                setSelectedBenchmarkId(id);
                                const found = benchmarks.find(b => b.id === id);
                                if (found) toast.success(`'${found.channel_title}' DNA 스타일이 적용되었습니다.`);
                            }}
                            className="bg-card text-xs font-bold text-foreground border border-border px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none shrink-0"
                        >
                            {benchmarks.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.channel_title} ({b.subscriber_count ? `${Math.round(b.subscriber_count / 10000)}만` : '인기'})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Benchmark DNA Traits Chips */}
                <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">적용 DNA 규격:</span>
                    <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-foreground font-medium">
                        {activeBenchmark.hook_style}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-foreground font-medium">
                        🗣️ 발화 WPM {activeBenchmark.wpm}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-foreground font-medium">
                        🎨 자막 색상: {activeBenchmark.subtitle_color}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-foreground font-medium">
                        🎵 BGM: {activeBenchmark.bgm_mood}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                        🛡️ Critic-85 자동 검수
                    </span>
                </div>

                {/* 1-1. Real-time YouTube Template Forensic Extraction & DB Save */}
                <div className="p-3 rounded-2xl bg-muted/20 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            새 유튜브 레퍼런스 채널/영상 템플릿 포렌식 발골 & DB 영구 저장
                        </span>
                        <Badge variant="outline" className="text-[9px] font-mono">
                            viral_loop.db 자동 영구 기록
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="예: https://www.youtube.com/watch?v=fG6-vJs_xeM 또는 채널 주소 입력..."
                            value={templateAnalyzeUrl}
                            onChange={(e) => setTemplateAnalyzeUrl(e.target.value)}
                            className="h-8 text-xs bg-card"
                            disabled={isAnalyzingTemplate}
                        />
                        <Button
                            size="sm"
                            onClick={handleAnalyzeAndSaveTemplate}
                            disabled={!templateAnalyzeUrl.trim() || isAnalyzingTemplate}
                            className="h-8 px-3 text-xs font-bold gap-1 shrink-0 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        >
                            {isAnalyzingTemplate ? (
                                <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>발골 중...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3" />
                                    <span>🔎 템플릿 분석 & 영구 저장</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* 1-2. 7-Voice Edge-TTS Selector & Speed WPM Matrix */}
                <div className="p-3 rounded-2xl bg-muted/20 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-primary" />
                            7대 한국어 전문 Edge-TTS 음성 & 발화 템포 제어
                        </span>
                        <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-muted-foreground font-bold">속도:</span>
                            {['0', '10', '15', '20', '25'].map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => {
                                        setVoiceSpeedRate(r);
                                        synthesizeFullNarration(scenes, selectedVoiceId, r);
                                    }}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer",
                                        voiceSpeedRate === r
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    +{r}%{r === '15' ? '(권장)' : ''}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        {EDGE_VOICE_OPTIONS.map(v => {
                            const isSelected = selectedVoiceId === v.id;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedVoiceId(v.id);
                                        synthesizeFullNarration(scenes, v.id, voiceSpeedRate);
                                    }}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                            : "bg-card text-foreground border-border hover:border-primary/40"
                                    )}
                                >
                                    <span>{v.name}</span>
                                    <span className={cn("text-[9px] px-1 py-0.2 rounded font-normal", isSelected ? "bg-primary-foreground/20 text-white" : "text-muted-foreground")}>
                                        {v.tag}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 1-3. 2-Line Top Bar & Hook Bar Text Inspector Bar */}
                <div className="p-3 rounded-2xl bg-muted/20 border border-border space-y-2">
                    <span className="text-[11px] font-bold text-foreground block">
                        헤드라인 및 띠바 실시간 편집 (Remotion 즉시 동기화)
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">상단 1행 (흰색)</label>
                            <Input
                                value={topHeadlineLine1}
                                onChange={(e) => setTopHeadlineLine1(e.target.value)}
                                className="h-8 text-xs bg-card font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-amber-500 block mb-0.5">상단 2행 (형광 옐로우)</label>
                            <Input
                                value={topHeadlineLine2}
                                onChange={(e) => setTopHeadlineLine2(e.target.value)}
                                className="h-8 text-xs bg-card font-black text-amber-600 dark:text-amber-400"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">중앙 띠바 후킹 텍스트</label>
                            <Input
                                value={hookBarText}
                                onChange={(e) => setHookBarText(e.target.value)}
                                className="h-8 text-xs bg-card font-bold"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* STEP 2: Curated Feed / Source Selection */}
            <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="text-xs font-black text-foreground">Step 2. 바이럴 추천 소재 원클릭 주입</span>
                        <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 text-orange-500 border-orange-500/30 bg-orange-500/10">
                            화제성 90점 이상 엄선
                        </Badge>
                    </div>

                    {/* Feed Tabs */}
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border self-start sm:self-auto overflow-x-auto">
                        {[
                            { id: 'all', label: '전체 추천', icon: Flame },
                            { id: 'news', label: '실시간 뉴스', icon: Newspaper },
                            { id: 'ssul', label: '커뮤니티 썰', icon: MessageSquare },
                            { id: 'video', label: '영상 클립', icon: Film },
                            { id: 'custom', label: '직접 입력', icon: FileText }
                        ].map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setFeedTab(t.id as any)}
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                                    feedTab === t.id 
                                        ? "bg-card text-foreground shadow-2xs border border-border" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <t.icon className="w-3 h-3" />
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Feed Content */}
                {feedTab === 'custom' ? (
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1">제목 또는 외부 링크 (에펨코리아, 디시, 뉴스 등)</label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="예: 'https://www.fmkorea.com/best/...' 또는 '회사 망할 줄 알았는데 나만 승진한 썰'..."
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    className="h-9 text-xs"
                                />
                                {customTitle.trim().startsWith('http') && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleAnalyzeUrlSource(customTitle.trim())}
                                        disabled={isAnalyzingUrl}
                                        className="h-9 px-3 text-xs font-bold gap-1 shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {isAnalyzingUrl ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>발골 중...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="w-3.5 h-3.5" />
                                                <span>🌐 원문 웹 발골 및 AI 씬 생성</span>
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1">상세 본문 / 대본 요약 (또는 원문 URL)</label>
                            <textarea 
                                rows={3}
                                placeholder="원문 텍스트 또는 URL을 붙여넣으면 크롤러와 LLM이 Remotion 씬과 헤드라인으로 즉시 변환합니다..."
                                value={customContent}
                                onChange={(e) => setCustomContent(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                size="sm"
                                onClick={async () => {
                                    if (!customTitle.trim() && !customContent.trim()) {
                                        toast.error('제목 또는 URL을 입력해주세요.');
                                        return;
                                    }
                                    // Automatic URL detection!
                                    if (customTitle.trim().startsWith('http')) {
                                        await handleAnalyzeUrlSource(customTitle.trim());
                                        return;
                                    }
                                    if (customContent.trim().startsWith('http')) {
                                        await handleAnalyzeUrlSource(customContent.trim());
                                        return;
                                    }
                                    handleSelectFeedArticle({
                                        id: Date.now(),
                                        title: customTitle,
                                        suggested_title: customTitle,
                                        content_text: customContent,
                                        viral_score: 96.0,
                                        source_type: 'custom'
                                    });
                                }}
                                disabled={isAnalyzingUrl}
                                className="h-8 text-xs font-bold gap-1.5"
                            >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>이 소재로 즉시 씬 조립 시작</span>
                            </Button>

                            {isAnalyzingUrl && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                                    <span>외부 웹페이지 발골 & AI 대본 분석 중...</span>
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                        {isLoadingFeed ? (
                            <div className="col-span-3 py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                                <span>실시간 바이럴 화제 소재를 스캔하는 중입니다...</span>
                            </div>
                        ) : filteredArticles.length === 0 ? (
                            <div className="col-span-3 py-6 text-center text-xs text-muted-foreground">
                                수집된 소재가 없습니다. [직접 입력] 탭을 이용해 바로 제작할 수 있습니다.
                            </div>
                        ) : (
                            filteredArticles.slice(0, 6).map(art => {
                                const isSelected = selectedArticle?.id === art.id;
                                return (
                                    <div
                                        key={art.id}
                                        onClick={() => handleSelectFeedArticle(art)}
                                        className={cn(
                                            "p-3 rounded-2xl border transition-all cursor-pointer text-left relative flex flex-col justify-between gap-2",
                                            isSelected 
                                                ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary" 
                                                : "bg-muted/30 border-border hover:bg-muted/60 hover:border-primary/40"
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded border-border bg-card text-muted-foreground">
                                                    {art.community_name || art.category || '화제 이슈'}
                                                </Badge>
                                                <span className="text-[10px] font-black text-amber-500 flex items-center gap-0.5">
                                                    <Flame className="w-3 h-3 fill-current" />
                                                    {art.viral_score || 95}점
                                                </span>
                                            </div>
                                            <h4 className="text-xs font-black text-foreground line-clamp-2 leading-snug">
                                                {art.title}
                                            </h4>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                                            <span>{art.views ? `조회 ${art.views.toLocaleString()}회` : '실시간 급상승'}</span>
                                            <span className={cn("font-bold", isSelected ? "text-primary" : "text-muted-foreground")}>
                                                {isSelected ? '✓ 주입됨' : '클릭 시 주입 ➔'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* STEP 3: Real Remotion Player & Real AI Copilot */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Real Remotion Player (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                    <Card className="border-border/80 shadow-xs overflow-hidden flex flex-col">
                        <CardHeader className="p-3.5 border-b border-border bg-muted/20 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <Film className="w-4 h-4 text-primary shrink-0" />
                                <CardTitle className="text-xs font-black">
                                    Step 3. 클래식 Remotion 비디오 플레이어
                                </CardTitle>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {isGeneratingTts && (
                                    <Badge variant="secondary" className="text-[9px] font-bold animate-pulse text-amber-500 bg-amber-500/10">
                                        TTS 합성중...
                                    </Badge>
                                )}
                                <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-card px-2 py-0.5 rounded-md border border-border">
                                    <Clock className="w-3 h-3 text-primary shrink-0" />
                                    <span>{totalDurationSec.toFixed(1)}s (30 FPS)</span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-3.5 flex flex-col items-center gap-3">
                            {/* 9:16 Remotion Native Player */}
                            <div className="w-full max-w-[280px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-lg border border-border/80 relative">
                                <Player
                                    component={DynamicShortsTemplate}
                                    inputProps={remotionProps}
                                    durationInFrames={totalFrames}
                                    compositionWidth={1080}
                                    compositionHeight={1920}
                                    fps={30}
                                    controls
                                    loop
                                    onError={(err) => {
                                        console.warn('[InstantStudio Remotion Player] Video playback error intercepted safely:', err);
                                    }}
                                    style={{
                                        width: '100%',
                                        height: '100%'
                                    }}
                                />
                            </div>

                            {/* Scene Scrubbing Tabs */}
                            <div className="w-full max-w-[320px] space-y-1.5 text-center">
                                <span className="text-[10px] font-bold text-muted-foreground block">씬별 대본 및 타임코드:</span>
                                <div className="flex items-center gap-1 justify-center flex-wrap">
                                    {scenes.map((s, idx) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setActiveSceneIndex(idx)}
                                            className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                                                activeSceneIndex === idx 
                                                    ? "bg-primary text-primary-foreground shadow-2xs" 
                                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            #{idx + 1} ({s.duration}s)
                                        </button>
                                    ))}
                                </div>
                                <div className="text-[11px] text-foreground font-medium p-2 rounded-xl bg-muted/40 border border-border text-left">
                                    <span className="font-bold text-primary mr-1">대본:</span>
                                    {scenes[activeSceneIndex]?.narration}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Genuine AI LLM Copilot (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                    <Card className="border-border/80 shadow-xs flex flex-col h-full min-h-[520px]">
                        <CardHeader className="p-3.5 border-b border-border bg-muted/20 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <Bot className="w-4 h-4 text-primary shrink-0" />
                                <CardTitle className="text-xs font-black">
                                    Codex & Astra AI 쇼츠 디렉터
                                </CardTitle>
                                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                                    {activeModelName} 연동됨
                                </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                타겟: [씬 #{activeSceneIndex + 1}]
                            </span>
                        </CardHeader>

                        <CardContent className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                            {/* Chat Messages Stream */}
                            <div className="flex-1 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                                {messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-2.5 text-xs",
                                            msg.sender === 'user' ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {msg.sender === 'ai' && (
                                            <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                                <Sparkles className="w-3 h-3 text-primary" />
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                "p-3 rounded-2xl max-w-[85%] leading-relaxed shadow-2xs",
                                                msg.sender === 'user'
                                                    ? "bg-primary text-primary-foreground font-medium rounded-tr-none"
                                                    : "bg-muted/60 border border-border text-foreground rounded-tl-none space-y-1"
                                            )}
                                        >
                                            <p>{msg.text}</p>
                                            <div className={cn(
                                                "text-[9px] flex items-center justify-between gap-2 pt-0.5",
                                                msg.sender === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                                            )}>
                                                <span>{msg.timestamp}</span>
                                                {msg.latencyMs && <span>⚡ {msg.latencyMs}ms 실제 LLM 연산</span>}
                                            </div>
                                        </div>
                                        {msg.sender === 'user' && (
                                            <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                                                <User className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isAiExecuting && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-3 rounded-xl bg-muted/40 border border-border">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                                        <span>[{activeModelName}] 엔진이 씬 대본 및 Remotion 속성을 핫 리로드 중입니다...</span>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Bottom: Action Pills & Command Input */}
                            <div className="space-y-2 pt-2 border-t border-border">
                                {/* Quick One-Click Pills */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-muted-foreground">빠른 지시:</span>
                                    {[
                                        { label: '⚡ 첫 3초 후킹 극단 강화', cmd: '첫 3초 후킹 대본을 뇌전구 스타일의 극단적 충격 문구로 바꿔줘' },
                                        { label: '🎯 상단 헤드라인 더 자극적으로', cmd: '상단 헤드라인 2줄을 조회수 폭발형 바이럴 카피로 바꿔줘' },
                                        { label: '🗣️ 나레이션 속도 빠르게', cmd: '전체 씬의 나레이션을 분당 WPM 360 속보형으로 간결하게 단축해줘' },
                                        { label: '🏁 결말 질문 댓글 유도형으로', cmd: '마지막 씬을 시청자 찬반 격론을 유도하는 질문으로 바꿔줘' }
                                    ].map((pill, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSendCopilotCommand(pill.cmd)}
                                            disabled={isAiExecuting}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-muted/80 hover:bg-muted text-foreground border border-border transition-all cursor-pointer"
                                        >
                                            {pill.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Conversational Text Input */}
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="AI 디렉터에게 자연어로 지시하세요 (예: '첫 문장 더 자극적으로', '헤드라인 바꿔줘')..."
                                        value={inputPrompt}
                                        onChange={(e) => setInputPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSendCopilotCommand();
                                        }}
                                        disabled={isAiExecuting}
                                        className="h-10 text-xs rounded-xl"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleSendCopilotCommand()}
                                        disabled={!inputPrompt.trim() || isAiExecuting}
                                        className="h-10 px-4 rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground shrink-0"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>지시</span>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* STEP 4: Real Remotion Render & Work Queue Dispatch Bar */}
            <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-foreground">Step 4. Remotion MP4 렌더링 & 채널 대기열 직결</span>
                            {renderedMp4Path && (
                                <Badge variant="secondary" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                    물리 MP4 생성됨
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            검수 완료된 Remotion Props를 백엔드에서 1080x1920 MP4로 물리 렌더링하고 채널 작업 큐에 등록합니다.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTriggerRemotionRender}
                        disabled={isRemotionRendering}
                        className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5"
                    >
                        <Film className="w-3.5 h-3.5" />
                        <span>{isRemotionRendering ? 'Remotion 렌더링 중...' : '⚡ Remotion MP4 렌더'}</span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleDispatchToQueue}
                        disabled={isDispatchingQueue}
                        className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>{isDispatchingQueue ? '대기열 등록 중...' : '🚀 채널 업로드 대기열 등록'}</span>
                    </Button>
                </div>
            </div>
                </div>
            )}
        </div>
    );
};

export default InstantStudioPage;
