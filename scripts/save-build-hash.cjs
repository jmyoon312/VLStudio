#!/usr/bin/env node
// scripts/save-build-hash.cjs
// npm run pack 실행 시 현재 git HEAD hash 를 dist-electron/.build-hash 에 저장
// ViraLoop Studio.bat 이 이 파일을 읽어 코드 변경 여부를 감지함

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'dist-electron')
const hashFile = path.join(outDir, '.build-hash')

// dist-electron 디렉터리가 없으면 생성
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

let hash = 'unknown'
try {
  hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
} catch (e) {
  console.warn('[save-build-hash] git not found or not a git repo. Saving "unknown".')
}

fs.writeFileSync(hashFile, hash, 'utf8')
console.log(`[save-build-hash] Saved build hash: ${hash.slice(0, 7)} → dist-electron/.build-hash`)
