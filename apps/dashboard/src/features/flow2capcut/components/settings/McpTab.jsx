import { useState, useEffect } from 'react'
import { toast } from '../Toast'

export default function McpTab({ localSettings, setLocalSettings, t }) {
  const port = localSettings.mcpHttpPort || 3210
  const docsUrl = `http://127.0.0.1:${port}/api/docs`

  const [mcpStatus, setMcpStatus] = useState(null)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [skills, setSkills] = useState([])
  const [selectedSkills, setSelectedSkills] = useState({})

  const refreshStatus = async () => {
    const status = await window.electronAPI.mcpStatus()
    if (status.success) setMcpStatus(status)
  }

  const refreshSkills = async () => {
    const result = await window.electronAPI.skillsList()
    if (result.success) {
      setSkills(result.skills)
      // 기본값: 모두 체크 (사용자가 필요 없으면 uncheck)
      const initial = {}
      result.skills.forEach(s => { initial[s.name] = true })
      setSelectedSkills(initial)
    }
  }

  useEffect(() => {
    refreshStatus()
    refreshSkills()
  }, [])

  const handleRegister = async () => {
    if (!mcpStatus?.claudeCodeInstalled) {
      setShowInstallModal(true)
      return
    }
    setBusy(true)
    const result = await window.electronAPI.mcpRegister()
    if (!result.success) {
      setBusy(false)
      toast.error(t('settings.mcpRegisterFailed', { error: result.error }))
      return
    }

    // 선택된 스킬 설치 + uncheck된 설치 스킬 제거
    const toInstall = skills.filter(s => selectedSkills[s.name] && !s.installed).map(s => s.name)
    const toRemove = skills.filter(s => !selectedSkills[s.name] && s.installed).map(s => s.name)
    let skillMsg = ''
    if (toInstall.length > 0) {
      const skillResult = await window.electronAPI.skillsInstall({ names: toInstall, variables: {} })
      if (skillResult.success) skillMsg += ` +${skillResult.installed.length}`
      else toast.error(t('settings.skillsInstallFailed', { error: skillResult.error }))
    }
    if (toRemove.length > 0) {
      for (const name of toRemove) {
        await window.electronAPI.skillsUninstall({ name })
      }
      skillMsg += ` -${toRemove.length}`
    }

    setBusy(false)
    toast.success(t('settings.mcpRegisterSuccess') + (skillMsg ? ` (skills: ${skillMsg.trim()})` : ''))
    refreshStatus()
    refreshSkills()
  }

  const handleUnregister = async () => {
    setBusy(true)
    const result = await window.electronAPI.mcpUnregister()
    setBusy(false)
    if (result.success) {
      toast.success(t('settings.mcpUnregisterSuccess'))
      refreshStatus()
    } else {
      toast.error(t('settings.mcpUnregisterFailed', { error: result.error }))
    }
  }

  return (
    <div className="settings-tab-content">
      {/* Claude Code 연동 */}
      <div className="settings-section">
        <h3>{t('settings.mcpClaudeTitle')}</h3>

        <div className="setting-row" style={{ gridTemplateColumns: '140px 1fr' }}>
          <label className="setting-label">{t('settings.mcpStatusLabel')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mcpStatus === null && <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>{t('settings.mcpChecking')}</span>}
            {mcpStatus && !mcpStatus.claudeCodeInstalled && (
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontSize: '0.75rem', fontWeight: 800 }}>
                {t('settings.mcpClaudeNotInstalled')}
              </span>
            )}
            {mcpStatus?.claudeCodeInstalled && mcpStatus.registered && !mcpStatus.needsUpdate && (
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '0.75rem', fontWeight: 800 }}>
                ✓ {t('settings.mcpRegistered')}
              </span>
            )}
            {mcpStatus?.claudeCodeInstalled && mcpStatus.registered && mcpStatus.needsUpdate && (
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontSize: '0.75rem', fontWeight: 800 }}>
                ⚠ {t('settings.mcpNeedsUpdate')}
              </span>
            )}
            {mcpStatus?.claudeCodeInstalled && !mcpStatus.registered && (
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700 }}>
                {t('settings.mcpNotRegistered')}
              </span>
            )}
          </div>
        </div>

        {skills.length > 0 && (
          <div className="setting-row-stack" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="setting-label">{t('settings.mcpSkills')}</label>
              <span className="setting-sublabel">{t('settings.mcpSkillsHint')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {skills.map(skill => {
                const checked = !!selectedSkills[skill.name]
                let statusText, statusColor
                if (skill.installed && checked) {
                  statusText = `✓ ${t('settings.mcpSkillInstalled')}`
                  statusColor = '#10b981'
                } else if (skill.installed && !checked) {
                  statusText = `⚠ ${t('settings.mcpSkillWillRemove')}`
                  statusColor = '#f59e0b'
                } else if (!skill.installed && checked) {
                  statusText = `＋ ${t('settings.mcpSkillWillInstall')}`
                  statusColor = '#3b82f6'
                } else {
                  statusText = `− ${t('settings.mcpSkillNotInstalled')}`
                  statusColor = '#888'
                }
                return (
                  <label key={skill.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'var(--muted, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setSelectedSkills(s => ({ ...s, [skill.name]: e.target.checked }))}
                      disabled={busy}
                      style={{ marginTop: '3px', accentColor: '#2563eb' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--foreground, #0f172a)' }}>{skill.name}</span>
                        <span style={{ color: statusColor, fontSize: '11px', fontWeight: 700 }}>{statusText}</span>
                      </div>
                      {skill.description && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground, #64748b)', lineHeight: '1.4' }}>{skill.description}</span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="setting-row-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border, #e2e8f0)', gap: '12px' }}>
          <div>
            <label className="setting-label">{t('settings.mcpAction')}</label>
            <span className="setting-sublabel" style={{ display: 'block', marginTop: '2px' }}>
              {t('settings.mcpRegisterHint')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {(!mcpStatus?.registered || mcpStatus?.needsUpdate) && (
              <button
                className="btn-primary"
                style={{ height: '36px', padding: '0 16px', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={handleRegister}
                disabled={busy}
              >
                {mcpStatus?.needsUpdate ? t('settings.mcpBtnUpdatePath') : t('settings.mcpBtnRegister')}
              </button>
            )}
            {mcpStatus?.registered && (
              <button
                className="btn-secondary"
                style={{ height: '36px', padding: '0 16px', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={handleUnregister}
                disabled={busy}
              >
                {t('settings.mcpBtnUnregister')}
              </button>
            )}
          </div>
        </div>

        {mcpStatus?.registered && mcpStatus?.currentPath && (
          <div className="setting-row">
            <label className="setting-label">{t('settings.mcpPath')}</label>
            <code style={{ fontSize: '11px', color: '#888', wordBreak: 'break-all' }}>
              {mcpStatus.currentPath}
            </code>
          </div>
        )}
      </div>

      {/* MCP HTTP 서버 */}
      <div className="settings-section">
        <h3>{t('settings.mcpHttpSettings')}</h3>

        <div className="setting-row">
          <label className="setting-label">{t('settings.mcpHttpEnabled')}</label>
          <div className="batch-selector">
            <button
              className={`batch-btn ${localSettings.mcpHttpEnabled ? 'active' : ''}`}
              onClick={() => setLocalSettings(s => ({ ...s, mcpHttpEnabled: true }))}
            >
              ON
            </button>
            <button
              className={`batch-btn ${!localSettings.mcpHttpEnabled ? 'active' : ''}`}
              onClick={() => setLocalSettings(s => ({ ...s, mcpHttpEnabled: false }))}
            >
              OFF
            </button>
          </div>
          <span className="setting-sublabel">{t('settings.mcpHttpHint')}</span>
        </div>

        {localSettings.mcpHttpEnabled && (
          <>
            <div className="setting-row">
              <label className="setting-label">{t('settings.mcpHttpPort')}</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setLocalSettings(s => ({ ...s, mcpHttpPort: parseInt(e.target.value) || 3210 }))}
                min="1024" max="65535" step="1"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 0' }}>
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4a9eff', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
              >
                {docsUrl}
              </a>
              <span style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>{t('settings.mcpApiDocsHint') || 'Swagger UI에서 API 문서를 확인할 수 있습니다'}</span>
            </div>
          </>
        )}
      </div>

      {/* Claude Code 설치 안내 모달 */}
      {showInstallModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
          }}
          onClick={() => setShowInstallModal(false)}
        >
          <div
            style={{
              background: '#1f2937', padding: '24px', borderRadius: '8px',
              maxWidth: '480px', color: '#f3f4f6', border: '1px solid #374151',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>{t('settings.mcpInstallTitle')}</h3>
            <p style={{ margin: '0 0 16px', fontSize: '14px', lineHeight: '1.6', color: '#d1d5db' }}>
              {t('settings.mcpInstallDesc')}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowInstallModal(false)}
              >
                {t('settings.mcpClose')}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  window.electronAPI.openExternal?.('https://claude.com/code')
                  setShowInstallModal(false)
                }}
              >
                {t('settings.mcpDownload')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
