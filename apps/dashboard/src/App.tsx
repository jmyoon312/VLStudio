import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { I18nProvider } from './features/flow2capcut/hooks/useI18n';
import { ModeProvider } from './features/flow2capcut/contexts/ModeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from './components/theme-provider';
import ToastProvider from './features/flow2capcut/components/Toast';
import LoginPage from './pages/LoginPage';
import Home from './pages/Home';

// Standard React.lazy routes
const Flow2CapCutApp = lazy(() => import('./features/flow2capcut/Flow2CapCutApp'));
const Shell = lazy(() => import('./features/flow2capcut/Shell'));
const SmartDouyinSearch = lazy(() => import('./components/SmartDouyinSearch'));
const ResearchConceptLab = lazy(() => import('./pages/ResearchConceptLab'));
const DdalkkakUI = lazy(() => import('./pages/DdalkkakUI'));
const SceneCutter = lazy(() => import('./pages/SceneCutter'));
const AICoPilotStudio = lazy(() => import('./pages/AICoPilotStudio'));
const ChannelManager = lazy(() => import('./components/ChannelManager'));
const DirectDownload = lazy(() => import('./components/DirectDownload'));
const Gallery = lazy(() => import('./components/Gallery'));
const Settings = lazy(() => import('./components/Settings'));
const ScriptWriter = lazy(() => import('./components/ScriptWriter'));
const SubtitleConverter = lazy(() => import('./components/SubtitleConverter'));
const SilenceRemover = lazy(() => import('./components/SilenceRemover'));
const CustomMenu = lazy(() => import('./pages/CustomMenu'));
const MultiTTS = lazy(() => import('./pages/MultiTTS'));
const CreativeStudio = lazy(() => import('./pages/CreativeStudio'));
const RemoverEditor = lazy(() => import('./pages/RemoverEditor'));
const LiveStudio = lazy(() => import('./pages/Studio/LiveStudio').then(m => ({ default: m.LiveStudio })));
const VirtualStudio = lazy(() => import('./pages/VirtualStudio'));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const StationManager = lazy(() => import('./pages/StationManager'));
const StationDetail = lazy(() => import('./pages/StationDetail'));
const RemotionPreviewPage = lazy(() => import('./pages/RemotionPreviewPage'));
const ScriptLab = lazy(() => import('./pages/ScriptLab'));
const WorkQueue = lazy(() => import('./pages/WorkQueue'));
const ResourceGuidePage = lazy(() => import('./pages/ResourceGuidePage'));
const CaptainQuarters = lazy(() => import('./pages/CaptainQuarters'));
const Incubator = lazy(() => import('./pages/Incubator'));
const GuideCenter = lazy(() => import('./pages/GuideCenter'));
const ResearchBrief = lazy(() => import('./pages/ResearchBrief'));
const TrendRadarPage = lazy(() => import('./pages/TrendRadarPage'));
const InstantStudioPage = lazy(() => import('./pages/InstantStudioPage'));
const StudioWarRoom = lazy(() => import('./pages/StudioWarRoom'));
const PipelineBuilderPage = lazy(() => import('./pages/PipelineBuilderPage'));
const BrainVaultPage = lazy(() => import('./pages/BrainVaultPage'));
const AgentRosterPage = lazy(() => import('./pages/AgentRosterPage'));
const AutonomousPatrolPage = lazy(() => import('./pages/AutonomousPatrolPage'));
const ChannelAnalyticsPage = lazy(() => import('./pages/ChannelAnalyticsPage'));
const ViralLabPage = lazy(() => import('./pages/ViralLabPage'));
const ViralIntelligenceCenter = lazy(() => import('./pages/ViralIntelligenceCenter'));
const CommunityManagerPage = lazy(() => import('./pages/CommunityManagerPage'));
const ChannelDnaStudio = lazy(() => import('./pages/ChannelDnaStudio'));
const SnsRadarStudio = lazy(() => import('./pages/SnsRadarStudio'));
const ShortsTemplateStudio = lazy(() => import('./pages/ShortsTemplateStudio'));
const ShortsProductionStudio = lazy(() => import('./pages/ShortsProductionStudio'));
const ShortsEditorStudio = lazy(() => import('./pages/ShortsEditorStudio'));

// Sovereign Studios & Tools
const ShortsBatchStudio = lazy(() => import('./pages/ShortsBatchStudio'));
const ProVideoEditorStudio = lazy(() => import('./pages/editors/ProVideoEditorStudio'));
const ClassicEditorStudio = lazy(() => import('./pages/editors/ClassicEditorStudio'));
const InstaEditorStudio = lazy(() => import('./pages/editors/InstaEditorStudio'));
const GunlimboEditorStudio = lazy(() => import('./pages/editors/GunlimboEditorStudio'));
const SsulEditorStudio = lazy(() => import('./pages/editors/SsulEditorStudio'));
const ClassicTemplateStudio = lazy(() => import('./pages/templates/ClassicTemplateStudio'));
const InstaTemplateStudio = lazy(() => import('./pages/templates/InstaTemplateStudio'));
const GunlimboTemplateStudio = lazy(() => import('./pages/templates/GunlimboTemplateStudio'));
const SsulTemplateStudio = lazy(() => import('./pages/templates/SsulTemplateStudio'));
const SubtitleToolStudio = lazy(() => import('./pages/tools/SubtitleToolStudio'));
const TtsDubToolStudio = lazy(() => import('./pages/tools/TtsDubToolStudio'));
const ClipEditToolStudio = lazy(() => import('./pages/tools/ClipEditToolStudio'));
const ConversationalDirectorPage = lazy(() => import('./pages/ConversationalDirectorPage').then(m => ({ default: m.ConversationalDirectorPage })));
const SourcingCenterPage = lazy(() => import('./pages/SourcingCenterPage'));

const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="flex items-center justify-center h-full w-full p-10 mt-20">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">{title}</h1>
            <p className="text-slate-500">해당 기능은 서버 버전 최적화 작업 중입니다.</p>
        </div>
    </div>
);

class RouteErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("=== RouteErrorBoundary ===\nError:", error.message, "\nStack:", error.stack, "\nComponent Stack:", errorInfo.componentStack);
        
        // [Auto-Recovery] Vite 모듈 동적 임포트 / 캐시 불일치 시 1회 자동 새로고침 자가 치유
        const isChunkError = error.message?.includes('dynamically imported module') ||
                             error.message?.includes('Outdated Optimize Dep') ||
                             error.message?.includes('Failed to fetch');
        if (isChunkError && typeof window !== 'undefined') {
            const reloadKey = 'route_err_reload_' + window.location.hash;
            if (!sessionStorage.getItem(reloadKey)) {
                sessionStorage.setItem(reloadKey, '1');
                console.log("🔄 [RouteErrorBoundary] 동적 모듈 캐시 갱신을 위해 1회 자동 새로고침을 실행합니다.");
                window.location.reload();
            }
        }
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '24px', background: '#fee2e2', color: '#7f1d1d', height: '100%', overflow: 'auto', fontFamily: 'monospace' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>페이지 로드 안내</h2>
                    <div style={{ background: '#fca5a5', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
                        <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                            {this.state.error?.message || '모듈을 불러오는 중 문제가 발생했습니다.'}
                        </strong>
                        <p style={{ fontSize: '12px', marginTop: '6px', color: '#450a0a' }}>
                            신규 의존성 패키징 또는 캐시 갱신 지연일 수 있습니다. 새로고침을 클릭하여 다시 시도해주세요.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => {
                                window.location.reload();
                            }}
                            style={{
                                padding: '8px 16px',
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '13px'
                            }}
                        >
                            🔄 새로고침하여 다시 로드
                        </button>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.hash = '#/';
                            }}
                            style={{
                                padding: '8px 16px',
                                background: '#64748b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '13px'
                            }}
                        >
                            홈으로 이동
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function MainAppContent() {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 font-sans">
                <div className="relative flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                </div>
                <p className="mt-4 text-[10px] font-bold text-slate-600 tracking-wider uppercase animate-pulse">
                    ViraLoop Studio 세션 초기화 중...
                </p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return (
        <Layout>
            <Suspense fallback={
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm animate-pulse">
                    페이지 로딩 중...
                </div>
            }>
                <Routes>
                    <Route path="/" element={<RouteErrorBoundary><Home /></RouteErrorBoundary>} />
                    <Route path="/channel-dna-studio" element={<RouteErrorBoundary><ChannelDnaStudio /></RouteErrorBoundary>} />
                    <Route path="/sourcing-center" element={<RouteErrorBoundary><SourcingCenterPage /></RouteErrorBoundary>} />
                    <Route path="/douyin-search" element={<RouteErrorBoundary><SmartDouyinSearch /></RouteErrorBoundary>} />
                    <Route path="/research-concept-lab" element={<RouteErrorBoundary><ResearchConceptLab /></RouteErrorBoundary>} />
                    <Route path="/shorts-production-studio" element={<RouteErrorBoundary><ShortsProductionStudio /></RouteErrorBoundary>} />
                    {/* 대화형 총괄 연출 스튜디오 (Conversational Director Studio) */}
                    <Route path="/director" element={<RouteErrorBoundary><ConversationalDirectorPage /></RouteErrorBoundary>} />
                    <Route path="/conversational-director" element={<Navigate to="/director" replace />} />

                    {/* 올인원 일괄 생성 */}
                    <Route path="/shorts-batch" element={<RouteErrorBoundary><ShortsBatchStudio /></RouteErrorBoundary>} />

                    {/* 플래그십 프로 NLE 비디오 편집기 */}
                    <Route path="/pro-editor" element={<RouteErrorBoundary><ProVideoEditorStudio /></RouteErrorBoundary>} />
                    <Route path="/video-editor" element={<Navigate to="/pro-editor" replace />} />
                    <Route path="/editor" element={<Navigate to="/pro-editor" replace />} />

                    {/* 4대 전문 편집기 */}
                    <Route path="/shorts-editor" element={<Navigate to="/shorts-editor/classic" replace />} />
                    <Route path="/shorts-editor-studio" element={<Navigate to="/shorts-editor/classic" replace />} />
                    <Route path="/shorts-editor/classic" element={<RouteErrorBoundary><ClassicEditorStudio /></RouteErrorBoundary>} />
                    <Route path="/shorts-editor/instagram" element={<RouteErrorBoundary><InstaEditorStudio /></RouteErrorBoundary>} />
                    <Route path="/shorts-editor/gunlimbo" element={<RouteErrorBoundary><GunlimboEditorStudio /></RouteErrorBoundary>} />
                    <Route path="/shorts-editor/ssul" element={<RouteErrorBoundary><SsulEditorStudio /></RouteErrorBoundary>} />

                    {/* 4대 템플릿 디자인실 */}
                    <Route path="/shorts-template-studio" element={<Navigate to="/shorts-template/classic" replace />} />
                    <Route path="/shorts-template/classic" element={<RouteErrorBoundary><ClassicTemplateStudio /></RouteErrorBoundary>} />
                    <Route path="/shorts-template/instagram" element={<RouteErrorBoundary><InstaTemplateStudio /></RouteErrorBoundary>} />
                    <Route path="/shorts-template/gunlimbo" element={<RouteErrorBoundary><GunlimboTemplateStudio /></RouteErrorBoundary>} />
                    <Route path="/shorts-template/ssul" element={<RouteErrorBoundary><SsulTemplateStudio /></RouteErrorBoundary>} />

                    {/* 3대 공정별 도구 */}
                    <Route path="/tools/subtitles" element={<RouteErrorBoundary><SubtitleToolStudio /></RouteErrorBoundary>} />
                    <Route path="/tools/tts-dub" element={<RouteErrorBoundary><TtsDubToolStudio /></RouteErrorBoundary>} />
                    <Route path="/tools/clip-edit" element={<RouteErrorBoundary><ClipEditToolStudio /></RouteErrorBoundary>} />

                    <Route path="/ddalkkak" element={<RouteErrorBoundary><ShortsProductionStudio /></RouteErrorBoundary>} />
                    <Route path="/scene-cutter-pro" element={<RouteErrorBoundary><SceneCutter /></RouteErrorBoundary>} />
                    <Route path="/ai-copilot" element={<RouteErrorBoundary><AICoPilotStudio /></RouteErrorBoundary>} />
                    <Route path="/flow2capcut" element={
                        <RouteErrorBoundary>
                            <ModeProvider>
                                <I18nProvider>
                                    <ToastProvider>
                                        <Shell>
                                            <Flow2CapCutApp />
                                        </Shell>
                                    </ToastProvider>
                                </I18nProvider>
                            </ModeProvider>
                        </RouteErrorBoundary>
                    } />
                    <Route path="/agent-studio" element={<Navigate to="/instant-studio" replace />} />
                    <Route path="/instant-studio" element={<RouteErrorBoundary><InstantStudioPage /></RouteErrorBoundary>} />
                    <Route path="/war-room" element={<RouteErrorBoundary><StudioWarRoom /></RouteErrorBoundary>} />
                    <Route path="/pipeline-builder" element={<RouteErrorBoundary><PipelineBuilderPage /></RouteErrorBoundary>} />
                    <Route path="/brain-vault" element={<RouteErrorBoundary><BrainVaultPage /></RouteErrorBoundary>} />
                    <Route path="/agent-roster" element={<RouteErrorBoundary><AgentRosterPage /></RouteErrorBoundary>} />
                    <Route path="/autonomous-patrol" element={<RouteErrorBoundary><AutonomousPatrolPage /></RouteErrorBoundary>} />
                    <Route path="/download" element={<RouteErrorBoundary><DirectDownload /></RouteErrorBoundary>} />

                    {/* Fallback Missing Routes */}
                    <Route path="/stealth" element={<Navigate to="/incubator" replace />} />
                    <Route path="/scissors" element={<Navigate to="/scene-cutter-pro" replace />} />
                    <Route path="/distribution-network" element={<Navigate to="/work-queue" replace />} />

                    <Route path="/channels" element={<RouteErrorBoundary><ChannelManager /></RouteErrorBoundary>} />
                    <Route path="/trend-radar" element={<RouteErrorBoundary><TrendRadarPage /></RouteErrorBoundary>} />
                    <Route path="/sns-radar" element={<RouteErrorBoundary><SnsRadarStudio /></RouteErrorBoundary>} />

                    {/* Captain Management */}
                    <Route path="/captain/dashboard" element={<RouteErrorBoundary><CaptainQuarters /></RouteErrorBoundary>} />
                    <Route path="/captain/:profileId/dashboard" element={<RouteErrorBoundary><CaptainQuarters /></RouteErrorBoundary>} />
                    <Route path="/captain/:profileId/channels" element={<RouteErrorBoundary><CaptainQuarters /></RouteErrorBoundary>} />
                    <Route path="/captain/:profileId/settings" element={<RouteErrorBoundary><CaptainQuarters /></RouteErrorBoundary>} />
                    <Route path="/captain/:profileId" element={<RouteErrorBoundary><CaptainQuarters /></RouteErrorBoundary>} />
                    <Route path="/captain/channels" element={<RouteErrorBoundary><CaptainQuarters /></RouteErrorBoundary>} />
                    <Route path="/captain" element={<RouteErrorBoundary><CaptainQuarters /></RouteErrorBoundary>} />
                    <Route path="/account-manager" element={<Navigate to="/incubator" replace />} />

                    <Route path="/resource-guide" element={<RouteErrorBoundary><ResourceGuidePage /></RouteErrorBoundary>} />
                    <Route path="/work-queue" element={<RouteErrorBoundary><WorkQueue /></RouteErrorBoundary>} />
                    <Route path="/reports" element={<RouteErrorBoundary><ReportsPage /></RouteErrorBoundary>} />
                    <Route path="/analytics" element={<RouteErrorBoundary><ChannelAnalyticsPage /></RouteErrorBoundary>} />
                    <Route path="/viral-lab" element={<RouteErrorBoundary><ViralLabPage /></RouteErrorBoundary>} />
                    <Route path="/viral-intelligence" element={<RouteErrorBoundary><ViralIntelligenceCenter /></RouteErrorBoundary>} />
                    <Route path="/community" element={<RouteErrorBoundary><CommunityManagerPage /></RouteErrorBoundary>} />

                    {/* Station Manager */}
                    <Route path="/station-manager" element={<RouteErrorBoundary><StationManager /></RouteErrorBoundary>} />
                    <Route path="/station-manager/:stationId" element={<RouteErrorBoundary><StationDetail /></RouteErrorBoundary>} />

                    {/* Remotion Preview */}
                    <Route path="/remotion-preview" element={<RouteErrorBoundary><RemotionPreviewPage /></RouteErrorBoundary>} />

                    <Route path="/script-lab" element={<RouteErrorBoundary><ScriptLab /></RouteErrorBoundary>} />
                    <Route path="/gallery" element={<RouteErrorBoundary><Gallery /></RouteErrorBoundary>} />
                    <Route path="/settings" element={<RouteErrorBoundary><Settings /></RouteErrorBoundary>} />
                    <Route path="/script-writer" element={<RouteErrorBoundary><ScriptWriter /></RouteErrorBoundary>} />

                    <Route path="/subtitle-tool" element={<RouteErrorBoundary><SubtitleConverter /></RouteErrorBoundary>} />
                    <Route path="/multi-tts" element={<RouteErrorBoundary><MultiTTS /></RouteErrorBoundary>} />
                    <Route path="/silence-remover" element={<RouteErrorBoundary><SilenceRemover /></RouteErrorBoundary>} />
                    <Route path="/remover" element={<RouteErrorBoundary><RemoverEditor /></RouteErrorBoundary>} />
                    <Route path="/creative-studio" element={
                        <RouteErrorBoundary>
                            <ModeProvider>
                                <I18nProvider>
                                    <ToastProvider>
                                        <Shell>
                                            <CreativeStudio />
                                        </Shell>
                                    </ToastProvider>
                                </I18nProvider>
                            </ModeProvider>
                        </RouteErrorBoundary>
                    } />
                    <Route path="/live-studio" element={<RouteErrorBoundary><LiveStudio /></RouteErrorBoundary>} />
                    <Route path="/virtual-studio" element={<RouteErrorBoundary><VirtualStudio /></RouteErrorBoundary>} />
                    <Route path="/custom-menu" element={<RouteErrorBoundary><CustomMenu /></RouteErrorBoundary>} />
                    <Route path="/guide-center" element={<RouteErrorBoundary><GuideCenter /></RouteErrorBoundary>} />
                    <Route path="/incubator" element={<RouteErrorBoundary><Incubator /></RouteErrorBoundary>} />
                    <Route path="/research-brief" element={<RouteErrorBoundary><ResearchBrief /></RouteErrorBoundary>} />
                    
                    {/* Catch-all redirect to Home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </Layout>
    );
}

function App() {
    return (
        <ThemeProvider defaultTheme="light" storageKey="viraloop-theme">
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <I18nProvider>
                    <AuthProvider>
                        <ToastProvider>
                            <MainAppContent />
                        </ToastProvider>
                    </AuthProvider>
                </I18nProvider>
            </Router>
        </ThemeProvider>
    );
}

export default App;
