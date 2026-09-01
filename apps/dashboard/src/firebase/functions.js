/**
 * Standalone Functions Client (No external Firebase network dependencies)
 */
import { APP_ID } from './config'

export const FUNCTION_SUFFIX = '_prod'

export async function initializeUser() {
  return { success: true }
}

export async function getAppStatus() {
  return {
    status: 'active',
    isPro: true,
    exportCount: 9999,
    exportsRemaining: Infinity,
    daysRemaining: Infinity
  }
}

export async function createCheckoutSession({ interval } = {}) {
  return { url: 'https://viraloop.gogloo.gleeze.com' }
}

export async function createPortalSession() {
  return 'https://viraloop.gogloo.gleeze.com'
}

export async function getPricing() {
  return {
    prices: [
      { variantId: null, amount: 0, currency: 'USD', interval: 'month', productName: 'ViraLoop Pro' }
    ]
  }
}

export async function consumeBatchDownload() {
  return { success: true }
}
