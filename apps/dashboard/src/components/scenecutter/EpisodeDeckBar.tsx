import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Film, Plus, Trash2, Clock, Sparkles } from 'lucide-react';
import { EpisodeData } from './types';

interface EpisodeDeckBarProps {
  episodes: EpisodeData[];
  activeEpisodeId: number;
  onSelectEpisode: (id: number) => void;
  onAddEpisode: () => void;
  onDeleteEpisode: (id: number) => void;
}

export const EpisodeDeckBar: React.FC<EpisodeDeckBarProps> = ({
  episodes,
  activeEpisodeId,
  onSelectEpisode,
  onAddEpisode,
  onDeleteEpisode,
}) => {
  return (
    <div className="w-full bg-card/80 border-b border-border backdrop-blur-md px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto select-none shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider px-1 shrink-0 flex items-center gap-1">
          <Film className="w-3.5 h-3.5 text-primary" />
          에피소드 덱 ({episodes.length})
        </span>

        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          {episodes.map((ep, idx) => {
            const isActive = ep.id === activeEpisodeId;
            const durationFormatted = ep.total_duration_sec
              ? `${Math.floor(ep.total_duration_sec / 60)}:${Math.floor(ep.total_duration_sec % 60).toString().padStart(2, '0')}`
              : '0:50';

            return (
              <div
                key={ep.id}
                onClick={() => onSelectEpisode(ep.id)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background/80 hover:bg-accent text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                <span>#{idx + 1} {ep.title || `쇼츠 ${idx + 1}`}</span>
                <span className={`text-[10px] font-semibold px-1 py-0.2 rounded-md ${
                  isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {durationFormatted}
                </span>

                {episodes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`'${ep.title}' 에피소드를 삭제하시겠습니까?`)) {
                        onDeleteEpisode(ep.id);
                      }
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/20 transition-opacity ${
                      isActive ? 'text-primary-foreground' : 'text-rose-500'
                    }`}
                    title="에피소드 삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddEpisode}
          className="h-7 text-xs px-2.5 rounded-xl font-bold border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>에피소드 추가</span>
        </Button>
      </div>
    </div>
  );
};
