import React from 'react';
import {
  Layout, Sparkles, Wand2, RefreshCw, Layers, Check, ExternalLink,
  Sliders, Palette, Type, Shield, Image, Search, Plus, Trash2, ArrowUpRight,
  FolderOpen, Music, Split, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { MemeAvatar, MEME_EMOTION_PRESETS, MemeType, MemeEmotion } from '@/components/memeAssets';
import {
  LayoutTemplateMode,
  SsulTextMode,
  ScriptSplitPreset,
  BgmMood,
  INSTA_PROFILE_PRESETS,
  PEPE_MEMES,
  IRASUTOYA_MEMES,
  rgbaToHex,
  getRandomSatiricalMetadata,
} from '../constants/canvasConstants';

export interface TemplateInspectorFormProps {
  [key: string]: any;
}

export const TemplateInspectorForm: React.FC<TemplateInspectorFormProps> = (props) => {
  const {
    layoutTemplateMode,
    handleSelectTemplateMode,
    handleOpenTemplateLibrary,
    instaConfig,
    setInstaConfig,
    gunlimboConfig,
    setGunlimboConfig,
    ssulConfig,
    setSsulConfig,
    profileTransform,
    setProfileTransform,
    topTitleText,
    setTopTitleText,
    titleTransform,
    setTitleTransform,
    topTitleFontSize,
    setTopTitleFontSize,
    topTitleColor,
    setTopTitleColor,
    commentCard,
    setCommentCard,
    commentTransform,
    setCommentTransform,
    hasCommentCard,
    setHasCommentCard,
    handleInsertMeme,
    handleSearchWebImages,
    handleGenerateFlowImage,
    isWebImageSearchOpen,
    setIsWebImageSearchOpen,
    selectedBgmMood,
    setSelectedBgmMood,
    autoMoodMatching,
    setAutoMoodMatching,
    setIsBgmModalOpen,
    scriptSplitPreset,
    setScriptSplitPreset,
    activeInspectorTab,
    setActiveInspectorTab,
    selectedLayerId,
    setSelectedLayerId,
    layers,
    setLayers,
  } = props;

  const navigate = useNavigate();
  const { toast } = useToast();
  const setTopTitleYPct = props.setTopTitleYPct || (() => {});
  const titleFontFamily = props.titleFontFamily || 'Pretendard';
  const setTitleFontFamily = props.setTitleFontFamily || (() => {});
  const setSubtitleConfig = props.setSubtitleConfig || (() => {});
  const subTransform = props.subTransform || { xPct: 50, yPct: 75, scale: 1.0, rotationDeg: 0, zIndex: 30 };
  const setSubTransform = props.setSubTransform || (() => {});
  const setSubtitleYPercent = props.setSubtitleYPercent || (() => {});
  const setWebImageQuery = props.setWebImageQuery || (() => {});
  const isGeneratingFlowImage = props.isGeneratingFlowImage ?? false;

  return (
<div className="space-y-3.5">
                {/* 4대 폼팩터 선택 카드 및 라이브러리 연동 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Layout className="w-3.5 h-3.5 text-primary" />
                      바이럴 숏폼 4대 폼팩터
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenTemplateLibrary}
                        className="h-6 px-1.5 text-[10px] gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Sparkles className="w-3 h-3" />
                        라이브러리
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/shorts-template-studio')}
                        className="h-6 px-1.5 text-[10px] gap-1 font-medium text-muted-foreground hover:text-foreground"
                      >
                        공방 <ExternalLink className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'classic', name: '기본형', badge: 'Standard', desc: '상·하단 색상 배경바' },
                      { id: 'instagram', name: '인스타형', badge: 'Viral Hole', desc: '구멍 뚫린 카드 + 댓글' },
                      { id: 'gunlimbo', name: '군림보형', badge: 'Hook Zoom', desc: '0초 줌인 + 3줄 속보' },
                      { id: 'ssul', name: '썰형', badge: 'Meme Story', desc: '커뮤니티 + 페페 밈 모션' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleSelectTemplateMode(mode.id as LayoutTemplateMode)}
                        className={cn(
                          "p-2 text-left rounded-[4px] border transition cursor-pointer flex flex-col justify-between",
                          layoutTemplateMode === mode.id
                            ? "bg-primary/10 border-primary text-primary shadow-xs"
                            : "bg-card hover:bg-muted/60 border-border text-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs">{mode.name}</span>
                          <span className="text-[8px] font-bold px-1 py-0.2 rounded-[2px] bg-primary/20 text-primary uppercase">
                            {mode.badge}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-muted-foreground mt-1 truncate">{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 폼팩터별 세부 설정 */}
                {layoutTemplateMode === 'classic' && (
                  <div className="p-3 rounded-[6px] border border-primary/25 bg-card space-y-3 shadow-xs">
                    {/* 상단 타이틀 & 뱃지 */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-[11.5px] font-bold text-foreground flex items-center gap-1.5">
                        <Layout className="w-3.5 h-3.5 text-primary" />
                        기본형 (Classic / Sandwich) 세부 설정
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        상·하단 레터박스
                      </span>
                    </div>

                    {/* 1. 상단 배경 바 & 대제목 빠른 제어 */}
                    <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-foreground">👑 상단 배경 바 & 타이틀</span>
                        <button
                          type="button"
                          onClick={() => setActiveInspectorTab('titleSource')}
                          className="text-[9.5px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          상세 설정 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-muted-foreground block mb-0.5">상단 바 배경색</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={rgbaToHex(props.topBarBg, '#000000')}
                              onChange={(e) => props.setTopBarBg?.(e.target.value)}
                              className="w-5 h-5 p-0 border border-border rounded cursor-pointer"
                            />
                            <span className="font-mono text-muted-foreground">{props.topBarBg || '#000000'}</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>높이 비율</span>
                            <span>{Math.round(props.topBarHeightPct || 18.3)}%</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={35}
                            step={0.5}
                            value={props.topBarHeightPct || 18.3}
                            onChange={(e) => props.setTopBarHeightPct?.(Number(e.target.value))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-muted-foreground block mb-1">대제목 텍스트</span>
                        <input
                          type="text"
                          value={props.topTitleText || ''}
                          onChange={(e) => props.setTopTitleText?.(e.target.value)}
                          placeholder="상단 대제목 입력"
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded font-bold"
                        />
                      </div>
                    </div>

                    {/* 2. 하단 배경 바 & 출처 표기 */}
                    <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-foreground">🏷️ 하단 배경 바 & 출처</span>
                        <button
                          type="button"
                          onClick={() => setActiveInspectorTab('titleSource')}
                          className="text-[9.5px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          상세 설정 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-muted-foreground block mb-0.5">하단 바 배경색</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={rgbaToHex(props.bottomBarBg, '#000000')}
                              onChange={(e) => props.setBottomBarBg?.(e.target.value)}
                              className="w-5 h-5 p-0 border border-border rounded cursor-pointer"
                            />
                            <span className="font-mono text-muted-foreground">{props.bottomBarBg || '#000000'}</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>높이 비율</span>
                            <span>{Math.round(props.bottomBarHeightPct || 6.0)}%</span>
                          </div>
                          <input
                            type="range"
                            min={2}
                            max={20}
                            step={0.5}
                            value={props.bottomBarHeightPct || 6.0}
                            onChange={(e) => props.setBottomBarHeightPct?.(Number(e.target.value))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-muted-foreground block mb-1">하단 출처 문구</span>
                        <input
                          type="text"
                          value={props.bottomSourceText || ''}
                          onChange={(e) => props.setBottomSourceText?.(e.target.value)}
                          placeholder="출처: YouTube @채널명"
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded"
                        />
                      </div>
                    </div>

                    {/* 3. 본문 자막 빠른 제어 */}
                    <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-foreground">💬 본문 자막 위치 & 서체</span>
                        <button
                          type="button"
                          onClick={() => setActiveInspectorTab('style')}
                          className="text-[9.5px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          상세 설정 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>자막 Y 위치</span>
                            <span>{Math.round(subTransform?.yPct ?? 78)}%</span>
                          </div>
                          <input
                            type="range"
                            min={50}
                            max={90}
                            step={0.5}
                            value={subTransform?.yPct ?? 78}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSubTransform((prev: any) => ({ ...(prev || subTransform), yPct: val }));
                              setSubtitleYPercent(val);
                            }}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>자막 배율</span>
                            <span>{(subTransform?.scale ?? 1.0).toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.6}
                            step={0.05}
                            value={subTransform?.scale ?? 1.0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSubTransform((prev: any) => ({ ...(prev || subTransform), scale: val }));
                            }}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {layoutTemplateMode === 'instagram' && (
                  <div className="p-3 rounded-[6px] border border-primary/25 bg-card space-y-3 shadow-xs">
                    {/* 상단 타이틀 & 레이어 바로가기 */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-[11.5px] font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        인스타형 (Hole-Punch) 원형 세부 설정
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        인스타 표준 숏폼
                      </span>
                    </div>

                    {/* 빠른 레이어 포커스 바 */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLayerId('layer_insta_profile');
                          setActiveInspectorTab('template');
                          document.getElementById('insta-sec-profile')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded border transition-colors",
                          selectedLayerId === 'layer_insta_profile'
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                        )}
                      >
                        프로필
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLayerId('layer_title');
                          setActiveInspectorTab('template');
                          document.getElementById('insta-sec-title')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded border transition-colors",
                          (selectedLayerId === 'layer_title' || selectedLayerId === 'layer_top_title')
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                        )}
                      >
                        대제목
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLayerId('layer_video');
                          setActiveInspectorTab('template');
                          document.getElementById('insta-sec-hole')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded border transition-colors",
                          selectedLayerId === 'layer_video'
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                        )}
                      >
                        구멍 윈도우
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLayerId('layer_sub');
                          setActiveInspectorTab('template');
                          document.getElementById('insta-sec-sub')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded border transition-colors",
                          (selectedLayerId === 'layer_sub' || selectedLayerId === 'layer_subtitle')
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                        )}
                      >
                        본문 자막
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLayerId('layer_comment_card');
                          setActiveInspectorTab('template');
                          setHasCommentCard(true);
                          document.getElementById('insta-sec-comment')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded border transition-colors",
                          selectedLayerId === 'layer_comment_card'
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                        )}
                      >
                        댓글 카드
                      </button>
                    </div>

                    {/* 1. 프로필 정보 & 10대 추천 프리셋 */}
                    <div id="insta-sec-profile" className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-bold text-foreground flex items-center gap-1">
                          📸 프로필 아이덴티티
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const randomIndex = Math.floor(Math.random() * INSTA_PROFILE_PRESETS.length);
                            const chosen = INSTA_PROFILE_PRESETS[randomIndex];
                            setInstaConfig(prev => ({
                              ...prev,
                              profileName: chosen.name,
                              profileHandle: chosen.handle,
                              profileAvatarUrl: chosen.avatar,
                            }));
                            toast({
                              title: '🎲 프로필 프리셋 적용',
                              description: `${chosen.name} (${chosen.handle}) 추천 프로필이 적용되었습니다.`,
                            });
                          }}
                          className="px-1.5 py-0.5 text-[9.5px] font-semibold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          🎲 랜덤 추천
                        </button>
                      </div>

                      {/* 10선 드롭다운 셀렉트 */}
                      <div>
                        <select
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[3px] cursor-pointer"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = INSTA_PROFILE_PRESETS.find(p => p.name === val);
                            if (found) {
                              setInstaConfig(prev => ({
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

                      {/* 닉네임 / 핸들 수동 입력 */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <span className="text-[9px] text-muted-foreground block mb-0.5">프로필 닉네임</span>
                          <input
                            type="text"
                            value={instaConfig.profileName}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, profileName: e.target.value }))}
                            placeholder="사용자명"
                            className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px]"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block mb-0.5">아이디 (@핸들)</span>
                          <input
                            type="text"
                            value={instaConfig.profileHandle}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, profileHandle: e.target.value }))}
                            placeholder="@아이디"
                            className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px]"
                          />
                        </div>
                      </div>

                      {/* 아바타 이미지 URL & 랜덤 교체 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>아바타 이미지 URL</span>
                          <button
                            type="button"
                            onClick={() => {
                              const seeds = ['fox', 'cat', 'bear', 'star', 'spark', 'lion', 'panda', 'cyber', 'robot'];
                              const seed = seeds[Math.floor(Math.random() * seeds.length)] + '_' + Math.floor(Math.random() * 100);
                              setInstaConfig(prev => ({
                                ...prev,
                                profileAvatarUrl: `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`
                              }));
                            }}
                            className="text-primary hover:underline font-semibold"
                          >
                            아바타 무작위 변경
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <img
                            src={instaConfig.profileAvatarUrl || "https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue"}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full border border-border object-cover shrink-0"
                          />
                          <input
                            type="text"
                            value={instaConfig.profileAvatarUrl}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, profileAvatarUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full px-2 py-0.5 text-[11px] bg-background border border-border rounded-[2px] font-mono"
                          />
                        </div>
                      </div>

                      {/* 인증 마크 & 프로필 크기/위치 */}
                      <div className="pt-1.5 border-t border-border/50 grid grid-cols-4 gap-2 items-center">
                        <label className="flex items-center gap-1.5 text-[10px] cursor-pointer col-span-1">
                          <input
                            type="checkbox"
                            checked={instaConfig.isVerified}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, isVerified: e.target.checked }))}
                            className="rounded accent-primary cursor-pointer"
                          />
                          <span>인증 뱃지</span>
                        </label>
                        <div className="col-span-1">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>X 위치</span>
                            <span>{Math.round(profileTransform.xPct)}%</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={40}
                            step={0.5}
                            value={profileTransform.xPct}
                            onChange={(e) => setProfileTransform(prev => ({ ...prev, xPct: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div className="col-span-1">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>Y 위치</span>
                            <span>{Math.round(profileTransform.yPct)}%</span>
                          </div>
                          <input
                            type="range"
                            min={2}
                            max={20}
                            step={0.5}
                            value={profileTransform.yPct}
                            onChange={(e) => setProfileTransform(prev => ({ ...prev, yPct: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div className="col-span-1">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>크기</span>
                            <span>{profileTransform.scale.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.4}
                            step={0.05}
                            value={profileTransform.scale}
                            onChange={(e) => setProfileTransform(prev => ({ ...prev, scale: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. 대제목 텍스트 (SSOT: topTitleText) */}
                    <div id="insta-sec-title" className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-bold text-foreground">
                          ✍️ 좌측 정렬 대제목 (헤드라인)
                        </label>
                        <span className="text-[9px] text-muted-foreground">엔터로 줄바꿈</span>
                      </div>
                      <textarea
                        rows={2}
                        value={topTitleText}
                        onChange={(e) => {
                          setTopTitleText(e.target.value);
                          setInstaConfig(prev => ({ ...prev, titleText: e.target.value }));
                        }}
                        placeholder="제목을\n입력하세요"
                        className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px] resize-none font-bold leading-tight"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>대제목 X 위치</span>
                            <span>{Math.round(titleTransform.xPct)}%</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={40}
                            step={0.5}
                            value={titleTransform.xPct}
                            onChange={(e) => setTitleTransform(prev => ({ ...prev, xPct: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>대제목 Y 위치</span>
                            <span>{Math.round(titleTransform.yPct)}%</span>
                          </div>
                          <input
                            type="range"
                            min={8}
                            max={26}
                            step={0.5}
                            value={titleTransform.yPct}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTitleTransform(prev => ({ ...prev, yPct: val }));
                              setTopTitleYPct(val);
                            }}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>글자 크기</span>
                            <span>{titleTransform.scale.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.5}
                            step={0.05}
                            value={titleTransform.scale}
                            onChange={(e) => setTitleTransform(prev => ({ ...prev, scale: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block mb-0.5">폰트 서체</span>
                          <select
                            value={titleFontFamily}
                            onChange={(e) => setTitleFontFamily(e.target.value)}
                            className="w-full px-1.5 py-0.5 text-[10.5px] bg-background border border-border rounded cursor-pointer"
                          >
                            <option value="Pretendard">Pretendard (산세리프)</option>
                            <option value="GmarketSansBold">Gmarket Sans (볼드)</option>
                            <option value="Black Han Sans">Black Han Sans (울트라)</option>
                            <option value="Noto Sans KR">Noto Sans KR</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 3. 중앙 구멍 윈도우 (Hole Window) 정밀 지오메트리 */}
                    <div id="insta-sec-hole" className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-bold text-foreground flex items-center gap-1">
                          🕳️ 중앙 구멍 윈도우 (미디어 클리핑 영역)
                        </label>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {instaConfig.holeWidthPct}% × {instaConfig.holeHeightPct}%
                        </span>
                      </div>

                      {/* 비율 프리셋 원클릭 버튼 */}
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          type="button"
                          onClick={() => setInstaConfig(prev => ({
                            ...prev,
                            holeRatio: '1:1',
                            holeWidthPct: 88,
                            holeHeightPct: 46,
                            holeYPct: 45,
                          }))}
                          className={cn(
                            "py-1 text-[9.5px] rounded border transition-colors font-medium",
                            instaConfig.holeRatio === '1:1'
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-background border-border hover:bg-accent"
                          )}
                        >
                          1:1 정사각
                        </button>
                        <button
                          type="button"
                          onClick={() => setInstaConfig(prev => ({
                            ...prev,
                            holeRatio: '4:5',
                            holeWidthPct: 92,
                            holeHeightPct: 54,
                            holeYPct: 46,
                          }))}
                          className={cn(
                            "py-1 text-[9.5px] rounded border transition-colors font-medium",
                            instaConfig.holeRatio === '4:5'
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-background border-border hover:bg-accent"
                          )}
                        >
                          4:5 세로형
                        </button>
                        <button
                          type="button"
                          onClick={() => setInstaConfig(prev => ({
                            ...prev,
                            holeRatio: 'custom',
                            holeWidthPct: 94,
                            holeHeightPct: 32,
                            holeYPct: 42,
                          }))}
                          className={cn(
                            "py-1 text-[9.5px] rounded border transition-colors font-medium",
                            instaConfig.holeRatio === 'custom' && instaConfig.holeHeightPct <= 35
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-background border-border hover:bg-accent"
                          )}
                        >
                          16:9 와이드
                        </button>
                        <button
                          type="button"
                          onClick={() => setInstaConfig(prev => ({
                            ...prev,
                            holeRatio: 'custom',
                            holeWidthPct: 96,
                            holeHeightPct: 46,
                            holeYPct: 44,
                          }))}
                          className={cn(
                            "py-1 text-[9.5px] rounded border transition-colors font-medium",
                            instaConfig.holeRatio === 'custom' && instaConfig.holeWidthPct === 96
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-background border-border hover:bg-accent"
                          )}
                        >
                          풀너비 (96%)
                        </button>
                      </div>

                      {/* 슬라이더 4종: Y위치, 너비, 높이, 라운드 */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>중심 Y 위치</span>
                            <span>{instaConfig.holeYPct}%</span>
                          </div>
                          <input
                            type="range"
                            min={25}
                            max={65}
                            step={0.5}
                            value={instaConfig.holeYPct}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, holeYPct: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>모서리 라운드</span>
                            <span>{instaConfig.holeRoundness}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={36}
                            value={instaConfig.holeRoundness}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, holeRoundness: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>윈도우 너비</span>
                            <span>{instaConfig.holeWidthPct}%</span>
                          </div>
                          <input
                            type="range"
                            min={60}
                            max={98}
                            step={0.5}
                            value={instaConfig.holeWidthPct}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, holeRatio: 'custom', holeWidthPct: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>윈도우 높이</span>
                            <span>{instaConfig.holeHeightPct}%</span>
                          </div>
                          <input
                            type="range"
                            min={20}
                            max={65}
                            step={0.5}
                            value={instaConfig.holeHeightPct}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, holeRatio: 'custom', holeHeightPct: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                      </div>

                      {/* 테두리 & 그림자 옵션 */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">테두리:</span>
                          <input
                            type="number"
                            min={0}
                            max={4}
                            value={instaConfig.holeBorderWidth}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, holeBorderWidth: Number(e.target.value) }))}
                            className="w-10 px-1 py-0.5 text-xs bg-background border border-border rounded"
                          />
                          <input
                            type="color"
                            value={rgbaToHex(instaConfig.holeBorderColor, '#E5E7EB')}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, holeBorderColor: e.target.value }))}
                            className="w-5 h-5 p-0 border border-border rounded cursor-pointer shrink-0"
                          />
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={instaConfig.holeShadow}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, holeShadow: e.target.checked }))}
                            className="rounded accent-primary cursor-pointer"
                          />
                          <span>입체 그림자</span>
                        </label>
                      </div>
                    </div>

                    {/* 4. 본문 자막 서체 & 위치 & 크기 (SSOT: displaySub / subTransform) */}
                    <div id="insta-sec-sub" className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-bold text-foreground">
                          💬 본문 자막 서체 & 위치 & 크기
                        </label>
                        <span className="text-[9px] text-muted-foreground">윈도우 하단 도킹</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-muted-foreground block mb-0.5">자막 서체 (폰트)</span>
                          <select
                            value={instaConfig.subFont || 'Pretendard'}
                            onChange={(e) => setInstaConfig(prev => ({ ...prev, subFont: e.target.value }))}
                            className="w-full px-1.5 py-1 text-[10px] bg-background border border-border rounded-[2px]"
                          >
                            <option value="Pretendard">Pretendard (산세리프 깔끔형)</option>
                            <option value="Noto Sans KR">Noto Sans KR (본고딕 표준)</option>
                            <option value="GmarketSans">Gmarket Sans (볼드 감성)</option>
                            <option value="NanumSquareRound">NanumSquareRound (둥근 고딕)</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block mb-0.5">글자 색상</span>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <input
                              type="color"
                              value={rgbaToHex(instaConfig.subColor, '#374151')}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInstaConfig(prev => ({ ...prev, subColor: val }));
                                setSubtitleConfig(prev => ({ ...prev, textColor: val }));
                              }}
                              className="w-5 h-5 p-0 border border-border rounded cursor-pointer shrink-0"
                            />
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {instaConfig.subColor || '#374151'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>자막 X 위치</span>
                            <span>{Math.round(subTransform?.xPct ?? 6)}%</span>
                          </div>
                          <input
                            type="range"
                            min={2}
                            max={60}
                            step={0.5}
                            value={subTransform?.xPct ?? 6}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSubTransform((prev: any) => ({ ...(prev || subTransform), xPct: val }));
                            }}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>자막 Y 위치</span>
                            <span>{Math.round(subTransform?.yPct ?? 71.5)}%</span>
                          </div>
                          <input
                            type="range"
                            min={55}
                            max={85}
                            step={0.5}
                            value={subTransform?.yPct ?? 71.5}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSubTransform((prev: any) => ({ ...(prev || subTransform), yPct: val }));
                              setSubtitleYPercent(val);
                            }}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>자막 크기 배율</span>
                            <span>{(subTransform?.scale ?? 1.0).toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.5}
                            step={0.05}
                            value={subTransform?.scale ?? 1.0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSubTransform((prev: any) => ({ ...(prev || subTransform), scale: val }));
                            }}
                            className="w-full cursor-pointer accent-primary h-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 5. 가변 댓글 카드 설정 (SSOT: hasCommentCard & commentCard) */}
                    <div id="insta-sec-comment" className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={hasCommentCard}
                            onChange={(e) => setHasCommentCard(e.target.checked)}
                            className="rounded accent-primary cursor-pointer"
                          />
                          <label className="text-[10.5px] font-bold text-foreground cursor-pointer" onClick={() => setHasCommentCard(!hasCommentCard)}>
                            하단 가변 댓글 카드
                          </label>
                        </div>
                        {hasCommentCard && (
                          <span className="text-[9px] text-primary font-medium">
                            글자수에 맞춤 가변
                          </span>
                        )}
                      </div>

                      {hasCommentCard && (
                        <div className="space-y-2 pt-1 border-t border-border/40">
                          {/* 작성자 & 좋아요 */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <span className="text-[9px] text-muted-foreground block mb-0.5">댓글 작성자</span>
                              <input
                                type="text"
                                value={commentCard.author}
                                onChange={(e) => setCommentCard(prev => ({ ...prev, author: e.target.value }))}
                                placeholder="작성자"
                                className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px]"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-muted-foreground block mb-0.5">좋아요 수</span>
                              <input
                                type="text"
                                value={commentCard.likes}
                                onChange={(e) => setCommentCard(prev => ({ ...prev, likes: e.target.value }))}
                                placeholder="예: 1.4만"
                                className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px]"
                              />
                            </div>
                          </div>

                          {/* 댓글 본문 (textarea로 여러 줄 지원) */}
                          <div>
                            <span className="text-[9px] text-muted-foreground block mb-0.5">댓글 본문 (줄바꿈 자동 가변)</span>
                            <textarea
                              rows={2}
                              value={commentCard.text}
                              onChange={(e) => setCommentCard(prev => ({ ...prev, text: e.target.value }))}
                              placeholder="댓글 본문 내용"
                              className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px] resize-none"
                            />
                          </div>

                          {/* 카드 정렬 프리셋 */}
                          <div>
                            <span className="text-[9px] text-muted-foreground block mb-1">카드 정렬 프리셋</span>
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                onClick={() => setCommentTransform(prev => ({ ...prev, xPct: 50 }))}
                                className={cn(
                                  "py-1 text-[9.5px] rounded border transition-colors flex items-center justify-center gap-1",
                                  Math.abs(commentTransform.xPct - 50) < 5
                                    ? "bg-primary text-primary-foreground border-primary font-bold"
                                    : "bg-background border-border text-foreground hover:bg-muted"
                                )}
                              >
                                <span>중앙 (50%)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommentTransform(prev => ({ ...prev, xPct: 18 }))}
                                className={cn(
                                  "py-1 text-[9.5px] rounded border transition-colors flex items-center justify-center gap-1",
                                  Math.abs(commentTransform.xPct - 18) < 5
                                    ? "bg-primary text-primary-foreground border-primary font-bold"
                                    : "bg-background border-border text-foreground hover:bg-muted"
                                )}
                              >
                                <span>1/3 들여쓰기</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommentTransform(prev => ({ ...prev, xPct: 6 }))}
                                className={cn(
                                  "py-1 text-[9.5px] rounded border transition-colors flex items-center justify-center gap-1",
                                  commentTransform.xPct <= 10
                                    ? "bg-primary text-primary-foreground border-primary font-bold"
                                    : "bg-background border-border text-foreground hover:bg-muted"
                                )}
                              >
                                <span>좌측 정렬 (6%)</span>
                              </button>
                            </div>
                          </div>

                          {/* 카드 테마 & 옵션 */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setCommentCard(prev => ({ ...prev, theme: 'insta' }))}
                              className={cn(
                                "py-0.5 text-[9.5px] rounded border transition-colors",
                                commentCard.theme === 'insta'
                                  ? "bg-primary text-primary-foreground border-primary font-bold"
                                  : "bg-background border-border"
                              )}
                            >
                              인스타 화이트
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentCard(prev => ({ ...prev, theme: 'yt-light' }))}
                              className={cn(
                                "py-0.5 text-[9.5px] rounded border transition-colors",
                                commentCard.theme === 'yt-light'
                                  ? "bg-primary text-primary-foreground border-primary font-bold"
                                  : "bg-background border-border"
                              )}
                            >
                              유튜브 라이트
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentCard(prev => ({ ...prev, theme: 'yt-dark' }))}
                              className={cn(
                                "py-0.5 text-[9.5px] rounded border transition-colors",
                                commentCard.theme === 'yt-dark'
                                  ? "bg-primary text-primary-foreground border-primary font-bold"
                                  : "bg-background border-border"
                              )}
                            >
                              유튜브 다크
                            </button>
                          </div>

                          {/* 익명 & 블러 & X/Y위치 */}
                          <div className="grid grid-cols-4 gap-2 items-center pt-1 border-t border-border/40 text-[10px]">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={commentCard.anonymous}
                                onChange={(e) => setCommentCard(prev => ({ ...prev, anonymous: e.target.checked }))}
                                className="rounded accent-primary cursor-pointer"
                              />
                              <span>익명 표기</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={commentCard.blurId}
                                onChange={(e) => setCommentCard(prev => ({ ...prev, blurId: e.target.checked }))}
                                className="rounded accent-primary cursor-pointer"
                              />
                              <span>아이디 블러</span>
                            </label>
                            <div>
                              <div className="flex items-center justify-between text-[8.5px] text-muted-foreground">
                                <span>X 위치</span>
                                <span>{Math.round(commentTransform.xPct)}%</span>
                              </div>
                              <input
                                type="range"
                                min={4}
                                max={80}
                                step={0.5}
                                value={commentTransform.xPct}
                                onChange={(e) => setCommentTransform(prev => ({ ...prev, xPct: Number(e.target.value) }))}
                                className="w-full cursor-pointer accent-primary h-1"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-[8.5px] text-muted-foreground">
                                <span>Y 위치</span>
                                <span>{Math.round(commentTransform.yPct)}%</span>
                              </div>
                              <input
                                type="range"
                                min={70}
                                max={95}
                                step={0.5}
                                value={commentTransform.yPct}
                                onChange={(e) => setCommentTransform(prev => ({ ...prev, yPct: Number(e.target.value) }))}
                                className="w-full cursor-pointer accent-primary h-1"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 6. 전체 카드 배경색 */}
                    <div className="p-2.5 rounded-[4px] bg-muted/40 border border-border/80 flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-bold text-foreground block">전체 카드 배경색</label>
                        <div className="flex items-center gap-1 mt-1">
                          {[
                            { name: '화이트', val: '#FFFFFF' },
                            { name: '슬레이트', val: '#F8FAFC' },
                            { name: '파스텔', val: '#FDF4FF' },
                            { name: '다크', val: '#121212' },
                          ].map((chip) => (
                            <button
                              key={chip.val}
                              type="button"
                              onClick={() => setInstaConfig(prev => ({ ...prev, bgColor: chip.val }))}
                              className={cn(
                                "px-1.5 py-0.5 text-[9px] rounded border transition-colors",
                                instaConfig.bgColor.toUpperCase() === chip.val
                                  ? "border-primary font-bold ring-1 ring-primary"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {chip.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={rgbaToHex(instaConfig.bgColor, '#FFFFFF')}
                          onChange={(e) => setInstaConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                          className="w-7 h-7 p-0 border border-border rounded cursor-pointer shrink-0"
                        />
                        <span className="text-[9.5px] font-mono">{instaConfig.bgColor}</span>
                      </div>
                    </div>
                  </div>
                )}

                {layoutTemplateMode === 'gunlimbo' && (
                  <div className="p-2.5 rounded-[4px] border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        군림보형 (픽셀링 3단: 대제목 + 흰색 띠 후킹바 + 자막)
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                        9:16 Shorts
                      </span>
                    </div>

                    {/* 1. 상단 2줄 대제목 설정 */}
                    <div className="p-2 rounded bg-background/80 border border-border/80 space-y-2">
                      <span className="text-[10px] font-bold text-foreground block">
                        👑 상단 2줄 대제목 (0% ~ 33.3% 블랙 레터박스)
                      </span>
                      <div className="space-y-1.5">
                        {/* 1번째 줄 (기본 노란색) */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={gunlimboConfig.titleLine1}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, titleLine1: e.target.value }))}
                            placeholder="1번째 줄 (예: 제목을)"
                            className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded-[2px] font-bold"
                            style={{ color: gunlimboConfig.titleLine1Color }}
                          />
                          <input
                            type="color"
                            value={rgbaToHex(gunlimboConfig.titleLine1Color, '#FFFFFF')}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, titleLine1Color: e.target.value }))}
                            className="w-7 h-7 p-0 border border-border rounded cursor-pointer shrink-0"
                            title="1번째 줄 색상"
                          />
                        </div>

                        {/* 2번째 줄 (기본 옐로우) */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={gunlimboConfig.titleLine2}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, titleLine2: e.target.value }))}
                            placeholder="2번째 줄 (예: 입력해주세요)"
                            className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded-[2px] font-bold"
                            style={{ color: gunlimboConfig.titleLine2Color }}
                          />
                          <input
                            type="color"
                            value={rgbaToHex(gunlimboConfig.titleLine2Color, '#FFE500')}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, titleLine2Color: e.target.value }))}
                            className="w-7 h-7 p-0 border border-border rounded cursor-pointer shrink-0"
                            title="2번째 줄 색상"
                          />
                        </div>
                      </div>

                      {/* 대제목 글자 크기 & 전체 유지 토글 */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[10px]">
                        <div>
                          <label className="text-muted-foreground block mb-0.5">글자 크기: {gunlimboConfig.titleFontSize}px</label>
                          <input
                            type="range"
                            min={24}
                            max={48}
                            step={1}
                            value={gunlimboConfig.titleFontSize}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, titleFontSize: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-amber-500"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 pt-3">
                          <input
                            type="checkbox"
                            id="gunlimbo-keep-title"
                            checked={gunlimboConfig.keepTitleThroughout}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, keepTitleThroughout: e.target.checked }))}
                            className="rounded accent-amber-500 cursor-pointer"
                          />
                          <label htmlFor="gunlimbo-keep-title" className="text-muted-foreground cursor-pointer text-[10px]">
                            영상 끝까지 제목 유지
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 2. 중앙 100% 흰색 띠 후킹 바 (첫 문장 자막) */}
                    <div className="p-2 rounded bg-background/80 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-foreground block">
                          🎯 중앙 100% 가로폭 흰색 띠 후킹 바
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const subLayer = layers.find(l => l.id === 'layer_subtitle' || l.type === 'subtitle');
                            if (subLayer?.data && Array.isArray(subLayer.data) && subLayer.data.length > 0) {
                              const firstSub = subLayer.data[0];
                              const newDuration = (firstSub.endMs && firstSub.startMs) 
                                ? Math.max(1.0, Math.min(5.0, (firstSub.endMs - firstSub.startMs) / 1000))
                                : gunlimboConfig.introDurationSec;
                              setGunlimboConfig(prev => ({
                                ...prev,
                                hookPhrase: firstSub.text || prev.hookPhrase,
                                introDurationSec: newDuration,
                              }));
                              toast({
                                title: '첫 문장 자막 동기화 완료',
                                description: `"${firstSub.text}" (${newDuration}초)가 후킹 바에 반영되었습니다.`,
                              });
                            } else {
                              toast({
                                title: '자막 없음',
                                description: '타임라인에 자막 트랙 데이터가 없습니다.',
                                variant: 'destructive',
                              });
                            }
                          }}
                          className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 rounded border border-amber-500/40 transition cursor-pointer font-semibold"
                        >
                          ⚡ 첫 문장 자막 가져오기
                        </button>
                      </div>

                      <input
                        type="text"
                        value={gunlimboConfig.hookPhrase}
                        onChange={(e) => setGunlimboConfig(prev => ({ ...prev, hookPhrase: e.target.value }))}
                        placeholder="후킹문구를 입력하세요"
                        className="w-full px-2 py-1 text-xs bg-background border border-border rounded-[2px] font-bold"
                      />

                      {/* 후킹 구간 노출 시간 & 색상 & 글자 크기 */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[10px]">
                        <div>
                          <label className="text-muted-foreground block mb-0.5">후킹 노출 시간: {gunlimboConfig.introDurationSec}초</label>
                          <input
                            type="range"
                            min={1.0}
                            max={5.0}
                            step={0.5}
                            value={gunlimboConfig.introDurationSec}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, introDurationSec: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-muted-foreground block mb-0.5">후킹 글자 크기: {gunlimboConfig.hookFontSize}px</label>
                          <input
                            type="range"
                            min={16}
                            max={32}
                            step={1}
                            value={gunlimboConfig.hookFontSize}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, hookFontSize: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <div className="flex items-center gap-2">
                          <label className="text-muted-foreground">바 배경색</label>
                          <input
                            type="color"
                            value={rgbaToHex(gunlimboConfig.hookBgColor, '#FFFFFF')}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, hookBgColor: e.target.value }))}
                            className="w-6 h-6 p-0 border border-border rounded cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-muted-foreground">글자색</label>
                          <input
                            type="color"
                            value={rgbaToHex(gunlimboConfig.hookTextColor, '#000000')}
                            onChange={(e) => setGunlimboConfig(prev => ({ ...prev, hookTextColor: e.target.value }))}
                            className="w-6 h-6 p-0 border border-border rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. 점선 가이드라인 표시 토글 */}
                    <div className="p-2 rounded bg-background/80 border border-border/80 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-foreground">
                        📐 3단 구분 점선 가이드라인 표시
                      </span>
                      <input
                        type="checkbox"
                        checked={gunlimboConfig.showGuidelines}
                        onChange={(e) => setGunlimboConfig(prev => ({ ...prev, showGuidelines: e.target.checked }))}
                        className="rounded accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* 4. 🚀 3단 하이브리드 미디어 소싱 툴바 (실사 검색 우선 -> Flow AI 보완) */}
                    <div className="p-2.5 rounded bg-muted/30 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          씬 미디어 소싱 (실사 검색 & Flow AI)
                        </span>
                        <span className="text-[9px] text-muted-foreground font-semibold">1:1 도킹</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setWebImageQuery(gunlimboConfig.hookPhrase || topTitleText || '');
                            setIsWebImageSearchOpen(true);
                            handleSearchWebImages(gunlimboConfig.hookPhrase || topTitleText || '');
                          }}
                          className="px-2 py-1.5 text-[11px] font-bold rounded bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 border border-blue-500/30 flex items-center justify-center gap-1 transition cursor-pointer"
                          title="1순위: 실제 웹 뉴스/제품 리뷰 사진 검색"
                        >
                          🔍 실사 웹 검색
                        </button>
                        <button
                          type="button"
                          disabled={isGeneratingFlowImage}
                          onClick={() => handleGenerateFlowImage()}
                          className="px-2 py-1.5 text-[11px] font-bold rounded bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 flex items-center justify-center gap-1 transition disabled:opacity-50 cursor-pointer"
                          title="2순위: 극사실주의 시네마틱 풍자 이미지 생성"
                        >
                          {isGeneratingFlowImage ? '생성 중...' : '🎨 Flow AI 생성'}
                        </button>
                      </div>
                    </div>

                    {/* 5. 🎯 군림보형 감정별 4색 컬러 자막 원클릭 프리셋 */}
                    <div className="p-2.5 rounded bg-background/80 border border-border/80 space-y-2 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1">
                          <Palette className="w-3.5 h-3.5 text-amber-500" />
                          감정별 4색 자막 프리셋 (72% 세이프존)
                        </span>
                        <span className="text-[9px] text-emerald-500 font-bold">Y: 72% 도킹</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { name: '노랑 (기본/팩트)', color: '#FFE500', bg: 'bg-[#FFE500] text-black' },
                          { name: '주황 (경고/주의)', color: '#FF8A00', bg: 'bg-[#FF8A00] text-black' },
                          { name: '핑크 (비꼼/놀람)', color: '#FF5588', bg: 'bg-[#FF5588] text-white' },
                          { name: '흰색 (평정/설명)', color: '#FFFFFF', bg: 'bg-white text-black border border-zinc-300' },
                        ].map((preset) => (
                          <button
                            key={preset.color}
                            type="button"
                            onClick={() => {
                              setSubtitleConfig(prev => ({ ...prev, textColor: preset.color }));
                              setLayers(prev => prev.map(l => l.type === 'subtitle' ? {
                                ...l,
                                styleProps: { ...l.styleProps, color: preset.color }
                              } : l));
                              toast({
                                title: `${preset.name} 자막 적용`,
                                description: `본문 자막 색상이 ${preset.color}로 변경되었습니다.`,
                              });
                            }}
                            className={cn(
                              "py-1 px-1 rounded font-bold text-[9.5px] truncate text-center transition shadow-2xs cursor-pointer",
                              preset.bg
                            )}
                          >
                            {preset.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 6. 🎭 페페 & 이라스토야 바이럴 밈 라이브러리 (1.8초 펄스) */}
                    <div className="p-2.5 rounded bg-muted/20 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          🎭 바이럴 밈 스티커 (페페 & 이라스토야)
                        </span>
                        <span className="text-[9px] text-muted-foreground">1.8초 펄스 모션</span>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[9.5px] text-muted-foreground font-semibold block">🐸 페페 6대 감정 팩</span>
                        <div className="grid grid-cols-3 gap-1">
                          {PEPE_MEMES.map((meme) => (
                            <button
                              key={meme.id}
                              type="button"
                              onClick={() => handleInsertMeme(meme)}
                              className="p-1 rounded bg-card hover:bg-muted border border-border flex items-center gap-1 text-[10px] font-semibold text-foreground transition truncate cursor-pointer"
                              title={meme.name}
                            >
                              <span className="text-sm">{meme.emoji}</span>
                              <span className="truncate">{meme.name.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                        <span className="text-[9.5px] text-muted-foreground font-semibold block pt-1">🧑‍💼 이라스토야 6대 상황 팩</span>
                        <div className="grid grid-cols-3 gap-1">
                          {IRASUTOYA_MEMES.map((meme) => (
                            <button
                              key={meme.id}
                              type="button"
                              onClick={() => handleInsertMeme(meme)}
                              className="p-1 rounded bg-card hover:bg-muted border border-border flex items-center gap-1 text-[10px] font-semibold text-foreground transition truncate cursor-pointer"
                              title={meme.name}
                            >
                              <span className="text-sm">{meme.emoji}</span>
                              <span className="truncate">{meme.name.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {layoutTemplateMode === 'ssul' && (
                  <div className="p-2.5 rounded-[4px] border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        썰형 (커뮤니티 + 텍스트 모드)
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const rand = getRandomSatiricalMetadata();
                          setSsulConfig((prev: any) => ({
                            ...prev,
                            author: rand.author,
                            timeText: rand.timeText,
                            viewsText: rand.viewsText,
                            metadata: {
                              ...prev?.metadata,
                              authorText: rand.author,
                              timeText: rand.timeText,
                              viewsText: rand.viewsText,
                            },
                          }));
                          toast({
                            title: '풍자 메타데이터 주입 완료',
                            description: `${rand.author} · ${rand.timeText} · ${rand.viewsText}`,
                          });
                        }}
                        className="h-6 px-2 text-[10px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        title="클릭 시 재미있는 직장인/커뮤니티 풍자 메타데이터 자동 주입"
                      >
                        🎲 풍자 랜덤
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold">텍스트 디스플레이 3대 모드</label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'accumulate', label: '문단 누적' },
                          { id: 'single-stepped', label: '계단식 단일' },
                          { id: 'single-fixed', label: '상단 고정' },
                        ].map((tm) => (
                          <button
                            key={tm.id}
                            type="button"
                            onClick={() => setSsulConfig(prev => ({ ...prev, textMode: tm.id as SsulTextMode }))}
                            className={cn(
                              "py-1 text-[10px] font-bold rounded-[2px] border transition cursor-pointer text-center truncate",
                              ssulConfig.textMode === tm.id
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                                : "bg-card text-muted-foreground border-border hover:text-foreground"
                            )}
                          >
                            {tm.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* 상징 밈 선택 (페페 vs 이라스토야) */}
                    <div className="space-y-1.5 pt-1 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-muted-foreground font-bold">상징 밈 / 일러스트 캐릭터</label>
                        <label className="flex items-center gap-1 text-[9.5px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ssulConfig.memeAliveMotion}
                            onChange={(e) => setSsulConfig(prev => ({ ...prev, memeAliveMotion: e.target.checked }))}
                            className="rounded accent-emerald-500 cursor-pointer"
                          />
                          생동감 바운스/틸트
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSsulConfig(prev => ({ ...prev, memeType: 'pepe' }))}
                          className={cn(
                            "py-1 text-xs font-bold rounded-[2px] border transition cursor-pointer flex items-center justify-center gap-1",
                            ssulConfig.memeType === 'pepe' ? "bg-emerald-500 text-white border-emerald-600" : "bg-card text-muted-foreground border-border"
                          )}
                        >
                          🐸 페페 (Pepe)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSsulConfig(prev => ({ ...prev, memeType: 'irasutoya' }))}
                          className={cn(
                            "py-1 text-xs font-bold rounded-[2px] border transition cursor-pointer flex items-center justify-center gap-1",
                            ssulConfig.memeType === 'irasutoya' ? "bg-emerald-500 text-white border-emerald-600" : "bg-card text-muted-foreground border-border"
                          )}
                        >
                          🧑 이라스토야 사람
                        </button>
                      </div>
                      {/* 10대 감정 프리셋 칩 */}
                      <div className="space-y-1">
                        <label className="text-[9.5px] text-muted-foreground">감정 표정 선택</label>
                        <div className="grid grid-cols-5 gap-1">
                          {MEME_EMOTION_PRESETS.map((ep) => (
                            <button
                              key={ep.id}
                              type="button"
                              onClick={() => setSsulConfig(prev => ({ ...prev, memeEmotion: ep.id }))}
                              className={cn(
                                "p-1 rounded-[2px] border text-center transition cursor-pointer flex flex-col items-center",
                                ssulConfig.memeEmotion === ep.id
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs font-bold"
                                  : "bg-card text-foreground border-border hover:bg-muted/50"
                              )}
                              title={ep.description}
                            >
                              <span className="text-xs">{ep.emoji}</span>
                              <span className="text-[8px] truncate max-w-full">{ep.label.split('/')[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3대 전역 AI 대본 분할 프리셋 */}
                <div className="p-2.5 rounded-[4px] border border-border bg-card space-y-1.5">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <Split className="w-3.5 h-3.5 text-primary" />
                    3대 AI 대본 분할 프리셋 (전역 공통 엔진)
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'shorts', title: '쇼츠형', sub: '10~15자 빠른 컷' },
                      { id: 'balanced', title: '균형형', sub: '15~25자 의미 단위' },
                      { id: 'sentence', title: '문장형', sub: '완전문장 설명형' },
                    ].map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => setScriptSplitPreset(sp.id as ScriptSplitPreset)}
                        className={cn(
                          "p-1.5 rounded-[3px] border text-center transition cursor-pointer flex flex-col items-center",
                          scriptSplitPreset === sp.id
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card hover:bg-muted/50 border-border text-foreground"
                        )}
                      >
                        <span className="text-xs font-bold">{sp.title}</span>
                        <span className="text-[8px] opacity-75 mt-0.5">{sp.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5대 스마트 무드 BGM 자동 선곡 */}
                <div className="p-2.5 rounded-[4px] border border-border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Music className="w-3.5 h-3.5 text-primary" />
                      5대 무드 BGM 라이브러리 & 자동 선곡
                    </span>
                    <label className="flex items-center gap-1 text-[9.5px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoMoodMatching}
                        onChange={(e) => setAutoMoodMatching(e.target.checked)}
                        className="rounded accent-primary cursor-pointer"
                      />
                      대본 자동 선곡
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: 'energetic', label: '도파민', emoji: '⚡' },
                      { id: 'emotional', label: '감성', emoji: '🎹' },
                      { id: 'suspense', label: '긴장감', emoji: '🔥' },
                      { id: 'funny', label: '코믹', emoji: '🤣' },
                      { id: 'cinematic', label: '웅장', emoji: '🎬' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedBgmMood(m.id as BgmMood)}
                        className={cn(
                          "p-1 rounded-[2px] border text-center transition cursor-pointer flex flex-col items-center",
                          selectedBgmMood === m.id
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                            : "bg-card text-foreground border-border hover:bg-muted/50"
                        )}
                      >
                        <span className="text-xs">{m.emoji}</span>
                        <span className="text-[8.5px]">{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 팝업 모달 다이얼로그 오픈 버튼 */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBgmModalOpen(true)}
                    className="w-full mt-2 h-7.5 text-[11px] font-bold border-primary/40 text-primary hover:bg-primary/10 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    🎵 BGM 라이브러리 전체 보기 & 음원 관리
                  </Button>
                </div>
              </div>
  );
};

export default TemplateInspectorForm;
