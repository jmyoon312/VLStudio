import React from 'react'
import { RULER_H } from './constants'

const RULER_VIRTUALIZATION_THRESHOLD = 300
const RULER_VIEWPORT_MARGIN_MS = 10_000

function formatRulerTime(sec) {
  const totalSec = Math.floor(sec)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const frac = Math.round((sec - totalSec) * 10)
  if (frac > 0) {
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${frac}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TimeRuler({ totalMs, pxPerMs, width, visibleRangeMs = null }) {
  // 줌 비율(pxPerSec)에 따른 Major(주눈금) 및 Minor(보조눈금) 간격 동적 자동 계산
  const pxPerSec = pxPerMs * 1000
  let majorSec = 60
  let minorSec = 10

  if (pxPerSec > 350) {
    majorSec = 1
    minorSec = 0.2
  } else if (pxPerSec > 160) {
    majorSec = 1
    minorSec = 0.5
  } else if (pxPerSec > 70) {
    majorSec = 5
    minorSec = 1
  } else if (pxPerSec > 30) {
    majorSec = 10
    minorSec = 2
  } else if (pxPerSec > 12) {
    majorSec = 30
    minorSec = 5
  } else {
    majorSec = 60
    minorSec = 10
  }

  const totalSec = Math.max(1, (totalMs || 0) / 1000)
  let minSec = 0
  let maxSec = totalSec

  if (visibleRangeMs) {
    const minMs = Math.max(0, visibleRangeMs.startMs - RULER_VIEWPORT_MARGIN_MS)
    const maxMs = Math.min(totalMs, visibleRangeMs.endMs + RULER_VIEWPORT_MARGIN_MS)
    minSec = Math.max(0, Math.floor((minMs / 1000) / majorSec) * majorSec)
    maxSec = Math.min(totalSec, Math.ceil((maxMs / 1000) / majorSec) * majorSec)
  }

  const majorTicks = []
  const minorTicks = []

  // Minor ticks 생성
  const stepCount = Math.round(majorSec / minorSec)
  for (let s = minSec; s <= maxSec + 0.001; s = +(s + minorSec).toFixed(3)) {
    const isMajor = Math.abs(Math.round(s / majorSec) * majorSec - s) < 0.001
    const xPos = s * 1000 * pxPerMs
    if (isMajor) {
      majorTicks.push({
        sec: Math.round(s * 100) / 100,
        x: xPos,
        label: formatRulerTime(s)
      })
    } else {
      minorTicks.push({
        sec: s,
        x: xPos
      })
    }
  }

  return (
    <div className="atl-ruler" style={{ width, height: RULER_H }}>
      {/* 보조 눈금선 (Minor Ticks) */}
      {minorTicks.map(t => (
        <div
          key={`min-${t.sec}`}
          className="atl-ruler-minor-tick"
          style={{ left: t.x }}
        >
          <div className="atl-ruler-minor-line" />
        </div>
      ))}

      {/* 주 눈금선 및 시간 라벨 (Major Ticks) */}
      {majorTicks.map(t => (
        <div
          key={`maj-${t.sec}`}
          className="atl-ruler-tick"
          style={{ left: t.x }}
        >
          <div className="atl-ruler-line" />
          <div className="atl-ruler-label-pill">
            <span className="atl-ruler-label-text">{t.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
