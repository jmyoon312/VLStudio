import React, { useState } from 'react';
import AgentContextPanel from './components/AgentContextPanel';
import AgentCopilot from './components/AgentCopilot';
import StoryboardCanvas from './components/StoryboardCanvas';
import { I18nProvider } from '../flow2capcut/hooks/useI18n';
import { FolderTree, MessageSquare, Clapperboard } from 'lucide-react';

const AgentStudioApp = () => {
  const [activeMobileTab, setActiveMobileTab] = useState('copilot'); // 'context' | 'copilot' | 'canvas'

  return (
    <I18nProvider>
      <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-zinc-900 overflow-hidden text-sm min-h-0">
        
        {/* Mobile Top Segmented Bar (md:hidden) */}
        <div className="md:hidden flex items-center justify-around border-b border-border bg-card p-1 shrink-0 z-10 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveMobileTab('context')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMobileTab === 'context'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>컨텍스트</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('copilot')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMobileTab === 'copilot'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI 코파일럿</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('canvas')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMobileTab === 'canvas'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>스토리보드</span>
          </button>
        </div>

        {/* Mobile Single Panel View (md:hidden) */}
        <div className="md:hidden flex-1 overflow-hidden flex flex-col min-h-0">
          {activeMobileTab === 'context' && (
            <div className="flex-1 overflow-y-auto bg-card flex flex-col min-h-0">
              <AgentContextPanel />
            </div>
          )}
          {activeMobileTab === 'copilot' && (
            <div className="flex-1 overflow-hidden bg-background flex flex-col min-h-0 relative">
              <AgentCopilot />
            </div>
          )}
          {activeMobileTab === 'canvas' && (
            <div className="flex-1 overflow-hidden bg-card flex flex-col min-h-0">
              <StoryboardCanvas />
            </div>
          )}
        </div>

        {/* Desktop 3-Panel Split View (hidden md:flex) */}
        <div className="hidden md:flex flex-1 overflow-hidden min-h-0">
          {/* Left Panel: Context Manager */}
          <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col min-h-0">
            <AgentContextPanel />
          </div>

          {/* Center Panel: Agent Copilot (Chat & Prompt) */}
          <div className="w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex flex-col min-h-0 overflow-hidden relative">
            <AgentCopilot />
          </div>

          {/* Right Panel: Storyboard Canvas */}
          <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950 min-h-0 flex flex-col">
            <StoryboardCanvas />
          </div>
        </div>

      </div>
    </I18nProvider>
  );
};

export default AgentStudioApp;
