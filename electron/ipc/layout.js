/**
 * Layout IPC — 레이아웃 모드 변경, Flow 뷰 bounds 관리, 모달 가시성
 */

import { powerSaveBlocker, shell } from 'electron'

let layoutMode = 'split-left'
let splitRatio = 0.5
let modalVisible = false
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

  if (modalVisible) {
    for (const view of views) {
      try { view.setBounds({ x: 0, y: 0, width: 0, height: 0 }) } catch (e) {
        console.warn('[Layout] Failed to hide view bounds:', e.message)
      }
    }
    return
  }

  const { width, height } = mainWindow.getContentBounds()
  const GAP = 3

  // Flow WebContentsView는 항상 x=0부터 시작.
  // splitRatio는 전체 window 너비 기준. 사이드바(pl-72)는 React 앱 패널 내부 문제이며
  // 여기서 절대로 고려하지 않는다.
  let containerRect = { x: 0, y: 0, width: 0, height: 0 }

  if (layoutMode === 'split-left') {
    const splitPos = Math.round(width * splitRatio)
    containerRect = { x: 0, y: 0, width: Math.max(0, splitPos - GAP), height }
  } else if (layoutMode === 'split-right') {
    const splitPos = Math.round(width * splitRatio)
    containerRect = { x: Math.min(width, width - splitPos + GAP), y: 0, width: Math.max(0, splitPos - GAP), height }
  } else if (layoutMode === 'split-top') {
    const splitPos = Math.round(height * splitRatio)
    containerRect = { x: 0, y: 0, width, height: Math.max(0, splitPos - GAP) }
  } else if (layoutMode === 'split-bottom') {
    const splitPos = Math.round(height * splitRatio)
    containerRect = { x: 0, y: Math.min(height, height - splitPos + GAP), width, height: Math.max(0, splitPos - GAP) }
  }

  global.lastContainerRect = containerRect

  const count = views.length
  const { x, y, width: cWidth, height: cHeight } = containerRect

  if (count === 1) {
    try { views[0].setBounds({ x, y, width: cWidth, height: cHeight }) } catch (e) {
      console.warn('[Layout] Failed to set bounds for view 0:', e.message)
    }
  } else if (count === 2) {
    const halfWidth = Math.floor(cWidth / 2)
    try {
      views[0].setBounds({ x, y, width: halfWidth, height: cHeight })
      views[1].setBounds({ x: x + halfWidth, y, width: Math.max(0, cWidth - halfWidth), height: cHeight })
    } catch (e) { console.warn('[Layout] Failed to set bounds for views (count=2):', e.message) }
  } else {
    const halfWidth = Math.floor(cWidth / 2)
    const halfHeight = Math.floor(cHeight / 2)
    try {
      views[0].setBounds({ x, y, width: halfWidth, height: halfHeight })
      if (count > 1) views[1].setBounds({ x: x + halfWidth, y, width: Math.max(0, cWidth - halfWidth), height: halfHeight })
      if (count > 2) views[2].setBounds({ x, y: y + halfHeight, width: halfWidth, height: Math.max(0, cHeight - halfHeight) })
      if (count > 3) {
        views[3].setBounds({ x: x + halfWidth, y: y + halfHeight, width: Math.max(0, cWidth - halfWidth), height: Math.max(0, cHeight - halfHeight) })
        for (let i = 4; i < count; i++) views[i].setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    } catch (e) { console.warn('[Layout] Failed to set bounds for views (count>=3):', e.message) }
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
    // 모달이 열릴 때 키보드 포커스를 메인 renderer로 되돌린다.
    // Flow WebContentsView를 0×0으로 줄여도 네이티브 포커스는 그대로 남아
    // (Electron은 뷰 간 포커스 자동 전환을 안 함), 모달 입력창에 키 입력이
    // 안 가는 현상이 생긴다 — 특히 Windows에서.
    if (visible) {
      getMainWindow()?.webContents?.focus()
    }
    return { success: true }
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
