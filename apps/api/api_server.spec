# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\ViraLoopMedia\\VLStudio\\apps\\api\\app\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('app/services/persona/persona_library.json', 'app/services/persona')],
    hiddenimports=['uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan', 'uvicorn.lifespan.on', 'sqlalchemy.sql.default_comparator', 'sqlite3', 'pydantic_settings', 'jinja2'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['onnxruntime.capi.onnxruntime_providers_cuda', 'onnxruntime.capi.onnxruntime_providers_tensorrt'],
    noarchive=False,
    optimize=0,
)

# Exclude heavy CUDA, cuDNN, TensorRT, and ONNX CUDA provider DLLs to keep size low
# and link dynamically to system CUDA at runtime.
a.binaries = [
    x for x in a.binaries
    if not any(
        cuda_lib in x[0].lower() or cuda_lib in x[1].lower()
        for cuda_lib in [
            'onnxruntime_providers_cuda',
            'onnxruntime_providers_tensorrt',
            'cudnn',
            'cublas',
            'cufft',
            'curand',
            'cusolver',
            'cusparse',
            'cudart'
        ]
    )
]

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
