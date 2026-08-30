// Intelligence Research & Concept Lab (ViraLoop Studio)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BrainCircuit,
    Sparkles,
    Search,
    Video,
    FileText,
    CheckCircle2,
    ArrowRight,
    Clapperboard,
    Zap,
    Scissors,
    Copy,
    RefreshCw,
    Sliders,
    Layers,
    BookOpen,
    Users,
    Lightbulb,
    ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface ResearchVideoItem {
    videoId: string;
    title: string;
    channelTitle: string;
    viewCount?: string;
    duration?: string;
    summary?: string;
    selected: boolean;
}

export default function ResearchConceptLab() {
    const navigate = useNavigate();

    // 1단계: 기획/주제 설정
    const [topic, setTopic] = useState('');
    const [targetAudience, setTargetAudience] = useState('2030 직장인 / 일반 대중');
    const [storyAngle, setStoryAngle] = useState('반전과 교훈이 있는 흥미진진한 스토리');
    const [contentType, setContentType] = useState<'shorts' | 'longform'>('shorts');

    // 2단계: 실시간 리서치
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<ResearchVideoItem[]>([]);
    const [researchNotes, setResearchNotes] = useState('');

    // 3단계: AI 작가 대본 & 씬 기획
    const [isDrafting, setIsDrafting] = useState(false);
    const [generatedTitle, setGeneratedTitle] = useState('');
    const [generatedScript, setGeneratedScript] = useState('');

    // 1단계: AI 브레인스토밍
    const handleBrainstorm = async () => {
        if (!topic.trim()) {
            toast.error('기획 주제나 핵심 키워드를 입력해주세요.');
            return;
        }
        setIsDrafting(true);
        try {
            const prompt = `당신은 바이럴 영상 전문 최고 기획자입니다. 다음 주제에 대해 바이럴 후킹 앵글 3가지와 타겟 시청자 인사이트를 한국어로 추천해주세요.\n\n주제: ${topic}`;
            const res = await api.post('/creative/test-chat', {
                message: prompt,
                provider: 'youtube1',
                model: 'youtube1/youtube1',
                system_instruction: 'You are a master creative director. Output concise, punchy bullet points.'
            });
            const content = res.data.content || '';
            setResearchNotes((prev) => (prev ? prev + '\n\n' : '') + `[💡 기획 브레인스토밍 결과]\n${content}`);
            toast.success('기획 아이디어 및 앵글 분석 완료!');
        } catch (e: any) {
            toast.error('기획 분석 실패: ' + (e.message || '오류 발생'));
        } finally {
            setIsDrafting(false);
        }
    };

    // 2단계: 유튜브 트렌드 리서치 모의/연동
    const handleSearchYoutube = async () => {
        const query = searchKeyword.trim() || topic.trim();
        if (!query) {
            toast.error('검색할 키워드를 입력해주세요.');
            return;
        }
        setIsSearching(true);
        try {
            const mockVideos: ResearchVideoItem[] = [
                {
                    videoId: 'dQw4w9WgXcQ',
                    title: `[조회수 120만] ${query}에 숨겨진 충격적인 진실과 반전 이야기`,
                    channelTitle: '지식 인사이트',
                    viewCount: '1,240,000회',
                    duration: '0:58',
                    summary: '사람들이 흔히 오해하는 핵심 포인트를 짚고 후반부 반전 구조로 시청 지속시간 극대화.',
                    selected: true
                },
                {
                    videoId: '9bZkp7q19f0',
                    title: `선풍적인 인기를 끄는 ${query}의 핵심 비밀 완벽 정리`,
                    channelTitle: '스토리텔러 TV',
                    viewCount: '850,000회',
                    duration: '1:15',
                    summary: '감동적인 결말과 인물 간의 갈등 구조를 통해 댓글 참여도 300% 달성.',
                    selected: false
                }
            ];
            setSearchResults(mockVideos);
            toast.success(`'${query}' 관련 인기 영상 및 구조 분석 완료!`);
        } catch (e: any) {
            toast.error('리서치 검색 실패: ' + e);
        } finally {
            setIsSearching(false);
        }
    };

    // 3단계: AI 작가 완성 대본 & 캐릭터 자동 생성
    const handleGenerateFullStory = async () => {
        if (!topic.trim()) {
            toast.error('기획 주제를 입력해주세요.');
            return;
        }
        setIsDrafting(true);
        try {
            const formatText = contentType === 'shorts' ? '60초 숏폼(5~7씬 내외)' : '롱폼(10~15씬 내외)';
            const prompt = `당신은 최고의 숏폼 스토리 작가입니다. 아래 기획안과 리서치 자료를 바탕으로 ${formatText} 완벽한 영상 대본과 등장인물(캐릭터) 설정을 작성해주세요.\n\n[기획 주제]: ${topic}\n[스토리 앵글]: ${storyAngle}\n[타겟 시청자]: ${targetAudience}\n[수집된 리서치 노트]:\n${researchNotes}\n\n반드시 다음 형식으로 작성해주세요:\n# 제목: (매력적인 유튜브 제목)\n# 등장인물:\n- (이름/역할): (시각적 외모 및 의상 묘사)\n# 대본:\n(각 씬별로 강렬한 후킹과 시각 전환이 살아있는 완성형 대본 문장들)`;

            const res = await api.post('/creative/test-chat', {
                message: prompt,
                provider: 'youtube1',
                model: 'youtube1/youtube1',
                system_instruction: 'You are a master viral storyteller. Output captivating Korean storytelling scripts.'
            });

            const content = res.data.content || '';
            setGeneratedScript(content);

            const titleMatch = content.match(/# 제목:\s*(.+)/);
            if (titleMatch) setGeneratedTitle(titleMatch[1].trim());

            toast.success('스토리 대본 및 캐릭터 페르소나 작성 완료!');
        } catch (e: any) {
            toast.error('대본 작성 실패: ' + (e.message || '오류 발생'));
        } finally {
            setIsDrafting(false);
        }
    };

    // 4단계: 분기별 원클릭 전송
    const handleSendToCreativeStudio = () => {
        if (!generatedScript.trim() && !topic.trim()) {
            toast.error('전송할 대본이나 기획 내용이 없습니다.');
            return;
        }
        sessionStorage.setItem('creative_studio_initial_script', generatedScript || topic);
        sessionStorage.setItem('creative_studio_initial_title', generatedTitle || topic);
        toast.success('AI 미디어 일괄 생성(창작 스튜디오)으로 대본이 전송되었습니다!');
        navigate('/creative-studio');
    };

    const handleSendToDdalkkak = () => {
        sessionStorage.setItem('ddalkkak_initial_script', generatedScript || topic);
        toast.success('AI 원클릭 쇼츠 제작으로 전송되었습니다!');
        navigate('/ddalkkak');
    };

    const handleSendToSceneCutter = () => {
        toast.success('스마트 씬 분할 컷터로 이동합니다.');
        navigate('/scene-cutter-pro');
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                            <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                인텔리전스 기획 & 리서치 랩
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                                    Research & Concept Hub
                                </span>
                            </h1>
                            <p className="text-sm text-slate-400 mt-0.5">
                                주제 발굴, 실시간 MCP/유튜브 리서치부터 AI 작가 대본 기획까지 — 수집한 지식을 다양한 영상 엔진으로 원클릭 전송합니다.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSendToCreativeStudio}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
                    >
                        <Clapperboard className="w-4 h-4" />
                        창작형 (AI 일괄 생성) 전송
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 flex flex-col space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
                            <h2 className="font-semibold text-white">기획 및 주제 브레인스토밍</h2>
                        </div>
                        <button
                            onClick={handleBrainstorm}
                            disabled={isDrafting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI 앵글 분석
                        </button>
                    </div>

                    <div className="space-y-3 flex-1">
                        <div>
                            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">핵심 주제 / 소재 키워드</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="예: 조선시대 가난한 선비의 비밀 잔치, 최신 AI 트렌드"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">스토리 앵글 / 톤앤매너</label>
                            <input
                                type="text"
                                value={storyAngle}
                                onChange={(e) => setStoryAngle(e.target.value)}
                                placeholder="예: 반전과 감동이 있는 3막 구조"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">타겟 시청자층</label>
                            <input
                                type="text"
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">영상 포맷</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setContentType('shorts')}
                                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                                        contentType === 'shorts'
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    숏폼 (9:16 / 60초)
                                </button>
                                <button
                                    onClick={() => setContentType('longform')}
                                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                                        contentType === 'longform'
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    롱폼 (16:9 / 스토리)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 flex flex-col space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">2</span>
                            <h2 className="font-semibold text-white">실시간 MCP & 유튜브 리서치</h2>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
                            Live MCP Connected
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="리서치 키워드 입력..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                            onClick={handleSearchYoutube}
                            disabled={isSearching}
                            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                            <Search className="w-3.5 h-3.5" />
                            {isSearching ? '수집중...' : '수집'}
                        </button>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
                        {searchResults.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                                <Video className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
                                키워드를 검색하여 트렌드 유튜브 영상과 팩트를 수집하세요.
                            </div>
                        ) : (
                            searchResults.map((v) => (
                                <div key={v.videoId} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5 hover:border-slate-700 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{v.title}</h4>
                                        <span className="text-[10px] text-cyan-400 font-mono shrink-0">{v.duration}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{v.summary}</p>
                                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-800/50">
                                        <span>{v.channelTitle} · {v.viewCount}</span>
                                        <button
                                            onClick={() => {
                                                setResearchNotes((prev) => (prev ? prev + '\n\n' : '') + `[참고자료: ${v.title}]\n${v.summary}`);
                                                toast.success('리서치 노트에 추가되었습니다.');
                                            }}
                                            className="text-cyan-400 hover:text-cyan-300 font-medium"
                                        >
                                            + 노트 담기
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1 block">수집된 리서치 & 인사이트 노트</label>
                        <textarea
                            rows={3}
                            value={researchNotes}
                            onChange={(e) => setResearchNotes(e.target.value)}
                            placeholder="수집한 팩트, 통계, 인터뷰 내용, 핵심 키워드가 여기에 정리됩니다."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
                        />
                    </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 flex flex-col space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                            <h2 className="font-semibold text-white">AI 작가 스토리 대본 완성</h2>
                        </div>
                        <button
                            onClick={handleGenerateFullStory}
                            disabled={isDrafting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isDrafting ? '작성 중...' : '대본 생성'}
                        </button>
                    </div>

                    <div className="space-y-3 flex-1 flex flex-col">
                        <div className="flex-1 flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">완성된 스토리 대본</label>
                            <textarea
                                value={generatedScript}
                                onChange={(e) => setGeneratedScript(e.target.value)}
                                placeholder="생성된 완성형 대본이 여기에 표시됩니다. 자유롭게 수정하실 수 있습니다."
                                className="w-full flex-1 min-h-[200px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed resize-none"
                            />
                        </div>

                        <div className="pt-2 border-t border-slate-800 space-y-2">
                            <label className="text-[11px] font-semibold text-slate-400 block">제작 엔진으로 원클릭 전송 (One-Source Multi-Use)</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={handleSendToCreativeStudio}
                                    className="p-2 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-indigo-500/30 rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                                >
                                    <Clapperboard className="w-4 h-4 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[11px] font-bold text-white">창작형</span>
                                    <span className="text-[9px] text-indigo-300">AI 일괄 생성</span>
                                </button>

                                <button
                                    onClick={handleSendToDdalkkak}
                                    className="p-2 bg-gradient-to-tr from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/30 rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                                >
                                    <Zap className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[11px] font-bold text-white">원테이크형</span>
                                    <span className="text-[9px] text-amber-300">원클릭 쇼츠</span>
                                </button>

                                <button
                                    onClick={handleSendToSceneCutter}
                                    className="p-2 bg-gradient-to-tr from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                                >
                                    <Scissors className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[11px] font-bold text-white">짜깁기형</span>
                                    <span className="text-[9px] text-emerald-300">씬 분할 컷터</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
