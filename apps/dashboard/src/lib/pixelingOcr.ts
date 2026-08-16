// PixelLab 영상 OCR 자동 매칭 (match.js captureFrames + matchCellByLangOcr 이식)
// Tesseract.js는 필요할 때만 CDN에서 동적으로 로드 (웹앱과 동일 방식)
import { langToOcrCode, titleSimilarity, type PixelingSource } from './pixeling';

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

let _tesseractPromise: Promise<any> | null = null;

export function loadTesseract(): Promise<any> {
    if (typeof (window as any).Tesseract !== 'undefined') {
        return Promise.resolve((window as any).Tesseract);
    }
    if (_tesseractPromise) return _tesseractPromise;
    _tesseractPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = TESSERACT_CDN;
        script.async = true;
        script.onload = () => {
            if ((window as any).Tesseract) resolve((window as any).Tesseract);
            else reject(new Error('Tesseract 로드 실패'));
        };
        script.onerror = () => reject(new Error('Tesseract CDN 로드 실패 (네트워크 확인 필요)'));
        document.head.appendChild(script);
    });
    return _tesseractPromise;
}

function clampRatio(r: number): number {
    r = +r;
    if (isNaN(r)) return 0.30;
    return Math.max(0.10, Math.min(0.80, r));
}

function preprocessContrast(ctx: CanvasRenderingContext2D, w: number, h: number) {
    try {
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) {
            sum += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
        }
        const mean = sum / (d.length / 4);
        const thr = mean;
        for (let j = 0; j < d.length; j += 4) {
            const gray = d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114;
            const v = gray < thr ? Math.max(0, gray - 40) : Math.min(255, gray + 40);
            d[j] = d[j + 1] = d[j + 2] = v;
        }
        ctx.putImageData(img, 0, 0);
    } catch (e) { /* CORS/미지원 시 무시 */ }
}

export interface CapturedFrames {
    thumbDataUrl: string;
    ocrDataUrl: string;
    cropDataUrl: string;
    ocrW: number;
    ocrH: number;
}

export function captureFrames(file: File, opt?: { topRatio?: number; seek?: number; thumbMaxH?: number }): Promise<CapturedFrames> {
    const topRatio = clampRatio(opt?.topRatio != null ? opt.topRatio : 0.30);
    const seekTime = opt?.seek != null ? opt.seek : 0.0;
    const thumbMaxH = opt?.thumbMaxH || 640;
    const thumbQuality = 0.72;

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.src = url;

        let settled = false;
        const cleanup = () => { try { URL.revokeObjectURL(url); } catch (e) {} };
        const fail = (err: Error) => { if (settled) return; settled = true; cleanup(); reject(err); };

        video.addEventListener('loadeddata', () => {
            try {
                const dur = video.duration || 0;
                let t = seekTime;
                if (t <= 0) t = Math.min(0.05, dur > 0.2 ? 0.05 : 0);
                video.currentTime = t;
            } catch (e) { grab(); }
        });
        video.addEventListener('seeked', grab);
        video.addEventListener('error', () => fail(new Error('영상을 읽을 수 없습니다')));

        function grab() {
            if (settled) return;
            const w = video.videoWidth, h = video.videoHeight;
            if (!w || !h) { fail(new Error('프레임 크기를 알 수 없습니다')); return; }

            const tScale = h > thumbMaxH ? (thumbMaxH / h) : 1;
            const tc = document.createElement('canvas');
            tc.width = Math.max(1, Math.round(w * tScale));
            tc.height = Math.max(1, Math.round(h * tScale));
            const tctx = tc.getContext('2d');
            if (tctx) tctx.drawImage(video, 0, 0, tc.width, tc.height);
            const thumbDataUrl = tc.toDataURL('image/jpeg', thumbQuality);

            const cropH = Math.max(1, Math.round(h * topRatio));
            const oScale = w < 900 ? (900 / w) : 1;
            const oc = document.createElement('canvas');
            oc.width = Math.round(w * oScale);
            oc.height = Math.round(cropH * oScale);
            const octx = oc.getContext('2d');
            if (!octx) { fail(new Error('canvas 2d context 지원 안 됨')); return; }
            octx.drawImage(video, 0, 0, w, cropH, 0, 0, oc.width, oc.height);
            const cropDataUrl = oc.toDataURL('image/jpeg', 0.75);

            preprocessContrast(octx, oc.width, oc.height);
            const ocrDataUrl = oc.toDataURL('image/png');

            settled = true;
            cleanup();
            resolve({ thumbDataUrl, ocrDataUrl, cropDataUrl, ocrW: oc.width, ocrH: oc.height });
        }

        setTimeout(() => fail(new Error('영상 로딩 시간 초과')), 15000);
    });
}

export function neededOcrCodes(sources: PixelingSource[]): string[] {
    const codes: Record<string, boolean> = {};
    (sources || []).forEach(src => {
        (src.metas || []).forEach(m => { codes[langToOcrCode(m.lang || '원본')] = true; });
    });
    return Object.keys(codes);
}

const _workers: Record<string, Promise<any> | undefined> = {};

function getWorker(code: string): Promise<any> {
    if (_workers[code]) return _workers[code] as Promise<any>;
    _workers[code] = loadTesseract().then((Tesseract: any) => Tesseract.createWorker(code));
    return _workers[code];
}

export interface OcrMatchResult {
    source: PixelingSource;
    lang: string;
    score: number;
    ocrByCode: Record<string, string>;
}

export function matchCellByLangOcr(ocrDataUrl: string, sources: PixelingSource[], onLangDone?: (code: string, text: string) => void): Promise<OcrMatchResult | null> {
    const codes = neededOcrCodes(sources);
    if (!codes.length) return Promise.resolve(null);

    const ocrByCode: Record<string, string> = {};
    let chain: Promise<any> = Promise.resolve();
    codes.forEach(code => {
        chain = chain.then(() => {
            return getWorker(code).then((worker: any) =>
                worker.recognize(ocrDataUrl).then((res: any) => {
                    const text = (res && res.data && res.data.text) ? res.data.text.trim() : '';
                    ocrByCode[code] = text || '';
                    if (onLangDone) { try { onLangDone(code, text || ''); } catch (e) {} }
                }, () => { ocrByCode[code] = ''; })
            );
        });
    });

    return chain.then(() => {
        let best: OcrMatchResult | null = null;
        let bestScore = 0;
        (sources || []).forEach(src => {
            (src.metas || []).forEach(m => {
                const lang = m.lang || '원본';
                const code = langToOcrCode(lang);
                const text = ocrByCode[code] || '';
                if (!text) return;
                const s = titleSimilarity(text, m.title || '');
                if (s > bestScore) {
                    bestScore = s;
                    best = { source: src, lang, score: s, ocrByCode };
                }
            });
        });
        return best;
    });
}

export function processVideoMulti(file: File, sources: PixelingSource[], opt?: { topRatio?: number }): Promise<{ thumb?: string; match: OcrMatchResult | null }> {
    return captureFrames(file, opt).then(r => {
        const thumb = r.thumbDataUrl;
        if (typeof (window as any).Tesseract === 'undefined') {
            return { thumb, match: null };
        }
        return matchCellByLangOcr(r.ocrDataUrl, sources).then(
            best => ({ thumb, match: best }),
            () => ({ thumb, match: null })
        );
    });
}
