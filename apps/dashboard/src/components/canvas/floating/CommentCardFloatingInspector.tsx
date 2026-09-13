import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, ThumbsUp, User } from 'lucide-react';
import { CommentCardConfig } from '../forms/CommentCardInspectorForm';

export interface CommentCardFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: CommentCardConfig;
  onChange: (patch: Partial<CommentCardConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const CommentCardFloatingInspector: React.FC<CommentCardFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
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
          checked={config.enabled}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
      </div>

      {/* 2. 닉네임 & 핸들 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>닉네임</span>
          </label>
          <input
            type="text"
            value={config.authorName}
            onChange={(e) => onChange({ authorName: e.target.value })}
            placeholder="댓글 작성자"
            className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">작성 시간</label>
          <input
            type="text"
            value={config.timeAgo}
            onChange={(e) => onChange({ timeAgo: e.target.value })}
            placeholder="예: 3시간 전"
            className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* 3. 댓글 본문 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">댓글 내용</label>
        <textarea
          rows={2}
          value={config.commentText}
          onChange={(e) => onChange({ commentText: e.target.value })}
          placeholder="화면 하단에 강조 표시될 베스트 댓글 내용..."
          className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      {/* 4. 좋아요 수 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <ThumbsUp className="w-3 h-3" />
          <span>좋아요 수 (Likes)</span>
        </label>
        <input
          type="text"
          value={config.likesCount}
          onChange={(e) => onChange({ likesCount: e.target.value })}
          placeholder="예: 4.8천 또는 1,234"
          className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 5. 카드 배경색 & 글자색 */}
      <ColorPicker8Preset
        label="카드 배경 색상"
        value={config.bgColor}
        onChange={(c) => onChange({ bgColor: c })}
      />
      <ColorPicker8Preset
        label="본문 글자 색상"
        value={config.textColor}
        onChange={(c) => onChange({ textColor: c })}
      />

      {/* 6. 모서리 둥글기 */}
      <UnitSliderControl
        label="카드 모서리 둥글기"
        value={config.borderRadius}
        min={0}
        max={24}
        step={2}
        unit="px"
        onChange={(v) => onChange({ borderRadius: v })}
      />

      {/* 7. 위치 오프셋 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <span className="text-[11px] font-semibold text-muted-foreground">위치 미세 조정 (X, Y)</span>
        <div className="grid grid-cols-2 gap-2">
          <UnitSliderControl
            label="X 오프셋"
            value={config.offsetX || 0}
            min={-100}
            max={100}
            step={1}
            unit="px"
            onChange={(v) => onChange({ offsetX: v })}
          />
          <UnitSliderControl
            label="Y 오프셋"
            value={config.offsetY || 0}
            min={-100}
            max={100}
            step={1}
            unit="px"
            onChange={(v) => onChange({ offsetY: v })}
          />
        </div>
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default CommentCardFloatingInspector;
