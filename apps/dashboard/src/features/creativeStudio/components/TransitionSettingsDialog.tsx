import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Film, Check } from 'lucide-react';
import { toast } from 'sonner';

export type TransitionType = 'dissolve' | 'flash_white' | 'zoom_in' | 'whip_pan' | 'glitch' | 'slide_left';

export interface TransitionPresetInfo {
  id: TransitionType;
  name: string;
  desc: string;
  effectId: string;
  resourceId: string;
  icon: string;
}

export const TRANSITION_PRESETS: TransitionPresetInfo[] = [
  { id: 'dissolve', name: '디졸브 (Dissolve)', desc: '자연스러운 페이드 전환', effectId: 'transition_dissolve', resourceId: 'res_tr_dissolve', icon: '✨' },
  { id: 'flash_white', name: '플래시 화이트 (Flash)', desc: '쇼츠 반전 강조 화이트 번쩍임', effectId: 'transition_flash_white', resourceId: 'res_tr_flash', icon: '⚡' },
  { id: 'zoom_in', name: '줌인 (Zoom In)', desc: '카메라가 전진하며 장면 이동', effectId: 'transition_zoom_in', resourceId: 'res_tr_zoom', icon: '🔍' },
  { id: 'whip_pan', name: '휩팬 (Whip Pan)', desc: '빠른 속도감의 좌우 스와이프 블러', effectId: 'transition_whip_pan', resourceId: 'res_tr_whip', icon: '💨' },
  { id: 'glitch', name: '디지털 글리치 (Glitch)', desc: '긴장감 넘치는 사이버틱 왜곡', effectId: 'transition_glitch', resourceId: 'res_tr_glitch', icon: '👾' },
  { id: 'slide_left', name: '슬라이드 (Slide Left)', desc: '화면이 옆으로 밀리며 전환', effectId: 'transition_slide_left', resourceId: 'res_tr_slide', icon: '➡️' },
];

export interface TransitionConfig {
  mode: 'random' | 'fixed' | 'none';
  fixedType: TransitionType;
  durationSec: number; // 0.3 ~ 1.0 (s)
  randomPool: TransitionType[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TransitionConfig;
  onChange: (config: TransitionConfig) => void;
}

export const TransitionSettingsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  config,
  onChange,
}) => {
  const [local, setLocal] = useState<TransitionConfig>(config);

  const update = (patch: Partial<TransitionConfig>) => {
    setLocal(prev => ({ ...prev, ...patch }));
  };

  const togglePoolItem = (id: TransitionType) => {
    const current = new Set(local.randomPool);
    if (current.has(id)) {
      if (current.size > 1) current.delete(id); // 최소 1개는 유지
      else toast.warning('스마트 랜덤 풀에는 최소 1개 이상의 트랜지션이 필요합니다.');
    } else {
      current.add(id);
    }
    update({ randomPool: Array.from(current) });
  };

  const handleSave = () => {
    onChange(local);
    onOpenChange(false);
    toast.success('씬 전환 트랜지션 설정이 저장되었습니다.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
            🎬 씬 전환 트랜지션 (Transitions) 설정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 모드 선택 라디오 */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 font-semibold">트랜지션 적용 모드</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => update({ mode: 'random' })}
                className={`py-2 px-2.5 rounded-lg border text-xs flex flex-col items-center gap-1 transition ${
                  local.mode === 'random'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>🎲 스마트 랜덤</span>
              </button>

              <button
                type="button"
                onClick={() => update({ mode: 'fixed' })}
                className={`py-2 px-2.5 rounded-lg border text-xs flex flex-col items-center gap-1 transition ${
                  local.mode === 'fixed'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Film className="w-4 h-4 text-blue-400" />
                <span>🎯 단일 고정</span>
              </button>

              <button
                type="button"
                onClick={() => update({ mode: 'none' })}
                className={`py-2 px-2.5 rounded-lg border text-xs flex flex-col items-center gap-1 transition ${
                  local.mode === 'none'
                    ? 'bg-red-600/20 border-red-500 text-red-300 font-bold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="text-sm">⛔</span>
                <span>미적용 (컷편집)</span>
              </button>
            </div>
          </div>

          {/* 전환 시간 조절 */}
          {local.mode !== 'none' && (
            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>기본 전환 시간 (Duration)</span>
                <span className="font-mono text-blue-400 font-bold">{local.durationSec}초</span>
              </div>
              <Slider
                min={0.2}
                max={1.0}
                step={0.1}
                value={[local.durationSec]}
                onValueChange={([v]) => update({ durationSec: Number(v.toFixed(1)) })}
              />
            </div>
          )}

          {/* 스마트 랜덤 풀 선택 */}
          {local.mode === 'random' && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-semibold">스마트 랜덤 풀 (다양하게 믹스)</Label>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITION_PRESETS.map((p) => {
                  const isChecked = local.randomPool.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePoolItem(p.id)}
                      className={`p-2 rounded-lg border text-left text-xs flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-slate-800 border-blue-500/80 text-slate-100 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{p.icon}</span>
                        <span className="truncate">{p.name.split(' ')[0]}</span>
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 단일 고정 선택 */}
          {local.mode === 'fixed' && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-semibold">적용할 단일 트랜지션 선택</Label>
              <Select value={local.fixedType} onValueChange={(v) => update({ fixedType: v as TransitionType })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-xs text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {TRANSITION_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
export default TransitionSettingsDialog;
