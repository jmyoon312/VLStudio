import fs from 'fs';
import path from 'path';

/**
 * Promise-based file locking to prevent concurrent writes from different agents/views
 * @param {string} filePath - Path of the file to lock
 * @param {object} options - Lock options
 * @param {number} options.timeoutMs - Maximum time to wait for the lock (default: 10000ms)
 * @param {number} options.staleMs - Time after which a lock is considered stale and broken (default: 15000ms)
 * @returns {Promise<() => void>} Release function
 */
export async function acquireFileLock(filePath, options = {}) {
  const timeoutMs = options.timeoutMs || 10000;
  const staleMs = options.staleMs || 15000;
  const lockPath = filePath + '.lock';
  const startTime = Date.now();

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  while (true) {
    try {
      // Attempt to create the lock file exclusively
      fs.writeFileSync(lockPath, JSON.stringify({
        pid: process.pid,
        createdAt: Date.now()
      }), { flag: 'wx', encoding: 'utf-8' });

      // Lock acquired successfully!
      const release = () => {
        try {
          if (fs.existsSync(lockPath)) {
            fs.unlinkSync(lockPath);
          }
        } catch (err) {
          console.error(`[FileLock] Failed to release lock on ${filePath}:`, err.message);
        }
      };

      return release;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Lock file already exists, check if it is stale
        try {
          const stat = fs.statSync(lockPath);
          const elapsed = Date.now() - stat.mtimeMs;
          if (elapsed > staleMs) {
            console.warn(`[FileLock] Stale lock detected on ${filePath} (elapsed: ${elapsed}ms). Breaking lock.`);
            try {
              fs.unlinkSync(lockPath);
            } catch (_) {}
            continue; // Retry acquisition immediately
          }
        } catch (statErr) {
          // If lock file was deleted between write and stat
        }

        // Wait and retry if within timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Timeout acquiring lock on file: ${filePath}`);
        }
        await delay(50);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Atomic JSON write using a temporary file to avoid partial write corruptions.
 * @param {string} filePath - Destination file path
 * @param {any} data - Data to stringify and write
 */
export function atomicWriteJsonSync(filePath, data) {
  const tempPath = filePath + '.tmp';
  const backupPath = filePath + '.bak';

  try {
    // 1. Write to temporary file
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');

    // 2. Perform safe replacement
    if (fs.existsSync(filePath)) {
      try {
        // Create backup first
        fs.copyFileSync(filePath, backupPath);
      } catch (backupErr) {
        console.warn(`[AtomicWrite] Failed to create backup for ${filePath}:`, backupErr.message);
      }
    }

    // Rename temporary file to target file (atomic on POSIX, highly stable on Windows)
    try {
      if (fs.existsSync(filePath) && process.platform === 'win32') {
        // On Windows, unlink destination if exists to prevent EPERM/EEXIST errors
        fs.unlinkSync(filePath);
      }
      fs.renameSync(tempPath, filePath);
    } catch (renameErr) {
      // Fallback: If rename fails, copy content and delete temp
      const content = fs.readFileSync(tempPath, 'utf-8');
      fs.writeFileSync(filePath, content, 'utf-8');
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
    }

    // 3. Clean up backup
    if (fs.existsSync(backupPath)) {
      try {
        fs.unlinkSync(backupPath);
      } catch (_) {}
    }
  } catch (err) {
    // Clean up temp file on failure
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
    }
    throw new Error(`Failed to atomically write JSON to ${filePath}: ${err.message}`);
  }
}
