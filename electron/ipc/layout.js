/**
 * Layout IPC — 레이아웃 모드 변경, Flow 뷰 bounds 관리, 모달 가시성
 */

import { powerSaveBlocker, shell } from 'electron'

let layoutMode = 'split-left'
let splitRatio = 0.45
let modalVisible = false
let flowTabActive = false
let powerSaveBlockerId = null
let sidebarOffset = 0

/**
 * Flow WebContentsView 위치/크기를 현재 레이아웃에 맞게 업데이트
 * @param {BrowserWindow} mainWindow
 * @param {WebContentsView} flowView
 */
export function updateBounds(mainWindow, flowView) {
  if (!mainWindow) return

  const views = global.flowViews ? Array.from(global.flowViews.values()) : (flowView ? [flowView] : [])
  if (views.length === 0) return

  const isHidden = modalVisible || !flowTabActive || layoutMode === 'hidden' || layoutMode === 'none';
  if (isHidden) {
    for (const view of views) {
      if (!view || view.webContents?.isDestroyed?.()) continue
      try { view.setBounds({ x: -10000, y: -10000, width: 0, height: 0 }) } catch (e) {
        console.warn('[Layout] Failed to hide view bounds:', e.message)
      }
    }
    return
  }

  const { width, height } = mainWindow.getContentBounds()
  const GAP = 3
  // 왼쪽 고정 사이드바 너비 (288px) 및 상단 헤더 + 탭 바 높이 (100px)
  const SIDEBAR_W = sidebarOffset > 0 ? sidebarOffset : 288
  const TOP_OFFSET = 100 // Header(56px) + Tab Bar(44px)

  const usableWidth = Math.max(0, width - SIDEBAR_W)
  const usableHeight = Math.max(0, height - TOP_OFFSET)

  let containerRect = { x: 0, y: 0, width: 0, height: 0 }

  if (layoutMode === 'split-left') {
    const splitPos = Math.round(usableWidth * splitRatio)
    containerRect = { x: SIDEBAR_W, y: TOP_OFFSET, width: Math.max(0, splitPos - GAP), height: usableHeight }
  } else if (layoutMode === 'split-right') {
    const splitPos = Math.round(usableWidth * splitRatio)
    containerRect = { x: SIDEBAR_W + Math.min(usableWidth, usableWidth - splitPos + GAP), y: TOP_OFFSET, width: Math.max(0, splitPos - GAP), height: usableHeight }
  } else if (layoutMode === 'split-top') {
    const splitPos = Math.round(usableHeight * splitRatio)
    containerRect = { x: SIDEBAR_W, y: TOP_OFFSET, width: usableWidth, height: Math.max(0, splitPos - GAP) }
  } else if (layoutMode === 'split-bottom') {
    const splitPos = Math.round(usableHeight * splitRatio)
    containerRect = { x: SIDEBAR_W, y: TOP_OFFSET + Math.min(usableHeight, usableHeight - splitPos + GAP), width: usableWidth, height: Math.max(0, splitPos - GAP) }
  }

  global.lastContainerRect = containerRect

  const { x, y, width: cWidth, height: cHeight } = containerRect
  const activeId = global.activeFlowProfileId || 'default'

  // global.flowViews가 Map 형태일 때 활성 뷰만 화면에 꽉 채우고 나머지는 숨김
  if (global.flowViews && global.flowViews.size > 0) {
    for (const [profId, view] of global.flowViews.entries()) {
      if (!view || view.webContents?.isDestroyed?.()) continue
      if (profId === activeId) {
        try { view.setBounds({ x, y, width: cWidth, height: cHeight }) } catch (e) {
          console.warn(`[Layout] Failed to set bounds for active view (${profId}):`, e.message)
        }
      } else {
        try { view.setBounds({ x: -10000, y: -10000, width: 0, height: 0 }) } catch (e) {}
      }
    }
    return
  }

  // fallback 단일 뷰
  if (views.length > 0) {
    try { views[0].setBounds({ x, y, width: cWidth, height: cHeight }) } catch (e) {
      console.warn('[Layout] Failed to set bounds for view 0:', e.message)
    }
  }
}


/**
 * 레이아웃 관련 IPC 핸들러 등록
 * @param {ipcMain} ipcMain
 * @param {Function} getMainWindow - mainWindow getter
 * @param {Function} getFlowView - flowView getter
 */
export function registerLayoutIPC(ipcMain, getMainWindow, getFlowView) {
  ipcMain.handle('app:set-layout', (event, { mode, ratio, sidebarWidth }) => {
    layoutMode = mode || 'split-left'
    if (ratio !== undefined) splitRatio = Math.max(0.2, Math.min(0.8, ratio))
    if (sidebarWidth !== undefined) sidebarOffset = Math.max(0, sidebarWidth)
    updateBounds(getMainWindow(), getFlowView())
    const mw = getMainWindow()
    if (mw) {
      mw.webContents.send('layout-changed', { mode: layoutMode, splitRatio })
    }
    return { success: true, mode: layoutMode, splitRatio }
  })

  ipcMain.handle('app:update-split', (event, { ratio, sidebarWidth }) => {
    if (!getMainWindow()) return
    splitRatio = Math.max(0.2, Math.min(0.8, ratio))
    if (sidebarWidth !== undefined) sidebarOffset = Math.max(0, sidebarWidth)
    updateBounds(getMainWindow(), getFlowView())
    return { success: true, splitRatio }
  })

  ipcMain.handle('app:get-layout', () => {
    return { mode: layoutMode, splitRatio }
  })

  ipcMain.handle('app:set-modal-visible', (event, { visible }) => {
    modalVisible = visible
    updateBounds(getMainWindow(), getFlowView())
    if (visible) {
      getMainWindow()?.webContents?.focus()
    }
    return { success: true }
  })

  ipcMain.handle('app:set-flow-tab-active', (event, { active }) => {
    flowTabActive = Boolean(active)
    updateBounds(getMainWindow(), getFlowView())
    return { success: true, flowTabActive }
  })

  // 화면 꺼짐/절전 방지
  ipcMain.handle('app:set-prevent-sleep', (event, { enabled }) => {
    if (enabled) {
      if (powerSaveBlockerId === null || !powerSaveBlocker.isStarted(powerSaveBlockerId)) {
        powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep')
      }
    } else {
      if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
        powerSaveBlocker.stop(powerSaveBlockerId)
        powerSaveBlockerId = null
      }
    }
    return { success: true, enabled }
  })

  ipcMain.handle('app:get-prevent-sleep', () => {
    return { enabled: powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId) }
  })

  // Open external URL
  ipcMain.handle('app:open-external', (event, { url }) => {
    shell.openExternal(url)
    return { success: true }
  })

  // Reveal file in Finder / Explorer
  ipcMain.handle('app:show-in-folder', (event, { filePath }) => {
    shell.showItemInFolder(filePath)
    return { success: true }
  })
}

export function getLayoutMode() { return layoutMode }
export function setLayoutMode(mode) { layoutMode = mode }
export function getSplitRatio() { return splitRatio }
export function setSplitRatio(ratio) { splitRatio = ratio }
export function getModalVisible() { return modalVisible }
export function setModalVisible(visible) { modalVisible = visible }
export function resetModalState(mainWindow, flowView) {
  modalVisible = false
  updateBounds(mainWindow, flowView)
}
