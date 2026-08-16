// PixelLab(픽셀링) "추천 메타 전부저장" 텍스트 파서 / 영상 매칭 / 예약 스케줄 계산
// (사공) 수동 업로드 도우미 웹앱의 parser.js / match.js / app.js 로직을 TS로 이식

export interface PixelingMeta {
    lang: string;
    title: string;
    description: string;
    tags: string;
    script: string;
}

export interface PixelingSource {
    index: number;
    fileName: string;
    includedMeta: string;
    metas: PixelingMeta[];
}

export interface ParsedPixeling {
    savedAt: string;
    sourceCount: number;
    metaCount: number;
    sources: PixelingSource[];
}

const HEAVY_LINE = /^={20,}$/;
const LIGHT_LINE = /^-{20,}$/;

const FIELD_LABELS: Record<string, keyof PixelingMeta> = {
    '제목': 'title',
    '설명': 'description',
    '태그': 'tags',
    '대본': 'script',
};

export function parseMetaText(raw: string): ParsedPixeling {
    if (!raw || !raw.trim()) {
        return { savedAt: '', sourceCount: 0, metaCount: 0, sources: [] };
    }

    const lines = raw.replace(/\r\n/g, '\n').split('\n');

    const result: ParsedPixeling = {
        savedAt: '',
        sourceCount: 0,
        metaCount: 0,
        sources: [],
    };

    for (let i = 0; i < Math.min(lines.length, 12); i++) {
        const l = lines[i].trim();
        if (l.startsWith('저장일:')) result.savedAt = l.replace('저장일:', '').trim();
        else if (l.startsWith('소스 수:')) result.sourceCount = parseInt(l.replace('소스 수:', '').trim(), 10) || 0;
        else if (l.startsWith('메타 세트 수:')) result.metaCount = parseInt(l.replace('메타 세트 수:', '').trim(), 10) || 0;
    }

    result.sources = splitSourceBlocks(lines).map((block, idx) => parseSourceBlock(block, idx + 1));
    return result;
}

function splitSourceBlocks(lines: string[]): string[][] {
    const starts: number[] = [];
    for (let i = 0; i < lines.length - 1; i++) {
        // 소스 블록 시작: `====` 바로 다음에 `N.` 헤딩 라인 (본문의 숫자 시작 줄과 구분되며,
        // 실제 export는 헤딩·`소스 파일명`/`포함 메타` 배치가 두 가지 형태로 나뉨)
        if (HEAVY_LINE.test((lines[i] || '').trim()) &&
            /^\d+\.\s+/.test((lines[i + 1] || '').trim())) {
            starts.push(i);
        }
    }

    const blocks: string[][] = [];
    for (let s = 0; s < starts.length; s++) {
        const from = starts[s];
        const to = (s + 1 < starts.length) ? starts[s + 1] : lines.length;
        blocks.push(lines.slice(from, to));
    }
    return blocks;
}

function parseSourceBlock(blockLines: string[], fallbackIndex: number): PixelingSource {
    const source: PixelingSource = {
        index: fallbackIndex,
        fileName: '',
        includedMeta: '',
        metas: [],
    };

    const titleLine = (blockLines[1] || '').trim();
    const m = titleLine.match(/^(\d+)\.\s+(.*)$/);
    if (m) {
        source.index = parseInt(m[1], 10) || fallbackIndex;
        source.fileName = m[2].trim();
    }

    let bodyStart = 3;
    for (let i = 3; i < blockLines.length; i++) {
        const l = blockLines[i].trim();
        if (l.startsWith('소스 파일명:')) {
            const fn = l.replace('소스 파일명:', '').trim();
            if (fn) source.fileName = fn;
        } else if (l.startsWith('포함 메타:')) {
            source.includedMeta = l.replace('포함 메타:', '').trim();
        } else if (/추천 메타$/.test(l) || l.startsWith('언어:')) {
            bodyStart = i;
            break;
        }
    }

    const body = blockLines.slice(bodyStart);
    const metaChunks = splitByLightLine(body);
    source.metas = metaChunks
        .map(parseMetaChunk)
        .filter((meta): meta is PixelingMeta => !!meta && !!(meta.title || meta.description || meta.tags));

    return source;
}

function splitByLightLine(lines: string[]): string[][] {
    const chunks: string[][] = [];
    let cur: string[] = [];
    for (const line of lines) {
        if (LIGHT_LINE.test(line.trim())) {
            if (cur.length) chunks.push(cur);
            cur = [];
        } else {
            cur.push(line);
        }
    }
    if (cur.length) chunks.push(cur);
    return chunks;
}

function parseMetaChunk(chunkLines: string[]): PixelingMeta | null {
    const meta: PixelingMeta = { lang: '', title: '', description: '', tags: '', script: '' };

    for (const line of chunkLines) {
        const l = line.trim();
        if (l.startsWith('언어:')) {
            meta.lang = l.replace('언어:', '').trim();
            break;
        }
        const rm = l.match(/^(.*?)\s*추천 메타$/);
        if (rm && !meta.lang) meta.lang = rm[1].trim();
    }

    let currentField: keyof PixelingMeta | null = null;
    let buffer: string[] = [];

    const flush = () => {
        if (currentField) {
            (meta as any)[currentField] = buffer.join('\n').trim();
        }
        buffer = [];
    };

    for (const line of chunkLines) {
        const trimmed = line.trim();
        if (Object.prototype.hasOwnProperty.call(FIELD_LABELS, trimmed)) {
            flush();
            currentField = FIELD_LABELS[trimmed];
            continue;
        }
        if (/추천 메타$/.test(trimmed) || trimmed.startsWith('언어:')) {
            continue;
        }
        if (currentField) {
            buffer.push(line);
        }
    }
    flush();

    if (meta.script === '(대본 없음)') meta.script = '';
    return meta;
}

// ==== 영상 매칭 (match.js) ====

export function normalizeTitle(s: string): string {
    if (!s) return '';
    return String(s)
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^\p{L}\p{N}]/gu, '');
}

function bigrams(str: string): string[] {
    const arr: string[] = [];
    for (let i = 0; i < str.length - 1; i++) arr.push(str.substr(i, 2));
    if (str.length === 1) arr.push(str);
    return arr;
}

export function diceSimilarity(a: string, b: string): number {
    a = normalizeTitle(a);
    b = normalizeTitle(b);
    if (!a || !b) return 0;
    if (a === b) return 1;

    const ba = bigrams(a);
    const bb = bigrams(b);
    if (ba.length === 0 || bb.length === 0) return 0;

    const map: Record<string, number> = {};
    ba.forEach(g => { map[g] = (map[g] || 0) + 1; });

    let hits = 0;
    bb.forEach(g => {
        if (map[g] > 0) { hits++; map[g]--; }
    });

    return (2 * hits) / (ba.length + bb.length);
}

export function titleSimilarity(ocrText: string, candidate: string): number {
    const a = normalizeTitle(ocrText);
    const b = normalizeTitle(candidate);
    if (!a || !b) return 0;

    let base = diceSimilarity(a, b);

    const shortS = a.length <= b.length ? a : b;
    const longS = a.length <= b.length ? b : a;
    if (shortS.length >= 4 && longS.indexOf(shortS) !== -1) {
        const cover = shortS.length / longS.length;
        base = Math.max(base, 0.55 + 0.45 * cover);
    }
    return base;
}

// 파일명에서 매칭용 "지문"들을 뽑는다.
export function fileIdCandidates(name: string): string[] {
    if (!name) return [];
    const base = String(name).replace(/\.[a-z0-9]+$/i, '');
    const ids: string[] = [];
    const pm = base.match(/pixeling[_-]?(\d{6,})/i);
    if (pm) ids.push(pm[1]);
    const nums = base.match(/\d{6,}/g) || [];
    nums.sort((a, b) => b.length - a.length);
    nums.forEach(n => { if (ids.indexOf(n) === -1) ids.push(n); });
    return ids;
}

export function matchByFileName(videoName: string, sources: PixelingSource[]): { source: PixelingSource; id: string } | null {
    const vids = fileIdCandidates(videoName);
    if (!vids.length) return null;
    for (const vid of vids) {
        for (const src of sources || []) {
            const sids = fileIdCandidates(src.fileName || '');
            if (sids.indexOf(vid) !== -1) {
                return { source: src, id: vid };
            }
        }
    }
    return null;
}

export function langToOcrCode(lang: string): string {
    const l = String(lang || '원본');
    if (/일본|japan|jpn|日本|にほん|ja\b/i.test(l)) return 'jpn';
    if (/영어|영문|english|eng|en\b/i.test(l)) return 'eng';
    if (/중국|중문|china|chinese|中文|zh/i.test(l)) return 'chi_sim';
    return 'kor';
}

export function isJpLang(lang: string): boolean {
    return /일본|japan|jpn|日本/i.test(lang || '');
}

export function isBaseLang(lang: string): boolean {
    return /원본|한국|korean|kor|한글/i.test(lang || '원본');
}

// ==== 예약 스케줄 (app.js computeSchedule) ====

export interface ScheduleCfg {
    startDate: string;          // YYYY-MM-DD
    startSlotIndex: number;
    slots: string[];            // ["10:00", "17:00"]
}

export function hmToMin(hm: string): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm).trim());
    if (!m) return null;
    const h = +m[1], mm = +m[2];
    if (h > 23 || mm > 59) return null;
    return h * 60 + mm;
}

function pad2(n: number): string { return (n < 10 ? '0' : '') + n; }

export function todayDateValue(): string {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/**
 * 표시/예약 순서(sequence)를 따른 스케줄 계산 (사공 앱 보정판).
 * sequence: 사용자가 ▲▼/드래그로 재배열하고 숨긴 카드를 제외한 실제 표시 순서의 소스 index 배열.
 * slots를 시작 슬롯부터 순서대로 배정, 다 쓰면 다음 날 첫 슬롯으로 넘어간다.
 * @returns { [srcIndex]: Date }
 */
export function computeScheduleBySeq(cfg: ScheduleCfg, seq: number[]): Record<number, Date> {
    if (!cfg || !cfg.startDate || !cfg.slots || !cfg.slots.length || !seq || !seq.length) return {};

    const slots = cfg.slots.filter(s => hmToMin(s) != null);
    if (!slots.length) return {};

    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cfg.startDate);
    if (!dm) return {};
    const day = new Date(+dm[1], +dm[2] - 1, +dm[3]);
    if (isNaN(day.getTime())) return {};

    const out: Record<number, Date> = {};
    let slotIdx = cfg.startSlotIndex | 0;
    if (slotIdx < 0) slotIdx = 0;
    if (slotIdx >= slots.length) slotIdx = slots.length - 1;

    for (let i = 0; i < seq.length; i++) {
        const mins = hmToMin(slots[slotIdx]) as number;
        const when = new Date(day.getTime());
        when.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
        out[seq[i]] = when;
        slotIdx++;
        if (slotIdx >= slots.length) { day.setDate(day.getDate() + 1); slotIdx = 0; }
    }
    return out;
}

export function computeSchedule(sources: PixelingSource[], lang: string, cfg: ScheduleCfg, excluded?: number[]): Record<number, Date> {
    if (!cfg || !cfg.startDate || !cfg.slots || !cfg.slots.length) return {};

    const slots = cfg.slots.filter(s => hmToMin(s) != null);
    if (!slots.length) return {};

    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cfg.startDate);
    if (!dm) return {};
    const day = new Date(+dm[1], +dm[2] - 1, +dm[3]);
    if (isNaN(day.getTime())) return {};

    // 해당 언어를 가진 소스 index 목록 (텍스트 순서)
    const all = sources
        .filter(s => s.metas.some(m => (m.lang || '원본') === lang))
        .map(s => s.index);
    const seq = all.filter(i => !(excluded || []).includes(i));

    const out: Record<number, Date> = {};
    let slotIdx = cfg.startSlotIndex | 0;
    if (slotIdx < 0) slotIdx = 0;
    if (slotIdx >= slots.length) slotIdx = slots.length - 1;

    for (let i = 0; i < seq.length; i++) {
        const mins = hmToMin(slots[slotIdx]) as number;
        const when = new Date(day.getTime());
        when.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
        out[seq[i]] = when;
        slotIdx++;
        if (slotIdx >= slots.length) { day.setDate(day.getDate() + 1); slotIdx = 0; }
    }
    return out;
}

export function fmtWhen(d: Date): string {
    if (!d) return '';
    const WEEK_KO = ['일', '월', '화', '수', '목', '금', '토'];
    const h = d.getHours();
    const ampm = h < 12 ? '오전' : '오후';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WEEK_KO[d.getDay()] + ') ' +
        ampm + ' ' + h12 + ':' + pad2(d.getMinutes());
}

export function fmtWhenCopy(d: Date): string {
    if (!d) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
        ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
