/**
 * ViraLoop Studio: 3-Tier Layer Contract Checker
 * Verifies contract integrity across Renderer, Preload, and Main/Backend APIs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 [Contract-Checker] Validating 3-Tier API & IPC Contract Integrity...');

let hasErrors = false;

// 1. Verify models.py and categories router contract
const modelsPy = path.join(rootDir, 'apps', 'api', 'app', 'models.py');
const categoriesPy = path.join(rootDir, 'apps', 'api', 'app', 'routers', 'categories.py');

if (!fs.existsSync(modelsPy) || !fs.existsSync(categoriesPy)) {
    console.error('❌ [Contract-Checker] Backend models or router files missing');
    hasErrors = true;
} else {
    const modelsContent = fs.readFileSync(modelsPy, 'utf-8');
    const categoriesContent = fs.readFileSync(categoriesPy, 'utf-8');

    const requiredFields = ['persona_target', 'content_tone', 'negative_keywords', 'benchmark_rules'];
    for (const field of requiredFields) {
        if (!modelsContent.includes(field)) {
            console.error(`❌ [Contract-Checker] Missing field in models.py: ${field}`);
            hasErrors = true;
        }
        if (!categoriesContent.includes(field)) {
            console.error(`❌ [Contract-Checker] Missing field in categories.py: ${field}`);
            hasErrors = true;
        }
    }
}

// 2. Verify Frontend API Types
const apiTs = path.join(rootDir, 'apps', 'dashboard', 'src', 'lib', 'api.ts');
if (fs.existsSync(apiTs)) {
    const apiContent = fs.readFileSync(apiTs, 'utf-8');
    if (!apiContent.includes('persona_target')) {
        console.error('❌ [Contract-Checker] Category interface in api.ts missing persona_target');
        hasErrors = true;
    }
} else {
    console.error('❌ [Contract-Checker] api.ts missing');
    hasErrors = true;
}

// 3. Verify CategoryDNAModal component exists
const dnaModal = path.join(rootDir, 'apps', 'dashboard', 'src', 'components', 'shared', 'CategoryDNAModal.tsx');
if (!fs.existsSync(dnaModal)) {
    console.error('❌ [Contract-Checker] CategoryDNAModal.tsx missing');
    hasErrors = true;
}

// 4. [Phase 2] Verify Trend Radar Backend & Frontend Contracts
const trendRouterPy = path.join(rootDir, 'apps', 'api', 'app', 'routers', 'trend_radar.py');
const trendServicePy = path.join(rootDir, 'apps', 'api', 'app', 'services', 'trend_radar.py');
const incubatorDeck = path.join(rootDir, 'apps', 'dashboard', 'src', 'components', 'trend', 'TrendIncubatorDeck.tsx');

if (!fs.existsSync(trendRouterPy) || !fs.existsSync(trendServicePy)) {
    console.error('❌ [Contract-Checker] Trend Radar backend files missing');
    hasErrors = true;
}

if (!fs.existsSync(incubatorDeck)) {
    console.error('❌ [Contract-Checker] TrendIncubatorDeck.tsx missing');
    hasErrors = true;
}

if (fs.existsSync(modelsPy)) {
    const modelsContent = fs.readFileSync(modelsPy, 'utf-8');
    if (!modelsContent.includes('class RadarCandidate')) {
        console.error('❌ [Contract-Checker] RadarCandidate model missing in models.py');
        hasErrors = true;
    }
}

if (fs.existsSync(apiTs)) {
    const apiContent = fs.readFileSync(apiTs, 'utf-8');
    if (!apiContent.includes('interface RadarCandidate')) {
        console.error('❌ [Contract-Checker] RadarCandidate interface missing in api.ts');
        hasErrors = true;
    }
}

// 5. [Phase 3] Verify Unified MCP Server & Domain Tools
const viraloopToolsJs = path.join(rootDir, 'mcp-server', 'lib', 'viraloopTools.js');
const mcpIndexJs = path.join(rootDir, 'mcp-server', 'index.js');

if (!fs.existsSync(viraloopToolsJs)) {
    console.error('❌ [Contract-Checker] viraloopTools.js missing');
    hasErrors = true;
} else {
    const toolsContent = fs.readFileSync(viraloopToolsJs, 'utf-8');
    if (!toolsContent.includes('scoutTrendingVideos') || !toolsContent.includes('approveCandidate')) {
        console.error('❌ [Contract-Checker] Missing core methods in viraloopTools.js');
        hasErrors = true;
    }
}

if (fs.existsSync(mcpIndexJs)) {
    const mcpContent = fs.readFileSync(mcpIndexJs, 'utf-8');
    if (!mcpContent.includes('scout_trending_videos') || !mcpContent.includes('approve_incubator_candidate')) {
        console.error('❌ [Contract-Checker] Unified MCP tools missing in mcp-server/index.js');
        hasErrors = true;
    }
} else {
    console.error('❌ [Contract-Checker] mcp-server/index.js missing');
    hasErrors = true;
}

if (hasErrors) {
    console.error('❌ [Contract-Checker] Integrity check FAILED.');
    process.exit(1);
} else {
    console.log('✅ [Contract-Checker] All 3-Tier Layer Contracts PASSED (100% Integrity)');
    process.exit(0);
}
