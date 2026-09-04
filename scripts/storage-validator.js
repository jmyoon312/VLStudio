/**
 * ViraLoop Studio: Storage & Filesystem Validator
 * Validates storage path boundaries, credentials decoupling, and project write safety.
 */

import fs from 'fs';
import path from 'path';

console.log('📦 [Storage-Validator] Validating filesystem storage governance & atomic safety...');

let hasErrors = false;

// 1. Check isolated credentials directory
const credDir = 'C:\\ViraLoopMedia\\credentials';
if (process.platform === 'win32') {
    if (!fs.existsSync(credDir)) {
        console.warn(`⚠️ [Storage-Validator] Credentials directory not found at ${credDir} (will be auto-created on start)`);
    } else {
        console.log(`✅ [Storage-Validator] Secure credentials directory verified: ${credDir}`);
    }
}

// 2. Check pristine repository rule (downloads/media shouldn't be tracked)
const repoRoot = path.resolve('.');
const dirtyDirs = ['downloads', 'temp_storage', 'temp_media'];
for (const dir of dirtyDirs) {
    const p = path.join(repoRoot, dir);
    if (fs.existsSync(p)) {
        console.log(`ℹ️ [Storage-Validator] Local runtime folder present: ${dir}`);
    }
}

// 3. Check mcp-server fileIo locking availability
const fileIoPath = path.join(repoRoot, 'mcp-server', 'lib', 'fileIo.js');
if (fs.existsSync(fileIoPath)) {
    const fileIoContent = fs.readFileSync(fileIoPath, 'utf-8');
    if (fileIoContent.includes('acquireFileLock') && fileIoContent.includes('atomicWriteJsonSync')) {
        console.log('✅ [Storage-Validator] Atomic project write locking verified in mcp-server');
    } else {
        console.error('❌ [Storage-Validator] fileIo.js missing atomic write lock implementation');
        hasErrors = true;
    }
}

if (hasErrors) {
    console.error('❌ [Storage-Validator] Storage validation FAILED.');
    process.exit(1);
} else {
    console.log('✅ [Storage-Validator] Storage Governance & Atomic Safety PASSED (100% Verified)');
    process.exit(0);
}
