/**
 * EmbeddedDashboard — flow2capcut 분할 뷰 우측 패널
 *
 * MemoryRouter를 사용해 URL을 변경하지 않고 우측 패널 내부에서
 * 독립적으로 대시보드 페이지를 탐색합니다.
 * 사이드바는 position:fixed가 아닌 flex 내부 요소로 렌더링됩니다.
 */

import { lazy, Suspense } from 'react';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
    Zap, Rocket, Share2, UploadCloud, Swords, Edit, Mic,
    Languages, Wand2, Scissors, Eraser, Globe, Search,
    BarChart3, Shield, Users, Radio, Settings, GraduationCap,
    Activity, FileText, Moon, Sun, LayoutDashboard, Clapperboard,
    Music2, Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from './theme-provider';

// 페이지 컴포넌트 — lazy 로딩으로 번들 분할
const Home               = lazy(() => import('../pages/Home'));
const WorkQueue          = lazy(() => import('../pages/WorkQueue'));
const ScriptWriter       = lazy(() => import('./ScriptWriter'));
const CreativeStudio     = lazy(() => import('../pages/CreativeStudio'));
const MultiTTS           = lazy(() => import('../pages/MultiTTS'));
const SubtitleConverter  = lazy(() => import('./SubtitleConverter'));
const SilenceRemover     = lazy(() => import('./SilenceRemover'));
const RemoverEditor      = lazy(() => import('../pages/RemoverEditor'));
const CustomMenu         = lazy(() => import('../pages/CustomMenu'));
const ReportsPage        = lazy(() => import('../pages/ReportsPage').then(m => ({ default: m.ReportsPage ?? m.default })));
const StationManager     = lazy(() => import('../pages/StationManager'));
const AICoPilotStudio    = lazy(() => import('../pages/AICoPilotStudio'));
const ScriptLab          = lazy(() => import('../pages/ScriptLab'));
const GuideCenter        = lazy(() => import('../pages/GuideCenter'));
const Incubator          = lazy(() => import('../pages/Incubator'));
const CaptainQuarters    = lazy(() => import('../pages/CaptainQuarters'));
const ResourceGuidePage  = lazy(() => import('../pages/ResourceGuidePage'));
const VirtualStudio      = lazy(() => import('../pages/VirtualStudio'));
const Gallery            = lazy(() => import('./Gallery'));
const SettingsPage       = lazy(() => import('./Settings'));
const DirectDownload     = lazy(() => import('./DirectDownload'));
const ChannelManager     = lazy(() => import('./ChannelManager'));
const SmartDouyinSearch  = lazy(() => import('./SmartDouyinSearch'));

// ───────────────────────────────────────────────
// 메뉴 구조
// ───────────────────────────────────────────────
const MENU_GROUPS = [
    {
        title: '수집 & 보관',
        items: [
            { name: '대시보드 홈',        path: '/',               icon: LayoutDashboard },
            { name: '타겟 채널 자동 수집', path: '/channels',        icon: Users },
            { name: '더우인 쇼츠 수집',  path: '/douyin-search',   icon: Globe },
            { name: 'URL 영상 직접 수집', path: '/download',     icon: UploadCloud },
            { name: '수집 영상 보관함',      path: '/gallery',        icon: Zap },
            { name: '수집 대본 분석실',  path: '/script-lab',     icon: FileText },
        ],
    },
    {
        title: '창작 스튜디오',
        items: [
            { name: '대본 생성 및 편집',  path: '/script-writer',  icon: FileText },
            { name: '미디어 일괄 생성',   path: '/creative-studio',icon: Clapperboard },
            { name: '다국어 목소리 합성', path: '/multi-tts',      icon: Mic },
            { name: '자막 생성 및 번역',  path: '/subtitle-tool',  icon: Languages },
            { name: '무음 구간 일괄 제거', path: '/silence-remover',icon: Scissors },
            { name: '개체 및 배경 제거',  path: '/remover',        icon: Eraser },
        ],
    },
    {
        title: '운영 및 자동화',
        items: [
            { name: '작업 대기열',        path: '/work-queue',     icon: Rocket },
            { name: '채널 계정 & 웜업 육성',   path: '/incubator',      icon: Shield },
            { name: '스테이션 관리자',    path: '/station-manager',icon: Radio },
            { name: '일일 리포트',        path: '/reports',        icon: BarChart3 },
        ],
    },
    {
        title: '시스템',
        items: [
            { name: '작업 환경 설정',    path: '/settings',       icon: Settings },
            { name: '사용자 안내서',      path: '/guide-center',   icon: GraduationCap },
            { name: '외부 웹사이트 연결', path: '/custom-menu',    icon: Globe },
        ],
    },
];

// ───────────────────────────────────────────────
// 내장 사이드바 (non-fixed, flex 내 고정 너비)
// ───────────────────────────────────────────────
function EmbeddedSidebar() {
    const location = useLocation();
    const { theme, setTheme } = useTheme();

    return (
        <aside
            style={{ width: '220px', minWidth: '220px', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #e5e7eb', flexShrink: 0, overflowY: 'auto' }}
        >
            {/* 로고 */}
            <div style={{ display: 'flex', height: '48px', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 700 }}>
                    <div style={{ width: '24px', height: '24px', background: '#3b82f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap style={{ width: '14px', height: '14px', color: '#fff', fill: '#fff' }} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>ViraLoop</span>
                    <span style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>v3.5</span>
                </Link>
            </div>

            {/* 메뉴 */}
            <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                {MENU_GROUPS.map((group, gi) => (
                    <div key={gi} style={{ marginBottom: '16px' }}>
                        <h3 style={{ padding: '0 8px', marginBottom: '4px', fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {group.title}
                        </h3>
                        <div>
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.path === '/'
                                    ? location.pathname === '/'
                                    : location.pathname.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '6px 12px', borderRadius: '8px',
                                            fontSize: '12px', fontWeight: 500,
                                            textDecoration: 'none', marginBottom: '2px',
                                            transition: 'all 0.15s',
                                            background: isActive ? '#fff' : 'transparent',
                                            color: isActive ? '#3b82f6' : '#6b7280',
                                            boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                            border: isActive ? '1px solid #e5e7eb' : '1px solid transparent',
                                        }}
                                    >
                                        <Icon style={{ width: '14px', height: '14px', flexShrink: 0, color: isActive ? '#3b82f6' : '#9ca3af' }} strokeWidth={isActive ? 2.5 : 2} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* 하단 */}
            <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, color: '#6b7280', background: 'transparent', border: '1px solid transparent', cursor: 'pointer' }}
                >
                    {theme === 'dark' ? <Moon style={{ width: '14px', height: '14px' }} /> : <Sun style={{ width: '14px', height: '14px' }} />}
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </button>
            </div>
        </aside>
    );
}

// 로딩 플레이스홀더
function PageLoader() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '14px' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <span>Loading...</span>
            </div>
        </div>
    );
}

// ───────────────────────────────────────────────
// 메인 콘텐츠 라우팅
// ───────────────────────────────────────────────
function EmbeddedRoutes() {
    return (
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8f9fc', position: 'relative' }}>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/"                    element={<Home />} />
                    <Route path="/channels"            element={<ChannelManager />} />
                    <Route path="/douyin-search"       element={<SmartDouyinSearch />} />
                    <Route path="/download"            element={<DirectDownload />} />
                    <Route path="/gallery"             element={<Gallery />} />
                    <Route path="/script-lab"          element={<ScriptLab />} />
                    <Route path="/script-writer"       element={<ScriptWriter />} />
                    <Route path="/creative-studio"     element={<CreativeStudio />} />
                    <Route path="/multi-tts"           element={<MultiTTS />} />
                    <Route path="/subtitle-tool"       element={<SubtitleConverter />} />
                    <Route path="/silence-remover"     element={<SilenceRemover />} />
                    <Route path="/remover"             element={<RemoverEditor />} />
                    <Route path="/work-queue"          element={<WorkQueue />} />
                    <Route path="/incubator"           element={<Incubator />} />
                    <Route path="/station-manager"     element={<StationManager />} />
                    <Route path="/reports"             element={<ReportsPage />} />
                    <Route path="/settings"            element={<SettingsPage />} />
                    <Route path="/guide-center"        element={<GuideCenter />} />
                    <Route path="/captain"             element={<CaptainQuarters />} />
                    <Route path="/captain/:id"         element={<CaptainQuarters />} />
                    <Route path="/resource-guide"      element={<ResourceGuidePage />} />
                    <Route path="/virtual-studio"      element={<VirtualStudio />} />
                    <Route path="/ai-copilot"          element={<AICoPilotStudio />} />
                    <Route path="/custom-menu"         element={<CustomMenu />} />
                    {/* 매칭 없으면 홈 */}
                    <Route path="*"                    element={<Home />} />
                </Routes>
            </Suspense>
        </main>
    );
}

// ───────────────────────────────────────────────
// EmbeddedDashboard — MemoryRouter 래퍼 (기본 export)
// ───────────────────────────────────────────────
export default function EmbeddedDashboard() {
    return (
        <MemoryRouter initialEntries={['/']} initialIndex={0}>
            <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
                <EmbeddedSidebar />
                <EmbeddedRoutes />
            </div>
        </MemoryRouter>
    );
}
