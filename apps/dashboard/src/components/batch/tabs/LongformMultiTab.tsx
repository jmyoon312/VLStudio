import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  Upload,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Film,
  CheckCircle2,
  Zap,
  FolderOpen,
  Share2,
  Cpu,
  FileText,
  Play,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  AlertCircle,
  Hash,
  Tv,
  Users,
  Image as ImageIcon,
  Palette,
  Monitor,
  Smartphone,
  Save,
  RotateCcw,
  XCircle,
  Timer,
  Mic,
  Volume2,
  Square,
  Wand2,
  AudioLines,
  Link,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { api, apiLong } from '@/lib/api';

const STORAGE_KEY_DRAFT = 'vlstudio_longform_multi_draft_v3';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CharacterAnchor {
  id: string;
  name: string;
  role: string;
  visual_prompt: string;
}

export interface ThumbnailPlan {
  headline_copy: string;
  sub_copy: string;
  visual_concept: string;
}

export interface ClipData {
  clip_id: number;
  source_start: number;
  source_end: number;
  duration: number;
  narration: string;
  visual_prompt?: string;
  speaker_a_dialogue?: string;
  speaker_b_dialogue?: string;
  jab_sticker: string;
  sfx_recommend: string;
}

export interface EpisodeData {
  id: number;
  title: string;
  top_hook: string;
  total_duration_sec: number;
  archetype?: 'classic' | 'ssul' | 'gunlimbo' | 'instagram';
  archetype_name?: string;
  clips: ClipData[];
}

export interface TTSVoice {
  id: string;
  name: string;
  lang?: string;
  gender?: string;
}

interface LongformMultiTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

// ============================================================================
// Sample Scripts
// ============================================================================

const SAMPLE_LONGFORM_SCRIPTS: { title: string; text: string }[] = [
  {
    title: 'AI 대전환 시대, 살아남는 1%의 비결',
    text: `최근 인공지능 기술의 발전 속도는 인류 역사상 그 어떤 산업혁명보다도 빠르고 파괴적입니다.
지금까지 우리가 알고 있던 전문직의 영역, 즉 변호사, 회계사, 프로그래머조차도 AI 에이전트의 등장으로 완전히 재편되고 있습니다.
많은 사람들이 "내 일자리가 사라지지 않을까?"라는 두려움에 사로잡혀 있지만, 역사는 항상 기술을 두려워하는 자가 아니라 도구로 장악하는 자의 손을 들어주었습니다.
첫 번째 핵심은 '메타인지'입니다. AI가 생성해 낸 방대한 결과물 중에서 무엇이 진짜 가치 있고 진실인지를 판별할 수 있는 비판적 사고 능력이 최우선입니다.
두 번째는 '오케스트레이션 능력'입니다. 혼자서 일하는 시대는 끝났습니다. 수십 개의 특화된 AI 에이전트를 조율하여 한 명의 기획자가 방송국 전체의 생산성을 내는 1인 주권 팩토리가 현실이 되었습니다.
결국 미래는 AI를 다루지 못하는 99%와, AI의 총사령탑이 되어 압도적인 속도로 세상을 바꾸는 1%의 격차로 나뉠 것입니다. 여러분은 지금 어느 쪽에 서 계십니까?`
  },
  {
    title: '미제 종결 실화: 10억 보험금의 비밀',
    text: `2018년 한적한 시골 국도에서 의문의 차량 전복 사고가 발생했습니다.
차량은 전소되었고 운전자는 가까스로 탈출했지만, 조수석에 타고 있던 동승자는 현장에서 숨진 채 발견되었습니다.
단순 교통사고로 종결될 뻔했던 이 사건은, 사망자가 사고 불과 2주 전 무려 10억 원에 달하는 다수의 사망 보험에 가입했다는 사실이 밝혀지면서 급반전되었습니다.
경찰 수사 결과, 운전자와 피해자는 겉으로는 절친한 사업 파트너였지만 실제로는 수억 원의 채무 관계로 얽혀 있었습니다.
국과수 정밀 감식 결과 차량의 브레이크 호스가 인위적으로 절단된 흔적이 발견되었고, 운전자의 스마트폰에서는 '차량 화재 원인', '보험금 수령 절차'를 검색한 기록이 쏟아져 나왔습니다.
완전범죄를 꿈꿨던 가해자의 치밀한 시나리오는 결국 과학 수사의 그물망을 벗어나지 못하고 법의 준엄한 심판을 받게 되었습니다.`
  }
];

const roundTo1 = (num: number) => Math.round(num * 10) / 10;

// ============================================================================
// Normalize raw API episodes (scenes→clips, missing fields fallback)
// ============================================================================

function normalizeEpisodes(raw: any[]): EpisodeData[] {
  const jabPool = ['(동공지진)', '(소름돋음)', '(반전주의)', '(팩트폭격)', '(극대노)', '(대박사건)', '(어이탈출)'];
  const sfxPool = ['whoosh', 'boom', 'ding', 'slap', 'record_scratch'];

  return raw
    .filter(ep => typeof ep === 'object' && ep !== null)
    .map((ep, epIdx) => {
      const clipsRaw: any[] = (
        ep.clips || ep.scenes || ep.segments || ep.shots || []
      );

      const normalizedClips: ClipData[] = clipsRaw.length > 0
        ? clipsRaw
            .filter(c => typeof c === 'object' && c !== null)
            .map((c, cIdx) => {
              const duration = parseFloat(c.duration || c.durationSec || 14.5);
              const sourceStart = parseFloat(c.source_start || c.start || c.startSec || (cIdx * duration));
              return {
                clip_id: c.clip_id || c.id || (cIdx + 1),
                source_start: roundTo1(sourceStart),
                source_end: roundTo1(parseFloat(c.source_end || c.end || c.endSec || (sourceStart + duration))),
                duration: roundTo1(duration),
                narration: c.narration || c.text || c.content || c.dialogue || c.script || `씬 ${cIdx + 1}`,
                visual_prompt: c.visual_prompt || c.videoPrompt || c.fullPromptKo || c.description || '',
                speaker_a_dialogue: c.speaker_a_dialogue || c.speakerA || c.dialogueA || '',
                speaker_b_dialogue: c.speaker_b_dialogue || c.speakerB || c.dialogueB || '',
                jab_sticker: c.jab_sticker || c.jabSticker || c.hookJabText || jabPool[(epIdx + cIdx) % jabPool.length],
                sfx_recommend: c.sfx_recommend || c.sfxRecommend || c.sfx || sfxPool[(epIdx + cIdx) % sfxPool.length],
              };
            })
        : [{
            clip_id: 1,
            source_start: 0,
            source_end: 14.5,
            duration: 14.5,
            narration: ep.top_hook || ep.title || `에피소드 ${epIdx + 1} 핵심 요약`,
            visual_prompt: '',
            speaker_a_dialogue: '',
            speaker_b_dialogue: '',
            jab_sticker: jabPool[epIdx % jabPool.length],
            sfx_recommend: sfxPool[epIdx % sfxPool.length],
          }];

      const topHook = ep.top_hook || ep.topHook || ep.hook || ep.title || `에피소드 ${epIdx + 1}`;
      return {
        id: ep.id || (epIdx + 1),
        title: ep.title || ep.episode_title || topHook,
        top_hook: topHook,
        total_duration_sec: parseFloat(ep.total_duration_sec || ep.durationSec || ep.duration || normalizedClips.reduce((s, c) => s + c.duration, 0) || 58),
        archetype: ep.archetype || 'classic',
        archetype_name: ep.archetype_name || '골든 클래식',
        clips: normalizedClips,
      } as EpisodeData;
    });
}

// ============================================================================
// Main Component
// ============================================================================

export const LongformMultiTab: React.FC<LongformMultiTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  // 소스 인입 모드
  const [sourceMode, setSourceMode] = useState<'video' | 'script'>('script');

  // 영상 모드 상태
  const [longformTitle, setLongformTitle] = useState<string>('AI 대전환 시대의 생존 전략 특강');
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>('');
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileSizeMB, setVideoFileSizeMB] = useState<number>(0);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  // 대본 모드 상태
  const [scriptContent, setScriptContent] = useState<string>(SAMPLE_LONGFORM_SCRIPTS[0].text);

  // 분할 전략
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [targetShortsCount, setTargetShortsCount] = useState<number>(3);
  const [segmentationMode, setSegmentationMode] = useState<'topic' | 'speaker' | 'retention'>('topic');
  const [autoArchetypeDistribution, setAutoArchetypeDistribution] = useState<boolean>(true);
  const [presetId, setPresetId] = useState<string>('gutavari');
  const [enableDiarization, setEnableDiarization] = useState<boolean>(false);

  // TTS 설정
  const [ttsEngine, setTtsEngine] = useState<string>('supertone-local');
  const [ttsLang, setTtsLang] = useState<string>('ko');
  const [ttsVoiceId, setTtsVoiceId] = useState<string>('F1');
  const [ttsVoices, setTtsVoices] = useState<TTSVoice[]>([]);
  const [ttsVoicesLoading, setTtsVoicesLoading] = useState<boolean>(false);
  const [ttsPreviewLoading, setTtsPreviewLoading] = useState<boolean>(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // 분석 진행 상태
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isExportingCapCut, setIsExportingCapCut] = useState<boolean>(false);
  const [optimizingEpId, setOptimizingEpId] = useState<number | null>(null);

  // AbortController & Timer
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // 분석 결과
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [characterAnchors, setCharacterAnchors] = useState<CharacterAnchor[]>([]);
  const [thumbnailPlan, setThumbnailPlan] = useState<ThumbnailPlan | null>(null);

  // 인스펙터 탭
  const [activeInspectorTab, setActiveInspectorTab] = useState<'episodes' | 'characters' | 'thumbnail'>('episodes');
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<number | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);

  // ============================================================================
  // Durable State: 로컬스토리지 영구 자동 저장/복원
  // ============================================================================
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.longformTitle) setLongformTitle(p.longformTitle);
        if (p.scriptContent) setScriptContent(p.scriptContent);
        if (p.sourceMode) setSourceMode(p.sourceMode);
        if (p.aspectRatio) setAspectRatio(p.aspectRatio);
        if (p.targetShortsCount) setTargetShortsCount(p.targetShortsCount);
        if (p.segmentationMode) setSegmentationMode(p.segmentationMode);
        if (p.ttsEngine && p.ttsEngine !== 'edge' && p.ttsEngine !== 'google') setTtsEngine(p.ttsEngine);
        else setTtsEngine('supertone-local');
        if (p.ttsLang) setTtsLang(p.ttsLang);
        if (p.ttsVoiceId && !p.ttsVoiceId.includes('Neural')) setTtsVoiceId(p.ttsVoiceId);
        else setTtsVoiceId('F1');
        if (p.episodes?.length > 0) {
          setEpisodes(p.episodes);
          setExpandedEpisodeId(p.episodes[0].id);
        }
        if (p.characterAnchors?.length > 0) setCharacterAnchors(p.characterAnchors);
        if (p.thumbnailPlan) setThumbnailPlan(p.thumbnailPlan);
        setHasRestoredDraft(true);
      }
    } catch (e) {
      console.warn('Failed to restore longform draft:', e);
    }
    setIsAnalyzing(false); // 무한 로딩 방어
  }, []);

  useEffect(() => {
    try {
      const payload = {
        longformTitle, scriptContent, sourceMode, aspectRatio, targetShortsCount,
        segmentationMode, presetId, ttsEngine, ttsLang, ttsVoiceId,
        episodes, characterAnchors, thumbnailPlan, updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save longform draft:', e);
    }
  }, [longformTitle, scriptContent, sourceMode, aspectRatio, targetShortsCount,
      segmentationMode, presetId, ttsEngine, ttsLang, ttsVoiceId,
      episodes, characterAnchors, thumbnailPlan]);

  // 타이머
  useEffect(() => {
    if (isAnalyzing) {
      setElapsedSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isAnalyzing]);

  // ============================================================================
  // TTS 음성 목록 동적 로드
  // ============================================================================
  useEffect(() => {
    if (!ttsEngine) return;
    setTtsVoicesLoading(true);
    api.get(`/tools/tts/voices?engine=${ttsEngine}&language=${ttsLang}`)
      .then(res => {
        const voices: TTSVoice[] = Array.isArray(res.data) ? res.data : [];
        setTtsVoices(voices);
        if (voices.length > 0) {
          const exists = voices.find(v => v.id === ttsVoiceId);
          if (!exists) setTtsVoiceId(voices[0].id);
        }
      })
      .catch(err => {
        console.warn('Failed to load TTS voices:', err);
        setTtsVoices([]);
      })
      .finally(() => setTtsVoicesLoading(false));
  }, [ttsEngine, ttsLang]);

  // TTS 음성 미리듣기
  const handleTtsPreview = async () => {
    if (ttsPreviewLoading) return;
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    const sampleText = episodes[0]?.clips[0]?.narration || '안녕하세요! 선택하신 목소리 샘플입니다. 자연스럽게 들리시나요?';
    try {
      setTtsPreviewLoading(true);
      const formData = new FormData();
      formData.append('text', sampleText.slice(0, 80));
      formData.append('engine', ttsEngine);
      formData.append('language', ttsLang);
      formData.append('voice_id', ttsVoiceId);
      formData.append('rate', '0');
      formData.append('pitch', '0');
      const res = await api.post('/tools/tts/generate', formData);
      const audioUrl = res.data?.web_url || res.data?.url;
      if (audioUrl) {
        const cleanUrl = audioUrl.startsWith('http') ? audioUrl : `${window.location.origin}${audioUrl}`;
        const audio = new Audio(cleanUrl);
        ttsAudioRef.current = audio;
        audio.onended = () => setTtsPreviewLoading(false);
        audio.onerror = () => { setTtsPreviewLoading(false); toast({ variant: 'destructive', title: '미리듣기 실패', description: '오디오 재생에 실패했습니다.' }); };
        await audio.play();
      } else {
        toast({ variant: 'destructive', title: '미리듣기 실패', description: '오디오 URL을 수신하지 못했습니다.' });
        setTtsPreviewLoading(false);
      }
    } catch (e: any) {
      console.error('TTS preview failed:', e);
      toast({ variant: 'destructive', title: 'TTS 미리듣기 오류', description: e.response?.data?.detail || e.message });
      setTtsPreviewLoading(false);
    }
  };

  // ============================================================================
  // Drag & Drop 완전 구현
  // ============================================================================
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving the drop zone (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|m4v|ts|flv)$/i.test(file.name)) {
        processVideoFile(file);
      } else {
        toast({ variant: 'destructive', title: '지원하지 않는 파일 형식', description: 'MP4, MKV, MOV, AVI 등 영상 파일만 드롭할 수 있습니다.' });
      }
    }
  }, []);

  const processVideoFile = (file: File) => {
    setVideoFile(file);
    setVideoFileName(file.name);
    setVideoFileSizeMB(Math.round(file.size / 1024 / 1024 * 10) / 10);
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setLongformTitle(nameWithoutExt);
    toast({
      title: '🎬 영상 파일 등록 완료',
      description: `'${file.name}' (${Math.round(file.size / 1024 / 1024 * 10) / 10}MB)가 등록되었습니다.`
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processVideoFile(file);
    e.target.value = '';
  };

  const handleUrlPaste = (url: string) => {
    setVideoSourceUrl(url);
    // YouTube title extraction attempt
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
      setVideoFileName(`YouTube: ${ytMatch[1]}`);
      if (!longformTitle || longformTitle === 'AI 대전환 시대의 생존 전략 특강') {
        setLongformTitle(`YouTube 롱폼 분석 - ${ytMatch[1]}`);
      }
    }
  };

  // ============================================================================
  // 발음 최적화 (TTS Pronunciation Optimizer)
  // ============================================================================
  const handleOptimizePronunciation = async (epId: number) => {
    const ep = episodes.find(e => e.id === epId);
    if (!ep) return;
    const allNarrations = ep.clips.map(c => c.narration).join('\n');
    if (!allNarrations.trim()) {
      toast({ variant: 'destructive', title: '최적화할 나레이션 없음', description: '클립 나레이션을 먼저 입력해 주세요.' });
      return;
    }
    setOptimizingEpId(epId);
    try {
      const res = await api.post('/universal-cutter/optimize-pronunciation', {
        text: allNarrations,
        language: ttsLang || 'ko'
      });
      if (res.data?.success && res.data?.data?.optimized) {
        const optimizedLines = res.data.data.optimized.split('\n');
        const diffs = res.data.data.diffs || [];
        setEpisodes(prev => prev.map(e => {
          if (e.id !== epId) return e;
          return {
            ...e,
            clips: e.clips.map((c, idx) => ({
              ...c,
              narration: optimizedLines[idx] || c.narration
            }))
          };
        }));
        const diffCount = diffs.length;
        toast({
          title: `🎙️ 발음 최적화 완료 (${diffCount}건 교정)`,
          description: diffCount > 0 ? `예: ${diffs[0]?.original_word} → ${diffs[0]?.replaced_word}` : '이미 TTS에 최적화된 대본입니다.'
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: '발음 최적화 실패', description: e.response?.data?.detail || e.message });
    } finally {
      setOptimizingEpId(null);
    }
  };

  // ============================================================================
  // 분석 취소
  // ============================================================================
  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
    setAnalyzingStep('');
    toast({ title: '분석 취소됨', description: '에피소드 분석 요청을 중단했습니다.' });
  };

  // 초안 초기화
  const handleClearDraft = () => {
    if (window.confirm('작성 중인 대본 및 분석된 에피소드 데이터를 초기화할까요?')) {
      localStorage.removeItem(STORAGE_KEY_DRAFT);
      setEpisodes([]); setCharacterAnchors([]); setThumbnailPlan(null);
      setScriptContent(SAMPLE_LONGFORM_SCRIPTS[0].text);
      setLongformTitle(SAMPLE_LONGFORM_SCRIPTS[0].title);
      setVideoFile(null); setVideoFileName(''); setVideoSourceUrl(''); setVideoFileSizeMB(0);
      setHasRestoredDraft(false); setIsAnalyzing(false);
      toast({ title: '초기화 완료', description: '새로운 롱폼 프로젝트를 시작합니다.' });
    }
  };

  const handleApplySampleScript = (sample: typeof SAMPLE_LONGFORM_SCRIPTS[0]) => {
    setLongformTitle(sample.title);
    setScriptContent(sample.text);
    toast({ title: '샘플 대본 로드 완료', description: `'${sample.title}' 대본이 입력되었습니다.` });
  };

  // ============================================================================
  // [핵심 기능 1] ⚡ 0초 고속 로컬 분할 (즉시 생성)
  // ============================================================================
  const handleFastLocalSplit = useCallback(() => {
    const titleToUse = longformTitle.trim() || '롱폼 마스터 프로젝트';
    const textToUse = sourceMode === 'script'
      ? scriptContent.trim()
      : `[영상 소스]: ${videoFileName || videoSourceUrl || '원본 영상'}`;

    if (!textToUse) {
      toast({ variant: 'destructive', title: '대본 입력 필요', description: '대본이나 영상을 먼저 등록해 주세요.' });
      return;
    }

    const lines = textToUse.split('\n').map(l => l.trim()).filter(Boolean);
    const totalLines = lines.length;
    const linesPerEp = Math.max(2, Math.floor(totalLines / targetShortsCount)) || 2;
    const archetypes: ('classic' | 'ssul' | 'gunlimbo' | 'instagram')[] = ['classic', 'ssul', 'gunlimbo', 'instagram'];
    const archetypeNames = { classic: '골든 클래식', ssul: '썰형(커뮤니티)', gunlimbo: '군림보(훅밴드)', instagram: '인스타(릴스)' };
    const jabSamples = ['(동공지진)', '(소름돋음)', '(반전주의)', '(팩트폭격)', '(극대노)', '(대박사건)'];
    const sfxSamples = ['whoosh', 'boom', 'ding', 'slap'];

    const newEpisodes: EpisodeData[] = Array.from({ length: targetShortsCount }, (_, i) => {
      const epNum = i + 1;
      const startIdx = (i * linesPerEp) % Math.max(1, totalLines);
      const chunkLines = lines.slice(startIdx, startIdx + linesPerEp);
      const finalLines = chunkLines.length > 0 ? chunkLines : [lines[0] || `${titleToUse}의 핵심 요약 대본입니다.`];
      const assignedArch = autoArchetypeDistribution ? archetypes[i % archetypes.length] : 'classic';
      const clips: ClipData[] = finalLines.slice(0, 4).map((line, cIdx) => ({
        clip_id: cIdx + 1,
        source_start: roundTo1(cIdx * 14.5),
        source_end: roundTo1((cIdx + 1) * 14.5),
        duration: 14.5,
        narration: line,
        visual_prompt: `Cinematic dramatic scene illustrating ${line.slice(0, 30)}, cinematic lighting, 8k realistic`,
        speaker_a_dialogue: enableDiarization && cIdx % 2 === 1 ? `정말 그렇습니다, ${line.slice(0, 15)}...` : '',
        speaker_b_dialogue: '',
        jab_sticker: jabSamples[(i + cIdx) % jabSamples.length],
        sfx_recommend: sfxSamples[(i + cIdx) % sfxSamples.length]
      }));
      return {
        id: epNum,
        title: `에피소드 ${epNum}: ${titleToUse.slice(0, 15)}... - 챕터 ${epNum}`,
        top_hook: `${titleToUse.slice(0, 12)}의 비밀 #${epNum}`,
        total_duration_sec: 58.0,
        archetype: assignedArch,
        archetype_name: archetypeNames[assignedArch],
        clips
      };
    });

    setEpisodes(newEpisodes);
    setExpandedEpisodeId(newEpisodes[0].id);
    setCharacterAnchors([{
      id: 'char_1', name: '메인 화자 / 주인공', role: '스토리텔러',
      visual_prompt: 'Cinematic portrait of a focused Korean narrator in a modern studio with warm rim lighting, 8k resolution'
    }]);
    setThumbnailPlan({
      headline_copy: titleToUse.slice(0, 12) || '충격 실화 폭로',
      sub_copy: '아무도 몰랐던 진실이 밝혀집니다',
      visual_concept: '중앙에 놀란 표정의 인물 클로즈업과 배경에 긴장감 넘치는 붉은색 조명 대비'
    });
    setActiveInspectorTab('episodes');
    toast({
      title: '⚡ 고속 로컬 분할 생성 완료 (0초)',
      description: `총 ${newEpisodes.length}개 에피소드가 즉시 조립되었습니다.`
    });
  }, [longformTitle, scriptContent, sourceMode, videoFileName, videoSourceUrl, targetShortsCount, autoArchetypeDistribution, enableDiarization]);

  // ============================================================================
  // [핵심 기능 2] AI 심층 챕터링 분석 (apiLong 180초 타임아웃)
  // ============================================================================
  const handleStartAnalysis = async () => {
    const titleToUse = longformTitle.trim() || '롱폼 마스터 프로젝트';
    const textToUse = sourceMode === 'script' ? scriptContent.trim() : '';

    if (sourceMode === 'script' && !textToUse) {
      toast({ variant: 'destructive', title: '대본 입력 필요', description: '분석할 롱폼 대본을 입력해 주세요.' });
      return;
    }
    if (sourceMode === 'video' && !videoFileName && !videoSourceUrl.trim()) {
      toast({ variant: 'destructive', title: '영상 입력 필요', description: '영상 파일을 드롭하거나 유튜브 URL을 입력해 주세요.' });
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingStep('DB Settings AI 모델로 롱폼 씬 분할 및 대본 각색 중...');
    abortControllerRef.current = new AbortController();

    try {
      setAnalyzingStep(`3대 챕터링(${segmentationMode === 'topic' ? '주제별' : segmentationMode === 'speaker' ? '화자별' : '몰입피크'}) & 캐릭터 앵커 추출 중...`);
      const payload = {
        video_title: titleToUse,
        script_content: textToUse || undefined,
        preset_id: presetId,
        target_lang: ttsLang || 'ko',
        episode_count: targetShortsCount,
        target_duration_type: aspectRatio === '16:9' ? 'longform' : 'shorts',
        aspect_ratio: aspectRatio,
        segmentation_mode: segmentationMode,
        auto_archetype_distribution: autoArchetypeDistribution,
        enable_speaker_diarization: enableDiarization,
        include_character_anchors: true,
        include_thumbnail_plan: true,
        custom_prompt: sourceMode === 'video' ? `원본 영상 URL/소스: ${videoSourceUrl || videoFileName}` : undefined
      };

      const res = await apiLong.post('/universal-cutter/split-episodes', payload, {
        signal: abortControllerRef.current.signal,
        timeout: 180000
      });

      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        const rawEpisodes: any[] = data.episodes || [];
        const normalized = normalizeEpisodes(rawEpisodes);
        setEpisodes(normalized);
        if (data.character_anchors?.length > 0) setCharacterAnchors(data.character_anchors);
        if (data.thumbnail_plan) setThumbnailPlan(data.thumbnail_plan);
        if (normalized.length > 0) setExpandedEpisodeId(normalized[0].id);
        setActiveInspectorTab('episodes');
        toast({
          title: '🎉 AI 에피소드 덱 분할 완료',
          description: `총 ${normalized.length}개 에피소드 & ${data.character_anchors?.length || 1}명 캐릭터 앵커 생성 완료.`
        });
      } else {
        throw new Error(res.data?.detail || '에피소드 분할 결과를 수신하지 못했습니다.');
      }
    } catch (e: any) {
      if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
      console.warn('Split episodes API failed, activating instant local fallback:', e);
      handleFastLocalSplit();
      toast({
        title: '⚠️ AI 심층 분석 지연 → 로컬 즉시 분할 완료',
        description: 'AI 모델 지연으로 로컬 정밀 슬라이서가 에피소드 덱을 즉시 조립했습니다.'
      });
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStep('');
      abortControllerRef.current = null;
    }
  };

  // ============================================================================
  // Episode & Clip Mutation Handlers
  // ============================================================================
  const handleUpdateTopHook = (epId: number, val: string) =>
    setEpisodes(prev => prev.map(ep => ep.id === epId ? { ...ep, top_hook: val } : ep));

  const handleUpdateArchetype = (epId: number, arch: EpisodeData['archetype']) => {
    const archetypeNames = { classic: '골든 클래식', ssul: '썰형(커뮤니티)', gunlimbo: '군림보(훅밴드)', instagram: '인스타(릴스)' };
    setEpisodes(prev => prev.map(ep => ep.id === epId ? { ...ep, archetype: arch, archetype_name: archetypeNames[arch!] } : ep));
  };

  const handleUpdateClipField = (epId: number, clipId: number, field: keyof ClipData, val: any) =>
    setEpisodes(prev => prev.map(ep => {
      if (ep.id !== epId) return ep;
      return { ...ep, clips: ep.clips.map(c => c.clip_id === clipId ? { ...c, [field]: val } : c) };
    }));

  const handleDeleteEpisode = (epId: number) => {
    setEpisodes(prev => prev.filter(ep => ep.id !== epId));
    toast({ title: '에피소드 제외됨', description: `에피소드 #${epId}가 목록에서 제외되었습니다.` });
  };

  // Character Anchor handlers
  const handleUpdateCharacterAnchor = (charId: string, field: keyof CharacterAnchor, value: string) =>
    setCharacterAnchors(prev => prev.map(c => c.id === charId ? { ...c, [field]: value } : c));

  const handleAddCharacterAnchor = () => {
    const newId = `char_${Date.now()}`;
    setCharacterAnchors(prev => [...prev, { id: newId, name: '새 인물', role: '등장인물', visual_prompt: 'Cinematic portrait, detailed facial features, realistic 8k' }]);
    toast({ title: '캐릭터 앵커 추가됨' });
  };

  const handleDeleteCharacterAnchor = (charId: string) =>
    setCharacterAnchors(prev => prev.filter(c => c.id !== charId));

  // Thumbnail plan handler
  const handleUpdateThumbnailPlan = (field: keyof ThumbnailPlan, value: string) => {
    if (thumbnailPlan) setThumbnailPlan({ ...thumbnailPlan, [field]: value });
  };

  // ============================================================================
  // Batch Queue Registration
  // ============================================================================
  const handleRegisterBatchJobs = () => {
    if (episodes.length === 0) {
      toast({ variant: 'destructive', title: '등록할 에피소드 없음', description: '먼저 에피소드 분할 분석을 완료해 주세요.' });
      return;
    }
    const newJobs = episodes.map(ep => ({
      id: `lf-multi-${Date.now()}-${ep.id}`,
      title: `[롱폼멀티 #${ep.id}] ${ep.top_hook || ep.title}`,
      sourceType: sourceMode === 'video' ? 'video' : 'script',
      archetype: ep.archetype || 'classic',
      aspectRatio,
      tabId: 'longform-multi',
      createdAt: new Date().toLocaleTimeString(),
      status: 'ready',
      scriptLinesCount: ep.clips.length,
      durationSec: ep.total_duration_sec || 58.0,
      metadata: {
        longformTitle, episodeId: ep.id, topHook: ep.top_hook, aspectRatio, segmentationMode,
        ttsEngine, ttsVoiceId,
        scenes: ep.clips.map(c => ({
          order: c.clip_id, narration: c.narration, hookJabText: c.jab_sticker,
          visualPrompt: c.visual_prompt || '', speakerA: c.speaker_a_dialogue || '',
          speakerB: c.speaker_b_dialogue || '', sfx: c.sfx_recommend, duration: c.duration
        })),
        characterAnchors, thumbnailPlan, capcutReady: true
      }
    }));
    onAddBatchJobs(newJobs);
    toast({ title: '🚀 하단 대기열 일괄 등록 완료', description: `총 ${newJobs.length}개 독립 프로젝트가 등록되었습니다.` });
  };

  // CapCut 내보내기
  const handleExportCapCutProjects = async () => {
    if (episodes.length === 0) {
      toast({ variant: 'destructive', title: '내보낼 에피소드 없음' }); return;
    }
    setIsExportingCapCut(true);
    try {
      const payload = {
        project_title: longformTitle || '롱폼멀티_프로젝트',
        video_path: videoFileName || videoSourceUrl || 'virtual_longform_master.mp4',
        episodes, target_lang: ttsLang || 'ko', aspect_ratio: aspectRatio
      };
      const res = await apiLong.post('/universal-cutter/export-capcut', payload);
      if (res.data?.success) {
        toast({
          title: '📁 CapCut 초안 내보내기 성공',
          description: `05_Exports/CapCut_Projects에 ${aspectRatio} 규격 11-Track 초안 생성 완료.`
        });
      } else {
        throw new Error(res.data?.detail || 'CapCut 프로젝트 생성에 실패했습니다.');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'CapCut 내보내기 실패', description: e.response?.data?.detail || e.message });
    } finally {
      setIsExportingCapCut(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const archetypeBadgeClass = (arch?: string) => ({
    classic: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    ssul: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    gunlimbo: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    instagram: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  }[arch || 'classic'] || 'bg-muted text-muted-foreground border-border');

  return (
    <div className="space-y-6">
      {/* ── 헤더 바 ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Layers className="w-5 h-5" /></div>
          <div>
            <h2 className="text-sm font-black text-foreground flex items-center gap-2">
              롱폼 멀티생성 스튜디오 (Longform Multi-Studio)
              <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">SOVEREIGN BATCH v4.0</Badge>
              {hasRestoredDraft && <Badge variant="outline" className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Durable State 자동 복원됨</Badge>}
            </h2>
            <p className="text-[11px] text-muted-foreground">대용량 영상/대본에서 캐릭터 앵커를 수호하며, 3대 챕터링 & 4대 폼팩터로 N개 에피소드 덱 및 CapCut 초안을 조립합니다.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft} className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />초기화
          </Button>
          {/* 소스 인입 모드 토글 */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border text-xs">
            {(['script', 'video'] as const).map(mode => (
              <button key={mode} type="button" onClick={() => setSourceMode(mode)}
                className={cn("px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer",
                  sourceMode === mode ? "bg-background text-foreground shadow-xs border border-border" : "text-muted-foreground hover:text-foreground")}>
                {mode === 'script' ? <><FileText className="w-3.5 h-3.5 text-primary" /><span>📝 롱폼 대본 인입</span></> : <><Film className="w-3.5 h-3.5 text-primary" /><span>🎥 롱폼 비디오 인입</span></>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2단 레이아웃 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ══ 좌측 (4칸): 인풋 & 전략 설정 ══ */}
        <div className="lg:col-span-4 space-y-4">

          {/* 소스 인입 카드 */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                {sourceMode === 'script' ? <FileText className="w-3.5 h-3.5 text-primary" /> : <Film className="w-3.5 h-3.5 text-primary" />}
                {sourceMode === 'script' ? '롱폼 대본 작성 & 주입' : '대용량 영상 (강의/팟캐스트)'}
              </span>
              {sourceMode === 'script' && <span className="text-[10px] text-muted-foreground font-mono">{scriptContent.length}자</span>}
            </div>

            {/* 제목 입력 */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">프로젝트 / 영상 제목</label>
              <input type="text" value={longformTitle} onChange={e => setLongformTitle(e.target.value)}
                placeholder="예: AI 대전환 시대의 생존 전략 특강"
                className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            {sourceMode === 'script' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground">롱폼 대본 본문</label>
                  <div className="flex items-center gap-1">
                    {SAMPLE_LONGFORM_SCRIPTS.map((s, idx) => (
                      <button key={idx} type="button" onClick={() => handleApplySampleScript(s)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition cursor-pointer">
                        샘플 #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea rows={8} value={scriptContent} onChange={e => setScriptContent(e.target.value)}
                  placeholder="긴 대본이나 기사, 인터뷰 녹취록 전문을 입력해 주세요..."
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono" />
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* ── 드래그앤드롭 완전 구현 ── */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">로컬 비디오 파일 (드래그앤드롭 / 클릭 선택)</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[110px]",
                      isDragActive
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : videoFile
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40"
                    )}
                  >
                    {isDragActive && (
                      <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center bg-primary/10 border-2 border-primary text-primary z-10">
                        <Upload className="w-6 h-6 mb-1 animate-bounce" />
                        <span className="text-xs font-black">여기에 드롭하세요!</span>
                      </div>
                    )}
                    {videoFile ? (
                      <div className="text-center space-y-1">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto">
                          <Film className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-xs font-bold text-foreground truncate max-w-[180px]">{videoFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">{videoFileSizeMB}MB · 등록 완료</p>
                        <button type="button" onClick={() => { setVideoFile(null); setVideoFileName(''); setVideoFileSizeMB(0); }}
                          className="text-[10px] text-destructive hover:underline cursor-pointer">제거</button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-primary/60" />
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground">파일을 드래그하거나 클릭하여 선택</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">MP4, MKV, MOV, AVI, WebM 지원</p>
                        </div>
                      </>
                    )}
                    <label className="absolute inset-0 cursor-pointer">
                      <input type="file" accept="video/*,.mp4,.mkv,.mov,.avi,.webm,.m4v,.ts,.flv"
                        onChange={handleFileInputChange} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* 유튜브 URL */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1 flex items-center gap-1.5">
                    <Link className="w-3 h-3" />유튜브 영상 URL (트랜스크립트 분석)
                  </label>
                  <input type="text" value={videoSourceUrl}
                    onChange={e => handleUrlPaste(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            )}
          </div>

          {/* 분할 전략 카드 */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                분할 전략 & 캔버스 화면비율
              </span>
            </div>

            {/* 화면 비율 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground block">캔버스 타겟 화면비율</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: '9:16' as const, icon: <Smartphone className="w-4 h-4 shrink-0" />, label: '9:16 세로 숏폼', sub: '유튜브 쇼츠 / 릴스' },
                  { val: '16:9' as const, icon: <Monitor className="w-4 h-4 shrink-0" />, label: '16:9 가로 롱폼', sub: '유튜브 정규 영상' }
                ].map(({ val, icon, label, sub }) => (
                  <button key={val} type="button" onClick={() => setAspectRatio(val)}
                    className={cn("p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center gap-2",
                      aspectRatio === val ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs" : "border-border hover:bg-muted/40 text-foreground")}>
                    {icon}
                    <div>
                      <div className="text-xs">{label}</div>
                      <div className="text-[9.5px] text-muted-foreground font-normal">{sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 챕터링 알고리즘 */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[11px] font-bold text-muted-foreground block">3대 챕터링 분할 알고리즘</label>
              <div className="space-y-1.5">
                {[
                  { id: 'topic', label: '주제별 AI 클러스터링', desc: '의미론적 주제 전환 및 핵심 논점 감지' },
                  { id: 'speaker', label: '화자 발화 전환 분할', desc: '질문과 답변(Q&A) 턴 체인지 기준' },
                  { id: 'retention', label: '시청 지속률 피크 구간', desc: '도파민 및 극적 반전 하이라이트' },
                ].map(sm => (
                  <button key={sm.id} type="button" onClick={() => setSegmentationMode(sm.id as any)}
                    className={cn("w-full text-left p-2 rounded-lg border text-xs transition cursor-pointer",
                      segmentationMode === sm.id ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs" : "border-border hover:bg-muted/40 text-foreground")}>
                    <div>{sm.label}</div>
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{sm.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 목표 수량 */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[11px] font-bold text-muted-foreground block">목표 패키지 수량</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ count: 3, label: '3개 팩' }, { count: 5, label: '5개 팩' }, { count: 10, label: '10개 팩' }].map(p => (
                  <button key={p.count} type="button" onClick={() => setTargetShortsCount(p.count)}
                    className={cn("p-2 rounded-lg border text-center text-xs font-bold transition cursor-pointer",
                      targetShortsCount === p.count ? "bg-primary/10 border-primary text-primary shadow-2xs" : "border-border hover:bg-muted/40 text-foreground")}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 연출 프리셋 */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[11px] font-bold text-muted-foreground block">바이럴 연출 톤 프리셋</label>
              <select value={presetId} onChange={e => setPresetId(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground font-bold cursor-pointer">
                <option value="gutavari">⚡ 구타바리 (사이다/참교육 명사형 종결)</option>
                <option value="k_cider">🔥 K-사이다 (속시원한 팩트폭격)</option>
                <option value="longform_docu">🔍 범죄 실화 다큐 (프로파일러 미스터리)</option>
                <option value="b_trilogy">😂 병맛 유머 숏폼 (극적 과장)</option>
              </select>
            </div>

            {/* 4대 폼팩터 자동 배정 토글 */}
            <div className="pt-2 border-t border-border space-y-1.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-foreground">4대 폼팩터 자동 순환 분배</span>
                <input type="checkbox" checked={autoArchetypeDistribution}
                  onChange={e => setAutoArchetypeDistribution(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer" />
              </label>
              <p className="text-[10.5px] text-muted-foreground leading-tight">에피소드마다 골든 클래식, 썰형, 군림보, 인스타 스타일을 균등 배정합니다.</p>
            </div>

            {/* 화자 분리 토글 */}
            <div className="pt-2 border-t border-border space-y-1.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-foreground">인물 화자 분리 (Diarization)</span>
                <input type="checkbox" checked={enableDiarization}
                  onChange={e => setEnableDiarization(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer" />
              </label>
              <p className="text-[10.5px] text-muted-foreground leading-tight">나레이션 외에 화자 A, B 대사를 분리하여 인물 대사 트랙을 생성합니다.</p>
            </div>

            {/* 분석 실행 버튼 */}
            <div className="space-y-2 pt-2 border-t border-border">
              {isAnalyzing ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />AI 분석 추론 중...
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Timer className="w-3 h-3" />{elapsedSeconds}초
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-tight truncate">{analyzingStep}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={handleCancelAnalysis}
                    className="w-full h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5 cursor-pointer">
                    <XCircle className="w-3.5 h-3.5" /><span>분석 취소</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <Button type="button" onClick={handleStartAnalysis}
                    className="w-full h-10 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition cursor-pointer">
                    <Sparkles className="w-4 h-4" />
                    <span>AI 심층 챕터링 분할 ({targetShortsCount}개)</span>
                  </Button>
                  <Button type="button" variant="outline" onClick={handleFastLocalSplit}
                    className="w-full h-9 text-xs font-bold gap-1.5 border-border hover:bg-muted/50 transition cursor-pointer text-foreground"
                    title="AI 모델 대기 없이 대본을 즉시 0초 만에 완벽한 에피소드 덱으로 분할">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>⚡ 0초 고속 로컬 분할 (즉시 생성)</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ══ TTS 음성 연결 카드 ══ */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-primary" />
                TTS 음성 연결 (나레이션 더빙)
              </span>
              <Badge variant="outline" className="text-[9.5px] bg-primary/10 text-primary border-primary/20">
                {ttsEngine.toUpperCase()}
              </Badge>
            </div>

            {/* TTS 엔진 선택 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground block">TTS 엔진</label>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  { val: 'supertone-local', label: '⚡ Supertonic AI', sub: '로컬 무제한/기본' },
                  { val: 'typecast', label: '🎭 Typecast', sub: '한국어 감정연기' },
                  { val: 'elevenlabs', label: '🎬 ElevenLabs', sub: '글로벌 시네마틱' },
                  { val: 'kokoro', label: '🎯 Kokoro', sub: '로컬 고품질 뉴럴' },
                ].map(e => (
                  <button key={e.val} type="button" onClick={() => setTtsEngine(e.val)}
                    className={cn("p-2 rounded-lg border text-left transition cursor-pointer",
                      ttsEngine === e.val ? "bg-primary/10 border-primary text-primary font-bold" : "border-border hover:bg-muted/40 text-foreground")}>
                    <div className="font-bold">{e.label}</div>
                    <div className="text-[9px] text-muted-foreground font-normal mt-0.5">{e.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 언어 선택 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground block">언어</label>
              <select value={ttsLang} onChange={e => setTtsLang(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground font-bold cursor-pointer">
                <option value="ko">🇰🇷 한국어 (Korean)</option>
                <option value="en">🇺🇸 영어 (English)</option>
                <option value="ja">🇯🇵 일본어 (Japanese)</option>
                <option value="zh">🇨🇳 중국어 (Chinese)</option>
                <option value="es">🇪🇸 스페인어 (Spanish)</option>
              </select>
            </div>

            {/* 음성 목록 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground block flex items-center gap-1.5">
                음성 선택
                {ttsVoicesLoading && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
              </label>
              {ttsVoices.length > 0 ? (
                <select value={ttsVoiceId} onChange={e => setTtsVoiceId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground font-bold cursor-pointer">
                  {ttsVoices.map(v => (
                    <option key={v.id} value={v.id}>{v.name || v.id}</option>
                  ))}
                </select>
              ) : ttsVoicesLoading ? (
                <div className="text-[11px] text-muted-foreground text-center py-2">음성 목록 불러오는 중...</div>
              ) : (
                <div className="text-[11px] text-muted-foreground text-center py-2">음성 목록 없음 (엔진 확인 필요)</div>
              )}
            </div>

            {/* 미리듣기 버튼 */}
            <Button type="button" variant="outline" onClick={handleTtsPreview}
              disabled={ttsPreviewLoading || !ttsVoiceId}
              className="w-full h-9 text-xs font-bold gap-2 border-border hover:bg-muted/50 cursor-pointer">
              {ttsPreviewLoading
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />재생 중...</>
                : <><Volume2 className="w-3.5 h-3.5 text-primary" />🔊 음성 미리듣기</>}
            </Button>
          </div>
        </div>

        {/* ══ 우측 (8칸): 에피소드 덱 & 캐릭터 앵커 & 썸네일 인스펙터 ══ */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col justify-between min-h-[580px]">
          <div className="space-y-4">
            {/* 인스펙터 탭 헤더 */}
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-2.5 gap-2">
              <div className="flex items-center gap-1.5">
                {([
                  { id: 'episodes', icon: <Film className="w-3.5 h-3.5" />, label: `에피소드 덱 (${episodes.length}개)` },
                  { id: 'characters', icon: <Users className="w-3.5 h-3.5" />, label: `캐릭터 앵커 (${characterAnchors.length}명)` },
                  { id: 'thumbnail', icon: <ImageIcon className="w-3.5 h-3.5" />, label: '🔥 킬러 썸네일 기획' },
                ] as const).map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveInspectorTab(tab.id as any)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                      activeInspectorTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")}>
                    {tab.icon}<span>{tab.label}</span>
                  </button>
                ))}
              </div>
              {episodes.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                  {aspectRatio} {aspectRatio === '16:9' ? '가로 롱폼' : '세로 숏폼'}
                </Badge>
              )}
            </div>

            {/* 빈 상태 안내 */}
            {episodes.length === 0 && !isAnalyzing && (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-foreground">분할된 에피소드가 없습니다</h3>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    좌측에서 [AI 심층 챕터링 분할] 또는 [⚡ 0초 고속 로컬 분할]을 누르면 기승전결 완결형 에피소드 덱이 즉시 조립됩니다.
                  </p>
                </div>
                <Button type="button" size="sm" onClick={handleFastLocalSplit}
                  className="h-8 text-xs font-bold gap-1.5 bg-amber-500 text-white hover:bg-amber-600 cursor-pointer shadow-xs">
                  <Zap className="w-3.5 h-3.5" /><span>지금 0초 만에 분할 덱 생성하기</span>
                </Button>
              </div>
            )}

            {/* AI 분석 로딩 상태 */}
            {isAnalyzing && (
              <div className="py-16 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-7 h-7 animate-spin" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-foreground">AI 챕터링 분석 중... ({elapsedSeconds}초 경과)</h3>
                  <p className="text-[11px] text-primary font-mono max-w-md mx-auto">{analyzingStep}</p>
                  <p className="text-[10px] text-muted-foreground">딥 싱킹 모델이 대본 전체의 기승전결과 캐릭터 앵커를 정밀 설계 중입니다.</p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleFastLocalSplit}
                    className="h-8 text-xs font-bold gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 cursor-pointer">
                    <Zap className="w-3.5 h-3.5" />기다리지 않고 0초 로컬 분할로 즉시 전환
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancelAnalysis}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer">취소</Button>
                </div>
              </div>
            )}

            {/* ══ 서브 탭 1: 에피소드 덱 ══ */}
            {activeInspectorTab === 'episodes' && episodes.length > 0 && !isAnalyzing && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {episodes.map(ep => {
                  const isExpanded = expandedEpisodeId === ep.id;
                  return (
                    <div key={ep.id}
                      className={cn("rounded-xl border transition shadow-2xs overflow-hidden",
                        isExpanded ? "border-primary/50 bg-card" : "border-border bg-card/60 hover:bg-card")}>
                      {/* 에피소드 카드 헤더 */}
                      <div className="p-3 flex items-center justify-between gap-3 bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0 font-bold">#{ep.id}</Badge>
                          <Badge variant="outline" className={cn("text-[10px] font-bold shrink-0", archetypeBadgeClass(ep.archetype))}>
                            {ep.archetype_name || ep.archetype || '골든 클래식'}
                          </Badge>
                          <input type="text" value={ep.top_hook || ''}
                            onChange={e => handleUpdateTopHook(ep.id, e.target.value)}
                            placeholder="상단 훅 타이틀..."
                            className="text-xs font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 truncate flex-1" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {ep.total_duration_sec ? `${Math.round(ep.total_duration_sec)}초` : '58초'}
                          </span>
                          <select value={ep.archetype || 'classic'}
                            onChange={e => handleUpdateArchetype(ep.id, e.target.value as any)}
                            className="text-[10px] p-1 rounded border border-border bg-background text-foreground font-bold cursor-pointer">
                            <option value="classic">골든 클래식</option>
                            <option value="ssul">썰형 (커뮤니티)</option>
                            <option value="gunlimbo">군림보 (훅밴드)</option>
                            <option value="instagram">인스타 (릴스)</option>
                          </select>
                          {/* 발음 최적화 버튼 */}
                          <button type="button"
                            onClick={() => handleOptimizePronunciation(ep.id)}
                            disabled={optimizingEpId === ep.id}
                            title="TTS 발음 최적화 (숫자/영어 발음 교정)"
                            className="p-1 rounded text-muted-foreground hover:text-primary transition cursor-pointer disabled:opacity-50">
                            {optimizingEpId === ep.id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                              : <Wand2 className="w-3.5 h-3.5" />}
                          </button>
                          <button type="button" onClick={() => handleDeleteEpisode(ep.id)}
                            className="p-1 text-muted-foreground hover:text-destructive rounded transition cursor-pointer" title="에피소드 제외">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setExpandedEpisodeId(isExpanded ? null : ep.id)}
                            className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* 씬 타임라인 아코디언 */}
                      {isExpanded && (
                        <div className="p-3 border-t border-border space-y-2.5 bg-background/50">
                          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                            <span>씬별 클립 타임라인 ({ep.clips.length}개 씬)</span>
                            <span className="text-[10px] font-normal text-primary">🎙️ 발음 최적화 버튼(🪄)으로 TTS 자동 교정 가능</span>
                          </div>

                          {ep.clips.length === 0 ? (
                            <div className="text-center py-4 text-[11px] text-muted-foreground">
                              씬 데이터가 없습니다. 다시 분석하거나 ⚡ 로컬 분할을 사용해 주세요.
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {ep.clips.map((clip, cIdx) => (
                                <div key={clip.clip_id || cIdx}
                                  className="p-3 rounded-lg border border-border bg-card space-y-2.5 text-xs shadow-2xs">
                                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                                    <span className="font-bold text-[11px] text-foreground flex items-center gap-1.5">
                                      <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center font-mono font-black">
                                        {cIdx + 1}
                                      </span>
                                      씬 #{cIdx + 1} ({clip.duration || 14.5}초)
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        {roundTo1(clip.source_start)}s → {roundTo1(clip.source_end)}s
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded">
                                        SFX: {clip.sfx_recommend || 'ding'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* 나레이션 */}
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">🎙️ 해설자 나레이션 대사</label>
                                    <input type="text" value={clip.narration || ''}
                                      onChange={e => handleUpdateClipField(ep.id, clip.clip_id, 'narration', e.target.value)}
                                      className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                                  </div>

                                  {/* 비주얼 프롬프트 */}
                                  <div>
                                    <label className="text-[10px] font-bold text-primary block mb-0.5 flex items-center gap-1">
                                      <Palette className="w-3 h-3" />🎨 AI 시각 연출 프롬프트 (Visual Prompt)
                                    </label>
                                    <input type="text" value={clip.visual_prompt || ''}
                                      onChange={e => handleUpdateClipField(ep.id, clip.clip_id, 'visual_prompt', e.target.value)}
                                      placeholder="카메라 앵글, 조명, 인물 행동, 배경 묘사..."
                                      className="w-full text-xs p-1.5 rounded border border-primary/20 bg-primary/5 text-foreground font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-primary" />
                                  </div>

                                  {/* 쨉쨉이 & 화자 대사 */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">쨉쨉이 드립 스티커</label>
                                      <input type="text" value={clip.jab_sticker || ''}
                                        onChange={e => handleUpdateClipField(ep.id, clip.clip_id, 'jab_sticker', e.target.value)}
                                        placeholder="(동공지진)"
                                        className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground font-bold text-amber-500 focus:outline-none focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">인물 대사 (화자 A)</label>
                                      <input type="text" value={clip.speaker_a_dialogue || ''}
                                        onChange={e => handleUpdateClipField(ep.id, clip.clip_id, 'speaker_a_dialogue', e.target.value)}
                                        placeholder="인물 대사..."
                                        className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ══ 서브 탭 2: 캐릭터 앵커 ══ */}
            {activeInspectorTab === 'characters' && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-bold text-foreground">인물 일관성 수호 (Character Anchors)</div>
                      <div className="text-[10.5px] text-muted-foreground">롱폼의 모든 씬에서 등장인물의 외모·복장·스타일 붕괴를 영구 방지합니다.</div>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddCharacterAnchor}
                    className="h-7 text-xs font-bold gap-1 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />인물 추가
                  </Button>
                </div>

                {characterAnchors.length === 0 && (
                  <div className="py-8 text-center text-[11px] text-muted-foreground">
                    에피소드를 분석하면 인물 앵커가 자동으로 추출됩니다.
                  </div>
                )}

                <div className="space-y-2.5">
                  {characterAnchors.map((char, cIdx) => (
                    <div key={char.id || cIdx} className="p-3 rounded-xl border border-border bg-card space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">{cIdx + 1}</span>
                          <input type="text" value={char.name}
                            onChange={e => handleUpdateCharacterAnchor(char.id, 'name', e.target.value)}
                            placeholder="인물명..."
                            className="font-bold text-xs bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1" />
                          <input type="text" value={char.role}
                            onChange={e => handleUpdateCharacterAnchor(char.id, 'role', e.target.value)}
                            placeholder="역할..."
                            className="text-[10px] text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1" />
                        </div>
                        <button type="button" onClick={() => handleDeleteCharacterAnchor(char.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">외모 / 복장 / 화풍 앵커 프롬프트 (Visual Anchor Prompt)</label>
                        <textarea rows={2} value={char.visual_prompt}
                          onChange={e => handleUpdateCharacterAnchor(char.id, 'visual_prompt', e.target.value)}
                          placeholder="인물의 헤어스타일, 의상, 분위기를 구체적으로 기술..."
                          className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ 서브 탭 3: 유튜브 썸네일 기획 ══ */}
            {activeInspectorTab === 'thumbnail' && (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-bold">유튜브 클릭률(CTR) 300% 극대화 썸네일 기획</div>
                    <div className="text-[10.5px]">0초 시청 유입을 결정짓는 강력한 헤드라인 카피와 시각 구도 설계안입니다.</div>
                  </div>
                </div>

                {thumbnailPlan ? (
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 shadow-xs">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">🔥 썸네일 메인 헤드라인 카피 (10자 내외)</label>
                      <input type="text" value={thumbnailPlan.headline_copy}
                        onChange={e => handleUpdateThumbnailPlan('headline_copy', e.target.value)}
                        className="w-full text-sm font-black p-2 rounded-lg border border-amber-500/30 bg-background text-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">어그로 서브 카피</label>
                      <input type="text" value={thumbnailPlan.sub_copy}
                        onChange={e => handleUpdateThumbnailPlan('sub_copy', e.target.value)}
                        className="w-full text-xs font-bold p-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">시각 구도 및 표정 연출 지침 (Visual Concept)</label>
                      <textarea rows={3} value={thumbnailPlan.visual_concept}
                        onChange={e => handleUpdateThumbnailPlan('visual_concept', e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground leading-relaxed resize-none font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    분석을 완료하면 여기에 썸네일 기획 카드가 자동으로 나타납니다.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 하단 일괄 출격 액션 바 ── */}
          <div className="pt-4 border-t border-border mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {episodes.length > 0 ? (
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  총 {episodes.length}개 에피소드 & {characterAnchors.length}명 앵커 준비 완료 ({aspectRatio}) · TTS: {ttsEngine}/{ttsVoiceId}
                </span>
              ) : (
                <span>에피소드를 분석한 후 일괄 발주할 수 있습니다.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline"
                disabled={episodes.length === 0 || isExportingCapCut}
                onClick={handleExportCapCutProjects}
                className="h-10 text-xs font-bold gap-1.5 border-border hover:bg-muted/40 cursor-pointer">
                {isExportingCapCut
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <FolderOpen className="w-3.5 h-3.5 text-primary" />}
                <span>📁 CapCut 11-Track 초안 ({aspectRatio})</span>
              </Button>
              <Button type="button"
                disabled={episodes.length === 0}
                onClick={handleRegisterBatchJobs}
                className="h-10 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer px-5">
                <Zap className="w-4 h-4" />
                <span>⚡ 전체 {episodes.length}개 에피소드 일괄 등록</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
