import React from "react";
import { Archetype } from "../../../types/blueprintV4";

export interface QuickPresetBarProps {
  currentArchetype: Archetype;
  onSelectArchetype: (archetype: Archetype) => void;
  className?: string;
}

const ARCHETYPES: Array<{ id: Archetype; label: string; icon: string; desc: string }> = [
  { id: "classic", label: "클래식", icon: "🎬", desc: "표준 레터박스 & 자막" },
  { id: "gunlimbo", label: "군림보", icon: "⚡", desc: "0초 훅 & 4.5초 쨉쨉이" },
  { id: "instagram", label: "인스타", icon: "📸", desc: "프로필 & 베댓 카드" },
  { id: "ssul", label: "썰형", icon: "💬", desc: "헤더바 & 누적 자막" },
  { id: "bespoke", label: "비스포크", icon: "✨", desc: "채널 DNA 맞춤형" },
];

/**
 * [QuickPresetBar]
 * 4대 폼팩터 아키타입 스타일 원클릭 전환 바
 */
export const QuickPresetBar: React.FC<QuickPresetBarProps> = ({
  currentArchetype,
  onSelectArchetype,
  className = "",
}) => {
  return (
    <div className={`flex items-center space-x-1.5 p-1 bg-muted/60 rounded-xl border border-border ${className}`}>
      {ARCHETYPES.map((arch) => {
        const isActive = currentArchetype === arch.id;
        return (
          <button
            key={arch.id}
            onClick={() => onSelectArchetype(arch.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? "bg-primary/15 text-primary border border-primary/40 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
            }`}
            title={arch.desc}
          >
            <span>{arch.icon}</span>
            <span>{arch.label}</span>
          </button>
        );
      })}
    </div>
  );
};
