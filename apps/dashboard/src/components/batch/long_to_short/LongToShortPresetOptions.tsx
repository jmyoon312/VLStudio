import React, { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  Clock,
  VolumeX,
  Languages,
  MessageSquare,
  AlertCircle,
  Mic,
  Volume2,
  Square,
  Play,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import {
  LengthPreset,
  LENGTH_PRESETS,
  ExtractionSettings,
  VideoProbeResult
} from '@/types/longToShort';

interface LongToShortPresetOptionsProps {
  settings: ExtractionSettings;
  onChange: (newSettings: ExtractionSettings) => void;
  probeData: VideoProbeResult | null;
  onRequestOverlapConsent?: () => void;
  disabled?: boolean;
}

const MULTI_LANG_OPTIONS = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: '영어 (US)' },
  { id: 'ja', label: '일본어' },
  { id: 'es', label: '스페인어' },
  { id: 'de', label: '독일어' }
];

const TTS_ENGINES = [
  { id: 'supertone-local', label: 'Supertonic (로컬 무제한)', badge: '권장' },
  { id: 'typecast', label: 'Typecast (감정 연기)' },
  { id: 'elevenlabs', label: 'ElevenLabs AI' },
  { id: 'kokoro', label: 'Kokoro 뉴럴' }
];

// 친화적 음성 이름 매핑
const FRIENDLY_VOICE_NAMES: Record<string, string> = {
  'F1': '서연 (한국어 여성 표준 / 또렷함)',
  'F2': '지우 (한국어 여성 청년 / 밝고 경쾌함)',
  'F3': '수진 (한국어 여성 차분 / 다큐 톤)',
  'F4': '은영 (한국어 여성 중년 / 다정함)',
  'M1': '민준 (한국어 남성 표준 / 속보·풍자)',
  'M2': '도현 (한국어 남성 중저음 / 신뢰감)',
  'M3': '준서 (한국어 남성 청년 / 활기참)',
  'M4': '영호 (한국어 남성 중후 / 깊은 톤)',
  'ko_female_1': '코코로 여성 (부드러운 내레이션)',
  'ko_male_1': '코코로 남성 (차분한 내레이션)'
};

export const LongToShortPresetOptions: React.FC<LongToShortPresetOptionsProps> = ({
  settings,
  onChange,
  probeData,
  onRequestOverlapConsent,
  disabled
}) => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  const maxSafeCandidates = probeData ? probeData.max_candidates : 10;
  const recommendedCandidates = probeData ? probeData.recommended_candidates : 3;
  const isOverMax = settings.candidate_count > maxSafeCandidates;

  // TTS 음성 목록 실시간 조회
  const loadVoices = async (engine: string) => {
    setIsLoadingVoices(true);
    try {
      const res = await api.get(`/tools/tts/voices?engine=${engine}&language=ko`);
      const voices: Array<{ id: string; name: string }> = res.data || [];
      setAvailableVoices(voices);

      // 현재 voice_id가 없거나 해당 엔진 목록에 없으면 첫 번째 음성 자동 선택
      if (voices.length > 0) {
        const found = voices.some(v => v.id === settings.tts_voice_id);
        if (!found) {
          onChange({
            ...settings,
            tts_engine: engine,
            tts_voice_id: voices[0].id
          });
        }
      }
    } catch (err: any) {
      console.warn('TTS 음성 목록 조회 실패:', err);
      // 오프라인 fallback
      setAvailableVoices([
        { id: 'F1', name: '서연 (한국어 여성 표준)' },
        { id: 'M1', name: '민준 (한국어 남성 표준)' }
      ]);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  useEffect(() => {
    loadVoices(settings.tts_engine || 'supertone-local');
  }, [settings.tts_engine]);

  // 컴포넌트 언마운트 시 오디오 정지
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 목소리 미리듣기 재생
  const handlePreviewVoice = async () => {
    if (isPlayingPreview && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingPreview(false);
      return;
    }

    if (!settings.tts_voice_id) {
      toast({ variant: 'destructive', title: '음성 선택 필요', description: '미리듣기를 실행할 목소리를 선택하세요.' });
      return;
    }

    setIsPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append('text', '안녕하세요! 킬러 쇼츠 하이라이트를 위한 바이럴루프 목소리 샘플입니다.');
      formData.append('engine', settings.tts_engine || 'supertone-local');
      formData.append('language', 'ko');
      formData.append('voice_id', settings.tts_voice_id);
      formData.append('rate', String(Math.round(((settings.tts_speed || 1.0) - 1.0) * 100)));
      formData.append('pitch', '0');

      const res = await api.post('/tools/tts/generate', formData);
      const audioUrl = res.data?.web_url || res.data?.url;

      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${window.location.origin}${audioUrl}`;
        const audio = new Audio(fullUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingPreview(false);
        audio.onerror = () => {
          setIsPlayingPreview(false);
          toast({ variant: 'destructive', title: '재생 오류', description: '오디오 스트림을 재생할 수 없습니다.' });
        };
        await audio.play();
        setIsPlayingPreview(true);
      } else {
        toast({ variant: 'destructive', title: '미리듣기 생성 실패', description: '오디오 URL을 수신하지 못했습니다.' });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '목소리 생성 실패',
        description: err.response?.data?.detail || err.message || '미리듣기 생성 중 오류가 발생했습니다.'
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handlePresetSelect = (preset: LengthPreset) => {
    const pObj = LENGTH_PRESETS.find(p => p.id === preset);
    onChange({
      ...settings,
      length_preset: preset,
      target_duration_sec: pObj?.defaultSec
    });
  };

  const handleCandidateCountChange = (val: number) => {
    if (val > maxSafeCandidates && !settings.allow_overlap && onRequestOverlapConsent) {
      onRequestOverlapConsent();
    }
    onChange({
      ...settings,
      candidate_count: val
    });
  };

  const toggleMultiLang = (langId: string) => {
    const exists = settings.multi_use_langs.includes(langId);
    let updated = exists
      ? settings.multi_use_langs.filter(id => id !== langId)
      : [...settings.multi_use_langs, langId];
    if (updated.length === 0) updated = ['ko'];
    onChange({ ...settings, multi_use_langs: updated });
  };

  return (
    <div className="space-y-4">
      {/* 1. 픽셀링 4대 쇼츠 길이 프리셋 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>목표 쇼츠 길이 프리셋</span>
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {LENGTH_PRESETS.find(p => p.id === settings.length_preset)?.rangeSec}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {LENGTH_PRESETS.map(preset => {
            const isSelected = settings.length_preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => handlePresetSelect(preset.id)}
                className={cn(
                  "p-2 rounded-xl border text-left transition cursor-pointer space-y-0.5",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary shadow-2xs"
                    : "border-border hover:bg-muted/40 text-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{preset.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1 py-0 font-mono font-bold",
                      isSelected
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "text-muted-foreground border-border"
                    )}
                  >
                    {preset.badge}
                  </Badge>
                </div>
                <p className="text-[9px] text-muted-foreground line-clamp-1">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 스마트 후보 개수 설정 슬라이더 */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>추출할 킬러 하이라이트 개수</span>
          </label>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[10px] text-muted-foreground">권장: {recommendedCandidates}개</span>
            <span className="text-xs font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10">
              {settings.candidate_count}개
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <input
            type="range"
            min="1"
            max={Math.max(10, maxSafeCandidates + 5)}
            step="1"
            value={settings.candidate_count}
            onChange={e => handleCandidateCountChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
            <span>1개 (단일 핵심)</span>
            <span>중복 없이 최대 {maxSafeCandidates}개</span>
            <span>최대 15개</span>
          </div>
        </div>

        {/* 중복 경고 및 안내 */}
        {isOverMax && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] space-y-1">
            <div className="flex items-center gap-1 font-bold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>영상 길이 대비 후보 수가 많습니다</span>
            </div>
            <p className="leading-tight text-[9px]">
              이 영상 길이에선 중복 없이 최대 {maxSafeCandidates}개까지 가능합니다. 현재 중복 허용 모드로 {settings.candidate_count}개를 최대한 채웁니다.
            </p>
          </div>
        )}
      </div>

      {/* 3. AI 내레이션 & TTS 더빙 엔진 및 목소리 선택 (전체 음성 지원) */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-primary" />
            <span>AI 내레이션 & TTS 더빙 목소리</span>
          </label>
          <Badge variant="outline" className="text-[9px] px-1 py-0 text-primary border-primary/30">
            CapCut 더빙 자동 연결
          </Badge>
        </div>

        {/* TTS 엔진 선택 버튼군 */}
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          {TTS_ENGINES.map(eng => {
            const isEngSelected = (settings.tts_engine || 'supertone-local') === eng.id;
            return (
              <button
                key={eng.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange({ ...settings, tts_engine: eng.id });
                }}
                className={cn(
                  "p-1.5 rounded-lg border text-left transition cursor-pointer font-bold truncate flex items-center justify-between",
                  isEngSelected
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border/80 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <span>{eng.label}</span>
                {eng.badge && (
                  <span className="text-[8px] px-1 rounded bg-primary/20 text-primary">{eng.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 목소리 드롭다운 및 미리듣기 버튼 */}
        <div className="flex gap-1.5 items-center">
          <select
            value={settings.tts_voice_id || ''}
            onChange={e => onChange({ ...settings, tts_voice_id: e.target.value })}
            disabled={disabled || isLoadingVoices}
            className="flex-1 h-8 text-xs p-1.5 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer truncate"
          >
            {isLoadingVoices ? (
              <option value="">음성 목록 로딩 중...</option>
            ) : availableVoices.length > 0 ? (
              availableVoices.map(v => (
                <option key={v.id} value={v.id}>
                  {FRIENDLY_VOICE_NAMES[v.id] || v.name || v.id}
                </option>
              ))
            ) : (
              <option value="F1">서연 (한국어 여성 표준)</option>
            )}
          </select>

          {/* 미리듣기 버튼 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewVoice}
            disabled={disabled || isPreviewLoading}
            className="h-8 px-2.5 text-xs font-bold gap-1 shrink-0 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            {isPreviewLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPlayingPreview ? (
              <Square className="w-3.5 h-3.5 fill-primary" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isPlayingPreview ? '정지' : '미리듣기'}</span>
          </Button>
        </div>

        {/* TTS 재생 속도 슬라이더 */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
          <span>발화 속도: <strong className="text-primary font-mono">{settings.tts_speed || 1.0}x</strong></span>
          <div className="flex gap-1">
            {[0.9, 1.0, 1.15, 1.3].map(sp => (
              <button
                key={sp}
                type="button"
                onClick={() => onChange({ ...settings, tts_speed: sp })}
                disabled={disabled}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border cursor-pointer",
                  (settings.tts_speed || 1.0) === sp
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. 무음 구간 자동 압축 및 분할 */}
      <div className="space-y-2 pt-2 border-t border-border text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <VolumeX className="w-3.5 h-3.5 text-primary" />
            <span>무음 구간 자동 압축 분할</span>
          </span>
          <input
            type="checkbox"
            checked={settings.silence_removal}
            onChange={e => onChange({ ...settings, silence_removal: e.target.checked })}
            disabled={disabled}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
        </div>

        {settings.silence_removal && (
          <div className="space-y-1 pl-5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>무음 판정 임계치:</span>
              <span className="font-mono text-primary font-bold">{settings.silence_threshold_sec}초 이상</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.1"
              value={settings.silence_threshold_sec}
              onChange={e => onChange({ ...settings, silence_threshold_sec: Number(e.target.value) })}
              disabled={disabled}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 5. AI 포커스 지시어 (Directives) */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>AI 추출 집중 지시어 (선택)</span>
        </label>
        <input
          type="text"
          value={settings.directives}
          onChange={e => onChange({ ...settings, directives: e.target.value })}
          placeholder="예: 주인공의 충격적인 반전 고백, 투자 팁 핵심 구간 등"
          disabled={disabled}
          className="w-full text-xs p-2 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        <span className="text-[9px] text-muted-foreground block">
          * 특정 인물, 감정선, 핵심 키워드를 입력하면 해당 구간의 VMI 점수에 가중치가 부여됩니다.
        </span>
      </div>

      {/* 6. 다국어 멀티유즈 타겟 언어 */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-primary" />
            <span>글로벌 멀티유즈 자동 번역</span>
          </label>
          <span className="text-[10px] text-muted-foreground">
            {settings.multi_use_langs.length}개 선택
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {MULTI_LANG_OPTIONS.map(opt => {
            const isChecked = settings.multi_use_langs.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleMultiLang(opt.id)}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer border",
                  isChecked
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
