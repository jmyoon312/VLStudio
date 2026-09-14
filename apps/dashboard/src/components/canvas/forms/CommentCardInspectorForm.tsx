import React from 'react';
import { MessageCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';

export interface CommentCardConfig {
  author: string;
  handle?: string;
  text?: string;
  content?: string;
  timeText?: string;
  timeAgo?: string;
  likes?: string;
  avatarUrl?: string;
  theme: 'yt-dark' | 'yt-light' | 'insta' | 'neon';
  blurId?: boolean;
  isBlurred?: boolean;
  anonymous?: boolean;
  isAnonymous?: boolean;
  isPinned?: boolean;
  pinBadgeText?: string;
  yPct?: number;
  bgColor?: string;
  textColor?: string;
  borderRadius?: number;
  offsetX?: number;
  offsetY?: number;
  textStrokeEnabled?: boolean;
  textStrokeWidth?: number;
  textStrokeColor?: string;
  textShadowEnabled?: boolean;
  textShadowBlur?: number;
  textShadowColor?: string;
  borderEnabled?: boolean;
  borderWidth?: number;
  borderColor?: string;
  cardShadowEnabled?: boolean;
  cardShadowBlur?: number;
  cardShadowColor?: string;
}

export interface CommentCardInspectorFormProps {
  commentCard: CommentCardConfig;
  setCommentCard: React.Dispatch<React.SetStateAction<CommentCardConfig>>;
  hasCommentCard: boolean;
  setHasCommentCard: (val: boolean | ((prev: boolean) => boolean)) => void;
  handleGenerateViralComment?: () => void;
}

export const CommentCardInspectorForm: React.FC<CommentCardInspectorFormProps> = ({
  commentCard,
  setCommentCard,
  hasCommentCard,
  setHasCommentCard,
  handleGenerateViralComment,
}) => {
  const { toast } = useToast();

  const onGenerateComment = handleGenerateViralComment || (() => {
    const viralSamples = [
      { author: '알고리즘의노예', text: '이거 보고 제 인생이 180도 바뀌었습니다 ㄷㄷ', likes: '1.4만' },
      { author: '팩트폭격기', text: '진짜 핵심만 딱 짚어주네 구독 누르고 갑니다', likes: '8,421' },
      { author: '쇼츠중독자', text: '3번째 돌려보는 중인데 소름돋네요 ㄷㄷ', likes: '1.2만' },
      { author: '지식탐구자', text: '와 이건 진짜 나만 알고 싶었던 꿀팁인데..', likes: '5,920' },
      { author: '프로팩터', text: '이게 바로 진짜 정보지. 1분 만에 완벽 이해함', likes: '9,102' },
    ];
    const picked = viralSamples[Math.floor(Math.random() * viralSamples.length)];
    setCommentCard(prev => ({
      ...prev,
      author: picked.author,
      text: picked.text,
      content: picked.text,
      likes: picked.likes,
      timeText: '1시간 전',
      timeAgo: '1시간 전',
    }));
    toast({
      title: '🪄 바이럴 베댓 주입 완료',
      description: `"${picked.text}" 댓글이 적용되었습니다.`,
    });
  });

  return (
<div className="space-y-3">
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      하단 바이럴 댓글 카드
                    </span>
                    <Switch
                      checked={hasCommentCard}
                      onCheckedChange={(c) => {
                        setHasCommentCard(c);
                        toast({
                          title: c ? '💬 댓글 카드 활성화' : '💬 댓글 카드 비활성화',
                          description: c ? '캔버스 하단에 바이럴 베댓 카드가 표시됩니다.' : '댓글 카드가 숨겨졌습니다.',
                        });
                      }}
                    />
                  </div>

                  {hasCommentCard && (
                    <>
                      {/* AI 가상 바이럴 댓글 생성 버튼 */}
                      <button
                        type="button"
                        onClick={onGenerateComment}
                        className="w-full h-8 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[2px] flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI 바이럴 베댓 원클릭 생성 🪄
                      </button>

                      {/* 닉네임 블러 마스킹 & 익명 토글 (특화 개인정보 보호) */}
                      <div className="p-2 bg-muted/20 border border-border rounded-[2px] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10.5px] font-bold text-foreground block">작성자 정보 블러 마스킹 🥷</span>
                            <span className="text-[8.5px] text-muted-foreground">프로필 및 아이디에 가우시안 블러를 적용합니다</span>
                          </div>
                          <Switch
                            checked={commentCard.blurId}
                            onCheckedChange={(c) => setCommentCard(prev => ({ ...prev, blurId: c }))}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-[10px] text-muted-foreground font-medium">익명_유저 모드</span>
                          <Switch
                            checked={commentCard.anonymous}
                            onCheckedChange={(c) => setCommentCard(prev => ({ ...prev, anonymous: c }))}
                          />
                        </div>
                      </div>

                      {/* 카드 테마 스타일 */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">카드 테마</span>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: 'yt-dark', label: '유튜브 다크' },
                            { id: 'yt-light', label: '유튜브 라이트' },
                            { id: 'insta', label: '인스타그램' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setCommentCard(prev => ({ ...prev, theme: t.id as any }))}
                              className={cn(
                                "py-1 text-[10px] font-semibold rounded-[2px] border transition cursor-pointer",
                                commentCard.theme === t.id
                                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                                  : "border-border bg-background text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 댓글 내용 편집 */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">댓글 내용</span>
                        <Textarea
                          value={commentCard.text}
                          onChange={(e) => setCommentCard(prev => ({ ...prev, text: e.target.value }))}
                          className="w-full h-16 text-xs p-2 bg-background border-border text-foreground rounded-[2px] resize-none focus:border-primary"
                        />
                      </div>

                      {/* 작성자 & 좋아요 수 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[9.5px] text-muted-foreground">작성자 닉네임</span>
                          <input
                            type="text"
                            value={commentCard.author}
                            onChange={(e) => setCommentCard(prev => ({ ...prev, author: e.target.value }))}
                            className="w-full h-7 px-2 text-xs bg-background border border-border rounded text-foreground"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9.5px] text-muted-foreground">좋아요 수</span>
                          <input
                            type="text"
                            value={commentCard.likes}
                            onChange={(e) => setCommentCard(prev => ({ ...prev, likes: e.target.value }))}
                            className="w-full h-7 px-2 text-xs bg-background border border-border rounded text-foreground"
                          />
                        </div>
                      </div>

                      {/* 🎨 카드 배경색 & 글자색 */}
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <ColorPicker8Preset
                          label="카드 배경 색상"
                          value={commentCard.bgColor || '#18181B'}
                          onChange={(c) => setCommentCard(prev => ({ ...prev, bgColor: c }))}
                        />
                        <ColorPicker8Preset
                          label="본문 글자 색상"
                          value={commentCard.textColor || '#FFFFFF'}
                          onChange={(c) => setCommentCard(prev => ({ ...prev, textColor: c }))}
                        />
                      </div>

                      {/* 모서리 둥글기 */}
                      <UnitSliderControl
                        label="카드 모서리 둥글기"
                        value={commentCard.borderRadius ?? 8}
                        min={0}
                        max={24}
                        step={2}
                        unit="px"
                        onChange={(v) => setCommentCard(prev => ({ ...prev, borderRadius: v }))}
                      />

                      {/* 1. 본문 글자 테두리 (외곽선) */}
                      <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-muted-foreground">본문 글자 테두리 (외곽선)</span>
                          <Switch
                            checked={!!commentCard.textStrokeEnabled}
                            onCheckedChange={(c) => setCommentCard(prev => ({ ...prev, textStrokeEnabled: c }))}
                          />
                        </div>
                        {commentCard.textStrokeEnabled && (
                          <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
                            <UnitSliderControl
                              label="외곽선 두께"
                              value={commentCard.textStrokeWidth ?? 1}
                              min={1}
                              max={6}
                              step={1}
                              unit="px"
                              onChange={(v) => setCommentCard(prev => ({ ...prev, textStrokeWidth: v }))}
                            />
                            <ColorPicker8Preset
                              label="외곽선 색상"
                              value={commentCard.textStrokeColor || '#000000'}
                              onChange={(c) => setCommentCard(prev => ({ ...prev, textStrokeColor: c }))}
                            />
                          </div>
                        )}
                      </div>

                      {/* 2. 본문 글자 입체 그림자 */}
                      <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-muted-foreground">본문 글자 그림자</span>
                          <Switch
                            checked={!!commentCard.textShadowEnabled}
                            onCheckedChange={(c) => setCommentCard(prev => ({ ...prev, textShadowEnabled: c }))}
                          />
                        </div>
                        {commentCard.textShadowEnabled && (
                          <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
                            <UnitSliderControl
                              label="그림자 흐림"
                              value={commentCard.textShadowBlur ?? 4}
                              min={0}
                              max={16}
                              step={1}
                              unit="px"
                              onChange={(v) => setCommentCard(prev => ({ ...prev, textShadowBlur: v }))}
                            />
                            <ColorPicker8Preset
                              label="그림자 색상"
                              value={commentCard.textShadowColor || 'rgba(0,0,0,0.6)'}
                              onChange={(c) => setCommentCard(prev => ({ ...prev, textShadowColor: c }))}
                            />
                          </div>
                        )}
                      </div>

                      {/* 3. 카드 외곽 테두리 (Border) */}
                      <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-muted-foreground">카드 외곽 테두리 (Border)</span>
                          <Switch
                            checked={!!commentCard.borderEnabled}
                            onCheckedChange={(c) => setCommentCard(prev => ({ ...prev, borderEnabled: c }))}
                          />
                        </div>
                        {commentCard.borderEnabled && (
                          <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
                            <UnitSliderControl
                              label="테두리 두께"
                              value={commentCard.borderWidth ?? 1}
                              min={1}
                              max={6}
                              step={1}
                              unit="px"
                              onChange={(v) => setCommentCard(prev => ({ ...prev, borderWidth: v }))}
                            />
                            <ColorPicker8Preset
                              label="테두리 색상"
                              value={commentCard.borderColor || '#E5E7EB'}
                              onChange={(c) => setCommentCard(prev => ({ ...prev, borderColor: c }))}
                            />
                          </div>
                        )}
                      </div>

                      {/* 4. 카드 외곽 입체 그림자 (Box Shadow) */}
                      <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-muted-foreground">카드 외곽 입체 그림자</span>
                          <Switch
                            checked={!!commentCard.cardShadowEnabled}
                            onCheckedChange={(c) => setCommentCard(prev => ({ ...prev, cardShadowEnabled: c }))}
                          />
                        </div>
                        {commentCard.cardShadowEnabled && (
                          <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
                            <UnitSliderControl
                              label="그림자 흐림"
                              value={commentCard.cardShadowBlur ?? 16}
                              min={0}
                              max={32}
                              step={2}
                              unit="px"
                              onChange={(v) => setCommentCard(prev => ({ ...prev, cardShadowBlur: v }))}
                            />
                            <ColorPicker8Preset
                              label="그림자 색상"
                              value={commentCard.cardShadowColor || 'rgba(0,0,0,0.25)'}
                              onChange={(c) => setCommentCard(prev => ({ ...prev, cardShadowColor: c }))}
                            />
                          </div>
                        )}
                      </div>

                      {/* 위치 오프셋 */}
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <span className="text-[11px] font-semibold text-muted-foreground">위치 미세 조정 (X, Y)</span>
                        <div className="grid grid-cols-2 gap-2">
                          <UnitSliderControl
                            label="X 오프셋"
                            value={commentCard.offsetX || 0}
                            min={-100}
                            max={100}
                            step={1}
                            unit="px"
                            onChange={(v) => setCommentCard(prev => ({ ...prev, offsetX: v }))}
                          />
                          <UnitSliderControl
                            label="Y 오프셋"
                            value={commentCard.offsetY || 0}
                            min={-100}
                            max={100}
                            step={1}
                            unit="px"
                            onChange={(v) => setCommentCard(prev => ({ ...prev, offsetY: v }))}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
  );
};

export default CommentCardInspectorForm;
