import React from 'react';
import { Mic, Zap, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TTSConfig } from '@/types/tts';
import TTSConfigPanel from '@/components/shared/TTSConfigPanel';

interface OneTakeVoiceSectionProps {
  ttsConfig: TTSConfig;
  onTTSConfigChange: (newConfig: TTSConfig) => void;
}

export const OneTakeVoiceSection: React.FC<OneTakeVoiceSectionProps> = ({
  ttsConfig,
  onTTSConfigChange,
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">TTS 음성 설정 (Voice Synthesis)</span>
          <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground font-semibold gap-1">
            <Zap className="w-3 h-3" />
            <span>Supertonic 기본 탑재</span>
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>로컬 ONNX 고음질 신경망 (크레딧 0원 무제한 무료)</span>
        </div>
      </div>

      {/* 클래식 편집기 TTSConfigPanel 100% 컴포넌트화 재사용 */}
      <div className="bg-muted/10 rounded-xl p-1 border border-border/50">
        <TTSConfigPanel
          config={ttsConfig}
          onChange={onTTSConfigChange}
          compact={false}
          showFavorites={true}
        />
      </div>
    </div>
  );
};

export default OneTakeVoiceSection;
