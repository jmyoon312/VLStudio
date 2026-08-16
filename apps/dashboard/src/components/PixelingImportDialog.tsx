import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fetchWithRetry } from "@/lib/utils";
import {
    parseMetaText, matchByFileName, langToOcrCode, isJpLang, isBaseLang,
    todayDateValue, fmtWhen, fmtWhenCopy, hmToMin, computeScheduleBySeq,
    type ParsedPixeling, type PixelingSource, type ScheduleCfg
} from "@/lib/pixeling";
import { captureFrames, matchCellByLangOcr, loadTesseract } from "@/lib/pixelingOcr";
import {
    ChevronUp, ChevronDown, Copy, ClipboardCheck, Search, Loader2,
    FileText, Film, X, Upload, Sparkles, FileVideo, RotateCcw, CalendarDays,
    Rocket, Plus, Minus, Eraser, LinkIcon, CircleCheck, Link2Off, Clock4, Trash2, FolderOpen, Layers, Send
} from 'lucide-react';

interface Props {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    onSuccess?: () => void;
}

interface PoolVideo {
    id: string;
    name: string;
    path?: string;
    thumb?: string;
    file?: File;
    ocrByCode: Record<string, string>;
}

interface ScheduleLocal extends ScheduleCfg {
    channelName: string;
}

const SAMPLE_META = `저장일: 2026-08-13
소스 수: 2
메타 세트 수: 3

========================================
1. pixeling_1786243368629506400.mp4
소스 파일명: pixeling_1786243368629506400.mp4
포함 메타: 원본, 일본어
========================================
[원본] 추천 메타
언어: 원본
제목
재미있는 고양이 영상 모음
설명
고양이가 장난감과 노는 모습을 모았습니다.
태그
#cat #funny #고양이
대본
(대본 없음)
----------------------------------------
[일본어] 추천 메타
언어: 일본어
제목
面白い猫の動画まとめ
설명
猫がおもちゃと遊ぶ様子をまとめました。
태그
#猫 #面白い
대본
(대본 없음)

========================================
2. pixeling_1786244300000000000.mp4
소스 파일명: pixeling_1786244300000000000.mp4
포함 메타: 원본
========================================
[원본] 추천 메타
언어: 원본
제목
강아지 하루 루틴
설명
사랑스러운 강아지의 하루 루틴 영상입니다.
태그
#dog #puppy #반려견
대본
(대본 없음)`;

const vkey = (srcIdx: number, lang: string) => String(srcIdx) + '__' + (lang || '원본');

const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (_) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return true;
        } catch (_2) { return false; }
    }
};

const shorten = (s: string, n: number) => {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n) + '…' : s;
};

const LangBadge = ({ lang }: { lang: string }) => (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold ${isJpLang(lang)
        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
        : 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'}`}>{lang}</span>
);

export const PixelingImportDialog = ({ isOpen, setIsOpen, onSuccess }: Props) => {
    const { toast } = useToast();
    const textFileRef = useRef<HTMLInputElement>(null);
    const videoFileRef = useRef<HTMLInputElement>(null);
    const metaDrop = useRef<HTMLDivElement>(null);
    const videoDrop = useRef<HTMLDivElement>(null);
    const poolSeq = useRef(0);

    const [metaText, setMetaText] = useState('');
    const [parsed, setParsed] = useState<ParsedPixeling | null>(null);
    const [pool, setPool] = useState<Record<string, PoolVideo>>({});
    const [attachments, setAttachments] = useState<Record<string, string>>({});
    const [hidden, setHidden] = useState<Record<string, boolean>>({});
    const [order, setOrder] = useState<Record<string, number[]>>({});
    const [schedules, setSchedules] = useState<Record<string, ScheduleLocal>>({});
    const [topRatio, setTopRatio] = useState(30);
    const [search, setSearch] = useState('');
    const [langFilter, setLangFilter] = useState('__all');
    const [schedOpen, setSchedOpen] = useState(true);
    const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
    const [registering, setRegistering] = useState(false);
    const [sentKeys, setSentKeys] = useState<Record<string, boolean>>({});
    const [sendingKey, setSendingKey] = useState('');
    const [copied, setCopied] = useState('');
    const [uploadSettings, setUploadSettings] = useState({
        upload_method: 'BROWSER_AUTO',
        target_platforms: ['youtube'] as string[],
        channel_id: '',
        privacy: 'private',
        approval_required: false,
    });

    const attachRef = useRef<Record<string, string>>({});
    useEffect(() => { attachRef.current = attachments; }, [attachments]);

    const reset = () => {
        setMetaText(''); setParsed(null); setPool({}); setAttachments({});
        setHidden({}); setOrder({}); setSchedules({}); setSearch('');
        setLangFilter('__all'); setSchedOpen(true); setProgress(null); setCopied('');
        setSentKeys({}); setSendingKey('');
        attachRef.current = {};
    };

    // ---------- 언어 / 순서 ----------
    const langs = useMemo(() => {
        const set: string[] = [];
        (parsed?.sources || []).forEach(s => (s.metas || []).forEach(m => {
            const l = m.lang || '원본';
            if (set.indexOf(l) === -1) set.push(l);
        }));
        return set;
    }, [parsed]);

    const srcByIdx = useMemo(() => {
        const m: Record<number, PixelingSource> = {};
        (parsed?.sources || []).forEach(s => { m[s.index] = s; });
        return m;
    }, [parsed]);

    const langAllIndices = (lang: string) =>
        (parsed?.sources || []).filter(s => (s.metas || []).some(m => (m.lang || '원본') === lang)).map(s => s.index);

    const langOrderOf = (lang: string) => {
        const all = langAllIndices(lang);
        const ord = order[lang] || [];
        const result = ord.filter(i => all.includes(i));
        all.forEach(i => { if (result.indexOf(i) === -1) result.push(i); });
        return result;
    };

    const langSequence = (lang: string) => langOrderOf(lang).filter(i => !hidden[`${i}__${lang}`]);

    const hiddenOf = (lang: string) =>
        Object.keys(hidden).filter(k => k.endsWith('__' + lang)).map(k => parseInt(k, 10));

    const moveInSequence = (lang: string, idx: number, dir: number) => {
        const seq = langSequence(lang);
        const from = seq.indexOf(idx);
        if (from === -1) return;
        const to = from + dir;
        if (to < 0 || to >= seq.length) return;
        [seq[from], seq[to]] = [seq[to], seq[from]];
        setOrder(prev => ({ ...prev, [lang]: seq.concat(hiddenOf(lang)) }));
    };

    const foreignSeq = (lang: string) => {
        const foreign = langs.filter(l => !isBaseLang(l));
        const i = foreign.indexOf(lang);
        return i === -1 ? 0 : i + 1;
    };
    const displayNo = (srcIdx: number, lang: string) => isBaseLang(lang) ? String(srcIdx) : `${srcIdx}-${foreignSeq(lang)}`;

    // ---------- 스케줄 ----------
    const defaultSched = (): ScheduleLocal => ({ startDate: todayDateValue(), startSlotIndex: 0, slots: ['10:00', '17:00'], channelName: '' });

    const ensureSched = (lang: string): ScheduleLocal => {
        const c = schedules[lang] || defaultSched();
        if (!c.slots || !c.slots.length) c.slots = ['10:00'];
        if (typeof c.startSlotIndex !== 'number') c.startSlotIndex = 0;
        if (!c.startDate) c.startDate = todayDateValue();
        if (typeof c.channelName !== 'string') c.channelName = '';
        return c;
    };

    const updateSched = (lang: string, patch: Partial<ScheduleLocal>) =>
        setSchedules(prev => ({ ...prev, [lang]: { ...(prev[lang] || defaultSched()), ...patch } }));

    const setSlotCount = (lang: string, n: number) => {
        const cfg = ensureSched(lang);
        n = Math.max(1, Math.min(12, n | 0));
        const slots = [...cfg.slots];
        while (slots.length < n) {
            const last = slots[slots.length - 1];
            let next = '12:00';
            if (last) { const mm = hmToMin(last); if (mm != null) { const m2 = (mm + 60) % (24 * 60); next = String(Math.floor(m2 / 60)).padStart(2, '0') + ':' + String(m2 % 60).padStart(2, '0'); } }
            slots.push(next);
        }
        if (slots.length > n) slots.splice(n);
        updateSched(lang, { slots, startSlotIndex: Math.min(cfg.startSlotIndex, slots.length - 1) });
    };

    const schedMap = useMemo(() => {
        const m: Record<string, Record<number, Date>> = {};
        langs.forEach(l => { m[l] = computeScheduleBySeq(schedules[l], langSequence(l)); });
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schedules, langs, order, hidden, parsed]);

    const whenFor = (srcIdx: number, lang: string) => (schedMap[lang] || {})[srcIdx] || null;

    // ---------- 영상 풀 / 매칭 ----------
    const isVideoFile = (f: File) => /^video\//.test(f.type) || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(f.name);

    const cellTaken = (srcIdx: number, lang: string, poolId: string) => {
        const cur = attachRef.current[vkey(srcIdx, lang)];
        return !!cur && cur !== poolId;
    };
    const assignPool = (poolId: string, srcIdx: number, lang: string) => {
        const next = { ...attachRef.current };
        Object.keys(next).forEach(k => { if (next[k] === poolId) delete next[k]; });
        next[vkey(srcIdx, lang)] = poolId;
        attachRef.current = next;
        setAttachments(next);
    };
    const unassign = (srcIdx: number, lang: string) => {
        const next = { ...attachRef.current };
        delete next[vkey(srcIdx, lang)];
        attachRef.current = next;
        setAttachments(next);
    };
    const firstFreeLang = (src: PixelingSource, exceptPoolId: string) => {
        const ls = (src.metas || []).map(m => m.lang || '원본');
        if (!ls.length) ls.push('원본');
        for (let i = 0; i < ls.length; i++) if (!cellTaken(src.index, ls[i], exceptPoolId)) return ls[i];
        return ls[0];
    };
    const ocrCodeLabel = (code: string) => code === 'jpn' ? '일본어' : code === 'eng' ? '영어' : code === 'chi_sim' ? '중국어' : '한국어';
    const ocrTextForLang = (v: PoolVideo, lang: string) => v.ocrByCode[langToOcrCode(lang)] || '';
    const ocrTextAny = (v: PoolVideo) => Object.keys(v.ocrByCode || {}).map(k => v.ocrByCode[k]).find(Boolean) || '';

    const addFiles = async (files: FileList | null) => {
        if (!files || !files.length) return;
        if (!parsed) { toast({ variant: "destructive", title: "메타 필요", description: "먼저 추천 메타를 분석해 탭을 만들어 주세요" }); return; }
        const list = Array.from(files).filter(isVideoFile);
        if (!list.length) { toast({ variant: "destructive", title: "영상 인식 실패", description: "지원 형식: mp4/mov/webm/mkv/avi/m4v" }); return; }

        const items: PoolVideo[] = list.map(f => {
            const id = 'v' + (++poolSeq.current);
            return { id, name: f.name, path: (f as any).path ? String((f as any).path) : undefined, file: f, ocrByCode: {} };
        });
        setPool(prev => {
            const next = { ...prev };
            items.forEach(i => { next[i.id] = i; });
            return next;
        });

        // 순차 처리: ① 파일명(고유ID) 매칭 → 썸네일만 캡처 즉시 연결 (OCR 스킵)
        //           ② 실패한 영상만 언어별 OCR 매칭
        let autoName = 0, autoOcr = 0, manual = 0;
        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                setProgress({ label: `“${shorten(item.name, 18)}” 처리 중…`, done: i, total: items.length });
                const fn = matchByFileName(item.name, parsed.sources);
                if (fn) {
                    const lang = firstFreeLang(fn.source, item.id);
                    setProgress({ label: `“${shorten(item.name, 18)}” 파일명으로 매칭 · 첫 장면 캡처 중…`, done: i, total: items.length });
                    try {
                        const r = await captureFrames(item.file!, { seek: 0, topRatio: topRatio / 100, thumbMaxH: 320 });
                        item.thumb = r.thumbDataUrl;
                    } catch (_) { /* 캡처 실패해도 파일명이 확실하니 썸네일 없이 연결 */ }
                    assignPool(item.id, fn.source.index, lang);
                    autoName++;
                    setPool(prev => ({ ...prev }));
                    continue;
                }
                // OCR 경로
                try { await loadTesseract(); } catch (e: any) { manual++; setProgress(null); toast({ variant: "destructive", title: "OCR 라이브러리 로드 실패", description: e?.message || 'Tesseract 로드 실패' }); setPool(prev => ({ ...prev })); continue; }
                setProgress({ label: `“${shorten(item.name, 18)}” 상단 캡처·언어별 인식 중…`, done: i, total: items.length });
                const frames = await captureFrames(item.file!, { seek: 0, topRatio: topRatio / 100, thumbMaxH: 320 });
                item.thumb = frames.thumbDataUrl;
                const best = await matchCellByLangOcr(frames.ocrDataUrl, parsed.sources, (code) => {
                    setProgress({ label: `“${shorten(item.name, 18)}” ${ocrCodeLabel(code)} 인식 중…`, done: i, total: items.length });
                });
                if (best && best.score >= 0.5 && !cellTaken(best.source.index, best.lang, item.id)) {
                    assignPool(item.id, best.source.index, best.lang);
                    autoOcr++;
                } else { manual++; }
                setPool(prev => ({ ...prev }));
            }
        } finally {
            setProgress(null);
            const parts: string[] = [];
            if (autoName) parts.push('파일명 매칭 ' + autoName + '개');
            if (autoOcr) parts.push('OCR 매칭 ' + autoOcr + '개');
            if (manual) parts.push('확인 필요 ' + manual + '개(직접 연결)');
            toast({ title: "영상 처리 완료", description: parts.length ? parts.join(' · ') : '처리 완료' });
        }
    };

    const rematchExisting = async () => {
        const items = Object.keys(pool).map(k => pool[k]).filter(v => v && v.file);
        if (!items.length) { toast({ variant: "destructive", title: "다시 인식할 영상 없음", description: "먼저 영상을 추가해 주세요" }); return; }
        if (!parsed) return;
        try { await loadTesseract(); } catch (e: any) { toast({ variant: "destructive", title: "OCR 라이브러리 로드 실패", description: e?.message || 'Tesseract 로드 실패' }); return; }
        let matched = 0;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            setProgress({ label: `“${shorten(item.name, 18)}” ${ocrCodeLabel('kor')} 인식 중… (재인식)`, done: i, total: items.length });
            try {
                const frames = await captureFrames(item.file!, { seek: 0, topRatio: topRatio / 100, thumbMaxH: 320 });
                item.thumb = frames.thumbDataUrl;
                const best = await matchCellByLangOcr(frames.ocrDataUrl, parsed.sources, (code) => {
                    setProgress({ label: `“${shorten(item.name, 18)}” ${ocrCodeLabel(code)} 인식 중… (재인식)`, done: i, total: items.length });
                });
                if (best && best.score >= 0.5 && !cellTaken(best.source.index, best.lang, item.id)) {
                    assignPool(item.id, best.source.index, best.lang);
                    matched++;
                }
            } catch (_) { /* 영상 하나 실패해도 계속 */ }
            setPool(prev => ({ ...prev }));
        }
        setProgress(null);
        toast({ title: "재인식 완료", description: `${matched}개 새로 매칭됨` });
    };

    const doCopy = async (text: string, key: string) => {
        const ok = await copyToClipboard(text);
        if (ok) { setCopied(key); toast({ title: "복사됨" }); setTimeout(() => setCopied(c => c === key ? '' : c), 1400); }
        else toast({ variant: "destructive", title: "복사 실패" });
    };

    const getKoTitle = (src: PixelingSource) => {
        const ko = (src.metas || []).filter(m => isBaseLang(m.lang || '원본'))[0];
        return ko ? ko.title : ((src.metas[0] || {}).title || '');
    };

    const handleCopy = (kind: string, srcIdx: number, lang: string) => {
        const src = srcByIdx[srcIdx]; if (!src) return;
        const meta = (src.metas || []).filter(m => (m.lang || '원본') === lang)[0] || src.metas[0];
        if (!meta) return;
        if (kind === 'title-1' || kind === 'title-2' || kind === 'title-jp') doCopy(meta.title || '', `${srcIdx}__${lang}:${kind}`);
        else if (kind === 'title-ko') doCopy(getKoTitle(src) || '', `${srcIdx}__${lang}:${kind}`);
        else if (kind === 'desc') doCopy(meta.description || '', `${srcIdx}__${lang}:${kind}`);
        else if (kind === 'tags') doCopy(meta.tags || '', `${srcIdx}__${lang}:${kind}`);
        else if (kind === 'desctag') doCopy(((meta.description || '') + '\n\n' + (meta.tags || '')).trim(), `${srcIdx}__${lang}:${kind}`);
    };

    const metaOf = (src: PixelingSource, lang: string) => (src.metas || []).filter(m => (m.lang || '원본') === lang)[0] || null;

    const hiddenCells = useMemo(() => {
        const out: { srcIdx: number; lang: string; title: string }[] = [];
        langs.forEach(l => {
            langSequence_visible(l).forEach(() => { });
        });
        (parsed?.sources || []).forEach(s => {
            langs.forEach(l => {
                if (hidden[`${s.index}__${l}`]) {
                    const m = metaOf(s, l);
                    out.push({ srcIdx: s.index, lang: l, title: m?.title || getKoTitle(s) || ('#' + s.index) });
                }
            });
        });
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsed, langs, hidden]);

    function langSequence_visible(lang: string) { return langSequence(lang); }

    const visibleCells = useMemo(() => {
        if (!parsed) return [];
        const q = search.trim().toLowerCase();
        const cells: { source: PixelingSource; meta: any; lang: string; pos: number; total: number }[] = [];
        langs
            .filter(l => langFilter === '__all' || l === langFilter)
            .forEach(lang => {
                const seq = langSequence(lang);
                seq.forEach((idx, pos) => {
                    const src = srcByIdx[idx]; if (!src) return;
                    const meta = metaOf(src, lang); if (!meta) return;
                    if (q) {
                        const hay = `${meta.title} ${meta.description}`.toLowerCase();
                        if (hay.indexOf(q) === -1) return;
                    }
                    cells.push({ source: src, meta, lang, pos, total: seq.length });
                });
            });
        return cells;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsed, langs, search, langFilter, order, hidden]);

    const matchedCount = useMemo(() => {
        const set = new Set(Object.keys(attachments));
        return set.size;
    }, [attachments]);

    // ---------- 등록 ----------
    const sentSet = () => new Set(Object.keys(sentKeys).filter(k => sentKeys[k]));

    const buildRegisterItem = (idx: number, lang: string) => {
        if (!parsed) return null;
        const src = srcByIdx[idx]; if (!src) return null;
        const meta = metaOf(src, lang); if (!meta) return null;
        const video = pool[attachments[vkey(idx, lang)]];
        const when = whenFor(idx, lang);
        const tokens = (meta.tags || '').split(/[ ,]+/).filter(Boolean);
        return {
            title: meta.title,
            description: meta.description || '',
            hashtags: tokens.filter(t => t.startsWith('#')),
            tags: tokens.filter(t => !t.startsWith('#')),
            source_type: 'BULK_IMPORT',
            upload_method: uploadSettings.upload_method,
            target_platforms: uploadSettings.target_platforms,
            platform_configs: {
                youtube: { channel_id: uploadSettings.channel_id, privacy: uploadSettings.privacy }
            },
            scheduled_upload_time: when ? fmtWhenCopy(when).replace(' ', 'T') : null,
            source_external_id: `pixeling_${idx}_${langToOcrCode(lang)}`,
            source_metadata: {
                pixeling_source_index: idx,
                pixeling_lang: lang,
                source_file_name: src.fileName,
                video_file_path: video?.path || '',
                include_video: !!video,
                video_file_name: video?.name || '',
            },
        };
    };

    const buildRegisterItems = (skipKeys?: Set<string>) => {
        const items: any[] = [];
        if (!parsed) return items;
        langs.forEach(lang => {
            langSequence(lang).forEach(idx => {
                const key = vkey(idx, lang);
                if (skipKeys?.has(key)) return;
                const item = buildRegisterItem(idx, lang);
                if (item) items.push(item);
            });
        });
        return items;
    };

    const registerCount = useMemo(() => buildRegisterItems(sentSet()).length, [parsed, langs, order, hidden, schedules, pool, attachments, sentKeys]);

    // 공용 전송 파이프라인: bulk import → (영상 첨부) → (승인 불필요면 개별 finalize)
    const sendToQueue = async (items: any[]) => {
        const batchId = `pixeling_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const r1 = await fetchWithRetry('/api/work-queue/items/bulk/import', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, source_batch_id: batchId })
        });
        if (!r1.ok) throw new Error(((await r1.json().catch(() => ({}))) as any)?.detail || `Import 실패 (${r1.status})`);
        const res1 = await r1.json();

        const attachItems = items.filter(i => i.source_metadata.video_file_path).map(i => ({
            source_external_id: i.source_external_id,
            source_metadata: { video_file_path: i.source_metadata.video_file_path }
        }));
        let attached = 0;
        if (attachItems.length) {
            const r2 = await fetchWithRetry('/api/work-queue/batch/attach', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: attachItems, source_batch_id: batchId })
            });
            if (r2.ok) {
                const res2 = await r2.json();
                attached = (res2.results || []).filter((r: any) => r.status === 'attached').length;
            }
        }

        let finalized = 0;
        if (!uploadSettings.approval_required) {
            for (const it of res1.items || []) {
                if (!it.id) continue;
                const srcItem = items.find(i => i.source_external_id === it.external_id);
                if (!srcItem || !srcItem.source_metadata.video_file_path) continue;
                const r3 = await fetchWithRetry(`/api/work-queue/items/${it.id}/finalize`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ approval_required: false, scheduled_upload_time: srcItem.scheduled_upload_time || null })
                });
                if (r3.ok) finalized++;
            }
        }
        return { count: items.length, attached, finalized };
    };

    const handleRegisterAll = async () => {
        if (!parsed) return;
        const items = buildRegisterItems(sentSet());
        if (!items.length) { toast({ variant: "destructive", title: "보낼 항목 없음", description: "이미 보낸 카드를 제외한 항목이 있어야 합니다" }); return; }
        setRegistering(true);
        try {
            const r = await sendToQueue(items);
            toast({
                title: "전체 대기열 등록 완료",
                description: `${r.count}개 등록 · 영상 첨부 ${r.attached}개 · 즉시 등록 ${r.finalized}개${uploadSettings.approval_required ? ' · 승인 대기' : ''}`
            });
            setIsOpen(false);
            onSuccess?.();
            reset();
        } catch (e: any) {
            toast({ variant: "destructive", title: "등록 실패", description: e?.message || '서버 오류' });
        } finally { setRegistering(false); }
    };

    const handleRegisterCell = async (srcIdx: number, lang: string) => {
        if (!parsed) return;
        const key = vkey(srcIdx, lang);
        if (sentKeys[key]) return;
        const item = buildRegisterItem(srcIdx, lang);
        if (!item) return;
        setSendingKey(key);
        try {
            const r = await sendToQueue([item]);
            setSentKeys(prev => ({ ...prev, [key]: true }));
            toast({
                title: `대기열로 보냄 · ${displayNo(srcIdx, lang)} ${lang}`,
                description: `${r.attached ? '영상 첨부 ' + r.attached + '개' : '영상 미첨부'}${r.finalized ? ' · 즉시 등록' : ''}${uploadSettings.approval_required ? ' · 승인 대기' : ''}`
            });
        } catch (e: any) {
            toast({ variant: "destructive", title: "보내기 실패", description: e?.message || '서버 오류' });
        } finally { setSendingKey(''); }
    };

    // ---------- UI ----------
    const togglePlatform = (p: string) => {
        setUploadSettings(prev => ({
            ...prev,
            target_platforms: prev.target_platforms.includes(p)
                ? prev.target_platforms.filter(x => x !== p)
                : [...prev.target_platforms, p]
        }));
    };

    const DropZone = ({ inner, onFiles, accept, hint }: { inner: React.ReactNode; onFiles: (f: FileList) => void; accept?: string; hint?: string }) => {
        const [over, setOver] = useState(false);
        return (
            <div
                onDragOver={e => { e.preventDefault(); setOver(true); }}
                onDragEnter={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={e => { e.preventDefault(); setOver(false); }}
                onDrop={e => { e.preventDefault(); setOver(false); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
                className={`rounded-lg border-2 border-dashed p-4 transition-colors ${over ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-border bg-muted/30'}`}
            >
                {inner}
                {hint && <p className="text-[11px] text-muted-foreground mt-2">{hint}</p>}
            </div>
        );
    };

    const poolList = Object.values(pool);

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) reset(); }}>
            <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto bg-card text-foreground border-border p-0 gap-0">
                <DialogHeader className="px-6 pt-5 pb-0">
                    <DialogTitle className="flex items-center gap-2"><Film className="w-5 h-5 text-indigo-500" /> (사공) 수동 업로드 도우미</DialogTitle>
                    <DialogDescription>추천 메타 텍스트와 영상을 매칭해 제목·설명·태그를 한눈에 보고, 자동화 대기열로 등록합니다</DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 space-y-4">
                    {/* 헤더 상태바 */}
                    {parsed && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <div className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{parsed.sources.length}개 소스</span> · 영상 {Object.keys(pool).length}개 · 매칭 <span className="font-semibold text-emerald-600 dark:text-emerald-400">{matchedCount}개</span>
                                {parsed.savedAt && <span className="ml-2 text-xs text-muted-foreground">· {parsed.savedAt}</span>}
                            </div>
                            {parsed && <Badge variant="outline" className="text-xs">등록 대상 {registerCount}개</Badge>}
                        </div>
                    )}

                    {/* 1·2 입력 카드 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 1. 추천 메타 텍스트 */}
                        <Card className="border-border">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="font-bold text-sm">1. 추천 메타 텍스트</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">메타 텍스트를 붙여넣거나 <b>.txt 파일을 여기로 드래그</b>하세요.</p>
                                <DropZone inner={
                                    <Textarea
                                        value={metaText}
                                        onChange={e => setMetaText(e.target.value)}
                                        rows={10}
                                        placeholder={"여기에 '추천 메타 전부저장' 텍스트를 붙여넣으세요...\n또는 .txt 파일을 이 영역으로 드래그 앤 드롭"}
                                        className="bg-background border-border font-mono text-xs min-h-52"
                                    />
                                } onFiles={(files) => {
                                    const f = Array.from(files).find(x => x.type === 'text/plain' || /\.txt$/i.test(x.name));
                                    if (f) { f.text().then(t => { setMetaText(t); analyzeWith(t); }); }
                                    else toast({ variant: "destructive", title: ".txt 파일을 넣어주세요" });
                                }} />
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <Button variant="outline" size="sm" onClick={() => textFileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" /> 파일 선택</Button>
                                    <input ref={textFileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) f.text().then(t => { setMetaText(t); analyzeWith(t); }); e.target.value = ''; }} />
                                    <Button variant="ghost" size="sm" onClick={() => { setMetaText(SAMPLE_META); setParsed(null); }}>샘플 보기</Button>
                                    <div className="flex-1" />
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => analyzeWith(metaText)}><Sparkles className="w-4 h-4 mr-1" /> 분석하기</Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. 영상 매칭 */}
                        <Card className="border-border">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Film className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="font-bold text-sm">2. 영상 매칭 <span className="text-muted-foreground font-normal">(선택)</span></h3>
                                </div>
                                <p className="text-xs text-muted-foreground">영상을 드래그하면 <b>화면 속 제목을 자동 인식(OCR)</b>해 같은 제목의 카드에 연결합니다.</p>
                                <DropZone inner={
                                    <div className="text-center py-3">
                                        <FileVideo className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
                                        <p className="text-sm">영상 파일을 여기로 드래그<br /><span className="text-xs text-muted-foreground">여러 개 한꺼번에 가능 · 영상 속 제목으로 자동 매칭</span></p>
                                        <Button variant="outline" size="sm" className="mt-2" onClick={() => videoFileRef.current?.click()}><FolderOpen className="w-3.5 h-3.5 mr-1" /> 영상 선택</Button>
                                        <input ref={videoFileRef} type="file" accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                                    </div>
                                } onFiles={(files) => addFiles(files)} />
                                {/* 제목 읽는 영역(상단 높이) 조절 */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs"><span className="font-semibold">제목 읽는 영역</span> · 화면 <b>{topRatio}%</b> (위쪽)</span>
                                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={rematchExisting} disabled={!!progress}><RotateCcw className="w-3 h-3 mr-1" /> 다시 인식</Button>
                                    </div>
                                    <input
                                        type="range" min={10} max={80} step={5} value={topRatio}
                                        onChange={e => setTopRatio(parseInt(e.target.value, 10) || 30)}
                                        className="w-full accent-indigo-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground"><span>좁게(노이즈↓)</span><span>넓게</span></div>
                                    <p className="text-[11px] text-muted-foreground">제목은 <b>가로 전체 · 위에서부터 설정한 높이</b>만 읽습니다. 한국어·일본어·영어 카드는 <b>각 언어 전용 엔진으로 따로</b> 인식해 정확도를 높입니다.</p>
                                </div>
                                {progress && (
                                    <div className="rounded-md border border-border bg-muted/40 p-2 space-y-1">
                                        <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {progress.label} ({progress.done}/{progress.total})</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 툴바 */}
                    {parsed && (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-48">
                                <Search className="w-4 h-4 text-muted-foreground" />
                                <Input placeholder="제목·설명·파일명 검색..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 text-sm bg-background border-border" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground">언어</Label>
                                <Select value={langFilter} onValueChange={setLangFilter}>
                                    <SelectTrigger className="w-36 h-9 text-sm bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all">전체 표시</SelectItem>
                                        {langs.map(l => <SelectItem key={l} value={l}>{l}만</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* 예약 스케줄 */}
                    {parsed && (
                        <Card className="border-border">
                            <CardContent className="p-0">
                                <button
                                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors rounded-t-lg"
                                    onClick={() => setSchedOpen(v => !v)}
                                >
                                    <CalendarDays className="w-4 h-4 text-indigo-500" />
                                    <span className="font-bold text-sm">업로드 예약 시간표</span>
                                    <span className="text-xs text-muted-foreground hidden sm:inline">언어(채널)별로 시작 시각과 하루 업로드 시간을 정하면 순서대로 자동 배정</span>
                                    <span className={`ml-auto transition-transform ${schedOpen ? '' : '-rotate-90'}`}><ChevronDown className="w-3.5 h-3.5" /></span>
                                </button>
                                {schedOpen && (
                                    <div className="p-4 border-t border-border space-y-3">
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span><b>①</b> 하루에 몇 개 올릴지 → <b>②</b> 각 업로드 시간 → <b>③</b> 시작 날짜 → <b>④</b> 그날 어느 시간부터 시작할지 고르면, 그 시간부터 카드 1·2·3…번에 <b>따다다닥</b> 배정됩니다. 언어(채널)마다 따로 설정할 수 있어요.</span>
                                            <Button variant="outline" size="sm" className="h-6 text-xs ml-auto" onClick={() => {
                                                if (confirm('예약 시간표를 모두 초기화할까요? (텍스트·영상 연결은 유지)')) { setSchedules({}); toast({ title: "예약 시간표를 모두 초기화했습니다" }); }
                                            }}><Eraser className="w-3 h-3 mr-1" /> 예약 전체 초기화</Button>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            {langs.map(lang => {
                                                const cfg = ensureSched(lang);
                                                const count = langSequence(lang).length;
                                                return (
                                                    <div key={lang} className="rounded-lg border border-border p-3 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <LangBadge lang={lang} />
                                                            <span className="text-sm font-semibold">{lang} 채널</span>
                                                            <span className="text-xs text-muted-foreground ml-auto">영상 {count}개</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                placeholder={`예: 1채널 - ${lang} 메인`}
                                                                value={cfg.channelName}
                                                                onChange={e => updateSched(lang, { channelName: e.target.value })}
                                                                className="h-8 text-xs bg-background border-border"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <Label className="text-[11px]">① 하루 업로드 개수</Label>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setSlotCount(lang, cfg.slots.length - 1)}><Minus className="w-3 h-3" /></Button>
                                                                    <input type="number" min={1} max={12} value={cfg.slots.length} onChange={e => setSlotCount(lang, parseInt(e.target.value, 10) || 1)} className="h-7 w-12 rounded-md border border-input bg-background text-center text-sm" />
                                                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setSlotCount(lang, cfg.slots.length + 1)}><Plus className="w-3 h-3" /></Button>
                                                                    <span className="text-xs text-muted-foreground">개/일</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label className="text-[11px]">③ 시작 날짜</Label>
                                                                <Input type="date" value={cfg.startDate} onChange={e => updateSched(lang, { startDate: e.target.value })} className="h-8 text-xs bg-background border-border mt-1" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label className="text-[11px]">② 업로드 시간</Label>
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {cfg.slots.map((s, i) => (
                                                                    <div key={i} className="flex items-center gap-1">
                                                                        <Input type="time" value={s} onChange={e => {
                                                                            const slots = [...cfg.slots]; slots[i] = e.target.value; updateSched(lang, { slots });
                                                                        }} className="h-8 w-28 text-xs bg-background border-border" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label className="text-[11px]">④ 그날 시작 시간</Label>
                                                            <Select value={String(cfg.startSlotIndex)} onValueChange={v => updateSched(lang, { startSlotIndex: Number(v) })}>
                                                                <SelectTrigger className="h-8 text-xs bg-background border-border mt-1"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    {(cfg.slots || []).map((s, i) => <SelectItem key={i} value={String(i)}>{i + 1}번째 · {s}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* 복원바 */}
                    {hiddenCells.length > 0 && (
                        <div className="rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">삭제됨 {hiddenCells.length}개 <span className="font-normal">(화면에서 숨김 · 원문은 보존 · 누르면 되살림)</span></div>
                            <div className="flex flex-wrap gap-1.5">
                                {hiddenCells.map(hc => (
                                    <Button key={`${hc.srcIdx}__${hc.lang}`} variant="outline" size="sm" className="h-6 text-[11px] border-amber-300 text-amber-700 dark:text-amber-400"
                                        onClick={() => setHidden(prev => { const n = { ...prev }; delete n[vkey(hc.srcIdx, hc.lang)]; return n; })}>
                                        <RotateCcw className="w-3 h-3 mr-1" /> {displayNo(hc.srcIdx, hc.lang)} {hc.lang} {shorten(hc.title, 18)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 결과 카드 목록 */}
                    {parsed && (
                        visibleCells.length === 0 ? (
                            <div className="rounded-lg border-2 border-dashed border-border p-10 text-center">
                                <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {visibleCells.map(({ source, meta, lang, pos, total }) => {
                                    const key = vkey(source.index, lang);
                                    const vid = pool[attachments[key]];
                                    const sent = !!sentKeys[key];
                                    const hasThumb = !!(vid && vid.thumb);
                                    const when = whenFor(source.index, lang);
                                    const koTitle = getKoTitle(source);
                                    const isBase = isBaseLang(lang);
                                    const upDis = pos <= 0; const downDis = pos >= total - 1;
                                    return (
                                        <div key={key} className="rounded-lg border border-border bg-card overflow-hidden">
                                            {/* 헤더 */}
                                            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
                                                <div className="flex items-center gap-1">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={upDis} onClick={() => moveInSequence(lang, source.index, -1)}><ChevronUp className="w-3.5 h-3.5" /></Button>
                                                    <span className="text-xs font-semibold w-5 text-center">{pos + 1}</span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={downDis} onClick={() => moveInSequence(lang, source.index, 1)}><ChevronDown className="w-3.5 h-3.5" /></Button>
                                                </div>
                                                <span className="w-8 h-8 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">{displayNo(source.index, lang)}</span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <LangBadge lang={lang} />
                                                        <span className="text-sm font-semibold truncate">{shorten(koTitle || source.fileName, 60)}</span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground truncate">{source.fileName || ''}</div>
                                                </div>
                                                {hasThumb
                                                    ? <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CircleCheck className="w-3.5 h-3.5" /> 영상 매칭됨</span>
                                                    : <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground"><Link2Off className="w-3.5 h-3.5" /> 미매칭</span>}
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setHidden(prev => ({ ...prev, [key]: true }))} title="이 카드 삭제 (아래 복원바에서 되살릴 수 있음)"><Trash2 className="w-3.5 h-3.5" /></Button>
                                            </div>
                                            {/* 예약 시각 배지 */}
                                            {when && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50/70 dark:bg-cyan-950/30 border-b border-border">
                                                    <Clock4 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                                    <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">예약 · {fmtWhen(when)}</span>
                                                    <Button variant="ghost" size="sm" className="h-6 text-[11px] ml-auto" onClick={() => doCopy(fmtWhenCopy(when), `${key}:when`)}>
                                                        {copied === `${key}:when` ? <ClipboardCheck className="w-3 h-3 text-emerald-500 mr-1" /> : <Copy className="w-3 h-3 mr-1" />} 시각 복사
                                                    </Button>
                                                </div>
                                            )}
                                            {/* 본문 */}
                                            <div className="flex flex-col md:flex-row gap-3 p-3">
                                                {/* 썸네일 + 연결 목록 */}
                                                <div className="md:w-56 shrink-0 space-y-2">
                                                    {hasThumb
                                                        ? <img src={vid.thumb} alt="첫 장면" className="w-full aspect-video object-cover rounded-md border border-border bg-black" />
                                                        : <div className="w-full aspect-video rounded-md border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground gap-1">
                                                            <FileVideo className="w-5 h-5" />
                                                            <span className="text-xs">{lang} 영상 미연결</span>
                                                        </div>}
                                                    {hasThumb && <div className="text-[10px] text-muted-foreground truncate"><Film className="w-3 h-3 inline mr-1" />{vid.name}</div>}
                                                    {/* 연결할 영상 목록 (그림 클릭) */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-[11px] flex items-center gap-1"><LinkIcon className="w-3 h-3" /> 연결할 영상</Label>
                                                            {vid && <Button variant="ghost" size="sm" className="h-5 text-[10px] text-red-500 px-1" onClick={() => unassign(source.index, lang)}><X className="w-3 h-3 mr-0.5" /> 해제</Button>}
                                                        </div>
                                                        {poolList.length === 0 && <p className="text-[11px] text-muted-foreground">{lang} 영상을 드롭하면 여기서 <b>썸네일을 보고</b> 직접 고를 수 있어요</p>}
                                                        {poolList.length > 0 && (
                                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                                {poolList.map(v => {
                                                                    const isCur = attachments[key] === v.id;
                                                                    const oc = ocrTextForLang(v, lang) || ocrTextAny(v);
                                                                    return (
                                                                        <button
                                                                            key={v.id}
                                                                            onClick={() => isCur ? unassign(source.index, lang) : assignPool(v.id, source.index, lang)}
                                                                            className={`w-full flex items-center gap-2 rounded-md border p-1 text-left transition-colors ${isCur ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'border-border hover:bg-muted/50'}`}
                                                                            title={v.name}
                                                                        >
                                                                            {v.thumb
                                                                                ? <img src={v.thumb} alt="" className="w-12 h-8 object-cover rounded bg-black" />
                                                                                : <span className="w-12 h-8 rounded bg-muted flex items-center justify-center"><FileVideo className="w-3.5 h-3.5 text-muted-foreground" /></span>}
                                                                            <span className="min-w-0">
                                                                                <span className="block text-[11px] truncate">{shorten(v.name, 20)}</span>
                                                                                {oc && <span className="block text-[10px] text-muted-foreground truncate">“{shorten(oc, 18)}”</span>}
                                                                            </span>
                                                                            {isCur && <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">현재</span>}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* 메타 필드 */}
                                                <div className="flex-1 min-w-0 space-y-1.5">
                                                    {(isBase ? [
                                                        { label: '제목', kind: 'title-1', value: meta.title },
                                                        { label: '제목', kind: 'title-2', value: meta.title },
                                                    ] : [
                                                        { label: '제목 (한국어)', kind: 'title-ko', value: koTitle },
                                                        { label: `제목 (${lang})`, kind: 'title-jp', value: meta.title },
                                                    ]).map((f, i) => (
                                                        <div key={i} className="rounded-md border border-border bg-muted/20 p-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] text-muted-foreground">{f.label} <span className="text-[10px]">{(f.value || '').length}자</span></span>
                                                                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" disabled={!f.value} onClick={() => handleCopy(f.kind, source.index, lang)}>
                                                                    {copied === `${key}:${f.kind}` ? <ClipboardCheck className="w-3 h-3 text-emerald-500 mr-0.5" /> : <Copy className="w-3 h-3 mr-0.5" />} 복사
                                                                </Button>
                                                            </div>
                                                            <div className="text-sm font-semibold leading-snug">{f.value || '(내용 없음)'}</div>
                                                        </div>
                                                    ))}
                                                    <div className="rounded-md border border-border bg-muted/20 p-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] text-muted-foreground">설명 <span className="text-[10px]">{(meta.description || '').length}자</span></span>
                                                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" disabled={!meta.description} onClick={() => handleCopy('desc', source.index, lang)}>
                                                                {copied === `${key}:desc` ? <ClipboardCheck className="w-3 h-3 text-emerald-500 mr-0.5" /> : <Copy className="w-3 h-3 mr-0.5" />} 복사
                                                            </Button>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground whitespace-pre-line line-clamp-5">{meta.description || '(내용 없음)'}</div>
                                                    </div>
                                                    <div className="rounded-md border border-border bg-muted/20 p-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] text-muted-foreground">태그 <span className="text-[10px]">{(meta.tags || '').split(/\s+/).filter(Boolean).length}개</span></span>
                                                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" disabled={!meta.tags} onClick={() => handleCopy('tags', source.index, lang)}>
                                                                {copied === `${key}:tags` ? <ClipboardCheck className="w-3 h-3 text-emerald-500 mr-0.5" /> : <Copy className="w-3 h-3 mr-0.5" />} 복사
                                                            </Button>
                                                        </div>
                                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 flex flex-wrap gap-1">{meta.tags || '(내용 없음)'}</div>
                                                    </div>
                                                    <div className="flex justify-end pt-1">
                                                        <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => handleCopy('desctag', source.index, lang)}>
                                                            {copied === `${key}:desctag` ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Layers className="w-3.5 h-3.5 mr-1" />} 설명+태그 한번에 복사
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* 카드 푸터: 이 카드만 대기열로 보내기 */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-border bg-muted/30">
                                                <div className="text-[11px] text-muted-foreground min-w-0">
                                                    {vid
                                                        ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">영상 첨부됨</span>
                                                        : <span>영상 미첨부 — 첨부 없이도 대기열로 보낼 수 있어요</span>}
                                                    {when && <span className="ml-2">예약 {fmtWhenCopy(when)}</span>}
                                                    {!uploadSettings.target_platforms.includes('youtube') || uploadSettings.channel_id ? null
                                                        : <span className="ml-2 text-amber-600">채널 미선택</span>}
                                                </div>
                                                <Button
                                                    variant={sent ? "outline" : "secondary"}
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    disabled={!!sent || sendingKey === key}
                                                    onClick={() => handleRegisterCell(source.index, lang)}
                                                >
                                                    {sendingKey === key
                                                        ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                        : sent
                                                            ? <CircleCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                                                            : <Send className="w-3.5 h-3.5 mr-1" />}
                                                    {sendingKey === key ? '보내는 중...' : sent ? '보냄 ✓' : '대기열로 보내기'}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {/* 등록 설정 + 버튼 */}
                    {parsed && (
                        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                            <h3 className="font-bold text-sm flex items-center gap-2"><Rocket className="w-4 h-4 text-indigo-500" /> 대기열 등록 설정</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <Label>업로드 방식</Label>
                                    <Select value={uploadSettings.upload_method} onValueChange={v => setUploadSettings(prev => ({ ...prev, upload_method: v }))}>
                                        <SelectTrigger className="bg-background border-border mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="API">Google API</SelectItem>
                                            <SelectItem value="BROWSER_AUTO">브라우저 자동화</SelectItem>
                                            <SelectItem value="MANUAL">수동</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>대상 플랫폼</Label>
                                    <div className="flex gap-3 mt-2">
                                        {['youtube', 'tiktok', 'instagram'].map(p => (
                                            <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                                                <Checkbox checked={uploadSettings.target_platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                                                <span className="capitalize text-sm">{p}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {uploadSettings.target_platforms.includes('youtube') && (
                                    <div>
                                        <Label>YouTube 채널 *</Label>
                                        <ChannelPicker channelId={uploadSettings.channel_id} onChange={v => setUploadSettings(prev => ({ ...prev, channel_id: v }))} />
                                    </div>
                                )}
                                {uploadSettings.target_platforms.includes('youtube') && (
                                    <div>
                                        <Label>공개 설정</Label>
                                        <Select value={uploadSettings.privacy} onValueChange={v => setUploadSettings(prev => ({ ...prev, privacy: v }))}>
                                            <SelectTrigger className="bg-background border-border mt-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="public">공개</SelectItem>
                                                <SelectItem value="unlisted">미등록</SelectItem>
                                                <SelectItem value="private">비공개</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={uploadSettings.approval_required} onCheckedChange={c => setUploadSettings(prev => ({ ...prev, approval_required: !!c }))} />
                                <Label className="cursor-pointer text-sm">승인 필요 (체크 시 즉시 등록하지 않고 승인 대기로 남김)</Label>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                    등록 대상 <b className="text-foreground">{registerCount}개</b> · 영상 첨부 <b className="text-emerald-600 dark:text-emerald-400">{matchedCount}개</b>
                                    {langs.length > 0 && uploadSettings.target_platforms.includes('youtube') && !uploadSettings.channel_id && <span className="text-amber-600 ml-2">채널을 선택하세요</span>}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
                                    <Button onClick={handleRegisterAll} disabled={registering || registerCount === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                                        {registering ? '보내는 중...' : `전체 대기열로 보내기 (${registerCount})`}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );

    function analyzeWith(text: string) {
        if (!text || !text.trim()) { toast({ variant: "destructive", title: "붙여넣은 텍스트가 없습니다" }); return; }
        const p = parseMetaText(text);
        if (!p.sources.length) { toast({ variant: "destructive", title: "형식을 인식하지 못했습니다", description: "예시 보기를 참고하세요" }); return; }
        setParsed(p);
        setHidden({});
        setOrder({});
        setSchedules({});
        setSearch('');
        setLangFilter('__all');
        setSentKeys({});
        setSendingKey('');
        toast({ title: `새 탭 생성 · ${p.sources.length}개 영상 메타` });
    }
};

const ChannelPicker = ({ channelId, onChange }: { channelId: string; onChange: (v: string) => void }) => {
    const { toast } = useToast();
    const [channels, setChannels] = useState<any[]>([]);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await fetchWithRetry('/api/youtube/all');
                if (!r.ok) throw new Error();
                const data = await r.json();
                const list = Array.isArray(data) ? data : [];
                if (!alive) return;
                setChannels(list);
                if (!channelId && list.length > 0) onChange(list[0].channel_id);
            } catch (_) { if (alive) { setChannels([]); toast({ variant: "destructive", title: "채널 로드 실패" }); } }
        })();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <Select value={channelId} onValueChange={onChange} disabled={channels.length === 0}>
            <SelectTrigger className="bg-background border-border mt-1"><SelectValue placeholder={channels.length ? "채널 선택" : "연결된 채널 없음"} /></SelectTrigger>
            <SelectContent>
                {channels.map(ch => <SelectItem key={ch.channel_id} value={ch.channel_id}>{ch.channel_name || ch.title} ({ch.subscriber_count?.toLocaleString()}명)</SelectItem>)}
            </SelectContent>
        </Select>
    );
};

export default PixelingImportDialog;
