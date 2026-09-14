import React from 'react';
import { Camera, Sparkles, CheckCircle2, Image as ImageIcon, Sliders, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { INSTA_PROFILE_PRESETS } from '../constants/canvasConstants';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { NleLayerTransform } from '@/types/nle';

export interface InstaProfileInspectorFormProps {
  instaConfig: {
    profileName: string;
    profileHandle: string;
    profileAvatarUrl: string;
    isVerified?: boolean;
    [key: string]: any;
  };
  setInstaConfig: React.Dispatch<React.SetStateAction<any>>;
  profileTransform?: NleLayerTransform;
  setProfileTransform?: React.Dispatch<React.SetStateAction<any>>;
}

export const InstaProfileInspectorForm: React.FC<InstaProfileInspectorFormProps> = ({
  instaConfig,
  setInstaConfig,
  profileTransform,
  setProfileTransform,
}) => {
  const { toast } = useToast();

  const handleRandomPreset = () => {
    const randomIndex = Math.floor(Math.random() * INSTA_PROFILE_PRESETS.length);
    const chosen = INSTA_PROFILE_PRESETS[randomIndex];
    setInstaConfig((prev: any) => ({
      ...prev,
      profileName: chosen.name,
      profileHandle: chosen.handle,
      profileAvatarUrl: chosen.avatar,
    }));
    toast({
      title: '🎲 프로필 프리셋 적용',
      description: `${chosen.name} (${chosen.handle}) 추천 프로필이 적용되었습니다.`,
    });
  };

  const handleRandomAvatar = () => {
    const seeds = ['fox', 'cat', 'bear', 'star', 'spark', 'lion', 'panda', 'cyber', 'robot', 'neo', 'echo'];
    const seed = seeds[Math.floor(Math.random() * seeds.length)] + '_' + Math.floor(Math.random() * 1000);
    setInstaConfig((prev: any) => ({
      ...prev,
      profileAvatarUrl: `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`,
    }));
  };

  return (
    <div className="space-y-3">
      {/* 1. 프로필 정보 & 추천 프리셋 */}
      <div className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-pink-500" />
            인스타 프로필 아이덴티티
          </label>
          <button
            type="button"
            onClick={handleRandomPreset}
            className="px-1.5 py-0.5 text-[9.5px] font-semibold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
            title="10대 추천 프로필 중 하나를 랜덤으로 적용합니다"
          >
            <Sparkles className="w-3 h-3" />
            🎲 랜덤 프리셋
          </button>
        </div>

        {/* 10대 추천 프리셋 드롭다운 */}
        <div>
          <select
            className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[3px] cursor-pointer"
            value=""
            onChange={(e) => {
              const val = e.target.value;
              const found = INSTA_PROFILE_PRESETS.find((p) => p.name === val);
              if (found) {
                setInstaConfig((prev: any) => ({
                  ...prev,
                  profileName: found.name,
                  profileHandle: found.handle,
                  profileAvatarUrl: found.avatar,
                }));
              }
            }}
          >
            <option value="" disabled>-- 10대 추천 프로필 프리셋 선택 --</option>
            {INSTA_PROFILE_PRESETS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name} ({preset.handle})
              </option>
            ))}
          </select>
        </div>

        {/* 닉네임 & 아이디 (@핸들) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[9.5px] font-semibold text-muted-foreground block mb-0.5">프로필 닉네임</span>
            <input
              type="text"
              value={instaConfig.profileName || ''}
              onChange={(e) => setInstaConfig((prev: any) => ({ ...prev, profileName: e.target.value }))}
              placeholder="사용자명"
              className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px] focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <span className="text-[9.5px] font-semibold text-muted-foreground block mb-0.5">아이디 (@핸들)</span>
            <input
              type="text"
              value={instaConfig.profileHandle || ''}
              onChange={(e) => setInstaConfig((prev: any) => ({ ...prev, profileHandle: e.target.value }))}
              placeholder="@아이디"
              className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px] focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* 아바타 이미지 URL & 미리보기 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9.5px] text-muted-foreground">
            <span className="font-semibold flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              아바타 이미지 URL
            </span>
            <button
              type="button"
              onClick={handleRandomAvatar}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              🎲 랜덤 아바타
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 shrink-0 border border-border flex items-center justify-center">
              <img
                src={instaConfig.profileAvatarUrl || "https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue"}
                alt="Avatar Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://api.dicebear.com/9.x/lorelei/svg?seed=user_fallback";
                }}
              />
            </div>
            <input
              type="text"
              value={instaConfig.profileAvatarUrl || ''}
              onChange={(e) => setInstaConfig((prev: any) => ({ ...prev, profileAvatarUrl: e.target.value }))}
              placeholder="https://... 이미지 링크"
              className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px] focus:outline-hidden focus:ring-1 focus:ring-primary font-mono text-[10px]"
            />
          </div>
        </div>

        {/* 파란색 공식 인증 뱃지 (Blue Check) */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 fill-sky-500/20" />
            <span>공식 인증 뱃지 (파란 딱지)</span>
          </span>
          <Switch
            checked={!!instaConfig.isVerified}
            onCheckedChange={(c) => setInstaConfig((prev: any) => ({ ...prev, isVerified: c }))}
          />
        </div>
      </div>

      {/* 2. 🎨 프로필 텍스트 & 박스 스타일 (외곽선, 그림자, 배경박스 표준 세트) */}
      <div className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            프로필 텍스트 및 박스 스타일
          </label>
        </div>

        {/* 닉네임 글자 색상 */}
        <ColorPicker8Preset
          label="닉네임 글자 색상"
          value={instaConfig.profileNameColor || '#2563EB'}
          onChange={(val) => setInstaConfig((prev: any) => ({ ...prev, profileNameColor: val }))}
        />

        {/* 닉네임 글자 크기 */}
        <UnitSliderControl
          label="닉네임 글자 크기"
          value={instaConfig.profileNameSize ?? 14}
          min={10}
          max={28}
          step={1}
          unit="px"
          onChange={(val) => setInstaConfig((prev: any) => ({ ...prev, profileNameSize: val }))}
        />

        {/* 글자 외곽선 (테두리) */}
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground">글자 테두리 (외곽선)</span>
            <Switch
              checked={!!instaConfig.profileStrokeEnabled}
              onCheckedChange={(c) => setInstaConfig((prev: any) => ({ ...prev, profileStrokeEnabled: c }))}
            />
          </div>
          {instaConfig.profileStrokeEnabled && (
            <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
              <UnitSliderControl
                label="외곽선 두께"
                value={instaConfig.profileStrokeWidth ?? 2}
                min={1}
                max={6}
                step={1}
                unit="px"
                onChange={(v) => setInstaConfig((prev: any) => ({ ...prev, profileStrokeWidth: v }))}
              />
              <ColorPicker8Preset
                label="외곽선 색상"
                value={instaConfig.profileStrokeColor || '#000000'}
                onChange={(c) => setInstaConfig((prev: any) => ({ ...prev, profileStrokeColor: c }))}
              />
            </div>
          )}
        </div>

        {/* 입체 그림자 */}
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground">글자 입체 그림자</span>
            <Switch
              checked={!!instaConfig.profileShadowEnabled}
              onCheckedChange={(c) => setInstaConfig((prev: any) => ({ ...prev, profileShadowEnabled: c }))}
            />
          </div>
          {instaConfig.profileShadowEnabled && (
            <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
              <UnitSliderControl
                label="그림자 흐림"
                value={instaConfig.profileShadowBlur ?? 4}
                min={0}
                max={16}
                step={1}
                unit="px"
                onChange={(v) => setInstaConfig((prev: any) => ({ ...prev, profileShadowBlur: v }))}
              />
              <ColorPicker8Preset
                label="그림자 색상"
                value={instaConfig.profileShadowColor || 'rgba(0,0,0,0.6)'}
                onChange={(c) => setInstaConfig((prev: any) => ({ ...prev, profileShadowColor: c }))}
              />
            </div>
          )}
        </div>

        {/* 프로필 배경 박스 & 모서리 둥글기 */}
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground">프로필 배경 박스 (필)</span>
            <Switch
              checked={!!instaConfig.profileBoxEnabled}
              onCheckedChange={(c) => setInstaConfig((prev: any) => ({ ...prev, profileBoxEnabled: c }))}
            />
          </div>
          {instaConfig.profileBoxEnabled && (
            <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
              <ColorPicker8Preset
                label="배경 박스 색상"
                value={instaConfig.profileBoxColor || 'rgba(255,255,255,0.85)'}
                onChange={(c) => setInstaConfig((prev: any) => ({ ...prev, profileBoxColor: c }))}
              />
              <UnitSliderControl
                label="모서리 둥글기"
                value={instaConfig.profileBorderRadius ?? 20}
                min={0}
                max={30}
                step={2}
                unit="px"
                onChange={(v) => setInstaConfig((prev: any) => ({ ...prev, profileBorderRadius: v }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. 📐 프로필 위치 및 크기 조절 (프로필 트랜스폼 연동) */}
      {profileTransform && setProfileTransform && (
        <div className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              프로필 크기 및 위치
            </label>
            <button
              type="button"
              onClick={() => {
                setProfileTransform((prev: any) => ({ ...prev, xPct: 6.0, yPct: 4.5, scale: 1.0 }));
              }}
              className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
              title="기본 위치로 초기화"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              초기화
            </button>
          </div>

          <UnitSliderControl
            label="프로필 크기 (배율)"
            value={Math.round((profileTransform.scale ?? 1.0) * 100)}
            min={50}
            max={200}
            step={5}
            unit="%"
            onChange={(val) => {
              setProfileTransform((prev: any) => ({ ...prev, scale: Math.round(val) / 100 }));
            }}
          />

          <UnitSliderControl
            label="수평 위치 (X좌표)"
            value={Math.round(profileTransform.xPct ?? 6)}
            min={2}
            max={50}
            step={1}
            unit="%"
            onChange={(val) => {
              setProfileTransform((prev: any) => ({ ...prev, xPct: val }));
            }}
          />

          <UnitSliderControl
            label="수직 위치 (Y좌표)"
            value={Math.round(profileTransform.yPct ?? 4.5)}
            min={1}
            max={20}
            step={0.5}
            unit="%"
            onChange={(val) => {
              setProfileTransform((prev: any) => ({ ...prev, yPct: val }));
            }}
          />
        </div>
      )}
    </div>
  );
};

export default InstaProfileInspectorForm;
