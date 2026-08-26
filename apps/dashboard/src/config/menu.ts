import {
    LayoutDashboard,
    ListVideo,
    Image,
    Settings,
    Download,
    Scissors,
    LayoutGrid,
    Mic,
    Edit,
    Clapperboard,
    Radio,
    TrendingUp,
    Wand2,
    Languages,
    Eraser,
    Sparkles,
    UploadCloud,
    Share2,
    Activity,
    Globe,
    FileText,
    BarChart3,
    Shield,
    Rocket,
    Smartphone,
    Users,
    BrainCircuit,
    Home,
    Zap,
    Swords,
    Target,
    Terminal,
    Play,
    Star,
    Heart,
    BookOpen,
} from 'lucide-react';

export interface MenuItem {
    name: string;
    path: string;
    icon: React.ElementType;
    highlight?: boolean;
    badge?: number;
}

export interface MenuGroup {
    title: string;
    mode: 'DISCOVERY' | 'CREATION' | 'OPERATION' | 'EDUCATION';
    items: MenuItem[];
    defaultExpanded?: boolean;
}

export const getMenuGroups = (captainId: string | null): MenuGroup[] => [
    // 1. DISCOVERY (트렌드 분석 및 소싱)
    {
        title: "📊 트렌드 분석 및 소싱",
        mode: "DISCOVERY",
        defaultExpanded: true,
        items: [
            { name: '타겟 채널 자동 수집', path: '/channels', icon: ListVideo },
            { name: '더우인 쇼츠 수집', path: '/douyin-search', icon: Globe, highlight: true },
            { name: 'URL 영상 직접 수집', path: '/download', icon: Download },
            { name: '수집 영상 보관함', path: '/gallery', icon: Image },
            { name: '수집 대본 분석실', path: '/script-lab', icon: Sparkles },
            { name: '외부 웹사이트 연결', path: '/custom-menu', icon: Globe },
        ]
    },

    // 2. CREATION (인공지능 창작 스튜디오)
    {
        title: "🎬 인공지능 창작 스튜디오",
        mode: "CREATION",
        defaultExpanded: true,
        items: [
            { name: 'Flow AI 비디오 렌더러', path: '/flow2capcut', icon: Wand2, highlight: true },
            { name: 'AI 대본 각색 및 생성', path: '/script-writer', icon: Edit, highlight: true },
            { name: 'AI 원클릭 쇼츠 제작', path: '/ddalkkak', icon: Zap, highlight: true },
            { name: '스마트 씬 분할 컷터', path: '/scene-cutter-pro', icon: Scissors },
            { name: 'AI 미디어 일괄 생성', path: '/creative-studio', icon: Clapperboard },
            { name: 'AI 다국어 목소리 합성', path: '/multi-tts', icon: Mic },
            { name: 'AI 자막 생성 및 번역', path: '/subtitle-tool', icon: Languages },
            { name: '무음 구간 자동 컷팅', path: '/silence-remover', icon: Scissors },
            { name: 'AI 배경 및 개체 제거', path: '/remover', icon: Eraser },
        ]
    },

    // 3. OPERATION (채널 운영 및 자동화)
    {
        title: "📈 채널 성장 및 자동화",
        mode: "OPERATION",
        defaultExpanded: true,
        items: [
            { name: '쇼츠 자동 배포 관리', path: '/work-queue', icon: Activity, highlight: true },
            { name: '채널 계정 & 웜업 육성', path: '/incubator', icon: Users, highlight: true },
        ]
    },
    {
        title: "📡 가상 라이브 센터",
        mode: "OPERATION",
        defaultExpanded: true,
        items: [
            { name: '라이브 씬 디자인', path: '/live-studio', icon: Wand2 },
            { name: '24시 무인 라이브 송출', path: '/station-manager', icon: Radio },
        ]
    },

    // 4. EDUCATION / SYSTEM (시스템 설정 및 보안)
    {
        title: "🛠️ 시스템 환경 및 보안 설정",
        mode: "EDUCATION",
        defaultExpanded: true,
        items: [
            { name: '작업 환경 설정', path: '/settings', icon: Settings },
            { name: '일일 리포트', path: '/reports', icon: FileText },
            { name: '사용자 안내서', path: '/guide-center', icon: BookOpen },
        ]
    }
];

