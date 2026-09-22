import React, { useState, useRef } from 'react';
import { ShieldAlert, Trash2, X, Plus, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { BlurRegion } from '@/types/ranking';
import { cn } from '@/lib/utils';

interface RankingBlurMaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  rank: number;
  itemTitle: string;
  thumbnailUrl?: string;
  blurRegions: BlurRegion[];
  onSaveBlurRegions: (regions: BlurRegion[]) => void;
}

export const RankingBlurMaskModal: React.FC<RankingBlurMaskModalProps> = ({
  isOpen,
  onClose,
  rank,
  itemTitle,
  thumbnailUrl,
  blurRegions,
  onSaveBlurRegions
}) => {
  const [regions, setRegions] = useState<BlurRegion[]>(blurRegions);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (regions.length >= 4) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const left = Math.min(startPoint.x, currentX);
    const top = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);

    setCurrentBox({ x: left, y: top, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentBox(null);
      return;
    }

    if (currentBox.width > 3 && currentBox.height > 3) {
      const newRegion: BlurRegion = {
        id: `blur-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        x: Math.round(currentBox.x),
        y: Math.round(currentBox.y),
        width: Math.round(currentBox.width),
        height: Math.round(currentBox.height),
        strength: 50
      };
      setRegions(prev => [...prev, newRegion].slice(0, 4));
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentBox(null);
  };

  const handleDeleteRegion = (id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
  };

  const handleStrengthChange = (id: string, strength: number) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, strength } : r));
  };

  const handleSave = () => {
    onSaveBlurRegions(regions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
              {rank}
            </span>
            <span className="font-bold text-sm text-foreground">
              {rank}위 [{itemTitle}] 씬 영역 가림 (블러 마스크)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 캔버스 및 가림 목록 영역 */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto">
          {/* 좌측 9:16 인터랙션 캔버스 (7칸) */}
          <div className="md:col-span-7 flex flex-col items-center">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative w-[240px] h-[426px] bg-slate-900 rounded-xl overflow-hidden cursor-crosshair border border-border select-none shadow-md"
            >
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover pointer-events-none" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-4 text-center">
                  <span>미리보기 화면 위에서 마우스를 드래그하여 가릴 곳을 사각형으로 칠하세요</span>
                </div>
              )}

              {/* 저장된 블러 영역 표시 */}
              {regions.map((reg, idx) => (
                <div
                  key={reg.id}
                  style={{
                    left: `${reg.x}%`,
                    top: `${reg.y}%`,
                    width: `${reg.width}%`,
                    height: `${reg.height}%`,
                  }}
                  className="absolute border-2 border-primary bg-primary/30 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white pointer-events-none"
                >
                  <span className="bg-primary/80 px-1 rounded">{idx + 1}</span>
                </div>
              ))}

              {/* 현재 드로잉 중인 사각형 */}
              {currentBox && (
                <div
                  style={{
                    left: `${currentBox.x}%`,
                    top: `${currentBox.y}%`,
                    width: `${currentBox.width}%`,
                    height: `${currentBox.height}%`,
                  }}
                  className="absolute border-2 border-amber-400 bg-amber-400/30 pointer-events-none animate-pulse"
                />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              마우스 드래그로 사각형을 그리면 블러가 적용됩니다. (최대 4곳)
            </p>
          </div>

          {/* 우측 블러 설정 리스트 (5칸) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                가림 영역 목록 ({regions.length}/4)
              </span>
              {regions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRegions([])}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition cursor-pointer"
                >
                  모두 지우기
                </button>
              )}
            </div>

            {regions.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                지정된 가림 영역이 없습니다.
                <br />좌측 화면에서 사각형을 그려주세요.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {regions.map((reg, idx) => (
                  <div key={reg.id} className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">가림 {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRegion(reg.id)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-muted-foreground">블러 세기</span>
                      <span className="font-bold text-primary tabular-nums">{reg.strength}%</span>
                    </div>
                    <Slider
                      value={[reg.strength]}
                      min={10}
                      max={100}
                      step={5}
                      onValueChange={([val]) => handleStrengthChange(reg.id, val)}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[10.5px] text-muted-foreground leading-relaxed">
              💡 <strong>가린 곳은 완성본에서도 흐려집니다.</strong> 순위표와 자막은 가림 위에 또렷하게 올라갑니다.
            </div>
          </div>
        </div>

        {/* 하단 버튼 바 */}
        <div className="p-3 border-t border-border flex justify-end gap-2 bg-muted/10">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs font-semibold cursor-pointer">
            취소
          </Button>
          <Button type="button" size="sm" onClick={handleSave} className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
            가림 영역 저장
          </Button>
        </div>
      </div>
    </div>
  );
};
