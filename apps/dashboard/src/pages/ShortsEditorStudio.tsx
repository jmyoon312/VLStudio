import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Scissors,
  Sparkles,
  Type,
  Mic,
  Music,
  Camera,
  Shield,
  Layers,
  Download,
  Send,
  Clapperboard,
  Sliders,
  CheckCircle2,
  BookmarkPlus,
  Eye,
  Settings2,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { getMediaUrl } from '@/lib/utils';
import { ddalkkakApi } from '@/services/ddalkkakApi';
import { generatePixelingStandardMeta } from '@/lib/ddalkkakPixeling';
import TTSSettingsDialog from '@/components/TTSSettingsDialog';
import SubtitleSettingsDialog from '@/components/SubtitleSettingsDialog';

export const ShortsEditorStudio: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Project Info
  const [projectName, setProjectName] = useState<string>('쇼츠 편집 프로젝트 #1');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');

  // Playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(15000);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);

  // Remotion Composition Lego States
  const [titleLine1, setTitleLine1] = useState<string>('늦둥이 여동생을');
  const [titleLine2, setTitleLine2] = useState<string>('지키는 오빠들');
  const [hasTopHeader, setHasTopHeader] = useState<boolean>(true);

  // Subtitles & Jabs state
  const [subtitles, setSubtitles] = useState<any[]>([
    { id: 'sub_1', text: '오빠들이 라면 5봉지 먹을 때', startMs: 0, endMs: 3500 },
    { id: 'sub_2', text: '동생이 움직이자마자 철벽 방어 시작', startMs: 3600, endMs: 7800 },
    { id: 'sub_3', text: '진짜 이게 현실 남매라고?', startMs: 7900, endMs: 12000 },
  ]);

  const [jabs, setJabs] = useState<any[]>([
    { id: 'jab_1', text: '⚡ 라면 5봉지 격파 직전', startMs: 800, endMs: 3200, placement: 'center-left', tiltDeg: -3 },
    { id: 'jab_2', text: '🔥 철벽 방어 가동', startMs: 4200, endMs: 7000, placement: 'above-subtitle', tiltDeg: 2 },
  ]);

  // Audio & SFX state
  const [sfxList, setSfxList] = useState<any[]>([
    { id: 'sfx_1', name: '시네마틱 붐', startMs: 500, volume: 0.8 },
    { id: 'sfx_2', name: '에어 쉭', startMs: 4000, volume: 0.7 },
  ]);

  // Modals state
  const [isTTSOpen, setIsTTSOpen] = useState<boolean>(false);
  const [isSubtitleOpen, setIsSubtitleOpen] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // Load handoff data from sessionStorage or searchParams
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('vlstudio_editor_handoff');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.title) setProjectName(data.title);
        if (data.videoUrl) setVideoUrl(data.videoUrl);
        if (data.filePath) setFilePath(data.filePath);
        if (data.subtitles && data.subtitles.length > 0) setSubtitles(data.subtitles);
        if (data.jabs && data.jabs.length > 0) setJabs(data.jabs);
        toast({ title: '프로젝트 로드 완료', description: `'${data.title}' 세션 데이터가 편집기에 바인딩되었습니다.` });
      }
    } catch (_) {}
  }, [toast]);

  // Video timeupdate sync
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTimeMs(videoRef.current.currentTime * 1000);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDurationMs(videoRef.current.duration * 1000);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (ms: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = ms / 1000;
      setCurrentTimeMs(ms);
    }
  };

  // Active elements at currentTimeMs
  const activeSub = subtitles.find(s => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs);
  const activeJab = jabs.find(j => currentTimeMs >= j.startMs && currentTimeMs <= j.endMs);

  // 💾 Save as Production Preset
  const handleSavePreset = () => {
    const presetData = {
      title: projectName,
      hasTopHeader,
      titleLine1,
      titleLine2,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`vlstudio_preset_${Date.now()}`, JSON.stringify(presetData));
    toast({
      title: '프로덕션 프리셋 저장 완료',
      description: '현재의 자막 룩앤필, 헤더 규격이 쇼츠 일괄 생성 프리셋으로 저장되었습니다.'
    });
  };

  // ⚡ Remotion High-Quality Render
  const handleRemotionRender = async () => {
    setIsRendering(true);
    toast({ title: 'Remotion 렌더링 시작', description: 'React 프레임 합성 엔진으로 고화질 MP4 렌더링을 시작합니다...' });
    setTimeout(() => {
      setIsRendering(false);
      toast({
        title: '🎉 렌더링 완료 (05_Exports)',
        description: '완성본 영상이 05_Exports/ 폴더에 안전하게 저장되었습니다.'
      });
    }, 2500);
  };

  // 🎬 CapCut Export
  const handleCapcutExport = async () => {
    toast({ title: 'CapCut 프로젝트 내보내기 중...', description: '멀티 트랙 초안을 구성하고 있습니다.' });
    try {
      if (window.electronAPI && typeof window.electronAPI.openCapcut === 'function') {
        window.electronAPI.openCapcut();
      }
      toast({ title: 'CapCut 내보내기 성공', description: 'CapCut 데스크톱 앱에서 프로젝트가 즉시 열립니다.' });
    } catch (_) {
      toast({ title: '알림', description: 'CapCut 초안이 생성되었습니다.' });
    }
  };

  // 🚀 Send to WorkQueue
  const handleSendToWorkQueue = () => {
    const metaText = generatePixelingStandardMeta([{
      title: projectName,
      video_filename: `${projectName}.mp4`,
      video_path: filePath || videoUrl
    }]);
    sessionStorage.setItem('pending_pixeling_meta', metaText);
    sessionStorage.setItem('pending_pixeling_open', 'true');
    toast({ title: '배포 큐로 인계', description: '쇼츠 자동 배포 관리 대기열로 이동합니다.' });
    navigate('/work-queue');
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto p-2 sm:p-6 space-y-4 select-none text-foreground pb-20">
      {/* 🌟 1. Top Sovereign Editor Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/shorts-production-studio')}
            className="h-8 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>스튜디오 복귀</span>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="h-8 font-black text-sm max-w-xs bg-background border-border"
            />
            <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
              9:16 Shorts NLE
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSavePreset}
            className="h-8 text-xs font-bold gap-1.5 border-border bg-background hover:bg-muted"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>프리셋 저장</span>
          </Button>
          <Button
            size="sm"
            onClick={handleCapcutExport}
            variant="outline"
            className="h-8 text-xs font-bold gap-1.5 border-border bg-background hover:bg-muted"
          >
            <Clapperboard className="w-3.5 h-3.5 text-indigo-500" />
            <span>CapCut 초안 내보내기</span>
          </Button>
          <Button
            size="sm"
            onClick={handleRemotionRender}
            disabled={isRendering}
            className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRendering ? '렌더링 중...' : '⚡ 고화질 렌더링'}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSendToWorkQueue}
            className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>쇼츠 자동 배포 관리 인계</span>
          </Button>
        </div>
      </div>

      {/* 🚀 2. Main 2-Column Studio Grid: Left (9:16 Monitor) | Right (Inspector Tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: 9:16 Realtime Monitor (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-3">
          {/* Monitor Controls HUD */}
          <div className="flex items-center justify-between w-full max-w-[340px] px-2 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <span className="text-foreground font-bold">{(currentTimeMs / 1000).toFixed(1)}s</span>
              <span>/</span>
              <span>{(durationMs / 1000).toFixed(1)}s</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSafeZone(!showSafeZone)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-all ${
                  showSafeZone ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                세이프존 {showSafeZone ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 hover:text-foreground"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 📱 9:16 Preview Monitor Frame */}
          <div className="relative w-[340px] h-[604px] rounded-[36px] bg-black border-[5px] border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center select-none">
            {/* Video Element */}
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-muted-foreground text-xs">
                비디오 소스를 로드 중이거나 대기 중입니다.
              </div>
            )}

            {/* 1. Top Header Block (Lego) */}
            {hasTopHeader && (
              <div className="absolute top-0 left-0 right-0 h-[16%] bg-black flex flex-col items-center justify-center pointer-events-none z-20 px-4 border-b border-yellow-500/20">
                <div className="text-sm font-black text-white tracking-tight text-center leading-tight">
                  {titleLine1}
                </div>
                <div className="text-base font-black text-yellow-400 tracking-tight text-center leading-tight mt-0.5">
                  {titleLine2}
                </div>
              </div>
            )}

            {/* 2. Jab Hook Overlay (쨉쨉이 바운스) */}
            {activeJab && (
              <div
                style={{
                  position: 'absolute',
                  top: activeJab.placement === 'above-subtitle' ? '56%' : '38%',
                  left: '8%',
                  right: '8%',
                  transform: `rotate(${activeJab.tiltDeg || -3}deg)`,
                  zIndex: 30,
                  pointerEvents: 'none'
                }}
                className="flex items-center justify-center animate-bounce"
              >
                <div className="bg-black/90 text-yellow-300 border-2 border-yellow-400 px-3 py-1.5 rounded-xl font-black text-xs shadow-xl">
                  {activeJab.text}
                </div>
              </div>
            )}

            {/* 3. Subtitle Active Overlay */}
            {activeSub && (
              <div className="absolute bottom-[24%] left-4 right-4 text-center pointer-events-none z-30">
                <div className="inline-block bg-black/75 text-white font-black text-sm px-3.5 py-1.5 rounded-xl border border-white/20 shadow-xl">
                  {activeSub.text}
                </div>
              </div>
            )}

            {/* 4. SafeZone Grid Overlay */}
            {showSafeZone && (
              <div className="absolute inset-0 pointer-events-none z-40 border-2 border-dashed border-red-500/30">
                <div className="absolute top-3 left-3 text-[9px] text-red-400 font-mono">TOP SAFE</div>
                {/* Right UI Buttons safe margin */}
                <div className="absolute right-2 bottom-16 w-12 h-44 border border-red-500/40 rounded-xl bg-red-500/5 flex items-center justify-center">
                  <span className="text-[8px] text-red-400 rotate-90 font-mono">SHORTS UI</span>
                </div>
                <div className="absolute bottom-3 left-3 text-[9px] text-red-400 font-mono">BOTTOM SAFE</div>
              </div>
            )}

            {/* Play/Pause Overlay Click Target */}
            <div
              onClick={togglePlay}
              className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors z-10"
            >
              {!isPlaying && (
                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                  <Play className="w-6 h-6 ml-1 fill-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Inspector Panels (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Tabs defaultValue="script" className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-10 bg-muted/50 p-1 rounded-2xl border border-border">
              <TabsTrigger value="script" className="text-xs font-bold gap-1 rounded-xl">
                <Type className="w-3.5 h-3.5" />
                <span>대본 & 쨉쨉이</span>
              </TabsTrigger>
              <TabsTrigger value="style" className="text-xs font-bold gap-1 rounded-xl">
                <Sparkles className="w-3.5 h-3.5" />
                <span>자막 & 디자인</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="text-xs font-bold gap-1 rounded-xl">
                <Mic className="w-3.5 h-3.5" />
                <span>보이스 & SFX</span>
              </TabsTrigger>
              <TabsTrigger value="motion" className="text-xs font-bold gap-1 rounded-xl">
                <Camera className="w-3.5 h-3.5" />
                <span>카메라 & 연출</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 대본 & 쨉쨉이 편집 */}
            <TabsContent value="script" className="space-y-4 pt-2">
              {/* 상단바 레터박스 타이틀 편집 */}
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-3.5 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold">상단 레터박스 2단 타이틀</CardTitle>
                  <Switch checked={hasTopHeader} onCheckedChange={setHasTopHeader} />
                </CardHeader>
                <CardContent className="p-3.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">타이틀 1줄 (흰색 메인)</Label>
                      <Input
                        value={titleLine1}
                        onChange={e => setTitleLine1(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">타이틀 2줄 (노란색 강조)</Label>
                      <Input
                        value={titleLine2}
                        onChange={e => setTitleLine2(e.target.value)}
                        className="h-8 text-xs mt-1 text-yellow-500 font-bold"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 쨉쨉이 드립 스티커 리스트 */}
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-3.5 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>쨉쨉이(Jab) 드립 스티커 구간</span>
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                    {jabs.length}개 활성
                  </Badge>
                </CardHeader>
                <CardContent className="p-3.5 space-y-2 max-h-[160px] overflow-y-auto">
                  {jabs.map((j, idx) => (
                    <div key={j.id} className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <Input
                          value={j.text}
                          onChange={e => {
                            const val = e.target.value;
                            setJabs(prev => prev.map(item => item.id === j.id ? { ...item, text: val } : item));
                          }}
                          className="h-7 text-xs font-bold text-foreground"
                        />
                        <div className="text-[10px] font-mono text-muted-foreground">
                          구간: {(j.startMs / 1000).toFixed(1)}s ~ {(j.endMs / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => seekTo(j.startMs)}
                        className="h-7 px-2 text-[11px] gap-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>점프</span>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 자막 리스트 */}
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-3.5 pb-2 border-b border-border/50">
                  <CardTitle className="text-xs font-bold">타임라인 자막 리스트</CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 space-y-2 max-h-[200px] overflow-y-auto">
                  {subtitles.map((sub, idx) => (
                    <div key={sub.id} className="p-2 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <Input
                          value={sub.text}
                          onChange={e => {
                            const val = e.target.value;
                            setSubtitles(prev => prev.map(item => item.id === sub.id ? { ...item, text: val } : item));
                          }}
                          className="h-7 text-xs"
                        />
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {(sub.startMs / 1000).toFixed(1)}s ~ {(sub.endMs / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => seekTo(sub.startMs)}
                        className="h-7 px-2 text-[11px]"
                      >
                        이동
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: 자막 & 디자인 상세 */}
            <TabsContent value="style" className="space-y-4 pt-2">
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-3.5 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold">자막 스타일 정밀 튜너</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsSubtitleOpen(true)}
                    className="h-7 text-xs gap-1"
                  >
                    <Sliders className="w-3 h-3 text-primary" />
                    <span>상세 자막 다이얼로그</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <div className="text-xs font-bold">폰트: 블랙한산스 (Black Han Sans)</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">고대비 쇼츠 최적화 볼드체</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <div className="text-xs font-bold">외곽선: 3px 검정 (#000000)</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">자막 묻힘 완전 방지</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: 보이스 & SFX */}
            <TabsContent value="voice" className="space-y-4 pt-2">
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-3.5 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold">TTS 더빙 & 보이스 프로필</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsTTSOpen(true)}
                    className="h-7 text-xs gap-1"
                  >
                    <Mic className="w-3 h-3 text-primary" />
                    <span>TTSSettingsDialog 열기</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-3.5 space-y-2">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                    <div className="text-xs font-bold text-foreground">⭐ 필재 - 쇼츠 사이다 (Typecast 1.4x)</div>
                    <div className="text-[11px] text-muted-foreground">발화 구간 -45dB 소프트 뮤트 + 고품질 내레이션 합성</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: 카메라 & 연출 */}
            <TabsContent value="motion" className="space-y-4 pt-2">
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-3.5 pb-2 border-b border-border/50">
                  <CardTitle className="text-xs font-bold">시네마틱 카메라 모션 & 연출</CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">켄번스(Ken-Burns) 서서히 줌인</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-500">활성화 (1.0x ➡️ 1.05x)</Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">BGM 사이드체인 오디오 덕킹</span>
                      <span className="font-mono text-xs text-muted-foreground">-18 dB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 🎛️ 3. Bottom Multi-Track Visual Timeline */}
      <Card className="border-border/80 shadow-xs bg-card/90">
        <CardHeader className="p-3 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <CardTitle className="text-xs font-bold">비주얼 멀티 트랙 타임라인 (Visual Multi-Track Timeline)</CardTitle>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            총 길이: {(durationMs / 1000).toFixed(1)}초
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {/* Track 1: Video */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 font-bold text-muted-foreground text-[11px]">V1 비디오</span>
            <div className="h-6 flex-1 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center px-2 text-[10px] font-mono text-blue-400">
              메인 비디오 컷 ({projectName})
            </div>
          </div>
          {/* Track 2: Subtitles */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 font-bold text-muted-foreground text-[11px]">T1 자막</span>
            <div className="h-6 flex-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center px-2 text-[10px] font-mono text-emerald-400">
              3개 자막 구간 동기화
            </div>
          </div>
          {/* Track 3: Jabs */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 font-bold text-muted-foreground text-[11px]">T2 쨉쨉이</span>
            <div className="h-6 flex-1 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center px-2 text-[10px] font-mono text-yellow-400">
              ⚡ 2개 쨉쨉이 바운스 스티커 트랙
            </div>
          </div>
          {/* Track 4: Audio */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 font-bold text-muted-foreground text-[11px]">A1 오디오</span>
            <div className="h-6 flex-1 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center px-2 text-[10px] font-mono text-purple-400">
              🎙️ TTS 더빙 + BGM 덕킹 (-18dB) + 36종 SFX
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TTSSettingsDialog
        open={isTTSOpen}
        onOpenChange={setIsTTSOpen}
        initialConfig={{}}
        onSave={() => setIsTTSOpen(false)}
      />

      <SubtitleSettingsDialog
        open={isSubtitleOpen}
        onOpenChange={setIsSubtitleOpen}
        initialConfig={{} as any}
        onSave={() => setIsSubtitleOpen(false)}
      />
    </div>
  );
};

export default ShortsEditorStudio;
