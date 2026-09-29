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
    },

    /**
     * 18. 🎬 Autonomous Clone & Produce Short-Form Video (One-Take End-to-End Production)
     */
    async autonomousProduceVideo({ reference_url = 'https://www.youtube.com/@noejeongu', source_url, source_keyword, voice_engine = 'supertone-local', channel_id = 1, auto_enqueue = true } = {}) {
        return await requestApi('/discovery/autonomous-clone-and-produce', {
            method: 'POST',
            body: {
                reference_url,
                source_url,
                source_keyword,
                voice_engine,
                channel_id,
                auto_enqueue
            }
        });
    },

    /**
     * 19. 🔬 Analyze YouTube Channel DNA (Forensic Layout, WPM, Tone, Audio, Visual Style)
     */
    async analyzeChannelDna({ channel_url, sample_count = 12 } = {}) {
        return await requestApi('/channel-dna/analyze', {
            method: 'POST',
            body: {
                channel_url,
                sample_count
            }
        });
    },

    /**
     * 20. 📥 Universal Video Downloader (Single URL: YouTube, Shorts, TikTok, Reels, Douyin)
     */
    async downloadVideo({ url, category_id = null, download_mp4 = true, download_mp3 = true, download_srt = true, use_bypass = false } = {}) {
        return await requestApi('/videos/download', {
            method: 'POST',
            body: {
                url,
                category_id,
                download_mp4,
                download_mp3,
                download_srt,
                use_bypass,
                headless: true
            }
        });
    },

    /**
     * 21. 📦 Batch Video Downloader (Multiple URLs)
     */
    async batchDownloadVideos({ urls, category_id = null, download_mp4 = true, download_mp3 = true, download_srt = true } = {}) {
        return await requestApi('/videos/batch-download', {
            method: 'POST',
            body: {
                urls,
                category_id,
                download_mp4,
                download_mp3,
                download_srt
            }
        });
    },

    /**
     * 22. 🌾 Harvest Channel Video Playlist (Fetch Top & Recent Videos from Channel)
     */
    async harvestChannelVideos({ channel_url, limit = 12 } = {}) {
        return await requestApi('/channel-dna/harvest-videos', {
            method: 'POST',
            body: {
                channel_url,
                limit
            }
        });
    },

    /**
     * 23. 🎬 Produce Complete MP4 Short Video (One-Take End-to-End Assembly)
     * Combines scenes, Gemini 3.8 Flash TTS, HeyGen Voiceover Carve BGM ducking,
     * jab overlay, and 6-preset subtitles into a finalized MP4.
     */
    async produceCompleteVideo({
        project_id,
        title,
        script,
        scenes,
        voice_config,
        subtitles,
        jab_overlay,
        branding,
        audio_config,
        style_preset = 'shorts',
        auto_render = true
    } = {}) {
        return await requestApi('/video-director/create', {
            method: 'POST',
            body: {
                project_id,
                title,
                script,
                scenes,
                voice_config,
                subtitles,
                jab_overlay,
                branding,
                audio_config,
                style_preset,
                auto_render
            }
        });
    },

    /**
     * 24. ⚡ Modify Video Subtitles (Surgical Instant Re-render in ~3s)
     * Replaces subtitles while 100% reusing audio, BGM, and scene video/image clips.
     */
    async modifyVideoSubtitles({ project_id, subtitles, style_preset } = {}) {
        return await requestApi('/video-director/modify-subtitles', {
            method: 'POST',
            body: { project_id, subtitles, style_preset }
        });
    },

    /**
     * 25. 🎙️ Modify Video Voice (Surgical Voice Actor / Pitch / Speed Replacement)
     * Re-synthesizes ONLY the TTS voice, re-mixes audio, and re-renders while reusing all video/image assets.
     */
    async modifyVideoVoice({ project_id, voice_config, new_script } = {}) {
        return await requestApi('/video-director/modify-voice', {
            method: 'POST',
            body: { project_id, voice_config, new_script }
        });
    },

    /**
     * 26. 🥊 Modify Video Jab Hook (Surgical Hook Badge Update in ~3s)
     */
    async modifyVideoJab({ project_id, jab_overlay } = {}) {
        return await requestApi('/video-director/modify-jab', {
            method: 'POST',
            body: { project_id, jab_overlay }
        });
    },

    /**
     * 27. 🖼️ Modify Video Scene Media (Surgical Asset Replacement)
     */
    async modifyVideoMedia({ project_id, scene_id, new_media_path, media_type = 'image' } = {}) {
        return await requestApi('/video-director/modify-media', {
            method: 'POST',
            body: { project_id, scene_id, new_media_path, media_type }
        });
    },

    /**
     * 28. 📋 Get Video Project Storyboard (Inspect Current EDL and Rendered Deliverables)
     */
    async getVideoStoryboard({ project_id } = {}) {
        return await requestApi(`/video-director/project/${encodeURIComponent(project_id)}`);
    },

    /**
     * 29. 🎯 Auto-Sync Audio Peaks (Pixeling Peak Sync: snap jab & zoom beats to voice climax)
     */
    async autoSyncVideoPeaks({ project_id, auto_render = true } = {}) {
        return await requestApi('/video-director/auto-sync-peaks', {
            method: 'POST',
            body: { project_id, auto_render }
        });
    },

    /**
     * 30. 🎨 Regenerate Weak Scenes (Pixeling Weak Anchor: targeted surgical re-generation)
     */
    async regenerateVideoScenes({ project_id, scene_indices, prompt_overrides, auto_render = true } = {}) {
        return await requestApi('/video-director/regenerate-scenes', {
            method: 'POST',
            body: { project_id, scene_indices, prompt_overrides, auto_render }
        });
    },

    /**
     * 31. 🎭 Apply Video Format Preset (12 Pixeling-inspired sovereign presets)
     */
    async applyVideoFormatPreset({ project_id, preset_name, auto_render = true } = {}) {
        return await requestApi('/video-director/apply-format-preset', {
            method: 'POST',
            body: { project_id, preset_name, auto_render }
        });
    },

    /**
     * 32. ✂️ Magnetic Ripple Delete Scene (Closes timeline gap with 0 dead air)
     */
    async rippleDeleteVideoScene({ project_id, scene_index, auto_render = true } = {}) {
        return await requestApi('/video-director/ripple-delete-scene', {
            method: 'POST',
            body: { project_id, scene_index, auto_render }
        });
    },

    /**
     * 33. 📐 Plan Video Cutdown (Sentence-boundary aligned smart short cutdown)
     */
    async planVideoCutdown({ subtitles, target_duration_sec = 55.0, style = 'hook' } = {}) {
        return await requestApi('/video-director/plan-cutdown', {
            method: 'POST',
            body: { subtitles, target_duration_sec, style }
        });
    },

    /**
     * 34. 📚 Get Format Presets Catalog
     */
    async getVideoFormatPresets() {
        return await requestApi('/video-director/format-presets');
    },

    /**
     * 35. 🧬 Apply Analyzed Preset (Auto-detect archetype from preset JSON and apply full typography/DSP/pacing)
     */
    async applyAnalyzedVideoPreset({ project_id, preset_data, auto_render = true } = {}) {
        return await requestApi('/video-director/apply-analyzed-preset', {
            method: 'POST',
            body: { project_id, preset_data, auto_render }
        });
    },

    /**
     * 36. 🔍 Detect Video Preset Archetype (Classify video type from preset structure)
     */
    async detectVideoPresetArchetype({ preset_data } = {}) {
        return await requestApi('/video-director/detect-preset-archetype', {
            method: 'POST',
            body: { preset_data }
        });
    },

    /**
     * 37. ✂️ Zero-Download Slice Stream Clip (Extract 30-60s clip on-the-fly without full download)
     */
    async sliceStreamClip({ source_url, start_seconds, duration_seconds, output_filename } = {}) {
        return await requestApi('/video-director/slice-stream', {
            method: 'POST',
            body: { source_url, start_seconds, duration_seconds, output_filename }
        });
    },

    /**
     * 38. 🚀 Create Project From URL Slice (One-Click: Stream Slice -> Storyboard -> Preset -> Voice -> Render)
     */
    async createProjectFromUrlSlice({ project_id, source_url, start_seconds, duration_seconds, script, title, format_preset = 'classic_shorts', auto_render = true } = {}) {
        return await requestApi('/video-director/create-from-url-slice', {
            method: 'POST',
            body: { project_id, source_url, start_seconds, duration_seconds, script, title, format_preset, auto_render }
        });
    },

    /**
     * 39. 🎨 Generate AI Scene Image (Direct Gemini 3.1 Flash Image Nano Banana Pro / FLUX.1 Free)
     */
    async generateAiSceneImage({ prompt, aspect_ratio = '9:16', style_preset = 'cinematic_photorealism', project_id, scene_index } = {}) {
        return await requestApi('/video-director/generate-scene-image', {
            method: 'POST',
            body: { prompt, aspect_ratio, style_preset, project_id, scene_index }
        });
    },

    /**
     * 40. 🎛️ Auto Sound Design (36-SFX Keyword Matrix on Jabs & Dynamic BGM Selection)
     */
    async autoSoundDesignProject({ project_id, auto_render = true } = {}) {
        return await requestApi('/video-director/auto-sound-design', {
            method: 'POST',
            body: { project_id, auto_render }
        });
    },

    /**
     * 41. 💬 Start Custom Preset Dialogue (Analyze reference ➔ Base Clone Save ➔ Elicit 3 Strategic Questions)
     */
    async startCustomPresetDialogue({ reference_url, preset_name } = {}) {
        return await requestApi('/video-director/start-custom-preset-dialogue', {
            method: 'POST',
            body: { reference_url, preset_name }
        });
    },

    /**
     * 42. 🏆 Refine Custom Preset (Apply creator choices & feedback ➔ Save Custom Preset Asset)
     */
    async refineCustomPreset({ base_preset_id, narrative_intent, context_hook_strategy, sensory_custom, custom_name, additional_feedback } = {}) {
        return await requestApi('/video-director/refine-custom-preset', {
            method: 'POST',
            body: { base_preset_id, narrative_intent, context_hook_strategy, sensory_custom, custom_name, additional_feedback }
        });
    },

    /**
     * 43. ⏱️ Segment Narration FPS-Free (V6.0 Dynamic Multi-Cut Nano Splitting & MM:SS.ms Absolute Timecodes)
     */
    async segmentNarrationFpsFree({ script_text, total_duration_sec = 30.0 } = {}) {
        return await requestApi('/video-director/segment-narration-fps-free', {
            method: 'POST',
            body: { script_text, total_duration_sec }
        });
    }
};





