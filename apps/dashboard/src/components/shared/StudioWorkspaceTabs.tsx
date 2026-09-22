import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Zap, Palette, Scissors, Rocket, ArrowLeft, CheckCircle2, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StudioWorkspaceTabsProps {
  currentActiveTab?: 'batch' | 'dedicated' | 'pro' | 'publish';
  activeProjectTitle?: string;
  activeArchetype?: string;
  queueCount?: number;
  className?: string;
}

export const StudioWorkspaceTabs: React.FC<StudioWorkspaceTabsProps> = ({
  currentActiveTab,
  activeProjectTitle,
  activeArchetype,
  queueCount,
  className
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab automatically from route if not provided
  const activeTab = useMemo(() => {
    if (currentActiveTab) return currentActiveTab;
    const path = location.pathname;
    if (path.startsWith('/shorts-batch')) return 'batch';
    if (path.startsWith('/shorts-editor')) return 'dedicated';
    if (path.startsWith('/pro-editor')) return 'pro';
    if (path.startsWith('/work-queue')) return 'publish';
    return 'batch';
  }, [currentActiveTab, location.pathname]);

  // Read stored handoff project if any
  const savedProject = useMemo(() => {
    try {
      const p1 = sessionStorage.getItem('vlstudio_editor_handoff');
      if (p1) return JSON.parse(p1);
      const p2 = sessionStorage.getItem('vlstudio_pro_editor_handoff');
      if (p2) return JSON.parse(p2);
      const backup = localStorage.getItem('vlstudio_editor_handoff_backup');
      if (backup) return JSON.parse(backup);
    } catch (_) {}
    return null;
  }, [location.pathname]);

  const projectTitle = activeProjectTitle || savedProject?.title || '';
  const currentArchetype = activeArchetype || savedProject?.layoutTemplateMode || savedProject?.templateMode || 'ssul';

  const archetypeLabel = useMemo(() => {
    switch (currentArchetype) {
      case 'classic': return '샌드위치 클래식';
      case 'instagram': return '인스타 릴스';
      case 'gunlimbo': return '군림보 속보';
      case 'ssul':
      default: return '썰형 커뮤니티';
    }
  }, [currentArchetype]);

  const handleTabClick = (tabKey: 'batch' | 'dedicated' | 'pro' | 'publish') => {
    if (tabKey === 'batch') {
      navigate('/shorts-batch');
    } else if (tabKey === 'dedicated') {
      navigate(`/shorts-editor/${currentArchetype}`);
    } else if (tabKey === 'pro') {
      const query = projectTitle ? `?title=${encodeURIComponent(projectTitle)}` : '';
      navigate(`/pro-editor${query}`);
    } else if (tabKey === 'publish') {
      navigate('/work-queue');
    }
  };

  const isInsideEditor = activeTab === 'dedicated' || activeTab === 'pro';

  return (
    <div className={cn("w-full bg-card/90 backdrop-blur-md border border-border rounded-2xl p-2.5 shadow-xs select-none transition-all", className)}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* 좌측: 4대 스튜디오 워크스페이스 세그먼트 버튼 */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto p-1 bg-muted/40 rounded-xl border border-border/80 overflow-x-auto scrollbar-none">
          {/* 1. 올인원 일괄 생성 허브 */}
          <button
            type="button"
            onClick={() => handleTabClick('batch')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'batch'
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/80"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ 올인원 일괄 생성</span>
            {queueCount !== undefined && queueCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5 bg-background/20 text-current border-none">
                {queueCount}개
              </Badge>
            )}
          </button>

          {/* 2. 4대 전용 스튜디오 편집기 */}
          <button
            type="button"
            onClick={() => handleTabClick('dedicated')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'dedicated'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/80"
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>🎨 전용 스튜디오</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/60 bg-background/50 font-normal">
              {archetypeLabel}
            </Badge>
          </button>

          {/* 3. 프로 NLE 비디오 편집기 */}
          <button
            type="button"
            onClick={() => handleTabClick('pro')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'pro'
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/80"
            )}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>✂️ 프로 NLE 편집기</span>
            <span className="text-[10px] opacity-70 font-mono hidden md:inline">Q/W/S/Alt+G</span>
          </button>

          {/* 4. 자동 배포 관리 대기열 */}
          <button
            type="button"
            onClick={() => handleTabClick('publish')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'publish'
                ? "bg-violet-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/80"
            )}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>🚀 자동 배포 대기열</span>
          </button>
        </div>

        {/* 우측: 현재 작업 중 프로젝트 표시 & 복귀 내비게이션 */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {projectTitle ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/30 border border-border text-xs min-w-0 max-w-[260px] truncate">
              <Film className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground text-[11px] shrink-0">작업중:</span>
              <span className="font-semibold text-foreground truncate">{projectTitle}</span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>주권 자율 팩토리 대기 중</span>
            </div>
          )}

          {isInsideEditor ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/shorts-batch')}
              className="h-7 text-xs font-bold gap-1.5 border-primary/40 hover:bg-primary/10 text-primary cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>일괄 생성 허브로 복귀</span>
            </Button>
          ) : (
            projectTitle && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTabClick('dedicated')}
                className="h-7 text-xs font-bold gap-1.5 border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-500 cursor-pointer"
              >
                <span>편집기 열기</span>
                <span className="text-[10px]">➔</span>
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioWorkspaceTabs;
