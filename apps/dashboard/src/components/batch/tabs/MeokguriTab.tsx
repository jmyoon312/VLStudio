import React, { useState } from 'react';
import {
  Utensils,
  Upload,
  Sparkles,
  Volume2,
  Maximize2,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Zap,
  Smile,
  Disc,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface MeokguriTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const MeokguriTab: React.FC<MeokguriTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [mukbangTitle, setMukbangTitle] = useState<string>('극강의 바삭함 통닭다리 ASMR 먹방');
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>('https://www.youtube.com/watch?v=mukbang-sample');
  const [videoFileName, setVideoFileName] = useState<string>('');

  // 먹구리 특화 파라미터 (게인 증폭 & 줌 팝)
  const [gainBoostDb, setGainBoostDb] = useState<number>(6); // +3dB ~ +12dB
  const [zoomPopIntensity, setZoomPopIntensity] = useState<'mild' | 'punch' | 'bounce'>('punch');
  const [audioLimiter, setAudioLimiter] = useState<boolean>(true); // 오디오 찢어짐 방지

  // 효과음(SFX) 시퀀서
  const [sfxPresets, setSfxPresets] = useState([
    { id: 'crunch', name: '바삭! (치킨/튀김 크런치)', enabled: true, icon: '🍗' },
    { id: 'gulp', name: '꿀꺽! (시원한 탄산/삼킴)', enabled: true, icon: '🥤' },
    { id: 'boing', name: '띠용! (반전 리액션)', enabled: true, icon: '👀' },
    { id: 'cheer', name: '우와! (감탄사 환호)', enabled: false, icon: '🎉' },
  ]);

  // 스티커 오버레이
  const [stickerType, setStickerType] = useState<'pepe' | 'emoji' | 'text-badge'>('pepe');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileName(file.name);
      setMukbangTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast({ title: '먹방 영상 로드 완료', description: `'${file.name}' 파일이 등록되었습니다.` });
    }
  };

  const toggleSfx = (id: string) => {
    setSfxPresets(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleStartMeokguriBatch = async () => {
    setIsGenerating(true);
    try {
      const activeSfx = sfxPresets.filter(s => s.enabled).map(s => s.name);
      const newJob = {
        id: `meokguri-${Date.now()}`,
        title: `[먹구리ASMR] ${mukbangTitle}`,
        sourceType: 'video',
        archetype: 'gunlimbo',
        tabId: 'meokguri',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: 4,
        metadata: {
          gainBoostDb,
          zoomPopIntensity,
          stickerType,
          activeSfx,
          scenes: [
            { order: 1, narration: '소리 극대화! 씹는 순간 터지는 바삭한 ASMR', hookJabText: `*+${gainBoostDb}dB 증폭*` },
            { order: 2, narration: '줌 팝 펀치와 함께 실시간 리액션 스티커가 작동합니다.', hookJabText: '*바삭바삭*' },
            { order: 3, narration: '시청자 청각을 사로잡는 먹방 쇼츠 완성.', hookJabText: '*침샘 자극*' },
          ]
        }
      };

      onAddBatchJobs([newJob]);
      toast({
        title: '🍗 먹구리형 쇼츠 생성 완료',
        description: `'${mukbangTitle}' ASMR 증폭 쇼츠가 대기열에 등록되었습니다.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '생성 오류', description: e.message || '오류가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 (4칸): 영상 소스 및 오디오 증폭 게인 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-primary" />
              먹방 ASMR 게인 & 줌 팝 엔진
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              MEOKGURI FX
            </Badge>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground block">먹방/ASMR 원본 영상</label>
            <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs text-foreground transition">
              <Upload className="w-4 h-4 text-primary" />
              <span className="truncate">{videoFileName || '먹방 영상 선택'}</span>
              <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <input
              type="text"
              value={videoSourceUrl}
              onChange={e => setVideoSourceUrl(e.target.value)}
              placeholder="https://www.youtube.com/..."
              className="w-full text-xs p-2 rounded-lg border border-border bg-background"
            />
          </div>

          {/* 오디오 게인 증폭 슬라이더 */}
          <div className="space-y-2 pt-2 border-t border-border text-xs">
            <div className="flex justify-between">
              <span className="font-bold text-foreground">씹는 소리 게인 증폭:</span>
              <span className="font-mono text-primary font-bold">+{gainBoostDb} dB</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="1"
              value={gainBoostDb}
              onChange={e => setGainBoostDb(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-foreground">오디오 클리핑 방지 리미터</span>
              <input
                type="checkbox"
                checked={audioLimiter}
                onChange={e => setAudioLimiter(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* 줌 팝 모션 강도 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-muted-foreground block">줌 팝(Zoom-Pop) 모션 강도</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'mild', label: '미세 줌 (1.1x)' },
                { id: 'punch', label: '타격 줌 (1.25x)' },
                { id: 'bounce', label: '바운스 (1.4x)' },
              ].map(z => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setZoomPopIntensity(z.id as any)}
                  className={cn(
                    "p-2 rounded-lg border text-center text-xs transition cursor-pointer font-bold",
                    zoomPopIntensity === z.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 중앙 및 우측 (8칸): SFX 시퀀서 & 리액션 스티커 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">먹방 전용 효과음(SFX) & 시각 리액션</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                AUDIO DUCKING & SFX
              </Badge>
            </div>

            {/* SFX 시퀀서 체크박스 그리드 */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground block">자동 트리거 효과음 시퀀서</label>
              <div className="grid grid-cols-2 gap-2">
                {sfxPresets.map(sfx => (
                  <div
                    key={sfx.id}
                    onClick={() => toggleSfx(sfx.id)}
                    className={cn(
                      "p-3 rounded-xl border transition cursor-pointer flex items-center justify-between",
                      sfx.enabled
                        ? "bg-primary/10 border-primary text-primary shadow-2xs font-bold"
                        : "bg-muted/20 border-border text-foreground hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span>{sfx.icon}</span>
                      <span>{sfx.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sfx.enabled}
                      onChange={() => {}}
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 리액션 스티커 테마 */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-[11px] font-bold text-muted-foreground block">리액션 오버레이 스티커</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pepe', label: '🐸 페페 밈 스티커', desc: '감탄하는 페페, 군침 페페' },
                  { id: 'emoji', label: '😋 3D 푸드 이모지', desc: '눈 돌아간 이모티콘 팝' },
                  { id: 'text-badge', label: '⭐ 감탄사 텍스트 밴드', desc: '"미쳤다!", "극락"' },
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStickerType(st.id as any)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition cursor-pointer",
                      stickerType === st.id ? "bg-primary/10 border-primary text-primary font-bold" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="text-xs">{st.label}</div>
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleStartMeokguriBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Utensils className="w-4 h-4" />
              <span>먹구리형 ASMR 줌 팝 쇼츠 생성 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
