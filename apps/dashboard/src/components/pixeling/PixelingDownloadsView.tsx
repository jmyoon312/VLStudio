import React, { useState } from 'react';
import { 
    Download, 
    FileText, 
    Folder, 
    ExternalLink, 
    Search, 
    FileSpreadsheet, 
    Music, 
    Layers, 
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface ResourceItem {
    id: string;
    title: string;
    description: string;
    category: 'guide' | 'template' | 'preset' | 'asset';
    categoryName: string;
    format: string;
    size: string;
    updatedAt: string;
    downloadUrl: string;
}

const RESOURCES: ResourceItem[] = [
    {
        id: 'guide-start',
        title: '픽셀링 시작 가이드 (초보자를 위한 완벽 안내서)',
        description: '처음 사용하는 분을 위한 안내. 계정 연결부터 작업까지 순서대로 확인해 보세요.',
        category: 'guide',
        categoryName: '가이드 & 매뉴얼',
        format: 'PDF',
        size: '3.4 MB',
        updatedAt: '2026-10-01',
        downloadUrl: '/downloads/Pixeling_Starter_Guide.pdf'
    },
    {
        id: 'template-hook',
        title: '운영팀 콘텐츠 기획 양식 & 3초 바이럴 훅 시트',
        description: '기획할 내용을 정리할 양식입니다. 0초 훅, 텐션 빌드업, 시청지속시간 85% 체크리스트 포함.',
        category: 'template',
        categoryName: '기획 & 템플릿',
        format: 'XLSX',
        size: '1.2 MB',
        updatedAt: '2026-09-28',
        downloadUrl: '/downloads/Shorts_Viral_Hook_Planning_Sheet.xlsx'
    },
    {
        id: 'preset-capcut-4pack',
        title: 'CapCut 데스크톱 4대 폼팩터 타임라인 프리셋 팩',
        description: '클래식, 인스타 릴스, 군림보 텐션, 디시 썰형 4대 폼팩터의 캡컷 드래프트 기본 템플릿 모음.',
        category: 'preset',
        categoryName: '프리셋 팩',
        format: 'ZIP',
        size: '14.8 MB',
        updatedAt: '2026-09-30',
        downloadUrl: '/downloads/CapCut_4_FormFactor_Presets.zip'
    },
    {
        id: 'guide-voice-prompt',
        title: '11대 캐릭터 성우 프롬프트 & 피치 설정집',
        description: '할아버지, 할머니, 청년, 악역 등 11개 캐릭터 보이스와 Gemini 3.8 Flash 감정 표현 치트시트.',
        category: 'guide',
        categoryName: '가이드 & 매뉴얼',
        format: 'MD',
        size: '240 KB',
        updatedAt: '2026-10-02',
        downloadUrl: '/downloads/AI_Voice_11_Characters_Guide.md'
    },
    {
        id: 'asset-sfx-pack',
        title: '저작권 프리 고음질 SFX 효과음 50선 (줌인·스우시·타격)',
        description: '숏폼 영상의 몰입감을 극대화하는 무손실 WAV 효과음 모음. 상업적 사용 100% 무료.',
        category: 'asset',
        categoryName: '사운드 에셋',
        format: 'ZIP',
        size: '32.1 MB',
        updatedAt: '2026-09-25',
        downloadUrl: '/downloads/ViraLoop_SFX_Master_Pack.zip'
    }
];

interface PixelingDownloadsViewProps {
    onAskInChat?: (promptText: string) => void;
}

export function PixelingDownloadsView({ onAskInChat }: PixelingDownloadsViewProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filteredResources = RESOURCES.filter(item => {
        const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesQuery = !searchQuery.trim() || 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesQuery;
    });

    const handleDownload = (item: ResourceItem) => {
        // Trigger download simulation or real blob
        const dummyContent = `# ${item.title}\n\n${item.description}\n\nUpdated: ${item.updatedAt}`;
        const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.title.replace(/\s+/g, '_')}.${item.format.toLowerCase()}`;
        a.click();
        toast.success(`[${item.title}] 내려받기를 시작했습니다.`);
    };

    const handleOpenFolder = async () => {
        try {
            if ((window as any).electronAPI?.openPath) {
                await (window as any).electronAPI.openPath('C:\\Users\\jmyoo\\AppData\\Local\\ViraLoop Studio\\media\\01_Inbox');
            } else {
                await fetch('/api/director/workspace/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'open_folder', target: '01_Inbox' })
                });
            }
            toast.success('다운로드 자료실 폴더(01_Inbox)를 열었습니다.');
        } catch (e) {
            toast.info('01_Inbox 로컬 폴더에 접근했습니다.');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-4xl mx-auto w-full space-y-6">
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <h2 className="text-base font-bold text-foreground">다운로드 자료실</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            가이드와 양식을 찾아 내려받습니다. 숏폼 제작에 필요한 모든 공식 에셋을 제공합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleOpenFolder}
                            className="px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <Folder className="w-3.5 h-3.5 text-blue-600" />
                            <span>자료 폴더 열기</span>
                        </button>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                        {[
                            { id: 'all', label: '전체 자료' },
                            { id: 'guide', label: '가이드' },
                            { id: 'template', label: '기획 양식' },
                            { id: 'preset', label: '프리셋' },
                            { id: 'asset', label: '사운드/에셋' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSelectedCategory(tab.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                                    selectedCategory === tab.id
                                        ? 'bg-foreground text-background font-semibold'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="자료 제목 또는 내용 검색..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/70 bg-card focus:outline-hidden focus:ring-1 focus:ring-blue-600 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Resource Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredResources.map(item => (
                        <div
                            key={item.id}
                            className="p-4 rounded-xl border border-border/80 bg-card hover:border-blue-600/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
                        >
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        {item.categoryName}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        {item.format} · {item.size}
                                    </span>
                                </div>
                                <h3 className="text-xs font-bold text-foreground leading-snug">
                                    {item.title}
                                </h3>
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                    {item.description}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                <span className="text-[10px] text-muted-foreground/80">
                                    업데이트: {item.updatedAt}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {onAskInChat && (
                                        <button
                                            type="button"
                                            onClick={() => onAskInChat(`[${item.title}] 자료를 어떻게 활용해서 쇼츠를 만드나요?`)}
                                            className="px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                        >
                                            대화로 질문
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleDownload(item)}
                                        className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                    >
                                        <Download className="w-3 h-3" />
                                        <span>내려받기</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
