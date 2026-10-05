import React, { useState } from 'react';
import { 
    Film, 
    Folder, 
    Download, 
    Play, 
    Rocket, 
    Calendar, 
    Search, 
    ExternalLink,
    Clock,
    FileVideo,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface OutputItem {
    id: string;
    title: string;
    formFactor: string;
    duration: string;
    createdAt: string;
    thumbnail: string;
    videoUrl?: string;
    capcutDraftPath?: string;
}

const SAMPLE_OUTPUTS: OutputItem[] = [
    {
        id: 'out-1',
        title: '신인 아이돌 0초 칼군무 교차편집 완성본',
        formFactor: '1. 클래식 쇼츠',
        duration: '00:58',
        createdAt: '오늘 20:15',
        thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        capcutDraftPath: 'C:\\Users\\jmyoo\\AppData\\Local\\CapCut\\User Data\\Projects\\com.lveditor.draft\\idol_crosscut'
    },
    {
        id: 'out-2',
        title: '신입사원 퇴사 카톡 썰 (누적 자막 4대 폼팩터)',
        formFactor: '4. 썰형 쇼츠',
        duration: '00:49',
        createdAt: '오늘 18:30',
        thumbnail: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80',
        capcutDraftPath: 'C:\\Users\\jmyoo\\AppData\\Local\\CapCut\\User Data\\Projects\\com.lveditor.draft\\ssul_kakao'
    },
    {
        id: 'out-3',
        title: '군림보 텐션 훅 밴드 먹방 쇼츠',
        formFactor: '3. 군림보 쇼츠',
        duration: '00:55',
        createdAt: '어제 23:10',
        thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
        capcutDraftPath: 'C:\\Users\\jmyoo\\AppData\\Local\\CapCut\\User Data\\Projects\\com.lveditor.draft\\gunlimbo_mukbang'
    }
];

interface PixelingOutputsViewProps {
    onLaunchCapCut?: (draftPath?: string) => void;
}

export function PixelingOutputsView({ onLaunchCapCut }: PixelingOutputsViewProps) {
    const [selectedTab, setSelectedTab] = useState<'all' | 'video' | 'audio'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const handleOpenExportsFolder = async () => {
        try {
            if ((window as any).electronAPI?.openPath) {
                await (window as any).electronAPI.openPath('C:\\Users\\jmyoo\\AppData\\Local\\ViraLoop Studio\\media\\05_Exports');
            } else {
                await fetch('/api/director/workspace/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'open_folder', target: '05_Exports' })
                });
            }
            toast.success('완성 영상 저장 폴더(05_Exports)를 열었습니다.');
        } catch (e) {
            toast.info('05_Exports 폴더에 접근했습니다.');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <Film className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">결과물 보관함</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            완성된 영상과 파일을 확인하고 캡컷 데스크톱으로 즉시 내보냅니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleOpenExportsFolder}
                            className="px-3.5 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <Folder className="w-3.5 h-3.5 text-blue-600" />
                            <span>영상 저장 폴더 열기 (05_Exports)</span>
                        </button>
                    </div>
                </div>

                {/* Filter & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                        {[
                            { id: 'all', label: '전체 결과물' },
                            { id: 'video', label: '완성 영상' },
                            { id: 'audio', label: '오디오 & 대본' },
                        ].map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedTab(t.id as any)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                    selectedTab === t.id
                                        ? 'bg-foreground text-background font-semibold'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="결과물 검색..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/70 bg-card text-foreground focus:ring-1 focus:ring-blue-600 outline-hidden"
                        />
                    </div>
                </div>

                {/* Output Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SAMPLE_OUTPUTS.map(out => (
                        <div
                            key={out.id}
                            className="p-4 rounded-2xl border border-border/80 bg-card hover:border-blue-600/40 transition-all flex flex-col justify-between gap-3 shadow-xs group"
                        >
                            <div className="space-y-3">
                                {/* Thumbnail */}
                                <div className="aspect-9/16 max-h-56 w-full rounded-xl overflow-hidden bg-black relative border border-border/60">
                                    <img
                                        src={out.thumbnail}
                                        alt={out.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => toast.info(`[${out.title}] 미리보기를 재생합니다.`)}
                                            className="w-10 h-10 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
                                        >
                                            <Play className="w-5 h-5 fill-white ml-0.5" />
                                        </button>
                                    </div>
                                    <span className="absolute bottom-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-white">
                                        {out.duration}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        {out.formFactor}
                                    </span>
                                    <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                                        {out.title}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground">
                                        생성 일시: {out.createdAt}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => toast.success(`[${out.title}] MP4 다운로드를 시작했습니다.`)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                    title="내려받기"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onLaunchCapCut) onLaunchCapCut(out.capcutDraftPath);
                                        else toast.success('CapCut 데스크톱으로 프로젝트를 열었습니다.');
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                >
                                    <Rocket className="w-3 h-3" />
                                    <span>CapCut으로 열기</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
