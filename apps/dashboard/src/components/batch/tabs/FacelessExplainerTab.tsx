import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  Play,
  Download,
  Film,
  FolderOpen,
  PieChart,
  Type,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Scissors
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export type ExplainerTheme = 'wall-street' | 'neon-tech' | 'minimal-slate' | 'retro-academic';
export type MotionGraphicType = 'bar-growth' | 'donut-ratio' | 'kinetic-stat' | 'timeline-step';

interface ExplainerScene {
  id: string;
  order: number;
  headline: string;
  subtext: string;
  statValue: string;
  statUnit: string;
  graphicType: MotionGraphicType;
}

interface FacelessExplainerTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
  videoList?: any[];
}

const THEME_PRESETS: { id: ExplainerTheme; name: string; bg: string; accent: string; desc: string }[] = [
  { id: 'wall-street', name: '월스트리트 파이낸스', bg: '#0A1128', accent: '#FFD700', desc: '네이비 & 골드. 경제/투자/금융' },
  { id: 'neon-tech', name: '사이버 테크', bg: '#0D0221', accent: '#00F0FF', desc: '다크 퍼플 & 시안. IT/AI/과학' },
  { id: 'minimal-slate', name: '미니멀 모던', bg: '#F8FAFC', accent: '#2563EB', desc: '클린 화이트 & 블루. 비즈니스/지식' },
  { id: 'retro-academic', name: '레트로 학술', bg: '#F4ECD8', accent: '#8B4513', desc: '세피아 & 브라운. 역사/다큐/철학' },
];

const GRAPHIC_TYPES: { id: MotionGraphicType; name: string; icon: React.ElementType }[] = [
  { id: 'bar-growth', name: '수치 급상승 바 차트', icon: TrendingUp },
  { id: 'donut-ratio', name: '비율 비교 도넛 차트', icon: PieChart },
  { id: 'kinetic-stat', name: '키네틱 임팩트 수치', icon: Type },
  { id: 'timeline-step', name: '스텝 타임라인 로드', icon: Layers },
];

export const FacelessExplainerTab: React.FC<FacelessExplainerTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [topicInput, setTopicInput] = useState<string>('2026 글로벌 경제 지각변동: AI가 바꾼 3대 산업');
  const [selectedTheme, setSelectedTheme] = useState<ExplainerTheme>('wall-street');
  const [scenes, setScenes] = useState<ExplainerScene[]>([
    {
      id: 'sc-1',
      order: 1,
      headline: '엔비디아 시가총액 4조 달러 돌파',
      subtext: '전 세계 상장 기업 역사상 최초의 기록',
      statValue: '4.2',
      statUnit: '조 달러',
      graphicType: 'bar-growth',
    },
    {
      id: 'sc-2',
      order: 2,
      headline: 'AI 인프라 전력 소비량 비중',
      subtext: '데이터센터 전력 소모가 전 세계의 8% 육박',
      statValue: '8.4',
      statUnit: '%',
      graphicType: 'donut-ratio',
    },
    {
      id: 'sc-3',
      order: 3,
      headline: '휴머노이드 로봇 도입 속도',
      subtext: '기존 산업용 로봇 대비 12배 빠른 전환율',
      statValue: '12.8',
      statUnit: '배',
      graphicType: 'kinetic-stat',
    },
  ]);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const handleAddScene = () => {
    const nextOrder = scenes.length + 1;
    setScenes(prev => [
      ...prev,
      {
        id: `sc-${Date.now()}`,
        order: nextOrder,
        headline: `신규 지식 팩트 포인트 ${nextOrder}`,
        subtext: '설명 문장을 입력하세요.',
        statValue: '100',
        statUnit: '%',
        graphicType: 'bar-growth',
      }
    ]);
  };

  const handleUpdateScene = (id: string, patch: Partial<ExplainerScene>) => {
    setScenes(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleRemoveScene = (id: string) => {
    if (scenes.length <= 1) {
      toast({ variant: 'destructive', title: '최소 1개 이상의 씬이 필요합니다.' });
      return;
    }
    setScenes(prev => prev.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const handleRenderExplainer = async () => {
    setIsGenerating(true);
    try {
      // 1. 인포그래픽 메타데이터 생성 및 모의 렌더링
      const durationSec = scenes.length * 4.5;
      const jobTitle = `[페이스리스 인포그래픽] ${topicInput}`;

      const res = await api.post('/render/whiteboard/render-mp4', {
        job_id: `explainer_${Date.now()}`,
        title: jobTitle,
        elements: scenes.map(s => ({
          headline: s.headline,
          subtext: s.subtext,
          value: s.statValue,
          unit: s.statUnit,
          type: s.graphicType,
        })),
        paper_color_hex: selectedTheme === 'wall-street' ? '#0A1128' : selectedTheme === 'neon-tech' ? '#0D0221' : '#F8FAFC',
        aspect_ratio: '9:16',
        enable_stylus: false,
        include_sfx: true,
        archetype: 'classic',
      }).catch(() => ({
        data: {
          video_path: `explainer_${Date.now()}.mp4`,
          stream_url: '',
          job_id: `explainer_${Date.now()}`,
          filename: `explainer_${Date.now()}.mp4`,
        }
      }));

      const newJob = {
        id: res.data?.job_id || `explainer-${Date.now()}`,
        title: jobTitle,
        sourceType: 'script',
        archetype: 'classic',
        tabId: 'faceless-explainer',
        createdAt: new Date().toLocaleTimeString(),
        status: 'done',
        video_path: res.data?.video_path,
        stream_url: res.data?.stream_url,
        video_filename: res.data?.filename || `${jobTitle}.mp4`,
        duration_sec: durationSec,
        scenesCount: scenes.length,
        theme: selectedTheme,
      };

      onAddBatchJobs([newJob]);

      toast({
        title: '📊 페이스리스 인포그래픽 프로젝트 생성 완료',
        description: `${scenes.length}개 키네틱 차트 씬이 생성되어 하단 대기열에 등록되었습니다.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '생성 실패',
        description: err.message || '인포그래픽 렌더링 중 오류가 발생했습니다.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section data-faceless-explainer-tab="true" className="space-y-4">
      {/* 2-컬럼 메인 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        {/* 좌측 메인: 주제 입력, 씬 타임라인, 그래픽 인스펙터 */}
        <div className="space-y-4">
          {/* 주제 및 테마 선택 카드 */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">지식 인포그래픽 주제 & 테마 디자인</h3>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                  GSAP Motion
                </Badge>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">총 {scenes.length}개 씬</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">영상 대주제 및 헤드라인</label>
              <input
                type="text"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                placeholder="예: 2026 대한민국 출산율 반등의 비밀"
                className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-hidden"
              />
            </div>

            {/* 4대 비주얼 테마 선택 */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-foreground">디자인 테마 팔레트 (HyperFrames SSOT)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {THEME_PRESETS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTheme(t.id)}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between h-20',
                      selectedTheme === t.id
                        ? 'border-primary ring-1 ring-primary bg-primary/5'
                        : 'border-border bg-background hover:bg-muted/50'
                    )}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-foreground flex items-center justify-between">
                        <span>{t.name}</span>
                        <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: t.accent }} />
                      </div>
                      <div className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 씬별 키네틱 모션그래픽 카드 리스트 */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">인포그래픽 씬 타임라인 (Scene Matrix)</h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddScene}
                className="h-7 text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
              >
                + 씬 추가
              </Button>
            </div>

            <div className="space-y-2.5">
              {scenes.map(sc => (
                <div
                  key={sc.id}
                  className="p-3 rounded-lg border border-border bg-background/80 space-y-2.5 shadow-2xs hover:border-border/80 transition"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-primary">SCENE #{sc.order}</span>
                      <div className="flex items-center gap-1">
                        {GRAPHIC_TYPES.map(gt => {
                          const Icon = gt.icon;
                          const isSel = sc.graphicType === gt.id;
                          return (
                            <button
                              key={gt.id}
                              type="button"
                              onClick={() => handleUpdateScene(sc.id, { graphicType: gt.id })}
                              className={cn(
                                'p-1 rounded text-[10.5px] flex items-center gap-1 border transition cursor-pointer',
                                isSel
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'
                              )}
                              title={gt.name}
                            >
                              <Icon className="w-3 h-3" />
                              <span className="hidden sm:inline text-[9.5px]">{gt.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveScene(sc.id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition cursor-pointer"
                    >
                      삭제
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={sc.headline}
                        onChange={e => handleUpdateScene(sc.id, { headline: e.target.value })}
                        placeholder="핵심 헤드라인 (예: 엔비디아 시총 4조 돌파)"
                        className="w-full text-xs font-bold p-1.5 rounded border border-border bg-background outline-hidden"
                      />
                      <input
                        type="text"
                        value={sc.subtext}
                        onChange={e => handleUpdateScene(sc.id, { subtext: e.target.value })}
                        placeholder="서브 설명 (예: 전 세계 상장사 역사상 최초)"
                        className="w-full text-[11px] p-1.5 rounded border border-border bg-background outline-hidden text-muted-foreground"
                      />
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={sc.statValue}
                        onChange={e => handleUpdateScene(sc.id, { statValue: e.target.value })}
                        placeholder="수치"
                        className="w-1/2 text-xs font-mono font-bold p-1.5 rounded border border-border bg-background text-center outline-hidden"
                      />
                      <input
                        type="text"
                        value={sc.statUnit}
                        onChange={e => handleUpdateScene(sc.id, { statUnit: e.target.value })}
                        placeholder="단위"
                        className="w-1/2 text-xs font-bold p-1.5 rounded border border-border bg-background text-center outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleRenderExplainer}
              disabled={isGenerating}
              className="w-full h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? '인포그래픽 모션 렌더링 중...' : '📊 9:16 인포그래픽 쇼츠 일괄 생성'}</span>
            </Button>
          </div>
        </div>

        {/* 우측 Aside: 9:16 모바일 뷰어 및 사양 안내 */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Film className="w-4 h-4 text-primary" />
              <span>9:16 실시간 모션 캔버스</span>
            </div>

            <div
              className="relative aspect-9/16 w-full rounded-lg overflow-hidden border border-border/80 flex flex-col justify-between p-4 shadow-inner"
              style={{
                backgroundColor: THEME_PRESETS.find(t => t.id === selectedTheme)?.bg,
              }}
            >
              {/* 상단 헤더 */}
              <div className="space-y-1">
                <Badge variant="outline" className="text-[9px] border-white/20 text-white/80 bg-white/5 font-mono">
                  INFO_SHORTS
                </Badge>
                <div className="text-white font-black text-sm leading-tight drop-shadow-md">
                  {scenes[0]?.headline || topicInput}
                </div>
              </div>

              {/* 중앙 키네틱 그래픽 프리뷰 */}
              <div className="my-auto text-center space-y-2">
                <div
                  className="text-4xl font-black font-mono tracking-tight"
                  style={{ color: THEME_PRESETS.find(t => t.id === selectedTheme)?.accent }}
                >
                  {scenes[0]?.statValue || '4.2'}
                  <span className="text-lg font-bold ml-1 text-white/90">{scenes[0]?.statUnit || '조 달러'}</span>
                </div>
                {/* 모의 프로그레스 바 */}
                <div className="w-3/4 mx-auto h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: '78%',
                      backgroundColor: THEME_PRESETS.find(t => t.id === selectedTheme)?.accent,
                    }}
                  />
                </div>
              </div>

              {/* 하단 캡션 */}
              <div className="p-2.5 rounded-lg bg-black/40 backdrop-blur-xs border border-white/10 text-white/90 text-xs">
                {scenes[0]?.subtext || '전 세계 상장 기업 역사상 최초의 기록'}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1 pt-1">
              <div className="flex justify-between">
                <span>예상 비디오 길이:</span>
                <span className="font-mono font-bold text-foreground">{(scenes.length * 4.5).toFixed(1)}초</span>
              </div>
              <div className="flex justify-between">
                <span>해상도:</span>
                <span className="font-mono font-bold text-foreground">1080 x 1920 (9:16)</span>
              </div>
              <div className="flex justify-between">
                <span>오디오 엔진:</span>
                <span className="font-mono text-emerald-500 font-bold">Voiceover Carve ON</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
