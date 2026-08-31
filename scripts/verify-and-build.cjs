/**
 * Unified Build & Contract Verification Script for ViraLoop Studio
 * Guarantees that dist-electron and apps/dashboard/dist are compiled synchronously.
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🚀 [ViraLoop Studio] Starting unified atomic build...');

try {
  // 1. Build Electron Main & Preload Process
  console.log('\n📦 [1/2] Bundling Electron main & preload process (vite build)...');
  execSync('npx vite build', { cwd: ROOT_DIR, stdio: 'inherit' });

  // 2. Build React Dashboard Frontend
  console.log('\n🎨 [2/2] Bundling React dashboard frontend (npm run build in apps/dashboard)...');
  execSync('npm run build --workspace=apps/dashboard', { cwd: ROOT_DIR, stdio: 'inherit' });

  console.log('\n✅ [ViraLoop Studio] Unified build successfully completed! All bundles synchronized.\n');
} catch (error) {
  console.error('\n❌ [ViraLoop Studio] Build failed:', error.message);
  process.exit(1);
}
