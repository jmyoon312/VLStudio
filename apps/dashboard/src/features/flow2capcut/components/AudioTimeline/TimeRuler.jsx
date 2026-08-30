import React from 'react'
import { RULER_H } from './constants'

const RULER_VIRTUALIZATION_THRESHOLD = 300
const RULER_VIEWPORT_MARGIN_MS = 10_000

function formatRulerTime(sec, majorSec) {
  const totalSec = Math.floor(sec)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const frac = Math.round((sec - totalSec) * 100) / 100

  // 1시간 이상인 경우 (hh:mm:ss)
  if (h > 0 || majorSec >= 3600) {
    if (majorSec < 1 || frac > 0) {
      const milli = Math.round((sec - totalSec) * 100)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(milli).padStart(2, '0')}`
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // 1시간 미만인 경우 (mm:ss)
  if (majorSec < 1 || frac > 0) {
    const milli = Math.round((sec - totalSec) * 100)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(milli).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TimeRuler({ totalMs, pxPerMs, width, visibleRangeMs = null }) {
  // 줌 비율(pxPerSec)에 따른 Major(주눈금) 및 Minor(보조눈금) 간격 동적 자동 계산 (1초 ~ 2시간 풀레인지 지원)
  const pxPerSec = pxPerMs * 1000
  let majorSec = 60
  let minorSec = 10

  if (pxPerSec > 500) {
    majorSec = 0.5
    minorSec = 0.1
  } else if (pxPerSec > 250) {
    majorSec = 1
    minorSec = 0.2
  } else if (pxPerSec > 120) {
    majorSec = 1
    minorSec = 0.5
  } else if (pxPerSec > 60) {
    majorSec = 2
    minorSec = 0.5
  } else if (pxPerSec > 25) {
    majorSec = 5
    minorSec = 1
  } else if (pxPerSec > 10) {
    majorSec = 15
    minorSec = 3
  } else if (pxPerSec > 4) {
    majorSec = 30
    minorSec = 5
  } else if (pxPerSec > 1.5) {
    majorSec = 60 // 1분
    minorSec = 10
  } else if (pxPerSec > 0.5) {
    majorSec = 300 // 5분
    minorSec = 60
  } else if (pxPerSec > 0.2) {
    majorSec = 600 // 10분
    minorSec = 120
  } else if (pxPerSec > 0.08) {
    majorSec = 1800 // 30분
    minorSec = 300
  } else {
    majorSec = 3600 // 1시간
    minorSec = 600
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
        label: formatRulerTime(s, majorSec)
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
