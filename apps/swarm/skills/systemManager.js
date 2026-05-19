import fetch from 'node-fetch';

const BRIDGE_URL = 'http://127.0.0.1:8000/api/bridge';

export const systemManager = {
    /**
     * Fetch shared LLM config from backend
     */
    async getAIConfig() {
        try {
            const res = await fetch(`${BRIDGE_URL}/ai-config`);
            if (!res.ok) throw new Error(`Config fetch failed: ${res.statusText}`);
            return await res.json();
        } catch (error) {
            console.error("❌ Bridge Error (AI Config):", error);
            // Fallback to local env if bridge fails
            return null;
        }
    },

    /**
     * Request video download via Backend Bridge
     * @param {string} url - YouTube/Video URL
     */
    async downloadVideo(url) {
        console.log(`🤖 Requesting Download: ${url}`);
        const res = await fetch(`${BRIDGE_URL}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Download failed");
        }
        return await res.json();
    },

    /**
     * Request transcription via Backend Bridge
     * @param {string} filePath - Local file path (usually from download result)
     */
    async transcribeMedia(filePath) {
        console.log(`🤖 Requesting Transcription: ${filePath}`);
        const res = await fetch(`${BRIDGE_URL}/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: filePath })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Transcription failed");
        }
        return await res.json();
    }
};
