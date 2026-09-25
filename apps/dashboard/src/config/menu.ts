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
    Layers,
    Cpu,
    GitBranch,
    ShieldCheck,
    DollarSign,
    Flame,
    MessageSquare,
    Dna,
    LayoutTemplate,
    Film
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
    mode: 'AI_ORCHESTRATION' | 'DISCOVERY' | 'CREATION' | 'OPERATION_SYSTEM';
    items: MenuItem[];
    defaultExpanded?: boolean;
}

export const getMenuGroups = (captainId: string | null): MenuGroup[] => [
    // 0. AI_ORCHESTRATION (AI 프로덕션 자동 제작)
    {
        title: "🎬 자동 제작",
        mode: "AI_ORCHESTRATION",
        defaultExpanded: true,
        items: [
            { name: '대화형 총괄 연출', path: '/director', icon: Sparkles, highlight: true },
            { name: '인스턴트 제작', path: '/instant-studio', icon: Zap, highlight: true },
            { name: '스튜디오 관제', path: '/war-room', icon: Cpu, highlight: true },
            { name: '제작 파이프라인', path: '/pipeline-builder', icon: GitBranch, highlight: true },
            { name: 'AI 제작팀', path: '/agent-roster', icon: Users, highlight: true },
            { name: '채널 스타일', path: '/brain-vault', icon: BrainCircuit, highlight: true },
            { name: '자동 스케줄', path: '/autonomous-patrol', icon: Radio, highlight: true },
        ]
    },

    // 1. DISCOVERY (트렌드 분석 및 소싱)
    {
        title: "📊 트렌드 소싱",
        mode: "DISCOVERY",
        defaultExpanded: true,
        items: [
            { name: '소싱 센터', path: '/sourcing-center', icon: Film, highlight: true },
            { name: '바이럴 인텔리전스', path: '/viral-intelligence', icon: Flame, highlight: true },
            { name: '바이럴 스카우터', path: '/trend-radar', icon: TrendingUp, highlight: true },
            { name: 'SNS 바이럴 퀀트 레이더', path: '/sns-radar', icon: Smartphone, highlight: true },
            { name: '채널 DNA 분석', path: '/channel-dna-studio', icon: Dna, highlight: true },
            { name: '채널 영상 수집', path: '/channels', icon: ListVideo },
            { name: '더우인 쇼츠 수집', path: '/douyin-search', icon: Globe, highlight: true },
            { name: 'URL 영상 다운', path: '/download', icon: Download },
            { name: '영상 보관함', path: '/gallery', icon: Image },
            { name: '대본 분석실', path: '/script-lab', icon: Sparkles },
            { name: '외부 웹사이트', path: '/custom-menu', icon: Globe },
        ]
    },

    // 2. CREATION (콘텐츠 제작 스튜디오)
    {
        title: "⚡ 올인원 생성",
        mode: "CREATION",
        defaultExpanded: true,
        items: [
            { name: '올인원 생성', path: '/shorts-batch', icon: Zap, highlight: true },
        ]
    },
    {
        title: "🎛️ 전문 편집기",
        mode: "CREATION",
        defaultExpanded: true,
        items: [
            { name: '프로 편집기 (Pro NLE)', path: '/pro-editor', icon: Wand2, highlight: true },
            { name: '클래식 편집기', path: '/shorts-editor/classic', icon: Clapperboard, highlight: true },
            { name: '인스타 편집기', path: '/shorts-editor/instagram', icon: Smartphone, highlight: true },
            { name: '군림보 편집기', path: '/shorts-editor/gunlimbo', icon: Swords, highlight: true },
            { name: '썰형 편집기', path: '/shorts-editor/ssul', icon: MessageSquare, highlight: true },
        ]
    },
    {
        title: "🎨 템플릿 디자인",
        mode: "CREATION",
        defaultExpanded: false,
        items: [
            { name: '클래식 템플릿', path: '/shorts-template/classic', icon: LayoutTemplate },
            { name: '인스타 템플릿', path: '/shorts-template/instagram', icon: Smartphone },
            { name: '군림보 템플릿', path: '/shorts-template/gunlimbo', icon: Swords },
            { name: '썰형 템플릿', path: '/shorts-template/ssul', icon: MessageSquare },
        ]
    },
    {
        title: "🛠️ 공정별 도구",
        mode: "CREATION",
        defaultExpanded: false,
        items: [
            { name: '자막 생성기', path: '/tools/subtitles', icon: Languages, highlight: true },
            { name: '더빙 생성기', path: '/tools/tts-dub', icon: Mic, highlight: true },
            { name: '클립 분할기', path: '/tools/clip-edit', icon: Scissors, highlight: true },
            { name: '기획 & 리서치', path: '/research-concept-lab', icon: BrainCircuit },
            { name: '스마트 컷터', path: '/scene-cutter-pro', icon: Scissors },
            { name: '미디어 일괄 생성', path: '/creative-studio', icon: Layers },
            { name: '비디오 렌더러', path: '/flow2capcut', icon: Wand2 },
            { name: '대본 각색·생성', path: '/script-writer', icon: Edit },
            { name: '무음 컷팅', path: '/silence-remover', icon: Scissors },
            { name: '배경·개체 제거', path: '/remover', icon: Eraser },
        ]
    },

    // 3. OPERATION_SYSTEM (채널 운영 및 성장)
    {
        title: "📈 채널 성장·자동화",
        mode: "OPERATION_SYSTEM",
        defaultExpanded: true,
        items: [
            { name: '자동 배포 관리', path: '/work-queue', icon: Activity, highlight: true },
            { name: '채널 육성(웜업)', path: '/incubator', icon: Users, highlight: true },
            { name: '수익률 분석', path: '/analytics', icon: DollarSign, highlight: true },
            { name: '성과 & 후킹 분석', path: '/viral-lab', icon: Flame, highlight: true },
            { name: '댓글·소통 관리', path: '/community', icon: MessageSquare, highlight: true },
        ]
    },
    {
        title: "📡 가상 라이브",
        mode: "OPERATION_SYSTEM",
        defaultExpanded: true,
        items: [
            { name: '라이브 디자인', path: '/live-studio', icon: Wand2 },
            { name: '무인 라이브 송출', path: '/station-manager', icon: Radio },
        ]
    },
    {
        title: "🛠️ 시스템 설정",
        mode: "OPERATION_SYSTEM",
        defaultExpanded: true,
        items: [
            { name: '작업 환경 설정', path: '/settings', icon: Settings, highlight: true },
            { name: '일일 리포트', path: '/reports', icon: FileText },
            { name: '사용자 안내서', path: '/guide-center', icon: BookOpen },
        ]
    }
];
