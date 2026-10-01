import React from 'react';
import { 
  LayoutGrid, 
  Play, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Film, 
  Layers, 
  Scissors, 
  Bot, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AGENT_ROSTER_ITEMS } from './AgentMentionDropdown';

export interface BoardTaskItem {
  id: string;
  title: string;
  stage: 'backlog' | 'scout_script' | 'critic_cut' | 'render_ready';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assigned_agent_id: string;
  preset_name?: string;
  duration_str?: string;
  timecode_str?: string;
  video_url?: string;
  thumbnail_url?: string;
  progress_percent?: number;
  created_at: string;
}

interface SovereignAgentBoardProps {
  tasks?: BoardTaskItem[];
  onOpenVideo?: (videoUrl: string, title: string) => void;
  onOpenAgentSoul?: (agentId: string) => void;
}

const DEFAULT_SAMPLE_TASKS: BoardTaskItem[] = [
  {
    id: 'task_001',
    title: '리센느 원이 15초 킬링파트 쇼츠',
    stage: 'render_ready',
    status: 'completed',
    assigned_agent_id: 'assembler',
    preset_name: '모던 클린 9:16',
    duration_str: '15초',
    timecode_str: '15s ~ 30s',
    thumbnail_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=640',
    progress_percent: 100,
    created_at: '방금 전'
  },
  {
    id: 'task_002',
    title: '손흥민 골 명장면 훅 쇼츠',
    stage: 'critic_cut',
    status: 'in_progress',
    assigned_agent_id: 'cutter',
    preset_name: '군림보 훅 밴드',
    duration_str: '15초',
    timecode_str: '20s ~ 35s',
    progress_percent: 65,
    created_at: '2분 전'
  },
  {
    id: 'task_003',
    title: '최신 AI 기술 동향 속보 숏폼',
    stage: 'scout_script',
    status: 'in_progress',
    assigned_agent_id: 'writer',
    preset_name: '시사 헤더바 브리핑',
    duration_str: '45초',
    progress_percent: 30,
    created_at: '5분 전'
  }
];

export const SovereignAgentBoard: React.FC<SovereignAgentBoardProps> = ({
  tasks = DEFAULT_SAMPLE_TASKS,
  onOpenVideo,
  onOpenAgentSoul
}) => {
  const columns: {
    key: BoardTaskItem['stage'];
    label: string;
    description: string;
    badgeColor: string;
    icon: React.ComponentType<any>;
  }[] = [
    { key: 'backlog', label: '1. 접수 대기열', description: '발주된 지시 및 아이템', badgeColor: 'bg-muted text-muted-foreground', icon: Clock },
    { key: 'scout_script', label: '2. 스카우팅 & 대본', description: '@스카우터, @작가 활동', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', icon: Sparkles },
    { key: 'critic_cut', label: '3. 검수 & 2초 절삭', description: '@비평가, @커터 활동', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: Scissors },
    { key: 'render_ready', label: '4. 렌더링 & 완성', description: '@어셈블러, @배포자 활동', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle2 }
  ];

  const getAgentInfo = (agentId: string) => {
    return AGENT_ROSTER_ITEMS.find((a) => a.id === agentId) || AGENT_ROSTER_ITEMS[0];
  };

  return (
    <div className="w-full h-full flex flex-col p-4 bg-background overflow-hidden space-y-4">
      {/* Board Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/25">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              8대 전문 하수인 실시간 파이프라인 관제 보드
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
                LIVE
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              헤르메스 에이전트 OS 협업 아키텍처: 각 하수인의 분업 상태와 스트림 슬라이싱, NLE 렌더링 파이프라인을 실시간으로 추적합니다.
            </p>
          </div>
        </div>

        {/* Quick Agent Roster Avatars */}
        <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 p-1 rounded-xl border border-border/60">
          <span className="text-[10px] font-bold text-muted-foreground px-1.5">활성 하수인:</span>
          {AGENT_ROSTER_ITEMS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onOpenAgentSoul?.(agent.id)}
              className="text-base p-1 rounded-lg hover:bg-card hover:scale-110 transition-all cursor-pointer shadow-2xs"
              title={`${agent.tag} (${agent.name}) - 클릭하여 SOUL.md 열기`}
            >
              {agent.avatar}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Columns Kanban */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 overflow-x-auto">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.stage === col.key);
          const ColIcon = col.icon;
          return (
            <div
              key={col.key}
              className="flex flex-col bg-muted/20 border border-border/70 rounded-2xl p-3 min-w-[250px] overflow-hidden"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                <div className="flex items-center gap-1.5">
                  <ColIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">{col.label}</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-background border border-border/80 text-foreground">
                  {colTasks.length}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground pb-2">{col.description}</p>

              {/* Tasks List */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/60 text-xs border border-dashed border-border/60 rounded-xl">
                    <span>작업 대기 중</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const agent = getAgentInfo(task.assigned_agent_id);
                    return (
                      <div
                        key={task.id}
                        className="bg-card border border-border/80 hover:border-primary/50 rounded-xl p-3 shadow-xs space-y-2.5 transition-all group"
                      >
                        {/* Task Card Header */}
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                            {task.title}
                          </h4>
                        </div>

                        {/* Preset & Timecode Info */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          {task.preset_name && (
                            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                              🎨 {task.preset_name}
                            </span>
                          )}
                          {task.timecode_str && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-semibold">
                              ⏱️ {task.timecode_str}
                            </span>
                          )}
                        </div>

                        {/* Thumbnail / Video Preview */}
                        {task.thumbnail_url && (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden bg-muted group/thumb">
                            <img
                              src={task.thumbnail_url}
                              alt={task.title}
                              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                            />
                            {task.stage === 'render_ready' && (
                              <button
                                type="button"
                                onClick={() => onOpenVideo?.(task.video_url || '', task.title)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"
                              >
                                <div className="p-2 rounded-full bg-primary text-primary-foreground shadow-md">
                                  <Play className="w-4 h-4 fill-current" />
                                </div>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Progress Bar */}
                        {task.progress_percent !== undefined && task.stage !== 'render_ready' && (
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300 rounded-full"
                              style={{ width: `${task.progress_percent}%` }}
                            />
                          </div>
                        )}

                        {/* Card Footer: Assigned Agent */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                          <button
                            type="button"
                            onClick={() => onOpenAgentSoul?.(agent.id)}
                            className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                            title="에이전트 SOUL.md 보기"
                          >
                            <span>{agent.avatar}</span>
                            <span>{agent.tag}</span>
                          </button>
                          <span className="text-[9px] text-muted-foreground/80 font-mono">
                            {task.created_at}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
