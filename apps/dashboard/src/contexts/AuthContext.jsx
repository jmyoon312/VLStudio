/**
 * ViraLoop Universal Authentication & Profile Context
 * 
 * 1. ViraLoop 자체 간편 프로필 & PIN 관리 (스마트폰 & PC 완벽 호환)
 * 2. Flow AI 비디오 렌더러 (flow2capcut) 원본 인터페이스 100% 호환 브릿징
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const PROFILES_STORAGE_KEY = 'viraloop_auth_profiles_v1'
const SESSION_STORAGE_KEY = 'viraloop_active_session_v1'

const DEFAULT_PROFILES = [
  {
    id: 'master',
    name: '윤대표 (Master)',
    role: 'admin',
    pin: '1234',
    avatar: '👑',
    email: 'master@viraloop.local',
    description: '전체 시스템 및 파이프라인 총괄 관리',
    isPro: true,
    requirePin: true
  },
  {
    id: 'creator',
    name: '숏폼 기획팀',
    role: 'creator',
    pin: '1234',
    avatar: '🎬',
    email: 'creator@viraloop.local',
    description: '소재 발굴, 대본 및 AI 영상 제작',
    isPro: true,
    requirePin: true
  },
  {
    id: 'agent',
    name: '자동 배포 에이전트',
    role: 'agent',
    pin: '',
    avatar: '🤖',
    email: 'agent@viraloop.local',
    description: '다채널 스텔스 업로드 및 성과 관제',
    isPro: true,
    requirePin: false // 원클릭 무패스워드 입장
  }
]

const PRO_SUBSCRIPTION = Object.freeze({
  isActive: true,
  canExport: true,
  exportsRemaining: Infinity,
  daysRemaining: Infinity,
  isExpired: false,
  status: 'active'
})

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('[AuthContext] Failed to load saved profiles, using defaults:', e)
    }
    return DEFAULT_PROFILES
  })

  const [activeProfile, setActiveProfile] = useState(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (savedSession) {
        const session = JSON.parse(savedSession)
        if (session && session.profileId) {
          const savedProfiles = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) || 'null') || DEFAULT_PROFILES
          const matched = savedProfiles.find(p => p.id === session.profileId)
          if (matched) return matched
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Session restore error:', e)
    }
    // 기본적으로 첫 접속 시 master 프로필 자동 세션 부여 (원터치)
    return DEFAULT_PROFILES[0]
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 프로필 목록 로컬스토리지 저장
  const persistProfiles = useCallback((newProfiles) => {
    setProfiles(newProfiles)
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles))
    } catch (e) {
      console.error('[AuthContext] Failed to persist profiles:', e)
    }
  }, [])

  // Flow2CapCut 호환 가상 User 객체
  const user = activeProfile ? {
    uid: activeProfile.id,
    email: activeProfile.email,
    displayName: activeProfile.name,
    photoURL: '',
    emailVerified: true,
    isAnonymous: false,
    getIdToken: async () => `viraloop-token-${activeProfile.id}`,
    toJSON: () => ({ uid: activeProfile.id, email: activeProfile.email, displayName: activeProfile.name })
  } : null

  const isAuthenticated = !!activeProfile

  // 로그인 (프로필 + PIN 검증)
  const loginWithProfile = useCallback(async (profileId, enteredPin = '', rememberMe = true) => {
    setLoading(true)
    setError(null)

    try {
      const target = profiles.find(p => p.id === profileId)
      if (!target) {
        throw new Error('선택한 프로필을 찾을 수 없습니다.')
      }

      if (target.requirePin && target.pin) {
        if (target.pin !== enteredPin) {
          throw new Error('PIN 번호가 일치하지 않습니다.')
        }
      }

      setActiveProfile(target)

      if (rememberMe) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          profileId: target.id,
          loginAt: new Date().toISOString()
        }))
      } else {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          profileId: target.id,
          loginAt: new Date().toISOString()
        }))
      }

      return target
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [profiles])

  // 로그아웃
  const logout = useCallback(async () => {
    setActiveProfile(null)
    localStorage.removeItem(SESSION_STORAGE_KEY)
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  // PIN 번호 변경
  const changePin = useCallback((profileId, oldPin, newPin) => {
    const target = profiles.find(p => p.id === profileId)
    if (!target) throw new Error('프로필을 찾을 수 없습니다.')

    if (target.requirePin && target.pin && target.pin !== oldPin) {
      throw new Error('기존 PIN 번호가 올바르지 않습니다.')
    }

    if (newPin && newPin.length < 4) {
      throw new Error('PIN 번호는 최소 4자리 이상이어야 합니다.')
    }

    const updated = profiles.map(p => {
      if (p.id === profileId) {
        return {
          ...p,
          pin: newPin,
          requirePin: !!newPin
        }
      }
      return p
    })

    persistProfiles(updated)
    if (activeProfile?.id === profileId) {
      setActiveProfile(prev => ({ ...prev, pin: newPin, requirePin: !!newPin }))
    }
    return true
  }, [profiles, activeProfile, persistProfiles])

  // 새 프로필 추가
  const addProfile = useCallback((profileData) => {
    const newId = `profile_${Date.now()}`
    const newProfile = {
      id: newId,
      name: profileData.name || '새 작업자',
      role: profileData.role || 'creator',
      pin: profileData.pin || '',
      avatar: profileData.avatar || '👤',
      email: `${newId}@viraloop.local`,
      description: profileData.description || 'ViraLoop 사용자',
      isPro: true,
      requirePin: !!profileData.pin
    }

    const updated = [...profiles, newProfile]
    persistProfiles(updated)
    return newProfile
  }, [profiles, persistProfiles])

  // 프로필 삭제
  const deleteProfile = useCallback((profileId) => {
    if (profiles.length <= 1) {
      throw new Error('최소 1개의 관리자 프로필은 유지되어야 합니다.')
    }

    const updated = profiles.filter(p => p.id !== profileId)
    persistProfiles(updated)

    if (activeProfile?.id === profileId) {
      setActiveProfile(updated[0])
    }
  }, [profiles, activeProfile, persistProfiles])

  // Flow2CapCut 호환 구독 새로고침
  const refreshSubscription = useCallback(async () => {
    return PRO_SUBSCRIPTION
  }, [])

  // Flow2CapCut 호환 기본 로그인 (첫 번째 프로필 또는 master로 즉시 연결)
  const login = useCallback(async () => {
    if (profiles.length > 0) {
      return loginWithProfile(profiles[0].id, profiles[0].pin || '')
    }
  }, [profiles, loginWithProfile])

  const clearError = useCallback(() => setError(null), [])

  const value = {
    // ViraLoop 프로필 체계
    profiles,
    activeProfile,
    loginWithProfile,
    changePin,
    addProfile,
    deleteProfile,

    // Flow2CapCut & 상위 앱 호환 인터페이스
    user,
    isAuthenticated,
    subscription: PRO_SUBSCRIPTION,
    loading,
    error,
    login,
    logout,
    refreshSubscription,
    clearError,
    userData: { id: activeProfile?.id || 'viraloop', name: activeProfile?.name }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
