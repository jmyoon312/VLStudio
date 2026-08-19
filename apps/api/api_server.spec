# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:/ViraLoopMedia/VLStudio/apps/api/app/main.py'],
    pathex=[],
    binaries=[],
    datas=[('C:/ViraLoopMedia/VLStudio/apps/api/app/legacy_ddalkkak/workers', 'app/legacy_ddalkkak/workers'), ('C:/ViraLoopMedia/VLStudio/apps/api/app/legacy_ddalkkak/db', 'app/legacy_ddalkkak/db'), ('app/services/persona/persona_library.json', 'app/services/persona'), ('app/legacy_ddalkkak/frontend/dist', 'app/legacy_ddalkkak/frontend/dist')],
    hiddenimports=['uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan', 'uvicorn.lifespan.on', 'sqlalchemy.sql.default_comparator', 'sqlite3', 'pydantic_settings', 'jinja2', 'app.legacy_ddalkkak', 'app.legacy_ddalkkak.api', 'app.legacy_ddalkkak.api.main', 'app.legacy_ddalkkak.api.database', 'app.legacy_ddalkkak.api.auth', 'app.legacy_ddalkkak.workers', 'app.legacy_ddalkkak.workers.ai_remix', 'workers.ai_remix', 'app.legacy_ddalkkak.workers.apify_client', 'workers.apify_client', 'app.legacy_ddalkkak.workers.audio_subtitle', 'workers.audio_subtitle', 'app.legacy_ddalkkak.workers.audio_sync', 'workers.audio_sync', 'app.legacy_ddalkkak.workers.auto_subtitle', 'workers.auto_subtitle', 'app.legacy_ddalkkak.workers.bgm_for_subtitle', 'workers.bgm_for_subtitle', 'app.legacy_ddalkkak.workers.bgm_sfx_selector', 'workers.bgm_sfx_selector', 'app.legacy_ddalkkak.workers.capcut_builder', 'workers.capcut_builder', 'app.legacy_ddalkkak.workers.capcut_registry_manager', 'workers.capcut_registry_manager', 'app.legacy_ddalkkak.workers.cctv_last_frame', 'workers.cctv_last_frame', 'app.legacy_ddalkkak.workers.channel_classifier', 'workers.channel_classifier', 'app.legacy_ddalkkak.workers.channel_discovery', 'workers.channel_discovery', 'app.legacy_ddalkkak.workers.channel_discovery_v2', 'workers.channel_discovery_v2', 'app.legacy_ddalkkak.workers.channel_pool', 'workers.channel_pool', 'app.legacy_ddalkkak.workers.character_generator', 'workers.character_generator', 'app.legacy_ddalkkak.workers.clip_editor', 'workers.clip_editor', 'app.legacy_ddalkkak.workers.clip_engine', 'workers.clip_engine', 'app.legacy_ddalkkak.workers.comfy_client', 'workers.comfy_client', 'app.legacy_ddalkkak.workers.cost_tracker', 'workers.cost_tracker', 'app.legacy_ddalkkak.workers.disk_janitor', 'workers.disk_janitor', 'app.legacy_ddalkkak.workers.dissection', 'workers.dissection', 'app.legacy_ddalkkak.workers.dub_bgm_mixer', 'workers.dub_bgm_mixer', 'app.legacy_ddalkkak.workers.fal_client', 'workers.fal_client', 'app.legacy_ddalkkak.workers.gemini_auth', 'workers.gemini_auth', 'app.legacy_ddalkkak.workers.ghibli_test', 'workers.ghibli_test', 'app.legacy_ddalkkak.workers.japanese_multiuse', 'workers.japanese_multiuse', 'app.legacy_ddalkkak.workers.job_runner', 'workers.job_runner', 'app.legacy_ddalkkak.workers.keyword_generator', 'workers.keyword_generator', 'app.legacy_ddalkkak.workers.kie_client', 'workers.kie_client', 'app.legacy_ddalkkak.workers.korean_discovery', 'workers.korean_discovery', 'app.legacy_ddalkkak.workers.korean_match', 'workers.korean_match', 'app.legacy_ddalkkak.workers.korean_match_v4', 'workers.korean_match_v4', 'app.legacy_ddalkkak.workers.korean_match_v4_flash', 'workers.korean_match_v4_flash', 'app.legacy_ddalkkak.workers.korean_pool', 'workers.korean_pool', 'app.legacy_ddalkkak.workers.llm', 'workers.llm', 'app.legacy_ddalkkak.workers.make_directed_clip', 'workers.make_directed_clip', 'app.legacy_ddalkkak.workers.make_directed_clip_v2', 'workers.make_directed_clip_v2', 'app.legacy_ddalkkak.workers.make_directed_clip_v3', 'workers.make_directed_clip_v3', 'app.legacy_ddalkkak.workers.mascot', 'workers.mascot', 'app.legacy_ddalkkak.workers.multilang_stt', 'workers.multilang_stt', 'app.legacy_ddalkkak.workers.nexlev_client', 'workers.nexlev_client', 'app.legacy_ddalkkak.workers.notify', 'workers.notify', 'app.legacy_ddalkkak.workers.notion_client', 'workers.notion_client', 'app.legacy_ddalkkak.workers.pipeline', 'workers.pipeline', 'app.legacy_ddalkkak.workers.qdrant_index', 'workers.qdrant_index', 'app.legacy_ddalkkak.workers.replicate_client', 'workers.replicate_client', 'app.legacy_ddalkkak.workers.run_whisper', 'workers.run_whisper', 'app.legacy_ddalkkak.workers.shorts_maker', 'workers.shorts_maker', 'app.legacy_ddalkkak.workers.shorts_subtitle', 'workers.shorts_subtitle', 'app.legacy_ddalkkak.workers.stt_client', 'workers.stt_client', 'app.legacy_ddalkkak.workers.subtitle_learning', 'workers.subtitle_learning', 'app.legacy_ddalkkak.workers.telegram_bot', 'workers.telegram_bot', 'app.legacy_ddalkkak.workers.tts_dub', 'workers.tts_dub', 'app.legacy_ddalkkak.workers.video_dna_filter', 'workers.video_dna_filter', 'app.legacy_ddalkkak.workers.video_storyboard', 'workers.video_storyboard', 'app.legacy_ddalkkak.workers.visual_match', 'workers.visual_match', 'app.legacy_ddalkkak.workers.webtoon_static', 'workers.webtoon_static', 'app.legacy_ddalkkak.workers.yangbong_v14', 'workers.yangbong_v14', 'app.legacy_ddalkkak.workers.youtube_client', 'workers.youtube_client'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='api_server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
