import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import {
  SlidersHorizontal,
  Music,
  Volume2,
  Play,
  Pause,
  FolderOpen,
  Upload,
  Check,
  Sparkles,
  Zap,
  Mic,
  FileText,
  Layers,
  Save,
  Radio
} from 'lucide-react';
import { MasterPreset, TargetArchetype } from '@/types/preset';
import { TTSConfig } from '@/types/tts';
import { SubtitleConfig, KOREAN_FONTS } from '@/types/subtitle';
import { TONE_PRESETS, EXTRA_CAPTION_PRESETS } from '../tabs/OneTakeBatchTab';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface MasterPresetConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPreset: MasterPreset;
  onApplyPreset: (updated: MasterPreset) => void;
  onSaveAsNewPreset: (newPreset: MasterPreset) => void;
}

export const MasterPresetConfigModal: React.FC<MasterPresetConfigModalProps> = ({
  open,
  onOpenChange,
  currentPreset,
  onApplyPreset,
  onSaveAsNewPreset,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'tone' | 'typography' | 'voice' | 'audio' | 'template'>('audio');

  // Local draft states initialized from currentPreset
  const [tone, setTone] = useState<string>(currentPreset.tone);
  const [extraCaption, setExtraCaption] = useState<string>(currentPreset.extraCaption);
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>(currentPreset.subtitleConfig);
  const [speakerSeparation, setSpeakerSeparation] = useState<boolean>(currentPreset.speakerSeparation);
  const [ttsConfig, setTTSConfig] = useState<TTSConfig>(currentPreset.ttsConfig);

  // Audio draft states
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(currentPreset.bgmEnabled);
  const [bgmAutoSmart, setBgmAutoSmart] = useState<boolean>(currentPreset.bgmAutoSmart);
  const [bgmTrack, setBgmTrack] = useState<string | null>(currentPreset.bgmTrack);
  const [bgmVolume, setBgmVolume] = useState<number>(currentPreset.bgmVolume);
  const [autoDucking, setAutoDucking] = useState<boolean>(currentPreset.autoDucking);

  const [sfxEnabled, setSfxEnabled] = useState<boolean>(currentPreset.sfxEnabled);
  const [sfxUserFirst, setSfxUserFirst] = useState<boolean>(currentPreset.sfxUserFirst);
  const [sfxPreset, setSfxPreset] = useState<string>(currentPreset.sfxPreset);

  const [archetype, setArchetype] = useState<TargetArchetype>(currentPreset.archetype);
  const [templateId, setTemplateId] = useState<string>(currentPreset.templateId);

  // Catalog data for BGM & SFX
  const [bgmList, setBgmList] = useState<any[]>([]);
  const [sfxCatalog, setSfxCatalog] = useState<{ official: any[]; custom: any[] }>({ official: [], custom: [] });
  const [previewingAudioUrl, setPreviewingAudioUrl] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Sync with currentPreset when modal opens
  useEffect(() => {
    if (open) {
      setTone(currentPreset.tone);
      setExtraCaption(currentPreset.extraCaption);
      setSubtitleConfig(currentPreset.subtitleConfig);
      setSpeakerSeparation(currentPreset.speakerSeparation);
      setTTSConfig(currentPreset.ttsConfig);
      setBgmEnabled(currentPreset.bgmEnabled);
      setBgmAutoSmart(currentPreset.bgmAutoSmart);
      setBgmTrack(currentPreset.bgmTrack);
      setBgmVolume(currentPreset.bgmVolume);
      setAutoDucking(currentPreset.autoDucking);
      setSfxEnabled(currentPreset.sfxEnabled);
      setSfxUserFirst(currentPreset.sfxUserFirst);
      setSfxPreset(currentPreset.sfxPreset);
      setArchetype(currentPreset.archetype);
      setTemplateId(currentPreset.templateId);
    }
  }, [open, currentPreset]);

  // Load BGM & SFX catalogs
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const bgmRes = await api.get('/bgm/list?kind=bgm');
        if (bgmRes.data?.items) setBgmList(bgmRes.data.items);

        const sfxRes = await api.get('/bgm/sfx/list');
        if (sfxRes.data) {
          setSfxCatalog({
            official: sfxRes.data.official || [],
            custom: sfxRes.data.custom || []
          });
        }
      } catch (err) {
        console.warn('Failed to load audio catalogs in modal:', err);
      }
    })();
  }, [open]);

  // Audio preview toggle
  const togglePlayAudio = (url: string) => {
    if (previewingAudioUrl === url) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPreviewingAudioUrl(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(url);
      audioPreviewRef.current = audio;
      audio.play().catch(e => console.warn('Preview play error:', e));
      audio.onended = () => setPreviewingAudioUrl(null);
      setPreviewingAudioUrl(url);
    }
  };

  const handleOpenCustomSfxFolder = async () => {
    try {
      const res = await api.post('/bgm/sfx/open-folder');
      if (res.data?.success) {
        toast({ title: '📁 탐색기 열림', description: '내 효과음 전용 폴더가 Windows 탐색기에서 열렸습니다.' });
      }
    } catch (e: any) {
      toast({ title: '오류', description: e.message || '폴더 열기 실패', variant: 'destructive' });
    }
  };

  const handleUploadCustomSfx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast({ title: '🎙️ 효과음 업로드 중', description: `${file.name} 파일을 등록하고 있습니다...` });
      const res = await api.post('/bgm/sfx/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        toast({ title: '🎉 등록 완료', description: '새 효과음이 성공적으로 등록되었습니다.' });
        // Refresh catalog
        const sfxRes = await api.get('/bgm/sfx/list');
        if (sfxRes.data) {
          setSfxCatalog({
            official: sfxRes.data.official || [],
            custom: sfxRes.data.custom || []
          });
        }
      }
    } catch (err: any) {
      toast({ title: '업로드 실패', description: err.message, variant: 'destructive' });
    }
  };

  const buildUpdatedPreset = (): MasterPreset => ({
    ...currentPreset,
    tone,
    extraCaption,
    subtitleConfig,
    speakerSeparation,
    ttsConfig,
    bgmEnabled,
    bgmAutoSmart,
    bgmTrack,
    bgmVolume,
    autoDucking,
    sfxEnabled,
    sfxUserFirst,
    sfxPreset,
    archetype,
    templateId,
  });

  const handleApply = () => {
    const updated = buildUpdatedPreset();
    onApplyPreset(updated);
    toast({ title: '✨ 설정 적용 완료', description: '현재 스튜디오에 세부 설정이 즉시 반영되었습니다.' });
    onOpenChange(false);
  };

  const handleSaveAsNew = () => {
    const name = window.prompt('새 마스터 프리셋의 이름을 입력하세요:', `${currentPreset.name} (커스텀)`);
    if (!name || !name.trim()) return;

    const updated = buildUpdatedPreset();
    const newPreset: MasterPreset = {
      ...updated,
      id: `custom-preset-${Date.now()}`,
      name: name.trim(),
      description: '사용자 지정 맞춤 통합 프리셋',
      isCustom: true,
      category: 'custom',
    };
    onSaveAsNewPreset(newPreset);
    toast({ title: '🎉 MY 프리셋 저장 완료', description: `[${newPreset.name}]이(가) 좌측 프리셋 목록에 추가되었습니다.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[94vw] h-[85vh] max-h-[780px] p-0 flex flex-col bg-background border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* 모달 상단 헤더 */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              <div>
                <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>통합 프리셋 & 세부 파라미터 공방</span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    SSOT 100% 동기화
                  </Badge>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  문체, 훅, 폰트, TTS, BGM 스마트 자동화, 효과음 토글, 폼팩터 템플릿을 한자리에서 세밀하게 조율합니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveAsNew}
                className="h-8 text-xs font-bold gap-1 rounded-xl border-border bg-background hover:bg-muted text-foreground cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>MY 프리셋으로 저장</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                className="h-8 text-xs font-bold gap-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>현재 세팅 적용</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-1 px-6 py-2.5 border-b border-border/80 bg-background/50 text-xs overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all",
              activeTab === 'audio' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Music className="w-3.5 h-3.5" />
            <span>오디오 (BGM & SFX)</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              AI 토글
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tone')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all",
              activeTab === 'tone' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>문체 & 쨉쨉이 훅</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all",
              activeTab === 'typography' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>자막 타이포그래피</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all",
              activeTab === 'voice' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>TTS 음성 (Supertone)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all",
              activeTab === 'template' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>폼팩터 & 템플릿</span>
          </button>
        </div>

        {/* 탭 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {/* =========================================================================
              1. 오디오 거버넌스 탭 (BGM 스마트 자동화 & SFX 토글 & 커스텀 폴더)
             ========================================================================= */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* [SECTION A] 배경음(BGM) 지능형 거버넌스 */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-amber-500" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">배경음악 (BGM) 지능형 자동화</h4>
                      <p className="text-[11px] text-muted-foreground">
                        소재 성격, 타겟, 대본을 분석하여 최신 유행하는 쇼츠 배경음을 AI가 자동 채택합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="bgm-toggle" className="text-xs font-bold cursor-pointer">
                        {bgmEnabled ? "배경음 사용 ON" : "배경음 OFF"}
                      </Label>
                      <Switch
                        id="bgm-toggle"
                        checked={bgmEnabled}
                        onCheckedChange={setBgmEnabled}
                      />
                    </div>
                  </div>
                </div>

                {bgmEnabled && (
                  <div className="space-y-4 pt-1">
                    {/* AI 스마트 자동 매칭 토글 스위치 */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <div>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                            AI 스마트 자동 매칭 (기본 추천 모드)
                          </span>
                          <p className="text-[10.5px] text-muted-foreground">
                            영상의 무드와 템포에 맞춰 5대 장르(로파이/서스펜스/업비트/피아노/밈) 중 최적의 음원을 자동 선택합니다.
                          </p>
                        </div>
                      </div>

                      <Switch
                        checked={bgmAutoSmart}
                        onCheckedChange={setBgmAutoSmart}
                      />
                    </div>

                    {/* 수동 BGM 지정 및 미리듣기 (스마트 매칭이 꺼져있거나 수동 변경 원할 때) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">
                          {bgmAutoSmart ? "추천 BGM 오버라이드 (원할 시 특정 곡 고정):" : "사용할 배경음악 트랙 직접 선택:"}
                        </span>
                        {bgmTrack && (
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(`/api/bgm/stream?filename=${encodeURIComponent(bgmTrack)}`)}
                            className="text-primary hover:underline flex items-center gap-1 font-bold text-[11px]"
                          >
                            {previewingAudioUrl?.includes(encodeURIComponent(bgmTrack)) ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-amber-500" />}
                            <span>선택곡 미리듣기</span>
                          </button>
                        )}
                      </div>

                      <select
                        value={bgmTrack || ''}
                        onChange={(e) => setBgmTrack(e.target.value || null)}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground cursor-pointer"
                      >
                        <option value="">(자동 추천 곡 사용)</option>
                        {bgmList.map((b) => (
                          <option key={b.id} value={b.filename}>
                            [{b.category.toUpperCase()}] {b.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* BGM 볼륨 & 오토 더킹 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <div className="flex justify-between text-muted-foreground mb-1.5">
                          <span>BGM 볼륨</span>
                          <span className="font-bold text-foreground">{Math.round(bgmVolume * 100)}%</span>
                        </div>
                        <Slider
                          value={[bgmVolume * 100]}
                          min={5}
                          max={60}
                          step={1}
                          onValueChange={([v]) => setBgmVolume(v / 100)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60">
                        <div>
                          <Label htmlFor="ducking-toggle" className="text-xs font-semibold cursor-pointer">
                            오토 더킹 (Auto Ducking)
                          </Label>
                          <p className="text-[10px] text-muted-foreground">목소리가 나올 때 BGM 볼륨을 자동으로 30% 낮춤</p>
                        </div>
                        <Switch
                          id="ducking-toggle"
                          checked={autoDucking}
                          onCheckedChange={setAutoDucking}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* [SECTION B] 효과음(SFX) 지능형 거버넌스 & 대표님 커스텀 보관소 */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">효과음 (SFX) 지능형 자동화 & 커스텀 보관소</h4>
                      <p className="text-[11px] text-muted-foreground">
                        씬 분석을 통해 쨉쨉이 훅과 화면 전환점에 찰진 효과음을 자동으로 0ms 정밀 삽입합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sfx-toggle" className="text-xs font-bold cursor-pointer">
                        {sfxEnabled ? "효과음 사용 ON" : "효과음 OFF"}
                      </Label>
                      <Switch
                        id="sfx-toggle"
                        checked={sfxEnabled}
                        onCheckedChange={setSfxEnabled}
                      />
                    </div>
                  </div>
                </div>

                {sfxEnabled && (
                  <div className="space-y-4 pt-1">
                    {/* 대표님 보유 효과음 최우선 매칭 토글 & 폴더 열기 */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            내 보유 효과음 최우선 매칭 (User-First Priority)
                          </span>
                          <Badge variant="secondary" className="text-[9.5px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            등록됨: {sfxCatalog.custom.length}개
                          </Badge>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground mt-0.5">
                          대표님이 전용 폴더에 넣은 효과음 파일을 AI가 우선적으로 감지하여 영상에 맞춤 삽입합니다.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleOpenCustomSfxFolder}
                          className="h-8 text-xs font-bold gap-1 rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>📁 내 효과음 폴더 열기</span>
                        </Button>

                        <label className="h-8 px-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>➕ 파일 등록</span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleUploadCustomSfx}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 2026 검증된 바이럴 효과음 프리뷰 목록 (0.3s 청취 가능) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground">
                          2026 최신 쇼츠 바이럴 시그니처 사운드 팩 ({sfxCatalog.official.length}종)
                        </span>
                        <span className="text-[10px] text-muted-foreground">클릭 시 0.3초 즉시 청취</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {sfxCatalog.official.map((s) => {
                          const isPreviewing = previewingAudioUrl?.includes(s.id);
                          const isSelected = sfxPreset === s.id;

                          return (
                            <div
                              key={s.id}
                              onClick={() => setSfxPreset(s.id)}
                              className={cn(
                                "p-2 rounded-xl border flex items-center justify-between cursor-pointer transition text-left",
                                isSelected ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40" : "bg-background border-border/80 hover:border-primary/40"
                              )}
                            >
                              <div className="min-w-0 pr-1">
                                <div className="flex items-center gap-1">
                                  <span>{s.emoji}</span>
                                  <span className="font-bold truncate text-[11px]">{s.name}</span>
                                </div>
                                <span className="text-[9.5px] text-muted-foreground block truncate">{s.desc}</span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlayAudio(s.stream_url);
                                }}
                                className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-primary hover:text-primary-foreground transition cursor-pointer"
                                title="미리듣기"
                              >
                                {isPreviewing ? <Pause className="w-3 h-3 text-primary" /> : <Play className="w-3 h-3 ml-0.5" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              2. 문체 & 쨉쨉이 훅 탭
             ========================================================================= */}
          {activeTab === 'tone' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-foreground mb-2">문체 페르소나 (Writer Persona)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TONE_PRESETS.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition text-left",
                        tone === t.id ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs" : "bg-background border-border/80 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <span>{t.emoji}</span>
                        <span>{t.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-foreground mb-2">쨉쨉이 훅 배너 (Jab Hook Style)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {EXTRA_CAPTION_PRESETS.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setExtraCaption(c.id)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition text-left",
                        extraCaption === c.id ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs" : "bg-background border-border/80 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <span>{c.emoji}</span>
                        <span>{c.name}</span>
                      </div>
                      <p className="text-[10px] font-mono text-primary">{c.sample}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              3. 자막 타이포그래피 탭
             ========================================================================= */}
          {activeTab === 'typography' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-muted-foreground block mb-1 font-semibold">상업용 무료 폰트</span>
                  <select
                    value={subtitleConfig.font || 'NanumGothic'}
                    onChange={(e) => setSubtitleConfig({ ...subtitleConfig, font: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs cursor-pointer"
                  >
                    {KOREAN_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>자막 크기</span>
                    <span className="font-bold text-foreground">{subtitleConfig.fontSize || 20}pt</span>
                  </div>
                  <Slider
                    value={[subtitleConfig.fontSize || 20]}
                    min={14}
                    max={36}
                    step={1}
                    onValueChange={([v]) => setSubtitleConfig({ ...subtitleConfig, fontSize: v })}
                  />
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1 font-semibold">자막 글자색</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subtitleConfig.primaryColor || '#FFFF00'}
                      onChange={(e) => setSubtitleConfig({ ...subtitleConfig, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-xs">{subtitleConfig.primaryColor || '#FFFF00'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1 font-semibold">외곽선 두께</span>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>두께</span>
                    <span className="font-bold text-foreground">{subtitleConfig.strokeWidth || 4}px</span>
                  </div>
                  <Slider
                    value={[subtitleConfig.strokeWidth || 4]}
                    min={0}
                    max={8}
                    step={1}
                    onValueChange={([v]) => setSubtitleConfig({ ...subtitleConfig, strokeWidth: v })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <Label htmlFor="spk-sep" className="text-xs font-bold cursor-pointer">
                    대화형 화자 분리 (화자 A/B 색상 차별화)
                  </Label>
                  <p className="text-[10.5px] text-muted-foreground">대화형 대본일 경우 화자별로 다른 자막 컬러와 외곽선 적용</p>
                </div>
                <Switch
                  id="spk-sep"
                  checked={speakerSeparation}
                  onCheckedChange={setSpeakerSeparation}
                />
              </div>
            </div>
          )}

          {/* =========================================================================
              4. 음성 TTS (Supertone) 탭
             ========================================================================= */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
                <div>
                  <strong className="text-xs text-primary">Supertone 로컬 고품질 AI 음성 엔진</strong>
                  <p className="text-[10.5px] text-muted-foreground">외부 클라우드 과금 없이 로컬 네이티브로 초고속 렌더링됩니다.</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-primary border-primary">
                  Native Offline
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'F1', name: 'Supertone F1', desc: '밝고 또렷한 표준 내레이션' },
                  { id: 'F2', name: 'Supertone F2', desc: '차분하고 감성적인 스토리' },
                  { id: 'F5', name: 'Supertone F5', desc: '빠르고 긴박한 속보/이슈' },
                  { id: 'M1', name: 'Supertone M1', desc: '진중한 남성 명화관 서사' },
                  { id: 'M2', name: 'Supertone M2', desc: '묵직하고 신뢰감 있는 저음' },
                  { id: 'M5', name: 'Supertone M5', desc: '역동적인 스포츠/액션' },
                ].map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setTTSConfig({ ...ttsConfig, voice_id: v.id })}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition text-left",
                      ttsConfig.voice_id === v.id ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs" : "bg-background border-border/80 hover:border-primary/40"
                    )}
                  >
                    <strong className="text-xs block text-foreground">{v.name}</strong>
                    <span className="text-[10px] text-muted-foreground">{v.desc}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>말하기 속도</span>
                    <span className="font-bold text-foreground">{(ttsConfig.speed || 1.05).toFixed(2)}x</span>
                  </div>
                  <Slider
                    value={[(ttsConfig.speed || 1.05) * 100]}
                    min={80}
                    max={140}
                    step={2}
                    onValueChange={([v]) => setTTSConfig({ ...ttsConfig, speed: v / 100 })}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>음성 톤 (Pitch)</span>
                    <span className="font-bold text-foreground">{ttsConfig.pitch || 0}</span>
                  </div>
                  <Slider
                    value={[ttsConfig.pitch || 0]}
                    min={-5}
                    max={5}
                    step={1}
                    onValueChange={([v]) => setTTSConfig({ ...ttsConfig, pitch: v })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              5. 폼팩터 & 템플릿 탭
             ========================================================================= */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'classic', name: '클래식', desc: '상하 레터박스 2단 레이아웃' },
                  { id: 'instagram', name: '인스타', desc: '소셜 프로필 & 베댓형' },
                  { id: 'gunlimbo', name: '군림보', desc: '0초 훅밴드 & 네온 자막' },
                  { id: 'ssul', name: '썰형', desc: '커뮤니티 헤더 & 밈 오버레이' },
                ].map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setArchetype(a.id as TargetArchetype)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition text-left",
                      archetype === a.id ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs" : "bg-background border-border/80 hover:border-primary/40"
                    )}
                  >
                    <strong className="text-xs block text-foreground">{a.name}</strong>
                    <span className="text-[10px] text-muted-foreground">{a.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
