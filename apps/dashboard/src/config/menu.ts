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
    Terminal
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
    items: MenuItem[];
    defaultExpanded?: boolean;
}

export const getMenuGroups = (captainId: string | null): MenuGroup[] => [
    {
        title: "⚙️ AI 코어 & 오토메이션",
        defaultExpanded: true,
        items: [
            { name: '자동화 작업 대기열', path: '/work-queue', icon: Activity, highlight: true },
            { name: '자동화 워크플로우', path: '/workflows', icon: Share2 },
        ]
    },
    {
        title: "🎬 인공지능 창작 스튜디오",
        defaultExpanded: true,
        items: [
            { name: '에이전트 스튜디오', path: '/agent-studio', icon: BrainCircuit, highlight: true },
            { name: '대본 생성 및 편집', path: '/script-writer', icon: Edit },
            { name: '미디어 일괄 생성', path: '/creative-studio', icon: Clapperboard },
            { name: '다국어 목소리 합성', path: '/multi-tts', icon: Mic },
            { name: '자막 생성 및 번역', path: '/subtitle-tool', icon: Languages },
            { name: '무음 구간 일괄 제거', path: '/silence-remover', icon: Scissors },
            { name: '개체 및 배경 제거', path: '/remover', icon: Eraser },
        ]
    },
    {
        title: "🧪 크리에이티브 실험실 (Beta)",
        defaultExpanded: false,
        items: [
            { name: '통합 창작 스튜디오', path: '/elite-studio', icon: Swords },
            { name: '편집기 연동 자동화', path: '/flow2capcut', icon: Clapperboard },
            { name: '화질 개선', path: '/remaster-lab', icon: Wand2 },
            { name: '정밀 영상 컷 편집기', path: '/cut-editor', icon: Scissors },
        ]
    },
    {
        title: "📊 트렌드 분석 및 소싱",
        defaultExpanded: false,
        items: [
            { name: '참조 채널 분석', path: '/channels', icon: ListVideo },
            { name: '미디어 고속 다운로드', path: '/download', icon: Download },
            { name: '미디어 보관함', path: '/gallery', icon: Image },
            { name: '대본 추출 및 분석', path: '/script-lab', icon: Sparkles },
            { name: '실시간 검색어 탐색', path: '/keyword-explorer', icon: Globe },
            { name: '외부 웹사이트 연결', path: '/custom-menu', icon: Globe },
        ]
    },
    {
        title: "📡 가상 라이브 센터",
        defaultExpanded: true,
        items: [
            { name: '가상 라이브 스튜디오', path: '/live-studio', icon: Wand2, highlight: true },
            { name: '24시간 스트리밍', path: '/station-manager', icon: Radio },
        ]
    },
    {
        title: "📈 채널 성장 및 분석",
        defaultExpanded: false,
        items: [
            { name: '신규 채널 육성', path: '/incubator', icon: Sparkles },
            { name: '통합 관리자 화면', path: captainId ? `/captain/${captainId}` : '/captain', icon: BarChart3 },
            { name: '스텔스 채널 관리', path: captainId ? `/captain/${captainId}/channels` : '/captain/channels', icon: Shield, highlight: true },
            { name: '소셜 다계정 관리', path: '/account-manager', icon: Users },
            { name: '연좌제 방어 변조', path: '/sovereign-shield', icon: Shield, highlight: true },
        ]
    },
    {
        title: "🛠️ 시스템 환경 및 보안 설정",
        defaultExpanded: false,
        items: [
            { name: '일일 리포트', path: '/reports', icon: FileText },
            { name: '사용자 안내서', path: '/guide-center', icon: FileText },
            { name: '작업 환경 설정', path: '/settings', icon: Settings },
        ]
    }
];
