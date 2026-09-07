/**
 * StylePicker - 썸네일 그리드 기반 스타일 프리셋 선택기
 */

import { useState, useMemo } from 'react'
import { STYLE_PRESETS } from '../config/defaults'
import { resolveImageSrc, hasImageData, formatElapsedMs } from '../utils/formatters'
import { toFileUrl } from '../hooks/useStyleThumbnails'
import { useElapsedTimer } from '../hooks/useElapsedTimer'
import HoverImageBalloon from './HoverImageBalloon'
import LazyImage from './LazyImage'
import './StylePicker.css'

const ALL_CATEGORY = '__all__'
const CUSTOM_STYLES_KEY = 'vlstudio_custom_styles'
const DELETED_STYLES_KEY = 'vlstudio_deleted_style_ids'
const CUSTOM_CATEGORIES_KEY = 'vlstudio_custom_categories'
const DELETED_CATEGORIES_KEY = 'vlstudio_deleted_category_ids'

export default function StylePicker({
  selectedId,
  onSelect,
  thumbnails = {},
  onDeleteThumbnail,
  uploadedStyleRefs = [],
  generating,
  stopping,
  progress = { current: 0, total: 0 },
  onGenerateThumbnails,
  onStopGenerating,
  autoCardMeta,  // { label, icon, tooltip, summary } — 호출자가 createStyleResolver로 만든 값. 없으면 단순 "스타일 없음" fallback.
  t,
  isKo
}) {
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewStyle, setPreviewStyle] = useState(null)  // 더블클릭 미리보기
  const [hoverPreview, setHoverPreview] = useState(null)  // 호버 풍선 { style, thumb, x, y }

  // 커스텀 스타일 & 커스텀 카테고리 & 삭제된 목록 (영속화)
  const [customStyles, setCustomStyles] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_STYLES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [deletedStyleIds, setDeletedStyleIds] = useState(() => {
    try {
      const saved = localStorage.getItem(DELETED_STYLES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_CATEGORIES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [deletedCategoryIds, setDeletedCategoryIds] = useState(() => {
    try {
      const saved = localStorage.getItem(DELETED_CATEGORIES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // 스타일 추가 모달 상태
  const [isAddStyleModalOpen, setIsAddStyleModalOpen] = useState(false)
  const [newStyleName, setNewStyleName] = useState('')
  const [newStyleCategory, setNewStyleCategory] = useState('')
  const [newStylePrompt, setNewStylePrompt] = useState('')
  const [newStyleThumb, setNewStyleThumb] = useState('')

  // 카테고리 추가 모달 상태
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('🎨')

  const elapsedSec = useElapsedTimer(generating && progress.startedAt ? progress.startedAt : null)
  const elapsed = elapsedSec * 1000 // ms로 변환 (기존 formatElapsedMs 호환)

  // 기본 카테고리 + 커스텀 카테고리 (삭제된 것 제외)
  const rawCategories = STYLE_PRESETS?.categories || []
  const categories = useMemo(() => {
    const combined = [...rawCategories, ...customCategories]
    return combined.filter(c => !deletedCategoryIds.includes(c.id))
  }, [rawCategories, customCategories, deletedCategoryIds])

  // 기본 스타일 + 커스텀 스타일 (삭제된 것 제외)
  const rawStyles = STYLE_PRESETS?.styles || []
  const allStyles = useMemo(() => {
    const combined = [...customStyles, ...rawStyles]
    return combined.filter(s => !deletedStyleIds.includes(s.id))
  }, [rawStyles, customStyles, deletedStyleIds])

  // 카테고리 추가 핸들러
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    const id = `cat_${Date.now()}`
    const newCat = {
      id,
      name_ko: newCategoryName.trim(),
      name_en: newCategoryName.trim(),
      icon: newCategoryIcon.trim() || '🎨'
    }
    const updated = [...customCategories, newCat]
    setCustomCategories(updated)
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }
    setActiveCategory(id)
    setNewCategoryName('')
    setNewCategoryIcon('🎨')
    setIsAddCategoryModalOpen(false)
  }

  // 카테고리 삭제 핸들러
  const handleDeleteCategory = (catId, catName, e) => {
    e.stopPropagation()
    if (!window.confirm(`'${catName}' 카테고리를 갤러리에서 삭제하시겠습니까?`)) return

    const updatedDeleted = [...deletedCategoryIds, catId]
    setDeletedCategoryIds(updatedDeleted)
    try {
      localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(updatedDeleted))
    } catch (e) {
      console.error(e)
    }

    if (activeCategory === catId) {
      setActiveCategory(ALL_CATEGORY)
    }
  }

  // 스타일 추가 핸들러
  const handleAddStyle = () => {
    if (!newStyleName.trim() || !newStylePrompt.trim()) {
      alert('스타일 이름과 프롬프트를 입력해주세요.')
      return
    }
    const id = `style_${Date.now()}`
    const newStyle = {
      id,
      category: newStyleCategory || (activeCategory !== ALL_CATEGORY ? activeCategory : (categories[0]?.id || 'custom')),
      name_ko: newStyleName.trim(),
      name_en: newStyleName.trim(),
      prompt_en: newStylePrompt.trim(),
      prompt_ko: newStylePrompt.trim(),
      thumb: newStyleThumb || null,
      isCustom: true
    }
    const updated = [newStyle, ...customStyles]
    setCustomStyles(updated)
    try {
      localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }
    setNewStyleName('')
    setNewStylePrompt('')
    setNewStyleThumb('')
    setIsAddStyleModalOpen(false)
  }

  // 스타일 삭제 핸들러
  const handleDeleteStyle = (styleId, styleName, e) => {
    e.stopPropagation()
    if (!window.confirm(`'${styleName}' 화풍 스타일을 갤러리에서 삭제하시겠습니까?`)) return

    // 커스텀 스타일이면 customStyles에서 제거
    const isCustom = customStyles.some(s => s.id === styleId)
    if (isCustom) {
      const updated = customStyles.filter(s => s.id !== styleId)
      setCustomStyles(updated)
      try {
        localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error(e)
      }
    } else {
      // 기본 스타일이면 deletedStyleIds에 추가
      const updatedDeleted = [...deletedStyleIds, styleId]
      setDeletedStyleIds(updatedDeleted)
      try {
        localStorage.setItem(DELETED_STYLES_KEY, JSON.stringify(updatedDeleted))
      } catch (e) {
        console.error(e)
      }
    }
  }

  // 이미지 파일 업로드 -> base64 Data URL 변환
  const handleThumbnailUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setNewStyleThumb(event.target?.result || '')
    }
    reader.readAsDataURL(file)
  }

  // 카테고리 + 검색어 필터
  const filteredStyles = useMemo(() => {
    let result = activeCategory === ALL_CATEGORY
      ? allStyles
      : allStyles.filter(s => s.category === activeCategory)

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(s =>
        s.name_ko?.toLowerCase().includes(q) ||
        s.name_en?.toLowerCase().includes(q) ||
        s.prompt_en?.toLowerCase().includes(q)
      )
    }
    return result
  }, [activeCategory, allStyles, searchQuery])

  // 썸네일 미생성 수 (프리셋 + 이미지 없는 커스텀 스타일)
  const missingPresetCount = allStyles.filter(s => !thumbnails[s.id]).length
  const missingCustomCount = uploadedStyleRefs.filter(r => !hasImageData(r)).length
  const missingCount = missingPresetCount + missingCustomCount

  return (
    <div className="style-picker">
      {/* 카테고리 탭 */}
      <div className="sp-categories">
        <button
          className={`sp-cat-tab ${activeCategory === ALL_CATEGORY ? 'active' : ''}`}
          onClick={() => setActiveCategory(ALL_CATEGORY)}
        >
          {t('reference.allCategories')}
        </button>
        {categories.map(cat => {
          const count = allStyles.filter(s => s.category === cat.id).length
          return (
            <div
              key={cat.id}
              className={`sp-cat-tab-wrapper ${activeCategory === cat.id ? 'active' : ''}`}
            >
              <button
                className={`sp-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                title={isKo ? cat.name_ko : cat.name_en}
              >
                {cat.icon} {isKo ? cat.name_ko : cat.name_en}
                <span className="sp-cat-count">{count}</span>
              </button>
              <button
                className="sp-cat-delete-btn"
                title={`${isKo ? cat.name_ko : cat.name_en} 카테고리 삭제`}
                onClick={(e) => handleDeleteCategory(cat.id, isKo ? cat.name_ko : cat.name_en, e)}
              >
                ✕
              </button>
            </div>
          )
        })}
        {/* 새 카테고리 추가 버튼 */}
        <button
          className="sp-cat-tab sp-cat-add-btn"
          onClick={() => setIsAddCategoryModalOpen(true)}
          title="새 카테고리 추가"
        >
          ➕ 카테고리 추가
        </button>
      </div>

      {/* 검색 */}
      <div className="sp-search">
        <input
          type="text"
          className="sp-search-input"
          placeholder={isKo ? '스타일 검색...' : 'Search styles...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="sp-search-clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* 업로드된 스타일 레퍼런스 (있으면) */}
      {uploadedStyleRefs.length > 0 && activeCategory === ALL_CATEGORY && (
        <div className="sp-uploaded-section">
          <div className="sp-section-label">{t('reference.uploadedStyles')}</div>
          <div className="sp-grid">
            {uploadedStyleRefs.map(ref => (
              <div
                key={`ref:${ref.id}`}
                className={`sp-card ${selectedId === `ref:${ref.id}` ? 'selected' : ''}`}
                onClick={() => onSelect(selectedId === `ref:${ref.id}` ? null : `ref:${ref.id}`)}
              >
                <div className="sp-thumb">
                  {hasImageData(ref) ? (
                    <LazyImage src={resolveImageSrc(ref)} alt={ref.name} />
                  ) : (
                    <span className="sp-icon">🖼️</span>
                  )}
                </div>
                <div className="sp-name">{ref.name || 'Style'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 프리셋 스타일 그리드 */}
      <div className="sp-grid">
        {/* 자동 (씬별 매칭) / 스타일 없음 카드 — autoCardMeta는 호출자(styleResolver)가 결정.
            없으면 단순 "스타일 없음" fallback (Reference 위저드 등 자동 모드 의미 없는 컨텍스트). */}
        {(() => {
          const meta = autoCardMeta ?? { label: t('reference.noStyle'), icon: '🚫', tooltip: '', summary: null }
          return (
            <div
              className={`sp-card sp-no-style ${!selectedId ? 'selected' : ''}`}
              onClick={() => onSelect(null)}
              title={meta.tooltip}
            >
              <div className="sp-thumb"><span className="sp-icon">{meta.icon}</span></div>
              <div className="sp-name">{meta.label}</div>
              {meta.summary && <div className="sp-auto-summary">{meta.summary}</div>}
            </div>
          )
        })()}

        {/* 새 스타일 추가 카드 */}
        <div
          className="sp-card sp-add-card"
          onClick={() => {
            setNewStyleCategory(activeCategory !== ALL_CATEGORY ? activeCategory : (categories[0]?.id || 'custom'))
            setIsAddStyleModalOpen(true)
          }}
          title="새로운 화풍 스타일 등록"
        >
          <div className="sp-thumb sp-add-thumb">
            <span className="sp-icon">➕</span>
          </div>
          <div className="sp-name" style={{ color: '#a855f7', fontWeight: 'bold' }}>새 스타일 추가</div>
        </div>

        {filteredStyles.map(style => {
          const thumb = style.thumb || thumbnails[style.id]
          const cat = categories.find(c => c.id === style.category)
          const styleName = isKo ? style.name_ko : style.name_en
          return (
            <div
              key={style.id}
              className={`sp-card ${selectedId === `preset:${style.id}` ? 'selected' : ''}`}
              onClick={() => onSelect(selectedId === `preset:${style.id}` ? null : `preset:${style.id}`)}
              onContextMenu={(e) => {
                if (!thumb) return
                e.preventDefault()
                if (window.confirm(t('reference.deleteThumbnailConfirm', { name: styleName }))) {
                  onDeleteThumbnail?.(style.id)
                }
              }}
              title={styleName}
            >
              {/* 스타일 삭제 버튼 */}
              <button
                className="sp-card-delete-btn"
                onClick={(e) => handleDeleteStyle(style.id, styleName, e)}
                title={`${styleName} 삭제`}
              >
                ✕
              </button>

              <div className="sp-thumb">
                {thumb ? (
                  <LazyImage
                    src={thumb.startsWith('data:') ? thumb : toFileUrl(thumb)}
                    alt={styleName}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setPreviewStyle({ ...style, thumb })
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoverPreview({
                        style, thumb,
                        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
                      })
                    }}
                    onMouseLeave={() => setHoverPreview(null)}
                  />
                ) : (
                  <span className="sp-icon">{cat?.icon || '🎨'}</span>
                )}
              </div>
              <div className="sp-name">{styleName}</div>
            </div>
          )
        })}
      </div>

      {/* 하단: 썸네일 생성 버튼 + 진행 */}
      <div className="sp-footer">
        {generating ? (
          <div className="sp-progress-row">
            <div className="sp-progress-bar">
              <div
                className="sp-progress-fill"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <span className="sp-progress-text">
              {t('reference.thumbnailProgress', { current: progress.current, total: progress.total })}
              {elapsed > 0 && <span className="sp-elapsed"> {formatElapsedMs(elapsed)}</span>}
            </span>
            <button className={`sp-btn-stop ${stopping ? 'stopping' : ''}`} onClick={onStopGenerating} disabled={stopping}>
              {stopping ? `⏳ ${t('reference.stopping')}...` : t('reference.stop')}
            </button>
          </div>
        ) : missingCount > 0 ? (
          <button className="sp-btn-generate" onClick={() => {
            const customMissing = uploadedStyleRefs.filter(r => !hasImageData(r))
            onGenerateThumbnails?.(null, customMissing)
          }}>
            🎨 {t('reference.generateThumbnails')} ({missingCount})
          </button>
        ) : null}
      </div>
      {/* 호버 풍선 미리보기 */}
      {hoverPreview && (
        <HoverImageBalloon
          anchorRect={hoverPreview.rect}
          src={toFileUrl(hoverPreview.thumb)}
          className="sp-hover-balloon"
        >
          <div className="sp-hover-name">{isKo ? hoverPreview.style.name_ko : hoverPreview.style.name_en}</div>
        </HoverImageBalloon>
      )}

      {/* 미리보기 모달 */}
      {previewStyle && (
        <div className="sp-preview-overlay" onClick={() => setPreviewStyle(null)}>
          <div className="sp-preview" onClick={e => e.stopPropagation()}>
            <div className="sp-preview-header">
              <span>{isKo ? previewStyle.name_ko : previewStyle.name_en}</span>
              <button className="sp-preview-close" onClick={() => setPreviewStyle(null)}>✕</button>
            </div>
            <div className="sp-preview-image">
              <img src={previewStyle.thumb?.startsWith('data:') ? previewStyle.thumb : toFileUrl(previewStyle.thumb)} alt={isKo ? previewStyle.name_ko : previewStyle.name_en} />
            </div>
            <div className="sp-preview-prompt">{previewStyle.prompt_en}</div>
          </div>
        </div>
      )}

      {/* 새 스타일 추가 모달 */}
      {isAddStyleModalOpen && (
        <div className="sp-modal-overlay" onClick={() => setIsAddStyleModalOpen(false)}>
          <div className="sp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <span className="sp-modal-title">✨ 새 스타일 등록</span>
              <button className="sp-preview-close" onClick={() => setIsAddStyleModalOpen(false)}>✕</button>
            </div>
            <div className="sp-modal-body">
              <div className="sp-form-group">
                <label className="sp-form-label">카테고리</label>
                <select
                  className="sp-form-select"
                  value={newStyleCategory}
                  onChange={(e) => setNewStyleCategory(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {isKo ? c.name_ko : c.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sp-form-group">
                <label className="sp-form-label">스타일 이름</label>
                <input
                  type="text"
                  className="sp-form-input"
                  placeholder="예: 지브리 감성, 레트로 사이버펑크..."
                  value={newStyleName}
                  onChange={(e) => setNewStyleName(e.target.value)}
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-form-label">비주얼 화풍 프롬프트 (긍정)</label>
                <textarea
                  className="sp-form-textarea"
                  placeholder="예: Studio Ghibli anime style, lush watercolor background, vibrant colors, detailed scenery..."
                  rows={3}
                  value={newStylePrompt}
                  onChange={(e) => setNewStylePrompt(e.target.value)}
                />
              </div>

              <div className="sp-form-group">
                <label className="sp-form-label">썸네일 이미지 (선택)</label>
                <div className="sp-file-upload-box">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="sp-file-input"
                  />
                  {newStyleThumb ? (
                    <div className="sp-thumb-preview">
                      <img src={newStyleThumb} alt="Preview" />
                      <button
                        type="button"
                        className="sp-thumb-remove-btn"
                        onClick={(e) => {
                          e.preventDefault()
                          setNewStyleThumb('')
                        }}
                      >
                        ✕ 제거
                      </button>
                    </div>
                  ) : (
                    <div className="sp-file-upload-placeholder">
                      <span>🖼️ 클릭하여 이미지 파일 첨부</span>
                      <span className="sp-upload-hint">PNG, JPG 권장</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="sp-modal-footer">
              <button
                className="sp-modal-btn-cancel"
                onClick={() => setIsAddStyleModalOpen(false)}
              >
                취소
              </button>
              <button
                className="sp-modal-btn-confirm"
                onClick={handleAddStyle}
              >
                💾 스타일 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 카테고리 추가 모달 */}
      {isAddCategoryModalOpen && (
        <div className="sp-modal-overlay" onClick={() => setIsAddCategoryModalOpen(false)}>
          <div className="sp-modal-content sp-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <span className="sp-modal-title">📁 새 카테고리 추가</span>
              <button className="sp-preview-close" onClick={() => setIsAddCategoryModalOpen(false)}>✕</button>
            </div>
            <div className="sp-modal-body">
              <div className="sp-form-group">
                <label className="sp-form-label">아이콘 (이모지)</label>
                <input
                  type="text"
                  className="sp-form-input sp-input-icon"
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  placeholder="🎨"
                  maxLength={4}
                />
              </div>
              <div className="sp-form-group">
                <label className="sp-form-label">카테고리 이름</label>
                <input
                  type="text"
                  className="sp-form-input"
                  placeholder="예: 픽셀아트, 3D 랜더, 유화..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="sp-modal-footer">
              <button
                className="sp-modal-btn-cancel"
                onClick={() => setIsAddCategoryModalOpen(false)}
              >
                취소
              </button>
              <button
                className="sp-modal-btn-confirm"
                onClick={handleAddCategory}
              >
                ➕ 카테고리 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
