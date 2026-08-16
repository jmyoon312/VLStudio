import { describe, it, expect } from 'vitest';
import {
    parseMetaText,
    fileIdCandidates,
    matchByFileName,
    titleSimilarity,
    langToOcrCode,
    computeSchedule,
    computeScheduleBySeq,
} from '@/lib/pixeling';

const SAMPLE_TEXT = `저장일: 2026. 8. 9. 오후 8:07
소스 수: 2
메타 세트 수: 3

========================================
1. pixeling_1786243368629506400.mp4
========================================
소스 파일명: pixeling_1786243368629506400.mp4
포함 메타: 원본, 일본어
[원본] 추천 메타
언어: 원본
제목
재미있는 고양이 영상
설명
고양이가 장난감과 노는 모습
태그
#cat #funny
대본
(대본 없음)
----------------------------------------
[일본어] 추천 메타
언어: 일본어
제목
面白い猫の動画
설명
猫がおもちゃと遊ぶ様子
태그
#cat #funny
대본
(대본 없음)
========================================
2. pixeling_1786243361234567890.mp4
========================================
소스 파일명: pixeling_1786243361234567890.mp4
포함 메타: 원본
[원본] 추천 메타
언어: 원본
제목
하늘 풍경 타임랩스
설명
아름다운 노을
태그
#sky #timelapse
대본
(대본 없음)`;

describe('parseMetaText', () => {
    it('parses header stats', () => {
        const parsed = parseMetaText(SAMPLE_TEXT);
        expect(parsed.savedAt).toBe('2026. 8. 9. 오후 8:07');
        expect(parsed.sourceCount).toBe(2);
        expect(parsed.metaCount).toBe(3);
    });

    it('parses 2 sources with metas', () => {
        const parsed = parseMetaText(SAMPLE_TEXT);
        expect(parsed.sources.length).toBe(2);

        const src1 = parsed.sources[0];
        expect(src1.index).toBe(1);
        expect(src1.fileName).toBe('pixeling_1786243368629506400.mp4');
        expect(src1.includedMeta).toBe('원본, 일본어');
        expect(src1.metas.length).toBe(2);

        const ko = src1.metas[0];
        expect(ko.lang).toBe('원본');
        expect(ko.title).toBe('재미있는 고양이 영상');
        expect(ko.description).toBe('고양이가 장난감과 노는 모습');
        expect(ko.tags).toBe('#cat #funny');
        expect(ko.script).toBe('');

        const jp = src1.metas[1];
        expect(jp.lang).toBe('일본어');
        expect(jp.title).toBe('面白い猫の動画');
    });

    it('returns empty on blank input', () => {
        const parsed = parseMetaText('');
        expect(parsed.sources.length).toBe(0);
        expect(parsed.sourceCount).toBe(0);
    });

    it('parses export variant where header markers sit before closing ====', () => {
        // 실제 export 중 헤딩 다음에 `소스 파일명`/`포함 메타`가 먼저 오고 `====`가 닫는 형태
        const text = `저장일: 2026-08-13
소스 수: 1
메타 세트 수: 1

========================================
1. pixeling_1786243368629506400.mp4
소스 파일명: pixeling_1786243368629506400.mp4
포함 메타: 원본
========================================
[원본] 추천 메타
언어: 원본
제목
재미있는 고양이 영상 모음
설명
고양이 영상입니다.
태그
#cat #funny
대본
(대본 없음)`;
        const parsed = parseMetaText(text);
        expect(parsed.sources.length).toBe(1);
        expect(parsed.sources[0].fileName).toBe('pixeling_1786243368629506400.mp4');
        expect(parsed.sources[0].includedMeta).toBe('원본');
        expect(parsed.sources[0].metas.length).toBe(1);
        expect(parsed.sources[0].metas[0].title).toBe('재미있는 고양이 영상 모음');
    });
});

describe('file matching', () => {
    const sources = parseMetaText(SAMPLE_TEXT).sources;

    it('extracts pixeling fingerprint', () => {
        expect(fileIdCandidates('pixi-one-take-pixeling_1786243368629506400-17.mp4')).toContain('1786243368629506400');
        expect(fileIdCandidates('pixeling_1786243368629506400.mp4')).toContain('1786243368629506400');
    });

    it('matches video by shared pixeling ID', () => {
        const m = matchByFileName('pixi-one-take-pixeling_1786243368629506400-17.mp4', sources);
        expect(m).not.toBeNull();
        expect(m!.source.index).toBe(1);
    });

    it('returns null when no shared ID', () => {
        expect(matchByFileName('some-other-video.mp4', sources)).toBeNull();
    });
});

describe('titleSimilarity', () => {
    it('scores exact match high', () => {
        expect(titleSimilarity('재미있는 고양이 영상', '재미있는 고양이 영상')).toBe(1);
    });

    it('boosts partial containment', () => {
        const s = titleSimilarity('고양이 영상', '재미있는 고양이 영상');
        expect(s).toBeGreaterThan(0.5);
    });
});

describe('langToOcrCode', () => {
    it('maps languages', () => {
        expect(langToOcrCode('원본')).toBe('kor');
        expect(langToOcrCode('일본어')).toBe('jpn');
        expect(langToOcrCode('영어')).toBe('eng');
    });
});

describe('computeSchedule', () => {
    const sources = parseMetaText(SAMPLE_TEXT).sources;

    it('assigns slots in order across days', () => {
        const map = computeSchedule(sources, '원본', {
            startDate: '2026-08-10',
            startSlotIndex: 0,
            slots: ['10:00', '17:00'],
        });
        const idx1 = map[1];
        const idx2 = map[2];
        expect(idx1).toBeInstanceOf(Date);
        expect(idx2).toBeInstanceOf(Date);
        expect(idx2.getTime()).toBeGreaterThan(idx1.getTime());
        // same-day second slot → idx2 at 17:00
        expect(idx1.getHours()).toBe(10);
        expect(idx2.getHours()).toBe(17);
    });

    it('returns empty without config', () => {
        expect(computeSchedule(sources, '원본', { startDate: '', startSlotIndex: 0, slots: [] })).toEqual({});
    });

    it('respects excluded sources', () => {
        const map = computeSchedule(sources, '원본', {
            startDate: '2026-08-10',
            startSlotIndex: 0,
            slots: ['10:00', '17:00'],
        }, [1]);
        expect(map[1]).toBeUndefined();
        expect(map[2]).toBeDefined();
    });
});

describe('computeScheduleBySeq', () => {
    const cfg = (over?: Partial<any>) => ({
        startDate: '2026-08-10',
        startSlotIndex: 0,
        slots: ['10:00', '17:00'],
        ...(over || {}),
    });

    it('assigns slots to the given sequence order', () => {
        // 사용자 재배열로 2번 소스를 앞에 배치
        const map = computeScheduleBySeq(cfg(), [2, 1]);
        expect(map[2].getHours()).toBe(10);  // 첫 순서 → 첫 슬롯
        expect(map[1].getHours()).toBe(17);  // 두 번째 → 두 번째 슬롯
    });

    it('skips hidden sources not present in sequence', () => {
        const map = computeScheduleBySeq(cfg(), [2]);
        expect(map[1]).toBeUndefined();
        expect(map[2]).toBeDefined();
    });

    it('respects startSlotIndex boundary', () => {
        const map = computeScheduleBySeq(cfg({ startSlotIndex: 1 }), [1]);
        expect(map[1].getHours()).toBe(17);
    });

    it('returns empty for no sequence', () => {
        expect(computeScheduleBySeq(cfg(), [])).toEqual({});
    });
});
