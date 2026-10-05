import React from 'react';
import { 
    SlidersHorizontal, 
    Layers, 
    Palette, 
    Type, 
    Film, 
    Plus, 
    Sparkles, 
    ArrowUpRight,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface PresetCardItem {
    id: string;
    formFactor: 'classic' | 'insta' | 'gunlimbo' | 'ssul';
    name: string;
    description: string;
    fontFamily: string;
    fontOutline: string;
    hookStyle: string;
    aspectRatio: string;
    isDefault?: boolean;
}

const PRESETS: PresetCardItem[] = [
    {
        id: 'preset-classic',
        formFactor: 'classic',
        name: '클래식 쇼츠 프리셋 (표준 9:16)',
        description: '유튜브 쇼츠 표준 가독성 중심. 정갈한 2줄 중앙 자막과 깔끔한 그림자 효과.',
        fontFamily: 'Pretendard Bold',
        fontOutline: '검정 2px 외곽선 + 은은한 그림자',
        hookStyle: '상단 30% 중앙 훅 텍스트',
        aspectRatio: '9:16 (1080 x 1920)',
        isDefault: true
    },
    {
        id: 'preset-insta',
        formFactor: 'insta',
        name: '인스타그램 감성 릴스 프리셋',
        description: '상단 프로필 바 + 하단 베스트 댓글 슬롯 연동. 감성적이고 세련된 명조/고딕 타이포.',
        fontFamily: 'Noto Serif KR & Noto Sans',
        fontOutline: '소프트 블러 그림자',
        hookStyle: '감성 프로필 배지 + 화두형 타이틀',
        aspectRatio: '9:16 (1080 x 1920)'
    },
    {
        id: 'preset-gunlimbo',
        formFactor: 'gunlimbo',
        name: '군림보 텐션 쇼츠 프리셋',
        description: '상하단 옐로우/블랙 훅 밴드 + 0초 빠른 줌인 애니메이션. 시청 지속시간 85% 게이트키퍼.',
        fontFamily: 'GmarketSans Bold',
        fontOutline: '진한 검정 4px 외곽선 (스트로크)',
        hookStyle: '상단 볼드 훅 밴드 고정 + 0초 줌인',
        aspectRatio: '9:16 (1080 x 1920)'
    },
    {
        id: 'preset-ssul',
        formFactor: 'ssul',
        name: '디시/에펨 썰형 쇼츠 프리셋',
        description: '상단 웹 커뮤니티 헤더바 + 작성자 메타데이터 + 자막 순차 누적 모드 + 페페 밈 슬롯.',
        fontFamily: 'NanumSquareRound Bold',
        fontOutline: '배경 불투명 박스 하이라이트',
        hookStyle: '커뮤니티 UI 헤더바 + 누적 자막',
        aspectRatio: '9:16 (1080 x 1920)'
    }
];

interface PixelingPresetsViewProps {
    onOpenInBasicEditor?: (presetId: string) => void;
}

export function PixelingPresetsView({ onOpenInBasicEditor }: PixelingPresetsViewProps) {
    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">쇼츠 스타일 프리셋 관리</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            채널 규격과 4대 폼팩터 제작 방식을 프리셋으로 저장하여 반복 영상 제작에 재사용합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (onOpenInBasicEditor) onOpenInBasicEditor('new');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>새 껍데기 프리셋 만들기</span>
                        </button>
                    </div>
                </div>

                {/* 4 Form Factor Preset Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PRESETS.map(p => (
                        <div
                            key={p.id}
                            className="p-5 rounded-2xl border border-border/80 bg-card hover:border-blue-600/40 transition-all flex flex-col justify-between gap-4 shadow-xs"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-foreground">
                                            {p.name}
                                        </h3>
                                        {p.isDefault && (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                기본 프리셋
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                        {p.aspectRatio}
                                    </span>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {p.description}
                                </p>

                                <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Type className="w-3.5 h-3.5" />
                                            기본 서체:
                                        </span>
                                        <span className="font-semibold text-foreground font-mono">
                                            {p.fontFamily}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Palette className="w-3.5 h-3.5" />
                                            자막 외곽선/스타일:
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {p.fontOutline}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            훅 밴드 모드:
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {p.hookStyle}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-border/40 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onOpenInBasicEditor) onOpenInBasicEditor(p.id);
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                                    <span>기본 에디터에서 디자인 수정</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
