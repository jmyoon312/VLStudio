import React, { useState, useMemo } from 'react';
import {
  MeokguriSettings,
  MeokguriScript,
  MeokguriZoomPopIntensity,
  VIRALOOP_MEOKGURI_VOICES,
  ViraLoopVoiceOption
} from './types';
import { MeokguriCaptionTimingEditor } from './MeokguriCaptionTimingEditor';
import { cn } from '@/lib/utils';
import {
  Sliders,
  Volume2,
  Maximize2,
  Sparkles,
  Zap,
  FolderOpen,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  Play,
  Square,
  Search,
  Mic,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api, API_BASE_URL } from '@/lib/api';

interface MeokguriSettingsStageProps {
  settings: MeokguriSettings;
  onUpdateSettings: (settings: MeokguriSettings) => void;
  script: MeokguriScript;
  onUpdateScript: (script: MeokguriScript) => void;
  onBackToSource: () => void;
  onStartRender: () => void;
  isRendering: boolean;
  isAnalyzingBg?: boolean;
}

export const MeokguriSettingsStage: React.FC<MeokguriSettingsStageProps> = ({
  settings,
  onUpdateSettings,
  script,
  onUpdateScript,
  onBackToSource,
  onStartRender,
  isRendering,
  isAnalyzingBg = false
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'edit' | 'voice' | 'output'>('edit');

  // 핵심: updateSetting 헬퍼 함수 정의 (런타임 ReferenceError 원천 차단)
  const updateSetting = <K extends keyof MeokguriSettings>(key: K, value: MeokguriSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  // 효과음 프리셋 목록
  const [sfxList, setSfxList] = useState([
    { id: 'crunch', name: '바삭! (치킨/튀김 크런치)', enabled: true, icon: '🍗' },
    { id: 'gulp', name: '꿀꺽! (시원한 탄산/삼킴)', enabled: true, icon: '🥤' },
    { id: 'boing', name: '띠용! (반전 리액션)', enabled: true, icon: '👀' },
    { id: 'cheer', name: '우와! (감탄사 환호)', enabled: false, icon: '🎉' },
  ]);

  const toggleSfx = (id: string) => {
    setSfxList(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  // 음성 매트릭스 필터 & 검색 상태
  const [voiceCategory, setVoiceCategory] = useState<string>('all');
  const [voiceSearch, setVoiceSearch] = useState<string>('');

  const filteredVoices = useMemo(() => {
    return VIRALOOP_MEOKGURI_VOICES.filter(v => {
      const matchCat = voiceCategory === 'all' || v.category === voiceCategory;
      const matchSearch = !voiceSearch.trim() ||
        v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
        v.desc.toLowerCase().includes(voiceSearch.toLowerCase()) ||
        v.tag.toLowerCase().includes(voiceSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [voiceCategory, voiceSearch]);

  // 음성 실시간 오디션 재생기
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const handlePreviewVoice = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingVoiceId === voiceId && previewAudio) {
      previewAudio.pause();
      setPlayingVoiceId(null);
      return;
    }

    try {
      if (previewAudio) {
        previewAudio.pause();
      }
      setPlayingVoiceId(voiceId);

      const res = await api.get(`/meokguri/sample-voice`, {
        params: {
          voiceName: voiceId,
          speed: settings.voiceSpeed,
          pitch: settings.voicePitch || 0
        }
      });

      if (res.data && res.data.audioPath) {
        const filename = res.data.audioPath.split(/[\\/]/).pop();
        const audioUrl = `${API_BASE_URL.replace('/api', '')}/media/02_Operations/Temp/${filename}`;
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => {
          // Fallback to relative path
          const fallback = new Audio(`/media/02_Operations/Temp/${filename}`);
          fallback.onended = () => setPlayingVoiceId(null);
          fallback.play().catch(() => setPlayingVoiceId(null));
        };
        audio.play().catch(() => setPlayingVoiceId(null));
        setPreviewAudio(audio);
      } else {
        setPlayingVoiceId(null);
      }
    } catch (err) {
      console.warn('[handlePreviewVoice] Error:', err);
      setPlayingVoiceId(null);
    }
  };

  // 추천값 복원
  const handleResetToRecommended = () => {
    onUpdateSettings({
      captionStyle: 'bold-yellow',
      captionFont: 'jua',
      captionPosition: 'bottom',
      targetDurationSec: 50,
      gainBoostDb: 8,
      zoomPopIntensity: 'punch',
      audioLimiter: true,
      parallelism: 2,
      qualityThresholdScore: 85,
      voiceEnabled: true,
      voiceName: 'F1',
      voiceSpeed: 1.05,
      voicePitch: 0,
      voiceHookOnly: true,
      autoRender: true,
      outputFormat: 'mp4-capcut',
      exportDirectory: '05_Exports'
    });
  };

  const selectedVoiceObj = useMemo(() => {
    return VIRALOOP_MEOKGURI_VOICES.find(v => v.id === settings.voiceName) || VIRALOOP_MEOKGURI_VOICES[0];
  }, [settings.voiceName]);

  return (
    <div className="space-y-5" data-pixi-meokguri-settings-workspace>
      {/* 상단: Control Room 제작 설정 요약 카드 */}
      <section
        data-pixi-meokguri-settings-summary
        className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Control Room · 제작 설정 요약</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToRecommended}
              data-pixi-meokguri-reset-options
              className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>추천값 복원</span>
            </Button>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              {settings.autoRender ? '원클릭 일괄 완성' : '전문가 분석 모드'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-3 text-xs">
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50">
            <span className="text-[10px] text-muted-foreground block">자막 스타일</span>
            <span className="font-bold text-foreground truncate block">
              {settings.captionStyle === 'bold-yellow' ? '침샘 옐로우' : settings.captionStyle} · {settings.captionFont.toUpperCase()}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50">
            <span className="text-[10px] text-muted-foreground block">ASMR 오디오 게인</span>
            <span className="font-bold text-primary font-mono block">
              +{settings.gainBoostDb} dB · {settings.zoomPopIntensity.toUpperCase()}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50">
            <span className="text-[10px] text-muted-foreground block">ViraLoop 음성 합성</span>
            <span className="font-bold text-foreground truncate block">
              {selectedVoiceObj.name} (x{settings.voiceSpeed.toFixed(2)})
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50">
            <span className="text-[10px] text-muted-foreground block">출력 형식</span>
            <span className="font-bold text-foreground block">
              {settings.outputFormat === 'mp4-capcut' ? 'MP4 + CapCut 초안' : 'MP4 전용'}
            </span>
          </div>
        </div>
      </section>

      {/* 중앙 2열 레이아웃: 좌측 설정 워크스페이스 (4대 탭) / 우측 자막 타이밍 에디터 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 4대 탭 워크스페이스 (5칸) */}
        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-4">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid grid-cols-4 h-9 p-1 bg-muted/40">
              <TabsTrigger value="style" className="text-xs">스타일</TabsTrigger>
              <TabsTrigger value="edit" className="text-xs">편집</TabsTrigger>
              <TabsTrigger value="voice" className="text-xs">음성 ({VIRALOOP_MEOKGURI_VOICES.length})</TabsTrigger>
              <TabsTrigger value="output" className="text-xs">출력</TabsTrigger>
            </TabsList>

            {/* 스타일 탭 */}
            <TabsContent value="style" className="space-y-4 pt-3 text-xs">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground block">자막 프리셋</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'bold-yellow', label: '침샘 옐로우', desc: '노란 볼드 + 블랙 외곽선' },
                    { id: 'classic-white', label: '골든 클래식', desc: '화이트 + 옐로우 훅' },
                    { id: 'orange-contrast', label: '오렌지 펀치', desc: '선명한 주황 대비' },
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => updateSetting('captionStyle', c.id as any)}
                      className={cn(
                        "p-2 rounded-lg border text-center transition cursor-pointer",
                        settings.captionStyle === c.id
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "border-border hover:bg-muted/40 text-foreground"
                      )}
                    >
                      <div className="text-xs">{c.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-[11px] font-bold text-muted-foreground block">자막 폰트</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'jua', label: 'BM Jua (주아체)' },
                    { id: 'pretendard', label: 'Pretendard' },
                    { id: 'gmarket', label: 'Gmarket Sans' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateSetting('captionFont', f.id as any)}
                      className={cn(
                        "p-2 rounded-lg border text-center transition cursor-pointer",
                        settings.captionFont === f.id
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "border-border hover:bg-muted/40 text-foreground"
                      )}
                    >
                      <div className="text-xs">{f.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 편집 탭 */}
            <TabsContent value="edit" className="space-y-4 pt-3 text-xs">
              {/* ASMR 게인 증폭 슬라이더 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                    ASMR 씹는 소리 게인 증폭:
                  </span>
                  <span className="font-mono text-primary font-bold">+{settings.gainBoostDb} dB</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={settings.gainBoostDb}
                  onChange={e => updateSetting('gainBoostDb', Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>+3dB (자연스러움)</span>
                  <span>+8dB (추천)</span>
                  <span>+12dB (극대화)</span>
                </div>
              </div>

              {/* 줌 팝 강도 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  먹구리 줌 팝 (Zoom-Pop) 리액션 강도
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'mild', label: '미세 줌 (1.1x)' },
                    { id: 'punch', label: '타격 줌 (1.25x)' },
                    { id: 'bounce', label: '바운스 (1.4x)' },
                  ].map(z => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => updateSetting('zoomPopIntensity', z.id as any)}
                      className={cn(
                        "p-2 rounded-lg border text-center transition cursor-pointer font-bold",
                        settings.zoomPopIntensity === z.id
                          ? "bg-primary/10 border-primary text-primary shadow-xs"
                          : "border-border hover:bg-muted/40 text-foreground"
                      )}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 효과음 시퀀서 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-[11px] font-bold text-muted-foreground block">자동 효과음(SFX) 시퀀서</label>
                <div className="grid grid-cols-2 gap-2">
                  {sfxList.map(sfx => (
                    <div
                      key={sfx.id}
                      onClick={() => toggleSfx(sfx.id)}
                      className={cn(
                        "p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between",
                        sfx.enabled
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "bg-muted/10 border-border text-foreground hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-xs truncate">
                        <span>{sfx.icon}</span>
                        <span className="truncate">{sfx.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={sfx.enabled}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 병렬 처리 슬라이더 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">동시 병렬 처리:</span>
                  <span className="font-mono text-primary font-bold">{settings.parallelism}개</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={settings.parallelism}
                  onChange={e => updateSetting('parallelism', Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </TabsContent>

            {/* 음성 탭: ViraLoop 16종 전역 음성 매트릭스 */}
            <TabsContent value="voice" className="space-y-3.5 pt-2 text-xs">
              {/* 카테고리 필터 탭 */}
              <div className="flex flex-wrap gap-1 border-b border-border/60 pb-2">
                {[
                  { id: 'all', label: '전체' },
                  { id: 'recommended', label: '🎙️ 추천' },
                  { id: 'male', label: '👔 남성' },
                  { id: 'female', label: '👗 여성' },
                  { id: 'meme', label: '🤣 밈/타캐' },
                  { id: 'dialect', label: '👵 사투리' },
                  { id: 'global', label: '🌐 글로벌' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setVoiceCategory(cat.id)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer",
                      voiceCategory === cat.id
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* 검색창 */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={voiceSearch}
                  onChange={e => setVoiceSearch(e.target.value)}
                  placeholder="보이스 이름, 태그, 설명 검색..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* 보이스 리스트 그리드 */}
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {filteredVoices.map(v => {
                  const isSelected = settings.voiceName === v.id;
                  const isPlaying = playingVoiceId === v.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => updateSetting('voiceName', v.id)}
                      className={cn(
                        "p-2 rounded-xl border transition cursor-pointer flex items-center justify-between",
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "border-border/70 hover:bg-muted/40 text-foreground"
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{v.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
                            {v.tag}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate font-normal mt-0.5">
                          {v.desc}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handlePreviewVoice(v.id, e)}
                        className={cn(
                          "p-1.5 rounded-lg border text-xs transition shrink-0 ml-1 cursor-pointer",
                          isPlaying
                            ? "bg-primary text-primary-foreground border-primary animate-pulse"
                            : "bg-background border-border hover:bg-muted text-foreground"
                        )}
                        title={isPlaying ? "정지" : "미리듣기"}
                      >
                        {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 음성 속도 슬라이더 */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">음성 속도:</span>
                  <span className="font-mono text-primary font-bold">x{settings.voiceSpeed.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.50"
                  step="0.05"
                  value={settings.voiceSpeed}
                  onChange={e => updateSetting('voiceSpeed', Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border">
                <div>
                  <div className="font-bold text-foreground text-xs">도입부 훅만 음성 재생</div>
                  <div className="text-[10px] text-muted-foreground">0~3초 훅만 TTS로 시선을 끌고 본편은 원본 오디오 유지</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.voiceHookOnly}
                  onChange={e => updateSetting('voiceHookOnly', e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </TabsContent>

            {/* 출력 탭 */}
            <TabsContent value="output" className="space-y-4 pt-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/[0.04] border border-primary/20">
                <div>
                  <div className="font-bold text-foreground">한 번에 완성 (원클릭 자동 렌더링)</div>
                  <div className="text-[10px] text-muted-foreground">대본 생성부터 MP4 인코딩까지 한 번에 실행</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoRender}
                  onChange={e => updateSetting('autoRender', e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground block">출력 형식</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSetting('outputFormat', 'mp4-capcut')}
                    className={cn(
                      "p-3 rounded-xl border text-left transition cursor-pointer",
                      settings.outputFormat === 'mp4-capcut'
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="text-xs font-bold">MP4 + CapCut 초안</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">최종 영상과 편집 가능한 캡컷 프로젝트</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('outputFormat', 'mp4-only')}
                    className={cn(
                      "p-3 rounded-xl border text-left transition cursor-pointer",
                      settings.outputFormat === 'mp4-only'
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="text-xs font-bold">MP4 비디오 전용</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">완성된 영상만 빠르게 렌더링</div>
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 우측 자막 타이밍 실시간 에디터 (7칸) */}
        <div className="lg:col-span-7">
          <MeokguriCaptionTimingEditor
            script={script}
            onUpdateScript={onUpdateScript}
            isAnalyzingBg={isAnalyzingBg}
          />
        </div>
      </div>

      {/* 하단 네비게이션 액션 바 */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBackToSource}
          className="h-11 px-4 text-xs gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>이전 (소재 선택)</span>
        </Button>

        <Button
          type="button"
          disabled={isRendering}
          onClick={onStartRender}
          className="h-11 px-8 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg cursor-pointer transition-transform active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isRendering ? '먹구리형 쇼츠 렌더링 중...' : '🍗 먹구리형 쇼츠 생성 및 렌더링 시작'}</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
