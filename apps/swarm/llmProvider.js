import axios from 'axios';
import { OpenAI } from 'openai';

const BRIDGE_API_URL = process.env.BRIDGE_API_URL || 'http://api:8000/api/bridge';
const BRIDGE_V2_CONFIG_URL = `${BRIDGE_API_URL}/config/v2`;

/**
 * Fetches the complete LLM configuration from the bridge.
 */
export async function getFullLLMConfig() {
    try {
        console.log(`[Connecting] Bridge URL: ${BRIDGE_V2_CONFIG_URL}/ai-config`);
        const { data } = await axios.get(`${BRIDGE_V2_CONFIG_URL}/ai-config`, { timeout: 5000 });
        return data;
    } catch (error) {
        console.warn("⚠️ Bridge Config Failed, falling back to basic .env:", error.message);
        return {
            providers: {
                groq: { apiKeys: [process.env.GROQ_API_KEY], model: "llama-3.3-70b-versatile" },
                gemini: { apiKeys: [process.env.GOOGLE_API_KEY], model: "gemini-1.5-flash" }
            }
        };
    }
}

/**
 * Maps providers to their prioritized models and keys.
 */
export async function getProviderRegistry() {
    const config = await getFullLLMConfig();
    const providers = config.providers || {};
    const preferred = config.hermes_preferred || { provider: 'google', model: 'gemini-2.0-flash' };
    const registry = [];

    // Map 'google' to 'gemini' for consistency with the registry key
    const preferredProviderKey = preferred.provider === 'google' ? 'gemini' : preferred.provider;

    // Priority Order
    let order = ['groq', 'gemini', 'sambanova', 'cerebras', 'openai', 'openrouter'];
    
    // If preferred provider is set, move it to the front
    if (preferredProviderKey && order.includes(preferredProviderKey)) {
        order = [preferredProviderKey, ...order.filter(p => p !== preferredProviderKey)];
        console.log(`[Priority] Moving preferred provider to front: ${preferredProviderKey}`);
    }

    for (const name of order) {
        const p = providers[name];
        if (p) {
            // [FIX] Support both 'apiKey' (singular from bridge v2) and 'apiKeys' (plural)
            const sourceKeys = p.apiKeys || (p.apiKey ? [p.apiKey] : []);
            
            const validKeys = (Array.isArray(sourceKeys) ? sourceKeys : [sourceKeys])
                .filter(k => k && typeof k === 'string' && k.trim().length > 0);
            
            // [FIX] Fallback to environment variable for known providers
            if (validKeys.length === 0) {
                const envKey = {
                    groq: process.env.GROQ_API_KEY,
                    gemini: process.env.GOOGLE_API_KEY,
                    openai: process.env.OPENAI_API_KEY,
                    openrouter: process.env.OPENROUTER_API_KEY,
                    sambanova: process.env.SAMBANOVA_API_KEY,
                    cerebras: process.env.CEREBRAS_API_KEY,
                }[name];
                if (envKey && envKey.trim()) validKeys.push(envKey);
            }

            if (validKeys.length === 0) {
                console.log(`[Provider] Skipping ${name}: no valid API keys.`);
                continue; // Skip providers with no valid keys
            }

            // Flatten models: [Preferred Model (if matches), Primary Model, ...Fallback Models]
            const models = [];
            if (name === preferredProviderKey && preferred.model) {
                models.push(preferred.model);
            }
            if (p.model && !models.includes(p.model)) {
                models.push(p.model);
            }
            
            if (p.fallbackModels && Array.isArray(p.fallbackModels)) {
                p.fallbackModels.forEach(m => {
                    if (m && !models.includes(m)) models.push(m);
                });
            }

            registry.push({
                name: name,
                models: models, // Array of models to try for this provider
                keys: validKeys,
                baseURL: name === 'gemini' ? "https://generativelanguage.googleapis.com/v1beta/openai/" :
                    name === 'groq' ? "https://api.groq.com/openai/v1" :
                        name === 'sambanova' ? "https://api.sambanova.ai/v1" :
                            name === 'cerebras' ? "https://api.cerebras.ai/v1" :
                                name === 'openrouter' ? "https://openrouter.ai/api/v1" : undefined
            });
        }
    }
    return registry;
}

/**
 * Helper to create an OpenAI client.
 */
export async function getOpenAIClient(apiKey, baseURL) {
    return new OpenAI({ apiKey, baseURL });
}
