/**
 * Standalone Local Database Operations (No external Firebase network dependencies)
 */
import { APP_ID } from './config'
import { computeQuotaState, MONTHLY_QUOTA, BONUS_GRANT } from '../utils/quotaCalc'

export async function getUserDoc(userId) {
  if (!userId) return null
  return { id: userId, email: 'user@viraloop.local', displayName: 'ViraLoop Creator' }
}

export async function getAppSubscription(userId) {
  return {
    status: 'active',
    isPro: true,
    exportCount: 0,
    exportsRemaining: Infinity,
    quota: Infinity
  }
}

export async function getAppDoc(userId) {
  return getAppSubscription(userId)
}

export async function getUserAndSubscription(userId) {
  return {
    user: await getUserDoc(userId),
    subscription: await getAppSubscription(userId),
    status: 'active',
    isPro: true,
    exportCount: 0,
    exportsRemaining: Infinity,
    daysRemaining: Infinity,
    quotaState: { isUnlimited: true, remaining: Infinity }
  }
}

export async function onSubscriptionSnapshot(userId, callback) {
  if (callback) {
    callback({
      status: 'active',
      isPro: true,
      exportCount: 0,
      exportsRemaining: Infinity
    })
  }
  return () => {}
}
