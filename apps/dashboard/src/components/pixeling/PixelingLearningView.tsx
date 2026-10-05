import React, { useState } from 'react';
import { 
    GraduationCap, 
    Play, 
    Pause, 
    Clock, 
    BookOpen, 
    MessageSquare, 
    CheckCircle2, 
    ChevronRight,
    Sparkles,
    Maximize2
} from 'lucide-react';
import { toast } from 'sonner';

interface LectureItem {
    id: string;
    index: number;
    title: string;
    duration: string;
    description: string;
    videoUrl?: string;
    keyPoints: string[];
    isCompleted?: boolean;
}

const LECTURES: LectureItem[] = [
    {
        id: 'lec-1',
        index: 1,
        title: '0초 훅으로 쇼츠 알고리즘 폭발시키는 3대 불변 법칙',
        duration: '12분 40초',
        description: '시청자가 0.5초 만에 스와이프하지 않도록 시각적·청각적 긴장감을 부여하는 훅 디자인 공식.',
        keyPoints: [
            '첫 1초 이내 비주얼 급변(0초 줌인) 또는 의문형 자막 배치',
            '청각적 SFX(스우시, 타격음)와 F0 보이스 피치 고저차 활용',
            '결론을 먼저 보여주고 과정을 궁금하게 만드는 역행 구조'
        ],
        isCompleted: true
    },
    {
        id: 'lec-2',
        index: 2,
        title: '4대 폼팩터 NLE 엔진으로 10분 만에 10편 뽑아내기',
        duration: '18분 15초',
        description: '클래식 쇼츠, 인스타 릴스, 군림보 텐션, 디시 썰형 4대 폼팩터 자동 렌더링 파이프라인 정복.',
        keyPoints: [
            '썰형: 상단 헤더바, 메타데이터, 자막 누적 모드 최적화',
            '군림보: 상하단 훅 밴드 및 텍스트 외곽선 4px 고정',
            '인스타: 감성 프로필 바 및 베스트 댓글 슬롯 연동'
        ]
    },
    {
        id: 'lec-3',
        index: 3,
        title: 'CapCut 데스크톱 무인 연동과 자막 싱크 완전 정복',
        duration: '15분 50초',
        description: '마이크로초 단위 정밀 타임코드와 CapCut 프로젝트 파일(draft_content.json) 자동 생성 노하우.',
        keyPoints: [
            'ms * 1000 마이크로초 단위 타임라인 좌표 연산 공식',
            '자막 줄바꿈 및 화면 안전영역(Safe-Zone) 침범 방지',
            '원클릭 CapCut 실행 및 드래프트 자동 등록'
        ]
    },
    {
        id: 'lec-4',
        index: 4,
        title: '모바일 USB 다중 회선 스텔스 채널 육성 및 리스크 관리',
        duration: '22분 10초',
        description: '유튜브/틱톡 알고리즘의 어뷰징 탐지를 완벽히 우회하는 하이브리드 세션 격리 기법.',
        keyPoints: [
            '독립 세션 프로필(04_Profiles)을 통한 핑거프린트 분리',
            'IP 로테이션 및 유기적 업로드 시간 간격(지터링) 적용',
            '채널 DNA 샌드박스로 상호 정보 오염 0% 보장'
        ]
    }
];

interface PixelingLearningViewProps {
    onAskInChat?: (promptText: string) => void;
}

export function PixelingLearningView({ onAskInChat }: PixelingLearningViewProps) {
    const [selectedLecture, setSelectedLecture] = useState<LectureItem>(LECTURES[0]);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">픽셀러닝 아카데미</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            내 강의를 보고, 강의에 대해 AI 디렉터에게 즉시 질문하세요.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/60">
                        <span>수강 진행률:</span>
                        <span className="font-bold text-blue-600">1 / 4 완료 (25%)</span>
                    </div>
                </div>

                {/* Main Video & Lecture Detail Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Player & Summary (2 Cols) */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Video Player Mockup */}
                        <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-border/70 flex flex-col justify-between p-4 shadow-md group">
                            <div className="flex items-center justify-between z-10">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-xs">
                                    제 {selectedLecture.index}강 · {selectedLecture.duration}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => toast.info('전체 화면을 지원합니다.')}
                                    className="p-1.5 text-white/80 hover:text-white rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Center Play Button */}
                            <div className="self-center flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPlaying(!isPlaying);
                                        toast.info(isPlaying ? '강의를 일시정지했습니다.' : '강의 재생을 시작합니다.');
                                    }}
                                    className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                                >
                                    {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
                                </button>
                                <span className="text-xs text-white/80 font-medium">
                                    {isPlaying ? '재생 중' : '클릭하여 강의 시청'}
                                </span>
                            </div>

                            {/* Bottom Progress Bar */}
                            <div className="w-full space-y-1 z-10">
                                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 w-1/3 rounded-full" />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-white/70 font-mono">
                                    <span>04:12</span>
                                    <span>{selectedLecture.duration}</span>
                                </div>
                            </div>
                        </div>

                        {/* Lecture Information */}
                        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">
                                    {selectedLecture.title}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {selectedLecture.description}
                                </p>
                            </div>

                            {/* Key Takeaways */}
                            <div className="space-y-2 pt-3 border-t border-border/50">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                    <span>핵심 요약 포인트</span>
                                </h4>
                                <ul className="space-y-1.5 pl-1">
                                    {selectedLecture.keyPoints.map((pt, idx) => (
                                        <li key={idx} className="text-xs text-foreground/90 flex items-start gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{pt}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Ask AI Director Button */}
                            {onAskInChat && (
                                <div className="pt-3 border-t border-border/50 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => onAskInChat(`[${selectedLecture.title}] 강의에서 배운 내용을 바탕으로 대본과 0초 훅을 작성해 줘.`)}
                                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>강의 내용에 대해 AI 디렉터에게 질문하기</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Course Curriculum (1 Col) */}
                    <div className="space-y-3">
                        <div className="px-1 text-xs font-bold text-foreground">
                            강의 커리큘럼 ({LECTURES.length}강)
                        </div>
                        <div className="space-y-2">
                            {LECTURES.map(lec => {
                                const isSelected = lec.id === selectedLecture.id;
                                return (
                                    <button
                                        key={lec.id}
                                        type="button"
                                        onClick={() => setSelectedLecture(lec)}
                                        className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                            isSelected
                                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs'
                                                : 'border-border/70 bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-foreground">
                                                제 {lec.index}강
                                            </span>
                                            <span className="font-mono text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {lec.duration}
                                            </span>
                                        </div>
                                        <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                                            {lec.title}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
