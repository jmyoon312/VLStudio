import React from 'react';
import { 
    LayoutDashboard, 
    Film, 
    Sparkles, 
    Cpu, 
    ArrowUpRight, 
    CheckCircle2, 
    TrendingUp, 
    Clock, 
    Calendar,
    Layers,
    Share2,
    SlidersHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

interface PixelingDashboardViewProps {
    onNavigateView?: (viewId: string) => void;
}

export function PixelingDashboardView({ onNavigateView }: PixelingDashboardViewProps) {
    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">스튜디오 종합 현황</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            대화·결과물·AI 한도·GPU 렌더링 자원을 한눈에 모니터링합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            시스템 전원 정상 가동 중
                        </span>
                    </div>
                </div>

                {/* 4 Top Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold">총 생성 쇼츠 영상</span>
                            <Film className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-foreground">28</span>
                            <span className="text-xs text-muted-foreground">/ 목표 50편</span>
                        </div>
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full w-[56%] rounded-full" />
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>전주 대비 +12편 증가</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold">AI 디렉터 토큰 잔여</span>
                            <Sparkles className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-foreground">무제한</span>
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">PRO 요금제</span>
                        </div>
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-600 h-full w-[24%] rounded-full" />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            OpenAI · Gemini 주권 엔진 직결
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold">GPU 렌더링 세마포어</span>
                            <Cpu className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-foreground">2 / 2</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">여유 슬롯</span>
                        </div>
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-full w-[0%] rounded-full" />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            대기 중인 무거운 인코딩 없음
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold">활성 육성 채널</span>
                            <Share2 className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-foreground">4</span>
                            <span className="text-xs text-muted-foreground">개 채널</span>
                        </div>
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-600 h-full w-[100%] rounded-full" />
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            스텔스 다중 회선 세션 보호 중
                        </div>
                    </div>
                </div>

                {/* 4 Form Factor Production Breakdown */}
                <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-600" />
                            <span>4대 폼팩터 쇼츠 생산 비중</span>
                        </h3>
                        {onNavigateView && (
                            <button
                                type="button"
                                onClick={() => onNavigateView('presets')}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                            >
                                <span>프리셋 관리</span>
                                <ArrowUpRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {[
                            { name: '1. 클래식 쇼츠', count: 12, ratio: '43%', color: 'bg-blue-600' },
                            { name: '2. 인스타 감성 릴스', count: 6, ratio: '21%', color: 'bg-pink-600' },
                            { name: '3. 군림보 텐션 쇼츠', count: 7, ratio: '25%', color: 'bg-amber-600' },
                            { name: '4. 디시/에펨 썰형 쇼츠', count: 3, ratio: '11%', color: 'bg-emerald-600' },
                        ].map((item, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                                <div className="text-xs font-bold text-foreground">{item.name}</div>
                                <div className="flex items-baseline justify-between text-[11px]">
                                    <span className="font-bold text-foreground">{item.count}편</span>
                                    <span className="text-muted-foreground">{item.ratio}</span>
                                </div>
                                <div className="w-full bg-muted/80 h-1 rounded-full overflow-hidden">
                                    <div className={`${item.color} h-full`} style={{ width: item.ratio }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fast Action Shortcuts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigateView && onNavigateView('editor')}
                        className="p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-left transition-all cursor-pointer flex items-center justify-between group shadow-xs"
                    >
                        <div>
                            <div className="text-xs font-bold text-foreground group-hover:text-blue-600 transition-colors">
                                껍데기 캔버스 기본 에디터
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                영상 없이 자막·스타일·글꼴 프리셋 제작
                            </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                    </button>

                    <button
                        type="button"
                        onClick={() => onNavigateView && onNavigateView('make')}
                        className="p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-left transition-all cursor-pointer flex items-center justify-between group shadow-xs"
                    >
                        <div>
                            <div className="text-xs font-bold text-foreground group-hover:text-blue-600 transition-colors">
                                NLE 타임라인 메이크 에디터
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                비디오/오디오/자막 멀티트랙 즉시 편집
                            </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                    </button>

                    <button
                        type="button"
                        onClick={() => onNavigateView && onNavigateView('outputs')}
                        className="p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-left transition-all cursor-pointer flex items-center justify-between group shadow-xs"
                    >
                        <div>
                            <div className="text-xs font-bold text-foreground group-hover:text-blue-600 transition-colors">
                                결과물 보관함 & CapCut
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                완성된 영상 확인 및 캡컷 프로젝트 열기
                            </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                    </button>
                </div>
            </div>
        </div>
    );
}
