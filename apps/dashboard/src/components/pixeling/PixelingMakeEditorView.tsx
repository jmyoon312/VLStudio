import React, { useState } from 'react';
import { 
    Clapperboard, 
    Play, 
    Pause, 
    Scissors, 
    Volume2, 
    Type, 
    Film, 
    Music, 
    ExternalLink, 
    FolderOpen, 
    Sparkles, 
    Save, 
    Rocket,
    Clock,
    Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface TrackItem {
    id: string;
    title: string;
    startSec: number;
    durationSec: number;
    type: 'video' | 'audio' | 'subtitle';
    color: string;
}

interface PixelingMakeEditorViewProps {
    onOpenFullProEditor?: () => void;
    onLaunchCapCut?: () => void;
}

export function PixelingMakeEditorView({ onOpenFullProEditor, onLaunchCapCut }: PixelingMakeEditorViewProps) {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(3.5);
    const totalDuration = 15.0;

    const tracks: { id: string; name: string; icon: any; items: TrackItem[] }[] = [
        {
            id: 'track-video',
            name: '비디오 트랙',
            icon: Film,
            items: [
                { id: 'v1', title: '0초 훅 비주얼 (줌인)', startSec: 0, durationSec: 3.5, type: 'video', color: 'bg-blue-600' },
                { id: 'v2', title: '메인 칼군무 하이라이트', startSec: 3.5, durationSec: 8.0, type: 'video', color: 'bg-blue-700' },
                { id: 'v3', title: '엔딩 반응 클립', startSec: 11.5, durationSec: 3.5, type: 'video', color: 'bg-blue-800' }
            ]
        },
        {
            id: 'track-voice',
            name: 'AI 보이스 (Kore)',
            icon: Volume2,
            items: [
                { id: 'a1', title: 'TTS: 지금 전 세계가...', startSec: 0.2, durationSec: 3.2, type: 'audio', color: 'bg-amber-600' },
                { id: 'a2', title: 'TTS: 3일 만에 조회수...', startSec: 3.6, durationSec: 7.5, type: 'audio', color: 'bg-amber-600' }
            ]
        },
        {
            id: 'track-subtitles',
            name: '자동 자막 싱크',
            icon: Type,
            items: [
                { id: 's1', title: '지금 난리 난', startSec: 0.2, durationSec: 1.5, type: 'subtitle', color: 'bg-purple-600' },
                { id: 's2', title: '0초 칼군무 챌린지', startSec: 1.7, durationSec: 1.7, type: 'subtitle', color: 'bg-purple-600' },
                { id: 's3', title: '3일 만에 200만 돌파', startSec: 3.6, durationSec: 3.5, type: 'subtitle', color: 'bg-purple-600' }
            ]
        },
        {
            id: 'track-bgm',
            name: 'BGM & SFX 더킹',
            icon: Music,
            items: [
                { id: 'b1', title: '스우시 긴장감 SFX', startSec: 0, durationSec: 0.8, type: 'audio', color: 'bg-pink-600' },
                { id: 'b2', title: '비트 드롭 트렌디 BGM', startSec: 0.8, durationSec: 14.2, type: 'audio', color: 'bg-emerald-600' }
            ]
        }
    ];

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 100);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            {/* Top Toolbar */}
            <div className="h-12 px-6 border-b border-border/60 flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-xs">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        <Clapperboard className="w-4 h-4 text-blue-600" />
                        <span>메이크 에디터 — NLE 타임라인 멀티트랙</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        타임라인 가동 중
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (onLaunchCapCut) onLaunchCapCut();
                            else toast.success('CapCut 데스크톱 프로젝트로 내보냈습니다.');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Rocket className="w-3.5 h-3.5 text-blue-600" />
                        <span>CapCut으로 열기</span>
                    </button>
                    {onOpenFullProEditor && (
                        <button
                            type="button"
                            onClick={onOpenFullProEditor}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>전체 프로 에디터 열기</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Split Top Preview & Bottom Timeline */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Upper Area: Video Monitor & Clip Properties */}
                <div className="h-1/2 flex border-b border-border/60 bg-muted/20 overflow-hidden">
                    {/* Monitor */}
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="h-full aspect-9/16 bg-black rounded-2xl border-2 border-border/80 relative overflow-hidden flex flex-col justify-between p-3 shadow-lg">
                            <span className="text-[9px] font-mono text-white/60">
                                타임코드: {formatTime(currentTime)}
                            </span>
                            <div className="self-center text-center">
                                <div className="text-white font-extrabold text-sm drop-shadow-md">
                                    지금 난리 난 0초 칼군무
                                </div>
                            </div>
                            <span className="text-[9px] text-white/40 text-center">
                                1080 x 1920 (9:16)
                            </span>
                        </div>
                    </div>

                    {/* Timeline Controls */}
                    <div className="w-80 border-l border-border/60 bg-card/40 p-4 space-y-4 overflow-y-auto shrink-0">
                        <div className="text-xs font-bold text-foreground">
                            타임라인 컷 편집 제어
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                            >
                                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                            </button>
                            <span className="font-mono text-xs font-bold text-foreground">
                                {formatTime(currentTime)} / {formatTime(totalDuration)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => toast.info('현재 플레이헤드 위치에서 클립을 분할했습니다.')}
                                className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium flex items-center gap-1 cursor-pointer"
                            >
                                <Scissors className="w-3 h-3" />
                                <span>컷 분할</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => toast.info('음량을 3dB 부스트했습니다.')}
                                className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium flex items-center gap-1 cursor-pointer"
                            >
                                <Volume2 className="w-3 h-3" />
                                <span>음량 조절</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lower Area: Multi-Track Timeline */}
                <div className="flex-1 flex flex-col bg-card/60 overflow-hidden">
                    {/* Timeline Ruler */}
                    <div className="h-7 border-b border-border/50 px-32 flex items-center justify-between text-[10px] font-mono text-muted-foreground bg-muted/30">
                        <span>00:00</span>
                        <span>00:03</span>
                        <span>00:06</span>
                        <span>00:09</span>
                        <span>00:12</span>
                        <span>00:15</span>
                    </div>

                    {/* Tracks Area */}
                    <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                        {tracks.map(track => {
                            const IconComponent = track.icon;
                            return (
                                <div key={track.id} className="h-14 flex items-center relative group hover:bg-muted/30 transition-colors">
                                    {/* Track Header */}
                                    <div className="w-32 px-3 border-r border-border/50 h-full flex items-center gap-1.5 shrink-0 bg-background/50">
                                        <IconComponent className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-[11px] font-semibold text-foreground truncate">
                                            {track.name}
                                        </span>
                                    </div>

                                    {/* Track Lane */}
                                    <div className="flex-1 h-full relative px-2 flex items-center">
                                        {track.items.map(item => {
                                            const leftPct = (item.startSec / totalDuration) * 100;
                                            const widthPct = (item.durationSec / totalDuration) * 100;
                                            return (
                                                <div
                                                    key={item.id}
                                                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                                    className={`absolute h-9 rounded-lg ${item.color} text-white px-2 py-1 flex items-center justify-between overflow-hidden shadow-xs cursor-pointer border border-white/20 hover:brightness-110 transition-all`}
                                                >
                                                    <span className="text-[10px] font-bold truncate">
                                                        {item.title}
                                                    </span>
                                                    <span className="text-[8px] font-mono opacity-80 shrink-0 ml-1">
                                                        {item.durationSec}s
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
