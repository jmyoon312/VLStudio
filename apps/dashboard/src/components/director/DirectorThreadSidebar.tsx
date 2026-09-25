import React, { useState } from 'react';
import {
    Plus,
    MessageSquare,
    Folder,
    FolderPlus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Search,
    SlidersHorizontal,
    Database,
    PanelLeftClose,
    PanelLeftOpen,
    Sparkles,
    GitPullRequest,
    Clock,
    Plug,
    Settings,
    Activity
} from 'lucide-react';
import { DirectorProject, DirectorThread } from '@/services/directorSessionService';

interface DirectorThreadSidebarProps {
    projects: DirectorProject[];
    threads: DirectorThread[];
    activeProjectId?: string;
    activeThreadId?: string;
    currentProvider?: string;
    onProviderChange?: (provider: string) => void;
    onOpenSettings?: () => void;
    onSelectProject: (projectId: string) => void;
    onSelectThread: (threadId: string) => void;
    onCreateThread: () => void;
    onCreateProject: (name: string) => void;
    onDeleteThread: (threadId: string) => void;
    onDeleteProject: (projectId: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export const DirectorThreadSidebar: React.FC<DirectorThreadSidebarProps> = ({
    projects,
    threads,
    activeProjectId,
    activeThreadId,
    currentProvider = 'openai',
    onProviderChange,
    onOpenSettings,
    onSelectProject,
    onSelectThread,
    onCreateThread,
    onCreateProject,
    onDeleteThread,
    onDeleteProject,
    isCollapsed,
    onToggleCollapse
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
        proj_default: true,
        all: true
    });

    // Deduplicate projects to prevent duplicate "기본 프로젝트" rendering
    const uniqueProjects = Array.from(
        new Map(projects.map(p => [p.id, p])).values()
    );

    const toggleFolder = (projectId: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    const handleCreateProjectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        onCreateProject(newProjectName.trim());
        setNewProjectName('');
        setIsAddingProject(false);
    };

    const filteredThreads = threads.filter(t => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.preset_id && t.preset_id.toLowerCase().includes(q));
    });

    if (isCollapsed) {
        return (
            <div className="w-12 shrink-0 border-r border-border bg-card/50 flex flex-col items-center py-3 gap-3 z-10 transition-all">
                <button
                    onClick={onToggleCollapse}
                    title="사이드바 펼치기 (대화 및 프로젝트 목록)"
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    <PanelLeftOpen className="w-5 h-5" />
                </button>
                <div className="w-8 h-px bg-border my-1" />
                <button
                    onClick={onCreateThread}
                    title="새 대화 시작 (Ctrl+N)"
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>
                <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto no-scrollbar py-2">
                    {threads.slice(0, 10).map(t => (
                        <button
                            key={t.id}
                            onClick={() => onSelectThread(t.id)}
                            title={t.title}
                            className={`p-2 rounded-lg text-xs transition-colors ${
                                t.id === activeThreadId
                                    ? 'bg-primary text-primary-foreground font-semibold'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <aside
            data-app-action-sidebar-thread-row
            className="w-64 shrink-0 border-r border-border bg-card/70 flex flex-col h-full z-10 backdrop-blur-md transition-all select-none"
        >
            {/* Header: Provider Selector Dropdown (Benchmarked 1:1 with Codex Desktop) */}
            <div className="p-2.5 border-b border-border/80 flex items-center justify-between relative">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsProviderMenuOpen(!isProviderMenuOpen)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted font-bold text-sm text-foreground transition-colors"
                        title="프로바이더 전환"
                    >
                        <span>{currentProvider === 'openai' ? 'Codex' : currentProvider === 'gemini' ? 'Gemini' : currentProvider === 'claude' ? 'Claude' : currentProvider === 'grok' ? 'Grok' : 'OmniRoute'}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-70" />
                    </button>

                    {/* Provider Selection Popover */}
                    {isProviderMenuOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 rounded-xl border border-border bg-popover shadow-xl p-1 z-50 text-xs">
                            {[
                                { key: 'openai', name: 'OpenAI (Codex)', badge: '기본' },
                                { key: 'gemini', name: 'Google Gemini', badge: '최신 3.8' },
                                { key: 'claude', name: 'Anthropic Claude', badge: '3.7' },
                                { key: 'grok', name: 'xAI Grok', badge: 'Beta' },
                                { key: 'omniroute', name: 'OmniRoute Gateway', badge: '로컬' },
                            ].map(p => (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => {
                                        onProviderChange?.(p.key);
                                        setIsProviderMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                                        currentProvider === p.key
                                            ? 'bg-primary/10 text-primary font-bold'
                                            : 'text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <span>{p.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                                        {p.badge}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={onToggleCollapse}
                        title="사이드바 접기"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Quick Actions Menu (Codex Desktop 1:1) */}
            <div className="p-2 space-y-0.5 border-b border-border/60">
                <button
                    onClick={onCreateThread}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors group"
                >
                    <Plus className="w-4 h-4 text-primary" />
                    <span>새 채팅</span>
                </button>
                <button
                    onClick={() => {}}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <GitPullRequest className="w-3.5 h-3.5 opacity-70" />
                    <span>풀 리퀘스트</span>
                </button>
                <button
                    onClick={() => {}}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <Clock className="w-3.5 h-3.5 opacity-70" />
                    <span>예약</span>
                </button>
                <button
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <Plug className="w-3.5 h-3.5 opacity-70" />
                    <span>플러그인 / 설정</span>
                </button>
            </div>

            {/* Search Input */}
            <div className="p-2">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="검색..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-muted/50 border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            {/* Project Folders & Thread List */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3 text-xs">
                {/* Projects Section */}
                <div>
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>프로젝트</span>
                        <button
                            onClick={() => setIsAddingProject(true)}
                            title="새 프로젝트 폴더 추가"
                            className="p-1 hover:text-foreground rounded hover:bg-muted transition-colors"
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {isAddingProject && (
                        <form onSubmit={handleCreateProjectSubmit} className="p-2 bg-muted/40 rounded-md mb-2 border border-border/80">
                            <input
                                autoFocus
                                type="text"
                                placeholder="프로젝트명..."
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded bg-background border border-border text-foreground mb-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                            />
                            <div className="flex justify-end gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => { setIsAddingProject(false); setNewProjectName(''); }}
                                    className="px-2 py-0.5 text-[11px] rounded hover:bg-muted text-muted-foreground"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-2 py-0.5 text-[11px] rounded bg-primary text-primary-foreground font-medium"
                                >
                                    추가
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="space-y-0.5">
                        {uniqueProjects.map(proj => {
                            const isExpanded = expandedFolders[proj.id] ?? true;
                            const isProjectActive = activeProjectId === proj.id;
                            const projectThreads = filteredThreads.filter(t => t.project_id === proj.id || (!t.project_id && proj.id === 'proj_default'));

                            return (
                                <div key={proj.id} className="rounded-md overflow-hidden">
                                    <div
                                        onClick={() => {
                                            onSelectProject(proj.id);
                                            toggleFolder(proj.id);
                                        }}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors group ${
                                            isProjectActive ? 'bg-accent/70 text-foreground font-medium' : 'hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                        )}
                                        <Folder className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                        <span className="truncate flex-1">{proj.name}</span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
                                            {projectThreads.length}
                                        </span>
                                        {proj.id !== 'proj_default' && (
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    if (confirm(`'${proj.name}' 프로젝트 폴더를 삭제하시겠습니까? (대화는 기본 폴더로 이동합니다)`)) {
                                                        onDeleteProject(proj.id);
                                                    }
                                                }}
                                                title="폴더 삭제"
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Threads inside this project */}
                                    {isExpanded && (
                                        <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l border-border/50 ml-3.5 my-0.5">
                                            {projectThreads.length === 0 ? (
                                                <div className="py-1 px-2 text-[11px] text-muted-foreground/60 italic">
                                                    대화 없음 (+ 새 대화)
                                                </div>
                                            ) : (
                                                projectThreads.map(thread => {
                                                    const isThreadActive = thread.id === activeThreadId;
                                                    return (
                                                        <div
                                                            key={thread.id}
                                                            onClick={() => onSelectThread(thread.id)}
                                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-all ${
                                                                isThreadActive
                                                                    ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium shadow-2xs'
                                                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate text-xs">{thread.title || '새 대화'}</div>
                                                                {thread.preset_id && (
                                                                    <div className="text-[10px] text-primary/80 truncate font-mono">
                                                                        🏷️ {thread.preset_id.replace('pixeling_official_', '')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    if (confirm(`'${thread.title}' 대화를 삭제하시겠습니까?`)) {
                                                                        onDeleteThread(thread.id);
                                                                    }
                                                                }}
                                                                title="대화 삭제"
                                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive rounded transition-opacity"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer with AI Engine & Settings SSOT */}
            <div className="p-2 border-t border-border bg-card/40 flex items-center justify-between text-xs">
                <button
                    type="button"
                    onClick={onOpenSettings}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs font-medium cursor-pointer"
                    title="AI 모델 및 계정 설정"
                >
                    <Settings className="w-3.5 h-3.5 text-primary" />
                    <span>AI 엔진 설정</span>
                </button>
                <div className="flex items-center gap-1.5 pr-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="AI 엔진 정상 가동 중" />
                    <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold select-none">연결 정상</span>
                </div>
            </div>
        </aside>
    );
};
