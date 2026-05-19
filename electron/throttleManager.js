/**
 * Global Rate Limit Throttling Manager for Google Flow Prompt Submissions.
 * 
 * Enforces a mandatory 5-second interval plus a random jitter (0~3s)
 * between any Flow prompt submissions across all active profiles.
 */

let lastSubmissionTime = 0;

/**
 * Enforces global rate limit throttling.
 * Delays execution if the time elapsed since the last submission is less than
 * 5 seconds plus a randomized jitter (0~3 seconds).
 * 
 * @returns {Promise<void>}
 */
export async function acquireGlobalThrottle() {
  const minIntervalMs = 5000; // Mandatory 5s interval
  const maxJitterMs = 3000;   // 0~3s random jitter
  
  const jitter = Math.floor(Math.random() * maxJitterMs);
  const requiredDelay = minIntervalMs + jitter;
  
  const now = Date.now();
  const timeSinceLast = now - lastSubmissionTime;
  
  if (timeSinceLast < requiredDelay) {
    const waitTime = requiredDelay - timeSinceLast;
    console.log(`[ThrottleManager] Global throttle active. Delaying next submission by ${waitTime}ms (jitter: ${jitter}ms)...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastSubmissionTime = Date.now();
  console.log(`[ThrottleManager] Global throttle lock acquired. Submission allowed at timestamp: ${lastSubmissionTime}`);
}
