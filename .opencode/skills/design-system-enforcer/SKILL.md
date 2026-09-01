# Design System Enforcer Skill

> ViraLoop Studio의 디자인 일관성을 강제하는 스킬입니다.

## When to Use

- UI 컴포넌트 작성/수정 시
- 하드코딩된 색상 발견 시
- 디자인 토큰 적용 검증 시
- 새 페이지/컴포넌트 개발 시

## 절대 규칙 (Absolute Rules)

### 1. 하드코딩 색상 금지

**금지 패턴:**
```tsx
// ❌ 절대 사용 금지
<div className="bg-white">
<div className="text-gray-300">
<div className="border-slate-700">
<div style={{ backgroundColor: '#3B82F6' }}>
<div className="bg-[#1e1e1e]">
```

**허용 패턴:**
```tsx
// ✅ 시맨틱 토큰 사용 필수
<div className="bg-card">
<div className="text-muted-foreground">
<div className="border-border">
<div className="bg-primary">
<div className="bg-background">
```

### 2. 시맨틱 클래스 매핑

| 하드코딩 | 시맨틱 토큰 |
|----------|-------------|
| `bg-white` | `bg-card` |
| `bg-gray-50`, `bg-gray-100` | `bg-muted` |
| `bg-gray-200`, `bg-gray-300` | `bg-accent` |
| `text-gray-500`, `text-gray-600` | `text-muted-foreground` |
| `text-gray-700`, `text-gray-800` | `text-foreground` |
| `border-gray-200`, `border-gray-300` | `border-border` |
| `bg-blue-500`, `bg-blue-600` | `bg-primary` |
| `bg-green-500`, `bg-emerald-500` | `bg-success` |
| `bg-red-500`, `bg-rose-500` | `bg-destructive` |
| `bg-yellow-500`, `bg-amber-500` | `bg-warning` |

### 3. 버튼 표준

**금지:**
```tsx
// ❌ 직접 스타일링 금지
<button className="bg-indigo-600 text-white px-4 py-2 rounded">
<button className="bg-blue-500 hover:bg-blue-600 text-white">
```

**허용:**
```tsx
// ✅ shadcn Button 컴포넌트만 사용
import { Button } from "@/components/ui/button"

<Button variant="default">기본</Button>
<Button variant="destructive">위험</Button>
<Button variant="outline">외곽선</Button>
<Button variant="secondary">보조</Button>
<Button variant="ghost">고스트</Button>
```

### 4. Border Radius 표준

| 용도 | 클래스 | 값 |
|------|--------|-----|
| 기본 (카드, 인풋) | `rounded-lg` | 12px |
|小型 (배지, 태그) | `rounded-md` | 8px |
|大型 (다이얼로그) | `rounded-xl` | 12px |
| fully-rounded (아바타) | `rounded-full` | 9999px |

**금지:** `rounded-2xl`, `rounded-3xl`, `rounded-[18px]` (비표준)

### 5. 폰트 사이즈 표준

| 크기 | 클래스 | 용도 |
|------|--------|------|
| 10px | `text-[10px]` | ⚠️ 최소 허용 (배지에만) |
| 11px | `text-[11px]` | ⚠️ 최소 허용 (메타 정보에만) |
| 12px | `text-xs` | 기본 소형 텍스트 |
| 14px | `text-sm` | 본문 텍스트 |
| 16px | `text-base` | 기본 텍스트 |
| 18px | `text-lg` | 소형 제목 |
| 20px | `text-xl` | 제목 |

## 예외 (Exceptions)

아래의 경우에는 하드코딩이 허용됩니다:

1. **Canvas/WebGL 렌더링** - Konva, Three.js 등
2. **Remotion 비디오 합성** - `src/remotion/` 내
3. **차트 라이브러리** - Recharts `stroke`/`fill`
4. **OAuth 브랜드 색상** - Google, GitHub 등
5. **MUI 컴포넌트** - `src/theme/pixeling.ts` 내 (마이그레이션 대상)

## 검증 체크리스트

새 컴포넌트 작성 시:

- [ ] `bg-white` 사용 없음 → `bg-card` 사용
- [ ] `text-gray-*` 사용 없음 → `text-muted-foreground` 사용
- [ ] `border-gray-*` 사용 없음 → `border-border` 사용
- [ ] `#hex` 색상 사용 없음 → 시맨틱 클래스 사용
- [ ] shadcn `Button` 컴포넌트 사용
- [ ] `rounded-lg` 기본 반지름 사용

## 유틸리티 클래스 참조

```css
/* index.css에 정의된 유틸리티 클래스 */
.vl-card           /* 카드 배경 + 테두리 + 그림자 */
.vl-panel          /* 패널 배경 + 테두리 */
.vl-btn-primary    /* 기본 버튼 스타일 */
.vl-btn-ghost      /* 고스트 버튼 스타일 */
.vl-btn-outline    /* 외곽선 버튼 스타일 */
.vl-input          /* 입력 필드 스타일 */
.vl-badge          /* 기본 배지 */
.vl-badge-primary  /* 주요 배지 */
.vl-badge-success  /* 성공 배지 */
.vl-badge-warning  /* 경고 배지 */
.vl-badge-error    /* 오류 배지 */
```
