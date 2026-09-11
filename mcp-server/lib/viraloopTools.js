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
    },

    /**
     * 12. 📊 Analyze Channel Performance & ROI
     */
    async analyzeChannelPerformance({ channel_id = 'all', time_range = 'monthly' } = {}) {
        return await requestApi(`/analytics/channels?channel_id=${encodeURIComponent(channel_id)}&time_range=${encodeURIComponent(time_range)}`);
    },

    /**
     * 13. 🎯 Diagnose Video Hooking & Retention
     */
    async diagnoseVideoHook({ video_id, title, retention_rate_3s = 45.0, retention_rate_5s = 30.0, views = 1000 }) {
        return await requestApi('/analytics/diagnose-hook', {
            method: 'POST',
            body: { video_id, title, retention_rate_3s, retention_rate_5s, views }
        });
    },

    /**
     * 14. 💬 List Community Comments
     */
    async listCommunityComments({ channel_id, sentiment, is_replied, limit = 50 } = {}) {
        const query = new URLSearchParams();
        if (channel_id) query.append('channel_id', channel_id);
        if (sentiment) query.append('sentiment', sentiment);
        if (is_replied !== undefined) query.append('is_replied', String(is_replied));
        if (limit) query.append('limit', String(limit));
        const qs = query.toString() ? `?${query.toString()}` : '';
        return await requestApi(`/community/comments${qs}`);
    },

    /**
     * 15. 🤖 Generate AI Reply for Comment
     */
    async generateCommentReply({ comment_id, persona = 'friendly' }) {
        return await requestApi('/community/generate-reply', {
            method: 'POST',
            body: { comment_id, persona }
        });
    },

    /**
     * 16. 🚀 Post Reply to YouTube Comment
     */
    async postCommentReply({ comment_id, custom_reply }) {
        return await requestApi('/community/post-reply', {
            method: 'POST',
            body: { comment_id, custom_reply }
        });
    },

    /**
     * 17. 📱 Send Telegram Notification
     */
    async sendTelegramNotification({ message, parse_mode = 'HTML' }) {
        return await requestApi('/settings/telegram/test', {
            method: 'POST',
            body: { message, parse_mode }
        });
    }
};
