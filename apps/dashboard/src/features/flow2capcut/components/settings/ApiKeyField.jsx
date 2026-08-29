/**
 * ApiKeyField — provider 하나의 키 상태 배지 + 입력 + 저장/삭제 (ViraLoop Modern Card Style)
 */
import React from 'react'

export default function ApiKeyField({
  label, hasKey, loading, encryptionAvailable, busy,
  keyInput, onKeyInput, onSave, onRemove, getKeyUrl, extraNote, t,
}) {
  const openLink = (url) => window.electronAPI?.openExternal?.(url)

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '14px 16px',
      marginBottom: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* 상단: 레이블 + 상태 뱃지 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>{label}</span>
          {getKeyUrl && (
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
              onClick={() => openLink(getKeyUrl)}
            >
              키 발급받기 ↗
            </button>
          )}
        </div>

        {/* 상태 뱃지 */}
        <span style={{
          fontSize: '0.72rem',
          fontWeight: '700',
          padding: '2px 8px',
          borderRadius: '8px',
          background: hasKey ? '#ecfdf5' : '#f1f5f9',
          color: hasKey ? '#059669' : '#64748b',
          border: `1px solid ${hasKey ? '#a7f3d0' : '#e2e8f0'}`
        }}>
          {loading ? '확인 중…' : hasKey ? '🟢 저장됨' : '⚪ 미등록'}
        </span>
      </div>

      {!encryptionAvailable && (
        <span style={{ color: '#d97706', fontSize: '0.75rem', fontWeight: '600' }}>
          ⚠️ {t('settings.apiKeyEncUnavailable')}
        </span>
      )}

      {/* 중앙: 인풋 필드 + 인라인 슬림 저장/삭제 버튼 */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => onKeyInput(e.target.value)}
          placeholder={t('settings.ttsKeyPlaceholder', { label })}
          disabled={busy || !encryptionAvailable}
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            height: '36px',
            padding: '0 12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '0.82rem',
            color: '#1e293b',
            outline: 'none',
            transition: 'all 0.15s ease'
          }}
          onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#ffffff' }}
          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
        />

        <button
          type="button"
          onClick={onSave}
          disabled={busy || !encryptionAvailable || !keyInput.trim()}
          style={{
            height: '36px',
            padding: '0 14px',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: (!busy && encryptionAvailable && keyInput.trim()) ? 'pointer' : 'not-allowed',
            opacity: (!busy && encryptionAvailable && keyInput.trim()) ? 1 : 0.5,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
          }}
        >
          {busy ? '저장 중…' : '저장'}
        </button>

        {hasKey && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            style={{
              height: '36px',
              padding: '0 10px',
              background: '#ffffff',
              border: '1px solid #fecdd3',
              borderRadius: '10px',
              color: '#e11d48',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            삭제
          </button>
        )}
      </div>

      {extraNote && (
        <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '-2px' }}>
          ※ {extraNote}
        </span>
      )}
    </div>
  )
}
