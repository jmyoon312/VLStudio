const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

console.log('🚀 [Hot-Patch Builder] Starting OTA Bundle Build...');

const ROOT_DIR = path.resolve(__dirname, '..');
const DASHBOARD_DIR = path.join(ROOT_DIR, 'apps', 'dashboard');
const DIST_DIR = path.join(DASHBOARD_DIR, 'dist');
const OUTPUT_DIR = path.join(ROOT_DIR, 'release_assets');

// 1. Step: Build Dashboard
console.log('📦 Step 1: Building apps/dashboard production bundle...');
execSync('npm run build', { cwd: DASHBOARD_DIR, stdio: 'inherit' });

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Error: apps/dashboard/dist does not exist!');
  process.exit(1);
}

// 2. Step: Create Output Directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 3. Step: Zip apps/dashboard/dist -> release_assets/update-bundle.zip
const zipPath = path.join(OUTPUT_DIR, 'update-bundle.zip');
console.log(`🗜️  Step 2: Compressing ${DIST_DIR} -> ${zipPath}...`);

const zip = new AdmZip();
zip.addLocalFolder(DIST_DIR);
zip.writeZip(zipPath);

// 4. Step: Compute SHA-256, SHA-512 and Metadata
const fileBuffer = fs.readFileSync(zipPath);
const hashSum = crypto.createHash('sha256');
hashSum.update(fileBuffer);
const sha256 = hashSum.digest('hex');

const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('base64');
const sizeBytes = fileBuffer.length;
const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const version = pkg.version || '0.9.36';
const buildNumber = pkg.buildNumber || 0;
const isoDate = new Date().toISOString();

const versionInfo = {
  version: version,
  buildNumber: buildNumber,
  channel: 'latest',
  releaseDate: isoDate,
  sha256: sha256,
  sha512: sha512,
  sizeBytes: sizeBytes,
  sizeMB: `${sizeMB} MB`,
  bundleName: 'update-bundle.zip',
  downloadUrl: `https://github.com/jmyoon312/VLStudio/releases/latest/download/update-bundle.zip`
};

const versionJsonPath = path.join(OUTPUT_DIR, 'version.json');
fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2), 'utf8');

console.log('\n===================================================');
console.log('✨ [Hot-Patch Builder] Success!');
console.log(`📌 Version:      ${version} (Build #${buildNumber})`);
console.log(`📦 Bundle Size:  ${sizeMB} MB (${sizeBytes} bytes)`);
console.log(`🔑 SHA-256:      ${sha256}`);
console.log(`📄 Version Info: ${versionJsonPath}`);
console.log(`📦 Bundle File:  ${zipPath}`);
console.log('===================================================\n');

