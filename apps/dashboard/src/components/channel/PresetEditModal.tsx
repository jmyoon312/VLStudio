import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { CollectionPreset, Channel, Category } from '../../lib/api';
import { X, Sparkles, Video, FileText, Folder, Check, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PresetEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingPreset?: CollectionPreset | null;
    initialChannelIds?: number[];
}

export const PresetEditModal: React.FC<PresetEditModalProps> = ({
    isOpen,
    onClose,
    editingPreset,
    initialChannelIds = [],
}) => {
    const queryClient = useQueryClient();

    // Form state
    const [name, setName] = useState('');
    const [videoType, setVideoType] = useState<'shorts' | 'long' | 'all'>('shorts');
    const [uploadPeriod, setUploadPeriod] = useState<'1d' | '3d' | '7d' | '30d' | 'all'>('7d');
    const [minViews, setMinViews] = useState(100000);
    const [sortBy, setSortBy] = useState<'popular' | 'latest'>('popular');
    const [maxVideosPerChannel, setMaxVideosPerChannel] = useState(3);
    const [outlierRatio, setOutlierRatio] = useState(1.0);
    const [collectVideo, setCollectVideo] = useState(true);
    const [collectScript, setCollectScript] = useState(true);
    const [isAutoActive, setIsAutoActive] = useState(true);
    const [cronIntervalHours, setCronIntervalHours] = useState(2);
    const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
    const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);

    // Fetch channels and categories
    const { data: channels = [] } = useQuery({
        queryKey: ['channels'],
        queryFn: async () => (await api.get<Channel[]>('/channels/')).data || [],
        enabled: isOpen,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => (await api.get<Category[]>('/categories/')).data || [],
        enabled: isOpen,
    });

    // Populate data
    useEffect(() => {
        if (editingPreset) {
            setName(editingPreset.name);
            setVideoType(editingPreset.video_type);
            setUploadPeriod(editingPreset.upload_period);
            setMinViews(editingPreset.min_views);
            setSortBy(editingPreset.sort_by);
            setMaxVideosPerChannel(editingPreset.max_videos_per_channel);
            setOutlierRatio(editingPreset.outlier_ratio || 1.0);
            setCollectVideo(editingPreset.collect_video);
            setCollectScript(editingPreset.collect_script);
            setIsAutoActive(editingPreset.is_auto_active);
            setCronIntervalHours(editingPreset.cron_interval_hours || 2);
            setSelectedChannelIds(editingPreset.channel_ids || []);
            setSelectedFolderIds(editingPreset.folder_ids || []);
        } else {
            setName('');
            setVideoType('shorts');
            setUploadPeriod('7d');
            setMinViews(100000);
            setSortBy('popular');
            setMaxVideosPerChannel(3);
            setOutlierRatio(1.0);
            setCollectVideo(true);
            setCollectScript(true);
            setIsAutoActive(true);
            setCronIntervalHours(2);
            setSelectedChannelIds(initialChannelIds || []);
            setSelectedFolderIds([]);
        }
    }, [editingPreset, initialChannelIds, isOpen]);

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (editingPreset) {
                return (await api.put(`/presets/${editingPreset.id}`, payload)).data;
            } else {
                return (await api.post('/presets/', payload)).data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collection_presets'] });
            onClose();
        },
        onError: (e: any) => {
            alert('프리셋 저장 실패: ' + (e.response?.data?.detail || e.message));
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('프리셋 이름을 입력해 주세요.');
            return;
        }

        const payload = {
            name: name.trim(),
            video_type: videoType,
            upload_period: uploadPeriod,
            min_views: Number(minViews),
            sort_by: sortBy,
            max_videos_per_channel: Number(maxVideosPerChannel),
            outlier_ratio: Number(outlierRatio),
            collect_video: collectVideo,
            collect_script: collectScript,
            is_auto_active: isAutoActive,
            cron_interval_hours: Number(cronIntervalHours),
            channel_ids: selectedChannelIds,
            folder_ids: selectedFolderIds,
        };

        saveMutation.mutate(payload);
    };

    const toggleChannel = (id: number) => {
        setSelectedChannelIds(prev => 
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const toggleFolder = (id: number) => {
        setSelectedFolderIds(prev =>
            prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 select-none">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold tracking-tight text-foreground">
                                {editingPreset ? '수집 프리셋 수정' : '새 수집 프리셋 생성'}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                조건 충족 시 영상/대본 자동 수집 규칙을 설정합니다.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
                    {/* Preset Name */}
                    <div className="space-y-1">
                        <label className="font-bold text-foreground block">프리셋 이름 *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: 영화 숏폼 30만+ 인기순, 괴담/미스터리 떡상 발굴"
                            className="w-full h-9 px-3 text-xs bg-muted/40 border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                            required
                        />
                    </div>

                    {/* Quick Conditions Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-3.5 rounded-xl border border-border/60">
                        {/* Video Type */}
                        <div className="space-y-1">
                            <label className="font-semibold text-muted-foreground block text-[11px]">영상 타입</label>
                            <select
                                value={videoType}
                                onChange={(e) => setVideoType(e.target.value as any)}
                                className="w-full h-8 px-2 bg-background border border-input rounded-lg font-bold cursor-pointer"
                            >
                                <option value="shorts">숏폼 (Shorts)</option>
                                <option value="long">롱폼 (일반 영상)</option>
                                <option value="all">전체 영상</option>
                            </select>
                        </div>

                        {/* Upload Period */}
                        <div className="space-y-1">
                            <label className="font-semibold text-muted-foreground block text-[11px]">업로드 기간</label>
                            <select
                                value={uploadPeriod}
                                onChange={(e) => setUploadPeriod(e.target.value as any)}
                                className="w-full h-8 px-2 bg-background border border-input rounded-lg font-bold cursor-pointer"
                            >
                                <option value="1d">최근 1일 (24시간)</option>
                                <option value="3d">최근 3일</option>
                                <option value="7d">최근 7일 (추천)</option>
                                <option value="30d">최근 30일</option>
                                <option value="all">전체 기간</option>
                            </select>
                        </div>

                        {/* Min Views */}
                        <div className="space-y-1">
                            <label className="font-semibold text-muted-foreground block text-[11px]">최소 조회수</label>
                            <select
                                value={minViews}
                                onChange={(e) => setMinViews(Number(e.target.value))}
                                className="w-full h-8 px-2 bg-background border border-input rounded-lg font-bold cursor-pointer"
                            >
                                <option value={10000}>1만+ (신생 떡상)</option>
                                <option value={50000}>5만+</option>
                                <option value={100000}>10만+ (검증됨)</option>
                                <option value={300000}>30만+</option>
                                <option value={500000}>50만+</option>
                                <option value={1000000}>100만+ (메가 히트)</option>
                            </select>
                        </div>

                        {/* Sort By */}
                        <div className="space-y-1">
                            <label className="font-semibold text-muted-foreground block text-[11px]">정렬 기준</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full h-8 px-2 bg-background border border-input rounded-lg font-bold cursor-pointer"
                            >
                                <option value="popular">인기순 (조회수 높은 순)</option>
                                <option value="latest">최신순 (최근 업로드)</option>
                            </select>
                        </div>
                    </div>

                    {/* Advanced Thresholds */}
                    <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3.5 rounded-xl border border-border/60">
                        <div className="space-y-1">
                            <label className="font-semibold text-muted-foreground block text-[11px]">채널당 최대 수집 개수</label>
                            <select
                                value={maxVideosPerChannel}
                                onChange={(e) => setMaxVideosPerChannel(Number(e.target.value))}
                                className="w-full h-8 px-2 bg-background border border-input rounded-lg font-bold cursor-pointer"
                            >
                                <option value={1}>1개 (초핵심 1위만)</option>
                                <option value={2}>2개</option>
                                <option value={3}>3개 (추천)</option>
                                <option value={5}>5개</option>
                                <option value={10}>10개</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="font-semibold text-muted-foreground block text-[11px]">
                                바이럴 이상치 가속도 (평균 대비)
                            </label>
                            <select
                                value={outlierRatio}
                                onChange={(e) => setOutlierRatio(Number(e.target.value))}
                                className="w-full h-8 px-2 bg-background border border-input rounded-lg font-bold cursor-pointer"
                            >
                                <option value={1.0}>일반 수집 (제한 없음)</option>
                                <option value={1.5}>1.5배 떡상 영상만</option>
                                <option value={2.0}>2.0배 슈퍼 아웃라이어만</option>
                            </select>
                        </div>
                    </div>

                    {/* Collection Mode Branching (Video vs Script) */}
                    <div className="space-y-2 bg-primary/5 p-3.5 rounded-xl border border-primary/20">
                        <span className="font-bold text-foreground block">수집 대상 항목 (복수 선택 가능)</span>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <label className={cn(
                                "flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-pointer",
                                collectVideo ? "bg-background border-primary shadow-xs" : "bg-muted/40 border-border opacity-70"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={collectVideo}
                                    onChange={(e) => setCollectVideo(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary cursor-pointer"
                                />
                                <div>
                                    <span className="font-bold flex items-center gap-1">
                                        <Video className="w-3.5 h-3.5 text-indigo-500" />
                                        영상 수집 (MP4)
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        [수집영상 보관함]으로 자동 저장
                                    </span>
                                </div>
                            </label>

                            <label className={cn(
                                "flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-pointer",
                                collectScript ? "bg-background border-primary shadow-xs" : "bg-muted/40 border-border opacity-70"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={collectScript}
                                    onChange={(e) => setCollectScript(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary cursor-pointer"
                                />
                                <div>
                                    <span className="font-bold flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                        대본 수집 (SRT/텍스트)
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        [수집 대본 분석실]로 자동 적재
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* 24H Auto Collection & Interval Settings */}
                    <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border/60">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-primary" />
                                    24H 무인 자동 수집 스케줄러
                                </label>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">
                                    백그라운드에서 주기적으로 신규 떡상 영상을 자동 탐색하고 수집합니다.
                                </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAutoActive}
                                    onChange={(e) => setIsAutoActive(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        {isAutoActive && (
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground">
                                    자동 수집 반복 주기:
                                </span>
                                <select
                                    value={cronIntervalHours}
                                    onChange={(e) => setCronIntervalHours(Number(e.target.value))}
                                    className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                                >
                                    <option value={1}>1시간 (실시간 집중 - 소수 채널 권장)</option>
                                    <option value={2}>🌟 2시간 (권장 표준 - 안전성·정확도 최적)</option>
                                    <option value={4}>4시간 (안전 안정 모드 - 채널 30개 이상)</option>
                                    <option value={6}>6시간 (여유 수집 모드)</option>
                                    <option value={12}>12시간 (반나절 1회)</option>
                                    <option value={24}>24시간 (하루 1회 일괄 수집)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Target Folders & Channels Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">대상 카테고리 폴더 및 채널 바인딩</span>
                            <span className="text-muted-foreground text-[11px]">
                                폴더 {selectedFolderIds.length}개 / 개별 채널 {selectedChannelIds.length}개 선택됨
                            </span>
                        </div>

                        {/* Folders Selection */}
                        <div className="space-y-1">
                            <span className="text-[11px] text-muted-foreground font-semibold">폴더 단위 지정 (폴더 내 모든 채널 자동 포함):</span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {categories.map(cat => {
                                    const isSelected = selectedFolderIds.includes(cat.id);
                                    return (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => toggleFolder(cat.id)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer",
                                                isSelected 
                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                                                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            <Folder className="w-3.5 h-3.5" />
                                            <span>{cat.name}</span>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Individual Channels Selection */}
                        <div className="space-y-1 pt-2">
                            <span className="text-[11px] text-muted-foreground font-semibold">개별 채널 직접 선택:</span>
                            <div className="max-h-36 overflow-y-auto border border-border rounded-xl p-2 grid grid-cols-2 gap-1.5 custom-scrollbar bg-background/50">
                                {channels.map(ch => {
                                    const isSelected = selectedChannelIds.includes(ch.id);
                                    return (
                                        <button
                                            type="button"
                                            key={ch.id}
                                            onClick={() => toggleChannel(ch.id)}
                                            className={cn(
                                                "p-1.5 rounded-lg text-left text-xs flex items-center justify-between border transition-all cursor-pointer",
                                                isSelected
                                                    ? "bg-primary/10 border-primary text-primary font-bold"
                                                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            <span className="truncate pr-1">{ch.name}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Automation Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                        <div>
                            <span className="font-bold text-foreground block">24시간 무인 백그라운드 자동 수집 가동</span>
                            <span className="text-[11px] text-muted-foreground">설정한 주기마다 백그라운드에서 신규 떡상 영상을 자동 감시 및 다운로드합니다.</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={isAutoActive}
                            onChange={(e) => setIsAutoActive(e.target.checked)}
                            className="w-5 h-5 rounded text-primary cursor-pointer"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/20 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="px-5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                        {saveMutation.isPending ? '저장 중...' : editingPreset ? '프리셋 수정 완료' : '프리셋 생성 완료'}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default PresetEditModal;

