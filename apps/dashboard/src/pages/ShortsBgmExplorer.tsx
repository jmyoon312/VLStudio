import React, { useState, useEffect, useRef } from 'react';
import { Music2, TrendingUp, Play, RefreshCw, Sparkles, Flame, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { BypassVideoFrame } from '@/components/BypassVideoFrame';

function getRelativeTime(uploadDate: string): string {
    if (!uploadDate || uploadDate.length < 8) return '';
    try {
        const y = parseInt(uploadDate.substring(0, 4));
        const m = parseInt(uploadDate.substring(4, 6)) - 1;
        const d = parseInt(uploadDate.substring(6, 8));
        const date = new Date(y, m, d);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 1) return '오늘';
        if (diffDays < 7) return `${diffDays}일 전`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
        return `${Math.floor(diffDays / 365)}년 전`;
    } catch { return ''; }
}

const ShortsBgmExplorer = () => {
    const [audioList, setAudioList] = useState<any[]>([]);
    const [selectedAudio, setSelectedAudio] = useState<any | null>(null);
    const [exampleVideos, setExampleVideos] = useState<any[]>([]);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);
    const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

    const fetchTrendingAudio = async () => {
        setIsLoadingAudio(true);
        try {
            const resp = await api.get('/keywords/audio/trending');
            setAudioList(resp.data || []);
            if (resp.data?.length > 0) {
                handleAudioSelect(resp.data[0]);
            }
        } catch {
            toast.error('트렌딩 오디오 로드 실패');
        } finally {
            setIsLoadingAudio(false);
        }
    };

    const handleAudioSelect = async (audio: any) => {
        setSelectedAudio(audio);
        setExampleVideos([]);
        setIsLoadingVideos(true);
        try {
            const kw = encodeURIComponent(audio.keyword || audio.title);
            const resp = await api.get(`/keywords/audio/example-videos/${kw}`);
            setExampleVideos(resp.data || []);
        } catch {
            setExampleVideos([]);
        } finally {
            setIsLoadingVideos(false);
        }
    };

    useEffect(() => {
        fetchTrendingAudio();
    }, []);

    return (
        <div className="w-full px-6 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <Music2 className="w-8 h-8 text-orange-400" />
                        쇼츠 배경음 차트
                    </h1>
                    <p className="text-muted-foreground mt-1">지금 가장 뜨는 쇼츠 BGM을 발굴하고, 대박 영상의 공통점을 파악하세요.</p>
                </div>
                <button
                    onClick={fetchTrendingAudio}
                    disabled={isLoadingAudio}
                    className="px-5 py-2.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoadingAudio ? 'animate-spin' : ''}`} />
                    새로고침
                </button>
            </div>

            {/* Top Trending Audio Rail */}
            {isLoadingAudio ? (
                <div className="py-12 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                </div>
            ) : (
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-400/70 mb-3 flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5" /> 실시간 탑 차트
                    </p>
                    <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
                        {audioList.map((audio, idx) => (
                            <button
                                key={audio.id}
                                onClick={() => handleAudioSelect(audio)}
                                className={`flex-shrink-0 w-44 p-3 rounded-2xl border text-left transition-all group ${
                                    selectedAudio?.id === audio.id
                                        ? 'bg-orange-600/20 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-orange-500/30'
                                }`}
                            >
                                {/* Album Art */}
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-black/40">
                                    {audio.thumbnail ? (
                                        <img src={audio.thumbnail} alt={audio.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Music2 className="w-8 h-8 text-orange-400/50" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-[10px] font-black text-white">
                                        #{idx + 1}
                                    </div>
                                    {audio.trending && (
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-orange-600 rounded text-[8px] font-black text-white flex items-center gap-0.5">
                                            <Flame className="w-2.5 h-2.5" /> HOT
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs font-bold text-white truncate">{audio.title}</p>
                                <p className="text-[10px] text-white/50 truncate mt-0.5">{audio.artist}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[9px] px-1.5 py-0.5 bg-orange-600/20 text-orange-400 rounded font-bold">{audio.usageLabel}</span>
                                    <span className="text-[9px] text-white/40">{audio.chart_days}일 차트</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Audio Info */}
            {selectedAudio && (
                <div className="bg-orange-600/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-600/30 flex items-center justify-center flex-shrink-0">
                        <Music2 className="w-6 h-6 text-orange-300" />
                    </div>
                    <div>
                        <p className="font-black text-white text-lg">{selectedAudio.title}</p>
                        <p className="text-sm text-white/60">{selectedAudio.artist} · {selectedAudio.usageLabel} · {selectedAudio.chart_days}일 차트 진입</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-orange-300 font-bold">예시 영상 {exampleVideos.length}개</span>
                    </div>
                </div>
            )}

            {/* Example Videos Grid */}
            {selectedAudio && (
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">
                        이 음원을 사용한 잘 나온 쇼츠
                    </p>
                    {isLoadingVideos ? (
                        <div className="py-12 flex items-center justify-center gap-3 text-muted-foreground">
                            <div className="w-8 h-8 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
                            <p className="animate-pulse">예시 영상 탐색 중...</p>
                        </div>
                    ) : exampleVideos.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <p>관련 예시 영상을 찾지 못했습니다.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                            {exampleVideos.map((v: any) => (
                                <div key={v.id}
                                    className="rounded-xl overflow-hidden bg-black/30 border border-white/5 hover:border-orange-500/30 transition-all group"
                                    onMouseEnter={() => setHoveredVideoId(v.id)}
                                    onMouseLeave={() => setHoveredVideoId(null)}
                                >
                                                    <div className="relative aspect-[9/16]">
                                                        <BypassVideoFrame
                                                            videoId={v.id}
                                                            title={v.title}
                                                            thumbnail={v.thumbnail}
                                                            isActive={hoveredVideoId === v.id}
                                                        />
                                                        {getRelativeTime(v.upload_date) && (
                                                            <div className="absolute top-1.5 left-1.5 px-1 py-0.5 bg-blue-500/70 rounded text-[7px] font-bold text-white pointer-events-none z-10">
                                                                {getRelativeTime(v.upload_date)}
                                                            </div>
                                                        )}
                                                        {v.views > 0 && (
                                                            <div className="absolute bottom-1.5 left-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 rounded text-[9px] font-bold text-white text-center pointer-events-none z-10">
                                                                {(v.views / 1000).toFixed(0)}K views
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="text-[9px] text-white/60 line-clamp-2 leading-snug">{v.title}</p>
                                                        <p className="text-[8px] text-white/30 mt-0.5 truncate">{v.channelName}</p>
                                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ShortsBgmExplorer;
