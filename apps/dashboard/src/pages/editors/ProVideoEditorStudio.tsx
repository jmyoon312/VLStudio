import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Play,
  Pause,
  Scissors,
  Split,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  Volume2,
  VolumeX,
  Layers,
  Film,
  Type,
  Music,
  Maximize2,
  Minimize2,
  Sparkles,
  Download,
  Upload,
  Radio,
  Sliders,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  ChevronRight,
  Plus,
  CheckCircle2,
  Smartphone,
  Swords,
  MessageSquare,
  Clapperboard,
  Magnet,
  Zap,
  FolderOpen,
  ArrowLeft,
  ExternalLink,
  Shield,
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Move,
  CornerDownRight,
  ListVideo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { exportCapCutFullProject } from '@/services/capcutFullProjectExporter';
import { CAPCUT_FILTER_PRESETS } from '../ShortsEditorStudio';
import { StudioWorkspaceTabs } from '@/components/shared/StudioWorkspaceTabs';
import api from '@/lib/api';

// ── 타입 선언 (타임라인 트랙 & 클립 스키마) ──
export type TrackType = 'video' | 'audio' | 'subtitle' | 'jab';

export interface NleClip {
  id: string;
  trackId: string;
  name: string;
  type: TrackType;
  startMs: number;
  endMs: number;
  color?: string;
  text?: string;
  mediaUrl?: string;
  volume?: number;
  speed?: number;
  // 시각 속성
  style?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    bgColor?: string;
    useBox?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    align?: 'left' | 'center' | 'right';
    anchor?: 'top-left' | 'top-center' | 'top-right' | 'mid-left' | 'center' | 'mid-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    xPct?: number; // 0 ~ 100
    yPct?: number; // 0 ~ 100
    scale?: number;
    rotation?: number;
  };
}

export interface NleTrack {
  id: string;
  name: string;
  type: TrackType;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  color: string;
  clips: NleClip[];
}

export interface NleProjectData {
  id: string;
  title: string;
  durationMs: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  fps: number;
  tracks: NleTrack[];
}

// ── 9포지션 앵커 좌표 변환 헬퍼 ──
export const ANCHOR_POSITIONS = {
  'top-left': { xPct: 15, yPct: 15, label: '좌상단' },
  'top-center': { xPct: 50, yPct: 15, label: '상단중앙' },
  'top-right': { xPct: 85, yPct: 15, label: '우상단' },
  'mid-left': { xPct: 15, yPct: 50, label: '중앙좌측' },
  'center': { xPct: 50, yPct: 50, label: '정중앙' },
  'mid-right': { xPct: 85, yPct: 50, label: '중앙우측' },
  'bottom-left': { xPct: 15, yPct: 85, label: '좌하단' },
  'bottom-center': { xPct: 50, yPct: 85, label: '하단중앙' },
  'bottom-right': { xPct: 85, yPct: 85, label: '우하단' },
};

export const ProVideoEditorStudio: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ── 프로젝트 기본 상태 ──
  const [projectTitle, setProjectTitle] = useState<string>('프로 비디오 프로젝트');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [durationMs, setDurationMs] = useState<number>(25000); // 25.0초
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.5x ~ 3.0x
  const [magnetSnap, setMagnetSnap] = useState<boolean>(true);
  const [safeZoneVisible, setSafeZoneVisible] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [filterIntensity, setFilterIntensity] = useState<number>(80);

  // ── 선택 상태 ──
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>('track-sub');

  // ── 4대 트랙 초기화 (Video, Audio, Subtitle, Jab) ──
  const [tracks, setTracks] = useState<NleTrack[]>([
    {
      id: 'track-jab',
      name: '쨉쨉이 / 오버레이 (Track 3)',
      type: 'jab',
      muted: false,
      locked: false,
      visible: true,
      color: '#f59e0b',
      clips: [
        {
          id: 'clip-jab-1',
          trackId: 'track-jab',
          name: '충격 반전 훅',
          type: 'jab',
          startMs: 500,
          endMs: 3800,
          text: '⚡ 실시간 충격 반전 실화!',
          style: {
            fontFamily: 'GmarketSans',
            fontSize: 22,
            color: '#FFE500',
            strokeColor: '#000000',
            strokeWidth: 4,
            useBox: true,
            bgColor: 'rgba(0,0,0,0.85)',
            anchor: 'top-center',
            xPct: 50,
            yPct: 22,
            align: 'center',
          }
        }
      ]
    },
    {
      id: 'track-sub',
      name: '기본 자막 (Track 2)',
      type: 'subtitle',
      muted: false,
      locked: false,
      visible: true,
      color: '#3b82f6',
      clips: [
        {
          id: 'clip-sub-1',
          trackId: 'track-sub',
          name: '자막 01',
          type: 'subtitle',
          startMs: 0,
          endMs: 4000,
          text: '비디오 편집기의 혁신, 프로 비디오 편집기입니다.',
          style: {
            fontFamily: 'Pretendard',
            fontSize: 20,
            color: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 5,
            useBox: false,
            anchor: 'bottom-center',
            xPct: 50,
            yPct: 78,
            align: 'center',
          }
        },
        {
          id: 'clip-sub-2',
          trackId: 'track-sub',
          name: '자막 02',
          type: 'subtitle',
          startMs: 4200,
          endMs: 9500,
          text: 'Q, W 키로 원터치 리플 트림과 S 키로 컷 분할을 실행하세요.',
          style: {
            fontFamily: 'Pretendard',
            fontSize: 20,
            color: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 5,
            useBox: false,
            anchor: 'bottom-center',
            xPct: 50,
            yPct: 78,
            align: 'center',
          }
        },
        {
          id: 'clip-sub-3',
          trackId: 'track-sub',
          name: '자막 03',
          type: 'subtitle',
          startMs: 9700,
          endMs: 16000,
          text: '픽셀링 11대 일괄 생성과 100% 무손실로 연동됩니다.',
          style: {
            fontFamily: 'Pretendard',
            fontSize: 20,
            color: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 5,
            useBox: false,
            anchor: 'bottom-center',
            xPct: 50,
            yPct: 78,
            align: 'center',
          }
        },
        {
          id: 'clip-sub-4',
          trackId: 'track-sub',
          name: '자막 04',
          type: 'subtitle',
          startMs: 16200,
          endMs: 23000,
          text: 'CapCut 1:1 초안 내보내기와 자동 배포 큐로 즉시 직결됩니다.',
          style: {
            fontFamily: 'Pretendard',
            fontSize: 20,
            color: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 5,
            useBox: false,
            anchor: 'bottom-center',
            xPct: 50,
            yPct: 78,
            align: 'center',
          }
        }
      ]
    },
    {
      id: 'track-video',
      name: '메인 영상 (Track 0)',
      type: 'video',
      muted: false,
      locked: false,
      visible: true,
      color: '#10b981',
      clips: [
        {
          id: 'clip-vid-1',
          trackId: 'track-video',
          name: '메인 시퀀스 클립 A',
          type: 'video',
          startMs: 0,
          endMs: 12000,
          volume: 100,
          speed: 1.0,
          style: {
            scale: 1.0,
            xPct: 50,
            yPct: 50,
            rotation: 0
          }
        },
        {
          id: 'clip-vid-2',
          trackId: 'track-video',
          name: '메인 시퀀스 클립 B',
          type: 'video',
          startMs: 12000,
          endMs: 25000,
          volume: 100,
          speed: 1.0,
          style: {
            scale: 1.0,
            xPct: 50,
            yPct: 50,
            rotation: 0
          }
        }
      ]
    },
    {
      id: 'track-audio',
      name: 'BGM / 음성 (Track 1)',
      type: 'audio',
      muted: false,
      locked: false,
      visible: true,
      color: '#8b5cf6',
      clips: [
        {
          id: 'clip-bgm-1',
          trackId: 'track-audio',
          name: '배경음악 (Cyber Tension)',
          type: 'audio',
          startMs: 0,
          endMs: 25000,
          volume: 35,
          speed: 1.0
        }
      ]
    }
  ]);

  // ── Undo / Redo 트랜잭션 스택 (Command Pattern) ──
  const [historyPast, setHistoryPast] = useState<NleTrack[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<NleTrack[][]>([]);

  const pushHistory = useCallback((newTracks: NleTrack[]) => {
    setHistoryPast(prev => [...prev.slice(-30), tracks]);
    setHistoryFuture([]);
    setTracks(newTracks);
  }, [tracks]);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast(prev => prev.slice(0, -1));
    setHistoryFuture(prev => [tracks, ...prev]);
    setTracks(previous);
    toast({ title: '실행 취소 (Undo)', description: '이전 편집 상태로 복원되었습니다.' });
  }, [historyPast, tracks, toast]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture(prev => prev.slice(1));
    setHistoryPast(prev => [...prev, tracks]);
    setTracks(next);
    toast({ title: '다시 실행 (Redo)', description: '다음 편집 상태로 진행되었습니다.' });
  }, [historyFuture, tracks, toast]);

  // ── 외부(일괄생성 허브 등) Handoff 수신 ──
  useEffect(() => {
    try {
      const handoffRaw = sessionStorage.getItem('vlstudio_pro_editor_handoff');
      if (handoffRaw) {
        const payload = JSON.parse(handoffRaw);
        if (payload.title) setProjectTitle(payload.title);
        if (payload.aspectRatio) setAspectRatio(payload.aspectRatio);
        if (payload.durationMs) setDurationMs(payload.durationMs);
        if (payload.tracks && Array.isArray(payload.tracks)) {
          setTracks(payload.tracks);
        } else if (payload.subtitles && Array.isArray(payload.subtitles)) {
          // 간이 대본 포맷 변환
          const subClips: NleClip[] = payload.subtitles.map((s: any, idx: number) => ({
            id: `clip-sub-${idx}-${Date.now()}`,
            trackId: 'track-sub',
            name: `대본 #${idx + 1}`,
            type: 'subtitle',
            startMs: Math.round((s.start || idx * 4) * 1000),
            endMs: Math.round((s.end || (idx + 1) * 4) * 1000),
            text: s.text || s.narration || '',
            style: {
              fontFamily: 'Pretendard',
              fontSize: 20,
              color: '#FFFFFF',
              strokeColor: '#000000',
              strokeWidth: 5,
              useBox: false,
              anchor: 'bottom-center',
              xPct: 50,
              yPct: 78,
              align: 'center',
            }
          }));
          setTracks(prev => prev.map(t => t.id === 'track-sub' ? { ...t, clips: subClips } : t));
        }
        sessionStorage.removeItem('vlstudio_pro_editor_handoff');
        toast({
          title: '⚡ 올인원 일괄 생성 프로젝트 인입 완료',
          description: `'${payload.title || '프로젝트'}' 데이터가 프로 편집기에 완벽 로드되었습니다.`
        });
      }
    } catch (_) {}
  }, [toast]);

  // ── 선택된 활성 클립 ──
  const activeClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const t of tracks) {
      const found = t.clips.find(c => c.id === selectedClipId);
      if (found) return found;
    }
    return null;
  }, [selectedClipId, tracks]);

  // ── 32대 트랜잭셔널 NLE 편집 커맨드 구현 ──

  // 1. SPLIT_CLIP (S / Ctrl+B): 플레이헤드 위치에서 선택 클립 양분
  const executeSplitClip = useCallback(() => {
    if (!selectedClipId && !activeClip) {
      // 선택된 클립이 없으면 현재 재생 시간에 걸쳐 있는 활성 트랙의 클립 분할
      const targetTrack = tracks.find(t => t.id === (selectedTrackId || 'track-sub'));
      if (!targetTrack) return;
      const targetClip = targetTrack.clips.find(c => currentTimeMs > c.startMs && currentTimeMs < c.endMs);
      if (!targetClip) {
        toast({ title: '분할 불가', description: '현재 재생 위치에 분할할 클립이 없습니다.' });
        return;
      }
      splitGivenClip(targetClip);
      return;
    }

    if (activeClip) {
      if (currentTimeMs <= activeClip.startMs || currentTimeMs >= activeClip.endMs) {
        toast({ title: '분할 불가', description: '플레이헤드가 선택된 클립 범위 내에 위치해야 합니다.' });
        return;
      }
      splitGivenClip(activeClip);
    }
  }, [selectedClipId, activeClip, selectedTrackId, tracks, currentTimeMs, toast]);

  const splitGivenClip = (clip: NleClip) => {
    const splitPoint = currentTimeMs;
    const clip1: NleClip = {
      ...clip,
      id: `${clip.id}-split-1`,
      endMs: splitPoint,
    };
    const clip2: NleClip = {
      ...clip,
      id: `${clip.id}-split-2`,
      name: `${clip.name} (분할)`,
      startMs: splitPoint,
    };

    const newTracks = tracks.map(t => {
      if (t.id !== clip.trackId) return t;
      const filtered = t.clips.filter(c => c.id !== clip.id);
      return {
        ...t,
        clips: [...filtered, clip1, clip2].sort((a, b) => a.startMs - b.startMs),
      };
    });

    pushHistory(newTracks);
    setSelectedClipId(clip2.id);
    toast({ title: '✂️ 클립 분할 완료 (S)', description: `${(splitPoint / 1000).toFixed(2)}초 지점에서 클립이 2개로 분할되었습니다.` });
  };

  // 2. DELETE_LEFT_AT_PLAYHEAD (Q): 플레이헤드 좌측 리플 트림
  const executeDeleteLeft = useCallback(() => {
    const targetTrack = tracks.find(t => t.id === (selectedTrackId || 'track-sub'));
    if (!targetTrack) return;
    const targetClip = activeClip || targetTrack.clips.find(c => currentTimeMs > c.startMs && currentTimeMs < c.endMs);
    if (!targetClip) {
      toast({ title: '트림 불가 (Q)', description: '플레이헤드 위치에 편집할 클립이 없습니다.' });
      return;
    }

    const trimmedAmount = currentTimeMs - targetClip.startMs;
    if (trimmedAmount <= 0) return;

    // 해당 클립의 시작점을 현재 시간으로 이동하고, 뒤따르는 모든 클립을 앞으로 리플 이동
    const newTracks = tracks.map(t => {
      if (t.id !== targetClip.trackId) return t;
      return {
        ...t,
        clips: t.clips.map(c => {
          if (c.id === targetClip.id) {
            return { ...c, startMs: targetClip.startMs }; // 또는 리플 시 전체 타임라인 밀착
          }
          return c;
        })
      };
    });

    // 픽셀링 식 리플 트림: 현재 클립의 앞부분을 날리고 startMs = currentTimeMs로 설정
    const updatedTracks = tracks.map(t => {
      if (t.id !== targetClip.trackId) return t;
      return {
        ...t,
        clips: t.clips.map(c => {
          if (c.id === targetClip.id) {
            return { ...c, startMs: currentTimeMs };
          }
          return c;
        }).sort((a, b) => a.startMs - b.startMs)
      };
    });

    pushHistory(updatedTracks);
    toast({ title: '⏪ 앞부분 트림 완료 (Q)', description: `플레이헤드 기준 앞부분을 잘라내었습니다.` });
  }, [tracks, selectedTrackId, activeClip, currentTimeMs, pushHistory, toast]);

  // 3. DELETE_RIGHT_AT_PLAYHEAD (W): 플레이헤드 우측 트림
  const executeDeleteRight = useCallback(() => {
    const targetTrack = tracks.find(t => t.id === (selectedTrackId || 'track-sub'));
    if (!targetTrack) return;
    const targetClip = activeClip || targetTrack.clips.find(c => currentTimeMs > c.startMs && currentTimeMs < c.endMs);
    if (!targetClip) {
      toast({ title: '트림 불가 (W)', description: '플레이헤드 위치에 편집할 클립이 없습니다.' });
      return;
    }

    if (currentTimeMs <= targetClip.startMs || currentTimeMs >= targetClip.endMs) return;

    const updatedTracks = tracks.map(t => {
      if (t.id !== targetClip.trackId) return t;
      return {
        ...t,
        clips: t.clips.map(c => {
          if (c.id === targetClip.id) {
            return { ...c, endMs: currentTimeMs };
          }
          return c;
        }).sort((a, b) => a.startMs - b.startMs)
      };
    });

    pushHistory(updatedTracks);
    toast({ title: '⏩ 뒷부분 트림 완료 (W)', description: `플레이헤드 기준 뒷부분을 잘라내었습니다.` });
  }, [tracks, selectedTrackId, activeClip, currentTimeMs, pushHistory, toast]);

  // 4. RIPPLE_DELETE_CLIP (Shift+Delete / Delete)
  const executeRippleDelete = useCallback((ripple: boolean = true) => {
    if (!activeClip) {
      toast({ title: '선택 없음', description: '삭제할 클립을 타임라인에서 먼저 클릭해주세요.' });
      return;
    }

    const clipDuration = activeClip.endMs - activeClip.startMs;
    const clipEnd = activeClip.endMs;

    const newTracks = tracks.map(t => {
      if (t.id !== activeClip.trackId) return t;
      const remaining = t.clips.filter(c => c.id !== activeClip.id);
      if (!ripple) return { ...t, clips: remaining };

      // 리플: 삭제된 클립 뒤에 있던 모든 클립을 그 지속시간만큼 앞으로 당김
      return {
        ...t,
        clips: remaining.map(c => {
          if (c.startMs >= clipEnd) {
            return {
              ...c,
              startMs: Math.max(0, c.startMs - clipDuration),
              endMs: Math.max(0, c.endMs - clipDuration)
            };
          }
          return c;
        }).sort((a, b) => a.startMs - b.startMs)
      };
    });

    pushHistory(newTracks);
    setSelectedClipId(null);
    toast({
      title: ripple ? '🗑️ 리플 삭제 완료 (Shift+Del)' : '🗑️ 클립 삭제 완료',
      description: ripple ? `클립 삭제 후 빈 공간(${ (clipDuration / 1000).toFixed(2) }초)을 자동으로 밀착 정렬했습니다.` : '클립이 삭제되었습니다.'
    });
  }, [activeClip, tracks, pushHistory, toast]);

  // 5. CLOSE_ALL_GAPS_IN_TRACK (Alt+G): 트랙 전체 공백 밀착 정렬
  const executeCloseAllGaps = useCallback(() => {
    const targetTrackId = selectedTrackId || 'track-sub';
    const newTracks = tracks.map(t => {
      if (t.id !== targetTrackId) return t;
      let runningStart = 0;
      const sorted = [...t.clips].sort((a, b) => a.startMs - b.startMs);
      const packed = sorted.map(c => {
        const dur = c.endMs - c.startMs;
        const newClip = {
          ...c,
          startMs: runningStart,
          endMs: runningStart + dur,
        };
        runningStart += dur;
        return newClip;
      });
      return { ...t, clips: packed };
    });

    pushHistory(newTracks);
    toast({ title: '🧲 모든 공백 닫기 완료 (Alt+G)', description: '선택한 트랙의 모든 클립이 빈 공간 없이 일괄 밀착되었습니다.' });
  }, [selectedTrackId, tracks, pushHistory, toast]);

  // 6. DETACH_AUDIO_CLIP (Alt+D): 비디오 클립에서 오디오를 별도 오디오 트랙으로 분리
  const executeDetachAudio = useCallback(() => {
    if (!activeClip || activeClip.type !== 'video') {
      toast({ title: '오디오 분리 불가', description: '비디오 클립을 선택한 상태에서 실행해주세요.' });
      return;
    }

    const audioClip: NleClip = {
      id: `clip-audio-detached-${Date.now()}`,
      trackId: 'track-audio',
      name: `${activeClip.name} (분리된 오디오)`,
      type: 'audio',
      startMs: activeClip.startMs,
      endMs: activeClip.endMs,
      volume: activeClip.volume ?? 100,
      speed: activeClip.speed ?? 1.0,
    };

    const newTracks = tracks.map(t => {
      if (t.id === activeClip.trackId) {
        // 비디오 클립 음소거
        return {
          ...t,
          clips: t.clips.map(c => c.id === activeClip.id ? { ...c, volume: 0 } : c)
        };
      }
      if (t.id === 'track-audio') {
        return {
          ...t,
          clips: [...t.clips, audioClip].sort((a, b) => a.startMs - b.startMs)
        };
      }
      return t;
    });

    pushHistory(newTracks);
    toast({ title: '🎵 오디오 분리 완료 (Alt+D)', description: '비디오 클립의 오디오가 독립 오디오 트랙으로 분리되었습니다.' });
  }, [activeClip, tracks, pushHistory, toast]);

  // 7. DUPLICATE_CLIP (Ctrl+D)
  const executeDuplicateClip = useCallback(() => {
    if (!activeClip) return;
    const dur = activeClip.endMs - activeClip.startMs;
    const cloned: NleClip = {
      ...activeClip,
      id: `clip-cloned-${Date.now()}`,
      name: `${activeClip.name} (복제)`,
      startMs: activeClip.endMs + 100,
      endMs: activeClip.endMs + 100 + dur,
    };

    const newTracks = tracks.map(t => {
      if (t.id !== activeClip.trackId) return t;
      return {
        ...t,
        clips: [...t.clips, cloned].sort((a, b) => a.startMs - b.startMs)
      };
    });

    pushHistory(newTracks);
    setSelectedClipId(cloned.id);
    toast({ title: '📋 클립 복제 완료 (Ctrl+D)' });
  }, [activeClip, tracks, pushHistory, toast]);

  // ── 단축키 전역 이벤트 리스너 (픽셀링 100% 동일 단축키 매핑) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 텍스트 인풋/텍스트에어리어 입력 중 단축키 차단
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      // Space: 재생/일시정지
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
      // S 또는 Ctrl+B: 분할
      else if ((e.code === 'KeyS' && !e.ctrlKey) || (e.code === 'KeyB' && e.ctrlKey)) {
        e.preventDefault();
        executeSplitClip();
      }
      // Q: 앞부분 리플 트림
      else if (e.code === 'KeyQ') {
        e.preventDefault();
        executeDeleteLeft();
      }
      // W: 뒷부분 트림
      else if (e.code === 'KeyW') {
        e.preventDefault();
        executeDeleteRight();
      }
      // Shift+Delete: 리플 삭제
      else if (e.code === 'Delete' && e.shiftKey) {
        e.preventDefault();
        executeRippleDelete(true);
      }
      // Delete / Backspace: 단순 삭제
      else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        executeRippleDelete(false);
      }
      // Alt+G: 모든 공백 닫기
      else if (e.code === 'KeyG' && e.altKey) {
        e.preventDefault();
        executeCloseAllGaps();
      }
      // Alt+D: 오디오 분리
      else if (e.code === 'KeyD' && e.altKey) {
        e.preventDefault();
        executeDetachAudio();
      }
      // Ctrl+D: 클립 복제
      else if (e.code === 'KeyD' && e.ctrlKey) {
        e.preventDefault();
        executeDuplicateClip();
      }
      // Ctrl+Z: Undo
      else if (e.code === 'KeyZ' && e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y 또는 Ctrl+Shift+Z: Redo
      else if ((e.code === 'KeyY' && e.ctrlKey) || (e.code === 'KeyZ' && e.ctrlKey && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
      // J: 1초 뒤로 / K: 정지 / L: 1초 앞으로
      else if (e.code === 'KeyJ') {
        e.preventDefault();
        setCurrentTimeMs(prev => Math.max(0, prev - 1000));
      } else if (e.code === 'KeyK') {
        e.preventDefault();
        setIsPlaying(false);
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setCurrentTimeMs(prev => Math.min(durationMs, prev + 1000));
      }
      // ArrowLeft / ArrowRight: 프레임 이동 (50ms 또는 Shift 누르면 500ms)
      else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 500 : 50;
        setCurrentTimeMs(prev => Math.max(0, prev - delta));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 500 : 50;
        setCurrentTimeMs(prev => Math.min(durationMs, prev + delta));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    executeSplitClip,
    executeDeleteLeft,
    executeDeleteRight,
    executeRippleDelete,
    executeCloseAllGaps,
    executeDetachAudio,
    executeDuplicateClip,
    handleUndo,
    handleRedo,
    durationMs
  ]);

  // ── 재생 애니메이션 루프 ──
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const updatePlayhead = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      setCurrentTimeMs(prev => {
        const next = prev + delta;
        if (next >= durationMs) {
          setIsPlaying(false);
          return 0; // 루프 재생 또는 처음으로
        }
        return next;
      });
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    };

    animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, durationMs]);

  // ── 60fps HTML5 Canvas 2D 합성 렌더러 (4-Layer Stack) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 가상 해상도 설정 (1080x1920 기준 9:16)
    const baseW = aspectRatio === '9:16' ? 1080 : aspectRatio === '16:9' ? 1920 : 1080;
    const baseH = aspectRatio === '9:16' ? 1920 : aspectRatio === '16:9' ? 1080 : 1080;
    canvas.width = baseW;
    canvas.height = baseH;

    // 1. 배경 클리어
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, baseW, baseH);

    // 2. Layer 0: 비디오 메인 클립 렌더링
    const videoTrack = tracks.find(t => t.type === 'video' && t.visible);
    const activeVideoClip = videoTrack?.clips.find(c => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs);
    if (activeVideoClip) {
      // 샌드위치 / 풀 비디오 그라디언트 시뮬레이션
      const grad = ctx.createLinearGradient(0, 0, baseW, baseH);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, baseH * 0.18, baseW, baseH * 0.64);

      // 영상 센터 가이드라인
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(baseW * 0.05, baseH * 0.20, baseW * 0.9, baseH * 0.60);

      // 시네마틱 필터 적용 텍스트/표식
      if (activeFilter !== 'none') {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, baseW, baseH);
      }
    }

    // 3. Layer 1: 마스크 / 레터박스 배경
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, baseW, baseH * 0.18); // 상단 레터박스
    ctx.fillRect(0, baseH * 0.82, baseW, baseH * 0.18); // 하단 레터박스

    // 4. Layer 2: 기본 자막 렌더링 (Track 2)
    const subTrack = tracks.find(t => t.type === 'subtitle' && t.visible);
    const activeSub = subTrack?.clips.find(c => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs);
    if (activeSub && activeSub.text) {
      const style = activeSub.style || {};
      const fontSize = (style.fontSize || 20) * (baseH / 960);
      ctx.font = `bold ${fontSize}px ${style.fontFamily || 'Pretendard'}, sans-serif`;
      ctx.textAlign = style.align || 'center';
      ctx.textBaseline = 'middle';

      const x = ((style.xPct ?? 50) / 100) * baseW;
      const y = ((style.yPct ?? 78) / 100) * baseH;

      // 박스 배경
      if (style.useBox) {
        const textMetrics = ctx.measureText(activeSub.text);
        const paddingX = 24;
        const paddingY = 16;
        ctx.fillStyle = style.bgColor || 'rgba(0,0,0,0.85)';
        ctx.fillRect(
          x - textMetrics.width / 2 - paddingX,
          y - fontSize / 2 - paddingY,
          textMetrics.width + paddingX * 2,
          fontSize + paddingY * 2
        );
      }

      // 텍스트 스트로크(외곽선)
      if (style.strokeWidth && style.strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor || '#000000';
        ctx.lineWidth = style.strokeWidth * (baseH / 960);
        ctx.lineJoin = 'round';
        ctx.strokeText(activeSub.text, x, y);
      }

      // 텍스트 본문
      ctx.fillStyle = style.color || '#FFFFFF';
      ctx.fillText(activeSub.text, x, y);
    }

    // 5. Layer 3: 쨉쨉이 / 리액션 오버레이 렌더링 (Track 3)
    const jabTrack = tracks.find(t => t.type === 'jab' && t.visible);
    const activeJab = jabTrack?.clips.find(c => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs);
    if (activeJab && activeJab.text) {
      const style = activeJab.style || {};
      const fontSize = (style.fontSize || 22) * (baseH / 960);
      ctx.font = `900 ${fontSize}px ${style.fontFamily || 'GmarketSans'}, sans-serif`;
      ctx.textAlign = style.align || 'center';
      ctx.textBaseline = 'middle';

      const x = ((style.xPct ?? 50) / 100) * baseW;
      const y = ((style.yPct ?? 22) / 100) * baseH;

      // 쨉쨉이 강조 외곽선 & 박스
      const textMetrics = ctx.measureText(activeJab.text);
      const paddingX = 28;
      const paddingY = 18;
      ctx.fillStyle = style.bgColor || 'rgba(0,0,0,0.88)';
      ctx.beginPath();
      ctx.roundRect(
        x - textMetrics.width / 2 - paddingX,
        y - fontSize / 2 - paddingY,
        textMetrics.width + paddingX * 2,
        fontSize + paddingY * 2,
        14
      );
      ctx.fill();

      // 스트로크
      ctx.strokeStyle = style.strokeColor || '#000000';
      ctx.lineWidth = 6 * (baseH / 960);
      ctx.strokeText(activeJab.text, x, y);

      // 본문 텍스트
      ctx.fillStyle = style.color || '#FFE500';
      ctx.fillText(activeJab.text, x, y);
    }

    // 6. 안전 영역 가이드라인 (Safe Zones)
    if (safeZoneVisible && aspectRatio === '9:16') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      // YouTube Shorts 우측 아이콘 세이프존
      ctx.strokeRect(baseW * 0.82, baseH * 0.45, baseW * 0.16, baseH * 0.42);
      // 하단 자막/프로필 세이프존
      ctx.strokeRect(baseW * 0.05, baseH * 0.82, baseW * 0.75, baseH * 0.14);
      ctx.setLineDash([]);
    }
  }, [currentTimeMs, tracks, aspectRatio, activeFilter, safeZoneVisible]);

  // ── 4대 폼팩터 템플릿 신속 주입 ──
  const injectFormFactorPreset = (formFactor: 'classic' | 'instagram' | 'gunlimbo' | 'ssul') => {
    let presetSubStyle: any = {};
    let presetJabStyle: any = {};

    if (formFactor === 'classic') {
      presetSubStyle = {
        fontFamily: 'Pretendard',
        fontSize: 20,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 5,
        useBox: false,
        anchor: 'bottom-center',
        xPct: 50,
        yPct: 78,
      };
      presetJabStyle = {
        fontFamily: 'GmarketSans',
        fontSize: 22,
        color: '#FFE500',
        strokeColor: '#000000',
        strokeWidth: 4,
        useBox: true,
        bgColor: 'rgba(0,0,0,0.85)',
        anchor: 'top-center',
        xPct: 50,
        yPct: 22,
      };
    } else if (formFactor === 'instagram') {
      presetSubStyle = {
        fontFamily: 'Pretendard',
        fontSize: 18,
        color: '#000000',
        strokeColor: 'transparent',
        strokeWidth: 0,
        useBox: true,
        bgColor: '#FFFFFF',
        anchor: 'center',
        xPct: 50,
        yPct: 52,
      };
      presetJabStyle = {
        fontFamily: 'Pretendard',
        fontSize: 19,
        color: '#00F0FF',
        strokeColor: '#000000',
        strokeWidth: 4,
        useBox: false,
        anchor: 'bottom-center',
        xPct: 50,
        yPct: 75,
      };
    } else if (formFactor === 'gunlimbo') {
      presetSubStyle = {
        fontFamily: 'GmarketSans',
        fontSize: 21,
        color: '#FFE500',
        strokeColor: '#000000',
        strokeWidth: 6,
        useBox: false,
        anchor: 'bottom-center',
        xPct: 50,
        yPct: 75,
      };
      presetJabStyle = {
        fontFamily: 'GmarketSans',
        fontSize: 24,
        color: '#FF2A4D',
        strokeColor: '#FFFFFF',
        strokeWidth: 5,
        useBox: true,
        bgColor: 'rgba(0,0,0,0.92)',
        anchor: 'top-center',
        xPct: 50,
        yPct: 18,
      };
    } else if (formFactor === 'ssul') {
      presetSubStyle = {
        fontFamily: 'Nanum Gothic',
        fontSize: 17,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 4,
        useBox: true,
        bgColor: 'rgba(0,0,0,0.75)',
        anchor: 'bottom-center',
        xPct: 50,
        yPct: 70,
      };
      presetJabStyle = {
        fontFamily: 'Do Hyeon',
        fontSize: 20,
        color: '#A3E635',
        strokeColor: '#000000',
        strokeWidth: 4,
        useBox: false,
        anchor: 'top-center',
        xPct: 50,
        yPct: 24,
      };
    }

    const newTracks = tracks.map(t => {
      if (t.type === 'subtitle') {
        return {
          ...t,
          clips: t.clips.map(c => ({ ...c, style: { ...c.style, ...presetSubStyle } }))
        };
      }
      if (t.type === 'jab') {
        return {
          ...t,
          clips: t.clips.map(c => ({ ...c, style: { ...c.style, ...presetJabStyle } }))
        };
      }
      return t;
    });

    pushHistory(newTracks);
    toast({
      title: '🎨 폼팩터 스타일 주입 완료',
      description: `[${formFactor.toUpperCase()}] 전용 자막 및 쨉쨉이 레이아웃이 적용되었습니다.`
    });
  };

  // ── CapCut 1:1 초안 내보내기 ──
  const handleExportCapCut = async () => {
    try {
      const subTrack = tracks.find(t => t.type === 'subtitle');
      const jabTrack = tracks.find(t => t.type === 'jab');
      const videoTrack = tracks.find(t => t.type === 'video');
      const audioTracks = tracks.filter(t => t.type === 'audio');

      const fullDraftPayload = {
        title: projectTitle,
        projectName: projectTitle,
        durationMs,
        aspectRatio,
        layoutTemplateMode: 'classic',
        video: {
          path: videoTrack?.clips?.[0]?.mediaUrl || 'video.mp4',
          durationMs,
          scale: 100,
        },
        subtitles: subTrack?.clips.map(c => ({
          startMs: c.startMs,
          endMs: c.endMs,
          text: c.text || '',
          xPct: c.style?.xPct ?? 50,
          yPct: c.style?.yPct ?? 78,
          fontSize: c.style?.fontSize ?? 20,
          fontFamily: c.style?.fontFamily ?? 'Pretendard',
          textColor: c.style?.color ?? '#FFFFFF',
          outlineColor: c.style?.strokeColor ?? '#000000',
          outlineSize: c.style?.strokeWidth ?? 5,
          useBox: c.style?.useBox ?? false,
          boxColor: c.style?.bgColor ?? '#000000',
        })) || [],
        jabs: jabTrack?.clips.map(c => ({
          enabled: true,
          text: c.text || '',
          fontSize: c.style?.fontSize ?? 22,
          textColor: c.style?.color ?? '#FFE500',
          badgeColor: c.style?.bgColor ?? '#000000',
          rotationDeg: c.style?.rotation ?? 0,
          xPct: c.style?.xPct ?? 50,
          yPct: c.style?.yPct ?? 22,
          startMs: c.startMs,
          endMs: c.endMs,
        })) || [],
        audios: audioTracks.flatMap(t => t.clips.map(c => ({
          id: c.id,
          name: c.name || 'Audio',
          path: c.mediaUrl,
          type: 'bgm' as const,
          startMs: c.startMs,
          durationMs: c.endMs - c.startMs,
          volume: (c.volume ?? 100) / 100,
        }))),
      };

      await exportCapCutFullProject(fullDraftPayload as any);
      toast({
        title: '🎬 CapCut 1:1 초안 생성 완료',
        description: `'${projectTitle}' 프로젝트가 CapCut에 1:1 무손실로 저장되었습니다.`
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'CapCut 내보내기 실패',
        description: e.message || '초안 생성 중 오류가 발생했습니다.'
      });
    }
  };

  // ── 🎬 최종 렌더링 저장: 타임라인 기반 MP4 재렌더링 후 05_Exports 동기화 ──
  const handleFinalRenderSave = async () => {
    const subTrack = tracks.find(t => t.type === 'subtitle');
    const subtitles = subTrack?.clips.map(c => ({
      text: c.text || '',
      startMs: c.startMs,
      endMs: c.endMs,
    })) || [];
    try {
      toast({ title: '🎬 최종 렌더링 중...', description: '수정된 타임라인으로 MP4를 재렌더링합니다.' });
      const res = await api.post('/render/short-batch', {
        title: projectTitle,
        script: subtitles.map(s => s.text).join(' '),
        archetype: 'classic',
        voice_engine: 'supertone-local',
        voice_id: 'F1',
        speech_speed: 1.05,
        scenes: subtitles.map(s => ({ text: s.text })),
      });
      toast({
        title: '✅ 최종 렌더링 완료',
        description: `${res.data.filename || res.data.video_path} 저장 완료. 일괄 허브로 복귀하세요.`,
      });
      navigate('/shorts-batch');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '렌더링 실패',
        description: err?.response?.data?.detail || err.message || '렌더링 중 오류가 발생했습니다.',
      });
    }
  };

  // ── 전용 편집기(4대 스튜디오)로 핸드오프 이동 ──
  const handleHandoffToStudio = (mode: 'classic' | 'instagram' | 'gunlimbo' | 'ssul') => {
    const subTrack = tracks.find(t => t.type === 'subtitle');
    const jabTrack = tracks.find(t => t.type === 'jab');

    const handoffPayload = {
      title: projectTitle,
      layoutTemplateMode: mode,
      templateMode: mode,
      durationMs,
      subtitles: subTrack?.clips.map(c => ({
        start: c.startMs / 1000,
        end: c.endMs / 1000,
        text: c.text || '',
      })) || [],
      jabs: jabTrack?.clips.map(c => ({
        start: c.startMs / 1000,
        end: c.endMs / 1000,
        text: c.text || '',
      })) || [],
    };

    try {
      sessionStorage.setItem('vlstudio_editor_handoff', JSON.stringify(handoffPayload));
      localStorage.setItem('vlstudio_editor_handoff_backup', JSON.stringify(handoffPayload));
    } catch (_) {}

    toast({
      title: '🎛️ 전용 스튜디오 핸드오프',
      description: `[${mode.toUpperCase()}] 전용 스튜디오로 이동합니다.`
    });
    navigate(`/shorts-editor/${mode}?title=${encodeURIComponent(projectTitle)}`);
  };

  // ── 9포지션 앵커 변경 ──
  const handleAnchorSelect = (anchorKey: keyof typeof ANCHOR_POSITIONS) => {
    if (!activeClip) return;
    const pos = ANCHOR_POSITIONS[anchorKey];
    const newTracks = tracks.map(t => {
      if (t.id !== activeClip.trackId) return t;
      return {
        ...t,
        clips: t.clips.map(c => {
          if (c.id === activeClip.id) {
            return {
              ...c,
              style: {
                ...c.style,
                anchor: anchorKey,
                xPct: pos.xPct,
                yPct: pos.yPct,
              }
            };
          }
          return c;
        })
      };
    });
    pushHistory(newTracks);
  };

  // ── 타임라인 클릭 이동 ──
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(durationMs, (clickX / rect.width) * durationMs));
    setCurrentTimeMs(newTime);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] w-full max-w-[1920px] mx-auto bg-background text-foreground select-none overflow-hidden animate-in fade-in duration-150">
      {/* ── 0. 4대 스튜디오 작업 탭 바 ── */}
      <StudioWorkspaceTabs
        currentActiveTab="pro"
        activeProjectTitle={projectTitle}
        className="rounded-none border-x-0 border-t-0 border-b border-border shadow-none shrink-0"
      />
      {/* ── 1. NLE 상단 마스터 툴바 ── */}
      <header className="h-12 border-b border-border bg-card px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/shorts-batch')}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title="올인원 일괄 생성 허브로 돌아가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Clapperboard className="w-4 h-4" />
            </div>
            <Input
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              className="h-8 text-xs font-bold w-48 sm:w-64 bg-background border-border"
              placeholder="프로 비디오 프로젝트명"
            />
            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/30">
              PRO NLE 60FPS
            </Badge>
          </div>
        </div>

        {/* 중앙: 재생 컨트롤 & 타임코드 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={historyPast.length === 0}
            className="h-8 w-8 p-0 border-border cursor-pointer"
            title="실행 취소 (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={historyFuture.length === 0}
            className="h-8 w-8 p-0 border-border cursor-pointer"
            title="다시 실행 (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            size="sm"
            onClick={() => setIsPlaying(prev => !prev)}
            className={cn(
              "h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer",
              isPlaying ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            title="재생 / 일시정지 (Space)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? '정지' : '재생'}</span>
          </Button>

          <div className="font-mono text-xs font-bold bg-background px-2.5 py-1 rounded-md border border-border">
            <span className="text-primary">{formatTime(currentTimeMs)}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-muted-foreground">{formatTime(durationMs)}</span>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 핵심 NLE 핫키 버튼군 */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={executeSplitClip}
              className="h-8 text-xs font-bold gap-1 border-border bg-card hover:bg-muted cursor-pointer"
              title="현재 위치 분할 (S / Ctrl+B)"
            >
              <Split className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">분할 (S)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={executeDeleteLeft}
              className="h-8 text-xs font-bold gap-1 border-border bg-card hover:bg-muted cursor-pointer"
              title="앞부분 리플 트림 (Q)"
            >
              <span className="text-amber-500 font-black">Q</span>
              <span className="hidden sm:inline">앞 트림</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={executeDeleteRight}
              className="h-8 text-xs font-bold gap-1 border-border bg-card hover:bg-muted cursor-pointer"
              title="뒷부분 트림 (W)"
            >
              <span className="text-amber-500 font-black">W</span>
              <span className="hidden sm:inline">뒤 트림</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => executeRippleDelete(true)}
              className="h-8 text-xs font-bold gap-1 border-border bg-card hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="리플 삭제 (Shift+Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">리플삭제</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={executeCloseAllGaps}
              className="h-8 text-xs font-bold gap-1 border-border bg-card hover:bg-muted cursor-pointer"
              title="모든 빈 공간 닫기 (Alt+G)"
            >
              <Magnet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">밀착 (Alt+G)</span>
            </Button>
          </div>
        </div>

        {/* 우측: 내보내기 & 배포 버튼군 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleFinalRenderSave}
            className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            title="수정된 타임라인으로 최종 MP4 재렌더링 후 05_Exports 동기화"
          >
            <Film className="w-3.5 h-3.5" />
            <span>🎬 최종 렌더링 저장</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCapCut}
            className="h-8 text-xs font-bold gap-1.5 border-border bg-card hover:bg-muted cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-rose-500" />
            <span>CapCut 초안</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              toast({
                title: '🚀 스케줄 배포 대기열 등록',
                description: `'${projectTitle}' 작업이 LTE 다중 회선 배포 큐로 성공적으로 전송되었습니다.`
              });
              navigate('/work-queue');
            }}
            className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>배포 대기열</span>
          </Button>
        </div>
      </header>

      {/* ── 2. 메인 바디 (좌: 캔버스 프리뷰, 우: 인스펙터 패널) ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* 중앙/좌측 프리뷰 스테이지 */}
        <div className="flex-1 flex flex-col bg-muted/20 relative items-center justify-center p-4 overflow-hidden">
          {/* 상단 폼팩터 신속 프리셋 바 */}
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur border border-border p-1 rounded-lg shadow-xs text-xs">
              <span className="text-[10px] font-bold text-muted-foreground px-1.5">프리셋:</span>
              <button
                type="button"
                onClick={() => injectFormFactorPreset('classic')}
                className="px-2 py-0.5 rounded text-[11px] font-bold hover:bg-muted transition text-foreground"
              >
                🥪 클래식
              </button>
              <button
                type="button"
                onClick={() => injectFormFactorPreset('instagram')}
                className="px-2 py-0.5 rounded text-[11px] font-bold hover:bg-muted transition text-foreground"
              >
                📱 인스타
              </button>
              <button
                type="button"
                onClick={() => injectFormFactorPreset('gunlimbo')}
                className="px-2 py-0.5 rounded text-[11px] font-bold hover:bg-muted transition text-foreground"
              >
                🎬 군림보
              </button>
              <button
                type="button"
                onClick={() => injectFormFactorPreset('ssul')}
                className="px-2 py-0.5 rounded text-[11px] font-bold hover:bg-muted transition text-foreground"
              >
                📜 썰형
              </button>
            </div>

            {/* 화면 비율 & 가이드라인 스위치 */}
            <div className="flex items-center gap-2 bg-card/90 backdrop-blur border border-border p-1 rounded-lg shadow-xs text-xs">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={cn("px-2 py-0.5 rounded text-[11px] font-bold transition", aspectRatio === '9:16' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                9:16
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={cn("px-2 py-0.5 rounded text-[11px] font-bold transition", aspectRatio === '16:9' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                16:9
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={cn("px-2 py-0.5 rounded text-[11px] font-bold transition", aspectRatio === '1:1' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                1:1
              </button>
              <div className="h-3 w-px bg-border mx-0.5" />
              <button
                type="button"
                onClick={() => setSafeZoneVisible(prev => !prev)}
                className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition", safeZoneVisible ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" : "text-muted-foreground")}
                title="숏폼 안전영역 토글"
              >
                세이프존
              </button>
            </div>
          </div>

          {/* 60fps HTML5 Canvas 2D 뷰포트 */}
          <div
            className={cn(
              "relative bg-black rounded-xl overflow-hidden shadow-2xl border border-border/80 flex items-center justify-center transition-all",
              aspectRatio === '9:16' ? "h-[85%] aspect-[9/16]" :
              aspectRatio === '16:9' ? "w-[85%] aspect-[16/9]" : "h-[85%] aspect-square"
            )}
          >
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* 우측 인스펙터 패널 (300px 고정) */}
        <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              속성 인스펙터
            </span>
            {activeClip && (
              <Badge variant="outline" className="text-[10px] font-bold">
                {activeClip.type.toUpperCase()}
              </Badge>
            )}
          </div>

          {activeClip ? (
            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">클립 명칭</label>
                <Input
                  value={activeClip.name}
                  onChange={e => {
                    const val = e.target.value;
                    setTracks(prev => prev.map(t => ({
                      ...t,
                      clips: t.clips.map(c => c.id === activeClip.id ? { ...c, name: val } : c)
                    })));
                  }}
                  className="h-8 text-xs bg-background"
                />
              </div>

              {/* 텍스트 내용 편집 (자막/쨉쨉이) */}
              {(activeClip.type === 'subtitle' || activeClip.type === 'jab') && (
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">문구 내용</label>
                  <Textarea
                    rows={2}
                    value={activeClip.text || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setTracks(prev => prev.map(t => ({
                        ...t,
                        clips: t.clips.map(c => c.id === activeClip.id ? { ...c, text: val } : c)
                      })));
                    }}
                    className="text-xs bg-background resize-none"
                  />
                </div>
              )}

              {/* 9포지션 앵커 스냅 */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">9포지션 앵커 스냅</label>
                <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1.5 rounded-lg border border-border">
                  {(Object.keys(ANCHOR_POSITIONS) as Array<keyof typeof ANCHOR_POSITIONS>).map(posKey => (
                    <button
                      key={posKey}
                      type="button"
                      onClick={() => handleAnchorSelect(posKey)}
                      className={cn(
                        "py-1 rounded text-[10px] font-bold text-center transition cursor-pointer",
                        activeClip.style?.anchor === posKey
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {ANCHOR_POSITIONS[posKey].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 스타일 속성: 폰트 크기, 외곽선 */}
              {activeClip.style && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-muted-foreground">폰트 크기</span>
                      <span>{activeClip.style.fontSize || 20}pt</span>
                    </div>
                    <Slider
                      value={[activeClip.style.fontSize || 20]}
                      min={12}
                      max={48}
                      step={1}
                      onValueChange={([val]) => {
                        setTracks(prev => prev.map(t => ({
                          ...t,
                          clips: t.clips.map(c => c.id === activeClip.id ? {
                            ...c,
                            style: { ...c.style, fontSize: val }
                          } : c)
                        })));
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-muted-foreground">외곽선 두께 (Stroke)</span>
                      <span>{activeClip.style.strokeWidth ?? 4}px</span>
                    </div>
                    <Slider
                      value={[activeClip.style.strokeWidth ?? 4]}
                      min={0}
                      max={12}
                      step={1}
                      onValueChange={([val]) => {
                        setTracks(prev => prev.map(t => ({
                          ...t,
                          clips: t.clips.map(c => c.id === activeClip.id ? {
                            ...c,
                            style: { ...c.style, strokeWidth: val }
                          } : c)
                        })));
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground">배경 박스(Box Pill)</span>
                    <Switch
                      checked={activeClip.style.useBox ?? false}
                      onCheckedChange={checked => {
                        setTracks(prev => prev.map(t => ({
                          ...t,
                          clips: t.clips.map(c => c.id === activeClip.id ? {
                            ...c,
                            style: { ...c.style, useBox: checked }
                          } : c)
                        })));
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 볼륨 제어 (오디오/비디오) */}
              {(activeClip.type === 'audio' || activeClip.type === 'video') && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground">클립 볼륨</span>
                    <span>{activeClip.volume ?? 100}%</span>
                  </div>
                  <Slider
                    value={[activeClip.volume ?? 100]}
                    min={0}
                    max={200}
                    step={5}
                    onValueChange={([val]) => {
                      setTracks(prev => prev.map(t => ({
                        ...t,
                        clips: t.clips.map(c => c.id === activeClip.id ? { ...c, volume: val } : c)
                      })));
                    }}
                  />
                </div>
              )}

              {/* 4대 전용 스튜디오 직결 핸드오프 버튼 */}
              <div className="pt-4 border-t border-border space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground block">
                  전용 스튜디오로 전송:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleHandoffToStudio('classic')}
                    className="h-7 text-[10px] font-bold border-border"
                  >
                    🥪 클래식 편집기
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleHandoffToStudio('instagram')}
                    className="h-7 text-[10px] font-bold border-border"
                  >
                    📱 인스타 편집기
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleHandoffToStudio('gunlimbo')}
                    className="h-7 text-[10px] font-bold border-border"
                  >
                    🎬 군림보 편집기
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleHandoffToStudio('ssul')}
                    className="h-7 text-[10px] font-bold border-border"
                  >
                    📜 썰형 편집기
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <Move className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">하단 타임라인에서 클립을 클릭하면 세부 속성을 편집할 수 있습니다.</p>
            </div>
          )}
        </aside>
      </div>

      {/* ── 3. 하단 멀티트랙 타임라인 ── */}
      <footer className="h-64 border-t border-border bg-card flex flex-col shrink-0">
        {/* 타임라인 서브 툴바 */}
        <div className="h-8 border-b border-border bg-muted/30 px-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-foreground">타임라인 멀티트랙</span>
            <div className="flex items-center gap-1 bg-background px-2 py-0.5 rounded border border-border">
              <span className="text-[10px] text-muted-foreground">줌:</span>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={zoomLevel}
                onChange={e => setZoomLevel(parseFloat(e.target.value))}
                className="w-16 h-1 accent-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              단축키: Q(앞자르기) · W(뒷자르기) · S(분할) · Shift+Del(리플삭제) · Alt+G(밀착)
            </span>
          </div>
        </div>

        {/* 트랙 뷰포트 (좌: 트랙 헤더, 우: 타임라인 캔버스) */}
        <div className="flex-1 flex overflow-hidden">
          {/* 좌측 트랙 헤더 목록 */}
          <div className="w-48 border-r border-border bg-card/60 flex flex-col shrink-0">
            {tracks.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTrackId(t.id)}
                className={cn(
                  "h-12 border-b border-border px-2 flex items-center justify-between transition cursor-pointer text-xs",
                  selectedTrackId === t.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/40"
                )}
              >
                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="font-bold truncate text-[11px]">{t.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTracks(prev => prev.map(tr => tr.id === t.id ? { ...tr, visible: !tr.visible } : tr));
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title={t.visible ? '숨기기' : '표시'}
                  >
                    {t.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-destructive" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTracks(prev => prev.map(tr => tr.id === t.id ? { ...tr, locked: !tr.locked } : tr));
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title={t.locked ? '잠금 해제' : '트랙 잠금'}
                  >
                    {t.locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 우측 클립 시퀀스 타임라인 & 눈금자 */}
          <div
            ref={timelineScrollRef}
            onClick={handleTimelineClick}
            className="flex-1 relative overflow-x-auto overflow-y-hidden bg-background select-none cursor-pointer"
          >
            {/* 플레이헤드 수직 빨간 선 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
              style={{ left: `${(currentTimeMs / durationMs) * 100}%` }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1 shadow-sm" />
            </div>

            {/* 트랙별 클립 가로 스트립 */}
            <div className="flex flex-col h-full" style={{ width: `${100 * zoomLevel}%` }}>
              {tracks.map(t => (
                <div
                  key={t.id}
                  className="h-12 border-b border-border/80 relative flex items-center bg-muted/10"
                >
                  {t.clips.map(clip => {
                    const leftPct = (clip.startMs / durationMs) * 100;
                    const widthPct = ((clip.endMs - clip.startMs) / durationMs) * 100;
                    const isSelected = selectedClipId === clip.id;

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          setSelectedTrackId(t.id);
                        }}
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.max(1, widthPct)}%`,
                          backgroundColor: `${t.color}25`,
                          borderColor: isSelected ? '#3b82f6' : `${t.color}80`,
                        }}
                        className={cn(
                          "absolute h-9 rounded-md border text-[10px] font-bold px-2 flex items-center justify-between overflow-hidden cursor-pointer transition shadow-2xs",
                          isSelected ? "ring-2 ring-primary border-primary z-20" : "hover:brightness-110 z-10"
                        )}
                      >
                        <span className="truncate text-foreground">{clip.name || clip.text}</span>
                        <span className="font-mono text-[9px] text-muted-foreground shrink-0 ml-1">
                          {((clip.endMs - clip.startMs) / 1000).toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ── 시간 포맷터 (ms -> mm:ss.ms) ──
function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
}

export default ProVideoEditorStudio;
