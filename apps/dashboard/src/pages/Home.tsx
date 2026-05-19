import React from 'react';
import { 
    Search, 
    ArrowRight, 
    Sparkles, 
    Video, 
    TrendingUp, 
    Zap, 
    Smile,
    MessageSquare,
    Play,
    Plus,
    Layout,
    Activity,
    Users,
    ShieldCheck,
    Globe,
    BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const Home = () => {
    const [inputValue, setInputValue] = React.useState('');

    const quickActions = [
        {
            title: "신규 숏폼 미션 투입",
            description: "트렌드 키워드로 즉시 영상을 제작합니다.",
            icon: Play,
            color: "text-blue-500",
            bg: "bg-blue-50",
            path: "/work-queue",
            stats: "12개 대기 중"
        },
        {
            title: "AI 픽시에디터 실행",
            description: "정밀한 편집과 렌더링을 시작합니다.",
            icon: Sparkles,
            color: "text-purple-500",
            bg: "bg-purple-50",
            path: "/pixeling",
            stats: "v3.5 Active"
        },
        {
            title: "글로벌 트렌드 분석",
            description: "현재 바이럴 중인 콘텐츠를 탐색합니다.",
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            path: "/keyword-explorer",
            stats: "98% 매칭률"
        },
        {
            title: "스웜 관제 센터",
            description: "에이전트들의 실시간 활동을 모니터링합니다.",
            icon: Zap,
            color: "text-amber-500",
            bg: "bg-amber-50",
            path: "/swarm-hub",
            stats: "14개 노드 작동"
        }
    ];

    return (
        <div className="animate-in fade-in duration-500 pb-12">
            <div className="w-full max-w-[1400px] mx-auto grid grid-cols-12 gap-8">
                
                {/* Left Section: Greeting & Input (Span 8) */}
                <div className="col-span-12 lg:col-span-8 space-y-10">
                    {/* No Greeting - Command Center Only */}

                    {/* Command Input Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="w-6 h-6 text-pixie-sub group-focus-within:text-pixie-blue transition-colors" />
                        </div>
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="명령어를 입력하세요 (예: '기술 트렌드 영상 5개 생성')"
                            className="w-full h-20 pl-16 pr-24 bg-white rounded-2xl border border-pixie-border shadow-pixie-float text-lg focus:outline-none focus:ring-4 focus:ring-pixie-blue/5 transition-all"
                        />
                        <div className="absolute right-4 top-4 bottom-4 flex items-center">
                            <button className="h-full px-8 bg-pixie-blue text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 active:scale-95">
                                시작하기
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions Grid (Rich & Full) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quickActions.map((action, i) => {
                            const Icon = action.icon;
                            return (
                                <Link 
                                    key={i}
                                    to={action.path}
                                    className="group p-6 bg-white rounded-2xl border border-pixie-border shadow-sm hover:shadow-pixie hover:border-pixie-blue/30 transition-all duration-300 flex items-center gap-6"
                                >
                                    <div className={cn("p-4 rounded-xl shrink-0", action.bg)}>
                                        <Icon className={cn("w-8 h-8", action.color)} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-pixie-text group-hover:text-pixie-blue transition-colors">
                                                {action.title}
                                            </h3>
                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-pixie-gray rounded text-pixie-sub uppercase tracking-wider">
                                                {action.stats}
                                            </span>
                                        </div>
                                        <p className="text-xs text-pixie-sub leading-relaxed line-clamp-1">
                                            {action.description}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Right Section: Status & Metrics (Span 4) */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="p-8 bg-white rounded-[2rem] border border-pixie-border shadow-pixie space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-pixie-text uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" /> 실시간 함대 상태
                            </h3>
                            <span className="text-[10px] font-bold text-emerald-500 animate-pulse">LIVE</span>
                        </div>
                        
                        <div className="space-y-4">
                            {[
                                { label: "활성 에이전트", value: "14/14", icon: Users, color: "text-blue-500" },
                                { label: "평균 렌더링 속도", value: "1.2s/frame", icon: Zap, color: "text-amber-500" },
                                { label: "바이럴 적중률", value: "84.2%", icon: TrendingUp, color: "text-emerald-500" },
                                { label: "시스템 보안", value: "SAFE", icon: ShieldCheck, color: "text-indigo-500" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-pixie-gray/50 rounded-xl border border-pixie-border/40">
                                    <div className="flex items-center gap-3">
                                        <item.icon className={cn("w-4 h-4", item.color)} />
                                        <span className="text-xs font-semibold text-pixie-sub">{item.label}</span>
                                    </div>
                                    <span className="text-sm font-bold text-pixie-text">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4">
                            <button className="w-full py-4 bg-pixie-gray hover:bg-white border border-pixie-border rounded-xl text-xs font-bold text-pixie-text transition-all shadow-sm flex items-center justify-center gap-2">
                                <BarChart3 className="w-4 h-4" /> 상세 리포트 보기
                            </button>
                        </div>
                    </div>

                    {/* Mini World Map / Activity Card */}
                    <div className="p-8 bg-gradient-to-br from-pixie-blue to-blue-700 rounded-[2rem] text-white space-y-4 relative overflow-hidden shadow-lg shadow-blue-200/50">
                        <div className="relative z-10 space-y-2">
                            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-200" /> 글로벌 배포망
                            </h3>
                            <p className="text-2xl font-bold">12개국 동시 송출 중</p>
                            <p className="text-[10px] text-white/70 font-medium">현재 아시아 및 북미 지역 트래픽 급증</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-20">
                            <Globe className="w-32 h-32" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
