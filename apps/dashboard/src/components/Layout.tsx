import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ListVideo,
    Image,
    Settings,
    Zap,
    Download,
    Moon,
    Sun,
    Languages,
    Scissors,
    LayoutGrid,
    Mic,
    Edit,
    Clapperboard,
    Radio,
    TrendingUp,
    Wand2,
    Eraser,
    Sparkles,
    UploadCloud,
    Share2,
    Activity,
    Globe,
    FileText,
    BarChart3,
    Shield,
    Search,
    Palette,
    Settings2,
    GraduationCap,
    User,
    LogOut,
    CreditCard,
    ChevronUp,
    ChevronDown,
    RotateCcw,
    Menu,
    X,
    Layers,
    Users,
    Plus
} from 'lucide-react';

import { cn } from '../lib/utils';
import { useTheme } from './theme-provider';
import { Toaster, toast } from 'sonner';
import api from '@/lib/api';
import { getMenuGroups } from '../config/menu';
import GlobalLoopieChat from './GlobalLoopieChat';
import Footer from './Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useCachedAvatar } from '../features/flow2capcut/hooks/useCachedAvatar';
import { createPortalSession } from '@/firebase/functions';
import MultiWindowController from './MultiWindowController';
import { ProfileManagerModal } from './Account/ProfileManagerModal';


const Layout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [captainId, setCaptainId] = React.useState<string | null>(null);
    const [activeViews, setActiveViews] = React.useState<string[]>([]);
    const [activeProfileId, setActiveProfileId] = React.useState<string>('default');
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);

    // Every Proxy / SOCKS5 Proxy Architecture: Legacy Windows Adapter Metric UAC optimization is no longer needed.
    const [netStatus, setNetStatus] = React.useState<any>(null);

    const checkNetworkStatus = async () => {
        try {
            const res = await api.get(`/resources/network/status?t=${Date.now()}`);
            setNetStatus(res.data);
        } catch (e) {
            // Silent catch to prevent console error spam during backend restart
        }
    };

    React.useEffect(() => {
        checkNetworkStatus();
    }, []);

    const syncViewsAndProfiles = async () => {
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj) {
                const viewsRes = await apiObj.getActiveViews();
                if (viewsRes && Array.isArray(viewsRes.views)) {
                    setActiveViews(viewsRes.views.map((v: any) => v.profileId));
                }
                const config = await apiObj.loadProfiles();
                if (config?.activeProfileId) {
                    setActiveProfileId(config.activeProfileId);
                }
            }
        } catch (e) {
            // Silent catch
        }
    };

    React.useEffect(() => {
        syncViewsAndProfiles();
    }, []);

    React.useEffect(() => {
        const isFlowActivePage = location.pathname === '/flow2capcut' || location.pathname === '/creative-studio';

        const apiObj = (window as any).electronAPI;
        if (apiObj?.setFlowTabActive) {
            apiObj.setFlowTabActive({ active: isFlowActivePage });
        }
        if (isFlowActivePage) {
            // 이미 로그인된 1번 기본 프로필('default')을 단일 활성 창으로 띄움
            if (apiObj?.createFlowView) {
                apiObj.createFlowView({ profileId: 'default' }).catch(() => {});
            }
            if (apiObj?.switchProfile) {
                apiObj.switchProfile({ profileId: 'default' }).catch(() => {});
            }
            if (apiObj?.setLayout) {
                apiObj.setLayout({ mode: 'split-left', ratio: 0.45 }).catch(() => {});
            }
            syncViewsAndProfiles();
        }
    }, [location.pathname]);

    const { user, subscription, logout, activeProfile } = useAuth();
    const { avatarSrc: cachedAvatarSrc } = useCachedAvatar(user?.photoURL);
    const [avatarFetchFailed, setAvatarFetchFailed] = React.useState(false);
    const [accountOpen, setAccountOpen] = React.useState(false);
    const [profileManagerOpen, setProfileManagerOpen] = React.useState(false);
    const [portalLoading, setPortalLoading] = React.useState(false);

    const handleAvatarError = () => {
        setAvatarFetchFailed(true);
    };

    const handleManageSubscription = async () => {
        try {
            setPortalLoading(true);
            const portalUrl = await createPortalSession();
            if (portalUrl) {
                window.open(portalUrl, '_blank');
            } else {
                toast.error('구독 관리 포털을 열 수 없습니다. 잠시 후 다시 시도해 주세요.');
            }
        } catch (error) {
            console.error('Lemon Squeezy Portal failed:', error);
        } finally {
            setPortalLoading(false);
            setAccountOpen(false);
        }
    };

    const handleLogout = async () => {
        try {
            setAccountOpen(false);
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    React.useEffect(() => {
        api.get("/resources/profiles?type=CAPTAIN&status=ACTIVE")
            .then(res => {
                const data = res.data;
                if (Array.isArray(data) && data.length > 0) {
                    setCaptainId(data[0].id);
                }
            })
            .catch(err => console.error("Failed to load captain profile:", err));
    }, []);

    const menuGroups = React.useMemo(() => getMenuGroups(captainId), [captainId]);
    const [activeMode, setActiveMode] = React.useState('CREATION');

    const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (menuGroups.length > 0) {
            setExpandedGroups(prev => {
                const next = { ...prev };
                menuGroups.forEach(g => {
                    if (next[g.title] === undefined) {
                        next[g.title] = g.defaultExpanded !== false;
                    }
                });
                return next;
            });
        }
    }, [menuGroups]);

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    // === Pixeling-Style Multi-Tab State Architecture ===
    interface TabItem {
        id: string;
        path: string;
        name: string;
        flowWorkerId?: string; // 탭 전용 Flow 창/워커 ID (1번창: 'default', 2번창: 'profile2', 3번창: 'profile3' 등)
    }

    const getWorkerIdForIndex = (idx: number) => {
        if (idx === 0) return 'default';
        return `profile${idx + 1}`;
    };

    const [tabs, setTabs] = React.useState<TabItem[]>(() => {
        try {
            const saved = localStorage.getItem('viral_loop_multi_tabs');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((t: any, idx: number) => ({
                        ...t,
                        flowWorkerId: t.flowWorkerId || getWorkerIdForIndex(idx)
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to load saved tabs:", e);
        }
        return [{ id: 'tab-main', path: '/', name: '대시보드 홈', flowWorkerId: 'default' }];
    });

    const [activeTabId, setActiveTabId] = React.useState<string>(() => {
        try {
            const savedActive = localStorage.getItem('viral_loop_active_tab_id');
            if (savedActive) return savedActive;
        } catch (e) {}
        return 'tab-main';
    });

    const getTabNameAndIcon = React.useCallback((path: string) => {
        if (path === '/') return { name: '대시보드 홈', icon: LayoutDashboard };
        for (const group of menuGroups) {
            const item = group.items.find(it => it.path === path);
            if (item) return { name: item.name, icon: item.icon };
        }
        const cleanName = path.split('/').pop()?.replace(/-/g, ' ') || '페이지';
        return { name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1), icon: FileText };
    }, [menuGroups]);

    // Save tabs to localStorage
    React.useEffect(() => {
        try {
            localStorage.setItem('viral_loop_multi_tabs', JSON.stringify(tabs));
            localStorage.setItem('viral_loop_active_tab_id', activeTabId);
        } catch (e) {
            console.error("Failed to save tabs:", e);
        }
    }, [tabs, activeTabId]);

    // Switch active tab and activate its dedicated Flow worker window
    const selectTab = (tab: TabItem) => {
        setActiveTabId(tab.id);
        const workerId = tab.flowWorkerId || 'default';
        setActiveProfileId(workerId);

        const isFlowActivePage = tab.path === '/flow2capcut' || tab.path === '/creative-studio';
        const apiObj = (window as any).electronAPI;
        if (apiObj) {
            apiObj.setFlowTabActive?.({ active: isFlowActivePage });
            if (isFlowActivePage) {
                apiObj.createFlowView?.({ profileId: workerId }).catch(() => {});
                apiObj.switchProfile?.({ profileId: workerId }).catch(() => {});
                apiObj.setLayout?.({ mode: 'split-left', ratio: 0.45 }).catch(() => {});
            }
            syncViewsAndProfiles();
        }
        navigate(tab.path);
    };

    // When navigating, update the CURRENT active tab instead of creating endless new tabs
    React.useEffect(() => {
        setMobileMenuOpen(false);
        const { name } = getTabNameAndIcon(location.pathname);

        setTabs(prev => {
            if (prev.length === 0) {
                return [{ id: 'tab-main', path: location.pathname, name, flowWorkerId: 'default' }];
            }
            return prev.map((t, idx) => t.id === activeTabId ? {
                ...t,
                path: location.pathname,
                name,
                flowWorkerId: t.flowWorkerId || getWorkerIdForIndex(idx)
            } : t);
        });

        // 현재 활성 탭의 flowWorkerId로 Electron 창 자동 활성화
        const curTab = tabs.find(t => t.id === activeTabId);
        const curWorkerId = curTab?.flowWorkerId || 'default';
        const isFlowActivePage = location.pathname === '/flow2capcut' || location.pathname === '/creative-studio';
        const apiObj = (window as any).electronAPI;

        if (apiObj) {
            apiObj.setFlowTabActive?.({ active: isFlowActivePage });
            if (isFlowActivePage) {
                apiObj.createFlowView?.({ profileId: curWorkerId }).catch(() => {});
                apiObj.switchProfile?.({ profileId: curWorkerId }).catch(() => {});
                apiObj.setLayout?.({ mode: 'split-left', ratio: 0.45 }).catch(() => {});
            }
            syncViewsAndProfiles();
        }
    }, [location.pathname, activeTabId, getTabNameAndIcon]);

    // Create a new independent tab (Pixeling [+] button)
    const addNewTab = () => {
        const newIdx = tabs.length;
        const newId = `tab-${Date.now()}`;
        const newWorkerId = getWorkerIdForIndex(newIdx);
        const newTab: TabItem = { id: newId, path: '/', name: '대시보드 홈', flowWorkerId: newWorkerId };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
        setActiveProfileId(newWorkerId);

        const apiObj = (window as any).electronAPI;
        if (apiObj?.createFlowView) {
            apiObj.createFlowView({ profileId: newWorkerId }).catch(() => {});
        }
        navigate('/');
    };

    // Close specific tab
    const closeTab = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        const targetTab = tabs.find(t => t.id === tabId);
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        const newTabs = tabs.filter(t => t.id !== tabId);

        // 닫힌 탭의 워커 뷰 정리
        if (targetTab?.flowWorkerId && targetTab.flowWorkerId !== 'default') {
            const apiObj = (window as any).electronAPI;
            apiObj?.destroyFlowView?.({ profileId: targetTab.flowWorkerId }).catch(() => {});
        }

        if (newTabs.length === 0) {
            const fallbackTab: TabItem = { id: `tab-${Date.now()}`, path: '/', name: '대시보드 홈', flowWorkerId: 'default' };
            setTabs([fallbackTab]);
            setActiveTabId(fallbackTab.id);
            setActiveProfileId('default');
            navigate('/');
            return;
        }

        setTabs(newTabs);

        if (activeTabId === tabId) {
            const nextIndex = Math.max(0, tabIndex - 1);
            const nextTab = newTabs[nextIndex];
            selectTab(nextTab);
        }
    };

    React.useEffect(() => {
        for (const group of menuGroups) {
            const hasMatch = group.items.some(item =>
                item.path.startsWith('/captain')
                    ? location.pathname.startsWith('/captain') && item.path.includes('channels') === location.pathname.includes('channels')
                    : location.pathname === item.path
            );
            if (hasMatch) {
                setActiveMode(group.mode);
                break;
            }
        }
    }, [location.pathname, menuGroups]);

    const filteredGroups = React.useMemo(() => {
        return menuGroups.filter(g => g.mode === activeMode);
    }, [menuGroups, activeMode]);

    const modeName = React.useMemo(() => {
        switch (activeMode) {
            case 'DISCOVERY': return '트렌드 분석';
            case 'CREATION': return '콘텐츠 제작';
            case 'OPERATION': return '채널 운영';
            case 'EDUCATION': return '시스템 설정';
            default: return activeMode;
        }
    }, [activeMode]);

    return (
        <div className="relative flex h-[100dvh] min-h-[100dvh] bg-background text-foreground font-sans antialiased overflow-hidden transition-all duration-300">

            {/* Mobile Drawer Backdrop */}
            <div 
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-xs z-[85] transition-opacity duration-300 md:hidden",
                    mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* Sidebar (Desktop Fixed & Mobile Slide Drawer) */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-[90] w-[var(--sidebar-width)] max-w-[85vw] border-r border-sidebar-border bg-sidebar flex flex-col shadow-xl md:shadow-sm transition-transform duration-300 ease-in-out",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="flex h-14 items-center justify-between px-6 border-b border-sidebar-border shrink-0 sidebar-logo-container">
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 font-bold tracking-tighter transition-opacity hover:opacity-80">
                        <div className="w-7 h-7 bg-primary rounded-[8px] flex items-center justify-center shadow-[0_2px_4px_rgba(37,99,235,0.2)] shrink-0">
                            <Zap className="w-4 h-4 text-white fill-white" />
                        </div>
                        <div className="flex items-baseline gap-1.5 hide-on-slim">
                            <span className="text-[19px] font-extrabold text-foreground leading-none">ViraLoop</span>
                            <span className="text-[9px] font-bold text-muted-foreground tracking-tighter uppercase">v3.5</span>
                        </div>
                    </Link>
                    {/* Mobile Close Button */}
                    <button 
                        onClick={() => setMobileMenuOpen(false)} 
                        className="p-1.5 -mr-2 rounded-lg text-muted-foreground hover:text-foreground md:hidden"
                        title="메뉴 닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-3.5 pt-3 pb-2 shrink-0">
                    <div className="bg-[#f0f3f8] dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80 p-1.5 rounded-2xl grid grid-cols-2 gap-1.5 sidebar-mode-grid">
                        {[
                            { id: 'DISCOVERY', name: '트렌드 분석', sub: '탐색', icon: Search },
                            { id: 'CREATION', name: '콘텐츠 제작', sub: '제작', icon: Palette },
                            { id: 'OPERATION', name: '채널 운영', sub: '운영', icon: Settings2 },
                            { id: 'EDUCATION', name: '시스템 설정', sub: '설정', icon: GraduationCap },
                        ].map((mode) => {
                            const Icon = mode.icon;
                            const isActive = activeMode === mode.id;
                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => setActiveMode(mode.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all duration-200 shrink-0 text-left",
                                        isActive
                                            ? "bg-white dark:bg-zinc-800 text-primary font-bold shadow-xs border border-border/30 dark:border-zinc-700/60"
                                            : "bg-transparent border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-zinc-800/50"
                                    )}
                                >
                                    <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} strokeWidth={1.8} />
                                    <div className="flex items-baseline gap-1 min-w-0 hide-on-slim truncate">
                                        <span className={cn("text-[11.5px] tracking-tight truncate", isActive ? "font-bold text-foreground" : "font-medium")}>
                                            {mode.name}
                                        </span>
                                        <span className="text-[9.5px] text-muted-foreground/60 font-normal shrink-0">
                                            {mode.sub}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <nav className="px-3 py-2 flex-1 overflow-y-auto dashboard-scroll-area pb-28 md:pb-4 space-y-3">
                    <div>
                        <Link
                            to="/"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] tracking-tight transition-all duration-150 group",
                                location.pathname === '/'
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "text-foreground/75 hover:text-foreground hover:bg-muted/60 font-medium"
                            )}
                        >
                            <LayoutDashboard className={cn("w-4 h-4 transition-colors shrink-0", location.pathname === '/' ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.8} />
                            <span className="flex-1 text-left hide-on-slim truncate">대시보드 홈</span>
                        </Link>
                    </div>

                    {filteredGroups.map((group, i) => {
                        const isExpanded = expandedGroups[group.title] !== false;
                        return (
                            <div key={i} className="space-y-1">
                                <button
                                    onClick={() => toggleGroup(group.title)}
                                    className="flex items-center justify-between w-full px-3 py-1 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider hide-on-slim hover:text-foreground transition-colors text-left"
                                >
                                    <span>{group.title}</span>
                                    {isExpanded ? (
                                        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                                    ) : (
                                        <ChevronUp className="w-3 h-3 opacity-60 shrink-0" />
                                    )}
                                </button>
                                {isExpanded && (
                                    <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                        {group.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = item.path.startsWith('/captain')
                                                ? location.pathname.startsWith('/captain') && item.path.includes('channels') === location.pathname.includes('channels')
                                                : location.pathname === item.path;
                                            return (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] tracking-tight transition-all duration-150 group",
                                                        isActive
                                                            ? "bg-primary/10 text-primary font-bold"
                                                            : "text-foreground/75 hover:text-foreground hover:bg-muted/60 font-medium"
                                                    )}
                                                >
                                                    <Icon className={cn("w-4 h-4 transition-colors shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.8} />
                                                    <span className="flex-1 text-left hide-on-slim truncate">{item.name}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Sidebar Bottom: User Profile Card & Theme Toggle (Pixeling Style) */}
                <div className="p-2 border-t border-sidebar-border shrink-0 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                    {/* User Account Info Box */}
                    <div className="user-account-box flex items-center justify-between p-2 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-primary/50 transition-all gap-2.5">
                        <button
                            type="button"
                            onClick={() => setProfileManagerOpen(true)}
                            className="flex items-center gap-3 min-w-0 text-left flex-1 group"
                            title="계정 및 PIN 번호 관리"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/15 text-base flex items-center justify-center shrink-0 border border-primary/30 group-hover:scale-105 transition-transform">
                                {activeProfile?.avatar || '👤'}
                            </div>
                            <div className="min-w-0 flex-1 hide-on-slim">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                        {activeProfile?.name || user?.displayName || 'GoGlobal'}
                                    </p>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/15 text-primary">
                                        PRO
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate font-mono">
                                    {activeProfile?.role === 'admin' ? '마스터 관리자' : activeProfile?.role === 'creator' ? '숏폼 기획팀' : '배포 에이전트'}
                                </p>
                            </div>
                        </button>
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 ml-1"
                            title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
                        >
                            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Profile & PIN Management Dialog */}
            <ProfileManagerModal
                open={profileManagerOpen}
                onOpenChange={setProfileManagerOpen}
            />


            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-hidden relative bg-background flex flex-col transition-all duration-300 md:pl-[var(--sidebar-width)] pl-0">
                <header className="sticky top-0 z-[9990] w-full px-4 md:px-8 h-14 flex items-center justify-between bg-card border-b border-border shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button 
                            onClick={() => setMobileMenuOpen(true)} 
                            className="md:hidden p-1.5 -ml-1 rounded-lg text-foreground hover:bg-muted shrink-0 transition-colors"
                            title="전체 메뉴 열기"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter hidden sm:inline">{modeName}</span>
                            <span className="text-border font-light text-xs hidden sm:inline">|</span>
                            <h1 className="text-[13px] font-bold text-foreground tracking-tight truncate">
                                {(() => {
                                    if (location.pathname === '/') return '대시보드 홈';
                                    for (const group of menuGroups) {
                                        const item = group.items.find(it => it.path === location.pathname);
                                        if (item) return item.name;
                                    }
                                    return location.pathname.split('/').pop()?.replace(/-/g, ' ');
                                })()}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        <MultiWindowController 
                            activeViews={activeViews} 
                            activeProfileId={activeProfileId} 
                            syncViewsAndProfiles={syncViewsAndProfiles} 
                            tabs={tabs}
                            onSelectTab={selectTab}
                        />
                        <GlobalLoopieChat />
                    </div>
                </header>

                {/* Pixeling-Style Modern Tab Bar (Desktop Only, Plus Button Multi-Tabs) */}
                <div className="hidden sm:flex items-center gap-1 px-4 md:px-8 pt-2 bg-muted/30 border-b border-border overflow-x-auto dashboard-scroll-area shrink-0 select-none h-11">
                    {tabs.map((tab) => {
                        const { icon: TabIcon } = getTabNameAndIcon(tab.path);
                        const isTabActive = tab.id === activeTabId;
                        return (
                            <div
                                key={tab.id}
                                onClick={() => selectTab(tab)}
                                className={cn(
                                    "relative flex items-center gap-2 px-3.5 py-1.5 rounded-t-xl text-xs font-bold border border-transparent transition-all duration-150 cursor-pointer group shrink-0 -mb-[1px] select-none",
                                    isTabActive
                                        ? "bg-background border-border border-b-transparent text-primary font-extrabold z-10 shadow-[0_-2px_6px_rgba(0,0,0,0.02)]"
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                )}
                            >
                                <TabIcon className={cn("w-3.5 h-3.5", isTabActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                <span className="max-w-[130px] truncate">{tab.name}</span>
                                {tabs.length > 1 && (
                                    <button
                                        onClick={(e) => closeTab(e, tab.id)}
                                        className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-40 hover:opacity-100"
                                        title="탭 닫기"
                                    >
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Pixeling-Style [+] Add New Tab Button */}
                    <button
                        onClick={addNewTab}
                        className="p-1.5 ml-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center shrink-0 border border-transparent hover:border-primary/20 active:scale-95"
                        title="새 탭 추가 (멀티태스킹)"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Direct Page Router View Panel */}
                {(location.pathname === '/flow2capcut' || location.pathname === '/creative-studio') ? (
                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto w-full h-full pb-16 md:pb-0 box-border custom-scrollbar">
                        {children}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col custom-scrollbar min-h-0 overflow-y-auto">
                        <div className="flex-grow flex flex-col min-h-0 p-3 sm:p-6 max-w-[1600px] w-full mx-auto pb-36 md:pb-16">
                            {children}
                        </div>
                        <Footer className={cn(location.pathname === '/' ? "px-12" : "px-4 sm:px-6")} />
                        {/* Explicit Mobile/Desktop Bottom Navigation Clearance Spacer */}
                        <div className="h-36 md:h-12 shrink-0 pointer-events-none" aria-hidden="true" />
                    </div>
                )}
            </main>

            {/* Mobile Bottom Navigation Bar (Pixeling-grade App Bar) */}
            <nav className={cn(
                "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/80 flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)] px-2 shadow-lg select-none transition-all duration-300",
                mobileMenuOpen ? "opacity-0 pointer-events-none translate-y-full" : "opacity-100 pointer-events-auto translate-y-0"
            )}>
                <button 
                    onClick={() => { navigate('/'); setMobileMenuOpen(false); }} 
                    className={cn(
                        "flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl gap-0.5 text-[11px] font-medium transition-all duration-150 active:scale-95", 
                        location.pathname === '/' 
                            ? "bg-primary/10 text-primary font-bold shadow-2xs" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <LayoutDashboard className="w-5 h-5" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
                    <span>홈</span>
                </button>
                <button 
                    onClick={() => { navigate('/work-queue'); setMobileMenuOpen(false); }} 
                    className={cn(
                        "flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl gap-0.5 text-[11px] font-medium transition-all duration-150 active:scale-95", 
                        location.pathname === '/work-queue' 
                            ? "bg-primary/10 text-primary font-bold shadow-2xs" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <Layers className="w-5 h-5" strokeWidth={location.pathname === '/work-queue' ? 2.5 : 2} />
                    <span>배포관리</span>
                </button>
                <button 
                    onClick={() => { navigate('/incubator'); setMobileMenuOpen(false); }} 
                    className={cn(
                        "flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl gap-0.5 text-[11px] font-medium transition-all duration-150 active:scale-95", 
                        location.pathname.startsWith('/incubator') 
                            ? "bg-primary/10 text-primary font-bold shadow-2xs" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <Users className="w-5 h-5" strokeWidth={location.pathname.startsWith('/incubator') ? 2.5 : 2} />
                    <span>육성관리</span>
                </button>
                <button 
                    onClick={() => { navigate('/gallery'); setMobileMenuOpen(false); }} 
                    className={cn(
                        "flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl gap-0.5 text-[11px] font-medium transition-all duration-150 active:scale-95", 
                        location.pathname === '/gallery' 
                            ? "bg-primary/10 text-primary font-bold shadow-2xs" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <Image className="w-5 h-5" strokeWidth={location.pathname === '/gallery' ? 2.5 : 2} />
                    <span>보관함</span>
                </button>
                <button 
                    onClick={() => setMobileMenuOpen(true)} 
                    className={cn(
                        "flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl gap-0.5 text-[11px] font-medium transition-all duration-150 active:scale-95", 
                        mobileMenuOpen 
                            ? "bg-primary/10 text-primary font-bold shadow-2xs" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <Menu className="w-5 h-5" />
                    <span>메뉴</span>
                </button>
            </nav>


            <Toaster position="top-right" richColors />

        </div>
    );
};

export default Layout;