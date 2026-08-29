/**
 * Header Component - Flow AI 비디오 렌더러 상단 바
 *
 * 지원 기능:
 * - 프로젝트 선택 및 관리 (폴더 모드)
 * - Flow 상태 및 자동 인증 폴링 / 로그인 버튼
 * - 👤 Flow 멀티 프로필 계정 관리 드롭다운 (다중창 계정 전환/추가/삭제)
 * - 📐 LayoutPicker (Flow 좌/우/상/하 분할 방향 및 실시간 비율 조절)
 * - ♻️ Flow 초기화 (구글 세션 초기화 및 재로그인)
 * - 📖 Story 모드 (AI 대본/스토리 생성 파이프라인)
 * - 📦 내보내기 (CapCut / Premiere / Vrew 통합 분할 버튼)
 * - 🌐 언어 선택 (LanguagePicker)
 * - ⚙️ 환경설정 & 👤 사용자 메뉴
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '../hooks/useI18n'
import { TIMING } from '../config/defaults'
import { fileSystemAPI } from '../hooks/useFileSystem'
import { useMode } from '../contexts/ModeContext'
import { flowLayoutForMode } from '../utils/appLayout'
import { UserMenu } from './UserMenu'
import ModeToggle from './ModeToggle'
import LanguagePicker from './LanguagePicker'
import { SideDrawer } from './SideDrawer'
import Modal from './Modal'
import ExportSplitButton from './ExportSplitButton'
import { toast } from './Toast'
import './Header.css'

// ============================================================
// LayoutPicker — 헤더 인라인 레이아웃 분할 컨트롤
// ============================================================
const LAYOUT_MODES = [
  { value: 'split-left',   icon: '⬅', label: 'Flow 좌측' },
  { value: 'split-right',  icon: '➡', label: 'Flow 우측' },
  { value: 'split-top',    icon: '⬆', label: 'Flow 상단' },
  { value: 'split-bottom', icon: '⬇', label: 'Flow 하단' },
]

function LayoutPicker() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('layoutSettings') || '{}').mode || 'split-left' } catch { return 'split-left' }
  })
  const [ratio, setRatio] = useState(() => {
    try { return Math.round((JSON.parse(localStorage.getItem('layoutSettings') || '{}').ratio || 0.5) * 100) } catch { return 50 }
  })
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = window.electronAPI?.onLayoutChanged
    if (handler) {
      return handler(({ mode: m, splitRatio: r }) => {
        setMode(m)
        setRatio(Math.round((r || 0.5) * 100))
      })
    }
  }, [])

  const applyLayout = useCallback((newMode, newRatioInt) => {
    const r = newRatioInt / 100
    localStorage.setItem('layoutSettings', JSON.stringify({ mode: newMode, ratio: r }))
    window.electronAPI?.setLayout?.({ mode: newMode, ratio: r })
  }, [])

  const handleModeChange = (newMode) => {
    setMode(newMode)
    applyLayout(newMode, ratio)
  }

  const handleRatioChange = (e) => {
    const v = parseInt(e.target.value)
    setRatio(v)
    const r = v / 100
    localStorage.setItem('layoutSettings', JSON.stringify({ mode, ratio: r }))
    window.electronAPI?.updateSplit?.({ ratio: r })
  }

  const currentMode = LAYOUT_MODES.find(m => m.value === mode) || LAYOUT_MODES[0]

  return (
    <div className="layout-picker" ref={ref}>
      <button
        type="button"
        className="layout-picker-btn"
        onClick={() => setOpen(v => !v)}
        title="화면 분할 레이아웃 변경"
      >
        <span className="layout-picker-icon">{currentMode.icon}</span>
        <span className="layout-picker-label">{ratio}%</span>
        <svg className="layout-picker-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="layout-picker-menu">
          <div className="layout-picker-title">📐 화면 분할 배치</div>
          <div className="layout-mode-grid">
            {LAYOUT_MODES.map(m => (
              <button
                key={m.value}
                type="button"
                className={`layout-mode-btn ${mode === m.value ? 'active' : ''}`}
                onClick={() => handleModeChange(m.value)}
                title={m.label}
              >
                <span className="lm-icon">{m.icon}</span>
                <span className="lm-label">{m.label}</span>
              </button>
            ))}
          </div>
          <div className="layout-ratio-row">
            <span className="layout-ratio-label">Flow 크기</span>
            <div className="layout-ratio-slider-wrap">
              <span className="layout-ratio-edge">20%</span>
              <input
                type="range"
                min="20" max="80" step="5"
                value={ratio}
                onChange={handleRatioChange}
                className="layout-ratio-slider"
              />
              <span className="layout-ratio-edge">80%</span>
            </div>
            <span className="layout-ratio-val">{ratio}%</span>
          </div>
          <div className="layout-picker-hint">💡 경계선 더블클릭 → 50:50 리셋</div>
        </div>
      )}
    </div>
  )
}

export default function Header({
  onSettings,
  onExport,
  exportFormat = 'capcut',
  hasImages,
  getAccessToken,
  clearTokenCache,
  authReady,
  setAuthReady,
  onAuthRecovered,
  projectName,
  projectLoading = false,
  onProjectChange,
  onNewProject,
  saveMode,
  onLoginClick,
  onUpgradeClick,
  disabled = false,
  modeBusy = false,
  storyActive = false,
  onStoryClick,
}) {
  const { t, lang, changeLang, languages } = useI18n()
  const { mode } = useMode()
  const [authStatus, setAuthStatus] = useState('checking')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [projects, setProjects] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const dropdownRef = useRef(null)
  const pollingRef = useRef(null)
  const mountedRef = useRef(true)
  const authCheckSeqRef = useRef(0)
  const flowUnavailableRef = useRef(false)
  const modeRef = useRef(mode)

  // -------------------------------------------------------------
  // Flow Multi-Profile Manager States & Handlers
  // -------------------------------------------------------------
  const [profileConfig, setProfileConfig] = useState({ activeProfileId: 'default', profiles: [] })
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileDropdownRef = useRef(null)

  const loadFlowProfiles = async () => {
    try {
      if (window.electronAPI?.loadProfiles) {
        const config = await window.electronAPI.loadProfiles()
        if (config) {
          setProfileConfig(config)
        }
      }
    } catch (err) {
      console.error('Failed to load flow profiles:', err)
    }
  }

  // 프로필 전환 처리
  const handleProfileSwitch = async (profileId) => {
    setShowProfileDropdown(false)
    try {
      setAuthStatus('checking')
      clearTokenCache?.()
      setAuthReady?.(false)
      const result = await window.electronAPI?.switchProfile?.({ profileId })
      if (result?.success) {
        await loadFlowProfiles()
        setTimeout(() => checkAuth(true), 2000)
      } else {
        alert(`프로필 전환 실패: ${result?.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      alert(`프로필 전환 에러: ${err.message}`)
    }
  }

  // 프로필 삭제
  const handleDeleteProfile = async (profileId) => {
    const activeProfile = profileConfig.profiles.find(p => p.id === profileId)
    const confirmDelete = window.confirm(
      lang === 'ko'
        ? `정말 "${activeProfile?.name || '선택한'}" 프로필을 삭제하시겠습니까?\n해당 프로필의 로그인 세션 및 쿠키 정보가 영구 삭제됩니다.`
        : `Are you sure you want to delete "${activeProfile?.name || 'selected'}" profile?\nSession cookies will be cleared.`
    )
    if (!confirmDelete) return

    try {
      const result = await window.electronAPI?.deleteProfile?.({ profileId })
      if (result?.success) {
        await loadFlowProfiles()
      } else {
        alert(`프로필 삭제 실패: ${result?.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      alert(`프로필 삭제 에러: ${err.message}`)
    }
  }

  // 구글/Flow 로그인 세션 강제 초기화
  const handleFlowReset = async () => {
    const confirmReset = window.confirm(
      lang === 'ko'
        ? '정말 구글/Flow 로그인 세션을 완전히 삭제하고 초기화하시겠습니까?\n새로운 구글 계정으로 로그인할 수 있게 됩니다.'
        : 'Are you sure you want to purge and reset your Google/Flow login session?'
    )
    if (!confirmReset) return

    try {
      setAuthStatus('checking')
      clearTokenCache?.()
      const result = await window.electronAPI?.clearFlowSession?.()
      if (result?.success) {
        setAuthStatus('unauthenticated')
        setAuthReady?.(false)
        alert(
          lang === 'ko'
            ? '구글/Flow 세션이 완전히 초기화되었습니다. 새로운 구글 계정으로 로그인해 주세요!'
            : 'Google/Flow session cleared successfully.'
        )
      } else {
        setAuthStatus('authenticated')
        alert(`초기화 실패: ${result?.error || 'Unknown error'}`)
      }
    } catch (err) {
      setAuthStatus('authenticated')
      alert(`초기화 에러: ${err.message}`)
    }
  }

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => {
    mountedRef.current = true
    loadFlowProfiles()

    const handleClickOutsideProfile = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutsideProfile)
    return () => {
      mountedRef.current = false
      document.removeEventListener('mousedown', handleClickOutsideProfile)
    }
  }, [])

  // authReady가 바뀌면 상태 동기화
  useEffect(() => {
    authCheckSeqRef.current += 1
    if (flowUnavailableRef.current && mode === 'flow') return
    if (authReady) {
      setAuthStatus('authenticated')
      stopPolling()
    } else {
      setAuthStatus('unauthenticated')
    }
  }, [authReady, mode])

  // Flow 지역 제한 감지
  useEffect(() => {
    const handleFlowStatus = (data) => {
      if (data?.unavailable && mode === 'flow') {
        flowUnavailableRef.current = true
        authCheckSeqRef.current += 1
        setAuthStatus('unavailable')
        stopPolling()
      }
    }
    const off = window.electronAPI?.onFlowStatus?.(handleFlowStatus)
    return () => {
      off?.()
      stopPolling()
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'flow') {
      flowUnavailableRef.current = false
      setAuthStatus(s => (s === 'unavailable' ? (authReady ? 'authenticated' : 'unauthenticated') : s))
    }
  }, [mode, authReady])

  // 인증 상태 확인 함수
  const checkAuth = useCallback(async (isRecovery = false) => {
    if (!getAccessToken) return
    const currentSeq = ++authCheckSeqRef.current

    try {
      const token = await getAccessToken(false)
      if (!mountedRef.current || currentSeq !== authCheckSeqRef.current) return
      if (token) {
        setAuthStatus('authenticated')
        stopPolling()
        if (isRecovery) {
          onAuthRecovered?.()
        }
      } else {
        if (!pollingRef.current) {
          setAuthStatus('unauthenticated')
        }
      }
    } catch {
      if (!mountedRef.current || currentSeq !== authCheckSeqRef.current) return
      if (!pollingRef.current) {
        setAuthStatus('unauthenticated')
      }
    }
  }, [getAccessToken, onAuthRecovered])

  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    setAuthStatus('waiting')
    pollingRef.current = setInterval(() => {
      checkAuth(true)
    }, TIMING.AUTH_POLL_INTERVAL)
  }, [checkAuth])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  useEffect(() => {
    checkAuth()
    return () => stopPolling()
  }, [checkAuth])

  const openFlow = async () => {
    if (window.electronAPI) {
      startPolling()
      try {
        await window.electronAPI.setLayout?.({ mode: flowLayoutForMode(modeRef.current) })
      } catch (err) {
        console.error('Failed to open Flow:', err)
        stopPolling()
        setAuthStatus('unauthenticated')
      }
    }
  }

  // 프로젝트 목록 로드
  useEffect(() => {
    if (saveMode === 'folder') {
      loadProjects()
    }
  }, [saveMode, projectName])

  const loadProjects = async () => {
    try {
      const list = await fileSystemAPI.listProjects()
      const safeList = Array.isArray(list) ? list : (Array.isArray(list?.projects) ? list.projects : [])
      setProjects(safeList)
    } catch (err) {
      console.error('Failed to load projects:', err)
      setProjects([])
    }
  }

  const handleProjectSelect = (name) => {
    if (name !== projectName) {
      onProjectChange?.(name)
    }
    setShowProjectDropdown(false)
  }

  const handleNewProject = () => {
    setShowProjectDropdown(false)
    onNewProject?.()
  }

  const handleDeleteClick = (e, name) => {
    e.stopPropagation()
    setDeleteTarget(name)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const result = await fileSystemAPI.deleteProject(deleteTarget)
    if (result.success) {
      await loadProjects()
      if (deleteTarget === projectName) {
        const remaining = projects.filter(p => p !== deleteTarget)
        if (remaining.length > 0) {
          onProjectChange?.(remaining[0])
        } else {
          onNewProject?.()
        }
      }
    } else {
      alert(`삭제 실패: ${result.error || 'Unknown error'}`)
    }
    setDeleteTarget(null)
    setShowProjectDropdown(false)
  }

  const isFlowMode = mode === 'flow'
  const authenticatedLabel = isFlowMode
    ? (t('header.authenticated') || 'Flow 연결됨')
    : (t('header.apiModeAuthenticated') || 'API 연결됨')
  const authActionLabel = isFlowMode
    ? (t('header.login') || 'Flow 로그인')
    : (t('header.apiModeLogin') || 'API 재연결')
  const authActionIcon = isFlowMode ? '🔑' : '🔌'

  const activeProfile = profileConfig.profiles.find(p => p.id === profileConfig.activeProfileId)

  return (
    <>
    <header className="header flow-renderer-header">
      <div className="header-left">
        <button
          className="hamburger-btn"
          onClick={() => setShowDrawer(true)}
          data-tooltip={t('header.menu')}
        >
          <span className="hamburger-icon">☰</span>
        </button>

        <h1 className="logo">
          <span className="logo-text">Flow AI Video Renderer</span>
        </h1>

        {/* 프로젝트 선택기 (폴더 모드) */}
        {saveMode === 'folder' && (
          <div className={`project-selector-header ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
            <button
              className="project-current"
              onClick={() => !disabled && setShowProjectDropdown(!showProjectDropdown)}
              disabled={disabled || projectLoading}
              title={disabled ? t('headerExtra.cannotChangeProject') : ''}
            >
              <span className="project-icon">{projectLoading ? '⏳' : '📁'}</span>
              <span className="project-name">{projectLoading ? '로딩 중...' : (projectName || t('settings.noProjects'))}</span>
              <span className="dropdown-arrow">{showProjectDropdown ? '▲' : '▼'}</span>
            </button>

            {showProjectDropdown && (
              <div className="project-dropdown">
                {(!Array.isArray(projects) || projects.length === 0) ? (
                  <div className="project-empty">{t('settings.noProjects')}</div>
                ) : (
                  projects.map(p => (
                    <div
                      key={p}
                      className={`project-option ${p === projectName ? 'active' : ''}`}
                      onClick={() => handleProjectSelect(p)}
                    >
                      <span className="project-option-name">{p}</span>
                      <span className="project-option-actions">
                        {p === projectName && <span className="check">✓</span>}
                        <button
                          className="project-delete-btn"
                          onClick={(e) => handleDeleteClick(e, p)}
                          title={t('settings.deleteProject') || '삭제'}
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  ))
                )}
                <div className="project-divider"></div>
                <div className="project-option new-project" onClick={handleNewProject}>
                  <span>+</span> {t('settings.createProject')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 토큰 상태 표시 */}
        <div className="auth-status">
          {authStatus === 'checking' && (
            <span className="auth-badge checking" data-tooltip={t('header.checking')}>⏳ 확인 중</span>
          )}
          {authStatus === 'authenticated' && (
            <span className="auth-badge authenticated" data-tooltip={authenticatedLabel} onClick={() => checkAuth(false)}>🟢 연결됨</span>
          )}
          {authStatus === 'unavailable' && (
            <span className="auth-badge unavailable" data-tooltip={t('header.unavailable')}>
              🌍 {t('header.unavailable')}
            </span>
          )}
          {authStatus === 'waiting' && (
            <span className="auth-badge waiting" data-tooltip={t('header.waitingLogin')}>
              ⏳ 로그인 대기 중
            </span>
          )}
          {authStatus === 'unauthenticated' && (
            <button className="auth-btn" onClick={openFlow} data-tooltip={authActionLabel}>
              {authActionIcon} {authActionLabel}
            </button>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* 👤 Flow Multi-Profile Selector (다중창 계정 관리) */}
        <div className="flow-profile-container" ref={profileDropdownRef}>
          <button
            className={`btn-profile-selector ${showProfileDropdown ? 'active' : ''}`}
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            title={lang === 'ko' ? 'Flow 구글 다중 계정 프로필 관리' : 'Manage Flow Multi Profiles'}
          >
            <span className="btn-emoji">👤</span>
            <span className="btn-text">
              {activeProfile?.name || (lang === 'ko' ? '프로필' : 'Profile')}
            </span>
            <span className="arrow-icon">{showProfileDropdown ? '▲' : '▼'}</span>
          </button>

          {showProfileDropdown && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-title">
                {lang === 'ko' ? '구글 다중 계정 프로필 선택' : 'Google Profiles'}
              </div>
              <div className="profile-list-scroll">
                {profileConfig.profiles.map(prof => (
                  <div
                    key={prof.id}
                    className={`profile-item-option ${prof.id === profileConfig.activeProfileId ? 'active' : ''}`}
                    onClick={() => handleProfileSwitch(prof.id)}
                  >
                    <div className="profile-item-left">
                      <span className="status-dot">{prof.id === profileConfig.activeProfileId ? '🟢' : '⚪'}</span>
                      <div className="profile-details-text">
                        <span className="profile-item-name">{prof.name}</span>
                        {prof.email && <span className="profile-item-email">{prof.email}</span>}
                        {prof.hardware?.renderer && (
                          <span className="profile-item-gpu">💻 {prof.hardware.renderer.split('(')[1]?.split(')')[0] || 'GPU'}</span>
                        )}
                      </div>
                    </div>
                    {prof.id !== 'default' && (
                      <button
                        className="profile-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProfile(prof.id)
                        }}
                        title={lang === 'ko' ? '프로필 삭제' : 'Delete Profile'}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 📐 화면 분할 배치 컨트롤 */}
        <LayoutPicker />

        {/* ♻️ Flow 초기화 */}
        <button
          className="btn-flow-reset"
          onClick={handleFlowReset}
          title={lang === 'ko' ? 'Flow 계정 및 로그인 세션 초기화' : 'Reset Flow Session'}
        >
          <span className="btn-emoji">♻️</span>
          <span className="btn-text">{lang === 'ko' ? 'Flow 초기화' : 'Reset'}</span>
        </button>

        {/* API / Flow 모드 토글 */}
        <ModeToggle busy={modeBusy} />

        {/* 📖 Story 파이프라인 토글 */}
        {onStoryClick && (
          <button
            type="button"
            className={`btn-story-toggle ${storyActive ? 'active' : ''}`}
            onClick={onStoryClick}
            data-tooltip={t('header.story') || 'Story AI Pipeline'}
          >
            📖 Story
          </button>
        )}

        {/* 📦 내보내기 분할 버튼 (CapCut / Premiere / Vrew) */}
        <ExportSplitButton
          format={exportFormat}
          onSelect={onExport}
          disabled={!hasImages}
          className="btn-export"
          direction="down"
        />

        {/* 언어 선택 */}
        <LanguagePicker
          current={lang}
          languages={languages}
          onChange={changeLang}
          tooltip={t('header.language')}
        />

        {/* 설정 */}
        <button
          className="btn-settings"
          onClick={() => onSettings()}
          data-tooltip={t('header.settings')}
        >
          ⚙️
        </button>

        {/* 사용자 메뉴 */}
        <UserMenu onLoginClick={onLoginClick} onUpgradeClick={onUpgradeClick} />
      </div>
    </header>

    {/* 프로젝트 삭제 확인 모달 */}
    <Modal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      title={t('settings.deleteProject') || '프로젝트 삭제'}
      className="modal-confirm-delete"
      footer={
        <div className="modal-confirm-actions">
          <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>
            {t('common.cancel') || '취소'}
          </button>
          <button className="btn-danger" onClick={handleDeleteConfirm}>
            {t('common.delete') || '삭제'}
          </button>
        </div>
      }
    >
      <p className="modal-confirm-msg">
        <strong>"{deleteTarget}"</strong> {t('settings.deleteConfirm') || '프로젝트를 삭제하시겠습니까?\n모든 이미지와 데이터가 삭제됩니다.'}
      </p>
    </Modal>

    {/* 사이드 드로워 */}
    <SideDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} />
    </>
  )
}
