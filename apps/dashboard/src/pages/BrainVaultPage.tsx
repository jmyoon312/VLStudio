import React, { useState, useEffect, useMemo } from 'react';
import { 
    BrainCircuit, Sparkles, BookOpen, Save, RefreshCcw, 
    ShieldCheck, Lightbulb, Check, Search, Plus, Filter,
    Copy, Trash2, Eye, Code, Terminal, Zap, CheckCircle2,
    Sliders, History, FileText, ArrowUpRight, Share2, Layers,
    Clock, Tag, Bookmark, Flame, Cpu, ArrowRight, Tv, Wand2,
    Database, Hash, AlertTriangle, Play
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';

interface SkillItem {
    name: string;
    filename: string;
    content: string;
}

interface ChannelItem {
    id: number;
    name?: string;
    title?: string;
    handle?: string;
    url?: string;
    category?: string;
}

interface FtsMemoryItem {
    id: number | string;
    channel_id: number;
    topic: string;
    winning_hook?: string;
    jjap_pattern?: string;
    title?: string;
    content?: string;
    score?: number;
    category?: string;
    created_at?: string;
}

export const BrainVaultPage: React.FC = () => {
    // Channel Management
    const [channels, setChannels] = useState<ChannelItem[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<number>(1);
    const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);

    // Main States
    const [activeTab, setActiveTab] = useState<'skills' | 'memory' | 'soul'>('skills');
    const [soul, setSoul] = useState('');
    const [skills, setSkills] = useState<SkillItem[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSavingSoul, setIsSavingSoul] = useState(false);
    const [isMintingSkills, setIsMintingSkills] = useState(false);

    // FTS Memory & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [ftsMemoryResults, setFtsMemoryResults] = useState<FtsMemoryItem[]>([]);
    const [isSearchingFts, setIsSearchingFts] = useState(false);
    const [memoryViewMode, setMemoryViewMode] = useState<'cards' | 'raw'>('cards');

    // Modals
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [newSkillName, setNewSkillName] = useState('');
    const [newSkillContent, setNewSkillContent] = useState('');

    const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
    const [isSkillDetailOpen, setIsSkillDetailOpen] = useState(false);

    const [isWisdomModalOpen, setIsWisdomModalOpen] = useState(false);
    const [newWisdomTopic, setNewWisdomTopic] = useState('');
    const [newWinningHook, setNewWinningHook] = useState('');
    const [newJjapPattern, setNewJjapPattern] = useState('');
    const [newWisdomScore, setNewWisdomScore] = useState<number>(95);

    // Rule Presets for Soul.md
    const rulePresets = [
        { label: '+ 3초 뇌관 후킹 원칙', text: '\n- **[3초 뇌관 후킹]**: 첫 3초 이내에 시청각적 충격 질문 배치 및 스크롤 이탈 방지 장치 필수 삽입.' },
        { label: '+ 0.8초 쨉쨉이 템포', text: '\n- **[0.8초 쨉쨉이]**: 숏폼 기준 매 2.4초마다 앵글 전환 및 0.8초 자막 쨉쨉이 단어 배치와 효과음 싱크.' },
        { label: '+ 전문 TTS 호흡 쉼표', text: '\n- **[TTS 음성 호흡]**: 문장 종결 시 온점(.) 뒤 0.3초 무음 패딩 부여 및 BGM -18dB 덕킹 적용.' },
        { label: '+ 화풍 일관성 시드 고정', text: '\n- **[캐릭터 일관성 락]**: 동일 인물 등장 시 레퍼런스 이미지 ID 및 조명 톤앤매너 프롬프트 강제 계승.' },
        { label: '+ 클린 알고리즘 쉴드', text: '\n- **[클린 알고리즘]**: 폭력성/자극성 키워드는 은유적 표현으로 순화하여 플랫폼 노란딱지 원천 차단.' }
    ];

    // 1. Load Channels
    const loadChannels = async () => {
        setIsLoadingChannels(true);
        try {
            const res = await api.get('/channels/');
            if (res.data && Array.isArray(res.data)) {
                setChannels(res.data);
                if (res.data.length > 0 && !res.data.some(c => c.id === selectedChannelId)) {
                    setSelectedChannelId(res.data[0].id);
                }
            }
        } catch (err) {
            console.warn("채널 목록 조회 실패 (기본값 채널 1 유지):", err);
            setChannels([{ id: 1, name: '기본 채널 1호기', handle: '@channel1' }]);
        } finally {
            setIsLoadingChannels(false);
        }
    };

    // 2. Load Skills & Soul for Selected Channel
    const loadChannelData = async (channelId: number) => {
        setIsLoadingData(true);
        try {
            // Load Channel Skills
            try {
                const skillsRes = await api.get(`/agent/skills/channel/${channelId}`);
                if (skillsRes.data && Array.isArray(skillsRes.data)) {
                    setSkills(skillsRes.data);
                } else {
                    setSkills([]);
                }
            } catch (skillErr) {
                console.warn(`채널 ${channelId} 스킬 로드 실패, 전역 스킬 조회:`, skillErr);
                const globalRes = await api.get('/agent/memory');
                setSkills(globalRes.data?.skills || []);
            }

            // Load Soul
            try {
                const soulRes = await api.get('/agent/memory');
                setSoul(soulRes.data?.soul || '');
            } catch (soulErr) {
                console.warn("Soul 로드 실패:", soulErr);
            }
        } catch (err: any) {
            toast.error("데이터 로드 실패: " + err.message);
        } finally {
            setIsLoadingData(false);
        }
    };

    // 3. Search Hermes FTS5 Memory for Channel
    const searchFtsMemory = async (channelId: number, query: string) => {
        setIsSearchingFts(true);
        try {
            const q = query.trim() || '쨉쨉이';
            const res = await api.get(`/agent/memory/channel/${channelId}/search?q=${encodeURIComponent(q)}`);
            if (res.data && Array.isArray(res.data)) {
                setFtsMemoryResults(res.data);
            } else {
                setFtsMemoryResults([]);
            }
        } catch (err) {
            console.warn("FTS Memory 검색 실패:", err);
            setFtsMemoryResults([]);
        } finally {
            setIsSearchingFts(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadChannels();
    }, []);

    // When channel changes
    useEffect(() => {
        if (selectedChannelId) {
            loadChannelData(selectedChannelId);
            searchFtsMemory(selectedChannelId, searchQuery);
        }
    }, [selectedChannelId]);

    // Debounced FTS Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedChannelId) {
                searchFtsMemory(selectedChannelId, searchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedChannelId]);

    // Action: Mint 8 Core Skills for Channel
    const handleMintAllSkills = async () => {
        if (!selectedChannelId) return;
        setIsMintingSkills(true);
        try {
            const res = await api.post(`/agent/skills/channel/${selectedChannelId}/mint-all`);
            if (res.data?.success) {
                toast.success(`[채널 ${selectedChannelId}] 8대 실전 스킬팩이 성공적으로 일괄 민팅 및 등록되었습니다!`);
                await loadChannelData(selectedChannelId);
                await searchFtsMemory(selectedChannelId, searchQuery);
            } else {
                toast.error("스킬팩 생성 실패: " + (res.data?.detail || "알 수 없는 오류"));
            }
        } catch (err: any) {
            toast.error("스킬팩 생성 통신 오류: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsMintingSkills(false);
        }
    };

    // Action: Save Soul.md
    const handleSaveSoul = async () => {
        setIsSavingSoul(true);
        try {
            await api.put('/agent/memory/soul', { content: soul });
            toast.success("총괄 디렉터 헌법(soul.md)이 영구 기억고에 반영되었습니다.");
        } catch (err: any) {
            toast.error("헌법 저장 실패: " + err.message);
        } finally {
            setIsSavingSoul(false);
        }
    };

    // Action: Save New Channel Skill
    const handleSaveNewSkill = async () => {
        if (!newSkillName.trim() || !newSkillContent.trim()) {
            toast.error("스킬 영문 식별자와 플레이북 내용을 입력해주세요.");
            return;
        }

        try {
            await api.post(`/agent/skills/channel/${selectedChannelId}`, {
                name: newSkillName.trim(),
                content: newSkillContent.trim()
            });
            toast.success(`'${newSkillName}' 스킬이 채널 ${selectedChannelId} 보관소에 등록되었습니다.`);
            setNewSkillName('');
            setNewSkillContent('');
            setIsSkillModalOpen(false);
            loadChannelData(selectedChannelId);
        } catch (err: any) {
            toast.error("스킬 등록 실패: " + err.message);
        }
    };

    // Action: Delete Channel Skill
    const handleDeleteSkill = async (skillName: string) => {
        if (!confirm(`'${skillName}' 스킬 플레이북을 채널 ${selectedChannelId}에서 정말 삭제하시겠습니까?`)) return;
        try {
            await api.delete(`/agent/skills/channel/${selectedChannelId}/${encodeURIComponent(skillName)}`);
            toast.success(`'${skillName}' 스킬이 삭제되었습니다.`);
            loadChannelData(selectedChannelId);
        } catch (err: any) {
            toast.error("스킬 삭제 실패: " + err.message);
        }
    };

    // Action: Record Winning Wisdom in Hermes FTS5
    const handleRecordWisdom = async () => {
        if (!newWisdomTopic.trim() || !newWinningHook.trim()) {
            toast.error("주제와 승리 후킹 공식을 입력해주세요.");
            return;
        }

        try {
            const res = await api.post(`/agent/memory/channel/${selectedChannelId}/record`, {
                topic: newWisdomTopic.trim(),
                winning_hook: newWinningHook.trim(),
                jjap_pattern: newJjapPattern.trim() || "0.8초 템포 쨉쨉이 자막 & 텐션 SFX",
                score: newWisdomScore || 95.0
            });
            if (res.data?.success) {
                toast.success(`채널 ${selectedChannelId} Hermes FTS5 기억고에 떡상 승리 공식이 각인되었습니다!`);
                setIsWisdomModalOpen(false);
                setNewWisdomTopic('');
                setNewWinningHook('');
                setNewJjapPattern('');
                searchFtsMemory(selectedChannelId, searchQuery);
            } else {
                toast.error("각인 실패: " + (res.data?.detail || "알 수 없는 오류"));
            }
        } catch (err: any) {
            toast.error("각인 통신 오류: " + err.message);
        }
    };

    // Selected Channel Object
    const currentChannel = useMemo(() => {
        return channels.find(c => c.id === selectedChannelId) || { id: selectedChannelId, name: `채널 ${selectedChannelId}호기`, handle: '' };
    }, [channels, selectedChannelId]);

    // Skill category helpers
    const getSkillBadgeColor = (name: string) => {
        if (name.includes('hook')) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
        if (name.includes('script')) return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
        if (name.includes('meme') || name.includes('b_grade')) return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
        if (name.includes('voice')) return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
        if (name.includes('flow')) return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30';
        if (name.includes('smart_cut')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
        if (name.includes('capcut')) return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30';
        if (name.includes('clean')) return 'bg-teal-500/10 text-teal-500 border-teal-500/30';
        return 'bg-muted text-muted-foreground border-border';
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
            {/* Top Header & Channel Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                채널 브레인 & 스킬 팩토리 (Channel Brain & Skills)
                            </h1>
                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-mono font-bold">
                                Hermes FTS5 BM25 Core
                            </Badge>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                채널 격리 스킬팩 가동 중
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            수십~수백 개 채널의 일괄 대량 생산을 위해 채널별 8대 실전 스킬팩과 0.01초 FTS5 초고속 떡상 기억고를 독립 운영합니다.
                        </p>
                    </div>
                </div>

                {/* Right Controls: Channel Selector & Global Sync */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Target Channel Selector */}
                    <div className="flex items-center gap-2 bg-muted/40 border border-border px-3 py-1.5 rounded-2xl">
                        <Tv className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-bold text-muted-foreground shrink-0">대상 채널:</span>
                        <select
                            value={selectedChannelId}
                            onChange={(e) => setSelectedChannelId(Number(e.target.value))}
                            className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        >
                            {channels.map((ch) => (
                                <option key={ch.id} value={ch.id} className="bg-card text-foreground">
                                    [CH #{ch.id}] {ch.name || ch.title || `채널 ${ch.id}`} {ch.handle ? `(${ch.handle})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                            loadChannelData(selectedChannelId);
                            searchFtsMemory(selectedChannelId, searchQuery);
                        }}
                        disabled={isLoadingData}
                        className="text-xs border-border/80 h-9 rounded-xl font-bold gap-1.5"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                        재동기화
                    </Button>
                </div>
            </div>

            {/* Target Channel Telemetry Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card className="bg-card/70 border-border/80 p-3.5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground">채널 통합 스킬팩</div>
                            <div className="text-sm font-black text-foreground">
                                {skills.length} 개 등록
                            </div>
                        </div>
                    </div>
                    {skills.length < 8 ? (
                        <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                            민팅 권장
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                            8대 완비
                        </Badge>
                    )}
                </Card>

                <Card className="bg-card/70 border-border/80 p-3.5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black">
                            <Database className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground">Hermes FTS5 회상 인덱스</div>
                            <div className="text-sm font-black text-foreground">
                                {ftsMemoryResults.length} 건 즉시 인출
                            </div>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/30 font-mono">
                        0.01s Latency
                    </Badge>
                </Card>

                <Card className="bg-card/70 border-border/80 p-3.5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center font-black">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground">디렉팅 헌법 (soul.md)</div>
                            <div className="text-sm font-black text-foreground">
                                {soul.length > 0 ? `${soul.length.toLocaleString()} 자` : '0 자'}
                            </div>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                        100% 준수
                    </Badge>
                </Card>

                {/* Direct Mint Button Card */}
                <div className="flex items-center">
                    <Button
                        disabled={isMintingSkills}
                        onClick={handleMintAllSkills}
                        className="w-full h-full min-h-[56px] rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-xs shadow-md shadow-purple-500/20 flex items-center justify-center gap-2"
                    >
                        {isMintingSkills ? (
                            <RefreshCcw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Wand2 className="w-4 h-4 text-amber-300" />
                        )}
                        <span>이 채널 8대 실전 스킬팩 AI 일괄 민팅</span>
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-border/70 pb-3">
                <button
                    onClick={() => setActiveTab('skills')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'skills'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>채널 통합 스킬팩 ({skills.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('memory')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'memory'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Database className="w-3.5 h-3.5" />
                    <span>Hermes FTS5 초고속 떡상 기억고 ({ftsMemoryResults.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('soul')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'soul'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>총괄 디렉터 헌법 (soul.md)</span>
                </button>
            </div>

            {/* TAB 1: CHANNEL SKILLS PACK */}
            {activeTab === 'skills' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border/80">
                        <div>
                            <h3 className="text-xs font-black text-foreground flex items-center gap-2">
                                <span>[CH #{selectedChannelId}] {currentChannel.name || '채널'} 전용 8대 실전 스킬팩</span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    apps/data/studio_brain/skills/channels/{selectedChannelId}/
                                </Badge>
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                전략 인텔리전스 ➔ 크리에이티브 대본(3대 분기) ➔ 멀티모달 오디오/비주얼 ➔ 바이너리 컴파일 전 단계를 완벽 커버하는 실전 지침서입니다.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleMintAllSkills}
                                disabled={isMintingSkills}
                                className="border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 text-xs font-bold h-8 px-3 rounded-xl gap-1"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                8대 스킬팩 재생성
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setIsSkillModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 px-3 rounded-xl shadow-xs gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                채널 맞춤 스킬 추가
                            </Button>
                        </div>
                    </div>

                    {skills.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-border rounded-3xl bg-muted/10 space-y-3">
                            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
                            <h4 className="text-sm font-bold text-foreground">등록된 채널 스킬팩이 없습니다.</h4>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                상단의 <strong>[이 채널 8대 실전 스킬팩 AI 일괄 민팅]</strong> 버튼을 누르면 숏폼 제작 전과정 필수 스킬이 자동으로 생성되어 영구 보관됩니다.
                            </p>
                            <Button
                                onClick={handleMintAllSkills}
                                disabled={isMintingSkills}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl h-8 px-4"
                            >
                                지금 8대 스킬팩 일괄 민팅하기
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {skills.map((skill, idx) => {
                                const badgeColor = getSkillBadgeColor(skill.name);
                                return (
                                    <Card key={idx} className="border-border bg-card rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-2xs group">
                                        <div>
                                            <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="outline" className={`text-[10px] font-mono font-bold ${badgeColor}`}>
                                                        #{idx + 1} SKILL
                                                    </Badge>
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        .md
                                                    </span>
                                                </div>
                                                <CardTitle className="text-xs font-black text-foreground mt-2 truncate">
                                                    {skill.name}
                                                </CardTitle>
                                                <CardDescription className="text-[10px] font-mono text-muted-foreground truncate">
                                                    {skill.filename}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                <div className="bg-muted/30 border border-border/60 rounded-xl p-2.5 max-h-32 overflow-hidden relative">
                                                    <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                                        {skill.content}
                                                    </pre>
                                                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                                                </div>
                                            </CardContent>
                                        </div>

                                        <div className="p-3 bg-muted/10 border-t border-border/50 flex items-center justify-between gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedSkill(skill);
                                                    setIsSkillDetailOpen(true);
                                                }}
                                                className="text-[11px] font-bold border-border/80 h-7 flex-1 rounded-lg"
                                            >
                                                <Eye className="w-3 h-3 mr-1" />
                                                플레이북 상세
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(skill.content);
                                                    toast.success("스킬 지침이 클립보드에 복사되었습니다.");
                                                }}
                                                className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                                title="복사"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteSkill(skill.name)}
                                                className="h-7 w-7 p-0 rounded-lg text-rose-500 hover:bg-rose-500/10"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: HERMES FTS5 RECALL VAULT */}
            {activeTab === 'memory' && (
                <div className="space-y-4">
                    {/* Search & Actions Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border/80">
                        <div className="flex-1 flex items-center gap-2 max-w-xl">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="과거 떡상 후킹 카피, 쨉쨉이 패턴, 금기 사항 BM25 전문 검색..."
                                    className="pl-8 text-xs h-9 bg-card border-border rounded-xl font-medium"
                                />
                            </div>
                            {isSearchingFts && (
                                <RefreshCcw className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={() => setIsWisdomModalOpen(true)}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-9 px-3 rounded-xl shadow-xs gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                떡상 승리 공식 직접 각인
                            </Button>
                        </div>
                    </div>

                    {/* FTS Results Grid */}
                    {ftsMemoryResults.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-border rounded-3xl bg-muted/10 space-y-2">
                            <Database className="w-8 h-8 mx-auto text-muted-foreground/40" />
                            <p className="text-xs text-muted-foreground">
                                검색된 채널 기억이 없습니다. 키워드를 변경하거나 새로운 떡상 공식을 각인하세요.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ftsMemoryResults.map((item, idx) => (
                                <Card key={idx} className="border-border bg-card rounded-2xl p-4 flex flex-col justify-between hover:border-purple-500/40 transition-all shadow-2xs group">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border-purple-500/30">
                                                    CH #{selectedChannelId} 승리 공식
                                                </Badge>
                                                {item.score && (
                                                    <span className="text-[10px] font-black font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                        ★ {item.score}점
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : '최근 각인'}
                                            </span>
                                        </div>

                                        <div>
                                            <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                                <Flame className="w-3 h-3 text-amber-500" />
                                                주제 / 토픽
                                            </div>
                                            <p className="text-xs font-black text-foreground mt-0.5">
                                                {item.topic || item.title || '바이럴 쇼츠'}
                                            </p>
                                        </div>

                                        {item.winning_hook && (
                                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                                                <div className="text-[10px] font-black text-amber-500 flex items-center gap-1">
                                                    <Zap className="w-3 h-3" />
                                                    3초 킬러 후킹 카피
                                                </div>
                                                <p className="text-xs font-medium text-foreground leading-relaxed">
                                                    "{item.winning_hook}"
                                                </p>
                                            </div>
                                        )}

                                        {item.jjap_pattern && (
                                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                                                <div className="text-[10px] font-black text-indigo-400 flex items-center gap-1">
                                                    <Sliders className="w-3 h-3" />
                                                    0.8초 쨉쨉이 & 연출 규칙
                                                </div>
                                                <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                                                    {item.jjap_pattern}
                                                </p>
                                            </div>
                                        )}

                                        {item.content && !item.winning_hook && (
                                            <p className="text-xs text-foreground font-medium leading-relaxed">
                                                {item.content}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                                        <span className="text-[9px] font-mono text-muted-foreground">
                                            Hermes FTS5 Auto-Recall Ready
                                        </span>
                                        <button
                                            onClick={() => {
                                                const text = `${item.topic}\n후킹: ${item.winning_hook || ''}\n쨉쨉이: ${item.jjap_pattern || item.content || ''}`;
                                                navigator.clipboard.writeText(text);
                                                toast.success("기억 공식이 클립보드에 복사되었습니다.");
                                            }}
                                            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="복사"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: SOUL.MD CONSTITUTION */}
            {activeTab === 'soul' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-border bg-card rounded-3xl overflow-hidden shadow-xs">
                        <CardHeader className="bg-muted/30 border-b border-border p-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xs font-black text-foreground flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    총괄 디렉터 제작 헌법 (soul.md)
                                </CardTitle>
                                <CardDescription className="text-[10px]">
                                    8인의 모든 워커가 임무 수행 시 반드시 엄수해야 하는 절대 가이드라인
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                disabled={isSavingSoul}
                                onClick={handleSaveSoul}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 rounded-xl gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                헌법 영구 저장
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4">
                            <textarea
                                value={soul}
                                onChange={(e) => setSoul(e.target.value)}
                                rows={18}
                                className="w-full p-4 bg-muted/20 border border-border/80 rounded-2xl text-xs font-mono leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                            />
                        </CardContent>
                    </Card>

                    {/* Quick Rules Injection */}
                    <div className="space-y-4">
                        <Card className="border-border bg-card rounded-3xl p-4 space-y-3 shadow-xs">
                            <h3 className="text-xs font-black text-foreground flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                원클릭 헌법 규칙 인젝터
                            </h3>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                검증된 숏폼 알고리즘 규칙을 클릭 한 번으로 soul.md에 추가합니다.
                            </p>

                            <div className="space-y-2 pt-2">
                                {rulePresets.map((rule, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSoul(prev => prev + rule.text);
                                            toast.info(`${rule.label} 규칙이 헌법에 추가되었습니다. 상단 저장을 누르세요.`);
                                        }}
                                        className="w-full text-left p-2.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/60 text-xs font-bold text-foreground transition-all flex items-center justify-between group cursor-pointer"
                                    >
                                        <span>{rule.label}</span>
                                        <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE NEW SKILL */}
            <Dialog open={isSkillModalOpen} onOpenChange={setIsSkillModalOpen}>
                <DialogContent className="max-w-lg bg-card border-border rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-black flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-400" />
                            [CH #{selectedChannelId}] 새 스킬 플레이북 등록
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            채널 {selectedChannelId}의 전용 스킬 디렉토리에 마크다운 가이드라인을 영구 등록합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1">스킬 영문 식별자 (예: 09_custom_hook)</label>
                            <Input
                                value={newSkillName}
                                onChange={(e) => setNewSkillName(e.target.value)}
                                placeholder="09_custom_pacing"
                                className="text-xs h-8 font-mono bg-muted/40 border-border rounded-xl"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1">플레이북 지침 (Markdown)</label>
                            <textarea
                                value={newSkillContent}
                                onChange={(e) => setNewSkillContent(e.target.value)}
                                placeholder="# 스킬 실행 지침..."
                                rows={9}
                                className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs font-mono leading-relaxed text-foreground focus:outline-none resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsSkillModalOpen(false)} className="text-xs rounded-xl">
                            취소
                        </Button>
                        <Button size="sm" onClick={handleSaveNewSkill} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
                            스킬 등록
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: VIEW / EDIT SKILL DETAIL */}
            <Dialog open={isSkillDetailOpen} onOpenChange={setIsSkillDetailOpen}>
                <DialogContent className="max-w-2xl bg-card border-border rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-black flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-400" />
                            플레이북: {selectedSkill?.filename}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <textarea
                            value={selectedSkill?.content || ''}
                            onChange={(e) => {
                                if (selectedSkill) {
                                    setSelectedSkill({ ...selectedSkill, content: e.target.value });
                                }
                            }}
                            rows={15}
                            className="w-full p-4 rounded-2xl bg-muted/30 border border-border font-mono text-xs leading-relaxed text-foreground focus:outline-none resize-none"
                        />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsSkillDetailOpen(false)} className="text-xs rounded-xl">
                            닫기
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={async () => {
                                if (!selectedSkill) return;
                                try {
                                    await api.post(`/agent/skills/channel/${selectedChannelId}`, {
                                        name: selectedSkill.name,
                                        content: selectedSkill.content
                                    });
                                    toast.success("스킬 플레이북이 업데이트되었습니다.");
                                    setIsSkillDetailOpen(false);
                                    loadChannelData(selectedChannelId);
                                } catch (err: any) {
                                    toast.error("스킬 저장 실패: " + err.message);
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                        >
                            변경 사항 저장
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: RECORD WINNING WISDOM */}
            <Dialog open={isWisdomModalOpen} onOpenChange={setIsWisdomModalOpen}>
                <DialogContent className="max-w-lg bg-card border-border rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-black flex items-center gap-2">
                            <Flame className="w-4 h-4 text-amber-400" />
                            [CH #{selectedChannelId}] 떡상 승리 공식 Hermes FTS5 각인
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            실전 검증된 후킹 카피와 쨉쨉이 연출 템포를 초고속 전문 검색 테이블(hermes_fts)에 각인합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1">영상 주제 / 카테고리</label>
                            <Input
                                value={newWisdomTopic}
                                onChange={(e) => setNewWisdomTopic(e.target.value)}
                                placeholder="예: 직장인 월급 역전 스토리"
                                className="text-xs h-8 bg-muted/40 border-border rounded-xl"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1">3초 승리 후킹 카피</label>
                            <textarea
                                value={newWinningHook}
                                onChange={(e) => setNewWinningHook(e.target.value)}
                                placeholder="예: 월 250 받던 김대리가 6개월 만에 사표 던진 진짜 이유"
                                rows={2}
                                className="w-full p-2.5 rounded-xl bg-muted/40 border border-border text-xs leading-relaxed text-foreground focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1">0.8초 쨉쨉이 & 사운드 싱크 패턴</label>
                            <textarea
                                value={newJjapPattern}
                                onChange={(e) => setNewJjapPattern(e.target.value)}
                                placeholder="예: '사표', '통장', '비밀' 3연타 0.8초 팝업 + 긴장감 틱톡 효과음"
                                rows={2}
                                className="w-full p-2.5 rounded-xl bg-muted/40 border border-border text-xs leading-relaxed text-foreground focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1">검증 만족도 점수 (Score)</label>
                            <Input
                                type="number"
                                min={85}
                                max={100}
                                value={newWisdomScore}
                                onChange={(e) => setNewWisdomScore(Number(e.target.value))}
                                className="text-xs h-8 w-28 font-mono font-bold bg-muted/40 border-border rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsWisdomModalOpen(false)} className="text-xs rounded-xl">
                            취소
                        </Button>
                        <Button size="sm" onClick={handleRecordWisdom} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl">
                            Hermes FTS5 각인
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BrainVaultPage;
