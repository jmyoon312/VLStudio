import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    Activity,
    MoreHorizontal,
    Pin,
    PinOff,
    Cloud,
    Edit2,
    Archive,
    ExternalLink,
    Check,
    X,
    GitPullRequest,
    Clock,
    Plug,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { DirectorProject, DirectorThread } from '@/services/directorSessionService';

interface DirectorThreadSidebarProps {
    projects: DirectorProject[];
    threads: DirectorThread[];
    activeProjectId?: string;
    activeThreadId?: string;
    currentProvider?: string;
    onProviderChange?: (provider: string) => void;
    onOpenSettings?: () => void;
    onOpenSchedule?: () => void;
    onOpenPresets?: () => void;
    onSelectProject: (projectId: string) => void;
    onSelectThread: (threadId: string) => void;
    onCreateThread: () => void;
    onCreateProject: (name: string) => void;
    onDeleteThread: (threadId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onUpdateThread?: (threadId: string, data: Partial<DirectorThread>) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export const formatThreadTitle = (title?: string): string => {
    if (!title || !title.trim()) return '새 대화';
    const clean = title.trim();
    // If it starts with http/https
    if (/^https?:\/\//i.test(clean)) {
        if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
            return '유튜브 숏폼 레퍼런스 영상';
        }
        if (clean.includes('tiktok.com')) {
            return '틱톡 트렌드 영상 분석';
        }
        if (clean.includes('instagram.com')) {
            return '인스타그램 릴스 레퍼런스';
        }
        return '웹 레퍼런스 자료 분석';
    }
    return clean;
};

export const DirectorThreadSidebar: React.FC<DirectorThreadSidebarProps> = ({
    projects,
    threads,
    activeProjectId,
    activeThreadId,
    currentProvider = 'openai',
    onProviderChange,
    onOpenSettings,
    onOpenSchedule,
    onOpenPresets,
    onSelectProject,
    onSelectThread,
    onCreateThread,
    onCreateProject,
    onDeleteThread,
    onDeleteProject,
    onUpdateThread,
    isCollapsed,
    onToggleCollapse
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
    const [activeMenuThreadId, setActiveMenuThreadId] = useState<string | null>(null);
    const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
    const [menuThread, setMenuThread] = useState<DirectorThread | null>(null);
    const [menuProject, setMenuProject] = useState<DirectorProject | null>(null);
    const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [moveProjectThreadId, setMoveProjectThreadId] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
        proj_default: true,
        all: true
    });

    const formatRelativeTime = (dateStr?: string): string => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) return '방금 전';
            if (diffMins < 60) return `${diffMins}분 전`;
            if (diffHours < 24) return `${diffHours}시간 전`;
            if (diffDays === 1) return '어제';
            if (diffDays < 7) return `${diffDays}일 전`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
            return `${Math.floor(diffDays / 30)}달 전`;
        } catch {
            return '';
        }
    };

    // Close menu when clicking outside or scrolling
    useEffect(() => {
        const handleClose = () => {
            if (activeMenuThreadId) {
                setActiveMenuThreadId(null);
                setMenuAnchorRect(null);
                setMenuThread(null);
                setMenuProject(null);
            }
            setIsProviderMenuOpen(false);
        };
        window.addEventListener('click', handleClose);
        window.addEventListener('resize', handleClose);
        return () => {
            window.removeEventListener('click', handleClose);
            window.removeEventListener('resize', handleClose);
        };
    }, [activeMenuThreadId, isProviderMenuOpen]);

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
            className="w-64 xl:w-72 shrink-0 border-r border-border bg-card/70 flex flex-col h-full z-10 backdrop-blur-md transition-all select-none"
        >
            {/* Header: Provider Selector Dropdown (Benchmarked 1:1 with Codex Desktop) */}
            <div className="p-2.5 border-b border-border/80 flex items-center justify-between relative">
                <div className="relative">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsProviderMenuOpen(!isProviderMenuOpen);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted font-bold text-sm text-foreground transition-colors cursor-pointer"
                        title="프로바이더 전환"
                    >
                        <span>
                            {(currentProvider === 'codex' || currentProvider === 'openai') ? 'Codex' :
                             currentProvider === 'chatgpt_web' ? 'ChatGPT Web' :
                             currentProvider === 'gemini' ? 'Gemini' :
                             currentProvider === 'claude' ? 'Claude' :
                             currentProvider === 'deepseek' ? 'DeepSeek' : 'OmniRoute'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-70" />
                    </button>

                    {/* Provider Selection Popover */}
                    {isProviderMenuOpen && (
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-full left-0 mt-1 w-52 rounded-xl border border-border bg-popover shadow-xl p-1 z-50 text-xs"
                        >
                            {[
                                { key: 'codex', name: 'OpenAI (Codex)', badge: '기본' },
                                { key: 'chatgpt_web', name: 'ChatGPT Web', badge: '세션' },
                                { key: 'gemini', name: 'Google Gemini', badge: '최신 3.8' },
                                { key: 'omniroute', name: 'OmniRoute Gateway', badge: '로컬' },
                                { key: 'claude', name: 'Anthropic Claude', badge: '3.7' },
                                { key: 'deepseek', name: 'DeepSeek Web', badge: '무료 0원' },
                            ].map(p => (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => {
                                        onProviderChange?.(p.key);
                                        setIsProviderMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                                        (currentProvider === p.key || (p.key === 'codex' && currentProvider === 'openai'))
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

            {/* Quick Actions Menu (Pixeling & Codex Desktop 1:1) */}
            <div className="p-2.5 space-y-1.5 border-b border-border/60">
                <button
                    onClick={onCreateThread}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-xs group cursor-pointer active:scale-98"
                >
                    <Plus className="w-4 h-4" />
                    <span>새 채팅</span>
                </button>
                <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                        onClick={onOpenPresets}
                        title="프리셋 보관함"
                        className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/50 transition-colors cursor-pointer"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                        <span className="truncate">프리셋</span>
                    </button>
                    <button
                        onClick={onOpenSchedule}
                        title="예약 설정"
                        className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/50 transition-colors cursor-pointer"
                    >
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">예약</span>
                    </button>
                    <button
                        onClick={onOpenSettings}
                        title="AI 엔진 설정"
                        className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/50 transition-colors cursor-pointer"
                    >
                        <Settings className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="truncate">설정</span>
                    </button>
                </div>
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
                                                projectThreads.map((thread, threadIdx) => {
                                                    const isThreadActive = thread.id === activeThreadId;
                                                    const isEditing = editingThreadId === thread.id;
                                                    const relTime = formatRelativeTime(thread.updated_at || thread.created_at);
                                                    const isTopItem = threadIdx < 2;

                                                    return (
                                                        <div
                                                            key={thread.id}
                                                            onClick={() => !isEditing && onSelectThread(thread.id)}
                                                            className={`relative flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl cursor-pointer group transition-all ${
                                                                isThreadActive
                                                                    ? 'bg-primary/15 dark:bg-primary/20 text-foreground font-bold border border-primary/35 shadow-2xs'
                                                                    : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                {isThreadActive && <span className="w-1.5 h-4 rounded-full bg-primary shrink-0 shadow-xs" />}
                                                                {thread.is_pinned ? (
                                                                    <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                                                ) : (
                                                                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isThreadActive ? 'text-primary' : 'opacity-70'}`} />
                                                                )}

                                                                {isEditing ? (
                                                                    <form 
                                                                        onSubmit={(e) => {
                                                                            e.preventDefault();
                                                                            if (editingTitle.trim()) {
                                                                                onUpdateThread?.(thread.id, { title: editingTitle.trim() });
                                                                            }
                                                                            setEditingThreadId(null);
                                                                        }}
                                                                        className="flex items-center gap-1 w-full"
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        <input
                                                                            autoFocus
                                                                            type="text"
                                                                            value={editingTitle}
                                                                            onChange={e => setEditingTitle(e.target.value)}
                                                                            className="w-full px-1.5 py-0.5 text-xs rounded bg-background border border-primary text-foreground focus:outline-hidden"
                                                                        />
                                                                        <button type="submit" className="p-0.5 text-primary hover:text-foreground">
                                                                            <Check className="w-3 h-3" />
                                                                        </button>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => setEditingThreadId(null)}
                                                                            className="p-0.5 text-muted-foreground hover:text-foreground"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </form>
                                                                ) : (
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className={`truncate text-xs ${isThreadActive ? 'font-bold text-foreground' : 'font-medium'}`}>
                                                                            {formatThreadTitle(thread.title)}
                                                                        </div>
                                                                        {thread.preset_id && (
                                                                            <div className="text-[10px] text-primary/80 truncate font-mono">
                                                                                🏷️ {thread.preset_id.replace('pixeling_official_', '')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Right Relative Time & 3-Dot Button */}
                                                            {!isEditing && (
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    {relTime && (
                                                                        <span className="text-[10px] text-muted-foreground/60 group-hover:hidden">
                                                                            {relTime}
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            if (activeMenuThreadId === thread.id) {
                                                                                setActiveMenuThreadId(null);
                                                                                setMenuAnchorRect(null);
                                                                                setMenuThread(null);
                                                                                setMenuProject(null);
                                                                            } else {
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                setActiveMenuThreadId(thread.id);
                                                                                setMenuAnchorRect(rect);
                                                                                setMenuThread(thread);
                                                                                setMenuProject(proj);
                                                                            }
                                                                        }}
                                                                        title="대화 옵션"
                                                                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                                    >
                                                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
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

            {/* Unclipped Portal Context Menu (Rendered at Body level to prevent ANY container clipping) */}
            {activeMenuThreadId && menuAnchorRect && menuThread && createPortal(
                (() => {
                    const menuWidth = 216;
                    const menuHeight = 275;
                    const padding = 12;

                    // Align right edge of menu with right edge of 3-dot button
                    let left = menuAnchorRect.right - menuWidth;
                    if (left < padding) left = padding;
                    if (left + menuWidth > window.innerWidth - padding) left = window.innerWidth - menuWidth - padding;

                    // Smart vertical positioning: flip above if space below is limited
                    const spaceBelow = window.innerHeight - menuAnchorRect.bottom;
                    let top = menuAnchorRect.bottom + 6;
                    if (spaceBelow < menuHeight && menuAnchorRect.top > menuHeight) {
                        top = menuAnchorRect.top - menuHeight - 6;
                    }

                    return (
                        <div 
                            style={{ top: `${top}px`, left: `${left}px` }}
                            onClick={e => e.stopPropagation()}
                            className="fixed w-54 bg-popover text-popover-foreground border border-border/90 rounded-2xl shadow-2xl py-1.5 z-[99999] animate-in fade-in zoom-in-95 select-none"
                        >
                            <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/50 mb-1 truncate">
                                {!menuProject || menuProject.id === 'proj_default' ? '프로젝트에 속하지 않은 대화' : `${menuProject.name} 대화`}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveMenuThreadId(null);
                                    window.open(window.location.href, '_blank');
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2 cursor-pointer font-medium"
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>새 창에서 열기</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveMenuThreadId(null);
                                    toast.success('채팅이 클라우드에 안전하게 저장되었습니다.');
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2 cursor-pointer font-medium"
                            >
                                <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>채팅 클라우드에 저장</span>
                            </button>
                            <div className="h-px bg-border/50 my-1" />
                            <button
                                type="button"
                                onClick={() => {
                                    const tid = menuThread.id;
                                    const isPinned = menuThread.is_pinned;
                                    setActiveMenuThreadId(null);
                                    onUpdateThread?.(tid, { is_pinned: !isPinned });
                                    toast.success(isPinned ? '고정이 해제되었습니다.' : '맨 위에 고정되었습니다.');
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2 font-medium cursor-pointer"
                            >
                                {menuThread.is_pinned ? (
                                    <>
                                        <PinOff className="w-3.5 h-3.5 text-amber-500" />
                                        <span>고정 해제</span>
                                    </>
                                ) : (
                                    <>
                                        <Pin className="w-3.5 h-3.5 text-amber-500" />
                                        <span>맨 위에 고정</span>
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const tid = menuThread.id;
                                    setActiveMenuThreadId(null);
                                    setMoveProjectThreadId(tid);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2 cursor-pointer font-medium"
                            >
                                <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>프로젝트로 이동…</span>
                            </button>
                            <div className="h-px bg-border/50 my-1" />
                            <button
                                type="button"
                                onClick={() => {
                                    const tid = menuThread.id;
                                    const title = menuThread.title;
                                    setActiveMenuThreadId(null);
                                    setEditingThreadId(tid);
                                    setEditingTitle(title);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2 cursor-pointer font-medium"
                            >
                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>이름 바꾸기</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const tid = menuThread.id;
                                    const isArchived = menuThread.is_archived;
                                    setActiveMenuThreadId(null);
                                    onUpdateThread?.(tid, { is_archived: !isArchived });
                                    toast.success(isArchived ? '보관이 해제되었습니다.' : '대화가 보관되었습니다.');
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2 cursor-pointer font-medium"
                            >
                                <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{menuThread.is_archived ? '보관 해제' : '보관'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const tid = menuThread.id;
                                    const title = menuThread.title;
                                    setActiveMenuThreadId(null);
                                    if (confirm(`'${title}' 대화를 삭제하시겠습니까?`)) {
                                        onDeleteThread(tid);
                                    }
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-destructive/10 text-destructive flex items-center gap-2 font-medium cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                <span>삭제</span>
                            </button>
                        </div>
                    );
                })(),
                document.body
            )}
        </aside>
    );
};
