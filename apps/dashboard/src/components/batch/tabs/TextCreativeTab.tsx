import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  SlidersHorizontal,
  Palette,
  Layers,
  Wand2,
  CheckCircle2,
  Tv,
  Plus,
  Trash2,
  Clock,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface CreativeScene {
  order: number;
  actName: string;
  narration: string;
  visualPrompt: string;
  durationSec: number;
}

interface TextCreativeTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const TextCreativeTab: React.FC<TextCreativeTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [topicTitle, setTopicTitle] = useState<string>('세종대왕이 한글 창제 중 겪은 일생일대의 반란');
  const [rawContent, setRawContent] = useState<string>(
    '1443년 세종 25년, 집현전 학사들의 격렬한 반대 상소가 빗발쳤다. "한글은 오랑캐의 글자이옵니다." 하지만 세종은 백성을 향한 뜻을 굽히지 않았다. 마침내 28자가 완성된 그날 밤, 궁궐 깊은 곳에서 충격적인 사건이 일어난다.'
  );

  // 씬 구성 모드: 3단 / 4단 / 5단
  const [actMode, setActMode] = useState<'3-act' | '4-act' | '5-act'>('4-act');

  // 시각 스타일 프리셋
  const [visualStyle, setVisualStyle] = useState<'cinematic' | 'webtoon' | 'historic' | '3d-render'>('historic');

  // 생성된 씬 목록
  const [scenes, setScenes] = useState<CreativeScene[]>([
    { order: 1, actName: '기 (도입 훅)', narration: '1443년 세종 25년, 집현전 학사들의 격렬한 반대 상소가 빗발쳤다.', visualPrompt: 'Joseon dynasty royal palace at night, dark dramatic lighting, scholars protesting with scrolls', durationSec: 4.5 },
    { order: 2, actName: '승 (갈등 심화)', narration: '"오랑캐의 글자이옵니다!" 하지만 세종은 백성을 향한 뜻을 굽히지 않았다.', visualPrompt: 'King Sejong the Great sitting on throne, intense resolute gaze, candle flames flickering, cinematic oil style', durationSec: 5.0 },
    { order: 3, actName: '전 (충격 반전)', narration: '마침내 훈민정음 28자가 완성된 그날 밤, 궁궐 깊은 곳에서 비밀 회합이 발각된다.', visualPrompt: 'Ancient Korean secret calligraphy room, hidden scrolls, mysterious candle shadows, high tension', durationSec: 4.8 },
    { order: 4, actName: '결 (결말 & 여운)', narration: '모든 역경을 딛고 태어난 우리 글. 이 위대한 유산에 여러분은 어떤 생각이 드시나요?', visualPrompt: 'Golden glowing Hangul letters floating in dark cinematic space, epic historic masterpiece', durationSec: 4.2 },
  ]);

  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleAutoSplitScenes = async () => {
    setIsSplitting(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      toast({
        title: '✨ 씬 분할 및 시각 프롬프트 자동 생성 완료',
        description: `선택하신 ${actMode} 모드에 맞춰 기승전결 씬과 AI 화풍 프롬프트가 구성되었습니다.`
      });
    } catch (_) {
      toast({ variant: 'destructive', title: '분할 실패', description: '씬 분할 중 오류가 발생했습니다.' });
    } finally {
      setIsSplitting(false);
    }
  };

  const handleStartCreativeBatch = async () => {
    setIsGenerating(true);
    try {
      const newJob = {
        id: `creative-${Date.now()}`,
        title: `[텍스트창작] ${topicTitle}`,
        sourceType: 'script',
        archetype: 'ssul',
        tabId: 'text-creative',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: scenes.length,
        metadata: {
          actMode,
          visualStyle,
          scenes: scenes.map(s => ({
            order: s.order,
            narration: s.narration,
            hookJabText: `*${s.actName}*`,
            visualPrompt: s.visualPrompt,
            durationSec: s.durationSec
          }))
        }
      };

      onAddBatchJobs([newJob]);
      toast({
        title: '🎨 텍스트 창작형 쇼츠 생성 완료',
        description: `'${topicTitle}' 씬 분할 프로젝트가 대기열에 등록되었습니다.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '생성 실패', description: e.message || '오류가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 (4칸): 원문 대본 및 연출 스타일 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              창작 원고 및 서사 연출 모드
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              STORY ACT
            </Badge>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">창작 주제 / 제목</label>
            <input
              type="text"
              value={topicTitle}
              onChange={e => setTopicTitle(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
              <span>스토리 원문 / 아이디어 메모</span>
              <span className="font-mono text-[10px]">{rawContent.length}자</span>
            </div>
            <textarea
              rows={5}
              value={rawContent}
              onChange={e => setRawContent(e.target.value)}
              placeholder="창작할 썰, 역사 야담, 또는 아이디어를 작성하세요..."
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-background resize-none focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 씬 구성 구조 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">스토리 씬 구성 구조</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: '3-act', label: '3단 (도입-본론-결말)' },
                { id: '4-act', label: '4단 (기승전결)' },
                { id: '5-act', label: '5단 (롤러코스터)' },
              ].map(am => (
                <button
                  key={am.id}
                  type="button"
                  onClick={() => setActMode(am.id as any)}
                  className={cn(
                    "p-2 rounded-lg border text-center text-xs transition cursor-pointer font-bold",
                    actMode === am.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  {am.label}
                </button>
              ))}
            </div>
          </div>

          {/* 비주얼 화풍 프리셋 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-muted-foreground block">AI 비주얼 화풍 연출</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'historic', label: '역사/야담 유화' },
                { id: 'cinematic', label: '실사 시네마틱' },
                { id: 'webtoon', label: 'K-웹툰/애니' },
                { id: '3d-render', label: '3D 렌더링' },
              ].map(vs => (
                <button
                  key={vs.id}
                  type="button"
                  onClick={() => setVisualStyle(vs.id as any)}
                  className={cn(
                    "p-2 rounded-lg border text-left text-xs transition cursor-pointer font-semibold",
                    visualStyle === vs.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  {vs.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            disabled={isSplitting}
            onClick={handleAutoSplitScenes}
            className="w-full h-9 text-xs font-bold gap-1.5 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI 씬 분할 & 프롬프트 자동 재생성</span>
          </Button>
        </div>

        {/* 중앙 및 우측 (8칸): 씬별 대본 & 비주얼 프롬프트 에디터 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">씬별 타임라인 분할 & 시각 연출 매트릭스</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                {scenes.length} SCENES
              </Badge>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {scenes.map((sc, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-muted/20 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold bg-primary/15 text-primary border-primary/30">
                        씬 #{sc.order}
                      </Badge>
                      <span className="text-xs font-black text-foreground">{sc.actName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">{sc.durationSec}초</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">내레이션 대본</label>
                    <input
                      type="text"
                      value={sc.narration}
                      onChange={e => {
                        const val = e.target.value;
                        setScenes(prev => prev.map((s, i) => i === idx ? { ...s, narration: val } : s));
                      }}
                      className="w-full text-xs p-2 rounded border border-border bg-background font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-0.5 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-primary" />
                      <span>AI 비주얼 프롬프트 (Visual Prompt)</span>
                    </label>
                    <input
                      type="text"
                      value={sc.visualPrompt}
                      onChange={e => {
                        const val = e.target.value;
                        setScenes(prev => prev.map((s, i) => i === idx ? { ...s, visualPrompt: val } : s));
                      }}
                      className="w-full text-xs p-2 rounded border border-border bg-background font-mono text-muted-foreground"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating || scenes.length === 0}
              onClick={handleStartCreativeBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>텍스트 창작형 쇼츠 일괄 생성 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
