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
      { variantId: null, amount: 9.99, currency: 'USD', interval: 'month', productName: 'Pro Monthly' },
      { variantId: null, amount: 99.99, currency: 'USD', interval: 'year', productName: 'Pro Yearly' }
    ]
  }
}

export async function consumeBatchDownload() {
  return { denied: false, charged: true, unlimited: true, remaining: Infinity }
}
