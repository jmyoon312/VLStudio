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
    RotateCcw
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            >
                <span style={{ fontSize: '14px' }}>{cur.icon}</span>
                <span>{ratio}%</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
            </button>
            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '220px', padding: '12px', background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>📐 화면 배치</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {SPLIT_MODES.map(m => (
                            <button key={m.value} onClick={() => { setMode(m.value); apply(m.value, ratio); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 6px', border: `1px solid ${mode === m.value ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '8px', background: mode === m.value ? 'rgba(59,130,246,0.08)' : 'transparent', color: mode === m.value ? 'var(--primary)' : 'var(--muted-foreground)', cursor: 'pointer', fontSize: '11px', fontWeight: mode === m.value ? 700 : 500, transition: 'all 0.15s' }}>
                                <span style={{ fontSize: '16px' }}>{m.icon}</span>
                                <span>{m.label}</span>
                            </button>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '6px' }}>Flow 창 크기: {ratio}%</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>20%</span>
                            <input type="range" min="20" max="80" step="5" value={ratio} onChange={e => { const v = parseInt(e.target.value); setRatio(v); apply(mode, v); }} style={{ flex: 1, accentColor: 'var(--primary)' }} />
                            <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>80%</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted-foreground)', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>💡 경계선 더블클릭 → 50:50 리셋</div>
                </div>
            )}
        </div>
    );
}

function ActiveViewsControl(props: { activeViews: string[], activeProfileId: string, syncViewsAndProfiles: () => void }) {
    const { activeViews, activeProfileId, syncViewsAndProfiles } = props;
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const location = useLocation();
    const [profilesList, setProfilesList] = React.useState<any[]>([]);

    React.useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    React.useEffect(() => {
        if (open) {
            (async () => {
                try {
                    const config = await (window as any).electronAPI?.loadProfiles?.();
                    if (config && config.profiles) {
                        setProfilesList(config.profiles);
                    }
                } catch (e) {}
            })();
        }
    }, [open]);

    const hasActiveViews = activeViews.length > 0;

    // Location-based help tip
    const locationTip = React.useMemo(() => {
        if (location.pathname === '/') return "💡 포털 홈 작업 중 - Flow 메인 (1번 창) 선택 권장";
        if (location.pathname.includes('creation') || location.pathname.includes('video')) return "💡 콘텐츠 제작 작업 중 - Flow 메인 (1번 창) 선택 권장";
        if (location.pathname.includes('channels') || location.pathname.includes('distribution')) return "💡 채널 자동배포 작업 중 - 4번 유튜브 전용창(LTE) 선택 권장";
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
                    border: `1px solid ${hasActiveViews ? 'var(--primary)' : 'var(--border)'}`, 
                    borderRadius: '8px', 
                    background: hasActiveViews ? 'rgba(59,130,246,0.05)' : 'var(--muted)', 
                    color: hasActiveViews ? 'var(--primary)' : 'var(--muted-foreground)', 
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
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '330px', padding: '14px', background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Header Title */}
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)', paddingBottom: '8px', display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                        <span>🖥️ 다중창 통합 관제 센터</span>
                        <span style={{ fontSize: '9px', background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>MAX 4 GRIDS</span>
                    </div>

                    {/* DYNAMIC SCREEN LAYOUT MINI-MAP (그리드 배치 시각화도) */}
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted-foreground)', marginBottom: '6px' }}>📐 다중창 화면 배치도 (클릭 시 포커스)</div>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr',
                            gap: '4px',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '4px',
                            background: 'var(--muted)'
                        }}>
                            {[1, 2, 3, 4].map((slotIdx) => {
                                // For visual purposes, map activeViews to slots.
                                // In reality, we just map activeViews to available slots sequentially for now.
                                const viewId = activeViews[slotIdx - 1];
                                const isActive = !!viewId;
                                const isFocused = activeProfileId === viewId;
                                const isUploadSlot = slotIdx === 4;
                                
                                return (
                                    <button
                                        key={slotIdx}
                                        disabled={!isActive}
                                        onClick={async () => {
                                            if (isActive) {
                                                await (window as any).electronAPI?.switchProfile?.({ profileId: viewId });
                                                syncViewsAndProfiles();
                                            }
                                        }}
                                        style={{
                                            padding: '8px 4px',
                                            border: `1.5px solid ${isFocused ? (isUploadSlot ? '#f43f5e' : 'var(--primary)') : (isActive ? 'var(--muted-foreground)' : 'var(--border)')}`,
                                            borderRadius: '6px',
                                            background: isFocused ? (isUploadSlot ? 'rgba(244,63,94,0.1)' : 'rgba(59,130,246,0.1)') : (isActive ? 'var(--card)' : 'transparent'),
                                            color: isFocused ? (isUploadSlot ? '#f43f5e' : 'var(--primary)') : (isActive ? 'var(--foreground)' : 'var(--muted-foreground)'),
                                            fontSize: '9px',
                                            fontWeight: isActive ? 800 : 600,
                                            textAlign: 'center',
                                            cursor: isActive ? 'pointer' : 'default',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        [{slotIdx}] {isActive ? (isUploadSlot ? '📺 유튜브(LTE)' : '🤖 Flow/웹') : '대기 중'}
                                    </button>
                                );
                            })}
                        </div>
                    </div>                        {/* SECTION 1: STRICT 4-SLOT ROLE ALLOCATION */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--foreground)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#22c55e' }}>●</span> 창 역할 할당 현황 (수동 실행 전용)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[1, 2, 3, 4].map((slotIdx) => {
                                const viewId = activeViews[slotIdx - 1];
                                const isActive = !!viewId;
                                const isFocused = activeProfileId === viewId;
                                const isUploadSlot = slotIdx === 4;
                                
                                let slotName = "대기 중";
                                let slotDesc = "";
                                if (slotIdx === 1) { slotName = "Flow AI 메인 뷰어"; slotDesc = "🟢 Wi-Fi 전용 (메뉴 수동 할당)"; }
                                else if (slotIdx === 2) { slotName = "커스텀 웹 1"; slotDesc = "🟢 Wi-Fi 전용"; }
                                else if (slotIdx === 3) { slotName = "커스텀 웹 2"; slotDesc = "🟢 Wi-Fi 전용"; }
                                else if (slotIdx === 4) { slotName = "유튜브 업로드 전용창"; slotDesc = "🔴 LTE 프록시 강제 터널링"; }
 
                                if (isActive) {
                                    const prof = profilesList.find(p => p.id === viewId);
                                    const emailText = viewId === 'default' || viewId === 'initial' ? '공용 세션' : (prof?.email || viewId);
                                    slotName += ` (${emailText})`;
                                }
 
                                return (
                                    <div key={slotIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: isActive ? (isFocused ? (isUploadSlot ? 'rgba(244,63,94,0.05)' : 'rgba(59,130,246,0.05)') : 'var(--muted)') : 'var(--background)', border: `1px solid ${isActive ? (isFocused ? (isUploadSlot ? '#fda4af' : '#bae6fd') : 'var(--border)') : 'var(--border)'}`, borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, marginRight: '8px', opacity: isActive ? 1 : 0.5 }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: isActive ? (isFocused ? (isUploadSlot ? '#f43f5e' : 'var(--primary)') : 'var(--foreground)') : 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                [{slotIdx}번 창] {slotName}
                                            </span>
                                            <span style={{ fontSize: '8px', color: isUploadSlot ? '#e11d48' : '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                                {slotDesc}
                                            </span>
                                        </div>
                                        {isActive && (
                                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                <button
                                                    onClick={async () => {
                                                        await (window as any).electronAPI?.switchProfile?.({ profileId: viewId });
                                                        syncViewsAndProfiles();
                                                    }}
                                                    style={{ padding: '4px 8px', fontSize: '9px', fontWeight: 700, border: 'none', borderRadius: '4px', background: isFocused ? (isUploadSlot ? '#e11d48' : 'var(--primary)') : 'var(--muted)', color: isFocused ? '#fff' : 'var(--foreground)', cursor: 'pointer' }}
                                                >
                                                    {isFocused ? '포커스됨' : '선택'}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const confirm = window.confirm(`해당 다중창 세션을 종료하시겠습니까?`);
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
                                        )}
                                        {!isActive && (
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <select 
                                                    id={`select-launch-${slotIdx}`}
                                                    style={{ fontSize: '9px', padding: '2px', borderRadius: '4px', border: '1px solid var(--border)', width: '90px', background: 'var(--card)', color: 'var(--foreground)' }}
                                                >
                                                    <option value="">계정 선택...</option>
                                                    {slotIdx <= 3 && <option value="default">공용 세션 (기본)</option>}
                                                    {profilesList
                                                        .filter(p => slotIdx === 4 ? p.type === 'BRAND_CHANNEL' : p.type !== 'BRAND_CHANNEL')
                                                        .map(p => <option key={p.id} value={p.id}>{p.email || p.name || p.id}</option>)}
                                                </select>
                                                <button
                                                    onClick={async () => {
                                                        const sel = document.getElementById(`select-launch-${slotIdx}`) as HTMLSelectElement;
                                                        if (!sel || !sel.value) {
                                                            alert("기동할 계정을 먼저 선택해주세요.");
                                                            return;
                                                        }
                                                        if (activeViews.length >= 4) {
                                                            alert("다중창은 최대 4개까지만 동시 구동할 수 있습니다.");
                                                            return;
                                                        }
                                                        await (window as any).electronAPI?.createFlowView?.({ profileId: sel.value });
                                                        await (window as any).electronAPI?.switchProfile?.({ profileId: sel.value });
                                                        syncViewsAndProfiles();
                                                    }}
                                                    style={{ padding: '3px 8px', fontSize: '9px', fontWeight: 700, border: 'none', borderRadius: '4px', background: isUploadSlot ? '#e11d48' : '#4f46e5', color: '#fff', cursor: 'pointer', transition: 'all 0.15s' }}
                                                >
                                                    기동
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
 
                    {/* CONTEXT-AWARE HELP TIP */}
                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--primary)', background: 'rgba(59,130,246,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', lineHeight: '1.4' }}>
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
                            style={{ width: '100%', padding: '6px', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', marginTop: '2px' }}
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

    const [showNetOptimizeModal, setShowNetOptimizeModal] = React.useState(false);
    const [isOptimizing, setIsOptimizing] = React.useState(false);
    const [netStatus, setNetStatus] = React.useState<any>(null);
    const lastLteStateRef = React.useRef<boolean>(false);

    const checkNetworkStatus = async () => {
        try {
            const res = await api.get(`/resources/network/status?t=${Date.now()}`);
            const data = res.data;
            setNetStatus(data);
            
            const monitorStatus = data.monitor;
            const lteConnected = !!(monitorStatus?.lte && monitorStatus?.lte?.status === 'Connected');
            const needsOptimize = lteConnected && monitorStatus?.lte?.metric !== 9000;
            
            // LTE가 새로 감지되었고 최적화가 필요할 때 팝업 자동 활성화 (Spam 방지를 위해 transition 감지)
            if (needsOptimize) {
                if (!lastLteStateRef.current) {
                    setShowNetOptimizeModal(true);
                }
            }
            
            lastLteStateRef.current = lteConnected;
        } catch (e) {
            console.error("Failed to check network status in Layout:", e);
        }
    };

    React.useEffect(() => {
        checkNetworkStatus();
        const interval = setInterval(checkNetworkStatus, 5000); // 5초 간격으로 핸드폰 연결 확인
        return () => clearInterval(interval);
    }, []);

    const handleExecuteOptimize = async () => {
        setIsOptimizing(true);
        try {
            const res = await api.post('/resources/network/fix-permissions');
            toast.success("네트워크 격리 최적화 요청", {
                description: res.data.message || "UAC 관리자 승인 팝업이 활성화되었습니다."
            });
            setShowNetOptimizeModal(false);
            // 3초 후 즉시 상태 리프레시
            setTimeout(checkNetworkStatus, 3000);
        } catch (e) {
            toast.error("최적화 오류", {
                description: "권한 승인 요청 실패"
            });
        } finally {
            setIsOptimizing(false);
        }
    };

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

    // Reset all tabs except the leftmost one
    const resetTabs = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (openTabs.length <= 1) return;

        const confirm = window.confirm("가장 왼쪽 탭을 제외한 나머지 모든 탭을 닫으시겠습니까?");
        if (!confirm) return;

        const leftmostTab = openTabs[0];

        // 1. Set openTabs to only include the leftmost tab
        setOpenTabs([leftmostTab]);

        // 2. Clean up cache except the leftmost tab
        setTabCache(prev => {
            if (prev[leftmostTab.path]) {
                return { [leftmostTab.path]: prev[leftmostTab.path] };
            }
            return {};
        });

        // 3. Navigate to the leftmost tab
        navigate(leftmostTab.path);
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
        <div className="relative flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="absolute inset-y-0 left-0 z-[80] w-[var(--sidebar-width)] border-r border-sidebar-border bg-sidebar flex flex-col shadow-sm">
                <div className="flex h-14 items-center px-6 border-b border-sidebar-border shrink-0 sidebar-logo-container justify-start">
                    <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tighter transition-opacity hover:opacity-80">
                        <div className="w-7 h-7 bg-pixie-blue rounded-[8px] flex items-center justify-center shadow-[0_2px_4px_rgba(59,130,246,0.2)] shrink-0">
                            <Zap className="w-4 h-4 text-white fill-current" />
                        </div>
                        <div className="flex items-baseline gap-1.5 hide-on-slim">
                            <span className="text-[19px] font-extrabold text-foreground leading-none">ViraLoop</span>
                            <span className="text-[9px] font-bold text-muted-foreground tracking-tighter uppercase">v3.5</span>
                        </div>
                    </Link>
                </div>

                <div className="px-4 py-5 shrink-0">
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
                    {filteredGroups.map((group, i) => (
                        <div key={i} className="mb-5 last:mb-0">
                            <h3 className="px-4 mb-1.5 text-[11px] font-bold text-foreground/60 uppercase tracking-wider hide-on-slim">
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
                                                "flex items-center gap-3 px-4 py-1.5 rounded-lg text-[13.5px] font-bold tracking-tight transition-all duration-200 group border border-transparent hover:border-border hover:bg-card hover:text-foreground hover:shadow-sm",
                                                isActive
                                                    ? "bg-card text-primary shadow-sm border border-border font-extrabold"
                                                    : "text-foreground/80 hover:text-foreground hover:bg-card/30"
                                            )}
                                        >
                                            <Icon className={cn("w-4 h-4 transition-colors shrink-0", isActive ? "text-primary" : "text-foreground/60 group-hover:text-foreground")} strokeWidth={isActive ? 2.5 : 2} />
                                            <span className="flex-1 text-left hide-on-slim truncate">{item.name}</span>
                                            {item.badge !== undefined && item.badge > 0 && (
                                                <span className="ml-auto bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full hide-on-slim">
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

                <div className="p-4 border-t border-sidebar-border shrink-0">
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="flex items-center justify-between w-full px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all border border-transparent hover:border-border"
                    >
                        <span className="flex items-center gap-2 justify-center w-full lg:justify-start">
                            {theme === "dark" ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}
                            <span className="dark-mode-toggle-text">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                        </span>
                    </button>

                    <div className="mt-4 relative">
                        {/* Popover Dropdown */}
                        {accountOpen && (
                            <div className="absolute bottom-[calc(100%+8px)] left-0 w-full bg-popover border border-border rounded-2xl shadow-xl p-4 z-50 flex flex-col gap-3 animate-fade-in hide-on-slim">
                                <div className="border-b border-border pb-3 flex flex-col gap-0.5">
                                    <p className="text-xs font-bold text-foreground truncate">{user?.displayName || 'User'}</p>
                                    <p className="text-[9px] text-muted-foreground font-semibold truncate leading-none mt-0.5">{user?.email}</p>
                                </div>

                                {/* Sub status */}
                                <div className="bg-muted border border-border rounded-xl px-3 py-2 flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">구독 멤버십</span>
                                        {subscription.status === 'active' ? (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-md uppercase tracking-tight">PRO ACTIVE</span>
                                        ) : subscription.status === 'trial' ? (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md uppercase tracking-tight">FREE TRIAL</span>
                                        ) : (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-md uppercase tracking-tight">EXPIRED</span>
                                        )}
                                    </div>
                                    {subscription.status === 'trial' && (
                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="w-full bg-muted rounded-full h-1">
                                                <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (subscription.exportsRemaining / 5) * 100))}%` }}></div>
                                            </div>
                                            <p className="text-[9px] text-muted-foreground font-semibold leading-none mt-0.5">
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
                                            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[10px] font-bold text-muted-foreground hover:bg-muted active:scale-[0.98] transition-all border border-transparent hover:border-border"
                                        >
                                            <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                                            {portalLoading ? '결제 포털 로드 중...' : '구독 멤버십 관리'}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[10px] font-bold text-rose-600 hover:bg-rose-50 active:scale-[0.98] transition-all border border-transparent hover:border-rose-100"
                                    >
                                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                                        ViraLoop 로그아웃
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Trigger Card */}
                        <button
                            onClick={() => setAccountOpen(v => !v)}
                            className="flex items-center gap-3 w-full px-4 py-3 bg-card hover:bg-accent border border-border rounded-xl shadow-sm transition-all active:scale-[0.98] group text-left justify-center lg:justify-start"
                        >
                            {cachedAvatarSrc && !avatarFetchFailed ? (
                                <img
                                    src={cachedAvatarSrc}
                                    alt={user?.displayName || 'User'}
                                    className="w-8 h-8 rounded-full border border-pixie-border shrink-0 shadow-sm"
                                    onError={handleAvatarError}
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-primary border border-border shrink-0 shadow-sm">
                                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0 hide-on-slim">
                                <p className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                    {user?.displayName || 'ViraLoop User'}
                                </p>
                                <p className="text-[9px] text-muted-foreground truncate leading-none mt-0.5 uppercase tracking-wider font-semibold">
                                    {subscription.status === 'active' ? 'PRO COMMANDER' : 'COMMANDER'}
                                </p>
                            </div>
                            <div className="hide-on-slim">
                                {accountOpen ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground shrink-0" />
                                ) : (
                                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground shrink-0" />
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-hidden relative bg-background pl-72 flex flex-col">
                <header className="sticky top-0 z-[70] w-full px-8 h-14 flex items-center justify-between bg-card border-b border-border shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">{modeName}</span>
                        <span className="text-border font-light text-xs">|</span>
                        <h1 className="text-[13px] font-bold text-foreground tracking-tight">
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
                <div className="flex items-center gap-1 px-8 pt-2 bg-muted/40 border-b border-border overflow-x-auto dashboard-scroll-area shrink-0 select-none h-11">
                    {/* Reset Tab Button */}
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

                {/* Tab Container Panels (Keep-Alive) */}
                <div className={cn(
                    "flex-1 flex flex-col custom-scrollbar min-h-0",
                    location.pathname.startsWith('/agent-studio') ? "overflow-hidden" : "overflow-y-auto"
                )}>
                    <div className={cn(
                        "flex-1 flex flex-col h-full min-h-0",
                        (location.pathname === '/' || location.pathname.startsWith('/agent-studio')) ? "p-0" : "container mx-auto p-6 max-w-[1600px]"
                    )}>
                        {openTabs.map((tab) => {
                            const isTabActive = location.pathname === tab.path;
                            const cachedNode = tabCache[tab.path];
                            return (
                                <div
                                    key={tab.path}
                                    className={cn(isTabActive ? "flex-1 flex flex-col min-h-0" : "hidden")}
                                >
                                    {cachedNode ? cachedNode : (
                                        <div className="flex flex-col items-center justify-center p-20 text-muted-foreground gap-3 mt-10">
                                            <div className="w-6 h-6 border-2 border-muted border-t-pixie-blue rounded-full animate-spin"></div>
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

            {showNetOptimizeModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-lg p-6 bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 font-sans text-foreground">
                        {/* Smooth glowing gradient top border */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 rounded-t-2xl"></div>
                        
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0">
                                <Shield className="w-8 h-8 animate-pulse" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <h2 className="text-lg font-extrabold tracking-tight">🔒 네트워크 격리 최적화 요청</h2>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    새로운 모바일 LTE 네트워크 연결이 감지되었습니다. ViraLoop Studio는 유튜브 채널 간 IP 연좌제 전파를 완벽히 차단하기 위해 업로드 및 스튜디오 트래픽을 LTE망(Port 10800)으로 강제 분리하고, 일반 시스템 웹 요청은 기존 Wi-Fi 또는 유선망으로 흐르도록 윈도우 라우팅 테이블 메트릭을 고정합니다.
                                </p>
                            </div>
                        </div>

                        {/* Checklist */}
                        <div className="mt-5 p-4 rounded-xl border border-border bg-muted/30 space-y-3 font-mono text-[11px]">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Wi-Fi / 유선 게이트웨이 메트릭 고정
                                </span>
                                <span className="font-bold text-blue-500">Metric: 10/20 (기본망)</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    LTE 모바일 어댑터 메트릭 낮춤 (격리)
                                </span>
                                <span className="font-bold text-rose-500">Metric: 9000 (우회 차단)</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    LTE 미작동 시 Wi-Fi 우회 차단 (Hard-Gate)
                                </span>
                                <span className="font-bold text-emerald-500">활성화 (Fail-Closed)</span>
                            </div>
                        </div>

                        <div className="mt-3 text-[10px] text-muted-foreground bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-lg space-y-1">
                            <p className="font-bold text-amber-500 flex items-center gap-1">
                                ⚠️ [최적화 실행] 시 윈도우 관리자(UAC) 승인 창이 나타납니다.
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                                Windows OS 규정상 핸드폰이 끊겼다 다시 연결될 때마다 기본 우선순위(메트릭)가 강제로 초기화됩니다. 이 상태에서는 기본 인터넷 트래픽이 LTE로 유출될 수 있어 격리 복구를 위해 UAC 승인이 필요합니다.
                            </p>
                            <div className="pt-1.5 border-t border-amber-500/10 mt-1.5 space-y-1">
                                <p className="font-semibold text-foreground text-[9.5px]">💡 매번 이 창을 띄우지 않고 자동화하는 2가지 방법:</p>
                                <ul className="list-disc pl-4.5 space-y-0.5 text-[9px] text-muted-foreground">
                                    <li><strong>앱을 관리자 권한으로 실행</strong>: ViraLoop Studio 실행 시 마우스 우클릭 &gt; <span className="underline text-foreground font-semibold">관리자 권한으로 실행</span>해 두시면, 휴대폰 연결 시 팝업창 없이 백그라운드에서 실시간으로 자동 격리가 즉시 완료됩니다.</li>
                                    <li><strong>어댑터 메트릭 수동 고정 (영구)</strong>: 제어판 - 네트워크 연결에서 LTE 어댑터(Remote NDIS)의 속성 &gt; IPv4 속성 &gt; 고급 &gt; '자동 기본 설정'을 체크 해제하고 <strong>9000</strong>을 수동 입력해 두면, 재연결 시에도 UAC 승인 없이 완벽 격리가 영구 유지됩니다.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNetOptimizeModal(false)}
                                className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground transition-colors border border-transparent hover:border-border"
                            >
                                나중에 하기
                            </button>
                            <button
                                onClick={handleExecuteOptimize}
                                disabled={isOptimizing}
                                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all rounded-lg shadow-md hover:shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                                {isOptimizing ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>권한 승인 대기...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>격리 최적화 실행</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;