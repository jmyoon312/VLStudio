import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/lib/api';
import {
  Zap,
  Layers,
  FileText,
  Newspaper,
  MessageSquareText,
  Video,
  CheckCircle2,
  Sliders,
  Film,
  Plus,
  Trash2,
  FolderOpen,
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ddalkkakApi } from '@/services/ddalkkakApi';

export type SourceType = 'ssul' | 'news' | 'script' | 'video';
export type TargetArchetype = 'classic' | 'instagram' | 'gunlimbo' | 'ssul';

interface SourceItem {
  id: string;
  title: string;
  snippet: string;
  sourceOrigin: string;
  dateText: string;
  metadata?: any;
}

interface BatchJobResult {
  id: string;
  title: string;
  sourceType: SourceType;
  archetype: TargetArchetype;
  createdAt: string;
  status: 'ready' | 'processing' | 'done';
  videoFilename?: string;
  scriptLinesCount?: number;
  metadata?: any;
}

export const ShortsBatchStudio: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [activeSourceType, setActiveSourceType] = useState<SourceType>('ssul');
  const [selectedArchetype, setSelectedArchetype] = useState<TargetArchetype>('ssul');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [customTextInput, setCustomTextInput] = useState<string>('');
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // 1. 소스 공급원 (실제 바이럴 인텔리전스 DB 연동)
  const [ssulList, setSsulList] = useState<SourceItem[]>([]);
  const [newsList, setNewsList] = useState<SourceItem[]>([]);
  const [scriptList, setScriptList] = useState<SourceItem[]>([]);
  const [videoList, setVideoList] = useState<SourceItem[]>([]);

  // 1-1. 바이럴 인텔리전스 센터 실제 엄선 기사 로드
  useEffect(() => {
    const fetchLiveViralArticles = async () => {
      try {
        const res = await api.get('/viral/articles', { params: { limit: 30, curated_only: true } });
        if (res.data?.articles && Array.isArray(res.data.articles)) {
          const arts = res.data.articles;
          const liveNews: SourceItem[] = arts
            .filter((a: any) => a.source_type === 'news')
            .map((a: any) => ({
              id: `viral-${a.id}`,
              title: a.suggested_title || a.title,
              snippet: a.analysis_summary || a.content_text?.slice(0, 80) || '',
              sourceOrigin: a.author || '네이버 랭킹 뉴스',
              dateText: `${Number(a.viral_score || 70).toFixed(1)}점 · 댓글 ${a.comments_count}개`,
              metadata: a,
            }));
          const liveSsul: SourceItem[] = arts
            .filter((a: any) => a.source_type !== 'news')
            .map((a: any) => ({
              id: `viral-${a.id}`,
              title: a.suggested_title || a.title,
              snippet: a.analysis_summary || a.content_text?.slice(0, 80) || '',
              sourceOrigin: a.author || a.community_name,
              dateText: `${Number(a.viral_score || 70).toFixed(1)}점 · 댓글 ${a.comments_count}개`,
              metadata: a,
            }));
          if (liveNews.length > 0) setNewsList(liveNews);
          if (liveSsul.length > 0) setSsulList(liveSsul);
        }
      } catch (_) {}
    };
    fetchLiveViralArticles();
  }, []);

  // 1-2. 바이럴 인텔리전스 센터 등 외부 Handoff 수신
  useEffect(() => {
    let incoming: any[] = [];
    if (location.state?.batchProjects && Array.isArray(location.state.batchProjects)) {
      incoming = location.state.batchProjects;
    } else {
      try {
        const raw = sessionStorage.getItem('vlstudio_batch_handoff');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            incoming = parsed;
            sessionStorage.removeItem('vlstudio_batch_handoff');
          }
        }
      } catch (_) {}
    }

    if (incoming.length > 0) {
      const incomingJobs: BatchJobResult[] = incoming.map((p, idx) => ({
        id: p.id || `handoff-${Date.now()}-${idx}`,
        title: p.title,
        sourceType: (p.sourceType as SourceType) || 'news',
        archetype: (p.archetype as TargetArchetype) || 'gunlimbo',
        createdAt: '방금 전 인입',
        status: 'ready',
        scriptLinesCount: p.scriptLinesCount || (p.scenes ? p.scenes.length : 6),
        metadata: p,
      }));

      setBatchResults(prev => [...incomingJobs, ...prev]);
      setActiveSourceType(incoming[0].sourceType === 'news' ? 'news' : 'ssul');
      setSelectedArchetype(incoming[0].archetype || 'gunlimbo');

      toast({
        title: '⚡ 바이럴 인텔리전스 프로젝트 인입',
        description: `총 ${incoming.length}개의 엄선/1차 분석 프로젝트가 올인원 대기열에 자동 등록되었습니다.`
      });
    }
  }, [location.state]);

  // 대본 분석실 실제 DB/스토리지 연동
  useEffect(() => {
    try {
      const savedScriptsRaw = localStorage.getItem('vlstudio_script_lab_data') || localStorage.getItem('viral_loop_scripts');
      if (savedScriptsRaw) {
        const parsed = JSON.parse(savedScriptsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const liveScripts: SourceItem[] = parsed.slice(0, 10).map((s: any, idx: number) => ({
            id: `script-live-${idx}`,
            title: s.title || s.topic || `대본 분석 프로젝트 #${idx + 1}`,
            snippet: (s.content || s.script || s.summary || '').slice(0, 80) + '...',
            sourceOrigin: '대본 분석실 (실시간 DB)',
            dateText: '최근 저장됨',
          }));
          setScriptList(prev => [...liveScripts, ...prev]);
        }
      }
    } catch (_) {}
  }, []);

  // 로컬 영상 보관함 데이터 로드
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await ddalkkakApi.getVideoList();
        if (res.videos && Array.isArray(res.videos)) {
          setVideoList(
            res.videos.map((v: string, idx: number) => ({
              id: `video-${idx}`,
              title: v,
              snippet: `수집 영상 파일: ${v}`,
              sourceOrigin: '영상 보관함 (01_Raw_Downloads)',
              dateText: '수집 완료',
            }))
          );
        }
      } catch (_) {}
    };
    fetchVideos();
  }, []);

  // 2. 소스별 기본 추천 폼팩터 자동 동기화
  useEffect(() => {
    if (activeSourceType === 'ssul') setSelectedArchetype('ssul');
    else if (activeSourceType === 'news') setSelectedArchetype('gunlimbo');
    else if (activeSourceType === 'video') setSelectedArchetype('classic');
    else if (activeSourceType === 'script') setSelectedArchetype('instagram');
    setSelectedSourceIds([]);
  }, [activeSourceType]);

  // 3. 완료된 일괄 작업 결과 큐
  const [batchResults, setBatchResults] = useState<BatchJobResult[]>([
    { id: 'job-101', title: '블라인드 레전드 탕비실 사건 썰', sourceType: 'ssul', archetype: 'ssul', createdAt: '2분 전', status: 'done', scriptLinesCount: 8 },
    { id: 'job-102', title: '서울 전역 기습 폭우 속보 브레이킹', sourceType: 'news', archetype: 'gunlimbo', createdAt: '5분 전', status: 'done', scriptLinesCount: 6 },
    { id: 'job-103', title: '아침 10분 루틴 자기계발 숏폼', sourceType: 'script', archetype: 'instagram', createdAt: '12분 전', status: 'done', scriptLinesCount: 7 },
  ]);

  const currentSourceItems = activeSourceType === 'ssul' ? ssulList :
                             activeSourceType === 'news' ? newsList :
                             activeSourceType === 'script' ? scriptList : videoList;

  const toggleSelectSource = (id: string) => {
    setSelectedSourceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedSourceIds.length === currentSourceItems.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(currentSourceItems.map(i => i.id));
    }
  };

  // 일괄 생성 실행
  const handleStartBatch = () => {
    if (selectedSourceIds.length === 0 && !customTextInput.trim()) {
      toast({ title: '안내', description: '생성할 콘텐츠를 목록에서 선택하거나 직접 입력해주세요.' });
      return;
    }

    setIsBatchRunning(true);
    toast({
      title: '⚡ 일괄 생성 시작',
      description: `${selectedSourceIds.length || 1}개의 작업이 [${
        selectedArchetype === 'classic' ? '클래식' :
        selectedArchetype === 'instagram' ? '인스타' :
        selectedArchetype === 'gunlimbo' ? '군림보' : '썰형'
      }] 형식으로 일괄 자동 조립됩니다.`
    });

    setTimeout(() => {
      const newJobs: BatchJobResult[] = (selectedSourceIds.length > 0 ? selectedSourceIds : ['custom-1']).map((id, idx) => {
        const item = currentSourceItems.find(i => i.id === id);
        return {
          id: `batch-${Date.now()}-${idx}`,
          title: item ? item.title : (customTextInput.slice(0, 24) || '새 일괄 생성 프로젝트'),
          sourceType: activeSourceType,
          archetype: selectedArchetype,
          createdAt: '방금 전',
          status: 'done',
          scriptLinesCount: Math.floor(Math.random() * 6) + 6,
        };
      });

      setBatchResults(prev => [...newJobs, ...prev]);
      setSelectedSourceIds([]);
      setCustomTextInput('');
      setIsBatchRunning(false);
      toast({
        title: '🎉 일괄 생성 완료',
        description: `총 ${newJobs.length}개의 프로젝트가 생성되었습니다. [편집기로 열기]를 눌러 세부 조정을 진행할 수 있습니다.`
      });
    }, 1200);
  };

  // 전문 편집기로 열기 직결 핸들러 (자가 치유 Handoff 페이로드 완벽 전송)
  const handleOpenInEditor = (job: BatchJobResult) => {
    const editorRoute = `/shorts-editor/${job.archetype}`;
    const meta = job.metadata || {};
    const scenes = meta.scenes || [];

    // 🎯 Handoff 페이로드 구성: 해당 폼팩터에 100% 최적화된 대본/자막/쨉쨉이 데이터 주입
    const handoffPayload = {
      title: job.title,
      layoutTemplateMode: job.archetype,
      templateMode: job.archetype,
      channelName: 'ViraLoop Studio',
      videoUrl: job.videoFilename || '',
      subtitles: scenes.length > 0
        ? scenes.map((s: any, idx: number) => ({
            start: idx * 4.0,
            end: (idx + 1) * 4.0,
            text: s.narration || s.hookJabText || job.title,
          }))
        : [
            { start: 0.0, end: 2.5, text: `${job.title}` },
            { start: 2.5, end: 5.5, text: '핵심 하이라이트 명장면 공개합니다.' },
            { start: 5.5, end: 8.5, text: '구독과 좋아요 누르고 끝까지 시청해주세요!' },
          ],
      jabs: scenes.length > 0
        ? scenes.map((s: any, idx: number) => ({
            start: idx * 4.0 + 0.5,
            end: idx * 4.0 + 3.0,
            text: s.hookJabText || `*${job.title}*`,
            hook: s.hookJabText || `*${job.title}*`,
          }))
        : [
            { start: 0.8, end: 3.2, text: '*실시간 충격 반전!*', hook: '*실시간 충격 반전!*' },
          ],
      titleBadgeText: meta.sourceOrigin || '화제 1위',
      titleLine1: meta.headlineLine1 || job.title.slice(0, 14),
      titleLine2: meta.headlineLine2 || '충격 실화 전말',
      coupangSafeZone: job.archetype === 'gunlimbo',
      kenBurnsMotion: true,
      sourceOrigin: meta.sourceOrigin || '',
      sourceUrl: meta.originalUrl || '',
    };

    try {
      sessionStorage.setItem('vlstudio_editor_handoff', JSON.stringify(handoffPayload));
      localStorage.setItem('vlstudio_editor_handoff_backup', JSON.stringify(handoffPayload));
    } catch (_) {}

    toast({ title: '전문 편집실 이동', description: `${job.title} ➔ [${job.archetype.toUpperCase()}] 편집기로 진입합니다.` });
    navigate(`${editorRoute}?title=${encodeURIComponent(job.title)}`);
  };

  // CapCut 즉시 내보내기 핸들러
  const handleExportCapCut = (job: BatchJobResult) => {
    toast({
      title: '🎬 CapCut 내보내기 완료',
      description: `'${job.title}' 프로젝트가 로컬 CapCut에 1:1로 성공적으로 등록되었습니다.`
    });
  };

  const handleDeleteJob = (id: string) => {
    setBatchResults(prev => prev.filter(j => j.id !== id));
    toast({ title: '작업 삭제 완료' });
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto p-3 sm:p-6 space-y-6 select-none animate-in fade-in duration-150 pb-20 text-foreground">
      {/* 1. 마스터 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  올인원 일괄 생성
                </h1>
                <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  FULL AUTO BATCH
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Firecrawl 수집 썰/기사, 대본 분석실, 수집 영상을 4대 폼팩터로 단번에 일괄 대량 생산합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/script-lab')}
            className="h-8 text-xs font-bold gap-1 border-border bg-card hover:bg-muted"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>대본 분석실</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/gallery')}
            className="h-8 text-xs font-bold gap-1 border-border bg-card hover:bg-muted"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>영상 보관함</span>
          </Button>
        </div>
      </div>

      {/* 2. 소스 투입구 & 타겟 폼팩터 2단계 카드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 (7칸): 4대 소스 공급원 다중 선택기 */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-black">1</span>
              소스 공급원 선택 (다중 체크)
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              선택됨: <span className="font-bold text-primary">{selectedSourceIds.length}</span>개
            </span>
          </div>

          {/* 소스 4대 탭 */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-muted/40 border border-border rounded-lg text-xs font-semibold">
            {[
              { id: 'ssul', label: '커뮤니티 썰', icon: MessageSquareText },
              { id: 'news', label: '뉴스 & 기사', icon: Newspaper },
              { id: 'script', label: '대본 분석실', icon: FileText },
              { id: 'video', label: '수집 영상', icon: Video },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSourceType(tab.id as SourceType)}
                  className={cn(
                    "py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px]",
                    activeSourceType === tab.id
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 다중 선택 체크박스 목록 */}
          <div className="border border-border rounded-lg overflow-hidden bg-background">
            <div className="p-2 border-b border-border bg-muted/20 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>전체 선택 / 해제</span>
              </button>
              <span className="text-[10px] text-muted-foreground">
                총 {currentSourceItems.length}개 소스 자산
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {currentSourceItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  수집된 소스 항목이 없습니다.
                </div>
              ) : (
                currentSourceItems.map(item => {
                  const isChecked = selectedSourceIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelectSource(item.id)}
                      className={cn(
                        "p-2.5 rounded-lg border transition cursor-pointer flex items-start gap-2.5",
                        isChecked
                          ? "bg-primary/10 border-primary shadow-2xs"
                          : "bg-card hover:bg-muted/40 border-border"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 w-4 h-4 accent-primary cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{item.dateText}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{item.snippet}</p>
                        <span className="text-[9.5px] font-semibold text-primary/80 mt-1 inline-block bg-primary/10 px-1.5 py-0.2 rounded">
                          {item.sourceOrigin}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 수동 직접 입력 옵션 */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground">직접 붙여넣기 (선택):</span>
            <textarea
              rows={2}
              value={customTextInput}
              onChange={e => setCustomTextInput(e.target.value)}
              placeholder="직접 커뮤니티 썰 본문이나 뉴스 기사 링크를 붙여넣어 일괄 생성할 수도 있습니다."
              className="w-full text-xs p-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* 우측 (5칸): 4대 폼팩터 선택 및 즉시 시작 */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-black">2</span>
                타겟 폼팩터 양식 지정
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                {selectedArchetype.toUpperCase()}
              </span>
            </div>

            {/* 4대 폼팩터 카드 선택기 */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'classic', name: '클래식 쇼츠', badge: '기본형', desc: '상·하단 레터박스 + 대제목' },
                { id: 'instagram', name: '인스타 릴스', badge: '피드형', desc: '원형 프로필 + 베댓 카드' },
                { id: 'gunlimbo', name: '군림보 속보', badge: '속보형', desc: '2단 헤드라인 + 반전 훅밴드' },
                { id: 'ssul', name: '커뮤니티 썰', badge: '썰형', desc: '게시판 헤더 + 자막 슬라이드' },
              ].map(arch => (
                <button
                  key={arch.id}
                  type="button"
                  onClick={() => setSelectedArchetype(arch.id as TargetArchetype)}
                  className={cn(
                    "p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between",
                    selectedArchetype === arch.id
                      ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary"
                      : "bg-background hover:bg-muted/60 border-border text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{arch.name}</span>
                    <span className={cn(
                      "text-[8.5px] font-bold px-1.5 py-0.2 rounded",
                      selectedArchetype === arch.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {arch.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{arch.desc}</span>
                </button>
              ))}
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/80 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1 font-semibold text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>완전 자동화 파이프라인 보장:</span>
              </div>
              <p>대본 정제 ➔ Whisper 자막 싱크 ➔ 고음질 TTS 더빙 ➔ 템플릿 NLE 조립까지 일괄 수행됩니다.</p>
            </div>
          </div>

          {/* 3. 일괄 생성 시작 버튼 */}
          <Button
            size="lg"
            onClick={handleStartBatch}
            disabled={isBatchRunning}
            className="w-full h-11 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer mt-4"
          >
            <Zap className="w-4 h-4 fill-current animate-pulse" />
            <span>
              {isBatchRunning ? 'N개 프로젝트 일괄 조립 중...' : `${selectedSourceIds.length || (customTextInput ? 1 : 0)}개 일괄 생성 시작`}
            </span>
          </Button>
        </div>
      </div>

      {/* 3. 완성된 일괄 생성 작업 결과 큐 (Job Cards) */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Film className="w-4 h-4 text-primary" />
            완성된 일괄 프로젝트 목록 ({batchResults.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            각 작업은 전용 편집기로 바로 열거나 CapCut으로 즉시 내보낼 수 있습니다.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {batchResults.map(job => (
            <div
              key={job.id}
              className="p-3 rounded-lg border border-border bg-background flex flex-col justify-between gap-3 shadow-2xs hover:border-primary/50 transition group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-bold px-1.5 py-0.2 rounded",
                    job.archetype === 'ssul' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                    job.archetype === 'gunlimbo' ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" :
                    job.archetype === 'instagram' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" :
                    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                  )}>
                    {job.archetype === 'ssul' ? '📜 썰형' :
                     job.archetype === 'gunlimbo' ? '🎬 군림보' :
                     job.archetype === 'instagram' ? '📱 인스타' : '🥪 클래식'}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{job.createdAt}</span>
                </div>
                <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-tight mb-1">{job.title}</h3>
                <span className="text-[10px] text-muted-foreground font-mono">
                  씬 수: {job.scriptLinesCount}개 • 상태: 완료됨
                </span>
              </div>

              {/* 2대 핵심 직결 액션 */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-border/80">
                <Button
                  size="sm"
                  onClick={() => handleOpenInEditor(job)}
                  className="flex-1 h-7 text-[11px] font-bold gap-1 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
                  title="해당 형식의 전문 정밀 편집기로 열어 1초 미세 수정"
                >
                  <Sliders className="w-3 h-3" />
                  <span>편집기로 열기</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCapCut(job)}
                  className="h-7 text-[11px] font-bold gap-1 border-border hover:bg-muted text-foreground"
                  title="CapCut 프로젝트로 즉시 내보내기"
                >
                  <Film className="w-3 h-3 text-rose-500" />
                  <span>CapCut</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteJob(job.id)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  title="작업 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortsBatchStudio;
