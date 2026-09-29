# [최종 상세 설계서] CanvasKit 기반 통합 기본 에디터 & E2E 무인 렌더링 파이프라인
## ViraLoop Studio Sovereign Visual Blueprint & Automated Factory Architecture (v3.0)

> **문서 버전**: v3.0 (최종 승인본)  
> **작성 일시**: 2026년 9월 30일  
> **단일 진실 공급원 (SSOT)**: `VLStandardBlueprint v3` (`apps/dashboard/src/types/blueprint.ts`)  
> **적용 대상**: ViraLoop Studio Desktop (Electron + React 18 + CanvasKit Skia WASM + FastAPI + Remotion/FFmpeg)

---

## 1. 총괄 개요 및 추진 배경 (Executive Summary)

### 1.1 배경 및 문제 진단
1. **화면 및 코드 파편화**:
   - 기존 ViraLoop Studio는 4대 폼팩터(`Classic`, `Instagram`, `Gunlimbo`, `Ssul`)가 각각 별개의 템플릿 페이지(`/shorts-template/*`)와 모놀리식 컴포넌트로 분리되어 있어, 유지보수 비용이 높고 템플릿 간 교차 기능 활용이 불가능했습니다.
2. **시각적 자유도 결여**:
   - 고정된 폼 입력 위주의 편집기로 인해, 썰형 템플릿에 군림보의 속보 배너를 추가하거나 인스타 댓글 카드를 얹는 식의 포토샵/피그마형 레이어 편집이 불가능했습니다.
3. **픽셀링(Pixeling 1.0.141)의 한계와 기회**:
   - 픽셀링은 CanvasKit(Skia WASM) 기반의 선언형 렌더링(`DisplayOps`)으로 60fps 프리뷰와 HarfBuzz 타이포그래피를 구현했으나, **고정된 4대 템플릿 코드 안에 화면을 가두고 음향 DSP/컷 호흡 데이터를 누락한 채 LLM에 암묵적으로 외주화**하는 치명적 한계를 드러냈습니다.

### 1.2 핵심 추진 목표
1. **단 하나의 강력한 `기본 에디터(Basic Editor)`로 통합**:
   - 파편화된 4대 디자인 페이지를 공식 폐지하고, 기본 에디터 상단의 **[4대 원형(Archetype) 프리셋]**으로 흡수·통합.
2. **자유 레이어 객체 트리(Layer Object Tree) 시스템 구축**:
   - 모든 화면 요소를 마우스 기즈모(선택, 이동, 리사이징, 회전)로 직접 조작하고, 언제든 `[+ 레이어 추가]`가 가능한 상용 그래픽 툴 수준의 유연성 확보.
3. **2계층 하이브리드 표준 (`VLStandardBlueprint v3`) 확립**:
   - 픽셀링의 가벼운 **시각 껍데기(DisplayOps)**와 ViraLoop의 **고밀도 연출 DNA(음향 DSP, WPM, 안전영역, 감정 이모지 슬롯)**를 결합.
4. **E2E 무인 자동 렌더링 ➔ 업로드 대기열 직결 파이프라인 완결**:
   - 에디터에서 설정한 프리셋과 대본이 결합되면, 백엔드가 무인으로 MP4를 자동 렌더링하여 `05_Exports`에 저장하고, 즉시 `/work-queue`로 편입시켜 예약 발행까지 원스톱 자동화. (CapCut은 선택적 보조 수단으로 분리)

---

## 2. 시스템 토폴로지 및 파이프라인 구조 (End-to-End Architecture)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ViraLoop Studio UI                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    기본 에디터 (BasicEditorStudio / /basic-editor)                │  │
│  │  • 상단 4대 원형 프리셋 전환 [💬 썰형] [⚔️ 군림보] [📱 인스타] [🎬 클래식]        │  │
│  │  • 캔버스 뷰포트 (CanvasKit Skia 60fps 오프스크린 투사 + 인터랙티브 기즈모)       │  │
│  │  • 좌측: 레이어 스택 (순서 변경, 숨김, 잠금, 추가) / 우측: 시맨틱 인스펙터         │  │
│  │  • 하단: NLE 멀티트랙 타임라인 & 플랫폼 안전영역(Safe-Zone) 오버레이              │  │
│  └────────────────────────────────────────┬─────────────────────────────────────────┘  │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │ 저장 (Save Preset)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        단일 진실 공급원 (Single Source of Truth)                        │
│                           VLStandardBlueprint v3 (JSON)                                │
│        • SQLite: viral_loop.db (ShortsTemplate / SovereignPreset)                      │
│        • 디스크: %LOCALAPPDATA%/ViraLoop Studio/media/03_Assets/presets/*.json          │
└───────────────────┬─────────────────────────────────────────────────┬──────────────────┘
                    │ 대본 생성 및 영상 발주 (One-Take Production)      │ 수동 정밀 편집 요청
                    ▼                                                 ▼
┌───────────────────────────────────────┐         ┌──────────────────────────────────────┐
│       내부 무인 자동 렌더링 파이프라인        │         │       선택적 캡컷 익스포터           │
│   (apps/api/app/services/remotion)    │         │  (services/capcutLocalGenerator.ts)  │
│                                       │         │                                      │
│ • Blueprint ➔ Remotion Composition 주입│         │ • Blueprint ➔ com.lveditor.draft     │
│ • Headless Chromium / Skia 래스터라이징 │         │ • 트랙, 자막, 효과음 1:1 컴파일      │
│ • 음향 DSP: TTS 볼륨 + BGM Ducking dB  │         │ • 0.1초 만에 프로젝트 폴더 생성       │
│ • 출력: %LOCALAPPDATA%/.../05_Exports/ │         └──────────────────────────────────────┘
└───────────────────┬───────────────────┘
                    │ MP4 생성 완료 즉시 직결
                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       업로드 대기열 허브 (/work-queue)                                  │
│   • 유튜브 쇼츠 / 인스타그램 릴스 무인 자동 예약 배포                                  │
│   • 스텔스 모바일 LTE 다중 회선 프록시 연동 격리 발송                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 단일 진실 공급원 표준 규격: `VLStandardBlueprint v3`

기존 픽셀링의 `pixeling-editor-shell/1`의 한계를 극복하고 ViraLoop의 17대 연출 바이블을 수용한 최종 데이터 스키마입니다.

### 3.1 Zod 스키마 정의 (`apps/dashboard/src/types/blueprint.ts`)

```typescript
import { z } from "zod";

// 1. 기하학 및 변형 (Transform)
export const TransformSchema = z.object({
  x: z.number().describe("캔버스 X 좌표 (기준 해상도 1080)"),
  y: z.number().describe("캔버스 Y 좌표 (기준 해상도 1920)"),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  scale: z.number().default(1),
  origin: z.enum(["center", "top_left", "bottom_center"]).default("center"),
  zIndex: z.number().int().default(0),
});

// 2. 동적 감정 이모지 슬롯 (Semantic Emotion Slot)
export const EmotionEmojiSlotSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(["inline_end", "floating_top", "floating_left"]).default("inline_end"),
  gap: z.number().default(12),
  scaleRatio: z.number().default(1.2),
  animation: z.enum(["none", "pop_bounce", "shake", "fade_scale"]).default("pop_bounce"),
  fallbackEmoji: z.string().default("🔥"),
  allowedTaxonomy: z.array(z.string()).default(["shock", "rage", "laughter", "crying", "suspense"]),
});

// 3. 레이어 객체별 세부 정의
export const BaseLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  transform: TransformSchema,
  inMs: z.number().int().nonnegative().default(0),
  outMs: z.number().int().nonnegative().nullable().default(null),
  opacity: z.number().min(0).max(1).default(1),
});

export const TextLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("text"),
  textRole: z.enum(["title_header", "subtitle_narrative", "hook_punch", "badge", "author_meta"]),
  content: z.string().default(""),
  fontFamily: z.string().default("NotoSansKR-Bold"),
  fontSize: z.number().default(54),
  fontColor: z.string().default("#FFFFFF"),
  letterSpacing: z.number().default(-1),
  lineHeight: z.number().default(1.3),
  textAlign: z.enum(["left", "center", "right"]).default("center"),
  stroke: z.object({ color: z.string(), width: z.number() }).optional(),
  shadow: z.object({ color: z.string(), blur: z.number(), offsetX: z.number(), offsetY: z.number() }).optional(),
  backgroundColor: z.string().optional(),
  borderRadius: z.number().default(0),
  padding: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0, 0, 0, 0]),
  emojiSlot: EmotionEmojiSlotSchema.optional(),
  accumulateMode: z.boolean().default(false).describe("썰형 자막 누적 모드"),
});

export const MediaLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("media"),
  mediaRole: z.enum(["main_background", "frame_cutout", "b_roll", "reaction_meme"]),
  assetId: z.string().default("sample1"),
  fit: z.enum(["cover", "contain", "fill"]).default("cover"),
  focus: z.tuple([z.number(), z.number()]).default([0.5, 0.5]),
  motion: z.object({
    type: z.enum(["none", "zoom_in", "zoom_out", "pan_left", "ken_burns"]).default("none"),
    strength: z.number().default(0.1),
    durationMs: z.number().default(3000),
  }).default({ type: "none", strength: 0.1, durationMs: 3000 }),
  clipFromMs: z.number().default(0),
});

export const ShapeLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("shape"),
  shapeRole: z.enum(["hook_band", "urgent_banner", "comment_card", "divider", "dimmed_overlay"]),
  fillColor: z.string().default("#000000"),
  borderRadius: z.number().default(0),
  gradient: z.object({
    direction: z.enum(["vertical", "horizontal"]),
    stops: z.array(z.object({ at: z.number(), color: z.string() })),
  }).optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().default(0),
});

export const LayerObjectSchema = z.discriminatedUnion("kind", [
  TextLayerSchema,
  MediaLayerSchema,
  ShapeLayerSchema,
]);

// 4. 고밀도 연출 DNA 및 오디오 DSP 규격 (ViraLoop 초격차 영역)
export const ProductionDNASchema = z.object({
  audio: z.object({
    ttsVolumeDb: z.number().default(-3.0),
    bgmVolumeDb: z.number().default(-22.0),
    bgmDuckingDb: z.number().default(-26.0),
    duckingFadeMs: z.number().default(350),
    voiceCadenceWpm: z.number().default(310),
    voicePitchF0: z.number().default(1.0),
  }),
  pacing: z.object({
    jabHookDurationMs: z.number().default(800),
    minCutDurationMs: z.number().default(1500),
    maxCutDurationMs: z.number().default(3500),
  }),
  safeZones: z.object({
    rightGuardWidth: z.number().default(120).describe("쇼츠 우측 아이콘 세이프존"),
    bottomGuardHeight: z.number().default(240).describe("쇼츠 하단 제목/사운드 세이프존"),
    topGuardHeight: z.number().default(180).describe("상단 상태바 세이프존"),
  }),
});

// 5. 최종 완성형 청사진 스키마
export const VLStandardBlueprintSchema = z.object({
  schemaVersion: z.literal("viraloop-blueprint/v3"),
  blueprintId: z.string(),
  name: z.string().min(1).max(60),
  archetype: z.enum(["ssul", "gunlimbo", "instagram", "classic", "bespoke"]),
  canvas: z.object({
    width: z.number().default(1080),
    height: z.number().default(1920),
    fps: z.enum(["30", "60"]).default("30"),
    backgroundColor: z.string().default("#000000"),
  }),
  layers: z.array(LayerObjectSchema),
  productionDNA: ProductionDNASchema,
  samplePreview: z.object({
    channelName: z.string().default("채널 이름"),
    title: z.string().default("영상 제목 샘플"),
    lines: z.array(z.object({ text: z.string(), emotion: z.string().default("neutral") })),
    mediaAssets: z.record(z.string()).default({}),
  }),
});

export type VLStandardBlueprint = z.infer<typeof VLStandardBlueprintSchema>;
export type VLLayerObject = z.infer<typeof LayerObjectSchema>;
```

---

## 4. 프론트엔드: CanvasKit Web Worker 렌더링 엔진 상세 설계

### 4.1 스레드 분리 및 오프스크린 파이프라인
* **위치**: `apps/dashboard/src/workers/canvas_worker.ts`
* **역할**:
  1. `canvaskit.wasm` 바이너리를 워커 스레드 메모리에 격리 로드.
  2. `NotoSansKR`, `NanumGothic`, `NotoColorEmoji` 등 TTF 폰트 바이너리를 `FontProvider`에 등록.
  3. UI 스레드로부터 전달받은 `VLStandardBlueprint`의 각 레이어를 순수 `DisplayOps`로 변환하여 Skia 캔버스에 래스터라이징.
  4. 렌더링된 프레임을 `createImageBitmap()`을 통해 **메모리 복사 없이(Zero-Copy)** UI 스레드로 60fps 전송.

### 4.2 선언형 DisplayOps 실행기 (`DisplayOpsExecutor`)
워커 내부에서 Skia Canvas API로 매핑되는 연산:
```typescript
export interface DisplayOp {
  op: "rect" | "paragraph" | "image" | "gradient" | "group";
  rect: { x: number; y: number; w: number; h: number };
  [key: string]: any;
}

export function executeDisplayOps(canvas: SkCanvas, ops: DisplayOp[], kit: CanvasKit) {
  for (const item of ops) {
    switch (item.op) {
      case "rect": {
        const paint = new kit.Paint();
        paint.setColor(kit.parseColorString(item.color));
        if (item.radius) {
          canvas.drawRRect(kit.RRectXY(kit.XYWHRect(item.rect.x, item.rect.y, item.rect.w, item.rect.h), item.radius, item.radius), paint);
        } else {
          canvas.drawRect(kit.XYWHRect(item.rect.x, item.rect.y, item.rect.w, item.rect.h), paint);
        }
        paint.delete();
        break;
      }
      case "paragraph": {
        // HarfBuzz 엔진을 통한 고해상도 한글 + NotoColorEmoji 텍스트 셰이핑
        item.builder.build();
        canvas.drawParagraph(item.paragraph, item.rect.x, item.rect.y);
        break;
      }
      case "image": {
        // Bicubic 보간을 적용한 고화질 미디어 투사
        canvas.drawImageRectOptions(item.skImage, item.srcRect, item.dstRect, kit.FilterMode.Linear, kit.MipmapMode.None, item.paint);
        break;
      }
    }
  }
}
```

### 4.3 마우스 인터랙티브 기즈모 (Transform Gizmo)
* **기능**: 사용자가 캔버스 상의 객체를 클릭했을 때 8방향 리사이즈 핸들과 회전 핸들, 바운딩 박스를 표출.
* **스냅 가이드**:
  * 캔버스 가로/세로 정중앙 자석 스냅선(Cyan 가이드).
  * 플랫폼 세이프존(우측 120px, 하단 240px) 침범 시 경고선(Magenta 가이드) 및 자동 탈출 스냅.

---

## 5. 4대 원형 프리셋(Archetype) 초기화 팩토리 설계

기존 4대 디자인 스튜디오의 고유 특징을 `VLStandardBlueprint`의 기본 레이어 조합으로 완벽 흡수합니다:

### 5.1 4대 원형 매트릭스
1. **`ssul` (썰형 원형)**:
   * 레이어 1: `MediaLayer` (배경 비디오/이미지, Cover 모드)
   * 레이어 2: `ShapeLayer` (상단 노란 헤더바 + 커뮤니티 타이틀 + 작성자 블러 메타)
   * 레이어 3: `TextLayer` (단락별 자막 누적 모드 `accumulateMode: true`, 54px 볼드 텍스트)
   * 레이어 4: `MediaLayer` / `MemeLayer` (10종 페페 감정 밈 또는 동물 아바타, 자막 하단 연동)
2. **`gunlimbo` (군림보 원형)**:
   * 레이어 1: `MediaLayer` (0초 줌인/줌아웃 메인 게임/이슈 영상)
   * 레이어 2: `ShapeLayer` (화면 최상단 긴급 속보 빨간 배너)
   * 레이어 3: `ShapeLayer` (상단 180px 화이트 훅 밴드) + `TextLayer` (검정 고딕 임팩트 훅 문구)
   * 레이어 4: `TextLayer` (하단 블랙 반투명 박스 + 옐로우/화이트 2-Tone 자막 + 이모지 슬롯)
3. **`instagram` (인스타 카드 원형)**:
   * 레이어 1: `MediaLayer` (풀스크린 블러 또는 릴스 배경 비디오)
   * 레이어 2: `ShapeLayer` (중앙 둥근 모서리 반투명 다크 카드, Radius 32px, Blur 16px)
   * 레이어 3: `MediaLayer` (원형 프로필 아바타 + 인증 배지 마크) + `TextLayer` (계정 아이디)
   * 레이어 4: `TextLayer` (댓글형 본문 또는 베스트 댓글 카드 목록)
4. **`classic` (클래식 바이럴 원형)**:
   * 레이어 1: `MediaLayer` (메인 9:16 비디오)
   * 레이어 2: `TextLayer` (상단 2줄 하이라이트 타이틀)
   * 레이어 3: `TextLayer` (중앙 바이럴 자막, 테두리 스트로크 8px, 드롭 섀도우)
   * 레이어 4: `ShapeLayer` / `TextLayer` (하단 출처 표기 크레딧 바)

---

## 6. AI 시맨틱 감정 추론 및 동적 이모지 주입 엔진

### 6.1 동작 메커니즘
```
[대본 텍스트 스트림] "회의실 문이 열리더니 대표님이 직접 들어오셨습니다"
       │
       ▼
[Sentiment & Energy Classifier (Writer Agent)]
       │
       ├─► 문맥 감정: "긴장/충격 (Suspense / Shock)"
       ├─► 도파민 지수: 88점
       └─► 추천 이모지: ["😱", "🫨", "👀"] ➔ 1순위 "😱" 확정
       │
       ▼
[Blueprint Subtitle Sequence Compiler]
       │
       └─► TextLayer.emojiSlot.injectedEmoji = "😱"
       └─► animation = "pop_bounce" (0.2초 스케일 0.8 ➔ 1.3 ➔ 1.0 바운스)
```

---

## 7. 백엔드 무인 렌더링 ➔ 업로드 대기열 직결 브릿지

### 7.1 데이터 흐름 및 저장소 무결성 규칙
1. **프리셋 영구 저장**:
   - `POST /api/sovereign-presets/basic-editor/save` 엔드포인트 호출.
   - 단일 SQLite DB(`viral_loop.db`)의 `ShortsTemplate` 테이블 및 디스크 `%LOCALAPPDATA%\ViraLoop Studio\media\03_Assets\presets\{name}.json`에 동시 원자적 저장.
2. **원클릭 대량 제작 발주**:
   - `POST /api/video-director/produce-autonomous` 호출.
   - 백엔드 `remotion_renderer.py`가 프리셋 청사진과 AI 생성 대본을 결합하여 헤드리스 렌더링 구동.
3. **결과물 저장 및 대기열 적재**:
   - 최종 MP4는 `%LOCALAPPDATA%\ViraLoop Studio\media\05_Exports\{project_id}.mp4`에 저장.
   - 저장 즉시 `WorkQueueService`를 통해 `viral_loop.db`의 `work_queue_items` 테이블에 `STATUS_PENDING`으로 등록되어 즉시 유튜브/인스타 자동 예약 대기 상태로 진입.

---

## 8. 단계별 구현 로드맵 (Actionable Implementation Plan)

### Step 1: 표준 데이터 스키마 및 직렬화 유틸 구축
* `apps/dashboard/src/types/blueprint.ts` 신설 (`VLStandardBlueprintSchema` 정의).
* `apps/dashboard/src/lib/blueprintToDisplayOps.ts` 신설 (청사진 ➔ CanvasKit ops 변환기).
* 4대 원형 팩토리 `apps/dashboard/src/lib/archetypePresets.ts` 구현.

### Step 2: CanvasKit Web Worker & 프리뷰 훅 구축
* `apps/dashboard/src/workers/canvas_worker.ts` 구현 (Skia WASM 로드, HarfBuzz 텍스트, NotoColorEmoji, OffscreenCanvas 렌더링).
* `apps/dashboard/src/hooks/useCanvasKitRenderer.ts` 구현 (UI 스레드 ↔ 워커 간 60fps ImageBitmap 수신).

### Step 3: 단일 통합 기본 에디터 UI (`BasicEditorStudio.tsx`) 구축
* 파편화된 기존 템플릿 스튜디오를 대체하는 통합 플래그십 화면 완성.
* 상단 원형 전환 탭, 인터랙티브 캔버스 스테이지, 좌측 레이어 트리, 우측 시맨틱 인스펙터, 하단 세이프존 가이드 완비.

### Step 4: AI 대본 감정 분석기 및 동적 이모지 슬롯 결합
* `apps/api/app/agent/hermes_core/writer_critic.py`에 감정 분석 및 이모지 추천 태깅 로직 연동.
* 백엔드 `remotion_renderer.py` 및 `DynamicShortsTemplate.tsx`에 이모지 팝업 애니메이션 렌더링 탑재.

### Step 5: 무인 자동 렌더링 ➔ `/work-queue` 직결 파이프라인 검증
* 프리셋 저장 ➔ 원클릭 제작 ➔ 05_Exports MP4 생성 ➔ 업로드 대기열 자동 적재 폐루프 검증.
* `node scripts/contract-checker.js` 및 `storage-validator.js` 100% 통과 입증.

---

## 9. 품질 게이트키퍼 및 리스크 관리

1. **메모리 누수 방지**:
   - Web Worker 내부에서 `skImage.delete()`, `paint.delete()`를 프레임 렌더링 직후 즉시 호출하여 WASM 힙 메모리를 항상 50MB 이내로 유지.
2. **Windows 콘솔 UTF-8 보장**:
   - 백엔드 렌더러 및 파이썬 스크립트 전역에 `PYTHONIOENCODING=utf-8` 및 `reconfigure(encoding='utf-8')`을 유지하여 이모지 출력 시 CP949 에러 원천 차단.
3. **직접 인증 단일 공급원 준수**:
   - OmniRoute 강제 우회 없이 Google Gemini / OpenAI 공식 자격 증명만을 100% 직접 연결.
