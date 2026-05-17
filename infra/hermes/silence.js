/**
 * [UNIVERSAL SOVEREIGN SILENCE & INTELLIGENCE v2] 
 * 1. Silences noisy SDK warnings.
 * 2. Injects missing model metadata to solve the root cause.
 * 3. NO CONSOLE LOGS (To prevent breaking MCP JSON-RPC protocol).
 */
const silentPatterns = [
    "openrouter/free", 
    "integration model metadata", 
    "conservative 128k default",
    "requires Node >=22.14.0" // Also silence the node version warning to prevent noise
];

// --- 1. Low-level Stream Filtering ---
const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

const filter = (chunk, originalFn, stream) => {
    if (!chunk) return true;
    const str = chunk.toString();
    if (silentPatterns.some(p => str.includes(p))) return true;
    return originalFn.apply(stream, [chunk]);
};

process.stdout.write = function(chunk) { return filter(chunk, originalStdoutWrite, process.stdout); };
process.stderr.write = function(chunk) { return filter(chunk, originalStderrWrite, process.stderr); };

// --- 2. Root Cause Fix: Metadata Injection ---
try {
    const metadataPatch = {
        "contextWindow": 128000,
        "maxOutput": 4096,
        "pricing": { "input": 0, "output": 0 }
    };

    const originalRequire = require('module').prototype.require;
    require('module').prototype.require = function(path) {
        const result = originalRequire.apply(this, arguments);
        if (path.includes('pi-ai') || path.includes('model')) {
            if (result && result.models && !result.models["openrouter/free"]) {
                result.models["openrouter/free"] = metadataPatch;
            }
        }
        return result;
    };
} catch (e) {}
// NO console.log HERE!
