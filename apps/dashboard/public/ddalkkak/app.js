
// Global Safe Fallbacks for Alpine expressions
window.getSituationSubtitles = function() {
  const modal = window.__appInstance?.resultModal;
  const res = modal?.result || {};
  const subs = res.situation_subtitles || res.primary?.situation_subtitles || res.primary_analysis?.situation_subtitles || [];
  return Array.isArray(subs) ? subs : [];
};
window.getJjapSubtitles = function() {
  const modal = window.__appInstance?.resultModal;
  const res = modal?.result || {};
  const subs = res.jjap_jjap_i_subtitles || res.primary?.jjap_jjap_i_subtitles || res.primary_analysis?.jjap_jjap_i_subtitles || [];
  return Array.isArray(subs) ? subs : [];
};
window.getParsedTitles = function() {
  const modal = window.__appInstance?.resultModal;
  const res = modal?.result || {};
  const titles = res.title_candidates || res.primary?.title_candidates || res.primary_analysis?.title_candidates || [];
  return Array.isArray(titles) ? titles : [];
};
window.getParsedYoutubeTitle = function() {
  const modal = window.__appInstance?.resultModal;
  const res = modal?.result || {};
  const job = modal?.job || {};
  return res.primary_analysis?.youtube_upload_title || res.youtube_title || res.hook_title || res.meta?.yt_title || job.video_filename || job.song_title || '(제목 없음)';
};
window.getParsedDescription = function() {
  const modal = window.__appInstance?.resultModal;
  const res = modal?.result || {};
  return res.primary_analysis?.youtube_description || res.youtube_description || res.description || res.meta?.description || '(설명 내용 없음)';
};
window.getParsedHashtags = function() {
  const modal = window.__appInstance?.resultModal;
  const res = modal?.result || {};
  let tags = res.primary_analysis?.hashtags || res.tags || res.meta?.tags || ['#shorts', '#viral'];
  if (typeof tags === 'string') tags = tags.split(/\s+/);
  return Array.isArray(tags) ? tags : ['#shorts', '#viral'];
};
window.getParsedScript = function() {
  const modal = window.__appInstance?.resultModal;
  const res = modal?.result || {};
  return res.script || res.full_script || res.text || '';
};

// OneClick Shorts Studio (VLStudio Clean Core)
function app() {
  return {
    token: localStorage.getItem("ddalkkak_token") || "solo",
    user: JSON.parse(localStorage.getItem("ddalkkak_user") || '{"id":1,"username":"owner","role":"admin","full_name":"운영자","features":["subtitle","ttsdub","clip"]}'),
    healthLabel: "⚡ AI Multi-Core 가동 중 (KST)",
    tab: "subtitle", // subtitle | ttsdub | clipedit
    isDark: typeof window.__INITIAL_IS_DARK__ === 'boolean' ? window.__INITIAL_IS_DARK__ : document.documentElement.classList.contains('dark'),
    _copiedToast: false,
    _copiedTimer: null,
    _pollTimer: null,

    // ===== 🌐 글로벌 다국어 설정 =====
    targetLangs: ['ko', 'en', 'ja'],
    toggleTargetLang(code) {
      if (this.targetLangs.includes(code)) {
        if (this.targetLangs.length > 1) {
          this.targetLangs = this.targetLangs.filter(l => l !== code);
        }
      } else {
        this.targetLangs.push(code);
      }
    },

    // ===== 탭 네비게이션 =====
    navTo(targetTab) {
      this.tab = targetTab;
      if (targetTab === 'subtitle') this.loadSubtitleJobs();
      if (targetTab === 'ttsdub') this.loadTtsDubJobs();
      if (targetTab === 'clipedit') this.loadClipJobs();
    },

    // ===== 📝 TAB 1: 자막 자동 생성 상태 & 메서드 =====
    subtitleStyle: 'shorts',
    subtitleCustomPrompt: '',
    subtitleVideoFiles: [],
    subtitleDrag: false,
    subtitleUploading: false,
    subtitleJobsList: [],
    selectedSubtitleJobIds: [],

    onSubtitleVideosSelected(e) {
      if (e.target.files && e.target.files.length > 0) {
        this.subtitleVideoFiles = Array.from(e.target.files);
      }
    },

    onSubtitleVideosDropped(e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.subtitleVideoFiles = Array.from(e.dataTransfer.files);
      }
    },

    async startBatchSubtitlePipeline() {
      if (this.subtitleVideoFiles.length === 0) return;
      this.subtitleUploading = true;
      try {
        for (const file of this.subtitleVideoFiles) {
          for (const lang of this.targetLangs) {
            const fd = new FormData();
            fd.append('video', file);
            fd.append('style', this.subtitleStyle || 'shorts');
            fd.append('target_lang', lang);
            if (this.subtitleStyle === 'custom' && this.subtitleCustomPrompt) {
              fd.append('custom_prompt', this.subtitleCustomPrompt);
            }
            
            const r = await fetch('/api/ddalkkak/api/subtitle/upload', {
              method: 'POST',
              headers: this.authHeader(),
              body: fd
            });
            
            if (r.ok) {
              await this.loadSubtitleJobs();
            }
            await new Promise(res => setTimeout(res, 500));
          }
        }
        this.subtitleVideoFiles = [];
        alert("✅ 자막 생성 작업이 모두 큐에 등록되었습니다!");
      } catch (e) {
        console.error('Batch pipeline error', e);
        alert(`자막 일괄 생성 중 오류: ${e.message}`);
      } finally {
        this.subtitleUploading = false;
        await this.loadSubtitleJobs();
      }
    },

    async loadSubtitleJobs() {
      try {
        const r = await fetch('/api/ddalkkak/api/subtitle/list', { headers: this.authHeader() });
        if (r.ok) {
          const data = await r.json();
          this.subtitleJobsList = Array.isArray(data) ? data : (data.jobs || []);
        }
      } catch (e) {
        console.error("loadSubtitleJobs error:", e);
      }
    },

    toggleSubtitleJobSelect(id) {
      if (this.selectedSubtitleJobIds.includes(id)) {
        this.selectedSubtitleJobIds = this.selectedSubtitleJobIds.filter(x => x !== id);
      } else {
        this.selectedSubtitleJobIds.push(id);
      }
    },

    toggleSelectAllSubtitleJobs() {
      if (this.isAllSubtitleJobsSelected()) {
        this.selectedSubtitleJobIds = [];
      } else {
        this.selectedSubtitleJobIds = (this.subtitleJobsList || []).map(j => j.id);
      }
    },

    isAllSubtitleJobsSelected() {
      const list = this.subtitleJobsList || [];
      return list.length > 0 && this.selectedSubtitleJobIds.length === list.length;
    },

    async deleteSubtitleJob(id) {
      if (!confirm("이 자막 작업을 삭제하시겠습니까?")) return;
      try {
        await fetch('/api/ddalkkak/api/subtitle/' + id, { method: 'DELETE', headers: this.authHeader() });
        await this.loadSubtitleJobs();
      } catch (e) {
        console.error("deleteSubtitleJob error:", e);
      }
    },

    async deleteSelectedSubtitleJobs() {
      if (this.selectedSubtitleJobIds.length === 0) return;
      if (!confirm(`선택된 ${this.selectedSubtitleJobIds.length}개 자막 작업을 삭제하시겠습니까?`)) return;
      for (const id of this.selectedSubtitleJobIds) {
        await fetch('/api/ddalkkak/api/subtitle/' + id, { method: 'DELETE', headers: this.authHeader() }).catch(() => {});
      }
      this.selectedSubtitleJobIds = [];
      await this.loadSubtitleJobs();
    },

    async exportSelectedSubtitleToCapcut() {
      const selectedJobs = (this.subtitleJobsList || []).filter(j => this.selectedSubtitleJobIds.includes(j.id));
      if (selectedJobs.length === 0) return;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'DDALKKAK_EXPORT_CAPCUT_BATCH',
          jobType: 'subtitle',
          jobs: JSON.parse(JSON.stringify(selectedJobs))
        }, '*');
      } else {
        alert("이 기능은 VLStudio 대시보드 내에서만 동작합니다.");
      }
    },

    copyPixelingMetaForSelectedSubtitle() {
      const selectedJobs = (this.subtitleJobsList || []).filter(j => this.selectedSubtitleJobIds.includes(j.id));
      if (selectedJobs.length === 0) return;
      
      const today = new Date().toISOString().split('T')[0];
      let txt = `저장일: ${today}\n소스 수: ${selectedJobs.length}\n메타 세트 수: ${selectedJobs.length * 2}\n\n`;
      
      selectedJobs.forEach((job, idx) => {
        const fn = job.video_filename || `video_${job.id}.mp4`;
        const res = this.safeParseJson(job.result_json || job.result);
        const titleKo = res.primary_analysis?.youtube_upload_title || res.youtube_title || res.hook_title || job.video_filename || '쇼츠 영상';
        const descKo = res.primary_analysis?.youtube_description || res.description || `${titleKo} #shorts #바이럴`;
        const tagsKo = (res.primary_analysis?.hashtags || res.tags || ['#shorts', '#viral']).join(' ');
        const scriptKo = res.script || '(자막/대본 내용)';
        
        txt += `========================================\n`;
        txt += `${idx + 1}. ${fn}\n`;
        txt += `소스 파일명: ${fn}\n`;
        txt += `포함 메타: 원본, 영어\n`;
        txt += `========================================\n`;
        txt += `[원본] 추천 메타\n언어: 한국어\n제목\n${titleKo}\n설명\n${descKo}\n태그\n${tagsKo}\n대본\n${scriptKo}\n\n`;
      });

      this.copyToClipboard(txt);
      alert(`✅ 선택된 ${selectedJobs.length}개 영상의 픽셀링 공식 메타 텍스트가 클립보드에 복사되었습니다!`);
    },

    // ===== 🎙️ TAB 2: AI 대본 + 더빙 상태 & 메서드 =====
    ttsDubFile: null,
    ttsDubBusy: false,
    ttsDubMsg: '',
    ttsDubDrag: false,
    dubMakeTts: true,
    selectedTtsDubJobIds: [],
    ttsDubJobsList: [],

    ttsPresetLabel: '⭐ [기본] 필재 - 쇼츠 사이다/실화',
    ttsConfig: {
      engine: 'typecast',
      language: 'ko',
      voice_id: 'tc_68257f68bc6e3c161ab5078d',
      speed: 1.4,
      pitch: 1,
      use_silence_removal: true,
      silence_threshold: -40,
      min_silence_len: 300,
      keep_silence_len: 50
    },

    onTtsDubFileSelected(e) {
      if (e.target.files && e.target.files[0]) {
        this.ttsDubFile = e.target.files[0];
      }
    },

    openTTSSettingsModal() {
      if (window.parent) {
        window.parent.postMessage({
          type: 'OPEN_TTS_SETTINGS',
          config: this.ttsConfig
        }, '*');
      }
    },

    async startTtsDubPipeline() {
      if (!this.ttsDubFile || this.ttsDubBusy) return;
      this.ttsDubBusy = true;
      this.ttsDubMsg = "영상 업로드 및 AI 대본 분석 시작...";
      try {
        const fd = new FormData();
        fd.append('file', this.ttsDubFile);
        fd.append('make_tts', this.dubMakeTts ? '1' : '0');
        fd.append('voice_id', this.ttsConfig.voice_id || '');
        fd.append('tts_config', JSON.stringify(this.ttsConfig));

        const r = await fetch('/api/ddalkkak/api/tts-dub/upload', {
          method: 'POST',
          headers: this.authHeader(),
          body: fd
        });

        if (r.ok) {
          this.ttsDubFile = null;
          alert("✅ 대본+더빙 작업이 큐에 등록되었습니다!");
          await this.loadTtsDubJobs();
        } else {
          const err = await r.json();
          alert(`대본+더빙 등록 오류: ${err.detail || '실패'}`);
        }
      } catch (e) {
        alert(`대본+더빙 생성 중 오류: ${e.message}`);
      } finally {
        this.ttsDubBusy = false;
        await this.loadTtsDubJobs();
      }
    },

    async loadTtsDubJobs() {
      try {
        const r = await fetch('/api/ddalkkak/api/tts-dub/list', { headers: this.authHeader() });
        if (r.ok) {
          const data = await r.json();
          this.ttsDubJobsList = Array.isArray(data) ? data : (data.jobs || []);
        }
      } catch (e) {
        console.error("loadTtsDubJobs error:", e);
      }
    },

    toggleTtsDubJobSelect(id) {
      if (this.selectedTtsDubJobIds.includes(id)) {
        this.selectedTtsDubJobIds = this.selectedTtsDubJobIds.filter(x => x !== id);
      } else {
        this.selectedTtsDubJobIds.push(id);
      }
    },

    toggleSelectAllTtsDubJobs() {
      if (this.isAllTtsDubJobsSelected()) {
        this.selectedTtsDubJobIds = [];
      } else {
        this.selectedTtsDubJobIds = (this.ttsDubJobsList || []).map(j => j.id);
      }
    },

    isAllTtsDubJobsSelected() {
      const list = this.ttsDubJobsList || [];
      return list.length > 0 && this.selectedTtsDubJobIds.length === list.length;
    },

    async deleteTtsDubJob(id) {
      if (!confirm("이 대본+더빙 작업을 삭제하시겠습니까?")) return;
      try {
        await fetch('/api/ddalkkak/api/tts-dub/' + id, { method: 'DELETE', headers: this.authHeader() });
        await this.loadTtsDubJobs();
      } catch (e) {
        console.error("deleteTtsDubJob error:", e);
      }
    },

    async deleteSelectedTtsDubJobs() {
      if (this.selectedTtsDubJobIds.length === 0) return;
      if (!confirm(`선택된 ${this.selectedTtsDubJobIds.length}개 대본+더빙 작업을 삭제하시겠습니까?`)) return;
      for (const id of this.selectedTtsDubJobIds) {
        await fetch('/api/ddalkkak/api/tts-dub/' + id, { method: 'DELETE', headers: this.authHeader() }).catch(() => {});
      }
      this.selectedTtsDubJobIds = [];
      await this.loadTtsDubJobs();
    },

    async exportSelectedTtsDubToCapcut() {
      const selectedJobs = (this.ttsDubJobsList || []).filter(j => this.selectedTtsDubJobIds.includes(j.id));
      if (selectedJobs.length === 0) return;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'DDALKKAK_EXPORT_CAPCUT_BATCH',
          jobType: 'tts-dub',
          jobs: JSON.parse(JSON.stringify(selectedJobs))
        }, '*');
      } else {
        alert("이 기능은 VLStudio 대시보드 내에서만 동작합니다.");
      }
    },

    copyPixelingMetaForSelectedTtsDub() {
      this.copyPixelingMetaForSelectedSubtitle();
    },

    // ===== ✂️ TAB 3: 클립 일괄 편집 상태 & 메서드 =====
    clipTopic: '',
    clipUrls: '',
    clipSuggesting: false,
    clipSuggestions: [],
    clipUploading: false,
    clipJobsList: [],

    async suggestClips() {
      if (!this.clipTopic.trim() || this.clipSuggesting) return;
      this.clipSuggesting = true;
      try {
        const fd = new FormData();
        fd.append('topic', this.clipTopic.trim());
        const r = await fetch('/api/ddalkkak/api/clip-edit/suggest', {
          method: 'POST',
          headers: this.authHeader(),
          body: fd
        });
        if (r.ok) {
          const res = await r.json();
          this.clipSuggestions = res.suggestions || [];
        } else {
          alert('검색어 추천 실패');
        }
      } catch (e) {
        alert(`추천 오류: ${e.message}`);
      } finally {
        this.clipSuggesting = false;
      }
    },

    async startClipEdit() {
      if (!this.clipTopic.trim() || this.clipUploading) return;
      this.clipUploading = true;
      try {
        const fd = new FormData();
        fd.append('topic', this.clipTopic.trim());
        fd.append('urls', this.clipUrls.trim());
        const r = await fetch('/api/ddalkkak/api/clip-edit/create', {
          method: 'POST',
          headers: this.authHeader(),
          body: fd
        });
        if (r.ok) {
          alert("✅ 클립 편집 작업이 등록되었습니다!");
          this.clipTopic = '';
          this.clipUrls = '';
          this.clipSuggestions = [];
          await this.loadClipJobs();
        } else {
          const err = await r.json();
          alert(`클립 생성 오류: ${err.detail || '실패'}`);
        }
      } catch (e) {
        alert(`클립 시작 오류: ${e.message}`);
      } finally {
        this.clipUploading = false;
        await this.loadClipJobs();
      }
    },

    async loadClipJobs() {
      try {
        const r = await fetch('/api/ddalkkak/api/clip-edit/list', { headers: this.authHeader() });
        if (r.ok) {
          const data = await r.json();
          this.clipJobsList = Array.isArray(data) ? data : (data.jobs || []);
        }
      } catch (e) {
        console.error("loadClipJobs error:", e);
      }
    },

    async deleteClipJob(id) {
      if (!confirm("이 클립 작업을 삭제하시겠습니까?")) return;
      try {
        await fetch('/api/ddalkkak/api/clip-edit/' + id, { method: 'DELETE', headers: this.authHeader() });
        await this.loadClipJobs();
      } catch (e) {
        console.error("deleteClipJob error:", e);
      }
    },

    // ===== 🔍 결과 인스펙터 모달 상태 & 안전 헬퍼 =====
    resultModal: {
      open: false,
      loading: false,
      job: null,
      jobType: 'subtitle',
      result: {}
    },

    async openResultModal(job, type = 'subtitle') {
      if (!job) return;
      this.resultModal.open = true;
      this.resultModal.job = job;
      this.resultModal.jobType = type;
      this.resultModal.result = this.safeParseJson(job.result_json || job.result);
      this.resultModal.loading = false;

      // 백그라운드 최신 상세 데이터 비동기 조회
      try {
        let endpoint = '';
        if (type === 'ttsdub' || type === 'tts-dub') {
          endpoint = `/api/ddalkkak/api/tts-dub/${job.id}`;
        } else if (type === 'clip-edit' || type === 'clipedit') {
          endpoint = `/api/ddalkkak/api/clip-edit/${job.id}/result`;
        } else {
          endpoint = `/api/ddalkkak/api/subtitle/${job.id}/result`;
        }

        const r = await fetch(endpoint, { headers: this.authHeader() });
        if (r.ok) {
          const freshData = await r.json();
          this.resultModal.result = this.safeParseJson(freshData.result || freshData.result_json || freshData);
        }
      } catch (e) {
        console.warn("Background fresh job fetch error:", e);
      }
    },

    safeParseJson(val) {
      if (!val) return {};
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    },

    
    getSituationSubtitles() {
      const res = this.resultModal.result || {};
      const subs = res.situation_subtitles || res.primary?.situation_subtitles || res.primary_analysis?.situation_subtitles || [];
      return Array.isArray(subs) ? subs : [];
    },

    getJjapSubtitles() {
      const res = this.resultModal.result || {};
      const subs = res.jjap_jjap_i_subtitles || res.primary?.jjap_jjap_i_subtitles || res.primary_analysis?.jjap_jjap_i_subtitles || [];
      return Array.isArray(subs) ? subs : [];
    },

    getParsedTitles() {
      const res = this.resultModal.result || {};
      const titles = res.title_candidates || res.primary?.title_candidates || res.primary_analysis?.title_candidates || [];
      return Array.isArray(titles) ? titles : [];
    },

    getParsedYoutubeTitle() {
      const res = this.resultModal.result || {};
      const job = this.resultModal.job || {};
      return res.primary_analysis?.youtube_upload_title || 
             res.youtube_title || 
             res.hook_title || 
             res.meta?.yt_title || 
             res.meta?.top_title || 
             job.video_filename || 
             job.song_title || 
             '(제목 없음)';
    },

    getParsedDescription() {
      const res = this.resultModal.result || {};
      return res.primary_analysis?.youtube_description || 
             res.youtube_description || 
             res.description || 
             res.meta?.description || 
             '(설명 내용 없음)';
    },

    getParsedHashtags() {
      const res = this.resultModal.result || {};
      let tags = res.primary_analysis?.hashtags || res.tags || res.meta?.tags || ['#shorts', '#viral'];
      if (typeof tags === 'string') {
        tags = tags.split(/\s+/);
      }
      return Array.isArray(tags) ? tags : ['#shorts', '#viral'];
    },

    getParsedScript() {
      const res = this.resultModal.result || {};
      return res.script || res.full_script || res.text || '';
    },

    copyPixelingMetaForSingle(job) {
      if (!job) return;
      const fn = job.video_filename || job.song_title || `video_${job.id}.mp4`;
      const res = this.safeParseJson(job.result_json || job.result);
      const titleKo = res.primary_analysis?.youtube_upload_title || res.youtube_title || res.hook_title || job.video_filename || job.song_title || '쇼츠 영상';
      const descKo = res.primary_analysis?.youtube_description || res.description || `${titleKo} #shorts #바이럴`;
      const tagsKo = (res.primary_analysis?.hashtags || res.tags || ['#shorts', '#viral']).join(' ');
      const scriptKo = res.script || '(자막/대본 내용)';

      const txt = `[원본] 추천 메타\n언어: 한국어\n제목\n${titleKo}\n설명\n${descKo}\n태그\n${tagsKo}\n대본\n${scriptKo}`;
      this.copyToClipboard(txt);
      alert(`✅ [ ${fn} ] 픽셀링 공식 메타 텍스트가 복사되었습니다!`);
    },

    // ===== 🎬 CapCut 내보내기 통신 =====
    getPixelingProjectName(job, lang = 'KO') {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dateStr = `${yy}${mm}${dd}`;

      let title = '';
      if (job) {
        const res = this.safeParseJson(job.result_json || job.result);
        title = res.primary_analysis?.youtube_upload_title || 
                res.youtube_title || 
                res.hook_title || 
                job.song_title ||
                (job.video_filename ? job.video_filename.replace(/\.[^/.]+$/, "") : `Project_${job.id || '001'}`);
      } else {
        title = 'ShortsProject';
      }

      const cleanTitle = title.replace(/[^a-zA-Z0-9가-힣_]/g, "").slice(0, 30);
      return `${dateStr}_${lang.toUpperCase()}_${cleanTitle}`;
    },

    exportToCapcut(jobType, jobId, job) {
      if (!jobId) {
        alert("내보낼 작업이 선택되지 않았습니다.");
        return;
      }
      const lang = (job && job.target_lang ? job.target_lang : 'KO').toUpperCase();
      const standardProjectName = this.getPixelingProjectName(job, lang);

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'DDALKKAK_EXPORT_CAPCUT',
          jobType: jobType,
          jobId: jobId,
          projectName: standardProjectName,
          job: job ? JSON.parse(JSON.stringify(job)) : null
        }, '*');
      } else {
        alert(`CapCut 내보내기: ${standardProjectName}`);
      }
    },

    // ===== 🛠️ 유틸리티 & 헬퍼 =====
    authHeader() {
      return {
        'Authorization': 'Bearer ' + this.token
      };
    },

    copyToClipboard(text) {
      if (!text) return;
      
      // 1. 최신 navigator.clipboard 시도 (HTTPS / localhost)
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(() => {
          this._triggerCopiedToast();
        }).catch(() => {
          this._fallbackCopyText(text);
        });
        return;
      }

      // 2. HTTP / 비보안 환경 / iframe 완벽 호환 Fallback (document.execCommand)
      this._fallbackCopyText(text);
    },

    _fallbackCopyText(text) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          this._triggerCopiedToast();
        } else {
          prompt("복사할 텍스트입니다 (Ctrl+C를 누르세요):", text);
        }
      } catch (err) {
        console.warn("Fallback copy failed", err);
        prompt("복사할 텍스트입니다 (Ctrl+C를 누르세요):", text);
      }
    },

    _triggerCopiedToast() {
      this._copiedToast = true;
      if (this._copiedTimer) clearTimeout(this._copiedTimer);
      this._copiedTimer = setTimeout(() => { this._copiedToast = false; }, 1500);
    },

    formatBytes(bytes, decimals = 1) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    formatKstTime(isoStr) {
      if (!isoStr) return '-';
      try {
        const d = new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
        return d.toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } catch (e) {
        return String(isoStr);
      }
    },

    // ===== 🚀 초기화 라이프사이클 =====
    init() {
      window.__appInstance = this;
      this.loadSubtitleJobs();
      this.loadTtsDubJobs();
      this.loadClipJobs();

      // 부모 창으로부터 오는 메시지 리스너 (테마 & TTS 설정)
      window.addEventListener('message', (e) => {
        if (!e.data) return;
        if (e.data.type === 'THEME_CHANGE' && e.data.theme) {
          this.isDark = e.data.theme !== 'light';
          document.documentElement.classList.toggle('dark', this.isDark);
        }
        if (e.data.type === 'TTS_CONFIG_UPDATED' && e.data.config) {
          this.ttsConfig = { ...this.ttsConfig, ...e.data.config };
          if (e.data.presetLabel) this.ttsPresetLabel = e.data.presetLabel;
        }
      });

      // 주기적 자동 폴링 (5초마다 큐 상태 업데이트)
      if (this._pollTimer) clearInterval(this._pollTimer);
      this._pollTimer = setInterval(() => {
        if (this.tab === 'subtitle') this.loadSubtitleJobs();
        if (this.tab === 'ttsdub') this.loadTtsDubJobs();
        if (this.tab === 'clipedit') this.loadClipJobs();
      }, 5000);
    }
  };
}
