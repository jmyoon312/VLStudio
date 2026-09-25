import React, { useState } from 'react';
import { MEOKGURI_TONE_PRESETS, MeokguriTonePresetId } from './types';
import { cn } from '@/lib/utils';
import { HelpCircle, Heart, Flame, Sparkles, ChevronDown, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MeokguriTonePresetBarProps {
  activePresetId: MeokguriTonePresetId;
  onSelectPreset: (id: MeokguriTonePresetId) => void;
}

export const MeokguriTonePresetBar: React.FC<MeokguriTonePresetBarProps> = ({
  activePresetId,
  onSelectPreset
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const getToneIcon = (id: MeokguriTonePresetId) => {
    switch (id) {
      case 'cider':
        return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'warm':
        return <Heart className="w-4 h-4 text-amber-500" />;
      case 'hype':
        return <Flame className="w-4 h-4 text-rose-500" />;
    }
  };

  const activePreset = MEOKGURI_TONE_PRESETS.find(p => p.id === activePresetId) || MEOKGURI_TONE_PRESETS[0];

  return (
    <section
      data-pixi-meokguri-tone-presets
      className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs"
    >
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        data-pixi-meokguri-tone-presets-toggle
        className="flex w-full items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">3대 톤앤매너 훅 프리셋</span>
          <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
            {activePreset.label} 적용됨
          </Badge>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="p-3.5 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            누르면 영상 도입 훅 음성과 본편 자막 말투가 한 번에 맞춰집니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {MEOKGURI_TONE_PRESETS.map((preset) => {
              const isSelected = preset.id === activePresetId;
              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  data-pixi-meokguri-tone-preset={preset.id}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2",
                    isSelected
                      ? "border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary/30"
                      : "border-border/70 hover:border-border hover:bg-muted/20"
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {getToneIcon(preset.id)}
                        <span className="text-xs font-bold text-foreground">{preset.label}</span>
                      </div>
                      {isSelected && (
                        <span className="p-0.5 rounded-full bg-primary text-primary-foreground">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-foreground font-medium leading-relaxed bg-background/80 p-2 rounded-lg border border-border/50">
                      "{preset.exampleHook}"
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {preset.summary}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{preset.bestFor}</span>
                    <span className="font-mono font-semibold text-primary">x{preset.settings.typecastSpeed.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
