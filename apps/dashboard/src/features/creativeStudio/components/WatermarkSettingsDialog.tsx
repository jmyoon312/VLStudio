import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Sparkles, Image as ImageIcon, Type, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export type AnchorPosition = 'top-left' | 'top-center' | 'top-right' | 'mid-left' | 'center' | 'mid-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface WatermarkConfig {
  enabled: boolean;
  type: 'image' | 'text';
  // Image
  imageUrl: string;
  imagePath?: string;
  autoRemoveBg: boolean;
  badgeMask: 'none' | 'circle' | 'rounded';
  colorKeying: 'none' | 'white' | 'black';
  // Text
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textShadow: boolean;
  textStroke: boolean;
  // Common
  position: AnchorPosition;
  scale: number; // 5 ~ 40 (%)
  opacity: number; // 10 ~ 100 (%)
  marginX: number; // px
  marginY: number; // px
  durationMode: 'full' | 'intro';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WatermarkConfig;
  onChange: (config: WatermarkConfig) => void;
}

export const WatermarkSettingsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  config,
  onChange,
}) => {
  const [local, setLocal] = useState<WatermarkConfig>(config);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<WatermarkConfig>) => {
    setLocal(prev => ({ ...prev, ...patch }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      update({ imageUrl: dataUrl, enabled: true });
      toast.success('로고 이미지가 등록되었습니다.');
    };
    reader.readAsDataURL(file);
  };

  // 클라이언트 사이드 캔버스 단색 배경 투명화 (Fast Keying)
  const applyColorKeying = (keyType: 'white' | 'black') => {
    if (!local.imageUrl) return;
    setIsRemovingBg(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = local.imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsRemovingBg(false);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (keyType === 'white') {
          // 밝은 흰색 계열 투명화
          if (r > 230 && g > 230 && b > 230) {
            data[i + 3] = 0;
          }
        } else if (keyType === 'black') {
          // 어두운 검은색 계열 투명화
          if (r < 30 && g < 30 && b < 30) {
            data[i + 3] = 0;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const transparentDataUrl = canvas.toDataURL('image/png');
      update({ imageUrl: transparentDataUrl, colorKeying: keyType });
      setIsRemovingBg(false);
      toast.success(`${keyType === 'white' ? '흰색' : '검은색'} 배경이 투명화되었습니다!`);
    };
    img.onerror = () => {
      setIsRemovingBg(false);
      toast.error('이미지 처리 실패');
    };
  };

  const handleSave = () => {
    onChange(local);
    onOpenChange(false);
    toast.success('워터마크 설정이 저장되었습니다.');
  };

  const positions: { key: AnchorPosition; label: string }[] = [
    { key: 'top-left', label: '↖ 좌상단' },
    { key: 'top-center', label: '↑ 상단중앙' },
    { key: 'top-right', label: '↗ 우상단' },
    { key: 'mid-left', label: '← 좌중앙' },
    { key: 'center', label: '• 정중앙' },
    { key: 'mid-right', label: '→ 우중앙' },
    { key: 'bottom-left', label: '↙ 좌하단' },
    { key: 'bottom-center', label: '↓ 하단중앙' },
    { key: 'bottom-right', label: '↘ 우하단' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-slate-900 border-slate-700 text-slate-100 p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              🏷️ 채널 브랜딩 워터마크 & 로고 오버레이
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-300">사용 여부</Label>
              <Switch
                checked={local.enabled}
                onCheckedChange={(checked) => update({ enabled: checked })}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Tabs value={local.type} onValueChange={(v) => update({ type: v as 'image' | 'text' })}>
            <TabsList className="grid grid-cols-2 bg-slate-800 border border-slate-700">
              <TabsTrigger value="image" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <ImageIcon className="w-4 h-4" /> 이미지 로고
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Type className="w-4 h-4" /> 텍스트 워터마크
              </TabsTrigger>
            </TabsList>

            {/* 이미지 로고 탭 */}
            <TabsContent value="image" className="space-y-4 pt-2">
              <div className="flex items-center gap-4 bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                <div className="w-20 h-20 bg-slate-950/80 rounded-lg border border-dashed border-slate-600 flex items-center justify-center overflow-hidden relative group">
                  {local.imageUrl ? (
                    <>
                      <img src={local.imageUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                      <button
                        onClick={() => update({ imageUrl: '' })}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-xs border-slate-600 text-slate-200"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> 로고 이미지 업로드 (PNG/JPG)
                  </Button>

                  {local.imageUrl && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isRemovingBg}
                        onClick={() => applyColorKeying('white')}
                        className="flex-1 text-[11px] h-7 bg-slate-700 hover:bg-slate-600 text-slate-200"
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-amber-400" /> 흰색 배경 제거
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isRemovingBg}
                        onClick={() => applyColorKeying('black')}
                        className="flex-1 text-[11px] h-7 bg-slate-700 hover:bg-slate-600 text-slate-200"
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-blue-400" /> 검은색 배경 제거
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 뱃지 마스크 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-300 mb-1.5 block">모양 마스킹 (Shape)</Label>
                  <Select value={local.badgeMask} onValueChange={(v) => update({ badgeMask: v as any })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-xs h-8 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                      <SelectItem value="none">원본 그대로</SelectItem>
                      <SelectItem value="circle">원형 (Circle Badge)</SelectItem>
                      <SelectItem value="rounded">둥근 사각형 (Rounded)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-300 mb-1.5 block">노출 구간</Label>
                  <Select value={local.durationMode} onValueChange={(v) => update({ durationMode: v as any })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-xs h-8 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                      <SelectItem value="full">전체 영상 내내 노출</SelectItem>
                      <SelectItem value="intro">인트로(초반 3초)만 노출</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* 텍스트 워터마크 탭 */}
            <TabsContent value="text" className="space-y-3 pt-2">
              <div>
                <Label className="text-xs text-slate-300 mb-1 block">채널 텍스트 / 핸들</Label>
                <Input
                  value={local.text}
                  onChange={(e) => update({ text: e.target.value, enabled: true })}
                  placeholder="@MyChannel_Official"
                  className="bg-slate-800 border-slate-700 text-xs text-slate-200 h-8"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-400 mb-1 block">글자색</Label>
                  <Input
                    type="color"
                    value={local.textColor}
                    onChange={(e) => update({ textColor: e.target.value })}
                    className="bg-slate-800 border-slate-700 h-8 p-1 cursor-pointer"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-400 mb-1 block">글자 크기 (pt)</Label>
                  <Input
                    type="number"
                    min={12}
                    max={64}
                    value={local.fontSize}
                    onChange={(e) => update({ fontSize: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-700 text-xs text-slate-200 h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-400 mb-1 block">외곽선/그림자</Label>
                  <div className="flex gap-2 pt-1.5">
                    <label className="text-[11px] flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={local.textStroke}
                        onChange={(e) => update({ textStroke: e.target.checked })}
                      /> 외곽선
                    </label>
                    <label className="text-[11px] flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={local.textShadow}
                        onChange={(e) => update({ textShadow: e.target.checked })}
                      /> 그림자
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 9방향 앵커 위치 및 스케일 공통 설정 */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-300 mb-2 block font-semibold">화면 9방향 배치</Label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                {positions.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => update({ position: p.key })}
                    className={`h-8 text-[10px] rounded flex items-center justify-center font-medium transition ${
                      local.position === p.key
                        ? 'bg-blue-600 text-white font-bold shadow'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {p.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>크기 (Scale)</span>
                  <span className="font-mono text-blue-400">{local.scale}%</span>
                </div>
                <Slider
                  min={5}
                  max={40}
                  step={1}
                  value={[local.scale]}
                  onValueChange={([v]) => update({ scale: v })}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>투명도 (Opacity)</span>
                  <span className="font-mono text-blue-400">{local.opacity}%</span>
                </div>
                <Slider
                  min={10}
                  max={100}
                  step={5}
                  value={[local.opacity]}
                  onValueChange={([v]) => update({ opacity: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-400 mb-1 block">X 여백 (px)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={local.marginX}
                    onChange={(e) => update({ marginX: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-700 text-xs text-slate-200 h-7"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-400 mb-1 block">Y 여백 (px)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={local.marginY}
                    onChange={(e) => update({ marginY: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-700 text-xs text-slate-200 h-7"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
            취소
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
            설정 저장 및 적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default WatermarkSettingsDialog;
