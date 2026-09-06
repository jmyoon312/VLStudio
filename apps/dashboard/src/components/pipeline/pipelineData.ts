import { Node, Edge } from 'reactflow';

export interface LegoNodeTemplate {
    type: string;
    category: 'ingest' | 'script' | 'critic' | 'audio' | 'visual' | 'cutter' | 'assemble' | 'deploy';
    categoryLabel: string;
    categoryColor: string; // Tailwind border/text/bg colors
    title: string;
    desc: string;
    iconName: string;
    defaultParams: Record<string, any>;
    inputs: string[];
    outputs: string[];
}

export const LEGO_CATEGORIES = [
    { id: 'ingest', label: '1. 소스 수집/인제스트', color: 'emerald' },
    { id: 'script', label: '2. 대본 기획 & LLM', color: 'blue' },
    { id: 'critic', label: '3. 비평 & 퀄리티 게이트', color: 'amber' },
    { id: 'audio', label: '4. 보이스 & 사운드', color: 'purple' },
    { id: 'visual', label: '5. 비주얼 & Flow AI', color: 'rose' },
    { id: 'cutter', label: '6. 영상 절삭 & FFmpeg', color: 'cyan' },
    { id: 'assemble', label: '7. 캡컷 NLE 조립', color: 'indigo' },
    { id: 'deploy', label: '8. 큐 적재 & 자동 배포', color: 'teal' }
];

export const LEGO_NODE_TEMPLATES: LegoNodeTemplate[] = [
    // 1. Ingest
    {
        type: 'url_download',
        category: 'ingest',
        categoryLabel: '소스 수집',
        categoryColor: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
        title: 'URL 영상 소스 수집',
        desc: 'YouTube / TikTok / Instagram 원본 영상 다운로드 및 캐시',
        iconName: 'Globe',
        defaultParams: { url: '', quality: 'best', keepAudioOnly: false },
        inputs: [],
        outputs: ['video_file', 'audio_file', 'meta']
    },
    {
        type: 'local_file_picker',
        category: 'ingest',
        categoryLabel: '소스 수집',
        categoryColor: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
        title: '로컬 원본 파일 지정',
        desc: 'PC 로컬 저장소의 비디오 또는 오디오 소스 경로 지정',
        iconName: 'FolderOpen',
        defaultParams: { filePath: '', maxDuration: 600 },
        inputs: [],
        outputs: ['video_file', 'meta']
    },
    {
        type: 'trend_rss_feed',
        category: 'ingest',
        categoryLabel: '소스 수집',
        categoryColor: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
        title: '트렌드 레이더 피드',
        desc: '바이럴 스카우터가 포착한 급상승 떡상 키워드 및 DNA 자동 수신',
        iconName: 'Radio',
        defaultParams: { category: 'all', minOutlierScore: 80 },
        inputs: [],
        outputs: ['topic_seed', 'dna_tags']
    },

    // 2. Script
    {
        type: 'topic_to_story',
        category: 'script',
        categoryLabel: '대본 기획',
        categoryColor: 'border-blue-500 bg-blue-500/10 text-blue-500',
        title: '9-Wave 바이럴 대본 기획',
        desc: '기승전결 9단계 감정 파도 공식 기반 쇼츠/릴스 전문 대본 생성',
        iconName: 'PenTool',
        defaultParams: { model: 'viraloop1', structure: '9_wave', duration: '60s', tone: 'dramatic' },
        inputs: ['topic_seed', 'dna_tags'],
        outputs: ['script_text', 'scenes_json']
    },
    {
        type: 'hook_overlay',
        category: 'script',
        categoryLabel: '대본 기획',
        categoryColor: 'border-blue-500 bg-blue-500/10 text-blue-500',
        title: '3초 킬러 후킹 생성기',
        desc: '시청자 이탈을 막는 첫 3초 극대화 충격 카피 & 음향 효과 지정',
        iconName: 'Zap',
        defaultParams: { hookStyle: 'shock_question', count: 3 },
        inputs: ['script_text'],
        outputs: ['hook_text', 'hook_sfx']
    },
    {
        type: 'whisper_stt',
        category: 'script',
        categoryLabel: '대본 기획',
        categoryColor: 'border-blue-500 bg-blue-500/10 text-blue-500',
        title: 'Whisper AI 음성 전사',
        desc: '영상 음성을 타임코드 포함 텍스트로 정밀 전사 및 마이크로 자막화',
        iconName: 'Mic',
        defaultParams: { modelSize: 'base', language: 'ko' },
        inputs: ['audio_file'],
        outputs: ['transcript_srt', 'script_text']
    },
    {
        type: 'llm_review_script',
        category: 'script',
        categoryLabel: '대본 기획',
        categoryColor: 'border-blue-500 bg-blue-500/10 text-blue-500',
        title: '결말포함 리뷰 대본 각색',
        desc: '영화/드라마 하이라이트 씬에 어울리는 흡입력 있는 스토리텔링 해설문 생성',
        iconName: 'Film',
        defaultParams: { spoilerIncluded: true, pacing: 'fast' },
        inputs: ['scenes_json'],
        outputs: ['script_text']
    },
    {
        type: 'script_translate',
        category: 'script',
        categoryLabel: '대본 기획',
        categoryColor: 'border-blue-500 bg-blue-500/10 text-blue-500',
        title: '다국어 번역 & 글로벌 로컬라이즈',
        desc: '한국어 대본을 영미권/일본/동남아 타겟 맞춤형 구어체 쇼츠 대본으로 다국어 변환',
        iconName: 'Globe',
        defaultParams: { targetLanguages: ['en', 'ja'], slangOptimized: true },
        inputs: ['script_text'],
        outputs: ['multi_lang_scripts']
    },

    // 3. Critic & Quality
    {
        type: 'viral_critic_gate',
        category: 'critic',
        categoryLabel: '품질 검수',
        categoryColor: 'border-amber-500 bg-amber-500/10 text-amber-500',
        title: '85점 바이럴 퀄리티 게이트',
        desc: '완청률, 후킹 강도, 정보 밀도를 채점하여 85점 미달 시 자동 재생성',
        iconName: 'ShieldAlert',
        defaultParams: { minScore: 85, maxRetries: 3 },
        inputs: ['script_text'],
        outputs: ['approved_script', 'critic_report']
    },
    {
        type: 'safety_screener',
        category: 'critic',
        categoryLabel: '품질 검수',
        categoryColor: 'border-amber-500 bg-amber-500/10 text-amber-500',
        title: '유튜브 노란딱지/금지어 필터',
        desc: '플랫폼 정책 위반 단어, 유해 표현, 저작권 위험 요소를 자동 정화',
        iconName: 'CheckCircle2',
        defaultParams: { strictMode: true },
        inputs: ['script_text'],
        outputs: ['sanitized_script']
    },
    {
        type: 'retention_predictor',
        category: 'critic',
        categoryLabel: '품질 검수',
        categoryColor: 'border-amber-500 bg-amber-500/10 text-amber-500',
        title: '시청 지속률(Retention) 예측 시뮬레이터',
        desc: '첫 3초 후탈락률 및 30초 도달률을 알고리즘 기반으로 시뮬레이션 채점',
        iconName: 'Zap',
        defaultParams: { targetPlatform: 'youtube_shorts', benchmarkPct: 75 },
        inputs: ['approved_script'],
        outputs: ['retention_score', 'retention_graph']
    },

    // 4. Audio & Voice
    {
        type: 'multitts_voice',
        category: 'audio',
        categoryLabel: '보이스/사운드',
        categoryColor: 'border-purple-500 bg-purple-500/10 text-purple-500',
        title: 'MultiTTS 고음질 뉴럴 보이스',
        desc: 'Edge-TTS 및 전문 성우 모델을 통한 자연스러운 나레이션 오디오 합성',
        iconName: 'Volume2',
        defaultParams: { voice: 'ko-KR-SunHiNeural', rate: '+18%', pitch: '+4Hz' },
        inputs: ['approved_script'],
        outputs: ['voice_audio', 'subtitle_timecodes']
    },
    {
        type: 'bgm_beat_sync',
        category: 'audio',
        categoryLabel: '보이스/사운드',
        categoryColor: 'border-purple-500 bg-purple-500/10 text-purple-500',
        title: 'BGM 비트 매핑 & 믹싱',
        desc: '트렌드 BGM 파형을 분석하여 비트 타임코드 매핑 및 볼륨 자동 덕킹(-18dB)',
        iconName: 'Music',
        defaultParams: { duckingDb: -18, genre: 'cinematic_lofi' },
        inputs: ['voice_audio'],
        outputs: ['mixed_audio', 'beat_markers']
    },
    {
        type: 'sfx_sound_injector',
        category: 'audio',
        categoryLabel: '보이스/사운드',
        categoryColor: 'border-purple-500 bg-purple-500/10 text-purple-500',
        title: '임팩트 SFX & 효과음 인젝터',
        desc: '후킹, 반전, 강조 포인트에 Whoosh, Boom, Glitch 효과음을 자동 핀포인트 삽입',
        iconName: 'Volume2',
        defaultParams: { sfxIntensity: 'high', autoDuckBgm: true },
        inputs: ['beat_markers'],
        outputs: ['sfx_audio_track']
    },

    // 5. Visual & Flow AI
    {
        type: 'flow_ai_batch',
        category: 'visual',
        categoryLabel: '비주얼/Flow',
        categoryColor: 'border-rose-500 bg-rose-500/10 text-rose-500',
        title: 'Google Flow AI 비디오 렌더',
        desc: '씬별 프롬프트를 Google Flow로 전송하여 고해상도 AI 영상/이미지 생성',
        iconName: 'Sparkles',
        defaultParams: { aspectRatio: '9:16', motionStrength: 'medium', countPerScene: 1 },
        inputs: ['scenes_json'],
        outputs: ['flow_video_clips']
    },
    {
        type: 'ai_image_enhancer',
        category: 'visual',
        categoryLabel: '비주얼/Flow',
        categoryColor: 'border-rose-500 bg-rose-500/10 text-rose-500',
        title: 'AI 4K 업스케일링 & 컬러그레이딩',
        desc: '저화질 컷팅 영상과 AI 생성 클립의 해상도 및 색감을 상용 영화 톤으로 보정',
        iconName: 'Sliders',
        defaultParams: { scale: '2x', lut: 'warm_cinematic' },
        inputs: ['flow_video_clips'],
        outputs: ['enhanced_clips']
    },
    {
        type: 'face_consistency_lock',
        category: 'visual',
        categoryLabel: '비주얼/Flow',
        categoryColor: 'border-rose-500 bg-rose-500/10 text-rose-500',
        title: '인물 일관성 페이스 락 (Face-Lock)',
        desc: '모든 씬에서 주인공 캐릭터의 얼굴 화풍, 복장, 체형 시드를 100% 동일하게 고정',
        iconName: 'Sparkles',
        defaultParams: { characterReferenceId: 'main_character', ipAdapterWeight: 0.85 },
        inputs: ['scenes_json'],
        outputs: ['locked_character_prompts']
    },

    // 6. Cutter & FFmpeg
    {
        type: 'silence_remover',
        category: 'cutter',
        categoryLabel: '절삭/FFmpeg',
        categoryColor: 'border-cyan-500 bg-cyan-500/10 text-cyan-500',
        title: '무음 구간 초정밀 자동 절삭',
        desc: '음성 사이 숨소리 및 무음(-35dB 이하)을 0.05초 단위로 제거하여 텐션 극대화',
        iconName: 'Scissors',
        defaultParams: { thresholdDb: -35, minSilenceDurationMs: 250 },
        inputs: ['video_file'],
        outputs: ['cut_video_file']
    },
    {
        type: 'blur_canvas_916',
        category: 'cutter',
        categoryLabel: '절삭/FFmpeg',
        categoryColor: 'border-cyan-500 bg-cyan-500/10 text-cyan-500',
        title: '9:16 상하단 블러 레이아웃',
        desc: '16:9 가로 영상을 세로 쇼츠로 변환할 때 상하단을 감성 블러 처리',
        iconName: 'Maximize',
        defaultParams: { blurSigma: 20, centerScale: 1.0 },
        inputs: ['video_file'],
        outputs: ['formatted_video']
    },
    {
        type: 'scene_cutter',
        category: 'cutter',
        categoryLabel: '절삭/FFmpeg',
        categoryColor: 'border-cyan-500 bg-cyan-500/10 text-cyan-500',
        title: '스마트 씬 분할 (SceneCutter)',
        desc: '롱폼 비디오에서 쇼츠화 가능한 30~60초 명장면을 장면 전환 감지로 추출',
        iconName: 'Layers',
        defaultParams: { sensitivity: 0.4, minSceneSec: 15, maxSceneSec: 60 },
        inputs: ['video_file'],
        outputs: ['highlight_clips']
    },
    {
        type: 'highlight_cropper',
        category: 'cutter',
        categoryLabel: '절삭/FFmpeg',
        categoryColor: 'border-cyan-500 bg-cyan-500/10 text-cyan-500',
        title: '다이내믹 모션 줌 & 액션 트래킹',
        desc: '말하는 화자나 결정적 액션 프레임으로 카메라를 0.3초 단위로 동적 줌인/팬',
        iconName: 'Maximize',
        defaultParams: { zoomScale: 1.25, panSmoothness: 'high' },
        inputs: ['highlight_clips'],
        outputs: ['motion_zoomed_clips']
    },

    // 7. CapCut Assembly
    {
        type: 'capcut_assemble',
        category: 'assemble',
        categoryLabel: '캡컷 조립',
        categoryColor: 'border-indigo-500 bg-indigo-500/10 text-indigo-500',
        title: 'CapCut 프로젝트 No-ZIP 조립',
        desc: '비디오, TTS 보이스, BGM, 자막을 캡컷 로컬 프로젝트(draft_content.json)로 직결 조립',
        iconName: 'Package',
        defaultParams: { targetFps: 30, resolution: '1080x1920' },
        inputs: ['formatted_video', 'voice_audio', 'subtitle_timecodes'],
        outputs: ['capcut_project_path']
    },
    {
        type: 'timeline_xml_export',
        category: 'assemble',
        categoryLabel: '캡컷 조립',
        categoryColor: 'border-indigo-500 bg-indigo-500/10 text-indigo-500',
        title: '타임라인 XML / EDL 내보내기',
        desc: '프리미어 프로(Premiere Pro) 및 다빈치 리졸브(DaVinci Resolve) 교차 호환 프로젝트 생성',
        iconName: 'Layers',
        defaultParams: { format: 'fcpxml', timebase: 30 },
        inputs: ['capcut_project_path'],
        outputs: ['xml_timeline_file']
    },

    // 8. Deploy & WorkQueue
    {
        type: 'work_queue_enqueue',
        category: 'deploy',
        categoryLabel: '배포/큐',
        categoryColor: 'border-teal-500 bg-teal-500/10 text-teal-500',
        title: 'WorkQueue 일괄 배포 탑재',
        desc: '완성된 캡컷 프로젝트를 백그라운드 렌더 큐 및 다중 SNS 채널 스케줄러에 등록',
        iconName: 'Send',
        defaultParams: { priority: 'high', autoSchedule: true },
        inputs: ['capcut_project_path'],
        outputs: ['queue_task_id']
    },
    {
        type: 'youtube_shorts_upload',
        category: 'deploy',
        categoryLabel: '배포/큐',
        categoryColor: 'border-teal-500 bg-teal-500/10 text-teal-500',
        title: '유튜브 쇼츠 즉시 예약 발행',
        desc: '유튜브 채널 공식 API를 통해 최적 골든타임(오후 6시) 자동 예약 업로드',
        iconName: 'Send',
        defaultParams: { privacy: 'public', autoHashtags: true, scheduledHour: 18 },
        inputs: ['capcut_project_path'],
        outputs: ['youtube_video_id']
    }
];

export interface PipelinePreset {
    id: string;
    name: string;
    category: string;
    description: string;
    nodes: Node[];
    edges: Edge[];
}

export const STANDARD_PIPELINES: PipelinePreset[] = [
    {
        id: 'full_generative_ai',
        name: '5. AI 완전 창작 생성형 (추천)',
        category: 'pure_creation',
        description: '주제 입력만으로 9-Wave 대본 기획 ➔ 85점 비평 검수 ➔ MultiTTS ➔ Google Flow 비주얼 렌더 ➔ 캡컷 조립까지 무인 완결',
        nodes: [
            {
                id: 'node-1',
                type: 'custom',
                position: { x: 50, y: 160 },
                data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'trend_rss_feed')!, customLabel: '트렌드 DNA 수집' }
            },
            {
                id: 'node-2',
                type: 'custom',
                position: { x: 380, y: 160 },
                data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'topic_to_story')!, customLabel: '9-Wave 대본 기획' }
            },
            {
                id: 'node-3',
                type: 'custom',
                position: { x: 710, y: 80 },
                data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'viral_critic_gate')!, customLabel: '85점 퀄리티 게이트' }
            },
            {
                id: 'node-4',
                type: 'custom',
                position: { x: 710, y: 260 },
                data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'multitts_voice')!, customLabel: 'MultiTTS 선희 뉴럴 보이스' }
            },
            {
                id: 'node-5',
                type: 'custom',
                position: { x: 1040, y: 160 },
                data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'flow_ai_batch')!, customLabel: 'Google Flow AI 비디오 렌더' }
            },
            {
                id: 'node-6',
                type: 'custom',
                position: { x: 1370, y: 160 },
                data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'capcut_assemble')!, customLabel: 'CapCut 프로젝트 No-ZIP 조립' }
            },
            {
                id: 'node-7',
                type: 'custom',
                position: { x: 1700, y: 160 },
                data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'work_queue_enqueue')!, customLabel: 'WorkQueue 자동 배포 탑재' }
            }
        ],
        edges: [
            { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
            { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true },
            { id: 'e2-4', source: 'node-2', target: 'node-4', animated: true },
            { id: 'e3-5', source: 'node-3', target: 'node-5', animated: true },
            { id: 'e4-6', source: 'node-4', target: 'node-6', animated: true },
            { id: 'e5-6', source: 'node-5', target: 'node-6', animated: true },
            { id: 'e6-7', source: 'node-6', target: 'node-7', animated: true }
        ]
    },
    {
        id: 'one_take_hook',
        name: '1. 원테이크 퀵후킹형',
        category: 'shorts_fast',
        description: '해외 바이럴 영상을 상하단 블러 및 3초 후킹 자막으로 최소 가공하여 고속 대량 양산',
        nodes: [
            { id: 'n1', type: 'custom', position: { x: 50, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'url_download')!, customLabel: '해외 바이럴 영상 수집' } },
            { id: 'n2', type: 'custom', position: { x: 380, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'blur_canvas_916')!, customLabel: '9:16 상하단 블러 캔버스' } },
            { id: 'n3', type: 'custom', position: { x: 710, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'hook_overlay')!, customLabel: '3초 킬러 후킹 자막' } },
            { id: 'n4', type: 'custom', position: { x: 1040, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'capcut_assemble')!, customLabel: 'CapCut 프로젝트 조립' } },
            { id: 'n5', type: 'custom', position: { x: 1370, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'work_queue_enqueue')!, customLabel: 'WorkQueue 배포 대기열' } }
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', animated: true },
            { id: 'e2', source: 'n2', target: 'n3', animated: true },
            { id: 'e3', source: 'n3', target: 'n4', animated: true },
            { id: 'e4', source: 'n4', target: 'n5', animated: true }
        ]
    },
    {
        id: 'music_beat_sync',
        name: '2. 음악 비트싱크형',
        category: 'shorts_aesthetic',
        description: '무음 구간 초정밀 절삭 + 트렌드 BGM 비트에 맞춰 씬 전환을 동기화하는 감성형 쇼츠',
        nodes: [
            { id: 'nb1', type: 'custom', position: { x: 50, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'local_file_picker')!, customLabel: '영상 클립 수집' } },
            { id: 'nb2', type: 'custom', position: { x: 380, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'silence_remover')!, customLabel: '무음 구간 초정밀 절삭' } },
            { id: 'nb3', type: 'custom', position: { x: 710, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'bgm_beat_sync')!, customLabel: 'BGM 비트 매핑 & 덕킹' } },
            { id: 'nb4', type: 'custom', position: { x: 1040, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'capcut_assemble')!, customLabel: 'CapCut 프로젝트 조립' } },
            { id: 'nb5', type: 'custom', position: { x: 1370, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'work_queue_enqueue')!, customLabel: 'WorkQueue 자동 배포' } }
        ],
        edges: [
            { id: 'eb1', source: 'nb1', target: 'nb2', animated: true },
            { id: 'eb2', source: 'nb2', target: 'nb3', animated: true },
            { id: 'eb3', source: 'nb3', target: 'nb4', animated: true },
            { id: 'eb4', source: 'nb4', target: 'nb5', animated: true }
        ]
    },
    {
        id: 'script_commentary',
        name: '3. 대본 해설/리캡형',
        category: 'shorts_story',
        description: 'Whisper 음성 추출 ➔ AI 대본 각색 ➔ MultiTTS 보이스 ➔ 자막 싱크 ➔ 캡컷 조립',
        nodes: [
            { id: 'sc1', type: 'custom', position: { x: 50, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'url_download')!, customLabel: '영상 소스 수집' } },
            { id: 'sc2', type: 'custom', position: { x: 380, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'whisper_stt')!, customLabel: 'Whisper 음성 전사' } },
            { id: 'sc3', type: 'custom', position: { x: 710, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'topic_to_story')!, customLabel: 'AI 바이럴 대본 각색' } },
            { id: 'sc4', type: 'custom', position: { x: 1040, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'multitts_voice')!, customLabel: 'MultiTTS 나레이션 생성' } },
            { id: 'sc5', type: 'custom', position: { x: 1370, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'capcut_assemble')!, customLabel: 'CapCut 프로젝트 조립' } },
            { id: 'sc6', type: 'custom', position: { x: 1700, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'work_queue_enqueue')!, customLabel: 'WorkQueue 배포 대기열' } }
        ],
        edges: [
            { id: 'esc1', source: 'sc1', target: 'sc2', animated: true },
            { id: 'esc2', source: 'sc2', target: 'sc3', animated: true },
            { id: 'esc3', source: 'sc3', target: 'sc4', animated: true },
            { id: 'esc4', source: 'sc4', target: 'sc5', animated: true },
            { id: 'esc5', source: 'sc5', target: 'sc6', animated: true }
        ]
    },
    {
        id: 'movie_drama_highlight',
        name: '4. 영화/드라마 롱폼 컷팅형',
        category: 'long_to_short',
        description: '롱폼 영화/드라마 수집 ➔ SceneCutter 씬 분할 ➔ 결말포함 리뷰 대본 ➔ TTS ➔ 캡컷 조립',
        nodes: [
            { id: 'md1', type: 'custom', position: { x: 50, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'local_file_picker')!, customLabel: '롱폼 원본 수집' } },
            { id: 'md2', type: 'custom', position: { x: 380, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'scene_cutter')!, customLabel: '스마트 씬 분할' } },
            { id: 'md3', type: 'custom', position: { x: 710, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'llm_review_script')!, customLabel: '결말포함 리뷰 대본 생성' } },
            { id: 'md4', type: 'custom', position: { x: 1040, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'multitts_voice')!, customLabel: '해설자 MultiTTS 보이스' } },
            { id: 'md5', type: 'custom', position: { x: 1370, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'capcut_assemble')!, customLabel: 'CapCut 프로젝트 조립' } }
        ],
        edges: [
            { id: 'emd1', source: 'md1', target: 'md2', animated: true },
            { id: 'emd2', source: 'md2', target: 'md3', animated: true },
            { id: 'emd3', source: 'md3', target: 'md4', animated: true },
            { id: 'emd4', source: 'md4', target: 'md5', animated: true }
        ]
    },
    {
        id: 'hybrid_longform',
        name: '6. 하이브리드 멀티소스 롱폼',
        category: 'longform',
        description: '수집 컷팅 영상과 Flow AI 클립을 다중 트랙으로 교차 조립하는 5~15분 심층 롱폼',
        nodes: [
            { id: 'hl1', type: 'custom', position: { x: 50, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'trend_rss_feed')!, customLabel: '심층 기획 주제 수집' } },
            { id: 'hl2', type: 'custom', position: { x: 380, y: 150 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'topic_to_story')!, customLabel: '챕터별 롱폼 대본 기획' } },
            { id: 'hl3', type: 'custom', position: { x: 710, y: 80 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'flow_ai_batch')!, customLabel: 'Flow AI 보조 클립 렌더' } },
            { id: 'hl4', type: 'custom', position: { x: 710, y: 260 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'multitts_voice')!, customLabel: '장편 나레이션 MultiTTS' } },
            { id: 'hl5', type: 'custom', position: { x: 1040, y: 160 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'ai_image_enhancer')!, customLabel: '4K 업스케일 & 톤매핑' } },
            { id: 'hl6', type: 'custom', position: { x: 1370, y: 160 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'capcut_assemble')!, customLabel: '멀티트랙 CapCut 조립' } },
            { id: 'hl7', type: 'custom', position: { x: 1700, y: 160 }, data: { ...LEGO_NODE_TEMPLATES.find(t => t.type === 'work_queue_enqueue')!, customLabel: 'WorkQueue 배포 관리자' } }
        ],
        edges: [
            { id: 'ehl1', source: 'hl1', target: 'hl2', animated: true },
            { id: 'ehl2', source: 'hl2', target: 'hl3', animated: true },
            { id: 'ehl3', source: 'hl2', target: 'hl4', animated: true },
            { id: 'ehl4', source: 'hl3', target: 'hl5', animated: true },
            { id: 'ehl5', source: 'hl4', target: 'hl6', animated: true },
            { id: 'ehl6', source: 'hl5', target: 'hl6', animated: true },
            { id: 'ehl7', source: 'hl6', target: 'hl7', animated: true }
        ]
    }
];
