import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Search, Sparkles, Loader2, ArrowRight, Video } from 'lucide-react';
import api from '@/lib/api';
import { TemplateManifest } from '@/types/templateDna';

const YoutubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface ForensicUrlExtractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyManifest: (manifest: TemplateManifest) => void;
}

export const ForensicUrlExtractModal: React.FC<ForensicUrlExtractModalProps> = ({
  isOpen,
  onClose,
  onApplyManifest,
}) => {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [extractedManifest, setExtractedManifest] = useState<TemplateManifest | null>(null);

  const handleExtract = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: 'URL을 입력해주세요',
        description: '분석할 유튜브 쇼츠 영상 링크를 입력해야 합니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setExtractedManifest(null);

    try {
      const res = await api.post('/channel-dna/templates/extract-from-url', {
        video_url: videoUrl.trim(),
      });

      if (res.data?.success && res.data?.manifest) {
        const manifest = res.data.manifest as TemplateManifest;
        setExtractedManifest(manifest);
        toast({
          title: '포렌식 분석 완료!',
          description: `[${manifest.archetype?.toUpperCase() || '쇼츠'}] 지오메트리 및 폰트/색상 DNA가 성공적으로 추출되었습니다.`,
        });
      } else {
        throw new Error(res.data?.message || '템플릿 DNA 추출에 실패했습니다.');
      }
    } catch (err: any) {
      toast({
        title: '포렌식 분석 실패',
        description: err.response?.data?.detail || err.message || '영상 분석 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!extractedManifest) return;
    onApplyManifest(extractedManifest);
    onClose();
    toast({
      title: '템플릿 디자인 공방에 주입 완료',
      description: '추출된 레이아웃 및 폰트, 컬러 규격이 캔버스에 즉시 반영되었습니다.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border border-border text-card-foreground shadow-2xl p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <YoutubeIcon className="w-5 h-5 text-red-500" />
            <span>레퍼런스 쇼츠 1초 발골기 (Forensic)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            벤치마킹하고 싶은 유튜브 쇼츠 링크를 넣으면, 상하단 바 색상, 폰트, 자막 위치, 지오메트리를 역공학 추출합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">유튜브 쇼츠 URL</label>
            <div className="flex gap-2">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/shorts/..."
                className="text-xs h-9 bg-background border-border"
                disabled={isLoading}
              />
              <Button
                size="sm"
                onClick={handleExtract}
                disabled={isLoading}
                className="h-9 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 shadow-xs"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{isLoading ? '발골 중...' : '발골'}</span>
              </Button>
            </div>
          </div>

          {/* 추출 결과 미리보기 카드 */}
          {extractedManifest && (
            <div className="p-3 bg-muted/50 border border-border rounded-md space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-border/80">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {extractedManifest.name || '추출된 템플릿'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase">
                  {extractedManifest.archetype}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <span className="block text-[10px] text-muted-foreground/70">타이틀 폰트:</span>
                  <span className="font-medium text-foreground">{extractedManifest.typography?.titleFontFamily || 'Pretendard'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground/70">자막 폰트:</span>
                  <span className="font-medium text-foreground">{extractedManifest.typography?.subtitleFontFamily || 'Pretendard'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground/70">상단바 컬러:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div
                      className="w-3 h-3 rounded border border-border"
                      style={{ backgroundColor: extractedManifest.colorTheme?.primaryBgColor || '#000000' }}
                    />
                    <span className="font-mono text-[10px] text-foreground">{extractedManifest.colorTheme?.primaryBgColor || '#000000'}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground/70">포커스 액센트:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div
                      className="w-3 h-3 rounded border border-border"
                      style={{ backgroundColor: extractedManifest.colorTheme?.accentColor || '#FFE500' }}
                    />
                    <span className="font-mono text-[10px] text-foreground">{extractedManifest.colorTheme?.accentColor || '#FFE500'}</span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleApply}
                className="w-full mt-2 h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                <span>현재 캔버스에 즉시 적용</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForensicUrlExtractModal;
