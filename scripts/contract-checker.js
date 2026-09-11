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

// 6. [AI Engine Sovereign Rule] Verify NO arbitrary AI model hardcoding across active codebase
function scanFilesRecursively(dir, extensions, ignoreDirs = []) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!ignoreDirs.some(ignored => fullPath.includes(ignored))) {
                results = results.concat(scanFilesRecursively(fullPath, extensions, ignoreDirs));
            }
        } else {
            if (extensions.some(ext => file.endsWith(ext))) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

const activeBackendFiles = scanFilesRecursively(
    path.join(rootDir, 'apps', 'api', 'app'),
    ['.py'],
    ['legacy_ddalkkak', '__pycache__']
);

const activeFrontendFiles = scanFilesRecursively(
    path.join(rootDir, 'apps', 'dashboard', 'src'),
    ['.ts', '.tsx'],
    ['node_modules', 'dist']
);

const allActiveFiles = [...activeBackendFiles, ...activeFrontendFiles];

const forbiddenHardcodedPatterns = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gpt-4o',
    'clean_model = "auto"',
    "clean_model = 'auto'",
];

for (const filePath of allActiveFiles) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    lines.forEach((line, index) => {
        // Skip comment lines
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            return;
        }

        for (const pattern of forbiddenHardcodedPatterns) {
            if (line.includes(pattern)) {
                console.error(`❌ [Contract-Checker] Forbidden AI model hardcoding detected:`);
                console.error(`   File: ${path.relative(rootDir, filePath)}:${index + 1}`);
                console.error(`   Snippet: ${trimmed}`);
                console.error(`   👉 All models MUST be resolved dynamically from DB Settings (script_analysis_model / default_llm_model).`);
                hasErrors = true;
            }
        }
    });
}

// 7. [Universal UI/UX Sovereignty Law] Verify Light/Dark Theme & Semantic Token Compliance
console.log('🎨 [Contract-Checker] Validating UI/UX Theme & Responsive Design Tokens...');

const coreStudioPages = [
    path.join(rootDir, 'apps', 'dashboard', 'src', 'pages', 'ChannelDnaStudio.tsx'),
    path.join(rootDir, 'apps', 'dashboard', 'src', 'components', 'trend', 'ChannelAnatomyModal.tsx'),
    path.join(rootDir, 'apps', 'dashboard', 'src', 'components', 'trend', 'TrendRadarDetailModal.tsx'),
];

const forbiddenThemeHardcoding = [
    { pattern: 'bg-slate-900', explanation: 'Use semantic token `bg-card` or `bg-background` instead of hardcoded `bg-slate-900`' },
    { pattern: 'bg-slate-950', explanation: 'Use semantic token `bg-muted/40` or `bg-background` instead of hardcoded `bg-slate-950`' },
    { pattern: 'border-slate-800', explanation: 'Use semantic token `border-border` or `border-border/80` instead of `border-slate-800`' },
];

for (const pagePath of coreStudioPages) {
    if (!fs.existsSync(pagePath)) continue;
    const content = fs.readFileSync(pagePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        // Ignore smartphone video canvas simulation layer which intentionally uses black/dark background
        if (trimmed.includes('Smartphone Mockup') || trimmed.includes('Dynamic 9:16 Canvas') || trimmed.includes('[메인 비디오 레이어]')) return;

        for (const rule of forbiddenThemeHardcoding) {
            // Check if class contains the pattern without dark: prefix
            const classRegex = new RegExp(`(?<!dark:)${rule.pattern}\\b`);
            if (classRegex.test(line)) {
                // Ensure it's inside a className attribute
                if (line.includes('className=')) {
                    console.error(`❌ [Contract-Checker] UI Theme Violation detected:`);
                    console.error(`   File: ${path.relative(rootDir, pagePath)}:${index + 1}`);
                    console.error(`   Snippet: ${trimmed}`);
                    console.error(`   👉 Rule: ${rule.explanation}`);
                    hasErrors = true;
                }
            }
        }
    });
}

if (hasErrors) {
    console.error('❌ [Contract-Checker] Integrity check FAILED.');
    process.exit(1);
} else {
    console.log('✅ [Contract-Checker] All 3-Tier Layer Contracts, Zero-Hardcoding & UI/UX Theme Rules PASSED (100% Integrity)');
    process.exit(0);
}
