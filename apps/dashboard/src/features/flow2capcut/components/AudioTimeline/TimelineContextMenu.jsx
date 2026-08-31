import React, { useEffect, useRef } from 'react';
import {
  RefreshCw,
  Image as ImageIcon,
  Video,
  Scissors,
  Upload,
  Trash2,
  Volume2,
  FastForward,
  Type,
  Eye,
  Sparkles,
  SlidersHorizontal,
  Play,
  RotateCcw,
  Check,
  Film
} from 'lucide-react';

export const TimelineContextMenu = ({
  target,
  onClose,
  onRegenerateScene,
  onReplaceMedia,
  onSplitScene,
  onToggleViewMode,
  onDeleteClip,
  onEditSubtitle,
  onRegenerateTTS,
  onChangeSpeed,
  onPlayPause,
  onResetPlayhead,
  onFitTimeline,
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!target) return null;

  const clip = target.clip;
  const scene = clip?.sceneRef;
  const isVideo = clip?.role?.startsWith('video') || clip?.type === 'video';
  const isImage = clip?.role === 'image' || clip?.type === 'image';
  const isSubtitle = clip?.role === 'subtitle' || clip?.id?.startsWith('sub-');
  const isAudio = clip?.role === 'narration' || clip?.role === 'voice' || clip?.audioPath;
  const isSfx = clip?.role === 'sfx';

  // Adjust menu position so it doesn't overflow screen
  const menuWidth = 220;
  const menuHeight = 260;
  const posX = Math.min(window.innerWidth - menuWidth - 10, Math.max(10, target.x));
  const posY = Math.min(window.innerHeight - menuHeight - 10, Math.max(10, target.y));

  return (
    <div
      ref={menuRef}
      className="fixed z-[999999] bg-[#141923]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1.5 min-w-[210px] text-slate-200 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
      style={{ left: posX, top: posY }}
    >
      {/* Header with target info */}
      <div className="px-2.5 py-1.5 mb-1 border-b border-white/10 text-[11px] font-bold text-slate-400 flex items-center justify-between">
        <span>{isVideo ? '🎬 영상 클립' : isImage ? '🖼️ 이미지 클립' : isSubtitle ? '📝 자막 클립' : isAudio ? '🎙️ 나레이션 오디오' : isSfx ? '🎵 효과음 클립' : '⏱️ 타임라인 메뉴'}</span>
        {scene?.scene_id && <span className="text-blue-400 font-mono">씬 #{scene.scene_id}</span>}
      </div>

      {/* 🎬 Video / Image Context Actions */}
      {(isVideo || isImage) && (
        <>
          {onRegenerateScene && scene && (
            <button
              onClick={() => { onRegenerateScene(scene, isVideo ? 'video' : 'image'); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-600/30 hover:text-purple-300 transition-colors text-left font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span>{isVideo ? 'Flow 영상 재생성' : 'Flow 이미지 재생성'}</span>
            </button>
          )}

          {onReplaceMedia && scene && (
            <button
              onClick={() => { onReplaceMedia(scene); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-600/30 hover:text-blue-300 transition-colors text-left font-medium"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>내 PC 파일로 교체...</span>
            </button>
          )}

          {onToggleViewMode && scene && (
            <button
              onClick={() => { onToggleViewMode(scene.id); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-600/30 hover:text-emerald-300 transition-colors text-left font-medium"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>이미지 ↔ 영상 뷰 전환</span>
            </button>
          )}

          <div className="my-1 border-t border-white/10" />
        </>
      )}

      {/* 📝 Subtitle Context Actions */}
      {isSubtitle && (
        <>
          {onEditSubtitle && (
            <button
              onClick={() => { onEditSubtitle(clip); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-600/30 hover:text-amber-300 transition-colors text-left font-medium"
            >
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span>자막 텍스트 수정</span>
            </button>
          )}

          <div className="my-1 border-t border-white/10" />
        </>
      )}

      {/* 🎙️ Audio / TTS Context Actions */}
      {isAudio && (
        <>
          {onRegenerateTTS && scene && (
            <button
              onClick={() => { onRegenerateTTS(scene); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-600/30 hover:text-blue-300 transition-colors text-left font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>이 구간 TTS 다시 생성</span>
            </button>
          )}

          {onChangeSpeed && (
            <div className="px-2.5 py-1">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">음성 재생 속도 (배속)</span>
              <div className="grid grid-cols-4 gap-1">
                {[0.9, 1.0, 1.15, 1.3].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => { onChangeSpeed(spd); onClose(); }}
                    className="py-1 rounded bg-black/40 hover:bg-blue-600/40 text-[10px] font-mono font-semibold text-center border border-white/10"
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="my-1 border-t border-white/10" />
        </>
      )}

      {/* Common Timeline Controls */}
      {onPlayPause && (
        <button
          onClick={() => { onPlayPause(); onClose(); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left font-medium"
        >
          <Play className="w-3.5 h-3.5 text-slate-300" />
          <span>재생 / 일시정지 (Space)</span>
        </button>
      )}

      {onResetPlayhead && (
        <button
          onClick={() => { onResetPlayhead(); onClose(); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
          <span>처음으로 이동 (Home)</span>
        </button>
      )}

      {onFitTimeline && (
        <button
          onClick={() => { onFitTimeline(); onClose(); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left font-medium"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300" />
          <span>타임라인 전체 맞춤 (Fit)</span>
        </button>
      )}

      {onDeleteClip && clip && (
        <>
          <div className="my-1 border-t border-white/10" />
          <button
            onClick={() => { onDeleteClip(clip); onClose(); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-600/30 hover:text-red-300 transition-colors text-left font-medium text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>클립 삭제 (Delete)</span>
          </button>
        </>
      )}
    </div>
  );
};
