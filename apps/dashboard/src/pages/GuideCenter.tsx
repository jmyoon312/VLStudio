import React, { useState } from 'react';
import {
    BookOpen,
    Search,
    Zap,
    Video,
    Workflow,
    ChevronRight,
    Play,
    BarChart3,
    Download,
    Image as ImageIcon,
    Sparkles,
    Clapperboard,
    Scissors,
    Edit,
    Languages,
    Mic,
    Wand2,
    Share2,
    Activity,
    Shield,
    ListVideo,
    UploadCloud,
    FileText,
    LayoutGrid,
    Settings as SettingsIcon,
    TrendingUp,
    Globe,
    CheckCircle2,
    MousePointerClick,
    Info,
    Eraser,
    Radio,
    Moon,
    Sun,
    Layers,
    Users,
    FolderOpen,
    ExternalLink,
    Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

export default function GuideCenter() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGuideKey, setSelectedGuideKey] = useState<string>('work_queue');

    // [2026 최신 ViraLoop Studio 아키텍처 전면 동기화 가이드]
    const detailedGuides: Record<string, {
        category: string;
        badge: string;
        icon: any;
        iconBg: string;
        titleOverride?: string;
        overview: string;
        features: { icon: any; title: string; desc: string; }[];
        steps: string[];
    }> = {
        // --- 1. 자동화 및 대기열 ---
        work_queue: {
            category: "핵심 자동화",
            badge: "HOT",
            icon: Layers,
            iconBg: "from-blue-600 to-indigo-600",
            titleOverride: "자동화 작업 대기열 (Work Queue & Pixeling)",
            overview: "Flow AI 및 픽셀링(Pixeling) 메타 분석 기반으로 제작된 영상의 다채널 배포 스케줄과 백그라운드 렌더링 작업을 관리하는 중앙 대기열입니다. 모바일/외부 웹 브라우저에서도 영상 첨부와 즉시 등록을 완벽 지원합니다.",
            features: [
                {
                    icon: UploadCloud,
                    title: "모바일 원터치 영상 업로드 & 청크 스트리밍",
                    desc: "외부 브라우저나 모바일 폰에서도 대용량 영상을 서버로 안전하게 고속 업로드하여 대기열 아이템과 연결합니다."
                },
                {
                    icon: Zap,
                    title: "픽셀링 메타 데이터 파싱 & 원클릭 배포",
                    desc: "픽셀링 분석 메타 텍스트를 붙여넣으면 제목, 프롬프트, 캡션, 보이스 설정이 자동 구조화되어 즉시 대기열에 적재됩니다."
                },
                {
                    icon: Activity,
                    title: "다채널 동시 송출 (YouTube / TikTok / Reels)",
                    desc: "임시보관, 승인대기, 대기열, 완료 상태별로 관리하며 승인 즉시 예약된 채널로 안전하게 자동 송출됩니다."
                }
            ],
            steps: [
                "하단 네비게이션 탭에서 '대기열'을 선택합니다.",
                "상단 '픽셀링 메타 등록' 버튼을 눌러 메타 텍스트를 붙여넣고 영상 파일을 첨부합니다.",
                "'대기열로 보내기'를 누르면 영상이 서버에 자동 업로드되며 배포 대기열에 등록됩니다.",
                "대기열 카드에서 [승인] 또는 [즉시 등록]을 눌러 다채널 자동 송출을 실행합니다."
            ]
        },

        // --- 2. 통합 대시보드 & 관제 ---
        dashboard: {
            category: "분석 & 관제",
            badge: "LIVE",
            icon: Activity,
            iconBg: "from-indigo-600 to-purple-600",
            titleOverride: "통합 관제 대시보드 (Global Dashboard)",
            overview: "ViraLoop Studio의 총괄 관제 센터입니다. 24시간 실시간 감시 중인 채널, 다운로드 수집 현황, 백그라운드 워크플로우 진행 상태 및 최신 활동 타임라인을 한눈에 조망합니다.",
            features: [
                {
                    icon: Activity,
                    title: "실시간 시스템 지표 & 하드웨어 모니터링",
                    desc: "전체 관리 채널 수, 실시간 추적 중인 레퍼런스 채널, 다운로드 성공률 및 백그라운드 큐 상태를 실시간 카드 지표로 표시합니다."
                },
                {
                    icon: TrendingUp,
                    title: "통합 활동 타임라인 & 실시간 피드",
                    desc: "영상 수집, 자막 추출, 자동 렌더링, 배포 예약 등 시스템의 모든 이벤트가 실시간 스트림으로 기록됩니다."
                }
            ],
            steps: [
                "하단 네비게이션 바에서 '홈' 탭을 선택합니다.",
                "상단 핵심 지표 카드로 오늘의 수집/배포 상태와 시스템 헬스를 점검합니다.",
                "타임라인에서 최근 완료된 작업이나 알림을 탭하여 세부 내역으로 즉시 이동합니다."
            ]
        },

        // --- 3. 계정 육성 및 보안 관리 ---
        incubator: {
            category: "계정 보안 & 육성",
            badge: "PRO",
            icon: Shield,
            iconBg: "from-emerald-600 to-teal-600",
            titleOverride: "통합 계정 & 육성 관리 (Incubator & Cloak)",
            overview: "유튜브 브랜드 계정의 영구적인 안전 운영을 위해 격리된 브라우저 프로필(CloakBrowser)과 듀얼 프록시 격리 시스템을 제공하며, 7단계 자동 웜업 프로세스로 채널 신뢰도를 극대화합니다.",
            features: [
                {
                    icon: Shield,
                    title: "스텔스 보안 접속 & 핑거프린트 격리",
                    desc: "유튜브 스튜디오에 계정별 독립 IP와 핑거프린트로 안전하게 접속하여 다계정 운영 시 정지 위험을 원천 차단합니다."
                },
                {
                    icon: Sparkles,
                    title: "일괄 웜업 제어 (Bulk Warmup) & 스케줄러",
                    desc: "신규 채널의 신뢰도를 높이기 위해 인간적인 영상 시청, 탐색, 댓글 활동을 백그라운드에서 자동 실행합니다."
                }
            ],
            steps: [
                "하단 네비게이션에서 '육성관리'를 선택합니다.",
                "새 구글 계정을 등록하거나 채널 정보를 연동합니다.",
                "'전체 시작' 또는 '스케줄러 자동 실행'을 눌러 웜업 및 채널 보호를 가동합니다."
            ]
        },

        // --- 4. 미디어 보관함 ---
        gallery: {
            category: "콘텐츠 보관 & 분석",
            badge: "VIRAL",
            icon: ImageIcon,
            iconBg: "from-amber-600 to-orange-600",
            titleOverride: "미디어 보관함 (Viral Gallery)",
            overview: "수집된 모든 숏폼/롱폼 영상을 바이럴 지수(Velocity/EV Score)와 등급(S/A/B)별로 정렬하여 조회수 폭발 잠재력을 한눈에 파악하고, 원클릭으로 2차 가공을 실행합니다.",
            features: [
                {
                    icon: Zap,
                    title: "원클릭 딸깍 자막 & 쇼츠 파이프라인",
                    desc: "보관함 영상에서 [⚡ 딸깍 자막 생성] 버튼을 누르면 Whisper AI가 음성을 추출하여 즉시 자막을 완성합니다."
                },
                {
                    icon: TrendingUp,
                    title: "바이럴 변화 추이 분석 & 시간당 조회수 (Vel)",
                    desc: "시간대별 조회수 급상승 곡선을 시각화하여 현재 알고리즘을 타고 있는 떡상 영상을 즉시 선별합니다."
                }
            ],
            steps: [
                "하단 네비게이션에서 '보관함'을 선택합니다.",
                "검색창이나 상단 필터를 통해 S등급/A등급 고바이럴 영상을 필터링합니다.",
                "원하는 영상 카드에서 '⚡ 딸깍' 버튼을 눌러 자막 생성 또는 편집으로 바로 전송합니다."
            ]
        },

        // --- 5. 레퍼런스 채널 관리 ---
        channels: {
            category: "수집 & 벤치마킹",
            badge: "AUTO",
            icon: ListVideo,
            iconBg: "from-sky-600 to-blue-600",
            titleOverride: "타겟 채널 자동 수집 (Target Channels)",
            overview: "벤치마킹할 글로벌 유튜브/쇼츠 채널을 등록하고 24시간 자동 감시하여 신규 인기 영상을 놓치지 않고 수집합니다. 모바일 최적화 카드 뷰를 완벽 지원합니다.",
            features: [
                {
                    icon: ListVideo,
                    title: "카테고리별 채널 그룹화 & 스케줄 자동 수집",
                    desc: "채널 URL만 입력하면 프로필을 자동 인식하며, 지정된 스캔 주기마다 신규 영상을 자동 다운로드합니다."
                },
                {
                    icon: Scissors,
                    title: "스크립트 전용 모드 지원",
                    desc: "용량 절약을 위해 영상 파일 대신 자막/대본 텍스트만 고속으로 수집하는 모드를 지원합니다."
                }
            ],
            steps: [
                "메뉴에서 '타겟 채널 자동 수집'으로 이동합니다.",
                "카테고리를 선택하고 새 채널 URL을 입력한 뒤 [채널 추가]를 누릅니다.",
                "[즉시 스캔]을 누르거나 자동 다운로드 스위치를 켜두면 신규 영상이 자동 수집됩니다."
            ]
        },

        // --- 6. 미디어 고속 직접 다운로드 ---
        direct_download: {
            category: "고속 다운로드",
            badge: "FAST",
            icon: Download,
            iconBg: "from-blue-600 to-cyan-600",
            titleOverride: "미디어 고속 다운로드 (Direct Downloader)",
            overview: "유튜브, 틱톡, 인스타그램, 더우인, 콰이쇼우 등 전 세계 15개 이상의 동영상 플랫폼 링크를 붙여넣어 원본 화질로 즉시 일괄 다운로드합니다.",
            features: [
                {
                    icon: Download,
                    title: "다중 URL 일괄 큐 (Batch Queue)",
                    desc: "수십 개의 영상 링크를 줄바꿈으로 입력하여 대기열에 추가하고 순차적으로 고속 일괄 다운로드합니다."
                },
                {
                    icon: Shield,
                    title: "우회 모드 (Bypass Mode) & 브라우저 프로필 연동",
                    desc: "로그인이 필요하거나 차단된 플랫폼 영상도 전용 스텔스 브라우저 엔진으로 우회하여 완벽하게 수집합니다."
                }
            ],
            steps: [
                "메뉴에서 '미디어 고속 다운로드'를 선택합니다.",
                "저장할 카테고리를 선택하고 텍스트 영역에 영상 URL들을 붙여넣습니다.",
                "[즉시 다운로드] 또는 [다운로드 대기열 추가] 후 [일괄 다운로드 시작]을 누릅니다."
            ]
        },

        // --- 7. 더우인 쇼츠 수집 팩토리 ---
        douyin_studio: {
            category: "멀티모달 팩토리",
            badge: "AI",
            icon: Scissors,
            iconBg: "from-purple-600 to-indigo-600",
            titleOverride: "더우인 쇼츠 수집 (Douyin Studio Pro)",
            overview: "수백 개의 중국 숏폼 영상을 동시 다발적으로 분석/편집하는 멀티모달 AI 팩토리입니다. 키워드 확장 수집, AI 매핑, 씬 분할 컷편집을 지원합니다.",
            features: [
                {
                    icon: Sparkles,
                    title: "✨ AI 자동 키워드 확장 & 네트워크 스크래핑",
                    desc: "카테고리와 시드 키워드를 기반으로 AI가 연관 키워드를 자동 확장하여 대량의 인기 쇼츠를 일괄 수집합니다."
                },
                {
                    icon: UploadCloud,
                    title: "모바일 원터치 다중 영상 업로드",
                    desc: "PC 파일 드래그 앤 드롭뿐만 아니라 모바일 터치 한 번으로 스마트폰에 저장된 영상을 대량 업로드할 수 있습니다."
                }
            ],
            steps: [
                "메뉴에서 '더우인 쇼츠 수집'을 선택합니다.",
                "1단계에서 카테고리와 키워드를 선택하고 [대기열로 수집 시작]을 누릅니다.",
                "2단계 AI 매핑에서 대본 번역과 목소리(TTS)를 매핑하고 3단계에서 최종 검수합니다."
            ]
        },

        // --- 8. 다국어 목소리 합성 ---
        multi_tts: {
            category: "AI 음성 & 자막",
            badge: "VOICE",
            icon: Mic,
            iconBg: "from-violet-600 to-pink-600",
            titleOverride: "다국어 목소리 합성 (Multi TTS Studio)",
            overview: "Supertonic Local, Qwen3, ElevenLabs, Edge TTS 등 최첨단 다국어 음성 합성 엔진으로 자연스러운 나레이션을 생성하고, 무음 제거 및 자막(SRT) 추출을 원스톱으로 처리합니다.",
            features: [
                {
                    icon: Mic,
                    title: "초고음질 로컬/클라우드 음성 엔진 탑재",
                    desc: "다양한 보이스 프리셋과 속도, 톤, 감정(기쁨/슬픔/분노) 조절을 통해 쇼츠에 최적화된 오디오를 생성합니다."
                },
                {
                    icon: FileText,
                    title: "무음 구간 일괄 제거 & 초정밀 자막(SRT) 추출",
                    desc: "호흡과 무음 구간을 50ms 단위로 자동 컷팅하여 오디오 밀도를 극대화하고 즉시 자막 파일로 변환합니다."
                }
            ],
            steps: [
                "메뉴에서 '다국어 목소리 합성'으로 이동합니다.",
                "텍스트를 입력하고 원하는 음성 엔진과 목소리, 속도, 감정을 선택한 뒤 [음성 생성 시작]을 누릅니다.",
                "필요 시 2단계에서 [무음 제거 실행]을 거친 뒤, 3단계에서 [자막 추출 및 편집]으로 이동합니다."
            ]
        },

        // --- 9. 작업 환경 설정 ---
        settings: {
            category: "시스템 & 설정",
            badge: "CONFIG",
            icon: SettingsIcon,
            iconBg: "from-slate-700 to-zinc-800",
            titleOverride: "작업 환경 설정 (System Settings)",
            overview: "AI API 키(Gemini, Groq, Claude, OpenAI), 저장소 다운로드 경로, 자동 다운로드 주기, CloakBrowser 엔진 패치 및 설정 백업/복원을 총괄 관리합니다.",
            features: [
                {
                    icon: SettingsIcon,
                    title: "AI 모델 & 검색 API 다중 키 관리",
                    desc: "LLM 키를 여러 개 등록하면 자동 순환(Round-Robin)하여 레이트 리밋을 방지합니다."
                },
                {
                    icon: FolderOpen,
                    title: "원클릭 설정 백업 & 복원",
                    desc: "현재 모든 설정과 연결 정보를 JSON 파일로 안전하게 내보내고 다른 PC에서 원클릭으로 복원합니다."
                }
            ],
            steps: [
                "메뉴에서 '작업 환경 설정'을 선택합니다.",
                "기본 다운로드 경로와 필요한 API 키들을 입력합니다.",
                "하단의 [설정 저장] 버튼을 눌러 변경사항을 즉시 적용합니다."
            ]
        }
    };

    const guideCategories = [
        {
            id: 'core_ops',
            title: '핵심 자동화 & 대기열',
            icon: Layers,
            guides: [
                { id: 'work_queue', title: '자동화 작업 대기열 (Work Queue)', time: '3분', key: 'work_queue' },
                { id: 'incubator', title: '통합 계정 & 육성 관리', time: '5분', key: 'incubator' },
                { id: 'dashboard', title: '통합 관제 대시보드', time: '3분', key: 'dashboard' }
            ]
        },
        {
            id: 'sourcing',
            title: '콘텐츠 수집 & 보관',
            icon: Download,
            guides: [
                { id: 'gallery', title: '미디어 보관함 (Viral Gallery)', time: '3분', key: 'gallery' },
                { id: 'channels', title: '타겟 채널 자동 수집 (Target Channels)', time: '3분', key: 'channels' },
                { id: 'direct_download', title: 'URL 영상 직접 수집 (Direct Downloader)', time: '2분', key: 'direct_download' },
                { id: 'douyin_studio', title: '더우인 쇼츠 수집 (Studio Pro)', time: '5분', key: 'douyin_studio' }
            ]
        },
        {
            id: 'ai_studio',
            title: 'AI 음성 & 시스템 설정',
            icon: Sparkles,
            guides: [
                { id: 'multi_tts', title: '다국어 목소리 합성 (Multi TTS)', time: '5분', key: 'multi_tts' },
                { id: 'settings', title: '작업 환경 설정 (Settings)', time: '3분', key: 'settings' }
            ]
        }
    ];

    const handleSelectGuide = (key: string) => {
        setSelectedGuideKey(key);
        const element = document.getElementById(key);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const filteredGuides = Object.entries(detailedGuides).filter(([key, content]) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (content.titleOverride || '').toLowerCase().includes(q) ||
            content.overview.toLowerCase().includes(q) ||
            content.category.toLowerCase().includes(q)
        );
    });

    return (
        <div className="container mx-auto p-3 sm:p-6 md:p-8 pb-44 md:pb-16 max-w-6xl animate-in fade-in duration-300 min-h-screen bg-background text-foreground">
            
            {/* Header Title */}
            <div className="mb-4 sm:mb-8 space-y-1">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">사용자 공식 안내서</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                            ViraLoop Studio의 모든 최신 기능과 작업 흐름을 한눈에 배우고 활용하세요.
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">

                {/* Left: Navigation Menu */}
                <div className="lg:col-span-1">
                    <div className="static lg:sticky top-6 space-y-3 sm:space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="기능 또는 키워드 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 text-xs sm:text-sm shadow-2xs bg-card border-border rounded-xl"
                            />
                        </div>

                        {/* Category Navigation */}
                        <div className="space-y-2">
                            {guideCategories.map((cat) => (
                                <div key={cat.id} className="border border-border rounded-xl p-2 bg-card shadow-2xs">
                                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        <cat.icon className="w-3.5 h-3.5 text-primary" />
                                        <span>{cat.title}</span>
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        {cat.guides.map((guide) => (
                                            <button
                                                key={guide.id}
                                                onClick={() => handleSelectGuide(guide.key)}
                                                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                                                    selectedGuideKey === guide.key 
                                                        ? 'bg-primary text-primary-foreground font-bold shadow-xs' 
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                }`}
                                            >
                                                <span className="truncate">{guide.title}</span>
                                                <span className="text-[10px] opacity-75 shrink-0 ml-1">⏱ {guide.time}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Detailed Content Area */}
                <div className="lg:col-span-3 space-y-6 sm:space-y-10">
                    {filteredGuides.map(([key, content]) => (
                        <div key={key} id={key} className="scroll-mt-20">
                            <Card className="overflow-hidden border border-border bg-card shadow-2xs rounded-2xl ring-1 ring-border/50">
                                
                                {/* Compact Modern Dark Banner Header */}
                                <div className="p-4 sm:p-6 bg-gradient-to-r from-card via-muted/40 to-card border-b border-border/80 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${content.iconBg} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                                            <content.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                                                    {content.category}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-muted-foreground">{content.badge}</span>
                                            </div>
                                            <h2 className="text-base sm:text-xl font-bold text-foreground truncate">
                                                {content.titleOverride || key}
                                            </h2>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 bg-card">
                                    {/* 1. Overview */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                                            <Info className="w-4 h-4 text-blue-500" />
                                            개요 (Overview)
                                        </h3>
                                        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground bg-muted/30 p-3.5 sm:p-4 rounded-xl border border-border/60">
                                            {content.overview}
                                        </p>
                                    </div>

                                    {/* 2. Key Features */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                                            <Sparkles className="w-4 h-4 text-purple-500" />
                                            주요 기능 (Key Features)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                            {content.features.map((feat, idx) => (
                                                <div key={idx} className="p-3.5 sm:p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors space-y-1.5 shadow-2xs">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary shrink-0">
                                                            <feat.icon className="w-4 h-4" />
                                                        </div>
                                                        <h4 className="font-bold text-xs sm:text-sm text-foreground">{feat.title}</h4>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                                                        {feat.desc}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Step-by-Step Guide */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                                            <MousePointerClick className="w-4 h-4 text-emerald-500" />
                                            따라하기 (Step-by-Step)
                                        </h3>
                                        <div className="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-primary/20 ml-2">
                                            {content.steps.map((step, idx) => (
                                                <div key={idx} className="flex items-start gap-3 pl-3">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5 shadow-2xs">
                                                        {idx + 1}
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed pt-0.5">
                                                        {step}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}

                    {filteredGuides.length === 0 && (
                        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border space-y-2">
                            <Search className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                            <h3 className="text-sm font-bold text-foreground">검색 결과가 없습니다</h3>
                            <p className="text-xs text-muted-foreground">다른 키워드로 검색해보세요.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Explicit Mobile Bottom Navigation Clearance Spacer */}
            <div className="h-32 md:hidden shrink-0 pointer-events-none" aria-hidden="true" />
        </div>
    );
}
