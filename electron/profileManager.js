/**
 * Electron Main Module - Flow Profile Manager
 * 
 * Manages multi-profile storage, hardware fingerprint association, and persistent configuration.
 */

import path from 'node:path'
import { promises as fs } from 'node:fs'
import { app } from 'electron'

const CONFIG_FILE_NAME = 'flow-profiles-config.json'

// 안티봇 차단 우회용 고정 하드웨어 지문 리스트
const HARDWARE_TEMPLATES = [
  {
    cores: 4,
    memory: 8,
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    cores: 8,
    memory: 16,
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    cores: 12,
    memory: 32,
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    cores: 16,
    memory: 64,
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    cores: 6,
    memory: 16,
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    cores: 8,
    memory: 32,
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
  }
]

/**
 * Get config file path in userData directory
 */
function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE_NAME)
}

/**
 * Generate random hardware fingerprint, preferring unused templates for diversity
 */
function getRandomHardware(existingProfiles = []) {
  if (existingProfiles && existingProfiles.length > 0) {
    const usedRenderers = new Set(
      existingProfiles.map(p => p.hardware?.renderer).filter(Boolean)
    );
    const unusedTemplates = HARDWARE_TEMPLATES.filter(t => !usedRenderers.has(t.renderer));
    if (unusedTemplates.length > 0) {
      console.log(`[Profile Manager] Picked from ${unusedTemplates.length} unused hardware templates.`);
      return unusedTemplates[Math.floor(Math.random() * unusedTemplates.length)];
    }
  }
  return HARDWARE_TEMPLATES[Math.floor(Math.random() * HARDWARE_TEMPLATES.length)];
}

/**
 * Load all profiles from disk, creates default if missing
 */
export async function loadProfiles() {
  const configPath = getConfigPath()
  try {
    const data = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    // 파일이 없거나 에러 발생 시 초기 기본 프로필 생성
    const defaultProfile = {
      id: 'default',
      name: '기본 프로필',
      email: '',
      hardware: getRandomHardware()
    }
    const initialConfig = {
      activeProfileId: 'default',
      profiles: [defaultProfile]
    }
    await saveProfiles(initialConfig)
    return initialConfig
  }
}

/**
 * Save configuration to disk
 */
export async function saveProfiles(config) {
  const configPath = getConfigPath()
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
    return { success: true }
  } catch (err) {
    console.error('[Profile Manager] Save failed:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Switch the active profile
 */
export async function switchProfile(profileId) {
  const config = await loadProfiles()
  const exists = config.profiles.some(p => p.id === profileId)
  if (!exists) {
    return { success: false, error: 'Profile not found' }
  }
  config.activeProfileId = profileId
  await saveProfiles(config)
  return { success: true, activeProfileId: profileId }
}

/**
 * Create a new isolated profile
 */
export async function createProfile(name, email = '') {
  const config = await loadProfiles()
  const id = `profile_${Date.now()}`
  
  const newProfile = {
    id,
    name: name || `새 프로필 ${config.profiles.length + 1}`,
    email,
    hardware: getRandomHardware(config.profiles) // 중복 회피를 위해 기존 프로필 정보 전달
  }

  config.profiles.push(newProfile)
  config.activeProfileId = id
  await saveProfiles(config)
  
  return { success: true, profile: newProfile, config }
}

/**
 * Delete a profile and clear its partition if requested
 */
export async function deleteProfile(profileId) {
  const config = await loadProfiles()
  if (profileId === 'default') {
    return { success: false, error: 'Cannot delete the default profile' }
  }
  
  config.profiles = config.profiles.filter(p => p.id !== profileId)
  
  // 삭제한 프로필이 활성 프로필이었던 경우 'default'로 복원
  if (config.activeProfileId === profileId) {
    config.activeProfileId = 'default'
  }
  
  await saveProfiles(config)
  return { success: true, config }
}

/**
 * Update profile details (name, email)
 */
export async function updateProfile(profileId, name, email) {
  const config = await loadProfiles()
  const idx = config.profiles.findIndex(p => p.id === profileId)
  if (idx === -1) {
    return { success: false, error: 'Profile not found' }
  }
  
  if (name) config.profiles[idx].name = name
  if (email !== undefined) config.profiles[idx].email = email
  
  await saveProfiles(config)
  return { success: true, profile: config.profiles[idx], config }
}
