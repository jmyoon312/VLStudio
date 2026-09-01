/**
 * Standalone Authentication Bridge (No external Firebase network dependencies)
 */
import { auth } from './config'

export async function signInWithGoogle() {
  console.log('[Auth] ViraLoop Auto-login active')
  return {
    user: {
      uid: 'viraloop-user',
      email: 'user@viraloop.local',
      displayName: 'ViraLoop Creator'
    }
  }
}

export async function signOut() {
  console.log('[Auth] Signed out')
}

export function getCurrentUser() {
  return auth.currentUser
}

export function onAuthChange(callback) {
  return auth.onAuthStateChanged(callback)
}

export async function getIdToken() {
  return 'viraloop-token'
}
