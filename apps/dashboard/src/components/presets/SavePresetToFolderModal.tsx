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

const PRESET_FOLDERS = [
    { id: 'user', name: '내 커스텀 프리셋', tab: 'user', desc: '개인 커스텀 전용 기본 보관함' },
    { id: 'interview', name: '인터뷰 / 해외 토크쇼', tab: 'user', desc: '올뉴띵킹, 토크쇼, 육성 직타형' },
    { id: 'entertainment', name: '연예 / K-POP 정보', tab: 'user', desc: '패션탐정냥, 아이돌, 연예 비하인드' },
    { id: 'ranking', name: '랭킹 / 팩트 체크', tab: 'user', desc: 'TOP 5, 미스터리, 사건 브리핑' },
    { id: 'knowledge', name: '지식 / 교양 / 비하인드', tab: 'user', desc: '역사, 과학, 심층 해설 스토리' },
    { id: 'ssul', name: '커뮤니티 / 썰형 스토리', tab: 'user', desc: '썰형 누적 자막, 네이트판, 유머' },
    { id: 'favorites', name: '즐겨찾기 보관함', tab: 'favorites', desc: '빠른 제작을 위한 최우선 픽' }
];

export const SavePresetToFolderModal: React.FC<SavePresetToFolderModalProps> = ({
    open,
    onOpenChange,
    benchmarkId,
    defaultName = '시그니처 프리셋',
    onSaved
}) => {
    const [presetName, setPresetName] = useState(defaultName);
    const [selectedFolder, setSelectedFolder] = useState('interview');
    const [saving, setSaving] = useState(false);

    // Keep default name in sync when prop changes
    React.useEffect(() => {
        if (defaultName) {
            setPresetName(defaultName);
        }
    }, [defaultName, open]);

    const handleSave = async () => {
        if (!presetName.trim()) {
            toast.error('프리셋 이름을 입력해 주세요.');
            return;
        }

        const targetFolder = PRESET_FOLDERS.find(f => f.id === selectedFolder) || PRESET_FOLDERS[0];

        setSaving(true);
        try {
            if (benchmarkId) {
                const res = await fetch(`/api/channel-dna/benchmarks/${benchmarkId}/export-to-preset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        preset_name: presetName.trim(),
                        category: targetFolder.id,
                        category_tab: targetFolder.tab
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    toast.success(`'${presetName}' 프리셋이 [${targetFolder.name}] 폴더에 성공적으로 저장되었습니다.`);
                    if (data.data) {
                        onSaved?.(data.data);
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
            <DialogContent className="max-w-lg p-6 bg-card border-border/80 text-foreground shadow-2xl rounded-2xl flex flex-col max-h-[85vh]">
                <DialogHeader className="space-y-1.5 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <BookmarkPlus className="w-4 h-4" />
                        </div>
                        <DialogTitle className="text-lg font-bold">
                            프리셋 보관함 저장 위치 선택
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        발골된 채널 스타일을 원하는 폴더(카테고리)에 저장하여 대화창이나 작업실에서 언제든 재사용할 수 있습니다.
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
                            placeholder="예: 올뉴띵킹 해외 인터뷰 시그니처"
                            className="h-9 text-xs bg-background/80 border-border"
                        />
                    </div>

                    {/* Folder Selection Grid */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>저장할 보관함 폴더 선택</span>
                            <span className="text-[11px] font-normal text-muted-foreground">원하는 분류를 탭하세요</span>
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {PRESET_FOLDERS.map((folder) => {
                                const isSelected = selectedFolder === folder.id;
                                return (
                                    <button
                                        key={folder.id}
                                        type="button"
                                        onClick={() => setSelectedFolder(folder.id)}
                                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                            isSelected
                                                ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-xs'
                                                : 'bg-card/70 border-border/70 hover:border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                {isSelected ? (
                                                    <FolderCheck className="w-4 h-4 text-primary shrink-0" />
                                                ) : (
                                                    <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                                                )}
                                                {folder.name}
                                            </span>
                                            {isSelected && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                            )}
                                        </div>
                                        <span className="text-[10.5px] text-muted-foreground/80 mt-1 line-clamp-1">
                                            {folder.desc}
                                        </span>
                                    </button>
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
                        className="text-xs h-8 px-4 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
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
