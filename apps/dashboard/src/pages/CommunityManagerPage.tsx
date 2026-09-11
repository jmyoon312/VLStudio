import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    MessageSquare,
    Sparkles,
    Send,
    Check,
    Copy,
    Filter,
    Bot,
    User,
    RefreshCw,
    ShieldAlert,
    CheckCircle2,
    Lock,
    Zap,
    Globe,
    ShieldCheck,
    Cpu,
    Play,
    Shield,
    Sliders
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

type Persona = 'friendly' | 'witty' | 'expert';
type SentimentFilter = 'all' | 'question' | 'praise' | 'criticism' | 'spam';
type AutopilotMode = 'SAFE_AUTO' | 'FULL_AUTO' | 'MANUAL_REVIEW';

export default function CommunityManagerPage() {
    const [selectedChannel, setSelectedChannel] = useState<string>('all');
    const [persona, setPersona] = useState<Persona>('friendly');
    const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
    const [currentMode, setCurrentMode] = useState<AutopilotMode>('SAFE_AUTO');
    const queryClient = useQueryClient();

    // 1. 채널 목록 및 현재 채널 보안 네트워크 상태 조회
    const { data: channelData } = useQuery({
        queryKey: ['community_channels', selectedChannel],
        queryFn: async () => {
            const res = await api.get(`/analytics/channels?channel_id=${encodeURIComponent(selectedChannel)}&time_range=monthly`);
            return res.data;
        }
    });
    const channels = channelData?.channels || [];
    const activeSecurity = channelData?.active_security;

    // 2. 루피 AI 커뮤니티 오토파일럿 상태 조회
    const { data: autopilotStatus, isLoading: isAutopilotLoading } = useQuery({
        queryKey: ['community_autopilot_status'],
        queryFn: async () => {
            const res = await api.get('/community/autopilot/status');
            return res.data;
        }
    });

    // 3. 댓글 목록 실시간 조회 (채널별 & 감성 필터 연동)
    const { data: comments = [], isLoading, refetch } = useQuery({
        queryKey: ['community_comments', selectedChannel, sentimentFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedChannel && selectedChannel !== 'all') {
                params.append('channel_id', selectedChannel);
            }
            if (sentimentFilter && sentimentFilter !== 'all') {
                params.append('sentiment', sentimentFilter);
            }
            const qs = params.toString() ? `?${params.toString()}` : '';
            const res = await api.get(`/community/comments${qs}`);
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    // 4. 루피 AI 워커 즉시 1회 가동 뮤테이션
    const runAutopilotMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/community/autopilot/run-now', {
                channel_id: selectedChannel !== 'all' ? selectedChannel : null
            });
            return res.data;
        },
        onSuccess: (data: any) => {
            toast.success(
                `🤖 루피 AI 워커 가동 완료: 총 ${data?.auto_replied_count || 0}건 자동 답글 완료, ${data?.flagged_for_review || 0}건 직접 검토 보류!`
            );
            queryClient.invalidateQueries({ queryKey: ['community_comments'] });
            queryClient.invalidateQueries({ queryKey: ['community_autopilot_status'] });
        },
        onError: (err: any) => {
            toast.error(`워커 가동 실패: ${err.message || '오류 발생'}`);
        }
    });

    // 5. 채널별 오토파일럿 모드 설정 변경 뮤테이션
    const updateConfigMutation = useMutation({
        mutationFn: async ({ mode, p }: { mode?: AutopilotMode; p?: Persona }) => {
            const res = await api.post('/community/autopilot/channel-config', {
                channel_id: selectedChannel,
                autopilot_mode: mode || currentMode,
                persona: p || persona
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("⚙️ 채널 커뮤니티 정책이 성공적으로 반영되었습니다!");
            queryClient.invalidateQueries({ queryKey: ['community_autopilot_status'] });
        }
    });

    // 6. 루피 AI 개별 답글 생성 뮤테이션
    const generateReplyMutation = useMutation({
        mutationFn: async ({ comment_id, p }: { comment_id: string; p: Persona }) => {
            const res = await api.post('/community/generate-reply', {
                comment_id,
                persona: p
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("🤖 루피 AI가 새로운 맞춤 답글을 작성했습니다!");
            queryClient.invalidateQueries({ queryKey: ['community_comments'] });
        },
        onError: (err: any) => {
            toast.error(`답글 생성 실패: ${err.message || '오류 발생'}`);
        }
    });

    // 7. 직접 제어: 유튜브 답글 공식 게시 뮤테이션
    const postReplyMutation = useMutation({
        mutationFn: async ({ comment_id, custom_reply }: { comment_id: string; custom_reply?: string }) => {
            const res = await api.post('/community/post-reply', {
                comment_id,
                custom_reply
            });
            return res.data;
        },
        onSuccess: (data: any) => {
            const secInfo = data?.security_mode === 'ISP_PROXY'
                ? '🔒 고정 ISP 프록시 안전 통신'
                : data?.lte_rotated
                ? '⚡ LTE 소프트 IP 안전 교체'
                : '🛡️ 채널 보안 네트워크 통신';
            toast.success(`✅ 직접 승인 답글이 유튜브에 공식 게시되었습니다! (${secInfo})`);
            queryClient.invalidateQueries({ queryKey: ['community_comments'] });
        },
        onError: (err: any) => {
            toast.error(`게시 실패: ${err.message || '오류 발생'}`);
        }
    });

    const handleModeChange = (mode: AutopilotMode) => {
        setCurrentMode(mode);
        updateConfigMutation.mutate({ mode, p: persona });
    };

    const handlePersonaChange = (p: Persona) => {
        setPersona(p);
        updateConfigMutation.mutate({ mode: currentMode, p });
    };

    const sentimentLabels: Record<SentimentFilter, string> = {
        all: '전체 댓글',
        question: '❓ 질문형',
        praise: '✨ 칭찬/호평',
        criticism: '⚠️ 비판/의문',
        spam: '🚫 스팸 의심'
    };

    return (
        <div className="space-y-6 pb-20 md:pb-8">
            {/* 상단 헤더: 제목, 채널 선택기, 보안 접속 뱃지 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-sky-500" />
                        <span>댓글 소통 & 인게이지먼트 센터</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        루피 AI 사령탑과 백그라운드 워커가 채널별 시청자 댓글을 수집하고, 안전 네트워크망을 통해 자동/직접 제어 소통을 수행합니다.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {/* 채널 선택 드롭다운 */}
                    <select
                        value={selectedChannel}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        className="h-8 text-xs font-semibold rounded-lg bg-card border border-border text-foreground px-2.5 shadow-2xs focus:outline-hidden"
                    >
                        <option value="all">전체 채널 통합 보기 ({channels.length ? `${channels.length}개 채널` : '통합'})</option>
                        {channels.map((c: any) => (
                            <option key={c.id} value={c.id}>
                                {c.title || `채널 #${c.id}`} {c.security?.is_static ? '[고정 ISP]' : '[LTE]'}
                            </option>
                        ))}
                    </select>

                    {/* 채널 보안 네트워크 상태 뱃지 */}
                    {activeSecurity && (
                        <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                activeSecurity.badge_type === 'isp_proxy'
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
                                    : activeSecurity.badge_type === 'lte_proxy'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                    : 'bg-muted/60 text-muted-foreground border-border'
                            }`}
                            title={activeSecurity.description}
                        >
                            {activeSecurity.badge_type === 'isp_proxy' && <Lock className="w-3.5 h-3.5" />}
                            {activeSecurity.badge_type === 'lte_proxy' && <Zap className="w-3.5 h-3.5" />}
                            {activeSecurity.badge_type === 'direct' && <Globe className="w-3.5 h-3.5" />}
                            {activeSecurity.badge_type === 'all' && <ShieldCheck className="w-3.5 h-3.5" />}
                            <span>{activeSecurity.label}</span>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border-border"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>
                </div>
            </div>

            {/* 🤖 루피 AI 커뮤니티 사령탑 & 워커 관제 패널 */}
            <Card className="border-sky-500/30 bg-gradient-to-br from-sky-500/5 via-card to-card rounded-2xl shadow-2xs overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-500">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <span>루피 AI 커뮤니티 사령탑 (Autopilot & Direct Control)</span>
                                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-mono">
                                    워커 가동 중 (5분 주기)
                                </Badge>
                            </CardTitle>
                        </div>
                    </div>

                    {/* 루피 워커 즉시 가동 버튼 */}
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => runAutopilotMutation.mutate()}
                            disabled={runAutopilotMutation.isPending}
                            size="sm"
                            className="bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl gap-1.5 h-8 text-xs shadow-xs"
                        >
                            <Zap className={`w-3.5 h-3.5 text-amber-300 ${runAutopilotMutation.isPending ? 'animate-spin' : ''}`} />
                            {runAutopilotMutation.isPending ? "루피 워커 순회 처리 중..." : "⚡ 루피 워커 즉시 가동 (Run Now)"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* 제어 모드 선택기 (안전 자동 vs 완전 자율 vs 직접 제어) */}
                        <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
                            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-sky-500" />
                                <span>채널 자율 운영 모드 (HITL 통제)</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    onClick={() => handleModeChange('SAFE_AUTO')}
                                    className={`p-2 rounded-lg text-left transition-all border ${
                                        currentMode === 'SAFE_AUTO'
                                            ? 'bg-sky-500/15 border-sky-500/40 text-foreground shadow-2xs'
                                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="text-[11px] font-bold text-sky-500 flex items-center gap-1">
                                        🛡️ 안전 자동
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                        칭찬·질문 자동 / 악플 텔레그램 보고
                                    </p>
                                </button>

                                <button
                                    onClick={() => handleModeChange('FULL_AUTO')}
                                    className={`p-2 rounded-lg text-left transition-all border ${
                                        currentMode === 'FULL_AUTO'
                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-foreground shadow-2xs'
                                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                                        ⚡ 완전 자율
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                        워커가 100% 자율 게시
                                    </p>
                                </button>

                                <button
                                    onClick={() => handleModeChange('MANUAL_REVIEW')}
                                    className={`p-2 rounded-lg text-left transition-all border ${
                                        currentMode === 'MANUAL_REVIEW'
                                            ? 'bg-purple-500/15 border-purple-500/40 text-foreground shadow-2xs'
                                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="text-[11px] font-bold text-purple-500 flex items-center gap-1">
                                        🎯 직접 제어
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                        초안 작성 후 승인 대기 (HITL)
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* 루피 AI 채널 페르소나 설정 */}
                        <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
                            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5 text-sky-500" />
                                <span>루피 AI 채널 페르소나 튜닝</span>
                            </div>
                            <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
                                {(['friendly', 'witty', 'expert'] as Persona[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => handlePersonaChange(p)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
                                            persona === p
                                                ? 'bg-sky-600 text-white shadow-2xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {p === 'friendly' ? '😊 친절형' : p === 'witty' ? '⚡ 위트형' : '🎓 지식형'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                * 선택한 페르소나 프롬프트가 루피 AI 브레인(DB Settings 단일 진실 공급원)에 실시간 반영됩니다.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 감성 필터 탭 바 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(['all', 'question', 'praise', 'criticism', 'spam'] as SentimentFilter[]).map((s) => (
                    <button
                        key={s}
                        onClick={() => setSentimentFilter(s)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap border ${
                            sentimentFilter === s
                                ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                                : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}
                    >
                        {sentimentLabels[s]}
                    </button>
                ))}
            </div>

            {/* 댓글 카드 목록 */}
            <div className="grid grid-cols-1 gap-3.5">
                {comments.length === 0 ? (
                    <Card className="border-border bg-card rounded-2xl p-8 text-center text-muted-foreground">
                        해당 채널 및 조건의 댓글이 없습니다.
                    </Card>
                ) : (
                    comments.map((c: any) => (
                        <Card key={c.id || c.comment_id} className="border-border bg-card rounded-2xl shadow-2xs overflow-hidden">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500 font-bold text-xs shrink-0 mt-0.5">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-foreground flex flex-wrap items-center gap-1.5">
                                                <span>{c.author_name}</span>
                                                {c.channel_id && (
                                                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                                                        채널 #{c.channel_id.slice(-6)}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px] text-muted-foreground font-sans">
                                                    {c.video_title}
                                                </Badge>
                                                {c.sentiment === 'question' && (
                                                    <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/30 text-[10px] font-bold">
                                                        질문
                                                    </Badge>
                                                )}
                                                {c.sentiment === 'praise' && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-bold">
                                                        호평
                                                    </Badge>
                                                )}
                                                {c.sentiment === 'criticism' && (
                                                    <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/30 text-[10px] font-bold">
                                                        주의/비판
                                                    </Badge>
                                                )}
                                                {c.sentiment === 'spam' && (
                                                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] font-bold">
                                                        스팸의심
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs sm:text-sm text-foreground mt-1 leading-relaxed">{c.text}</p>
                                        </div>
                                    </div>

                                    {/* 응답 상태 뱃지 */}
                                    <div className="shrink-0 flex items-center gap-1.5">
                                        {c.is_replied ? (
                                            c.reply_mode === 'auto' ? (
                                                <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-bold">
                                                    ⚡ 루피 오토파일럿 자동 게시
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                                    ✅ 직접 승인 게시 완료
                                                </Badge>
                                            )
                                        ) : (
                                            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px] font-bold">
                                                ⏳ 답글 대기 중
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* 루피 AI 추천 맞춤 답글 박스 */}
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-500">
                                        <span className="flex items-center gap-1">
                                            <Bot className="w-3.5 h-3.5" /> 루피 AI 추천 답글 ({persona === 'friendly' ? '친절형' : persona === 'witty' ? '위트형' : '전문가형'})
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => generateReplyMutation.mutate({ comment_id: c.comment_id, p: persona })}
                                            disabled={generateReplyMutation.isPending}
                                            className="h-6 text-[10px] px-2 text-sky-500 hover:text-sky-600 hover:bg-sky-500/10"
                                        >
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            재작성
                                        </Button>
                                    </div>
                                    <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                                        {c.ai_reply || '루피 AI가 맞춤형 답글을 작성하고 있습니다...'}
                                    </p>
                                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Lock className="w-3 h-3 text-purple-400" />
                                            게시 시 채널 보안 네트워크(ISP/LTE)가 자동 적용됩니다
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(c.ai_reply || '');
                                                    toast.success("답글이 클립보드에 복사되었습니다.");
                                                }}
                                                className="h-7 text-xs font-bold gap-1 border-border bg-background hover:bg-muted"
                                            >
                                                <Copy className="w-3 h-3" /> 복사
                                            </Button>
                                            {!c.is_replied && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => postReplyMutation.mutate({ comment_id: c.comment_id })}
                                                    disabled={postReplyMutation.isPending}
                                                    className="h-7 text-xs font-bold gap-1 bg-sky-600 hover:bg-sky-500 text-white"
                                                >
                                                    <Send className="w-3 h-3" /> 사령탑 직접 승인 게시
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}