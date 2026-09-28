import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export interface ChatAutoContinueConfig {
    enabled: boolean;
    deletePreviousThread: boolean;
}

interface ChatAutoContinueModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentConfig?: ChatAutoContinueConfig | null;
    onSaveConfig: (config: ChatAutoContinueConfig) => void;
}

export const ChatAutoContinueModal: React.FC<ChatAutoContinueModalProps> = ({
    open,
    onOpenChange,
    currentConfig,
    onSaveConfig,
}) => {
    const [enabled, setEnabled] = useState<boolean>(currentConfig?.enabled ?? true);
    const [deletePreviousThread, setDeletePreviousThread] = useState<boolean>(currentConfig?.deletePreviousThread ?? false);

    const handleSave = () => {
        onSaveConfig({
            enabled,
            deletePreviousThread,
        });
        toast.success(enabled ? '자동 이어가기 설정이 적용되었습니다.' : '자동 이어가기가 해제되었습니다.');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[440px] p-6 rounded-3xl bg-background border border-border shadow-2xl">
                <DialogHeader className="space-y-1.5 pb-1">
                    <DialogTitle className="text-xl font-bold text-foreground">
                        자동 이어가기
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-normal">
                        이 채팅의 제작 기준과 예약을 새 채팅으로 이어갑니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                    {/* 상단 설명 문구 */}
                    <p className="text-xs text-muted-foreground/90 leading-relaxed">
                        대화가 3회 압축되면 진행 중인 작업이 끝난 뒤 새 채팅을 만들어요. 프리셋과 채팅의 제작 설정, 연결된 예약을 옮기고 복원 여부를 확인합니다. 전체 대화 내용을 그대로 복사하는 기능은 아니에요. 앱이 실행 중이어야 작동합니다.
                    </p>

                    {/* 메인 체크박스: 자동으로 새 채팅에서 이어가기 */}
                    <div className="flex items-center space-x-2.5 pt-1">
                        <Checkbox
                            id="auto-continue-enabled"
                            checked={enabled}
                            onCheckedChange={(checked) => setEnabled(Boolean(checked))}
                            className="w-5 h-5 rounded-md border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                        />
                        <label
                            htmlFor="auto-continue-enabled"
                            className="text-xs font-semibold text-foreground cursor-pointer select-none"
                        >
                            자동으로 새 채팅에서 이어가기
                        </label>
                    </div>

                    {/* 하위 카드: 이동 후 이전 채팅 삭제 */}
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2 select-none">
                        <div className="flex items-center space-x-2.5">
                            <Checkbox
                                id="delete-previous-thread"
                                checked={deletePreviousThread}
                                onCheckedChange={(checked) => setDeletePreviousThread(Boolean(checked))}
                                disabled={!enabled}
                                className="w-4 h-4 rounded-md border-border/80"
                            />
                            <label
                                htmlFor="delete-previous-thread"
                                className={`text-xs font-medium cursor-pointer ${
                                    enabled ? 'text-foreground' : 'text-muted-foreground cursor-not-allowed'
                                }`}
                            >
                                이동 후 이전 채팅 삭제
                            </label>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-6.5">
                            선택하지 않으면 이전 채팅을 그대로 남겨요. 선택하면 새 채팅 복원 확인 후 이전 채팅 기록을 삭제하며, 앱에서 복원할 수 없어요. 제작 파일과 저장된 프리셋은 삭제하지 않아요. 이 선택은 이후 자동 이동에도 적용돼요.
                        </p>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex items-center justify-end gap-2.5 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-9 px-4 rounded-xl text-xs font-medium border-border/80 hover:bg-muted text-foreground cursor-pointer"
                    >
                        취소
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        className="h-9 px-5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                    >
                        설정 저장
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
