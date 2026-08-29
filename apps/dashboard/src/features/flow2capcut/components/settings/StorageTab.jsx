/**
 * StorageTab - 저장 설정 탭 (저장 모드 + 폴더 설정 + 프로젝트 관리)
 */

import { useState, useEffect } from 'react'
import { fileSystemAPI } from '../../hooks/useFileSystem'
import { generateProjectName } from '../../utils/formatters'
import { toast } from '../Toast'
import AspectRatioSelector from './AspectRatioSelector'

// ============================================
// ProjectManager - 프로젝트 관리 컴포넌트
// ============================================

function ProjectManager({ projectName, aspectRatio = '16:9', onProjectChange, onCreateProject, t }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [newProjectName, setNewProjectName] = useState('')
  const [newAspectRatio, setNewAspectRatio] = useState(aspectRatio)
  const [showNewProject, setShowNewProject] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async (currentProjectName = projectName, excludeName = null) => {
    setLoading(true)
    const result = await fileSystemAPI.listProjects()
    if (result.success) {
      let projectList = result.projects

      // 이름 변경된 경우 이전 이름 제외 (폴더가 아직 남아있어도)
      if (excludeName) {
        projectList = projectList.filter(p => p !== excludeName)
      }

      // 현재 projectName이 목록에 없으면 추가 (아직 폴더 생성 전)
      if (currentProjectName && !projectList.includes(currentProjectName)) {
        projectList = [currentProjectName, ...projectList]
      }

      setProjects(projectList)

      // 현재 선택된 프로젝트가 없으면 첫 번째 또는 새로 생성
      if (!currentProjectName && projectList.length > 0) {
        onProjectChange(projectList[0])
      }
    }
    setLoading(false)
  }

  const handleCreateProject = async () => {
    // 공백 → 언더스코어 변환
    const name = (newProjectName.trim().replace(/\s+/g, '_')) || generateProjectName()

    // 이미 존재하는 이름이면 '신규 생성'이 아니다 — 막는다. 그대로 두면
    // handleProjectChange 가 선택한 화면비(opts.aspectRatio)로 기존 프로젝트의
    // project.json 화면비를 덮어쓴다.
    const exists = await fileSystemAPI.projectExists(name)
    if (exists) {
      toast.warning(t('settings.projectExists'))
      return
    }

    // 프로젝트 폴더 생성
    const result = await fileSystemAPI.getProjectFolder(name)
    if (result.success) {
      // onCreateProject 는 async (전환 + 메타 저장 + 실패 시 롤백). 결과를 받아
      // 전환 실패면 사용자에게 알린다. 폼은 그래도 닫는다 — getProjectFolder 로
      // 폴더는 이미 생성됐으므로(같은 이름 재생성이 막힘) 폼을 열어두면 dead-end 다.
      // 프로젝트는 목록(드롭다운)에서 선택할 수 있다.
      const res = await onCreateProject(name, newAspectRatio)
      if (res && res.success === false) {
        toast.error(t('toast.projectCreateFailed'))
      }
      setNewProjectName('')
      setShowNewProject(false)
      await loadProjects(name)
    }
  }

  const handleStartEdit = () => {
    setEditName(projectName || '')
    setEditMode(true)
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setEditName('')
  }

  const handleRename = async () => {
    // 공백 → 언더스코어 변환
    const newName = editName.trim().replace(/\s+/g, '_')
    if (!newName || newName === projectName) {
      handleCancelEdit()
      return
    }

    // 유효한 폴더명인지 확인
    if (/[<>:"/\\|?*]/.test(newName)) {
      toast.warning(t('settings.invalidProjectName'))
      return
    }

    // 이전 프로젝트명 저장
    const oldName = projectName

    // 기존 폴더가 존재하는지 확인
    const exists = await fileSystemAPI.projectExists(oldName)

    if (!exists) {
      // 폴더 없음 - 메모리(설정)만 변경
      onProjectChange(newName)
      setEditMode(false)
      setEditName('')
      await loadProjects(newName, oldName)
      return
    }

    // 폴더 있음 - 실제 폴더명 변경
    setRenaming(true)
    const result = await fileSystemAPI.renameProject(oldName, newName)
    setRenaming(false)

    if (result.success) {
      onProjectChange(newName)
      setEditMode(false)
      setEditName('')
      await loadProjects(newName, oldName)
      toast.success(t('toast.projectRenamed'))
    } else if (result.error === 'already_exists') {
      toast.warning(t('settings.projectExists'))
    } else {
      toast.error(`${t('settings.renameFailed')}: ${result.error}`)
    }
  }

  return (
    <div className="setting-row project-manager" style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
      <label className="setting-label">{t('settings.project')}</label>

      {loading ? (
        <div className="project-loading" style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>⏳ {t('common.loading')}</div>
      ) : (
        <>
          {/* 편집 모드 */}
          {editMode ? (
            <div className="project-edit-form" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') handleCancelEdit()
                }}
                style={{ height: '34px', flex: 1, padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                autoFocus
                disabled={renaming}
              />
              <button
                className="btn-primary"
                style={{ height: '34px', padding: '0 12px', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={handleRename}
                disabled={renaming}
              >
                {renaming ? '...' : t('common.confirm')}
              </button>
              <button
                className="btn-secondary"
                style={{ height: '34px', padding: '0 12px', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={handleCancelEdit}
                disabled={renaming}
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <div className="project-selector" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={projectName || ''}
                onChange={(e) => onProjectChange(e.target.value)}
                style={{ height: '34px', minWidth: '150px', flex: 1, padding: '0 10px', background: 'var(--muted, #f1f5f9)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground, #0f172a)' }}
              >
                {projects.length === 0 && (
                  <option value="">{t('settings.noProjects')}</option>
                )}
                {projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* 이름 변경 버튼 */}
              {projectName && (
                <button
                  className="btn-secondary"
                  style={{ height: '34px', width: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                  onClick={handleStartEdit}
                  title={t('settings.renameProject')}
                >
                  ✏️
                </button>
              )}

              <button
                className="btn-secondary"
                style={{ height: '34px', width: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                onClick={() => {
                  setNewAspectRatio(aspectRatio)
                  setShowNewProject(!showNewProject)
                }}
                title={t('settings.createProject')}
              >
                ➕
              </button>
            </div>
          )}

          {/* 현재 프로젝트 경로 배지 */}
          {projectName && !editMode && (
            <div className="project-path" style={{ padding: '4px 8px', background: 'var(--muted, #f1f5f9)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground, #64748b)', fontFamily: 'monospace' }}>
              📁 {projectName}/
            </div>
          )}
        </>
      )}

      {/* 새 프로젝트 생성 모달/폼 (하단 전체폭) */}
      {showNewProject && !editMode && (
        <div className="new-project-form" style={{ gridColumn: '1 / -1', marginTop: '8px', padding: '12px', background: 'var(--muted, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="new-project-row" style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={t('settings.projectNamePlaceholder')}
              style={{ height: '34px', flex: 1, padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
            />
            <button className="btn-primary" style={{ height: '34px', padding: '0 14px', borderRadius: '8px', fontSize: '0.8rem' }} onClick={handleCreateProject}>
              {t('settings.create')}
            </button>
            <button className="btn-secondary" style={{ height: '34px', padding: '0 14px', borderRadius: '8px', fontSize: '0.8rem' }} onClick={() => setShowNewProject(false)}>
              {t('common.cancel')}
            </button>
          </div>
          {/* 화면비: 롱폼(16:9) / 숏폼(9:16) */}
          <AspectRatioSelector value={newAspectRatio} onChange={setNewAspectRatio} t={t} />
        </div>
      )}
    </div>
  )
}

// ============================================
// StorageTab - 저장 설정 메인 탭
// ============================================

export default function StorageTab({
  localSettings,
  setLocalSettings,
  workFolder,
  onSelectFolder,
  onProjectChange,
  highlight,
  t
}) {
  const validFolderName = (workFolder.name && workFolder.name !== 'undefined') ? workFolder.name : ''
  const isDeleted = workFolder.error === 'folder_deleted'
  const showFolderWarning = localSettings.saveMode === 'folder' && !validFolderName
  const showFolderDeletedWarning = localSettings.saveMode === 'folder' && isDeleted

  return (
    <div className={`tab-panel ${highlight ? 'highlight' : ''}`}>
      {showFolderDeletedWarning && (
        <div className="settings-alert error" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
          ❌ 작업 폴더가 삭제되었거나 이동되었습니다. [작업 폴더 선택]을 눌러 다시 지정해 주세요.
        </div>
      )}
      {showFolderWarning && !showFolderDeletedWarning && (
        <div className="settings-alert" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
          ⚠️ {t('settings.folderRequired') || '작업 폴더가 지정되지 않았습니다. 폴더를 선택해 주세요.'}
        </div>
      )}

      {/* 작업 폴더 선택 — saveMode 는 항상 folder */}
      {localSettings.saveMode === 'folder' && (
        <div className={`setting-row-stack ${!validFolderName || isDeleted ? 'highlight-box' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="setting-label">{t('settings.workFolder')}</label>
            <button className="btn-primary" style={{ height: '34px', padding: '0 14px', borderRadius: '8px', fontSize: '0.8rem' }} onClick={onSelectFolder}>
              {validFolderName && !isDeleted ? t('settings.changeFolder') : t('settings.selectFolder')}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--muted, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px' }}>
            <div className="folder-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {validFolderName && !isDeleted ? (
                <span className="folder-name" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--foreground, #0f172a)' }}>
                  📂 {validFolderName}
                </span>
              ) : isDeleted ? (
                <span className="folder-name deleted" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#ef4444' }}>
                  📂 {validFolderName || '이전 작업 폴더'} <span className="permission-badge deleted" style={{ color: '#ef4444', marginLeft: '6px' }}>❌ 폴더가 삭제됨</span>
                </span>
              ) : (
                <span className="folder-empty" style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>📂 {t('settings.folderNotSelected') || '작업 폴더가 선택되지 않았습니다.'}</span>
              )}
            </div>
            {validFolderName && !isDeleted && (
              <span className="setting-sublabel" style={{ fontSize: '0.73rem', color: 'var(--muted-foreground)' }}>{t('settings.projectNote')}</span>
            )}
          </div>
        </div>
      )}

      {/* 폴더 모드 - 프로젝트 관리 */}
      {localSettings.saveMode === 'folder' && workFolder.name && !workFolder.error && (
        <ProjectManager
          projectName={localSettings.projectName}
          aspectRatio={localSettings.aspectRatio || '16:9'}
          onProjectChange={async (name) => {
            // projectName 을 optimistic 하게 먼저 갱신(드롭다운 즉시 반영)하되,
            // 전환이 실패하면(success:false) 이전 값으로 롤백한다 — 안 그러면 모달은
            // 새 프로젝트, 앱은 이전 프로젝트로 어긋난다.
            const prev = { projectName: localSettings.projectName, aspectRatio: localSettings.aspectRatio }
            setLocalSettings(s => ({ ...s, projectName: name }))
            if (onProjectChange) {
              const res = await onProjectChange(name)
              if (res && res.success === false) {
                setLocalSettings(s => ({ ...s, ...prev }))
              } else if (res?.aspectRatio) {
                setLocalSettings(s => ({ ...s, aspectRatio: res.aspectRatio }))
              }
            }
          }}
          onCreateProject={async (name, ratio) => {
            // 위와 동일 — 생성 경로도 optimistic 갱신 + 실패 시 롤백.
            // 전환 결과(res)를 호출부(handleCreateProject)로 그대로 반환한다.
            const prev = { projectName: localSettings.projectName, aspectRatio: localSettings.aspectRatio }
            setLocalSettings(s => ({ ...s, projectName: name, aspectRatio: ratio }))
            if (!onProjectChange) return undefined
            // isNewProject: 신규 생성임을 명시 — handleProjectChange 가 기존
            // project.json 값 대신 이 화면비를 쓰도록.
            const res = await onProjectChange(name, { aspectRatio: ratio, isNewProject: true })
            if (res && res.success === false) {
              setLocalSettings(s => ({ ...s, ...prev }))
            }
            return res
          }}
          t={t}
        />
      )}

    </div>
  )
}
