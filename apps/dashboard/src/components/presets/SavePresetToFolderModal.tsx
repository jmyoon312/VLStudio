import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Folder, FolderCheck, BookmarkPlus, Sliders, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SovereignPreset } from './PresetLibraryModal';

export interface SavePresetToFolderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    benchmarkId?: number | null;
    defaultName?: string;
    onSaved?: (preset: SovereignPreset) => void;
}

export interface PresetFolderItem {
    id: string;
    name: string;
    tab?: string;
    icon?: string;
    desc?: string;
}

export const DEFAULT_PRESET_FOLDERS: PresetFolderItem[] = [
    { id: 'interview', name: '인터뷰 / 해외 토크쇼', tab: 'user', icon: '🎙️', desc: '올뉴띵킹, 토크쇼, 육성 직타형' },
    { id: 'entertainment', name: '연예 / K-POP 정보', tab: 'user', icon: '🎬', desc: '패션탐정냥, 아이돌, 연예 비하인드' },
    { id: 'ranking', name: '랭킹 / 팩트 체크', tab: 'user', icon: '📊', desc: 'TOP 5, 미스터리, 사건 브리핑' },
    { id: 'knowledge', name: '지식 / 교양 / 비하인드', tab: 'user', icon: '💡', desc: '역사, 과학, 심층 해설 스토리' },
    { id: 'ssul', name: '커뮤니티 / 썰형 스토리', tab: 'user', icon: '💬', desc: '썰형 누적 자막, 네이트판, 유머' },
    { id: 'user', name: '내 커스텀 프리셋', tab: 'user', icon: '📁', desc: '개인 커스텀 전용 기본 보관함' },
    { id: 'favorites', name: '즐겨찾기 보관함', tab: 'favorites', icon: '⭐', desc: '빠른 제작을 위한 최우선 픽' }
];

export const SavePresetToFolderModal: React.FC<SavePresetToFolderModalProps> = ({
    open,
    onOpenChange,
    benchmarkId,
    defaultName = '시그니처 프리셋',
    onSaved
}) => {
    const [presetName, setPresetName] = useState(defaultName);
    const [folders, setFolders] = useState<PresetFolderItem[]>(DEFAULT_PRESET_FOLDERS);
    const [selectedFolder, setSelectedFolder] = useState('entertainment');
    const [saving, setSaving] = useState(false);

    // New folder creation state
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderDesc, setNewFolderDesc] = useState('');

    // Editing folder state
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');

    const fetchFolders = async () => {
        try {
            const res = await fetch('/api/sovereign-presets/folders');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setFolders(data);
                }
            }
        } catch (e) {
            console.debug('Failed to fetch folders:', e);
        }
    };

    React.useEffect(() => {
        if (open) {
            fetchFolders();
            if (defaultName) setPresetName(defaultName);
        }
    }, [open, defaultName]);

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = newFolderName.trim();
        if (!clean) {
            toast.error('보관함 이름을 입력해 주세요.');
            return;
        }

        try {
            const res = await fetch('/api/sovereign-presets/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: clean,
                    desc: newFolderDesc.trim() || `${clean} 보관함`,
                    icon: '📁'
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`새 보관함 [${clean}]이(가) 추가되었습니다.`);
                setFolders(data.folders || [...folders, data.folder]);
                setSelectedFolder(data.folder.id);
                setIsCreatingFolder(false);
                setNewFolderName('');
                setNewFolderDesc('');
                window.dispatchEvent(new CustomEvent('presets-folders-updated'));
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || '보관함 생성 실패');
            }
        } catch {
            toast.error('보관함 생성 통신 오류');
        }
    };

    const handleUpdateFolderName = async (folderId: string) => {
        const clean = editingFolderName.trim();
        if (!clean) return;

        try {
            const res = await fetch(`/api/sovereign-presets/folders/${folderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: clean })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('보관함 이름이 변경되었습니다.');
                setFolders(data.folders || folders.map(f => f.id === folderId ? { ...f, name: clean } : f));
                setEditingFolderId(null);
                window.dispatchEvent(new CustomEvent('presets-folders-updated'));
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || '이름 변경 실패');
            }
        } catch {
            toast.error('이름 변경 통신 오류');
        }
    };

    const handleDeleteFolder = async (folderId: string, folderName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (folderId === 'user' || folderId === 'favorites') {
            toast.error('기본 보관함은 삭제할 수 없습니다.');
            return;
        }
        if (!window.confirm(`'${folderName}' 보관함을 삭제하시겠습니까?\n(해당 보관함의 프리셋들은 '내 커스텀 프리셋'으로 안전하게 이동됩니다)`)) {
            return;
        }

        try {
            const res = await fetch(`/api/sovereign-presets/folders/${folderId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`[${folderName}] 보관함이 삭제되었습니다.`);
                setFolders(data.folders || folders.filter(f => f.id !== folderId));
                if (selectedFolder === folderId) {
                    setSelectedFolder('user');
                }
                window.dispatchEvent(new CustomEvent('presets-folders-updated'));
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || '보관함 삭제 실패');
            }
        } catch {
            toast.error('보관함 삭제 통신 오류');
        }
    };

    const handleSave = async () => {
        if (!presetName.trim()) {
            toast.error('프리셋 이름을 입력해 주세요.');
            return;
        }

        const targetFolder = folders.find(f => f.id === selectedFolder) || folders[0];

        setSaving(true);
        try {
            if (benchmarkId) {
                const res = await fetch(`/api/channel-dna/benchmarks/${benchmarkId}/export-to-preset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        preset_name: presetName.trim(),
                        category: targetFolder.id,
                        category_tab: targetFolder.tab || 'user'
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    toast.success(`'${presetName}' 프리셋이 [${targetFolder.name}] 폴더에 성공적으로 저장되었습니다.`);
                    if (data.data) {
                        const savedObj = {
                            ...data.data,
                            id: data.data.id || data.data.preset_id,
                            style: data.data.style || data.data.blueprint
                        };
                        onSaved?.(savedObj);
                    }
                    onOpenChange(false);
                } else {
                    const err = await res.json();
                    toast.error(err.detail || '프리셋 저장 실패');
                }
            } else {
                toast.error('분석된 채널 벤치마크 데이터가 없습니다.');
            }
        } catch (e) {
            toast.error('프리셋 저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-6 bg-card border-border/80 text-foreground shadow-2xl rounded-2xl flex flex-col max-h-[88vh]">
                <DialogHeader className="space-y-1.5 pb-3 border-b border-border/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <BookmarkPlus className="w-4 h-4" />
                            </div>
                            <DialogTitle className="text-lg font-bold">
                                프리셋 보관함 저장 위치 선택
                            </DialogTitle>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                            className="h-7 text-xs gap-1 border-border/70 hover:bg-muted font-semibold"
                        >
                            <span>➕ 새 보관함 추가</span>
                        </Button>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        발골된 채널 스타일을 원하는 보관함 폴더에 저장합니다. 보관함 이름은 언제든지 추가, 수정, 삭제할 수 있습니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3 flex-1 overflow-y-auto pr-1">
                    {/* Preset Name Input */}
                    <div className="space-y-1.5">
                        <Label htmlFor="preset-name" className="text-xs font-semibold text-foreground">
                            프리셋 이름
                        </Label>
                        <Input
                            id="preset-name"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder="예: 패션탐정냥 시그니처"
                            className="h-9 text-xs bg-background/80 border-border font-bold text-foreground"
                        />
                    </div>

                    {/* New Folder Inline Form */}
                    {isCreatingFolder && (
                        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-2 animate-in fade-in duration-200">
                            <span className="text-xs font-bold text-primary block">새 보관함 만들기</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="보관함 이름 (예: 게임 하이라이트)"
                                    className="h-8 text-xs bg-background border-border"
                                />
                                <Input
                                    value={newFolderDesc}
                                    onChange={(e) => setNewFolderDesc(e.target.value)}
                                    placeholder="간단한 설명 (선택사항)"
                                    className="h-8 text-xs bg-background border-border"
                                />
                            </div>
                            <div className="flex justify-end gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsCreatingFolder(false)}
                                    className="h-7 text-xs"
                                >
                                    취소
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleCreateFolder}
                                    className="h-7 text-xs font-bold bg-primary text-primary-foreground"
                                >
                                    추가하기
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Folder Selection Grid */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>저장할 보관함 폴더 선택</span>
                            <span className="text-[11px] font-normal text-muted-foreground">보관함 이름 수정 및 삭제 가능</span>
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {folders.map((folder) => {
                                const isSelected = selectedFolder === folder.id;
                                const isEditing = editingFolderId === folder.id;

                                return (
                                    <div
                                        key={folder.id}
                                        onClick={() => !isEditing && setSelectedFolder(folder.id)}
                                        className={`group relative p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                            isSelected
                                                ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-xs'
                                                : 'bg-card/70 border-border/70 hover:border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        value={editingFolderName}
                                                        onChange={(e) => setEditingFolderName(e.target.value)}
                                                        className="h-7 text-xs bg-background border-primary"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleUpdateFolderName(folder.id);
                                                            if (e.key === 'Escape') setEditingFolderId(null);
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateFolderName(folder.id)}
                                                        className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
                                                    >
                                                        저장
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                                                        <span>{folder.icon || '📁'}</span>
                                                        <span className="truncate">{folder.name}</span>
                                                    </span>

                                                    <div className="flex items-center gap-1">
                                                        {isSelected && (
                                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                                        )}

                                                        {/* Action Icons (Rename & Delete on Hover) */}
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingFolderId(folder.id);
                                                                    setEditingFolderName(folder.name);
                                                                }}
                                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                                title="보관함 이름 수정"
                                                            >
                                                                ✏️
                                                            </button>
                                                            {folder.id !== 'user' && folder.id !== 'favorites' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                                                                    className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500"
                                                                    title="보관함 삭제"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {!isEditing && (
                                            <span className="text-[10.5px] text-muted-foreground/80 mt-1 line-clamp-1">
                                                {folder.desc}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                        className="text-xs h-8 px-3 border-border hover:bg-muted"
                    >
                        취소
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !presetName.trim()}
                        className="text-xs h-8 px-4 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
                    >
                        {saving ? (
                            <span>저장 중...</span>
                        ) : (
                            <>
                                <BookmarkPlus className="w-3.5 h-3.5" />
                                <span>선택한 폴더에 저장 완료</span>
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
