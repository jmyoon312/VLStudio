import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Check, X, RotateCcw, ChevronDown, Globe, Clock, Flame, Eye, Film, Zap, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface ScoutFilterConfig {
    includeLangs: string[];
    excludeLangs: string[];
    uploadDateRange: string; // 'all' | '24h' | '7d' | '30d' | '90d' | '1y' - 영상 실제 업로드/등록일자 (핵심 신선도)
    collectedDateRange: string; // 'all' | '24h' | '7d' | '30d' | '90d' - 시스템 수집일자
    dateRange?: string; // legacy fallback
    minOutlier: number; // 2.0 | 3.0 | 5.0 | 10.0
    minViews: number; // 0 | 10000 | 50000 | 100000 | 500000
    durationRange: string; // 'all' | 'under30s' | '30to60s' | '3to8m' | '8to15m' | 'over15m'
}

export const DEFAULT_FILTERS: ScoutFilterConfig = {
    includeLangs: ['ko', 'en', 'ja'],
    excludeLangs: ['hi', 'vi', 'ar', 'ru'],
    uploadDateRange: '30d',
    collectedDateRange: 'all',
    dateRange: '30d',
    minOutlier: 3.0,
    minViews: 50000,
    durationRange: 'all'
};

const STORAGE_KEY = 'vlstudio_scout_filter_matrix';

interface ScoutingFilterPopoverProps {
    config: ScoutFilterConfig;
    onChange: (config: ScoutFilterConfig) => void;
    aspectFormat: 'shorts' | 'long';
}

export const ScoutingFilterPopover: React.FC<ScoutingFilterPopoverProps> = ({
    config,
    onChange,
    aspectFormat
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempConfig, setTempConfig] = useState<ScoutFilterConfig>(() => {
        return {
            ...DEFAULT_FILTERS,
            ...config,
            uploadDateRange: config.uploadDateRange || config.dateRange || '30d',
            collectedDateRange: config.collectedDateRange || 'all'
        };
    });

    useEffect(() => {
        setTempConfig({
            ...DEFAULT_FILTERS,
            ...config,
            uploadDateRange: config.uploadDateRange || config.dateRange || '30d',
            collectedDateRange: config.collectedDateRange || 'all'
        });
    }, [config]);

    const handleApply = () => {
        const payload: ScoutFilterConfig = {
            ...tempConfig,
            dateRange: tempConfig.uploadDateRange // keep legacy synced
        };
        onChange(payload);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {}
        setIsOpen(false);
    };

    const handleReset = () => {
        setTempConfig(DEFAULT_FILTERS);
        onChange(DEFAULT_FILTERS);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FILTERS));
        } catch {}
    };

    const toggleLang = (lang: string, type: 'include' | 'exclude') => {
        if (type === 'include') {
            const next = tempConfig.includeLangs.includes(lang)
                ? tempConfig.includeLangs.filter(l => l !== lang)
                : [...tempConfig.includeLangs, lang];
            setTempConfig({ ...tempConfig, includeLangs: next });
        } else {
            const next = tempConfig.excludeLangs.includes(lang)
                ? tempConfig.excludeLangs.filter(l => l !== lang)
                : [...tempConfig.excludeLangs, lang];
            setTempConfig({ ...tempConfig, excludeLangs: next });
        }
    };

    // Summary badge text
    const curUpload = tempConfig.uploadDateRange || tempConfig.dateRange || '30d';
    const curCollect = tempConfig.collectedDateRange || 'all';

    const uploadLabelMap: Record<string, string> = {
        'all': '업로드 전체',
        '24h': '업로드 24h',
        '7d': '업로드 7일내',
        '30d': '업로드 30일내',
        '90d': '업로드 90일내',
        '1y': '업로드 1년내'
    };

    const summaryParts = [
        tempConfig.includeLangs.length > 0 ? `타겟: ${tempConfig.includeLangs.map(l => l.toUpperCase()).join('/')}` : '전체국가',
        uploadLabelMap[curUpload] || `업로드 ${curUpload}`,
        curCollect !== 'all' ? `수집 ${curCollect}` : null,
        `${tempConfig.minOutlier}x+`
    ].filter(Boolean);

    return (
        <div className="relative inline-block text-left">
            {/* 1-Line Compact Summary Capsule Button */}
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="h-8 px-3 rounded-xl bg-card/80 hover:bg-card border border-border/90 text-xs font-bold text-foreground flex items-center gap-2 cursor-pointer shadow-xs transition-all hover:border-indigo-500/50"
                >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-mono text-[11px] text-muted-foreground">스카우팅 조건:</span>
                    <span className="font-mono text-[11px] text-blue-400 font-bold">{summaryParts.join(' · ')}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>

                <button
                    onClick={handleReset}
                    title="기본값으로 초기화"
                    className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Dropdown Popover Modal */}
            {isOpen && (
                <div className="absolute left-0 top-10 z-50 w-96 sm:w-[490px] p-4 bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-xs text-foreground">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                            <span>정밀 스카우팅 조건 매트릭스 (Constraint Matrix)</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 1. 타겟 허용 국가/언어 (Tier 1 고수익 Whitelist - 유튜브 RPM $4~$15) */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3 text-blue-400" />
                                <span>타겟 고수익 국가/언어 (Tier 1 Whitelist)</span>
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">RPM $3~$15 우대</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { id: 'ko', label: '🇰🇷 한국 (KO)' },
                                { id: 'en', label: '🇺🇸 미국/캐나다 (EN)' },
                                { id: 'gb', label: '🇬🇧 영국/호주 (GB/AU)' },
                                { id: 'ja', label: '🇯🇵 일본 (JA)' },
                                { id: 'de', label: '🇩🇪 독일/유럽 (DE/FR)' },
                                { id: 'zh', label: '🇹🇼 대만/중화 (ZH)' },
                            ].map(item => {
                                const active = tempConfig.includeLangs.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => toggleLang(item.id, 'include')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                                            active 
                                                ? "bg-blue-600 text-white shadow-xs" 
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/60"
                                        )}
                                    >
                                        {active && <Check className="w-3 h-3" />}
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. 비선호 차단 국가/언어 (Blacklist - 저수익 RPM $0.1~$0.5 & 유니코드 즉시 제외) */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-rose-400 flex items-center justify-between">
                            <span>🚫 비선호 차단 국가 (초저수익 RPM 오염 방지)</span>
                            <span className="text-[10px] font-mono text-rose-400 font-bold">유니코드 즉시 제외</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { id: 'hi', label: '🚫 인도/힌디어 (데바나가리)' },
                                { id: 'vi', label: '🚫 베트남/동남아 (VI/TH)' },
                                { id: 'ar', label: '🚫 아랍권 (AR)' },
                                { id: 'ru', label: '🚫 러시아/키릴 (RU)' },
                                { id: 'pk', label: '🚫 파키스탄/서남아 (PK/BD)' },
                            ].map(item => {
                                const active = tempConfig.excludeLangs.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => toggleLang(item.id, 'exclude')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                                            active 
                                                ? "bg-rose-600/20 text-rose-400 border border-rose-500/40 shadow-xs" 
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/60"
                                        )}
                                    >
                                        {active && <Check className="w-3 h-3" />}
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. 영상 실제 등록/업로드 일자 필터 (실질적 핵심 신선도 요소) */}
                    <div className="space-y-1.5 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <label className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                <span>📅 영상 등록/업로드 일자 (Upload Date - 핵심 신선도)</span>
                            </span>
                            <span className="text-[10px] font-mono text-amber-400 font-bold">실제 발행일 기준</span>
                        </label>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            실제 유튜브에 영상이 업로드된 시점을 필터링합니다. 최신 알고리즘 폭발 흐름을 파악하는 핵심 요소입니다.
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                            {[
                                { id: 'all', label: '전체 기간' },
                                { id: '24h', label: '⚡ 24시간' },
                                { id: '7d', label: '📅 최근 7일' },
                                { id: '30d', label: '🗓️ 최근 30일' },
                                { id: '90d', label: '🗓️ 최근 90일' },
                                { id: '1y', label: '🕰️ 1년 이내' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setTempConfig({ ...tempConfig, uploadDateRange: item.id, dateRange: item.id })}
                                    className={cn(
                                        "py-1 text-center rounded-lg text-xs font-bold cursor-pointer transition-all",
                                        curUpload === item.id 
                                            ? "bg-amber-500 text-black font-black shadow-xs" 
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/60"
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 4. 시스템 수집 일자 필터 (레이더 포착 시점) */}
                    <div className="space-y-1.5 p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                        <label className="text-[11px] font-bold text-indigo-400 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                <span>📥 시스템 수집 일자 (Collection Date - 스카우트 포착일)</span>
                            </span>
                            <span className="text-[10px] font-mono text-indigo-400">레이더 입고일 기준</span>
                        </label>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            바이럴 스카우터가 영상을 탐색·포착하여 로컬 DB에 입고한 시점을 필터링합니다.
                        </p>
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                            {[
                                { id: 'all', label: '전체 수집' },
                                { id: '24h', label: '⚡ 오늘 (24h)' },
                                { id: '7d', label: '📅 7일내' },
                                { id: '30d', label: '🗓️ 30일내' },
                                { id: '90d', label: '🗓️ 90일내' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setTempConfig({ ...tempConfig, collectedDateRange: item.id })}
                                    className={cn(
                                        "py-1 text-center rounded-lg text-xs font-bold cursor-pointer transition-all",
                                        curCollect === item.id 
                                            ? "bg-indigo-600 text-white shadow-xs font-black" 
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/60"
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 5. 최소 폭발 배수 (Min Outlier Ratio) */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-400" />
                            <span>최소 알고리즘 폭발 배수 (Outlier Ratio)</span>
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[
                                { val: 2.0, label: '2.0x+' },
                                { val: 3.0, label: '3.0x+ (옥석)' },
                                { val: 5.0, label: '5.0x+ (대박)' },
                                { val: 10.0, label: '10.0x+ (초대박)' },
                            ].map(item => (
                                <button
                                    key={item.val}
                                    onClick={() => setTempConfig({ ...tempConfig, minOutlier: item.val })}
                                    className={cn(
                                        "py-1 text-center rounded-lg text-xs font-bold cursor-pointer transition-all",
                                        tempConfig.minOutlier === item.val 
                                            ? "bg-amber-500 text-black font-black shadow-xs" 
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/60"
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Apply Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <button
                            onClick={handleReset}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                        >
                            <RotateCcw className="w-3 h-3" />
                            기본값
                        </button>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                className="h-7 text-xs rounded-xl"
                            >
                                취소
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleApply}
                                className="h-7 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                            >
                                조건 저장 & 즉시 적용
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
