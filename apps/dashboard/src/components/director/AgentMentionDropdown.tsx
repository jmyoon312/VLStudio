import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Bot } from 'lucide-react';

export interface AgentRosterItem {
  id: string;
  name: string;
  tag: string;
  role: string;
  avatar: string;
  badge_color: string;
  provider: string;
  model: string;
}

export const AGENT_ROSTER_ITEMS: AgentRosterItem[] = [
  { id: 'scout', name: '스카우터', tag: '@스카우터', role: '원천 소스 영상 및 비전 실측 발굴', avatar: '🔍', badge_color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30', provider: 'gemini', model: 'Gemini 3.8 Flash' },
  { id: 'writer', name: '작가', tag: '@작가', role: '4대 폼팩터 킬링파트 60초 대본 집필', avatar: '✍️', badge_color: 'text-purple-500 bg-purple-500/10 border-purple-500/30', provider: 'codex', model: 'Codex Astra 6.1' },
  { id: 'critic', name: '비평가', tag: '@비평가', role: 'Critic-85 도파민/팩트 게이트키퍼 검수', avatar: '⚖️', badge_color: 'text-rose-500 bg-rose-500/10 border-rose-500/30', provider: 'claude', model: 'Claude 3.7 Sonnet' },
  { id: 'cutter', name: '커터', tag: '@커터', role: '2초 무다운로드 스트림 절삭 & 스냅', avatar: '⚡', badge_color: 'text-blue-500 bg-blue-500/10 border-blue-500/30', provider: 'gemini', model: 'Gemini 3.8 Flash' },
  { id: 'voice', name: '보이스', tag: '@보이스', role: '감정 TTS 캐스팅 및 보이스 스트림', avatar: '🎙️', badge_color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', provider: 'gemini', model: 'Gemini 3.8 Flash' },
  { id: 'visual', name: '비주얼', tag: '@비주얼', role: '썸네일, 키프레임, 이미지 에셋 생성', avatar: '🎨', badge_color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', provider: 'gemini', model: 'Gemini 3.8 Flash' },
  { id: 'assembler', name: '어셈블러', tag: '@어셈블러', role: '4대 폼팩터 주권 파라메트릭 NLE 합성', avatar: '🎬', badge_color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30', provider: 'codex', model: 'Codex Astra 6.1' },
  { id: 'deployer', name: '배포자', tag: '@배포자', role: '유튜브 자동 배포 관리 대기열 등록', avatar: '🚀', badge_color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', provider: 'gemini', model: 'Gemini 3.8 Flash' },
];

interface AgentMentionDropdownProps {
  query?: string;
  onSelectAgent: (agent: AgentRosterItem) => void;
  onClose: () => void;
}

export const AgentMentionDropdown: React.FC<AgentMentionDropdownProps> = ({
  query = '',
  onSelectAgent,
  onClose,
}) => {
  const filtered = AGENT_ROSTER_ITEMS.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.tag.toLowerCase().includes(query.toLowerCase()) ||
      a.role.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="absolute bottom-full mb-2 left-0 w-80 sm:w-96 bg-card border border-border/90 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/50 text-[11px] font-bold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
          8대 전문 하수인 호출 (Bot Mode)
        </span>
        <span className="text-[10px] text-muted-foreground/80">ESC로 닫기</span>
      </div>

      <div className="max-h-64 overflow-y-auto p-1 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            일치하는 전문 에이전트가 없습니다.
          </div>
        ) : (
          filtered.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted/80 text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0 p-1 rounded-lg bg-background border border-border/60 shadow-2xs group-hover:scale-110 transition-transform">
                  {agent.avatar}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      {agent.tag}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      ({agent.name})
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {agent.role}
                  </p>
                </div>
              </div>
              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0', agent.badge_color)}>
                {agent.model.split(' ')[0]}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
