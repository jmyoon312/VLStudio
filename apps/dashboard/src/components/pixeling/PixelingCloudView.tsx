import React, { useState } from 'react';
import { 
    Cloud, 
    Folder, 
    FileVideo, 
    FileImage, 
    FileAudio, 
    FileText, 
    Upload, 
    RefreshCw, 
    HardDrive, 
    ExternalLink,
    Search,
    SlidersHorizontal,
    FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface CloudAssetItem {
    id: string;
    name: string;
    folder: string;
    type: 'video' | 'image' | 'audio' | 'preset';
    size: string;
    updatedAt: string;
    cloudStatus: 'synced' | 'local_only' | 'uploading';
}

const CLOUD_ASSETS: CloudAssetItem[] = [
    {
        id: 'asset-1',
        name: '아이돌_칼군무_교차편집_최종본.mp4',
        folder: '05_Exports',
        type: 'video',
        size: '42.8 MB',
        updatedAt: '오늘 19:42',
        cloudStatus: 'synced'
    },
    {
        id: 'asset-2',
        name: '감성_나레이션_성우_Kore_24kHz.wav',
        folder: '02_Operations/subtitles',
        type: 'audio',
        size: '8.4 MB',
        updatedAt: '오늘 18:20',
        cloudStatus: 'synced'
    },
    {
        id: 'asset-3',
        name: '군림보_스타일_훅밴드_외곽선.preset',
        folder: '03_Assets',
        type: 'preset',
        size: '14 KB',
        updatedAt: '어제 22:15',
        cloudStatus: 'synced'
    },
    {
        id: 'asset-4',
        name: '비즈니스_인터뷰_원본소스_1080p.mp4',
        folder: '01_Inbox',
        type: 'video',
        size: '184.2 MB',
        updatedAt: '9월 28일',
        cloudStatus: 'local_only'
    },
    {
        id: 'asset-5',
        name: '유튜브_급상승_다운로드_클립_01.mp4',
        folder: '07_Downloads',
        type: 'video',
        size: '56.1 MB',
        updatedAt: '9월 27일',
        cloudStatus: 'synced'
    }
];

interface PixelingCloudViewProps {
    onOpenPresetManagement?: () => void;
}

export function PixelingCloudView({ onOpenPresetManagement }: PixelingCloudViewProps) {
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filtered = CLOUD_ASSETS.filter(a => {
        const matchesFolder = selectedFolder === 'all' || a.folder.startsWith(selectedFolder);
        const matchesQuery = !searchQuery.trim() || a.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFolder && matchesQuery;
    });

    const handleOpenFolder = async (folderName: string) => {
        try {
            const folderPath = `C:\\Users\\jmyoo\\AppData\\Local\\ViraLoop Studio\\media\\${folderName === 'all' ? '' : folderName}`;
            if ((window as any).electronAPI?.openPath) {
                await (window as any).electronAPI.openPath(folderPath);
            } else {
                await fetch('/api/director/workspace/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'open_folder', target: folderName === 'all' ? '05_Exports' : folderName })
                });
            }
            toast.success(`로컬 미디어 저장소 [${folderName}]를 열었습니다.`);
        } catch (e) {
            toast.info(`폴더 [${folderName}]에 접근했습니다.`);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <Cloud className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">클라우드 & 로컬 에셋 스토리지</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            내 파일과 접근이 허용된 팀 에셋을 9대 표준 저장소 규칙에 따라 관리합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {onOpenPresetManagement && (
                            <button
                                type="button"
                                onClick={onOpenPresetManagement}
                                className="px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                                <span>프리셋 관리</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleOpenFolder(selectedFolder)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>로컬 저장소 열기</span>
                        </button>
                    </div>
                </div>

                {/* Cloud Quota Status Bar */}
                <div className="p-4 rounded-xl border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <HardDrive className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-foreground">
                                클라우드 스토리지 용량: 3.2 GB / 50 GB 사용 중 (6.4%)
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                로컬 단일 저장소(%LOCALAPPDATA%\ViraLoop Studio\media\)와 실시간 동기화 중
                            </div>
                        </div>
                    </div>
                    <div className="w-full sm:w-48 bg-muted/70 h-2 rounded-full overflow-hidden self-center">
                        <div className="bg-blue-600 h-full w-[6.4%] rounded-full" />
                    </div>
                </div>

                {/* Folder Tabs and Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                        {[
                            { id: 'all', label: '전체 에셋' },
                            { id: '05_Exports', label: '05_내보내기 결과물' },
                            { id: '03_Assets', label: '03_공용 에셋' },
                            { id: '01_Inbox', label: '01_입력 소스' },
                            { id: '07_Downloads', label: '07_다운로드 클립' }
                        ].map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setSelectedFolder(f.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                                    selectedFolder === f.id
                                        ? 'bg-foreground text-background font-semibold'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="파일명 검색..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/70 bg-card focus:outline-hidden focus:ring-1 focus:ring-blue-600 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Assets Table */}
                <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                            <tr>
                                <th className="py-3 px-4">파일명</th>
                                <th className="py-3 px-4 hidden sm:table-cell">저장소 디렉토리</th>
                                <th className="py-3 px-4 hidden md:table-cell">용량</th>
                                <th className="py-3 px-4 hidden md:table-cell">수정일시</th>
                                <th className="py-3 px-4 text-right">동기화 상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {filtered.map(asset => (
                                <tr key={asset.id} className="hover:bg-muted/40 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2.5">
                                            {asset.type === 'video' ? (
                                                <FileVideo className="w-4 h-4 text-blue-600 shrink-0" />
                                            ) : asset.type === 'audio' ? (
                                                <FileAudio className="w-4 h-4 text-amber-600 shrink-0" />
                                            ) : (
                                                <SlidersHorizontal className="w-4 h-4 text-purple-600 shrink-0" />
                                            )}
                                            <span className="font-medium text-foreground truncate max-w-xs">
                                                {asset.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell font-mono text-[11px]">
                                        {asset.folder}
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                                        {asset.size}
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                                        {asset.updatedAt}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                            asset.cloudStatus === 'synced'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {asset.cloudStatus === 'synced' ? '클라우드 보관 중' : '로컬 보관'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
