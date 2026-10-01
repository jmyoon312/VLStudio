import React, { useState, useEffect } from 'react';
import { 
  X, Bot, Save, RotateCcw, Sparkles, Shield, Cpu, 
  Check, FileText, Database, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AGENT_ROSTER_ITEMS, AgentRosterItem } from './AgentMentionDropdown';
import { cn } from '@/lib/utils';

interface AgentSoulData {
  id: string;
  name: string;
  tag: string;
  role: string;
  avatar: string;
  badge_color: string;
  provider: string;
  model: string;
  soul_content: string;
  memory_content: string;
}

interface AgentSoulInspectorModalProps {
  open: boolean;
  onClose: () => void;
  defaultAgentId?: string;
}

export const AgentSoulInspectorModal: React.FC<AgentSoulInspectorModalProps> = ({
  open,
  onClose,
  defaultAgentId = 'scout',
}) => {
  const [selectedId, setSelectedId] = useState<string>(defaultAgentId);
  const [agents, setAgents] = useState<AgentRosterItem[]>(AGENT_ROSTER_ITEMS);
  const [soulData, setSoulData] = useState<AgentSoulData | null>(null);
  const [editedSoul, setEditedSoul] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('Gemini 2.5 Flash');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'soul' | 'memory'>('soul');

  useEffect(() => {
    if (open) {
      loadAgentSoul(selectedId);
    }
  }, [open, selectedId]);

  const loadAgentSoul = async (agentId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/agent-profiles/${agentId}/soul`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSoulData(json.data);
          setEditedSoul(json.data.soul_content);
          setSelectedProvider(json.data.provider || 'gemini');
          setSelectedModel(json.data.model || 'Gemini 2.5 Flash');
        }
      } else {
        // Fallback to local default if API not reached yet
        const local = AGENT_ROSTER_ITEMS.find((a) => a.id === agentId);
        if (local) {
          setEditedSoul(`# SOUL.md - ${local.tag}\n\n## 1. 정체성\n${local.role}\n`);
        }
      }
    } catch (err) {
      console.warn('Failed to load agent soul:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSoul = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/agent-profiles/${selectedId}/soul`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soul_content: editedSoul,
          provider: selectedProvider,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${soulData?.tag || '에이전트'}의 SOUL.md 헌법이 성공적으로 저장되었습니다!`);
        if (data.data) {
          setSoulData(data.data);
        }
      } else {
        toast.error(`저장 실패: ${data.detail || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      toast.error(`저장 통신 실패: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSoul = async () => {
    if (!confirm('이 에이전트의 SOUL.md를 공장 초기 상태로 되돌리시겠습니까?')) return;
    try {
      const res = await fetch(`/api/agent-profiles/${selectedId}/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setSoulData(data.data);
        setEditedSoul(data.data.soul_content);
        toast.success('기본 SOUL.md로 초기화되었습니다.');
      }
    } catch (err: any) {
      toast.error(`초기화 실패: ${err.message}`);
    }
  };

  if (!open) return null;

  const currentAgent = agents.find((a) => a.id === selectedId) || agents[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[85vh] max-h-[750px] bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                8대 전문 하수인 SOUL.md 헌법 인스펙터
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Bot Mode
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                각 전문 에이전트의 정체성, 문체, 어휘집, 금기어 및 독립 기억(MEMORY.md)을 주권적으로 튜닝합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
          {/* Left Sidebar: 8 Agents List */}
          <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-border/60 p-2.5 space-y-1 overflow-y-auto bg-muted/15 shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground px-2 py-1 block uppercase tracking-wider">
              전문 에이전트 Roster (8)
            </span>
            {agents.map((agent) => {
              const isSelected = agent.id === selectedId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedId(agent.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer border',
                    isSelected
                      ? 'bg-primary/10 border-primary/40 text-foreground font-semibold shadow-xs'
                      : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="text-xl shrink-0">{agent.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{agent.tag}</span>
                      <span className={cn('text-[9px] font-mono font-bold px-1 rounded', agent.badge_color)}>
                        {agent.id}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{agent.name}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Editor Area */}
          <div className="flex-1 min-w-0 flex flex-col p-4 space-y-3 overflow-hidden bg-background">
            {/* Top Toolbar for Selected Agent */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl">{currentAgent.avatar}</span>
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {currentAgent.tag} ({currentAgent.name})
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', currentAgent.badge_color)}>
                      {currentAgent.role}
                    </span>
                  </h4>
                  <div className="flex items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                    <span>지정 모델:</span>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="h-6 px-1.5 text-xs bg-muted text-foreground rounded border border-border focus:outline-hidden"
                    >
                      <option value="Codex Astra 6.0">Codex Astra 6.0 (OpenAI)</option>
                      <option value="GPT-4o">GPT-4o (OpenAI)</option>
                      <option value="Gemini 2.5 Flash">Gemini 2.5 Flash (Google)</option>
                      <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet (Anthropic)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-tabs: SOUL.md vs MEMORY.md */}
              <div className="flex items-center gap-1 p-0.5 bg-muted rounded-xl border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('soul')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                    activeTab === 'soul' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  📜 SOUL.md (헌법)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('memory')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                    activeTab === 'memory' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  🧠 MEMORY.md (기억)
                </button>
              </div>
            </div>

            {/* Content Editor */}
            <div className="flex-1 min-h-0 relative">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  에이전트 SOUL.md 로딩 중...
                </div>
              ) : activeTab === 'soul' ? (
                <Textarea
                  value={editedSoul}
                  onChange={(e) => setEditedSoul(e.target.value)}
                  placeholder="이 에이전트의 정체성, 문체, 금기어, 작업 지시를 마크다운으로 정의하세요..."
                  className="w-full h-full font-mono text-xs leading-relaxed p-3.5 resize-none bg-muted/20 border border-border/80 rounded-xl focus-visible:ring-1 focus-visible:ring-primary select-text"
                />
              ) : (
                <div className="w-full h-full flex flex-col p-3 rounded-xl bg-muted/20 border border-border/80 overflow-y-auto font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Database className="w-3.5 h-3.5 text-primary" />
                      격리 기억 보관소 (정보 오염 0% 격리)
                    </span>
                    <span className="text-[10px]">
                      {soulData?.memory_content ? `${soulData.memory_content.split('\n').length}줄 누적` : '비어 있음'}
                    </span>
                  </div>
                  {soulData?.memory_content || '아직 누적된 독립 기억이 없습니다. 에이전트와 대화하며 중요한 스타일이나 규칙이 기억에 기록됩니다.'}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSoul}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
                title="기본값으로 복원"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>공장 초기화</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 px-3 text-xs"
                >
                  닫기
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveSoul}
                  disabled={isSaving}
                  className="h-8 px-3.5 text-xs font-semibold bg-primary text-primary-foreground gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? '저장 중...' : 'SOUL 헌법 저장'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
