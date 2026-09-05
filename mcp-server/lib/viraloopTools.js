/**
 * ViraLoop Studio: Unified MCP Domain Tools Adapter
 * Communicates with ViraLoop Backend API (default: http://127.0.0.1:8000/api)
 * to provide Autonomous Scouting, Video Vault, and Category DNA Tools.
 */

const API_BASE_URL = process.env.VIRALOOP_API_URL || 'http://127.0.0.1:8000/api';

async function requestApi(path, options = {}) {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
        let errDetail = res.statusText;
        try {
            const errJson = await res.json();
            errDetail = errJson.detail || JSON.stringify(errJson);
        } catch {}
        throw new Error(`[ViraLoop API Error ${res.status}] ${errDetail}`);
    }

    return await res.json();
}

export const viraloopTools = {
    /**
     * 1. 📡 Scout Trending Videos using Category DNA
     */
    async scoutTrendingVideos({ category_id, video_type = 'shorts', limit = 10 } = {}) {
        return await requestApi('/trend-radar/scan', {
            method: 'POST',
            body: { category_id, video_type, limit }
        });
    },

    /**
     * 2. 🗄️ List Candidates in Incubator Deck
     */
    async listIncubatorCandidates({ status = 'pending', video_type, category_id } = {}) {
        const query = new URLSearchParams();
        if (status) query.append('status', status);
        if (video_type) query.append('video_type', video_type);
        if (category_id) query.append('category_id', String(category_id));

        const qs = query.toString() ? `?${query.toString()}` : '';
        return await requestApi(`/trend-radar/candidates${qs}`);
    },

    /**
     * 3. 🎯 1-Click Approve Candidate (Registers Channel + Adds to Vault)
     */
    async approveCandidate(candidateId) {
        return await requestApi(`/trend-radar/candidates/${candidateId}/approve`, {
            method: 'POST'
        });
    },

    /**
     * 4. 🚫 Reject Candidate (Feeds back into Fleet Learning)
     */
    async rejectCandidate(candidateId, feedbackReason = '') {
        return await requestApi(`/trend-radar/candidates/${candidateId}/reject`, {
            method: 'POST',
            body: { feedback_reason: feedbackReason }
        });
    },

    /**
     * 5. 🧬 Get Category DNA Standards & Persona
     */
    async getCategories() {
        return await requestApi('/categories/');
    },

    /**
     * 6. 🎬 List Videos in 5-Stage Vault
     */
    async listVaultVideos({ limit = 50, status } = {}) {
        const query = new URLSearchParams();
        if (limit) query.append('limit', String(limit));
        if (status) query.append('status', status);

        const qs = query.toString() ? `?${query.toString()}` : '';
        return await requestApi(`/videos/${qs}`);
    },

    /**
     * 7. 🧩 List Production Pipelines (6 Standard + Custom)
     */
    async listPipelines() {
        return await requestApi('/pipelines/');
    },

    /**
     * 8. 🚀 Run Production Pipeline
     */
    async runPipeline(pipelineId, payload = {}) {
        return await requestApi(`/pipelines/${pipelineId}/run`, {
            method: 'POST',
            body: payload
        });
    },

    /**
     * 9. 🧠 Get Studio Memory (soul, memory, skills)
     */
    async getStudioMemory() {
        return await requestApi('/agent/memory');
    },

    /**
     * 10. ✍️ Generate Script via ScriptWriter
     */
    async generateScript({ topic, genre, target_duration_sec = 60, model } = {}) {
        return await requestApi('/script/generate', {
            method: 'POST',
            body: { topic, genre, target_duration_sec, model }
        });
    },

    /**
     * 11. 📋 WorkQueue Status & Enqueue
     */
    async getWorkQueueStatus() {
        return await requestApi('/work-queue/status');
    },

    async enqueueWorkQueueJob(jobData) {
        return await requestApi('/work-queue/jobs', {
            method: 'POST',
            body: jobData
        });
    }
};
