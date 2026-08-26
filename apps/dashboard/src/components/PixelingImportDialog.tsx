import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
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
    Rocket, Plus, Minus, Eraser, LinkIcon, CircleCheck, Link2Off, Clock4, Trash2, FolderOpen, Layers, Send,
    AlertTriangle, Zap, CheckCircle2, Globe2, Clock, Check, Play, Eye, Layers3
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
    blobUrl?: string;
    file?: File;
    ocrByCode: Record<string, string>;
}

interface ScheduleLocal extends ScheduleCfg {
    customChannelName?: string;
    targetPlatforms: string[];
    uploadMethod: string;
    approvalRequired: boolean;
    channelId: string;
    privacy: string;
    tiktokAccountId?: string;
    tiktokPrivacy?: string;
    instagramAccountId?: string;
}

interface StoredPreset {
    customChannelName?: string;
    targetPlatforms?: string[];
    uploadMethod?: string;
    approvalRequired?: boolean;
    channelId?: string;
    privacy?: string;
    tiktokAccountId?: string;
    tiktokPrivacy?: string;
    instagramAccountId?: string;
}

const PRESET_STORAGE_KEY = 'vl_pixeling_channel_presets_v5';
const getStoredChannelPresets = (): Record<string, StoredPreset> => {
    try {
        const s = localStorage.getItem(PRESET_STORAGE_KEY);
        return s ? JSON.parse(s) : {};
    } catch (_) { return {}; }
};
const saveStoredChannelPreset = (lang: string, patch: Partial<StoredPreset>) => {
    try {
        const p = getStoredChannelPresets();
        p[lang] = { ...(p[lang] || {}), ...patch };
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(p));
    } catch (_) { }
};

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

#cat #funny #고양이
태그
cat, funny, 고양이
대본
(대본 없음)
----------------------------------------
[일본어] 추천 메타
언어: 일본어
제목
面白い猫の動画まとめ
설명
猫がおもちゃと遊ぶ様子をまとめました。

#猫 #面白い
태그
猫, 面白い
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

#dog #puppy #반려견
태그
dog, puppy, 반려견
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

// 태그를 해시태그 형태(#tag)와 순수 키워드 형태(tag)로 파싱
const getTagKeywords = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) {
        return tags.map(t => String(t).replace(/^#+/, '').trim()).filter(Boolean);
    }
    if (typeof tags === 'string') {
        return tags.split(/[,#\s\n]+/).map(t => t.replace(/^#+/, '').trim()).filter(Boolean);
    }
    return [];
};

const getHashtagsString = (tags: any): string => {
    const list = getTagKeywords(tags);
    if (!list.length) return '';
    return list.map(t => `#${t}`).join(' ');
};

// 설명에 해시태그가 없으면 자동으로 붙여서 반환
const getCombinedDescription = (description: string, tags: any): string => {
    const desc = String(description || '').trim();
    const hashStr = getHashtagsString(tags);
    if (!hashStr) return desc;
    if (desc.includes(hashStr)) return desc;
    return desc ? `${desc}\n\n${hashStr}` : hashStr;
};

const LangBadge = ({ lang }: { lang: string }) => (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold ${isJpLang(lang)
        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
        : isBaseLang(lang)
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'}`}>{lang}</span>
);

// 슬림 컴팩트 9:16 쇼츠 썸네일 & 호버 플레이어 (135px 고정 폭)
const VideoPreviewBox = ({ vid, lang }: { vid?: PoolVideo; lang: string }) => {
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    if (!vid) {
        return (
            <div className="rounded-lg border-2 border-dashed border-border/80 aspect-[9/16] w-[135px] flex flex-col items-center justify-center p-2 text-center bg-muted/10 shrink-0">
                <FileVideo className="w-6 h-6 text-muted-foreground mb-1 opacity-60" />
                <span className="text-[11px] text-muted-foreground font-medium">{lang} 미연결</span>
                <span className="text-[9px] text-muted-foreground/70 mt-0.5">9:16 Shorts</span>
            </div>
        );
    }

    return (
        <div
            className="rounded-lg overflow-hidden border border-border/80 bg-black aspect-[9/16] w-[135px] relative group cursor-pointer shadow-xs shrink-0"
            onMouseEnter={() => {
                setIsHovered(true);
                if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().catch(() => {});
                }
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                if (videoRef.current) {
                    videoRef.current.pause();
                }
            }}
        >
            {/* 1. 쇼츠 9:16 썸네일 이미지 */}
            {vid.thumb ? (
                <img
                    src={vid.thumb}
                    alt=""
                    className={`w-full h-full object-cover transition-opacity duration-200 ${isHovered && vid.blobUrl ? 'opacity-0' : 'opacity-100'}`}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                    <Film className="w-6 h-6 opacity-60" />
                </div>
            )}

            {/* 2. 마우스 호버 시 9:16 쇼츠 비디오 재생 */}
            {vid.blobUrl && (
                <video
                    ref={videoRef}
                    src={vid.blobUrl}
                    muted
                    loop
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                />
            )}

            {/* 상단 9:16 쇼츠 뱃지 */}
            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs rounded px-1 py-0.2 text-[8px] font-bold text-white tracking-wider">
                SHORTS
            </div>

            {/* 하단 호버 안내 뱃지 */}
            <div className={`absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs rounded px-1 py-0.5 text-[9px] text-white flex items-center gap-0.5 transition-opacity ${isHovered ? 'opacity-0' : 'opacity-85'}`}>
                <Play className="w-2 h-2 fill-white" /> 재생
            </div>
        </div>
    );
};

export const PixelingImportDialog = ({ isOpen, setIsOpen, onSuccess }: Props) => {
    const { toast } = useToast();

    const textFileRef = useRef<HTMLInputElement>(null);
    const videoFileRef = useRef<HTMLInputElement>(null);
    const cardVideoFileRef = useRef<{ [key: string]: HTMLInputElement | null }>({});
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

    // 플랫폼별 채널/계정 목록
    const [channelList, setChannelList] = useState<any[]>([]);
    const [tiktokChannels, setTiktokChannels] = useState<any[]>([]);
    const [instagramChannels, setInstagramChannels] = useState<any[]>([]);

    const poolRef = useRef<Record<string, PoolVideo>>({});
    useEffect(() => { poolRef.current = pool; }, [pool]);

    const attachRef = useRef<Record<string, string>>({});
    useEffect(() => { attachRef.current = attachments; }, [attachments]);

    // 채널 데이터 로드
    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        (async () => {
            try {
                const [rCh, rTk, rIg] = await Promise.all([
                    fetchWithRetry('/api/youtube/all'),
                    fetchWithRetry('/api/tiktok-channels/'),
                    fetchWithRetry('/api/instagram-channels/')
                ]);
                if (!alive) return;
                if (rCh.ok) {
                    const data = await rCh.json();
                    setChannelList(Array.isArray(data) ? data : []);
                }
                if (rTk.ok) {
                    const data = await rTk.json();
                    setTiktokChannels(Array.isArray(data) ? data : []);
                }
                if (rIg.ok) {
                    const data = await rIg.json();
                    setInstagramChannels(Array.isArray(data) ? data : []);
                }
            } catch (_) { }
        })();
        return () => { alive = false; };
    }, [isOpen]);

    // 딸깍 스튜디오에서 전송된 메타 텍스트 자동 수신
    const hasAnalyzedRef = useRef(false);
    useEffect(() => {
        if (!isOpen) {
            hasAnalyzedRef.current = false;
            return;
        }
        if (hasAnalyzedRef.current) return;
        try {
            const pending = sessionStorage.getItem('pending_pixeling_meta');
            if (pending && pending.trim()) {
                hasAnalyzedRef.current = true;
                sessionStorage.removeItem('pending_pixeling_meta');
                setMetaText(pending);
                setTimeout(() => {
                    analyzeWith(pending);
                }, 50);
            }
        } catch (_) {}
    }, [isOpen]);

    const reset = () => {
        setMetaText(''); setParsed(null); setPool({}); setAttachments({});
        setHidden({}); setOrder({}); setSchedules({}); setSearch('');
        setLangFilter('__all'); setSchedOpen(true); setProgress(null);
        setSentKeys({}); setSendingKey('');
        attachRef.current = {};
        poolRef.current = {};
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

    const getOrder = useCallback((lang: string): number[] => {
        if (!parsed) return [];
        if (order[lang]) return order[lang];
        const arr = (parsed.sources || [])
            .filter(s => (s.metas || []).some(m => (m.lang || '원본') === lang))
            .map(s => s.index);
        return arr;
    }, [parsed, order]);

    const moveOrder = (lang: string, srcIdx: number, delta: number) => {
        const cur = [...getOrder(lang)];
        const pos = cur.indexOf(srcIdx);
        if (pos === -1) return;
        const target = pos + delta;
        if (target < 0 || target >= cur.length) return;
        const tmp = cur[pos];
        cur[pos] = cur[target];
        cur[target] = tmp;
        setOrder(prev => ({ ...prev, [lang]: cur }));
    };

    const ensureSched = useCallback((lang: string): ScheduleLocal => {
        if (schedules[lang]) return schedules[lang];
        const saved = getStoredChannelPresets()[lang] || {};
        const base: ScheduleLocal = {
            dailyCount: 2,
            startDate: todayDateValue(),
            slots: ['10:00', '17:00'],
            startSlotIdx: 0,
            intervalDays: 1,
            customChannelName: saved.customChannelName || `1채널 - ${lang} 메인`,
            targetPlatforms: saved.targetPlatforms || ['youtube'],
            uploadMethod: saved.uploadMethod || 'BROWSER_AUTO',
            approvalRequired: saved.approvalRequired ?? false,
            channelId: saved.channelId || (channelList[0]?.channel_id || ''),
            privacy: saved.privacy || 'private',
            tiktokAccountId: saved.tiktokAccountId || (tiktokChannels[0]?.id || ''),
            tiktokPrivacy: saved.tiktokPrivacy || 'SELF_ONLY',
            instagramAccountId: saved.instagramAccountId || (instagramChannels[0]?.id || ''),
        };
        return base;
    }, [schedules, channelList, tiktokChannels, instagramChannels]);

    const updateSched = (lang: string, patch: Partial<ScheduleLocal>) => {
        setSchedules(prev => {
            const cur = prev[lang] || ensureSched(lang);
            const next = { ...cur, ...patch };
            saveStoredChannelPreset(lang, {
                customChannelName: next.customChannelName,
                targetPlatforms: next.targetPlatforms,
                uploadMethod: next.uploadMethod,
                approvalRequired: next.approvalRequired,
                channelId: next.channelId,
                privacy: next.privacy,
                tiktokAccountId: next.tiktokAccountId,
                tiktokPrivacy: next.tiktokPrivacy,
                instagramAccountId: next.instagramAccountId,
            });
            return { ...prev, [lang]: next };
        });
    };

    const schedMap = useMemo(() => {
        const out: Record<string, Record<number, Date>> = {};
        langs.forEach(lang => {
            const seq = getOrder(lang).filter(idx => !hidden[vkey(idx, lang)]);
            out[lang] = computeScheduleBySeq(ensureSched(lang), seq);
        });
        return out;
    }, [langs, getOrder, hidden, ensureSched]);

    // ---------- 영상 첨부 / OCR 매칭 ----------
    const autoMatchOne = useCallback(async (v: PoolVideo, currentSources: PixelingSource[], currentLangs: string[]) => {
        // 1. 파일명 매칭 (모든 언어 버전 카드에 매칭)
        const byFile = matchByFileName(v.name, currentSources);
        if (byFile) {
            for (const meta of byFile.source.metas || []) {
                const lang = meta.lang || '원본';
                const k = vkey(byFile.source.index, lang);
                attachRef.current[k] = v.id;
                setAttachments(prev => ({ ...prev, [k]: v.id }));
            }
            return;
        }

        // 2. OCR 매칭
        for (const lang of currentLangs) {
            const code = langToOcrCode(lang);
            const ocrText = v.ocrByCode[code] || v.ocrByCode['kor'] || v.ocrByCode['eng'] || '';
            if (!ocrText) continue;
            const res = matchCellByLangOcr(ocrText, lang, currentSources);
            if (res) {
                const k = vkey(res.source.index, lang);
                attachRef.current[k] = v.id;
                setAttachments(prev => ({ ...prev, [k]: v.id }));
                return;
            }
        }
    }, []);

    const analyzeWith = useCallback(async (text: string) => {
        if (!text || !text.trim()) {
            toast({ variant: "destructive", title: "붙여넣은 텍스트가 없습니다" });
            return;
        }
        try {
            const p = parseMetaText(text);
            if (!p || !p.sources || !p.sources.length) {
                toast({ variant: "destructive", title: "형식을 인식하지 못했습니다", description: "예시 보기를 참고하세요" });
                return;
            }
            setParsed(p);
            setHidden({});
            setOrder({});
            setSchedules({});
            setSearch('');
            setLangFilter('__all');
            setSentKeys({});
            setSendingKey('');

            // 분석 시 기존에 등록된 pool 영상들과 즉시 매칭 수행!
            const currentPoolVideos = Object.values(poolRef.current);
            if (currentPoolVideos.length > 0) {
                const langList: string[] = [];
                p.sources.forEach(s => s.metas.forEach(m => {
                    const l = m.lang || '원본';
                    if (!langList.includes(l)) langList.push(l);
                }));
                for (const v of currentPoolVideos) {
                    await autoMatchOne(v, p.sources, langList);
                }
            }

            toast({ title: `${p.sources.length}개 소스 영상 메타가 분석되었습니다.` });
        } catch (e) {
            console.error('Failed to parse meta text:', e);
        }
    }, [toast, autoMatchOne]);

    const addFiles = async (files: FileList | File[], targetKey?: string) => {
        const fileArr = Array.from(files).filter(f => /video|mp4|mov|webm|mkv|avi|m4v/i.test(f.type) || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(f.name));
        if (!fileArr.length) {
            toast({ variant: "destructive", title: "영상 파일이 없습니다" });
            return;
        }

        const newPool: Record<string, PoolVideo> = {};
        const created: PoolVideo[] = [];

        for (const file of fileArr) {
            poolSeq.current += 1;
            const id = 'v_' + poolSeq.current + '_' + Math.random().toString(36).slice(2, 7);
            let blobUrl = '';
            try {
                blobUrl = URL.createObjectURL(file);
            } catch (_) {}

            const pv: PoolVideo = {
                id,
                name: file.name,
                path: (file as any).path || '',
                blobUrl,
                file,
                ocrByCode: {},
            };
            newPool[id] = pv;
            created.push(pv);
        }

        setPool(prev => {
            const next = { ...prev, ...newPool };
            poolRef.current = next;
            return next;
        });

        if (targetKey && created.length > 0) {
            attachRef.current[targetKey] = created[0].id;
            setAttachments(prev => ({ ...prev, [targetKey]: created[0].id }));
            toast({ title: "영상이 카드에 연결되었습니다", description: created[0].name });
        } else {
            toast({ title: `${created.length}개 영상 추가됨`, description: "썸네일 추출 및 영상 매칭을 진행합니다..." });
        }

        // 프레임 캡처 및 OCR & 자동 매칭
        for (const v of created) {
            if (v.file) {
                try {
                    const frames = await captureFrames(v.file, { topRatio: topRatio / 100, seek: 0.3 });
                    if (frames?.thumbDataUrl) {
                        v.thumb = frames.thumbDataUrl;
                        setPool(prev => {
                            const next = { ...prev, [v.id]: { ...v, thumb: frames.thumbDataUrl } };
                            poolRef.current = next;
                            return next;
                        });
                    }
                } catch (e) {
                    console.error("Frame capture error:", e);
                }
            }
            if (!targetKey && parsed?.sources) {
                await autoMatchOne(v, parsed.sources, langs);
            }
        }
    };

    const rematchExisting = async () => {
        if (!parsed?.sources) return;
        const list = Object.values(pool);
        for (const v of list) {
            await autoMatchOne(v, parsed.sources, langs);
        }
        toast({ title: "영상 재매칭 완료" });
    };

    const assignPool = (vidId: string, srcIdx: number, lang: string) => {
        const k = vkey(srcIdx, lang);
        setAttachments(prev => {
            const next = { ...prev };
            if (!vidId || vidId === '__none') {
                delete next[k];
                delete attachRef.current[k];
            } else {
                next[k] = vidId;
                attachRef.current[k] = vidId;
            }
            return next;
        });
    };

    const unassign = (srcIdx: number, lang: string) => {
        const k = vkey(srcIdx, lang);
        setAttachments(prev => {
            const next = { ...prev };
            delete next[k];
            delete attachRef.current[k];
            return next;
        });
    };

    // ---------- 단일/일괄 대기열 등록 (백엔드 스키마 완벽 일치 & 에러 방지) ----------
    const buildItemPayload = (source: PixelingSource, lang: string) => {
        const meta = source.metas?.find(m => (m.lang || '원본') === lang) || source.metas?.[0];
        if (!meta) return null;

        const k = vkey(source.index, lang);
        const sched = ensureSched(lang);
        const vidId = attachments[k];
        const vid = vidId ? pool[vidId] : null;
        const when = schedMap[lang]?.[source.index];

        const rawTags = getTagKeywords(meta.tags);
        const hashTagsList = rawTags.map(t => `#${t}`);
        const fullDesc = getCombinedDescription(meta.description || '', meta.tags);
        
        let videoPath = vid?.path || (vid?.file as any)?.path || '';

        let scheduledTimeStr: string | null = null;
        if (when) {
            const pad = (n: number) => String(n).padStart(2, '0');
            scheduledTimeStr = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}:00`;
        }

        const platformConfigs: any = {
            youtube: {
                channel_id: sched.channelId || '',
                privacy: sched.privacy || 'private',
                category: '22',
                made_for_kids: false,
                headless_mode: true
            },
            tiktok: {
                account_id: sched.tiktokAccountId || '',
                privacy: sched.tiktokPrivacy || 'SELF_ONLY',
                allow_comments: true,
                allow_duet: true
            },
            instagram: {
                account_id: sched.instagramAccountId || '',
                caption: fullDesc,
                share_to_feed: false
            }
        };

        return {
            key: k,
            title: meta.title || source.fileName || source.sourceName || '제목 없음',
            description: fullDesc,
            tags: rawTags,
            hashtags: hashTagsList,
            source_external_id: source.fileName || source.sourceName || `pixeling_${source.index}`,
            source_type: 'MANUAL',
            video_file_path: videoPath || '',
            video_path: videoPath || '',
            video_filename: vid?.name || source.fileName || source.sourceName || '',
            thumbnail_url: vid?.thumb || '',
            target_platforms: sched.targetPlatforms || ['youtube'],
            platform_configs: platformConfigs,
            upload_method: sched.uploadMethod || 'BROWSER_AUTO',
            approval_required: !!sched.approvalRequired,
            scheduled_upload_time: scheduledTimeStr,
            source_batch_id: parsed?.savedAt ? `pixeling_${parsed.savedAt.replace(/[^0-9]/g, '')}` : `pixeling_${Date.now()}`
        };
    };

    const sendPayloadToQueue = async (itemPayload: any) => {
        const hasVideo = !!itemPayload.video_file_path?.trim();
        const endpoint = hasVideo ? '/api/work-queue/items' : '/api/work-queue/items/draft';

        try {
            const res = await fetchWithRetry(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemPayload)
            });

            if (res.ok) return true;

            // 만약 영상 첨부된 채로 /api/work-queue/items 가 실패할 경우 draft 엔드포인트로 fallback
            if (hasVideo) {
                const fallbackRes = await fetchWithRetry('/api/work-queue/items/draft', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemPayload)
                });
                if (fallbackRes.ok) return true;
            }

            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.detail || (Array.isArray(errJson.detail) ? errJson.detail[0]?.msg : '등록 오류'));
        } catch (e: any) {
            throw e;
        }
    };

    const ensureVideoUploaded = async (vid: PoolVideo): Promise<string> => {
        // 이미 서버에 업로드된 경로인지 확인
        if (vid.path && (vid.path.includes('uploads') || vid.path.includes('work_queue') || (window as any).electronAPI)) {
            return vid.path;
        }
        if (!vid.file) return vid.path || '';

        const formData = new FormData();
        formData.append('file', vid.file);

        const uploadPromise = new Promise<{ server_file_path: string; file_name: string }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/work-queue/upload');

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data);
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    let msg = `서버 응답 오류 (${xhr.status})`;
                    try {
                        const errObj = JSON.parse(xhr.responseText);
                        msg = errObj.detail || msg;
                    } catch (_) {}
                    reject(new Error(msg));
                }
            };
            xhr.onerror = () => reject(new Error('네트워크 연결 끊김으로 영상 서버 전송 실패'));
            xhr.send(formData);
        });

        const data = await uploadPromise;
        vid.path = data.server_file_path;
        setPool(prev => ({
            ...prev,
            [vid.id]: { ...prev[vid.id], path: data.server_file_path }
        }));
        poolRef.current[vid.id] = { ...poolRef.current[vid.id], path: data.server_file_path };
        return data.server_file_path;
    };

    const handleRegisterSingle = async (source: PixelingSource, lang: string) => {
        const k = vkey(source.index, lang);
        const vidId = attachments[k];
        const vid = vidId ? pool[vidId] : null;

        setSendingKey(k);
        try {
            if (vid && vid.file) {
                await ensureVideoUploaded(vid);
            }

            const payload = buildItemPayload(source, lang);
            if (!payload) {
                toast({ variant: "destructive", title: "메타 정보를 찾을 수 없습니다" });
                return;
            }

            await sendPayloadToQueue(payload);
            setSentKeys(prev => ({ ...prev, [payload.key]: true }));
            toast({ title: `[${lang}] 대기열 등록 완료`, description: payload.title });
        } catch (e: any) {
            console.error("Register single error:", e);
            toast({ variant: "destructive", title: "등록 실패", description: e?.message || "서버 오류" });
        } finally {
            setSendingKey('');
        }
    };

    const handleRegisterAll = async () => {
        if (!parsed?.sources?.length) return;
        setRegistering(true);

        try {
            // 1. 필요한 모든 미업로드 영상을 먼저 서버로 업로드
            const neededVideos: PoolVideo[] = [];
            langs.forEach(lang => {
                const seq = getOrder(lang);
                seq.forEach(srcIdx => {
                    const k = vkey(srcIdx, lang);
                    if (hidden[k] || sentKeys[k]) return;
                    const vidId = attachments[k];
                    const vid = vidId ? pool[vidId] : null;
                    if (vid && vid.file && !neededVideos.some(v => v.id === vid.id)) {
                        neededVideos.push(vid);
                    }
                });
            });

            for (const v of neededVideos) {
                await ensureVideoUploaded(v);
            }

            // 2. 항목 페이로드 구성 및 전송
            const itemsToRegister: any[] = [];
            langs.forEach(lang => {
                const seq = getOrder(lang);
                seq.forEach(srcIdx => {
                    const k = vkey(srcIdx, lang);
                    if (hidden[k] || sentKeys[k]) return;
                    const src = srcByIdx[srcIdx];
                    if (!src) return;
                    const p = buildItemPayload(src, lang);
                    if (p) itemsToRegister.push(p);
                });
            });

            if (itemsToRegister.length === 0) {
                toast({ title: "등록할 대상이 없습니다" });
                setRegistering(false);
                return;
            }

            let successCount = 0;
            let failCount = 0;
            let lastError = '';

            for (const item of itemsToRegister) {
                try {
                    await sendPayloadToQueue(item);
                    setSentKeys(prev => ({ ...prev, [item.key]: true }));
                    successCount++;
                } catch (e: any) {
                    failCount++;
                    lastError = e?.message || '등록 오류';
                }
            }

            if (successCount > 0) {
                toast({
                    title: "전체 대기열 일괄 등록 완료",
                    description: `총 ${successCount}개의 항목이 자동화 대기열로 등록되었습니다.${failCount > 0 ? ` (${failCount}개 실패: ${lastError})` : ''}`
                });
                onSuccess?.();
            } else if (failCount > 0) {
                toast({
                    variant: "destructive",
                    title: "일괄 등록 실패",
                    description: lastError || "대기열 등록 중 오류가 발생했습니다."
                });
            }
        } catch (err: any) {
            console.error("Register all error:", err);
            toast({
                variant: "destructive",
                title: "영상 업로드 오류",
                description: err.message || "서버로 영상 전송 중 오류가 발생했습니다."
            });
        } finally {
            setRegistering(false);
        }
    };

    const registerCount = useMemo(() => {
        let count = 0;
        langs.forEach(lang => {
            getOrder(lang).forEach(srcIdx => {
                const k = vkey(srcIdx, lang);
                if (!hidden[k] && !sentKeys[k]) count++;
            });
        });
        return count;
    }, [langs, getOrder, hidden, sentKeys]);

    const matchedCount = useMemo(() => Object.keys(attachments).length, [attachments]);
    const poolList = Object.values(pool);

    const DropZone = ({ inner, onFiles, hint }: { inner: React.ReactNode; onFiles: (f: FileList) => void; hint?: string }) => {
        const [over, setOver] = useState(false);
        return (
            <div
                onDragOver={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={e => { e.preventDefault(); setOver(false); }}
                onDrop={e => { e.preventDefault(); setOver(false); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
                className={`rounded-lg border-2 border-dashed p-3 transition-colors ${over ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-border bg-muted/30'}`}
            >
                {inner}
                {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) reset(); }}>
            <DialogContent className="max-w-6xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-foreground border-border">
                {/* 상단 다이얼로그 헤더 (스크린샷 일치) */}
                <DialogHeader className="px-5 pt-4 pb-0 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <Film className="w-5 h-5 text-indigo-500" /> 픽셀링 메타 매칭 & 대기열 등록
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                추천 메타 텍스트와 쇼츠 영상을 자동 매칭하여 플랫폼별 업로드 대기열로 일괄 등록합니다
                            </DialogDescription>
                        </div>
                        {parsed && (
                            <Badge variant="outline" className="text-xs font-semibold">
                                등록 대상 {registerCount}개
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                {/* 본문 스크롤 영역 */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3.5">
                    {/* 헤더 상태바 (스크린샷 일치) */}
                    {parsed && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{parsed.sources.length}개 소스</span> · 영상 {Object.keys(pool).length}개 · 매칭 <span className="font-semibold text-emerald-600 dark:text-emerald-400">{matchedCount}개</span>
                                {parsed.savedAt && <span className="ml-2 text-muted-foreground">· {parsed.savedAt}</span>}
                            </div>
                        </div>
                    )}

                    {/* 1·2 입력 카드 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* 1. 추천 메타 텍스트 */}
                        <Card className="border-border">
                            <CardContent className="p-3.5 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="font-bold text-xs">1. 추천 메타 텍스트</h3>
                                </div>
                                <p className="text-[11px] text-muted-foreground">메타 텍스트를 붙여넣거나 <b>.txt 파일을 여기로 드래그</b>하세요.</p>
                                <DropZone inner={
                                    <Textarea
                                        value={metaText}
                                        onChange={e => setMetaText(e.target.value)}
                                        rows={6}
                                        placeholder={"여기에 '추천 메타 전부저장' 텍스트를 붙여넣으세요...\n또는 .txt 파일을 이 영역으로 드래그 앤 드롭"}
                                        className="bg-background border-border font-mono text-xs min-h-36"
                                    />
                                } onFiles={(files) => {
                                    const f = Array.from(files).find(x => x.type === 'text/plain' || /\.txt$/i.test(x.name));
                                    if (f) { f.text().then(t => { setMetaText(t); analyzeWith(t); }); }
                                    else toast({ variant: "destructive", title: ".txt 파일을 넣어주세요" });
                                }} />
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => textFileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" /> 파일 선택</Button>
                                    <input ref={textFileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) f.text().then(t => { setMetaText(t); analyzeWith(t); }); e.target.value = ''; }} />
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setMetaText(SAMPLE_META); analyzeWith(SAMPLE_META); }}>샘플 보기</Button>
                                    <div className="flex-1" />
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-7 text-xs" onClick={() => analyzeWith(metaText)}><Sparkles className="w-3.5 h-3.5 mr-1" /> 분석하기</Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. 영상 매칭 */}
                        <Card className="border-border">
                            <CardContent className="p-3.5 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Film className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="font-bold text-xs">2. 영상 매칭 <span className="text-muted-foreground font-normal">(선택)</span></h3>
                                </div>
                                <p className="text-[11px] text-muted-foreground">영상을 드래그하면 <b>화면 속 제목을 자동 인식(OCR)</b>해 같은 제목의 카드에 연결합니다.</p>
                                <DropZone inner={
                                    <div className="text-center py-2.5">
                                        <FileVideo className="w-7 h-7 mx-auto text-muted-foreground mb-1" />
                                        <p className="text-xs">영상 파일을 여기로 드래그<br /><span className="text-[11px] text-muted-foreground">여러 개 한꺼번에 가능 · 영상 속 제목으로 자동 매칭</span></p>
                                        <Button variant="outline" size="sm" className="mt-1.5 h-7 text-xs" onClick={() => videoFileRef.current?.click()}><FolderOpen className="w-3.5 h-3.5 mr-1" /> 영상 선택</Button>
                                        <input ref={videoFileRef} type="file" accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                                    </div>
                                } onFiles={(files) => addFiles(files)} />

                                {/* 제목 읽는 영역(상단 높이) 조절 */}
                                <div className="space-y-1 pt-0.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-[11px]"><span className="font-semibold">제목 읽는 영역</span> · 화면 <b>{topRatio}%</b> (위쪽)</span>
                                        <Button variant="ghost" size="sm" className="h-5 text-[11px] px-1" onClick={rematchExisting} disabled={!!progress}><RotateCcw className="w-3 h-3 mr-1" /> 다시 인식</Button>
                                    </div>
                                    <input
                                        type="range" min={10} max={80} step={5} value={topRatio}
                                        onChange={e => setTopRatio(parseInt(e.target.value, 10) || 30)}
                                        className="w-full accent-indigo-600 h-1.5"
                                    />
                                    <div className="flex justify-between text-[9px] text-muted-foreground"><span>좁게(노이즈↓)</span><span>넓게</span></div>
                                </div>
                                {progress && (
                                    <div className="rounded-md border border-border bg-muted/40 p-1.5 space-y-1">
                                        <div className="h-1 w-full rounded bg-muted overflow-hidden">
                                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {progress.label} ({progress.done}/{progress.total})</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 툴바 (검색 & 언어 필터) */}
                    {parsed && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 border-t border-border">
                            <div className="flex items-center gap-2 flex-1 max-w-md">
                                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                                <Input placeholder="제목·설명·파일명 검색..." value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-xs bg-background border-border" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground">언어</Label>
                                <Select value={langFilter} onValueChange={setLangFilter}>
                                    <SelectTrigger className="h-7 w-26 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all">전체 표시</SelectItem>
                                        {langs.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* 업로드 예약 시간표 & 언어별 플랫폼/채널 통합 패널 */}
                    {parsed && (
                        <Card className="border-border bg-card">
                            <CardContent className="p-3.5 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                                        <h3 className="font-bold text-xs">업로드 예약 시간표 <span className="text-[11px] font-normal text-muted-foreground">언어(채널)별로 시작 시각과 하루 업로드 시간을 정하면 순서대로 자동 배정</span></h3>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSchedOpen(!schedOpen)} className="h-6 text-xs">
                                        {schedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>

                                {schedOpen && (
                                    <div className="space-y-2.5 pt-0.5">
                                        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded">
                                            <span>① 하루에 몇 개 올릴지 → ② 각 업로드 시간 → ③ 시작 날짜 → ④ 그날 어느 시간부터 시작할지 고르면, 그 시간부터 카드 1·2·3...번에 <b>따다닥</b> 배정됩니다. 언어(채널)마다 따로 설정할 수 있어요.</span>
                                            <Button variant="outline" size="sm" className="h-5 text-[10px]" onClick={() => { setSchedules({}); toast({ title: "예약 시간표 초기화됨" }); }}>예약 전체 초기화</Button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                                            {langs.map(lang => {
                                                const cfg = ensureSched(lang);
                                                const visibleSeq = getOrder(lang).filter(idx => !hidden[vkey(idx, lang)]);
                                                return (
                                                    <div key={lang} className="rounded-lg border border-border/80 p-2.5 space-y-2.5 bg-muted/10">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <LangBadge lang={lang} />
                                                                <span className="font-bold text-xs">{lang} 채널</span>
                                                            </div>
                                                            <span className="text-[11px] text-muted-foreground">영상 {visibleSeq.length}개</span>
                                                        </div>

                                                        {/* 채널명 커스텀 입력 */}
                                                        <Input
                                                            value={cfg.customChannelName || ''}
                                                            onChange={e => updateSched(lang, { customChannelName: e.target.value })}
                                                            placeholder={`예: 1채널 - ${lang} 메인`}
                                                            className="h-7 text-xs bg-background"
                                                        />

                                                        {/* 다중 플랫폼 및 채널 할당 */}
                                                        <div className="space-y-1.5 pt-1 border-t border-border/50">
                                                            <div className="flex items-center justify-between">
                                                                <Label className="text-[10px] font-semibold text-muted-foreground">배포 플랫폼</Label>
                                                                <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                                                                    <Checkbox
                                                                        checked={cfg.approvalRequired}
                                                                        onCheckedChange={v => updateSched(lang, { approvalRequired: !!v })}
                                                                    />
                                                                    <span>승인 대기로 등록</span>
                                                                </label>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2.5 text-xs">
                                                                {[
                                                                    { id: 'youtube', label: 'YouTube' },
                                                                    { id: 'tiktok', label: 'TikTok' },
                                                                    { id: 'instagram', label: 'Instagram' }
                                                                ].map(plat => {
                                                                    const checked = (cfg.targetPlatforms || []).includes(plat.id);
                                                                    return (
                                                                        <label key={plat.id} className="flex items-center gap-1 cursor-pointer text-[11px]">
                                                                            <Checkbox
                                                                                checked={checked}
                                                                                onCheckedChange={() => {
                                                                                    const cur = cfg.targetPlatforms || [];
                                                                                    const next = checked ? cur.filter(x => x !== plat.id) : [...cur, plat.id];
                                                                                    updateSched(lang, { targetPlatforms: next.length ? next : ['youtube'] });
                                                                                }}
                                                                            />
                                                                            <span>{plat.label}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* 플랫폼별 채널 드롭다운 */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                                                {(cfg.targetPlatforms || []).includes('youtube') && (
                                                                    <div>
                                                                        <Label className="text-[9px] text-muted-foreground">YouTube 채널 *</Label>
                                                                        <Select
                                                                            value={cfg.channelId}
                                                                            onValueChange={v => updateSched(lang, { channelId: v })}
                                                                        >
                                                                            <SelectTrigger className="h-6 text-xs bg-background"><SelectValue placeholder="채널 선택" /></SelectTrigger>
                                                                            <SelectContent>
                                                                                {channelList.map(c => (
                                                                                    <SelectItem key={c.channel_id} value={c.channel_id}>
                                                                                        {c.channel_name || c.title} ({c.subscriber_count?.toLocaleString()}명)
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}

                                                                {(cfg.targetPlatforms || []).includes('tiktok') && (
                                                                    <div>
                                                                        <Label className="text-[9px] text-muted-foreground">TikTok 계정</Label>
                                                                        <Select
                                                                            value={cfg.tiktokAccountId}
                                                                            onValueChange={v => updateSched(lang, { tiktokAccountId: v })}
                                                                        >
                                                                            <SelectTrigger className="h-6 text-xs bg-background"><SelectValue placeholder="계정 선택" /></SelectTrigger>
                                                                            <SelectContent>
                                                                                {tiktokChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.nickname || c.id}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}

                                                                {(cfg.targetPlatforms || []).includes('instagram') && (
                                                                    <div>
                                                                        <Label className="text-[9px] text-muted-foreground">Instagram 계정</Label>
                                                                        <Select
                                                                            value={cfg.instagramAccountId}
                                                                            onValueChange={v => updateSched(lang, { instagramAccountId: v })}
                                                                        >
                                                                            <SelectTrigger className="h-6 text-xs bg-background"><SelectValue placeholder="계정 선택" /></SelectTrigger>
                                                                            <SelectContent>
                                                                                {instagramChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.nickname || c.id}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 시간표 스케줄 인풋들 */}
                                                        <div className="space-y-1.5 pt-1 border-t border-border/50 text-xs">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-[9px] text-muted-foreground">① 하루 업로드 개수</Label>
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateSched(lang, { dailyCount: Math.max(1, cfg.dailyCount - 1), slots: cfg.slots.slice(0, Math.max(1, cfg.dailyCount - 1)) })}><Minus className="w-2.5 h-2.5" /></Button>
                                                                        <span className="w-6 text-center text-xs font-bold">{cfg.dailyCount}</span>
                                                                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                                                            const n = cfg.dailyCount + 1;
                                                                            const slots = [...cfg.slots];
                                                                            while (slots.length < n) slots.push('12:00');
                                                                            updateSched(lang, { dailyCount: n, slots });
                                                                        }}><Plus className="w-2.5 h-2.5" /></Button>
                                                                        <span className="text-muted-foreground text-[10px] ml-0.5">개/일</span>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <Label className="text-[9px] text-muted-foreground">③ 시작 날짜</Label>
                                                                    <Input type="date" value={cfg.startDate} onChange={e => updateSched(lang, { startDate: e.target.value })} className="h-6 text-xs bg-background mt-0.5" />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <Label className="text-[9px] text-muted-foreground">② 업로드 시간</Label>
                                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                                    {cfg.slots.slice(0, cfg.dailyCount).map((s, si) => (
                                                                        <Input
                                                                            key={si}
                                                                            type="time"
                                                                            value={s}
                                                                            onChange={e => {
                                                                                const next = [...cfg.slots];
                                                                                next[si] = e.target.value;
                                                                                updateSched(lang, { slots: next });
                                                                            }}
                                                                            className="h-6 w-22 text-xs bg-background"
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <Label className="text-[9px] text-muted-foreground">④ 그날 시작 시간</Label>
                                                                <Select value={String(cfg.startSlotIdx || 0)} onValueChange={v => updateSched(lang, { startSlotIdx: parseInt(v, 10) || 0 })}>
                                                                    <SelectTrigger className="h-6 text-xs bg-background mt-0.5"><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {cfg.slots.slice(0, cfg.dailyCount).map((s, si) => (
                                                                            <SelectItem key={si} value={String(si)}>{si + 1}번째 · {s}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
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

                    {/* 개별 추천 메타 카드 목록 (컴팩트 핏) */}
                    {parsed && (
                        langs.filter(l => langFilter === '__all' || langFilter === l).map(lang => {
                            const seq = getOrder(lang);
                            const visibleSeq = seq.filter(idx => !hidden[vkey(idx, lang)]);
                            return (
                                <div key={lang} className="space-y-2.5">
                                    {visibleSeq.map((srcIdx, pos) => {
                                        const src = srcByIdx[srcIdx];
                                        if (!src) return null;
                                        const meta = src.metas.find(m => (m.lang || '원본') === lang) || src.metas[0];
                                        if (!meta) return null;
                                        const k = vkey(src.index, lang);
                                        const vidId = attachments[k];
                                        const vid = vidId ? pool[vidId] : undefined;
                                        const when = schedMap[lang]?.[src.index];
                                        const isSent = sentKeys[k];
                                        const isSending = sendingKey === k;

                                        // 검색 필터
                                        if (search) {
                                            const q = search.toLowerCase();
                                            const matchT = (meta.title || '').toLowerCase().includes(q);
                                            const matchD = (meta.description || '').toLowerCase().includes(q);
                                            const matchF = (src.fileName || '').toLowerCase().includes(q);
                                            if (!matchT && !matchD && !matchF) return null;
                                        }

                                        const tagKeywords = getTagKeywords(meta.tags);
                                        const fullDescWithHash = getCombinedDescription(meta.description || '', meta.tags);

                                        return (
                                            <Card key={k} className={`border ${isSent ? 'border-emerald-500/50 bg-emerald-50/10' : 'border-border bg-card'} rounded-lg shadow-xs overflow-hidden`}>
                                                <CardContent className="p-3 space-y-2">
                                                    {/* 상단 순서 + 언어/제목 + 액션 */}
                                                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <div className="flex items-center gap-0.5">
                                                                <Button size="icon" variant="ghost" className="h-5 w-5" disabled={pos === 0} onClick={() => moveOrder(lang, srcIdx, -1)}><ChevronUp className="w-3 h-3" /></Button>
                                                                <span className="text-xs font-bold w-3 text-center">{pos + 1}</span>
                                                                <Button size="icon" variant="ghost" className="h-5 w-5" disabled={pos === visibleSeq.length - 1} onClick={() => moveOrder(lang, srcIdx, 1)}><ChevronDown className="w-3 h-3" /></Button>
                                                            </div>
                                                            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-bold text-[11px] px-1.5 py-0">{src.index}</Badge>
                                                            <LangBadge lang={lang} />
                                                            <span className="font-bold text-xs text-foreground">{meta.title || '(제목 없음)'}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">pixeling_{src.fileName?.replace(/[^0-9]/g, '') || src.index}.mp4</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {vid ? (
                                                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                                                    <CircleCheck className="w-3 h-3" /> 영상 매칭됨
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                                    <Link2Off className="w-3 h-3" /> 미매칭
                                                                </span>
                                                            )}
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => setHidden(prev => ({ ...prev, [k]: true }))} title="삭제"><Trash2 className="w-3 h-3" /></Button>
                                                        </div>
                                                    </div>

                                                    {/* 본문: 좌측 슬림 쇼츠 영상 vs 우측 밀착 메타 필드 */}
                                                    <div className="flex flex-col md:flex-row gap-3 items-start">
                                                        {/* 좌측: 슬림 9:16 쇼츠 영상 박스 */}
                                                        <div className="space-y-1.5 w-[135px] shrink-0">
                                                            <VideoPreviewBox vid={vid} lang={lang} />

                                                            {/* 연결할 영상 풀 셀렉트 */}
                                                            <div className="space-y-1 w-full">
                                                                {vid ? (
                                                                    <div className="flex items-center justify-between rounded border border-border p-1 bg-muted/20">
                                                                        <div className="flex items-center gap-1 min-w-0">
                                                                            {vid.thumb && (
                                                                                <img src={vid.thumb} alt="" className="w-4 h-6 object-cover rounded shrink-0 bg-black" />
                                                                            )}
                                                                            <span className="text-[11px] truncate max-w-[75px]">{vid.name}</span>
                                                                        </div>
                                                                        <Button size="icon" variant="ghost" className="h-4 w-4 text-muted-foreground hover:text-red-500 shrink-0" onClick={() => unassign(src.index, lang)}>
                                                                            <X className="w-2.5 h-2.5" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex gap-1">
                                                                        <Select value={vidId || '__none'} onValueChange={v => assignPool(v, src.index, lang)}>
                                                                            <SelectTrigger className="h-6 text-[10px] bg-background flex-1 px-1.5"><SelectValue placeholder="풀에서 선택" /></SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="__none">(연결 안 함)</SelectItem>
                                                                                {poolList.map(p => (
                                                                                    <SelectItem key={p.id} value={p.id}>{shorten(p.name, 18)}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-6 text-xs px-1.5"
                                                                            onClick={() => cardVideoFileRef.current[k]?.click()}
                                                                        >
                                                                            <FolderOpen className="w-3 h-3" />
                                                                        </Button>
                                                                        <input
                                                                            ref={el => { cardVideoFileRef.current[k] = el; }}
                                                                            type="file"
                                                                            accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v"
                                                                            className="hidden"
                                                                            onChange={e => {
                                                                                if (e.target.files?.length) addFiles(e.target.files, k);
                                                                                e.target.value = '';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 우측: 메타 필드 (제목, 설명, 태그) */}
                                                        <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                                                            {/* 1. 제목 */}
                                                            <div className="rounded-md border border-border/70 p-2 bg-muted/10 space-y-0.5">
                                                                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                                    <span>제목 {meta.title?.length || 0}자</span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-4 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                                                                        onClick={() => { copyToClipboard(meta.title); toast({ title: "제목 복사됨" }); }}
                                                                    >
                                                                        <Copy className="w-2.5 h-2.5 mr-0.5" /> 복사
                                                                    </Button>
                                                                </div>
                                                                <p className="font-bold text-xs text-foreground truncate">{meta.title || '(제목 없음)'}</p>
                                                            </div>

                                                            {/* 2. 설명 */}
                                                            <div className="rounded-md border border-border/70 p-2 bg-muted/10 space-y-0.5">
                                                                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                                    <span>설명 {fullDescWithHash.length}자</span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-4 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                                                                        onClick={() => { copyToClipboard(fullDescWithHash); toast({ title: "설명(해시태그 포함) 복사됨" }); }}
                                                                    >
                                                                        <Copy className="w-2.5 h-2.5 mr-0.5" /> 복사
                                                                    </Button>
                                                                </div>
                                                                <p className="text-[11px] text-foreground line-clamp-3 leading-snug whitespace-pre-wrap">{fullDescWithHash || '(설명 없음)'}</p>
                                                            </div>

                                                            {/* 3. 태그 */}
                                                            <div className="rounded-md border border-border/70 p-2 bg-muted/10 space-y-0.5">
                                                                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                                    <span>태그 {tagKeywords.length}개</span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-4 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                                                                        onClick={() => {
                                                                            copyToClipboard(tagKeywords.join(', '));
                                                                            toast({ title: "태그(콤마 구분) 복사됨" });
                                                                        }}
                                                                    >
                                                                        <Copy className="w-2.5 h-2.5 mr-0.5" /> 복사
                                                                    </Button>
                                                                </div>
                                                                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                                                                    {tagKeywords.length ? tagKeywords.join(', ') : '(태그 없음)'}
                                                                </p>
                                                            </div>

                                                            {/* 우측 하단: 설명+태그 한번에 복사 버튼 */}
                                                            <div className="flex justify-end pt-0.5">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 text-[11px] font-semibold flex items-center gap-1"
                                                                    onClick={() => {
                                                                        const combined = `${fullDescWithHash}\n\n${tagKeywords.join(', ')}`;
                                                                        copyToClipboard(combined);
                                                                        toast({ title: "설명 + 태그 한번에 복사 완료" });
                                                                    }}
                                                                >
                                                                    <Layers3 className="w-3 h-3 mr-0.5" /> 설명+태그 한번에 복사
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 카드 하단 액션 바 */}
                                                    <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs">
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {vid ? '영상 첨부됨' : '영상 미첨부 — 첨부 없이도 대기열로 보낼 수 있어요'}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            disabled={isSent || isSending}
                                                            onClick={() => handleRegisterSingle(src, lang)}
                                                            className={`h-6 text-[11px] font-semibold px-2.5 ${isSent ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                                        >
                                                            {isSending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : isSent ? <Check className="w-3 h-3 mr-0.5" /> : <Send className="w-3 h-3 mr-0.5" />}
                                                            {isSent ? '대기열 등록됨' : '대기열로 보내기'}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 하단 고정 일괄 등록 바 */}
                {parsed && (
                    <div className="px-5 py-2.5 border-t border-border/80 bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">
                            등록 대상 <b className="text-foreground">{registerCount}개</b> · 영상 첨부 <b className="text-emerald-600 dark:text-emerald-400">{matchedCount}개</b>
                        </span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsOpen(false)}>취소</Button>
                            <Button
                                size="sm"
                                onClick={handleRegisterAll}
                                disabled={registering || registerCount === 0}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs px-3.5 h-7 text-xs"
                            >
                                {registering ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5 mr-1.5" />}
                                {registering ? '보내는 중...' : `전체 대기열로 보내기 (${registerCount})`}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PixelingImportDialog;
