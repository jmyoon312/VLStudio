/**
 * BottomPanelTabs — 하단 패널 뷰 토글 ([▶ 타임라인 | ☰ 결과표 | ⊞ 그리드]).
 *
 * 생성 탭(text/video-text/frame-to-video/list)의 하단 패널에서 라이브 타임라인,
 * 기존 결과표(ResultsTable table), 카드형 그리드(ResultsTable grid) 사이를 전환한다.
 * 상태는 App 이 localStorage 로 영속.
 */

const VIEWS = [
  { value: 'timeline', icon: '▶', labelKey: 'bottomPanel.timeline' },
  { value: 'results', icon: '☰', labelKey: 'bottomPanel.results' },
  { value: 'grid', icon: '⊞', labelKey: 'bottomPanel.grid' },
]

export default function BottomPanelTabs({ view, onChange, t = (k) => k }) {
  return (
    <div className="bottom-panel-tabs" role="tablist" style={{ display: 'inline-flex', gap: '3px', padding: '3px', background: '#f1f5f9', borderRadius: '10px', border: '1px solid #e2e8f0', margin: '4px 10px' }}>
      {VIEWS.map((v) => {
        const active = view === v.value
        return (
          <button
            key={v.value}
            role="tab"
            aria-selected={active}
            className={`bp-tab ${active ? 'active' : ''}`}
            onClick={() => onChange(v.value)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              border: 'none',
              background: active ? '#ffffff' : 'transparent',
              color: active ? '#2563eb' : '#64748b',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{v.icon}</span> <span>{t(v.labelKey)}</span>
          </button>
        )
      })}
    </div>
  )
}
