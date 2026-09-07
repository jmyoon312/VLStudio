import { useState, useRef, useEffect } from 'react'
import Waveform from './Waveform'
import TimelineFlagButton from './TimelineFlagButton'
import TimelineVideoToggleButton from './TimelineVideoToggleButton'
import { StopwatchIcon, ElapsedTime } from '../StopwatchIcon'
import { AUDIO_CLIP_CLICK_DELAY_MS, AUDIO_CLIP_DOUBLE_CLICK_DEDUPE_MS } from './interactionTiming'

/** 생성 중 클립 위에 클록 + 경과시간(1초마다 갱신, endedAt 있으면 멈춤). 공통 컴포넌트 재사용. */
function ClipGeneratingTimer({ startedAt, endedAt }) {
  return (
    <div className="atl-clip-gentimer" aria-label="generating">
      <StopwatchIcon size={14} />
      <ElapsedTime startedAt={startedAt} endedAt={endedAt} />
    </div>
  )
}

// 클립 — click vs drag 자동 구분, draggable이면 드래그로 timecode 보정
// onFlag(audioPath, filename, event): hover ⚠️ 버튼 클릭 시 호출 (audioPath 있고 onFlag 전달된 경우만)
// isFlagged(filePath): bool — flagged 시각 표시
export default function Clip({ clip, variant, pxPerMs, height, onClickClip, onDoubleClickClip, onDragClip, onTrimClip, totalDurationMs, isPlaying, onSceneHover, onFlag, isFlagged, onToggleVideo, onInteractionChange, onClipContextMenu }) {
  const [dragOffsetMs, setDragOffsetMs] = useState(null)
  const [trimLeftOffsetMs, setTrimLeftOffsetMs] = useState(0)
  const [trimRightOffsetMs, setTrimRightOffsetMs] = useState(0)
  const isDragging = dragOffsetMs !== null
  const isTrimming = trimLeftOffsetMs !== 0 || trimRightOffsetMs !== 0
  const flagged = !!(isFlagged && clip.audioPath && isFlagged(clip.audioPath))
  // audioPath 있으면 audio clip — sub-track은 variant가 없어서 audioPath로 판정
  const showActionable = !!clip.audioPath && !!onFlag
  const isVideoClip = clip.role === 'video-i2v' || clip.role === 'video-t2v'
  // 생성 중 클립엔 토글 숨김 — 완료 경로가 disabled 를 리셋하므로 선택이 조용히 되돌아감.
  const showVideoToggle = isVideoClip && !!onToggleVideo && !clip.generating
  // 드래그 중 unmount되면 onUp 미발화 → 여기서 listener 강제 정리
  const dragCleanupRef = useRef(null)
  const clickTimerRef = useRef(null)
  const lastDoubleClickAtRef = useRef(-Infinity)
  useEffect(() => () => {
    dragCleanupRef.current?.()
    dragCleanupRef.current = null
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
  }, [])

  const cancelPendingClick = () => {
    if (!clickTimerRef.current) return
    clearTimeout(clickTimerRef.current)
    clickTimerRef.current = null
  }

  const dispatchClick = () => {
    setDragOffsetMs(null)
    onClickClip?.(clip)
  }

  const dispatchDoubleClick = (e) => {
    if (!clip.audioPath || !onDoubleClickClip) return
    e?.stopPropagation?.()
    if (e?.target?.closest?.('.atl-clip-action-btn')) return
    const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
    if (now - lastDoubleClickAtRef.current < AUDIO_CLIP_DOUBLE_CLICK_DEDUPE_MS) return
    lastDoubleClickAtRef.current = now
    cancelPendingClick()
    setDragOffsetMs(null)
    onDoubleClickClip(clip)
  }

  const visualStartMs = Math.max(0, clip.startMs + (dragOffsetMs || 0) + trimLeftOffsetMs)
  const visualEndMs = Math.max(visualStartMs + 200, clip.endMs + trimRightOffsetMs)
  const left = visualStartMs * pxPerMs
  const width = Math.max(4, (visualEndMs - visualStartMs) * pxPerMs)
  const style = {
    left,
    width,
    top: 4,
    bottom: 4,
    background: variant === 'text'
      ? `${clip.color}26`
      : `linear-gradient(180deg, ${clip.color}, ${clip.color}88)`,
    border: variant === 'text' ? `1px solid ${clip.color}` : `1px solid ${clip.color}AA`,
    cursor: clip.draggable ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
    opacity: isDragging || isTrimming ? 0.75 : 1,
    zIndex: isDragging || isTrimming ? 10 : undefined,
  }

  // ── 좌측 엣지 트리밍 핸들러 (시작 시간 조절) ──
  const onPointerDownLeftTrim = (e) => {
    e.stopPropagation()
    e.preventDefault()
    dragCleanupRef.current?.()
    const startX = e.clientX
    let currentOffset = 0

    const onMove = (mv) => {
      const dx = mv.clientX - startX
      const deltaMs = dx / pxPerMs
      const maxDelta = (clip.endMs - clip.startMs) - 200 // 최소 200ms 유지
      const clampedDelta = Math.max(-clip.startMs, Math.min(maxDelta, deltaMs))
      currentOffset = clampedDelta
      setTrimLeftOffsetMs(clampedDelta)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      dragCleanupRef.current = null
      const finalStart = Math.max(0, clip.startMs + currentOffset)
      setTrimLeftOffsetMs(0)
      if (Math.abs(currentOffset) > 10) {
        onTrimClip?.(clip, finalStart, clip.endMs)
      }
    }

    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── 우측 엣지 트리밍 핸들러 (종료 시간 / Duration 조절) ──
  const onPointerDownRightTrim = (e) => {
    e.stopPropagation()
    e.preventDefault()
    dragCleanupRef.current?.()
    const startX = e.clientX
    let currentOffset = 0

    const onMove = (mv) => {
      const dx = mv.clientX - startX
      const deltaMs = dx / pxPerMs
      const minDelta = 200 - (clip.endMs - clip.startMs) // 최소 200ms 유지
      const clampedDelta = Math.max(minDelta, deltaMs)
      currentOffset = clampedDelta
      setTrimRightOffsetMs(clampedDelta)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      dragCleanupRef.current = null
      const finalEnd = Math.max(clip.startMs + 200, clip.endMs + currentOffset)
      setTrimRightOffsetMs(0)
      if (Math.abs(currentOffset) > 10) {
        onTrimClip?.(clip, clip.startMs, finalEnd)
      }
    }

    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onMouseEnter = (e) => {
    if (clip.sceneRef && variant === 'block') {
      onSceneHover?.({ x: e.clientX, y: e.clientY, scene: clip.sceneRef, clip })
    }
  }
  const onMouseLeave = () => onSceneHover?.(null)

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    e.stopPropagation() // 스크럽 트리거 차단
    // 이전 드래그가 살아있다면 먼저 정리
    dragCleanupRef.current?.()
    onInteractionChange?.(clip.id, true)
    let interactionActive = true
    const startX = e.clientX
    let lastDx = 0
    let didDrag = false

    const onMove = (mv) => {
      const dx = mv.clientX - startX
      lastDx = dx
      if (Math.abs(dx) > 4) {
        if (!didDrag) cancelPendingClick()
        didDrag = true
        if (clip.draggable) {
          // 좌측 0 이하로 못 가게 클램프
          const newStart = Math.max(0, Math.min((totalDurationMs || Infinity), clip.startMs + dx / pxPerMs))
          setDragOffsetMs(newStart - clip.startMs)
        }
      }
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      dragCleanupRef.current = null
      if (interactionActive) {
        interactionActive = false
        onInteractionChange?.(clip.id, false)
      }
    }
    const onUp = () => {
      cleanup()
      if (didDrag && clip.draggable) {
        const newStart = Math.max(0, Math.min((totalDurationMs || Infinity), clip.startMs + lastDx / pxPerMs))
        onDragClip?.(clip, newStart)
        setDragOffsetMs(null)
      } else {
        // 클릭으로 처리
        if (clip.audioPath && onDoubleClickClip) {
          if (clickTimerRef.current) {
            dispatchDoubleClick()
          } else {
            setDragOffsetMs(null)
            clickTimerRef.current = setTimeout(() => {
              clickTimerRef.current = null
              onClickClip?.(clip)
            }, AUDIO_CLIP_CLICK_DELAY_MS)
          }
        } else {
          dispatchClick()
        }
      }
    }
    dragCleanupRef.current = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className={`atl-clip atl-clip-${variant || 'default'}${flagged ? ' is-flagged' : ''}${clip.generating ? ' is-generating' : ''}${clip.disabled ? ' is-disabled' : ''}${isPlaying ? ' atl-clip-playing' : ''}${isDragging ? ' atl-clip-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      onDoubleClick={dispatchDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClipContextMenu?.({ x: e.clientX, y: e.clientY, clip });
      }}
      data-clip-id={clip.id}
      title={clip.filename || clip.label || ''}
    >
      {variant === 'block' && (clip.imgSrc || clip.imagePath || clip.posterDataUrl || clip.sceneRef?.image) && (
        <img
          className="atl-clip-img"
          src={clip.imgSrc || (clip.imagePath ? (clip.imagePath.startsWith('local-resource://') || clip.imagePath.startsWith('data:') ? clip.imagePath : `local-resource:///${clip.imagePath.replace(/^[/\\]+/, '').replace(/\\/g, '/')}`) : (clip.posterDataUrl || clip.sceneRef?.image))}
          onError={(e) => {
            if (clip.sceneRef?.image && e.currentTarget.src !== clip.sceneRef.image) {
              e.currentTarget.src = clip.sceneRef.image
            }
          }}
          alt=""
        />
      )}
      {/* 생성 중 클립 — shimmer(윤기/광택). placeholder(이미지 없음)면 빈 박스 위에. */}
      {variant === 'block' && clip.generating && <div className="gen-shimmer" aria-hidden="true" />}
      {/* 생성 중 클록 + 경과시간 (Results 와 동일) */}
      {variant === 'block' && clip.generating && (
        <ClipGeneratingTimer startedAt={clip.generatingStartedAt} endedAt={clip.generatingEndedAt} />
      )}
      {variant === 'text' && (
        <span className="atl-clip-text" style={{ color: clip.color }}>{clip.label}</span>
      )}
      {variant === 'audio' && width > 30 && (
        <Waveform color="#fff" />
      )}
      {/* Flagged 영구 indicator (좌측) */}
      {flagged && (
        <span className="atl-clip-flag-indicator" aria-label="flagged">⚠️</span>
      )}
      {/* 호버 시 ⚠️ 액션 버튼 (audioPath + onFlag 전달 시. 얇은 클립은 우측 하단 컴팩트) */}
      {showActionable && !isDragging && (
        <TimelineFlagButton
          audioPath={clip.audioPath}
          filename={clip.filename}
          flagged={flagged}
          narrow={width < 40}
          onFlag={onFlag}
        />
      )}
      {/* 영상 클립 export 포함/제외 토글 (호버 👁) */}
      {showVideoToggle && !isDragging && (
        <TimelineVideoToggleButton
          disabled={!!clip.disabled}
          narrow={width < 40}
          onToggle={() => onToggleVideo(clip)}
        />
      )}

      {/* 좌측 트리밍 핸들 */}
      {width > 12 && !clip.generating && (
        <div
          className="atl-clip-trim-handle atl-clip-trim-left absolute left-0 top-0 bottom-0 w-[6px] hover:w-[8px] bg-white/0 hover:bg-white/40 cursor-col-resize z-20 transition-all rounded-l"
          onPointerDown={onPointerDownLeftTrim}
          title="시작 지점 조절 (트리밍)"
        />
      )}

      {/* 우측 트리밍 핸들 */}
      {width > 12 && !clip.generating && (
        <div
          className="atl-clip-trim-handle atl-clip-trim-right absolute right-0 top-0 bottom-0 w-[6px] hover:w-[8px] bg-white/0 hover:bg-white/40 cursor-col-resize z-20 transition-all rounded-r"
          onPointerDown={onPointerDownRightTrim}
          title="종료 지점 / 재생시간 조절 (트리밍)"
        />
      )}
    </div>
  )
}
