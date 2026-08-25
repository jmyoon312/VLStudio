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
    Users
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

    const { user, subscription, logout } = useAuth();
    const { avatarSrc: cachedAvatarSrc } = useCachedAvatar(user?.photoURL);
    const [avatarFetchFailed, setAvatarFetchFailed] = React.useState(false);
    const [accountOpen, setAccountOpen] = React.useState(false);
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

    // === Multi-Tab Session Persistence ===
    interface TabMetadata {
        path: string;
        name: string;
    }

    const [openTabs, setOpenTabs] = React.useState<TabMetadata[]>(() => {
        try {
            const saved = localStorage.getItem('viral_loop_open_tabs');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error("Failed to load saved tabs:", e);
        }
        return [];
    });

    const [tabCache, setTabCache] = React.useState<{ [path: string]: React.ReactNode }>({});

    const getTabNameAndIcon = React.useCallback((path: string) => {
        if (path === '/') return { name: '포털 홈', icon: LayoutDashboard };
        for (const group of menuGroups) {
            const item = group.items.find(it => it.path === path);
            if (item) return { name: item.name, icon: item.icon };
        }
        const cleanName = path.split('/').pop()?.replace(/-/g, ' ') || 'Page';
        return { name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1), icon: FileText };
    }, [menuGroups]);

    React.useEffect(() => {
        try {
            localStorage.setItem('viral_loop_open_tabs', JSON.stringify(openTabs));
        } catch (e) {
            console.error("Failed to save tabs:", e);
        }
    }, [openTabs]);

    React.useEffect(() => {
        setMobileMenuOpen(false);
        const { name } = getTabNameAndIcon(location.pathname);

        setTabCache(prev => {
            if (!children) return prev;
            return {
                ...prev,
                [location.pathname]: children
            };
        });

        setOpenTabs(prev => {
            const exists = prev.some(t => t.path === location.pathname);
            if (!exists) {
                return [...prev, { path: location.pathname, name }];
            }
            return prev.map(t => t.path === location.pathname ? { ...t, name } : t);
        });
    }, [location.pathname, children, getTabNameAndIcon]);

    const closeTab = (e: React.MouseEvent, targetPath: string) => {
        e.stopPropagation();
        const tabIndex = openTabs.findIndex(t => t.path === targetPath);
        const newTabs = openTabs.filter(t => t.path !== targetPath);

        setTabCache(prev => {
            const next = { ...prev };
            delete next[targetPath];
            return next;
        });

        setOpenTabs(newTabs);

        if (location.pathname === targetPath) {
            if (newTabs.length > 0) {
                const nextIndex = Math.max(0, tabIndex - 1);
                navigate(newTabs[nextIndex].path);
            } else {
                navigate('/');
            }
        }
    };

    const resetTabs = () => {
        if (openTabs.length <= 1) return;
        const firstTab = openTabs[0];
        setOpenTabs([firstTab]);
        setTabCache(prev => {
            const next: { [path: string]: React.ReactNode } = {};
            if (prev[firstTab.path]) next[firstTab.path] = prev[firstTab.path];
            return next;
        });
        if (location.pathname !== firstTab.path) {
            navigate(firstTab.path);
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
        <div className="relative flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden transition-all duration-300">

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

                <div className="px-4 py-4 shrink-0">
                    <div className="bg-muted p-1 rounded-xl border border-border grid grid-cols-2 gap-1 sidebar-mode-grid">
                        {[
                            { id: 'DISCOVERY', name: '트렌드 분석', sub: '분석', icon: Search },
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
                                        "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all duration-300 border shrink-0",
                                        isActive
                                            ? "bg-card border-border shadow-sm text-primary"
                                            : "bg-transparent border-transparent text-foreground/80 hover:text-foreground hover:bg-card/40"
                                    )}
                                >
                                    <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-foreground/60")} strokeWidth={isActive ? 2.5 : 2} />
                                    <div className="flex flex-col items-start leading-tight hide-on-slim">
                                        <span className={cn("text-[10px] font-extrabold tracking-tight", isActive ? "text-primary" : "text-foreground/80")}>
                                            {mode.name}
                                        </span>
                                        <span className="text-[7px] font-bold opacity-40 uppercase tracking-tighter">
                                            {mode.sub}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <nav className="p-4 flex-1 overflow-y-auto dashboard-scroll-area">
                    <div className="mb-4">
                        <Link
                            to="/"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-1.5 rounded-lg text-[13.5px] font-bold tracking-tight transition-all duration-200 group border border-transparent hover:border-border hover:bg-card hover:text-foreground hover:shadow-sm",
                                location.pathname === '/'
                                    ? "bg-card text-primary shadow-sm border border-border font-extrabold"
                                    : "text-foreground/80 hover:text-foreground hover:bg-card/30"
                            )}
                        >
                            <LayoutDashboard className={cn("w-4 h-4 transition-colors shrink-0", location.pathname === '/' ? "text-primary" : "text-foreground/60 group-hover:text-foreground")} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
                            <span className="flex-1 text-left hide-on-slim truncate">대시보드 홈</span>
                        </Link>
                    </div>

                    {filteredGroups.map((group, i) => {
                        const isExpanded = expandedGroups[group.title] !== false;
                        return (
                            <div key={i} className="mb-4 last:mb-0 border-b border-border/5 pb-4 last:border-0 last:pb-0">
                                <button
                                    onClick={() => toggleGroup(group.title)}
                                    className="flex items-center justify-between w-full px-4 mb-2.5 text-[11px] font-bold text-foreground/60 uppercase tracking-wider hide-on-slim hover:text-foreground transition-colors text-left"
                                >
                                    <span>{group.title}</span>
                                    {isExpanded ? (
                                        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                                    ) : (
                                        <ChevronUp className="w-3 h-3 opacity-60 shrink-0" />
                                    )}
                                </button>
                                {isExpanded && (
                                    <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
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
                                                        "flex items-center gap-3 px-4 py-1.5 rounded-lg text-[13.5px] font-bold tracking-tight transition-all duration-200 group border border-transparent hover:border-border hover:bg-card hover:text-foreground hover:shadow-sm",
                                                        isActive
                                                            ? "bg-card text-primary shadow-sm border border-border font-extrabold"
                                                            : "text-foreground/80 hover:text-foreground hover:bg-card/30"
                                                    )}
                                                >
                                                    <Icon className={cn("w-4 h-4 transition-colors shrink-0", isActive ? "text-primary" : "text-foreground/60 group-hover:text-foreground")} strokeWidth={isActive ? 2.5 : 2} />
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
                <div className="p-3 border-t border-sidebar-border shrink-0 space-y-2">
                    {/* User Account Info Box */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/80 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-extrabold text-xs flex items-center justify-center shrink-0 border border-primary/30">
                                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'G'}
                            </div>
                            <div className="min-w-0 flex-1 hide-on-slim">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-foreground truncate">
                                        {user?.displayName || 'GoGlobal'}
                                    </p>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                                        PRO
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {user?.email || 'go-global@naver.com'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                            title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
                        >
                            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                        </button>
                    </div>
                </div>
            </aside>


            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-hidden relative bg-background flex flex-col transition-all duration-300 md:pl-[var(--sidebar-width)] pl-0">
                <header className="sticky top-0 z-[70] w-full px-4 md:px-8 h-14 flex items-center justify-between bg-card border-b border-border shrink-0">
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
                                    if (location.pathname === '/') return 'Home Portal';
                                    for (const group of menuGroups) {
                                        const item = group.items.find(it => it.path === location.pathname);
                                        if (item) return item.name;
                                    }
                                    return location.pathname.split('/').pop()?.replace(/-/g, ' ');
                                })()}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <div className="hidden sm:block">
                            <MultiWindowController activeViews={activeViews} activeProfileId={activeProfileId} syncViewsAndProfiles={syncViewsAndProfiles} />
                        </div>
                        <GlobalLoopieChat />
                    </div>
                </header>

                {/* Professional Scrollable Tab Bar (Desktop only, clean on mobile) */}
                <div className="hidden sm:flex items-center gap-1 px-4 md:px-8 pt-2 bg-muted/40 border-b border-border overflow-x-auto dashboard-scroll-area shrink-0 select-none h-11">
                    {openTabs.length > 1 && (
                        <button
                            onClick={resetTabs}
                            className="p-1 mr-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-muted-foreground hover:text-rose-600 transition-all flex items-center justify-center shrink-0 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/40 active:scale-95"
                            title="가장 왼쪽 탭만 남기고 모두 닫기"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {openTabs.map((tab) => {
                        const { icon: TabIcon } = getTabNameAndIcon(tab.path);
                        const isTabActive = location.pathname === tab.path;
                        return (
                            <div
                                key={tab.path}
                                onClick={() => navigate(tab.path)}
                                className={cn(
                                    "relative flex items-center gap-2 px-4 py-1.5 rounded-t-lg text-xs font-bold border border-transparent transition-all duration-150 cursor-pointer group shrink-0 -mb-[1px] select-none",
                                    isTabActive
                                        ? "bg-background border-border border-b-transparent text-primary font-extrabold z-10 shadow-[0_-2px_6px_rgba(0,0,0,0.03)]"
                                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                )}
                            >
                                <TabIcon className={cn("w-3.5 h-3.5", isTabActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                <span className="max-w-[120px] truncate">{tab.name}</span>
                                <button
                                    onClick={(e) => closeTab(e, tab.path)}
                                    className="p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors opacity-60 hover:opacity-100"
                                    title="탭 닫기"
                                >
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Direct Page Router View Panel */}
                <div className={cn(
                    "flex-1 flex flex-col custom-scrollbar min-h-0 pb-24 md:pb-6",
                    location.pathname.startsWith('/agent-studio') ? "overflow-hidden" : "overflow-y-auto"
                )}>
                    <div className="flex-grow flex flex-col min-h-0 p-3 sm:p-6 max-w-[1600px] w-full mx-auto">
                        {children}
                    </div>
                    <Footer className={cn(location.pathname === '/' ? "px-12" : "px-4 sm:px-6")} />
                </div>
            </main>

            {/* Mobile Bottom Navigation Bar (Pixeling-grade App Bar) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/80 flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)] px-2 shadow-lg select-none">
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
                    <span>대기열</span>
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