import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, BookmarkPlus, Sparkles, Layers, Sliders } from 'lucide-react';
import { toast } from 'sonner';

interface SavePresetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deliverable: {
        title?: string;
        video_path?: string;
        style?: any;
        recipe?: string;
        content_rules?: string[];
    } | null;
    onSuccess?: () => void;
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
    open,
    onOpenChange,
    deliverable,
    onSuccess
}) => {
    const [name, setName] = useState(deliverable?.title || '');
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('프리셋 이름을 입력해 주세요.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/sovereign-presets/save-from-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    category: 'custom',
                    recipe: deliverable?.recipe || '대화형 디렉터에서 생성된 연출 레시피',
                    content_rules: deliverable?.content_rules || ['자막 가독성 확보', '마이크로초 동기화'],
                    style: deliverable?.style || {},
                    source_video_path: deliverable?.video_path
                })
            });

            if (res.ok) {
                toast.success(`'${name}' 프리셋이 성공적으로 저장되었습니다!`);
                onOpenChange(false);
                onSuccess?.();
            } else {
                const err = await res.json();
                toast.error(err.detail || '프리셋 저장 실패');
            }
        } catch (e) {
            toast.error('프리셋 저장 중 통신 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg bg-card border-border/80 text-card-foreground shadow-xs">
                <DialogHeader className="pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        <BookmarkPlus className="w-5 h-5 text-primary" />
                        <DialogTitle className="text-lg font-bold">프리셋으로 저장 (Save as Preset)</DialogTitle>
                    </div>
                    <DialogDescription className="text-muted-foreground text-xs">
                        방금 제작된 영상의 자막 디자인, 줌 효과, 연출 지침을 내 프리셋으로 영구 등록합니다.
                    </DialogDescription>
                </DialogHeader>

                {/* 3-Step Indicator matching Pixeling */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-muted/60 rounded-lg border border-border/60 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-primary">
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
                        <span>영상 검증</span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex items-center gap-1.5 font-medium text-primary">
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
                        <span>연출 지침 확인</span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <span className="w-4 h-4 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[10px]">3</span>
                        <span>이름 확정</span>
                    </div>
                </div>

                <div className="space-y-3.5 py-2">
                    <div>
                        <Label className="text-xs font-semibold text-foreground mb-1 block">프리셋 이름</Label>
                        <Input
                            placeholder="예: 2026 유퀴즈 인터뷰 스타일"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-9 text-xs bg-background border-border/80"
                        />
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>자막 크기</span>
                            <span className="font-semibold text-foreground">{deliverable?.style?.caption?.size_px || 64}px</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>출력 규격</span>
                            <span className="font-semibold text-foreground">{deliverable?.style?.output?.size || '1080x1920'}</span>
                        </div>
                        {deliverable?.content_rules && deliverable.content_rules.length > 0 && (
                            <div className="pt-2 border-t border-border/40">
                                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">포함된 연출 규칙:</span>
                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
                                    {deliverable.content_rules.map((rule, idx) => (
                                        <li key={idx} className="truncate">{rule}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="h-8 text-xs border-border/80"
                    >
                        취소
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground"
                    >
                        {saving ? '저장 중...' : '프리셋 저장 완료'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
