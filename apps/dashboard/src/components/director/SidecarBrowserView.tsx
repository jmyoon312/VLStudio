import React, { useState, useEffect } from 'react';
import {
    Globe,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    ExternalLink,
    Lock,
    Search,
    Plus,
    X,
    MessageSquarePlus,
    Sparkles,
    Video
} from 'lucide-react';

interface BrowserTab {
    id: string;
    title: string;
    url: string;
    icon?: 'search' | 'youtube' | 'globe';
}

interface SidecarBrowserViewProps {
    isOpen: boolean;
    onClose: () => void;
    activeUrl?: string;
    onSendToChat?: (text: string) => void;
}

export const SidecarBrowserView: React.FC<SidecarBrowserViewProps> = ({
    isOpen,
    onClose,
    activeUrl,
    onSendToChat
}) => {
    const [tabs, setTabs] = useState<BrowserTab[]>([
        {
            id: 'tab-google',
            title: '구글 실시간 검색',
            url: 'https://www.google.com/search?igu=1',
            icon: 'search'
        },
        {
            id: 'tab-youtube',
            title: 'YouTube 트렌드 탐색',
            url: 'https://www.youtube.com',
            icon: 'youtube'
        }
    ]);
    const [activeTabId, setActiveTabId] = useState<string>('tab-google');
    const [inputUrl, setInputUrl] = useState<string>('https://www.google.com/search?igu=1');
    const [isLoading, setIsLoading] = useState(false);

    // Sync external navigation event from AI
    useEffect(() => {
        if (activeUrl) {
            const isYt = activeUrl.includes('youtube.com') || activeUrl.includes('youtu.be');
            const newTab: BrowserTab = {
                id: `tab-${Date.now()}`,
                title: isYt ? 'YouTube 검색' : '실시간 리서치',
                url: activeUrl,
                icon: isYt ? 'youtube' : 'search'
            };
            setTabs(prev => [newTab, ...prev.slice(0, 4)]);
            setActiveTabId(newTab.id);
            setInputUrl(activeUrl);
        }
    }, [activeUrl]);

    const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];

    const handleSelectTab = (tab: BrowserTab) => {
        setActiveTabId(tab.id);
        setInputUrl(tab.url);
    };

    const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        if (tabs.length <= 1) return;
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);
        if (activeTabId === tabId) {
            setActiveTabId(newTabs[0].id);
            setInputUrl(newTabs[0].url);
        }
    };

    const handleAddTab = () => {
        const newTab: BrowserTab = {
            id: `tab-${Date.now()}`,
            title: '새 탭',
            url: 'https://www.google.com/search?igu=1',
            icon: 'search'
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
        setInputUrl(newTab.url);
    };

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let target = inputUrl.trim();
        if (!target) return;
        if (!target.startsWith('http://') && !target.startsWith('https://')) {
            target = `https://www.google.com/search?q=${encodeURIComponent(target)}&igu=1`;
        }
        setIsLoading(true);
        setTabs(prev =>
            prev.map(t => (t.id === activeTabId ? { ...t, url: target, title: target.slice(0, 16) } : t))
        );
        setTimeout(() => setIsLoading(false), 800);
    };

    if (!isOpen) return null;

    return (
        <div className="w-[45%] min-w-[360px] max-w-[680px] h-full flex flex-col border-l border-border bg-card/95 backdrop-blur-md shadow-2xl relative z-20 transition-all duration-300">
            {/* Top Multi-Tab Bar (Benchmarked 1:1 with Codex Desktop Sidecar) */}
            <div className="h-10 border-b border-border bg-muted/40 flex items-center px-2 gap-1 overflow-x-auto no-scrollbar">
                {tabs.map(tab => {
                    const isActive = tab.id === activeTabId;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => handleSelectTab(tab)}
                            className={`group h-7 max-w-[160px] px-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs font-medium border transition-all truncate select-none ${
                                isActive
                                    ? 'bg-card border-border shadow-xs text-foreground font-semibold'
                                    : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            }`}
                        >
                            {tab.icon === 'youtube' ? (
                                <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            ) : tab.icon === 'search' ? (
                                <Search className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            ) : (
                                <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span className="truncate">{tab.title}</span>
                            {tabs.length > 1 && (
                                <button
                                    onClick={e => handleCloseTab(e, tab.id)}
                                    className="opacity-0 group-hover:opacity-100 hover:bg-muted p-0.5 rounded-sm shrink-0 ml-auto transition-opacity"
                                >
                                    <X className="w-3 h-3 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    );
                })}
                <button
                    onClick={handleAddTab}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                    title="새 탭 추가"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>

                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                        title="브라우저 뷰 닫기"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Address Bar & Controls */}
            <div className="h-10 px-3 border-b border-border bg-card flex items-center gap-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                    <button
                        type="button"
                        onClick={() => {}}
                        className="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30"
                        title="뒤로 가기"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {}}
                        className="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30"
                        title="앞으로 가기"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsLoading(true);
                            setTimeout(() => setIsLoading(false), 500);
                        }}
                        className={`p-1 rounded-md hover:bg-muted transition-colors ${isLoading ? 'animate-spin' : ''}`}
                        title="새로고침"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                </div>

                <form onSubmit={handleUrlSubmit} className="flex-1 min-w-0">
                    <div className="h-7 px-2.5 rounded-lg border border-border bg-muted/30 focus-within:border-primary/60 focus-within:bg-card flex items-center gap-1.5 transition-all text-xs">
                        <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={e => setInputUrl(e.target.value)}
                            className="flex-1 min-w-0 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-xs font-mono"
                            placeholder="URL 또는 검색어 입력..."
                        />
                    </div>
                </form>

                <button
                    onClick={() => window.open(currentTab.url, '_blank')}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="외부 브라우저에서 열기"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Web View Container */}
            <div className="flex-1 relative bg-background overflow-hidden flex flex-col">
                {isLoading && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden z-30">
                        <div className="w-1/2 h-full bg-primary animate-pulse" />
                    </div>
                )}

                <iframe
                    key={currentTab.id + currentTab.url}
                    src={currentTab.url}
                    className="w-full h-full border-none bg-background"
                    title={currentTab.title}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    onLoad={() => setIsLoading(false)}
                />

                {/* Bottom Floating Ask AI / Send to Chat Button (Matches Codex Desktop 'Ask AI') */}
                <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (onSendToChat) {
                                onSendToChat(`현재 브라우저에 표시된 정보(${currentTab.url})를 참고해서 이 내용을 30초 바이럴 쇼츠 대본으로 구성해줘.`);
                            }
                        }}
                        className="h-9 px-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask AI (대화창 전달)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
