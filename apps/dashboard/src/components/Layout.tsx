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
    ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from './theme-provider';
import { Toaster } from 'sonner';
import api from '@/lib/api';
import { getMenuGroups } from '../config/menu';
import GlobalLoopieChat from './GlobalLoopieChat';
import Footer from './Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useCachedAvatar } from '../features/flow2capcut/hooks/useCachedAvatar';
import { createPortalSession } from '@/firebase/functions';

// ── 분할 레이아웃 빠른 접근 버튼 ──────────────────────────────────────
// flow2capcut 헤더에서 GlobalLoopieChat 옆에 표시됨
// ─────────────────────────────────────────────────────────────────────
const SPLIT_MODES = [
    { value: 'split-left', label: 'Flow 좌측', icon: '⬅⬜' },
    { value: 'split-right', label: 'Flow 우측', icon: '⬜➡' },
    { value: 'split-top', label: 'Flow 상단', icon: '⬆' },
    { value: 'split-bottom', label: 'Flow 하단', icon: '⬇' },
];

function SplitLayoutControl() {
    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState(() => {
        try { return JSON.parse(localStorage.getItem('layoutSettings') || '{}').mode || 'split-left'; } catch { return 'split-left'; }
    });
    const [ratio, setRatio] = React.useState(() => {
        try { return Math.round((JSON.parse(localStorage.getItem('layoutSettings') || '{}').ratio || 0.5) * 100); } catch { return 50; }
    });
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const apply = (m: string, r: number) => {
        localStorage.setItem('layoutSettings', JSON.stringify({ mode: m, ratio: r / 100 }));
        (window as any).electronAPI?.setLayout?.({ mode: m, ratio: r / 100 });
    };

    const cur = SPLIT_MODES.find(m => m.value === mode) || SPLIT_MODES[0];

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
            <button
                title="화면 레이아웃 설정"
                onClick={() => setOpen(v => !v)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            >
                <span style={{ fontSize: '14px' }}>{cur.icon}</span>
                <span>{ratio}%</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
            </button>
            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '220px', padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>📐 화면 배치</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {SPLIT_MODES.map(m => (
                            <button key={m.value} onClick={() => { setMode(m.value); apply(m.value, ratio); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 6px', border: `1px solid ${mode === m.value ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '8px', background: mode === m.value ? 'rgba(59,130,246,0.08)' : 'transparent', color: mode === m.value ? '#3b82f6' : '#6b7280', cursor: 'pointer', fontSize: '11px', fontWeight: mode === m.value ? 700 : 500, transition: 'all 0.15s' }}>
                                <span style={{ fontSize: '16px' }}>{m.icon}</span>
                                <span>{m.label}</span>
                            </button>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Flow 창 크기: {ratio}%</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>20%</span>
                            <input type="range" min="20" max="80" step="5" value={ratio} onChange={e => { const v = parseInt(e.target.value); setRatio(v); apply(mode, v); }} style={{ flex: 1, accentColor: '#3b82f6' }} />
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>80%</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>💡 경계선 더블클릭 → 50:50 리셋</div>
                </div>
            )}
        </div>
    );
}

function ActiveViewsControl({ activeViews, activeProfileId, syncViewsAndProfiles }: { activeViews: string[], activeProfileId: string, syncViewsAndProfiles: () => void }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const [profilesList, setProfilesList] = React.useState<any[]>([]);
    const location = useLocation();

    React.useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const fetchProfiles = () => {
        api.get("/resources/profiles?type=TIN_CAN")
            .then(res => setProfilesList(res.data || []))
            .catch(err => console.warn("Failed to load profiles for view control:", err));
    };

    React.useEffect(() => {
        if (open) {
            fetchProfiles();
        }
    }, [open]);

    // Gather and group profiles
    const tinCanProfiles = React.useMemo(() => {
        return profilesList.filter(p => p.status?.toLowerCase() === 'active');
    }, [profilesList]);

    const standbyProfiles = React.useMemo(() => {
        return tinCanProfiles.filter(p => !activeViews.includes(p.id));
    }, [tinCanProfiles, activeViews]);

    const hasActiveViews = activeViews.length > 0;

    // Location-based help tip
    const locationTip = React.useMemo(() => {
        if (location.pathname === '/') {
            return "💡 포털 홈 작업 중 - Flow 메인 (1번 창) 선택 권장";
        } else if (location.pathname.includes('creation') || location.pathname.includes('video')) {
            return "💡 콘텐츠 제작 작업 중 - Flow 메인 (1번 창) 선택 권장";
        } else if (location.pathname.includes('channels') || location.pathname.includes('distribution')) {
            return "💡 채널 자동배포 작업 중 - 해당 유튜브 채널 스플릿 창 선택 권장";
        }
        return "💡 직관적인 그리드 맵을 눌러 제어할 창을 신속하게 전환하세요.";
    }, [location.pathname]);

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
            <button
                title="구동 중인 다중창 및 구글 계정 관리"
                onClick={() => setOpen(v => !v)}
                style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '6px 12px', 
                    border: `1px solid ${hasActiveViews ? '#3b82f6' : '#cbd5e1'}`, 
                    borderRadius: '8px', 
                    background: hasActiveViews ? 'rgba(59,130,246,0.05)' : '#f8fafc', 
                    color: hasActiveViews ? '#3b82f6' : '#64748b', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    transition: 'all 0.15s' 
                }}
                className={hasActiveViews ? "animate-pulse" : ""}
            >
                <span>🖥️</span>
                <span>{hasActiveViews ? `구동 중: ${activeViews.length}` : '다중창 관리'}</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
            </button>
            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '330px', padding: '14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Header Title */}
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🖥️ 다중창 통합 관제 센터</span>
                        <span style={{ fontSize: '9px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>MAX 4 GRIDS</span>
                    </div>

                    {/* DYNAMIC SCREEN LAYOUT MINI-MAP (그리드 배치 시각화도) */}
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>📐 다중창 화면 배치도 (클릭 시 선택)</div>
                        {activeViews.length === 0 ? (
                            <div style={{ height: '54px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                                구동 중인 다중창이 없습니다.
                            </div>
                        ) : (
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: activeViews.length === 1 ? '1fr' : '1fr 1fr',
                                gap: '4px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '4px',
                                background: '#f8fafc'
                            }}>
                                {activeViews.slice(0, 4).map((viewId, idx) => {
                                    const isDefault = viewId === 'default' || viewId === 'initial';
                                    const prof = tinCanProfiles.find(p => p.id === viewId);
                                    const displayName = isDefault ? 'Flow AI 메인' : (prof?.email?.split('@')[0] || `스플릿 ${idx+1}`);
                                    const isFocused = activeProfileId === viewId;
                                    
                                    return (
                                        <button
                                            key={viewId}
                                            onClick={async () => {
                                                await (window as any).electronAPI?.switchProfile?.({ profileId: viewId });
                                                syncViewsAndProfiles();
                                            }}
                                            style={{
                                                padding: '8px 4px',
                                                border: `1.5px solid ${isFocused ? '#3b82f6' : '#cbd5e1'}`,
                                                borderRadius: '6px',
                                                background: isFocused ? '#eff6ff' : '#fff',
                                                color: isFocused ? '#1e40af' : '#475569',
                                                fontSize: '9px',
                                                fontWeight: 800,
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                transition: 'all 0.15s'
                                            }}
                                            title={isDefault ? 'Google Flow AI 메인 창' : prof?.email}
                                        >
                                            [{idx + 1}] {displayName}
                                        </button>
                                    );
                                })}
                                {/* Fill empty quadrants if activeViews is 3 */}
                                {activeViews.length === 3 && (
                                    <div style={{
                                        padding: '8px 4px',
                                        border: '1.5px dashed #cbd5e1',
                                        borderRadius: '6px',
                                        background: 'transparent',
                                        color: '#cbd5e1',
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        textAlign: 'center'
                                    }}>
                                        [4] 대기 중
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* SECTION 1: ACTIVE/RUNNING GRIDS WITH DETAILED LABELS */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#22c55e' }}>●</span> 실시간 구동 및 창 정보 ({activeViews.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                            {activeViews.map((viewId, idx) => {
                                const isDefault = viewId === 'default' || viewId === 'initial';
                                const prof = tinCanProfiles.find(p => p.id === viewId);
                                const displayName = isDefault ? 'Flow AI 메인 뷰어' : (prof?.email || `격리 브라우저 (${viewId.slice(0, 6)})`);
                                const isFocused = activeProfileId === viewId;
                                
                                return (
                                    <div key={viewId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: isFocused ? '#f0f9ff' : '#f8fafc', border: `1px solid ${isFocused ? '#bae6fd' : '#f1f5f9'}`, borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, marginRight: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: isFocused ? '#1e40af' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={displayName}>
                                                [{idx + 1}번 창] {isDefault ? 'Flow AI' : displayName}
                                            </span>
                                            <span style={{ fontSize: '8px', color: isDefault ? '#22c55e' : '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                                {isDefault ? '🟢 Wi-Fi 초고속 회선 (Flow AI 전용)' : '🔵 LTE 격리 회선 (유튜브 채널 전용)'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                            <button
                                                onClick={async () => {
                                                    await (window as any).electronAPI?.switchProfile?.({ profileId: viewId });
                                                    syncViewsAndProfiles();
                                                }}
                                                style={{ padding: '4px 8px', fontSize: '9px', fontWeight: 700, border: 'none', borderRadius: '4px', background: isFocused ? '#0284c7' : '#e2e8f0', color: isFocused ? '#fff' : '#475569', cursor: 'pointer' }}
                                            >
                                                {isFocused ? '포커스됨' : '선택'}
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (activeViews.length <= 1) {
                                                        alert("기본 창(최소 1개)은 항상 화면에 활성화 상태로 유지되어야 합니다.");
                                                        return;
                                                    }
                                                    const confirm = window.confirm(`정말 이 다중창을 닫으시겠습니까?`);
                                                    if (confirm) {
                                                        await (window as any).electronAPI?.destroyFlowView?.({ profileId: viewId });
                                                        syncViewsAndProfiles();
                                                    }
                                                }}
                                                style={{ padding: '4px 6px', fontSize: '9px', fontWeight: 700, border: 'none', borderRadius: '4px', background: '#ef4444', color: '#fff', cursor: 'pointer' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: STANDBY/LAUNCHABLE ACCOUNTS */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#94a3b8' }}>●</span> 대기 중인 채널 계정 ({standbyProfiles.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                            {standbyProfiles.length === 0 ? (
                                <div style={{ fontSize: '10px', color: '#94a3b8', padding: '10px', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: '6px' }}>
                                    대기 중인 활성 계정이 없습니다.
                                </div>
                            ) : (
                                standbyProfiles.map(p => (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, marginRight: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.email}>
                                                {p.email || p.id}
                                            </span>
                                            <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                                ⚪ 오프라인
                                            </span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (activeViews.length >= 4) {
                                                    alert("다중창은 최대 4개까지만 동시 구동할 수 있습니다. 기존 활성 창을 먼저 닫아주세요.");
                                                    return;
                                                }
                                                await (window as any).electronAPI?.createFlowView?.({ profileId: p.id });
                                                await (window as any).electronAPI?.switchProfile?.({ profileId: p.id });
                                                syncViewsAndProfiles();
                                                fetchProfiles(); // reload to move to active
                                            }}
                                            style={{ padding: '4px 8px', fontSize: '9px', fontWeight: 700, border: 'none', borderRadius: '4px', background: '#4f46e5', color: '#fff', cursor: 'pointer', transition: 'all 0.15s' }}
                                        >
                                            💻 기동
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* CONTEXT-AWARE HELP TIP */}
                    <div style={{ fontSize: '9px', fontWeight: 600, color: '#0369a1', background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '8px', padding: '6px 10px', lineHeight: '1.4' }}>
                        {locationTip}
                    </div>

                    {/* FOOTER ACTIONS */}
                    {activeViews.length >= 2 && (
                        <button
                            onClick={async () => {
                                const confirm = window.confirm("현재 선택된 활성 창 1개를 제외한 나머지 모든 창들을 종료하시겠습니까?");
                                if (confirm) {
                                    for (const viewId of activeViews) {
                                        if (viewId !== activeProfileId) {
                                            await (window as any).electronAPI?.destroyFlowView?.({ profileId: viewId });
                                        }
                                    }
                                    syncViewsAndProfiles();
                                    setOpen(false);
                                }
                            }}
                            style={{ width: '100%', padding: '6px', fontSize: '10px', fontWeight: 700, border: '1px solid #fee2e2', borderRadius: '6px', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', marginTop: '2px' }}
                        >
                            ✕ 선택 창 제외 모두 닫기
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}




const Layout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [captainId, setCaptainId] = React.useState<string | null>(null);
    const [activeViews, setActiveViews] = React.useState<string[]>([]);
    const [activeProfileId, setActiveProfileId] = React.useState<string>('default');

    const syncViewsAndProfiles = async () => {
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj) {
                const viewsRes = await apiObj.getActiveViews();
                if (viewsRes?.success) {
                    setActiveViews(viewsRes.activeIds);
                }
                const config = await apiObj.loadProfiles();
                if (config?.activeProfileId) {
                    setActiveProfileId(config.activeProfileId);
                }
            }
        } catch (e) {
            console.warn("Failed to sync views in Layout:", e);
        }
    };

    React.useEffect(() => {
        syncViewsAndProfiles();
        const interval = setInterval(syncViewsAndProfiles, 3000);
        return () => clearInterval(interval);
    }, []);

    const { user, subscription, logout } = useAuth();
    const [accountOpen, setAccountOpen] = React.useState(false);
    const [portalLoading, setPortalLoading] = React.useState(false);

    const resizeGoogleAvatarUrl = (url: string | null | undefined, size: number) => {
        if (!url || typeof url !== 'string') return url || '';
        return url.replace(/=s\d+(-c)?$/, `=s${size}-c`);
    };

    const normalizedPhotoUrl = user?.photoURL ? resizeGoogleAvatarUrl(user.photoURL, 64) : null;
    const { src: cachedAvatarSrc, failed: avatarFetchFailed, onImageError: handleAvatarError } = useCachedAvatar(normalizedPhotoUrl);

    const handleManageSubscription = async () => {
        try {
            setPortalLoading(true);
            const { url } = await createPortalSession();
            if (url) {
                window.open(url, '_blank');
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

    // === Multi-Tab Session Persistence ===
    interface TabMetadata {
        path: string;
        name: string;
    }

    // Load initial tabs from localStorage or fallback to default
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

    // Keep-Alive VDOM Node Cache (Session Only, not persisted)
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

    // Save tabs to localStorage whenever they change
    React.useEffect(() => {
        try {
            localStorage.setItem('viral_loop_open_tabs', JSON.stringify(openTabs));
        } catch (e) {
            console.error("Failed to save tabs:", e);
        }
    }, [openTabs]);

    // Track path changes and update caches (Triggers ONLY when location.pathname changes)
    React.useEffect(() => {
        const { name } = getTabNameAndIcon(location.pathname);

        // 1. Cache the React children node for this session
        setTabCache(prev => {
            if (prev[location.pathname] === children) return prev;
            return {
                ...prev,
                [location.pathname]: children
            };
        });

        // 2. Add to openTabs metadata if not present
        setOpenTabs(prev => {
            const exists = prev.some(tab => tab.path === location.pathname);
            if (exists) return prev;
            return [...prev, { path: location.pathname, name }];
        });
    }, [location.pathname, getTabNameAndIcon]);

    // Close tab and redirect to another remaining tab
    const closeTab = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        e.stopPropagation();

        setOpenTabs(prev => {
            const filtered = prev.filter(tab => tab.path !== path);
            if (location.pathname === path) {
                if (filtered.length > 0) {
                    const lastTab = filtered[filtered.length - 1];
                    navigate(lastTab.path);
                } else {
                    navigate('/');
                }
            }
            return filtered;
        });

        // Clean up from VDOM cache as well
        setTabCache(prev => {
            const copy = { ...prev };
            delete copy[path];
            return copy;
        });
    };

    const filteredGroups = React.useMemo(() => {
        return menuGroups.filter(group => {
            if (activeMode === 'DISCOVERY') return group.title === "📊 트렌드 분석 및 소싱" || group.items.some(it => it.path === '/keyword-explorer');
            if (activeMode === 'CREATION') return group.title === "🎬 인공지능 창작 스튜디오" || group.title === "📡 가상 라이브 센터" || group.title === "⚙️ AI 코어 & 오토메이션" || group.title === "⚙️ 에이전트 및 시스템 관제";
            if (activeMode === 'OPERATION') return group.title === "⚙️ AI 코어 & 오토메이션" || group.title === "⚙️ 에이전트 및 시스템 관제" || group.title === "📈 채널 성장 및 분석";
            if (activeMode === 'EDUCATION') return group.title === "🛠️ 시스템 환경 및 보안 설정";
            return true;
        });
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
        <div className="relative flex h-screen bg-pixie-gray text-pixie-text font-sans antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="absolute inset-y-0 left-0 z-50 w-72 border-r border-pixie-border bg-white flex flex-col shadow-sm">
                <div className="flex h-16 items-center px-6 border-b border-pixie-border shrink-0">
                    <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tighter transition-opacity hover:opacity-80">
                        <div className="w-7 h-7 bg-pixie-blue rounded-[8px] flex items-center justify-center shadow-[0_2px_4px_rgba(59,130,246,0.2)]">
                            <Zap className="w-4 h-4 text-white fill-current" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[19px] font-extrabold text-[#0F172A] leading-none">ViraLoop</span>
                            <span className="text-[9px] font-bold text-slate-400 tracking-tighter uppercase">v3.5</span>
                        </div>
                    </Link>
                </div>

                <div className="px-4 py-5 bg-pixie-gray/10">
                    <div className="bg-[#F1F5F9] p-1 rounded-[12px] border border-slate-200/60 grid grid-cols-2 gap-1">
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
                                        "flex items-center justify-center gap-1.5 py-2 rounded-[9px] transition-all duration-300 border",
                                        isActive
                                            ? "bg-white border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.04)] text-pixie-blue"
                                            : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                                    )}
                                >
                                    <Icon className={cn("w-3.5 h-3.5", isActive ? "text-pixie-blue" : "text-slate-400")} strokeWidth={isActive ? 2.5 : 2} />
                                    <div className="flex flex-col items-start leading-tight">
                                        <span className={cn("text-[10px] font-bold tracking-tight", isActive ? "text-pixie-blue" : "text-slate-500")}>
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

                <nav className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-pixie-gray/30">
                    {filteredGroups.map((group, i) => (
                        <div key={i} className="mb-6 last:mb-0">
                            <h3 className="px-4 mb-2 text-[11px] font-bold text-pixie-sub/70 uppercase tracking-widest">
                                {group.title}
                            </h3>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = item.path.startsWith('/captain')
                                        ? location.pathname.startsWith('/captain') && item.path.includes('channels') === location.pathname.includes('channels')
                                        : location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group",
                                                isActive
                                                    ? "bg-white text-pixie-blue shadow-sm border border-pixie-border"
                                                    : "text-pixie-sub hover:bg-white hover:text-pixie-text hover:shadow-sm border border-transparent hover:border-pixie-border"
                                            )}
                                        >
                                            <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-pixie-blue" : "text-pixie-sub group-hover:text-pixie-text")} strokeWidth={isActive ? 2.5 : 2} />
                                            <span className="flex-1">{item.name}</span>
                                            {item.badge !== undefined && item.badge > 0 && (
                                                <span className="ml-auto bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-pixie-border bg-pixie-gray/20">
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="flex items-center justify-between w-full px-4 py-2 rounded-lg text-xs font-medium text-pixie-sub hover:bg-white hover:text-pixie-text transition-all border border-transparent hover:border-pixie-border shadow-sm"
                    >
                        <span className="flex items-center gap-2">
                            {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            {theme === "dark" ? "Dark Mode" : "Light Mode"}
                        </span>
                    </button>

                    <div className="mt-4 relative">
                        {/* Popover Dropdown */}
                        {accountOpen && (
                            <div className="absolute bottom-[calc(100%+8px)] left-0 w-full bg-white border border-pixie-border rounded-2xl shadow-xl p-4 z-50 flex flex-col gap-3 animate-fade-in">
                                <div className="border-b border-pixie-border/60 pb-3 flex flex-col gap-0.5">
                                    <p className="text-xs font-bold text-slate-800 truncate">{user?.displayName || 'User'}</p>
                                    <p className="text-[9px] text-slate-400 font-semibold truncate leading-none mt-0.5">{user?.email}</p>
                                </div>

                                {/* Sub status */}
                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">구독 멤버십</span>
                                        {subscription.status === 'active' ? (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-md uppercase tracking-tight">PRO ACTIVE</span>
                                        ) : subscription.status === 'trial' ? (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-md uppercase tracking-tight">FREE TRIAL</span>
                                        ) : (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-md uppercase tracking-tight">EXPIRED</span>
                                        )}
                                    </div>
                                    {subscription.status === 'trial' && (
                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="w-full bg-slate-200 rounded-full h-1">
                                                <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (subscription.exportsRemaining / 5) * 100))}%` }}></div>
                                            </div>
                                            <p className="text-[9px] text-slate-500 font-semibold leading-none mt-0.5">
                                                남은 내보내기: {subscription.exportsRemaining}회 / 5회
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-col gap-1 pt-1">
                                    {subscription.status === 'active' && (
                                        <button
                                            onClick={handleManageSubscription}
                                            disabled={portalLoading}
                                            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all border border-transparent hover:border-slate-200"
                                        >
                                            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                            {portalLoading ? '결제 포털 로드 중...' : '구독 멤버십 관리'}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[10px] font-bold text-rose-600 hover:bg-rose-50 active:scale-[0.98] transition-all border border-transparent hover:border-rose-100"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        ViraLoop 로그아웃
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Trigger Card */}
                        <button
                            onClick={() => setAccountOpen(v => !v)}
                            className="flex items-center gap-3 w-full px-4 py-3 bg-white hover:bg-slate-50 border border-pixie-border rounded-xl shadow-pixie transition-all active:scale-[0.98] group text-left"
                        >
                            {cachedAvatarSrc && !avatarFetchFailed ? (
                                <img
                                    src={cachedAvatarSrc}
                                    alt={user?.displayName || 'User'}
                                    className="w-8 h-8 rounded-full border border-pixie-border shrink-0 shadow-sm"
                                    onError={handleAvatarError}
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-pixie-border shrink-0 shadow-sm">
                                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-pixie-text truncate group-hover:text-blue-600 transition-colors">
                                    {user?.displayName || 'ViraLoop User'}
                                </p>
                                <p className="text-[9px] text-pixie-sub truncate leading-none mt-0.5 uppercase tracking-wider font-semibold">
                                    {subscription.status === 'active' ? 'PRO COMMANDER' : 'COMMANDER'}
                                </p>
                            </div>
                            {accountOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                            ) : (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-hidden relative bg-pixie-gray pl-72 flex flex-col">
                <header className="sticky top-0 z-40 w-full px-8 h-14 flex items-center justify-between bg-white border-b border-pixie-border/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">{modeName}</span>
                        <span className="text-slate-300 font-light text-xs">|</span>
                        <h1 className="text-[13px] font-bold text-slate-800 tracking-tight">
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
                    <div className="flex items-center gap-4">
                        <ActiveViewsControl activeViews={activeViews} activeProfileId={activeProfileId} syncViewsAndProfiles={syncViewsAndProfiles} />
                        <SplitLayoutControl />
                        <GlobalLoopieChat />
                    </div>
                </header>

                {/* Professional Scrollable Tab Bar */}
                <div className="flex items-center gap-1.5 px-8 py-2 bg-slate-50 border-b border-pixie-border/40 overflow-x-auto custom-scrollbar shrink-0 select-none">
                    {openTabs.map((tab) => {
                        const { icon: TabIcon } = getTabNameAndIcon(tab.path);
                        const isTabActive = location.pathname === tab.path;
                        return (
                            <div
                                key={tab.path}
                                onClick={() => navigate(tab.path)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer group shrink-0 shadow-sm",
                                    isTabActive
                                        ? "bg-white border-slate-200/80 text-pixie-blue"
                                        : "bg-[#F8FAFC]/60 border-transparent text-slate-500 hover:bg-[#F1F5F9] hover:text-slate-700"
                                )}
                            >
                                <TabIcon className={cn("w-3.5 h-3.5", isTabActive ? "text-pixie-blue" : "text-slate-400")} />
                                <span className="max-w-[120px] truncate">{tab.name}</span>
                                <button
                                    onClick={(e) => closeTab(e, tab.path)}
                                    className="p-0.5 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors"
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

                {/* Tab Container Panels (Keep-Alive) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className={cn(
                        location.pathname === '/' ? "p-0" : "container mx-auto p-6 max-w-[1600px]"
                    )}>
                        {openTabs.map((tab) => {
                            const isTabActive = location.pathname === tab.path;
                            const cachedNode = tabCache[tab.path];
                            return (
                                <div
                                    key={tab.path}
                                    className={cn(isTabActive ? "block" : "hidden")}
                                >
                                    {cachedNode ? cachedNode : (
                                        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3 mt-10">
                                            <div className="w-6 h-6 border-2 border-slate-300 border-t-pixie-blue rounded-full animate-spin"></div>
                                            <p className="text-xs font-semibold">작업 세션 복원 중...</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <Footer className={cn(location.pathname === '/' ? "px-12" : "px-0")} />
                    </div>
                </div>
            </main>

            <Toaster position="top-right" richColors />
        </div>
    );
};

export default Layout;