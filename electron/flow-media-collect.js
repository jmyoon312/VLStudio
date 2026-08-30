/**
 * electron/flow-media-collect.js
 *
 * Collect generated images from Flow's agent-chat DOM.
 *
 * Flow's agent model streams the result image inside flowCreationAgent:streamChat
 * (SSE) — NO separate batchGenerateImages request fires — so the legacy
 * response-interception collection never completes. Each generated result instead
 * renders as a project edit card:
 *   <a href=".../tools/flow/project/<id>/edit/<id>">
 *     <img src=".../media.getMediaUrlRedirect?name=<UUID>">
 *   </a>
 * The `name` UUID IS the mediaId; the src is a cookie-auth fetchable URL.
 *
 * scanGeneratedImages(doc) is pure (tested with jsdom) and is also injected into
 * the Flow page via GENERATED_IMG_PROBE (Function.prototype.toString) — single
 * source of truth.
 */

/** Extract the media UUID (= mediaId) from a media.getMediaUrlRedirect src. */
export function extractMediaName(src) {
  if (!src) return null
  const m = String(src).match(/[?&]name=([a-f0-9-]{36})/)
  return m ? m[1] : null
}

/**
 * Generated result images in DOM (= submission) order.
 * @param {Document} doc
 * @returns {{mediaId: string, src: string}[]}
 */
export function scanGeneratedImages(doc) {
  const out = []
  const seenSrc = new Set()

  for (const im of doc.querySelectorAll('img')) {
    const src = im.currentSrc || im.src || ''
    if (!src || src.startsWith('data:image/svg') || seenSrc.has(src)) continue

    // 아이콘, 로고, 아바타 제외 (화면 크기 또는 naturalSize 기준)
    const rect = im.getBoundingClientRect ? im.getBoundingClientRect() : { width: 100, height: 100 }
    if (rect.width > 0 && rect.height > 0 && (rect.width < 60 || rect.height < 60)) continue

    // 아직 생성 진행 중(40%, 36% 등)인 카드 제외
    const parent = im.parentElement
    const card = (im.closest && (im.closest('[role="article"]') || im.closest('[class*="card"]'))) || parent
    const cardText = card ? (card.textContent || '') : ''
    if (/\d+%\s*$/.test(cardText.trim()) || cardText.includes('생성 중') || cardText.includes('Generating')) {
      continue
    }

    // UUID 추출 또는 고유 미디어 ID 생성
    const m = src.match(/[?&]name=([a-f0-9-]{36})/)
    const mediaId = m ? m[1] : `dom-${src.split('?')[0].slice(-32)}`

    // Google Media URL 또는 유효한 이미지 URL이면 모두 수집
    if (
      src.includes('getMediaUrlRedirect') ||
      src.includes('googleusercontent.com') ||
      src.includes('blob:') ||
      src.includes('/media/') ||
      rect.width >= 100
    ) {
      seenSrc.add(src)
      out.push({ mediaId, src })
    }
  }
  return out
}

/** Page-context expression returning the generated images (same logic as above). */
export const GENERATED_IMG_PROBE = `(${scanGeneratedImages.toString()})(document)`

/**
 * Generated result videos in DOM (= submission) order.
 *
 * Agent ON video results render as <video src=".../media.getMediaUrlRedirect?name=<UUID>">
 * (live dump 2026-06-27) — the SAME media URL shape as images, just <video> not
 * <img>. The src may sit on the <video> directly or on a child <source>. The
 * name UUID IS the mediaId. Any <video> carrying that shape is a generated
 * result (decorative/blob videos lack name=), so no size filter is needed.
 *
 * @param {Document} doc
 * @returns {{mediaId: string, src: string}[]}
 */
export function scanGeneratedVideos(doc) {
  const out = []
  for (const v of doc.querySelectorAll('video')) {
    const candidates = [v.currentSrc || v.src || '']
    for (const s of v.querySelectorAll('source')) {
      candidates.push((s.getAttribute && s.getAttribute('src')) || s.src || '')
    }
    for (const src of candidates) {
      const m = src.match(/[?&]name=([a-f0-9-]{36})/)
      if (m) { out.push({ mediaId: m[1], src }); break }
    }
  }
  return out
}

/** Page-context expression returning the generated videos (same logic as above). */
export const GENERATED_VIDEO_PROBE = `(${scanGeneratedVideos.toString()})(document)`

/**
 * 요청한 배치 개수를 expectedCount 로 안전 변환 (정수 1~4).
 * R9-P1: 생성 pending 을 arm 할 때 expectedCount 를 batchCount 로 확정해, 첫 응답이 빨리
 *   와도 1/1 로 조기 완료되어 나머지 응답이 버려지는 것을 막는다.
 */
export function clampImageBatchCount(n) {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v)) return 1
  return Math.min(4, Math.max(1, v))
}

/**
 * Match scanned DOM images to pending generations, in submission order, 1:1.
 *
 * The DOM fallback is only a safety net for the Agent-ON path (streamChat — no
 * batchGenerateImages request to intercept). Agent-OFF generations receive their
 * image via intercept (fifeUrl) and that mediaId never enters `collectedMediaIds`,
 * so a still-rendered image from a PREVIOUS Agent-OFF scene would otherwise be
 * re-assigned to the next pending gen. Such gens set `allowDomFallback:false` and
 * are excluded here (intercept failures stay visibly empty rather than borrowing
 * another scene's image — same fail-closed stance as matchGenerationForResponse).
 *
 * @param {{mediaId:string,src:string}[]} domImgs  scanned DOM images (submission order)
 * @param {Array<{completed?:boolean,domImages?:any,allowDomFallback?:boolean}>} gens
 * @param {Set<string>} collectedMediaIds  mediaIds already assigned via DOM fallback
 * @returns {{gen:object,img:{mediaId:string,src:string}}[]}
 */
export function planDomImageAssignments(domImgs, gens, collectedMediaIds) {
  const fresh = (domImgs || []).filter(i => i && i.mediaId && !collectedMediaIds.has(i.mediaId))
  const needing = (gens || []).filter(
    g => !g.completed && !g.domImages && g.allowDomFallback !== false
  )
  const assignments = []
  for (let k = 0; k < needing.length && k < fresh.length; k++) {
    assignments.push({ gen: needing[k], img: fresh[k] })
  }
  return assignments
}
