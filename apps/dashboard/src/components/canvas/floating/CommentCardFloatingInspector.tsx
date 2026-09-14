import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { FontStyleAlignControl } from '../controls/FontStyleAlignControl';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, ThumbsUp, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommentCardConfig } from '../forms/CommentCardInspectorForm';

export interface CommentCardFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: CommentCardConfig;
  onChange: (patch: Partial<CommentCardConfig>) => void;
  onReset: () => void;
  hasCommentCard?: boolean;
  setHasCommentCard?: (val: boolean | ((prev: boolean) => boolean)) => void;
  defaultPosition?: { x: number; y: number };
}

export const CommentCardFloatingInspector: React.FC<CommentCardFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  hasCommentCard = true,
  setHasCommentCard,
  defaultPosition,
}) => {
  const currentAuthor = config.author || (config as any).authorName || '';
  const currentText = config.text || config.content || (config as any).commentText || '';
  const currentLikes = config.likes || (config as any).likesCount || '';
  const currentTime = config.timeText || config.timeAgo || '방금 전';
  const currentHandle = config.handle || '@user';

  // 양방향 필드 동기화 패치 헬퍼
  const handleUpdate = (patch: any) => {
    const fullPatch = { ...patch };
    if (patch.author !== undefined) fullPatch.authorName = patch.author;
    if (patch.authorName !== undefined) fullPatch.author = patch.authorName;
    if (patch.text !== undefined) { fullPatch.commentText = patch.text; fullPatch.content = patch.text; }
    if (patch.commentText !== undefined) { fullPatch.text = patch.commentText; fullPatch.content = patch.commentText; }
    if (patch.likes !== undefined) fullPatch.likesCount = patch.likes;
    if (patch.likesCount !== undefined) fullPatch.likes = patch.likesCount;
    if (patch.timeText !== undefined) fullPatch.timeAgo = patch.timeText;
    if (patch.timeAgo !== undefined) fullPatch.timeText = patch.timeAgo;
    onChange(fullPatch);
  };

  return (
    <BaseFloatingInspectorCard
      title="바이럴 댓글 카드"
      icon={<MessageCircle className="w-4 h-4 text-amber-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 활성화 토글 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground">댓글 카드 표시</span>
        <Switch
          checked={hasCommentCard}
          onCheckedChange={(c) => {
            setHasCommentCard?.(c);
            handleUpdate({ enabled: c });
          }}
        />
      </div>

      {/* 2. 카드 테마 프리셋 */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-muted-foreground">카드 테마</span>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'insta', label: '인스타그램' },
            { id: 'yt-light', label: '유튜브 라이트' },
            { id: 'yt-dark', label: '유튜브 다크' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                const isInsta = t.id === 'insta';
                const isDark = t.id === 'yt-dark';
                handleUpdate({
                  theme: t.id as any,
                  bgColor: isInsta ? 'rgba(245, 245, 245, 0.95)' : isDark ? 'rgba(15, 15, 15, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                  textColor: isDark ? '#ffffff' : '#171717',
                  borderRadius: isInsta ? 16 : 8,
                });
              }}
              className={cn(
                "py-1 text-[10px] font-semibold rounded-[2px] border transition cursor-pointer text-center",
                config.theme === t.id
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 작성자 & 핸들 & 작성 시간 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>작성자 닉네임</span>
          </label>
          <input
            type="text"
            value={currentAuthor}
            onChange={(e) => handleUpdate({ author: e.target.value })}
            placeholder="댓글 작성자"
            className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>작성 시간</span>
          </label>
          <input
            type="text"
            value={currentTime}
            onChange={(e) => handleUpdate({ timeText: e.target.value })}
            placeholder="예: 방금 전, 3시간 전"
            className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      {/* 핸들 (@user) */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">유저 핸들 (아이디)</label>
        <input
          type="text"
          value={currentHandle}
          onChange={(e) => handleUpdate({ handle: e.target.value })}
          placeholder="예: @viraloop"
          className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground font-mono"
        />
      </div>

      {/* 4. 댓글 본문 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">댓글 내용 (줄바꿈 지원)</label>
        <textarea
          rows={2}
          value={currentText}
          onChange={(e) => handleUpdate({ text: e.target.value })}
          placeholder="화면 하단에 강조 표시될 베스트 댓글 내용..."
          className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary resize-none text-foreground"
        />
      </div>

      {/* 5. 좋아요 수 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <ThumbsUp className="w-3 h-3" />
          <span>좋아요 수 (Likes)</span>
        </label>
        <input
          type="text"
          value={currentLikes}
          onChange={(e) => handleUpdate({ likes: e.target.value })}
          placeholder="예: 1.4만 또는 1,234"
          className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
        />
      </div>

      {/* 6. 익명 모드 & 아이디 블러 */}
      <div className="p-2 bg-muted/20 border border-border rounded-[2px] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-semibold text-foreground">익명_유저 표기</span>
          <Switch
            checked={!!(config.anonymous || config.isAnonymous)}
            onCheckedChange={(c) => handleUpdate({ anonymous: c, isAnonymous: c })}
          />
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[10.5px] font-semibold text-foreground">작성자 정보 블러 마스킹</span>
          <Switch
            checked={!!(config.blurId || config.isBlurred)}
            onCheckedChange={(c) => handleUpdate({ blurId: c, isBlurred: c })}
          />
        </div>
      </div>

      {/* 7. 카드 배경색 & 글자색 & 모서리 둥글기 */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        <ColorPicker8Preset
          label="카드 배경 색상"
          value={config.bgColor || '#FFFFFF'}
          onChange={(c) => handleUpdate({ bgColor: c })}
        />
        <ColorPicker8Preset
          label="본문 글자 색상"
          value={config.textColor || '#171717'}
          onChange={(c) => handleUpdate({ textColor: c })}
        />

        {/* 댓글 글꼴 및 서체 스타일 / 정렬 */}
        <FontStyleAlignControl
          label="댓글 글꼴 (Font)"
          font={config.font || 'Pretendard'}
          setFont={(f) => handleUpdate({ font: f })}
          bold={config.bold}
          setBold={(b) => handleUpdate({ bold: b })}
          italic={config.italic}
          setItalic={(i) => handleUpdate({ italic: i })}
          align={config.align || 'left'}
          setAlign={(a) => handleUpdate({ align: a })}
          letterSpacing={config.letterSpacing ?? 0}
          setLetterSpacing={(ls) => handleUpdate({ letterSpacing: ls })}
          lineHeight={config.lineHeight ?? 1.4}
          setLineHeight={(lh) => handleUpdate({ lineHeight: lh })}
        />
        <UnitSliderControl
          label="카드 모서리 둥글기"
          value={config.borderRadius ?? 16}
          min={0}
          max={28}
          step={2}
          unit="px"
          onChange={(v) => handleUpdate({ borderRadius: v })}
        />
      </div>

      {/* 8. 본문 글자 테두리 (외곽선) */}
      <div className="space-y-1.5 pt-1.5 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">본문 글자 테두리 (외곽선)</span>
          <Switch
            checked={!!config.textStrokeEnabled}
            onCheckedChange={(c) => handleUpdate({ textStrokeEnabled: c })}
          />
        </div>
        {config.textStrokeEnabled && (
          <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
            <UnitSliderControl
              label="외곽선 두께"
              value={config.textStrokeWidth ?? 1}
              min={1}
              max={6}
              step={1}
              unit="px"
              onChange={(v) => handleUpdate({ textStrokeWidth: v })}
            />
            <ColorPicker8Preset
              label="외곽선 색상"
              value={config.textStrokeColor || '#000000'}
              onChange={(c) => handleUpdate({ textStrokeColor: c })}
            />
          </div>
        )}
      </div>

      {/* 9. 본문 글자 그림자 */}
      <div className="space-y-1.5 pt-1.5 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">본문 글자 그림자</span>
          <Switch
            checked={!!config.textShadowEnabled}
            onCheckedChange={(c) => handleUpdate({ textShadowEnabled: c })}
          />
        </div>
        {config.textShadowEnabled && (
          <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
            <UnitSliderControl
              label="그림자 흐림"
              value={config.textShadowBlur ?? 4}
              min={0}
              max={16}
              step={1}
              unit="px"
              onChange={(v) => handleUpdate({ textShadowBlur: v })}
            />
            <ColorPicker8Preset
              label="그림자 색상"
              value={config.textShadowColor || 'rgba(0,0,0,0.5)'}
              onChange={(c) => handleUpdate({ textShadowColor: c })}
            />
          </div>
        )}
      </div>

      {/* 10. 카드 외곽 테두리 (Border) */}
      <div className="space-y-1.5 pt-1.5 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">카드 외곽 테두리 (Border)</span>
          <Switch
            checked={!!config.borderEnabled}
            onCheckedChange={(c) => handleUpdate({ borderEnabled: c })}
          />
        </div>
        {config.borderEnabled && (
          <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
            <UnitSliderControl
              label="테두리 두께"
              value={config.borderWidth ?? 1}
              min={1}
              max={6}
              step={1}
              unit="px"
              onChange={(v) => handleUpdate({ borderWidth: v })}
            />
            <ColorPicker8Preset
              label="테두리 색상"
              value={config.borderColor || '#E5E7EB'}
              onChange={(c) => handleUpdate({ borderColor: c })}
            />
          </div>
        )}
      </div>

      {/* 11. 카드 외곽 입체 그림자 */}
      <div className="space-y-1.5 pt-1.5 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">카드 외곽 입체 그림자</span>
          <Switch
            checked={!!config.cardShadowEnabled}
            onCheckedChange={(c) => handleUpdate({ cardShadowEnabled: c })}
          />
        </div>
        {config.cardShadowEnabled && (
          <div className="space-y-1.5 pl-1 border-l-2 border-primary/30">
            <UnitSliderControl
              label="그림자 흐림"
              value={config.cardShadowBlur ?? 16}
              min={0}
              max={32}
              step={2}
              unit="px"
              onChange={(v) => handleUpdate({ cardShadowBlur: v })}
            />
            <ColorPicker8Preset
              label="그림자 색상"
              value={config.cardShadowColor || 'rgba(0,0,0,0.15)'}
              onChange={(c) => handleUpdate({ cardShadowColor: c })}
            />
          </div>
        )}
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default CommentCardFloatingInspector;
