import React from 'react';
import { MeokguriSettings, MeokguriScript, MeokguriTonePresetId } from './types';
import {
  Sparkles,
  Volume2,
  Maximize2,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MeokguriRunConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tonePreset: MeokguriTonePresetId;
  settings: MeokguriSettings;
  script: MeokguriScript;
  isRendering: boolean;
}

export const MeokguriRunConfirmModal: React.FC<MeokguriRunConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tonePreset,
  settings,
  script,
  isRendering
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        data-pixi-meokguri-run-confirmation
        className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl bg-card border-border"
      >
        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <DialogTitle className="text-sm font-bold text-foreground">
              먹구리형 쇼츠 생성 및 렌더링 확인
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            받게 될 완성본과 적용된 설정을 확인한 뒤 시작하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs">
          {/* 대본 및 제목 요약 */}
          <div className="p-3.5 rounded-xl bg-background border border-border/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-xs line-clamp-1">
                {script.hookTitle || '먹구리 ASMR 쇼츠'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono bg-primary/10 text-primary border-primary/20">
                {tonePreset} 톤
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg leading-relaxed">
              "{script.hookOpening}"
            </p>
          </div>

          {/* 주요 엔지니어링 파라미터 4종 그리드 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <Volume2 className="w-3.5 h-3.5 text-primary" />
                <span>ASMR 게인 증폭</span>
              </div>
              <div className="font-mono font-bold text-xs text-primary">
                +{settings.gainBoostDb} dB
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
                <span>줌 팝 모션</span>
              </div>
              <div className="font-bold text-xs text-foreground uppercase">
                {settings.zoomPopIntensity}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>음성 화자</span>
              </div>
              <div className="font-bold text-xs text-foreground truncate">
                {settings.voiceName.includes('ko-KR')
                  ? settings.voiceName.replace('ko-KR-', '').replace('Neural', '')
                  : (settings.voiceName.split('/')[1] || settings.voiceName)} (x{settings.voiceSpeed.toFixed(2)})
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>예상 소요 시간</span>
              </div>
              <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                약 15~25초
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/[0.04] border border-primary/20 text-muted-foreground text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              최종 완성본은 <code className="font-mono text-primary">media/05_Exports</code> 폴더에 고화질 MP4로 보관되며 CapCut 초안 프로젝트가 함께 생성됩니다.
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isRendering}
            className="text-xs h-9 cursor-pointer"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isRendering}
            className="text-xs h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRendering ? '생성 처리 중...' : '최종 생성 및 렌더링 시작'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
