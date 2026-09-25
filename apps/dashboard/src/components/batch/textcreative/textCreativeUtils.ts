/**
 * 텍스트 창작형(TextCreative) 타임라인 메트릭 및 대본 연산 엔진
 * 픽셀링 원천 비즈니스 로직(JQ, JX, J1) 100% 실체화
 */

export interface PacingMetrics {
  naturalMs: number;
  fittedMs: number;
  minLines: number;
  maxLines: number;
  lineCount: number;
  status: 'empty' | 'tooShort' | 'tooLong' | 'fitted' | 'ok';
}

export interface DensityMetrics {
  ratio: number;
  status: 'empty' | 'tight' | 'caution' | 'ok';
}

export interface SampleScript {
  title: string;
  category: string;
  script: string;
  targetArchetype: 'ssul' | 'classic' | 'gunlimbo' | 'instagram';
}

/**
 * 대본을 줄 단위로 분리하고 앞뒤 공백을 정제합니다.
 */
export function cleanScriptLines(script: string): string[] {
  if (!script || typeof script !== 'string') return [];
  return script
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * 대본 줄 수 및 페이싱 설정에 따른 예상 소요 시간(ms)과 규격(30~45초) 검사
 * 픽셀링 원천 JQ.IP 알고리즘 100% 복원
 */
export function calculatePacingMetrics(
  lineCount: number,
  cutPacing: 'normal' | 'loose' = 'normal',
  sourceMode: 'short-to-short' | 'long-to-short' = 'short-to-short'
): PacingMetrics {
  if (lineCount <= 0) {
    return {
      naturalMs: 0,
      fittedMs: 0,
      minLines: 8,
      maxLines: 18,
      lineCount: 0,
      status: 'empty'
    };
  }

  // 줄당 자연 발화 시간(나레이션 발화 + 문장 간 포즈): 보통(3.8초), 여유(4.6초)
  const msPerLine = cutPacing === 'loose' ? 4600 : 3800;
  const naturalMs = lineCount * msPerLine;

  const minDurationMs = 28000; // 28~30초
  const maxDurationMs = 50000; // 45~50초

  const minLines = Math.max(6, Math.ceil(minDurationMs / msPerLine));
  const maxLines = Math.floor(maxDurationMs / msPerLine);

  let fittedMs = naturalMs;
  let status: PacingMetrics['status'] = 'ok';

  if (naturalMs < minDurationMs) {
    status = 'tooShort';
    fittedMs = minDurationMs;
  } else if (naturalMs > maxDurationMs) {
    status = 'tooLong';
    fittedMs = maxDurationMs;
  } else if (naturalMs !== fittedMs) {
    status = 'fitted';
  } else {
    status = 'ok';
  }

  return {
    naturalMs,
    fittedMs,
    minLines,
    maxLines,
    lineCount,
    status
  };
}

/**
 * 낭독 점유율 및 리듬 완급도(빽빽도) 분석
 * 낭독이 전체 영상의 80% 이상이면 컷 호흡이 사라지므로 경고를 표시합니다.
 * 픽셀링 원천 JQ.pA 알고리즘 100% 복원
 */
export function calculateDensityMetrics(lines: string[], fittedMs: number): DensityMetrics {
  if (!lines || lines.length === 0 || fittedMs <= 0) {
    return { ratio: 0, status: 'empty' };
  }

  // 총 글자 수 산출 (한글 기준 글자당 약 0.22초 소요)
  const totalChars = lines.reduce((acc, line) => acc + line.replace(/\s+/g, '').length, 0);
  const readingMs = totalChars * 220;

  const ratio = Math.min(1.0, readingMs / fittedMs);

  let status: DensityMetrics['status'] = 'ok';
  if (ratio >= 0.85) {
    status = 'tight';
  } else if (ratio >= 0.72) {
    status = 'caution';
  } else {
    status = 'ok';
  }

  return { ratio, status };
}

/**
 * URL 링크 텍스트에서 유튜브, 인스타그램, 틱톡 링크를 정규식으로 감지 추출
 */
export function parseDraftLinks(rawText: string): string[] {
  if (!rawText) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = rawText.match(urlRegex) || [];
  return Array.from(new Set(matches.map(u => u.trim())));
}

/**
 * 픽셀링 원천 감동/야담/썰형 고품질 샘플 대본 컬렉션
 */
export const SAMPLE_CREATIVE_SCRIPTS: SampleScript[] = [
  {
    title: '엄마의 마지막 도시락',
    category: '감동 실화',
    targetArchetype: 'ssul',
    script: `엄마가 남긴 마지막 도시락
뚜껑을 여는 손이 떨렸다
반찬마다 쪽지가 붙어 있었다
우리 딸 오늘도 힘내라는 말
차마 먹지 못하고 울었다
그날 이후 매일 도시락을 싼다
엄마가 하던 그대로
사랑은 그렇게 이어진다`
  },
  {
    title: '조선 왕실의 비밀 반란 사건',
    category: '역사 야담',
    targetArchetype: 'classic',
    script: `1443년 세종 25년 깊은 밤
집현전 학사들의 격렬한 상소가 빗발쳤다
한글은 오랑캐의 글자라며 무릎 꿇고 항의했다
하지만 세종은 뜻을 굽히지 않았다
마침내 28자가 완성된 그날 밤
궁궐 깊은 곳에서 비밀 회합이 발각된다
백성을 사랑한 군주의 위대한 결단
오늘 우리가 쓰는 글의 시작이었다`
  },
  {
    title: '동네 편의점 야간 알바의 기적',
    category: '사이다 썰',
    targetArchetype: 'ssul',
    script: `새벽 3시 편의점 문이 거칠게 열렸다
온몸이 젖은 노신사가 들어왔다
말없이 따뜻한 캔커피 하나를 건넸다
노신사는 눈물을 글썽이며 커피를 마셨다
알고 보니 그는 길을 잃은 치매 환자였다
가족들이 밤새 찾고 있던 중이었다
작은 친절 하나가 한 가정을 구했다`
  }
];
