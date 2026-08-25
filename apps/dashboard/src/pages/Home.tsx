import React, { useEffect, useState, useMemo } from 'react';
import { 
    Search, 
    ArrowRight, 
    Sparkles, 
    TrendingUp, 
    Zap, 
    Activity, 
    Users, 
    ShieldCheck, 
    Globe, 
    BarChart3, 
    Wifi, 
    RefreshCw, 
    Tv, 
    FileText, 
    Layers, 
    Flame,
    Play,
    Compass,
    Newspaper,
    MessageSquare,
    ExternalLink,
    ChevronRight,
    Bell,
    CheckCircle2,
    CheckSquare,
    X,
    Copy,
    Wand2,
    Share2,
    Radio,
    Scissors,
    Download,
    Image,
    FolderOpen,
    Edit3
} from 'lucide-react';
import { cn, getMediaUrl } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DashboardStats {
    total_channels: number;
    active_channels: number;
    total_videos: number;
    downloaded_today: number;
}

interface NetworkStatus {
    monitor?: {
        lte?: {
            status: string;
            metric?: number;
            ip?: string;
        };
        wifi?: {
            status: string;
            metric?: number;
            ip?: string;
        };
    };
    isolation_ok?: boolean;
    mobile_public_ip?: string;
    system_public_ip?: string;
}

interface ChannelItem {
    id: number;
    name: string;
    platform: string;
    subscriber_count?: number;
    status: string;
}

interface QueueStats {
    total: number;
    queued: number;
    uploading: number;
    completed: number;
    failed: number;
}

interface Settings {
    root_download_path?: string;
}

interface CategoryItem {
    id: number;
    name: string;
}

interface VideoAssetItem {
    id: number;
    title: string;
    file_path?: string;
    thumbnail_path?: string;
    channel_id?: number;
    url?: string;
    video_id?: string;
    extracted_text?: string;
    view_count?: number;
    created_at?: string;
    upload_date?: string;
    category?: string;
    duration?: number;
    duration_sec?: number;
    is_script_only?: boolean;
    metadata_json?: any;
}

// 다채로운 10대 추천 쇼츠 레퍼런스 데이터 (실제 갤러리 연동 및 폴백)
const fallbackTrendingShorts = [
    { 
        id: 101, 
        title: '태어나서 이런 사람 처음 봤다 ㄷㄷ 헬스장 꿀팁', 
        tag: '운동·헬스', 
        channel: '피트니스마스터',
        views: '240만', 
        comments: '1,280', 
        duration: '0:35', 
        time: '1일 전',
        img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80', 
        description: '헬스장에서 흔히 볼 수 없는 기상천외한 고수들의 훈련법과 꿀팁 모음집 #헬스 #운동 #피트니스 #유머' 
    },
    { 
        id: 102, 
        title: '아빠의 부들부들 오해한 일기 ㅋㅋㅋ 눈물 반전', 
        tag: '가족·공감', 
        channel: '가족시트콤',
        views: '180만', 
        comments: '940', 
        duration: '0:28', 
        time: '1일 전',
        img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80', 
        description: '매일 쓰던 아빠의 일기장을 우연히 읽게 된 딸의 감동적인 반전 스토리 #가족 #공감 #감동 #시트콤' 
    },
    { 
        id: 103, 
        title: '딸내미로 설명하는 양자역학 기초 (30초 완벽이해)', 
        tag: '지식·과학', 
        channel: '사이언스랩',
        views: '150만', 
        comments: '620', 
        duration: '0:30', 
        time: '2일 전',
        img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80', 
        description: '어려운 물리학 이론을 초등학생 딸의 일상으로 30초 만에 완벽 이해시키기 #과학 #양자역학 #상식 #꿀팁' 
    },
    { 
        id: 104, 
        title: 'RTX 5090 그래픽 카드 출시 때 현실 반응 (450만원?)', 
        tag: 'IT·테크', 
        channel: '테크룸',
        views: '125만', 
        comments: '2,100', 
        duration: '0:42', 
        time: '2일 전',
        img: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80', 
        description: '플래그십 그래픽카드 가격과 소비 전력을 접한 전 세계 게이머들의 찐반응 #RTX5090 #그래픽카드 #게이밍 #테크' 
    },
    { 
        id: 105, 
        title: '기숙사 방에서 나오는 상상초월 고급 기술 (원룸 200% 활용)', 
        tag: '일상·유머', 
        channel: '원룸생활백서',
        views: '98만', 
        comments: '430', 
        duration: '0:24', 
        time: '3일 전',
        img: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=600&auto=format&fit=crop&q=80', 
        description: '원룸·기숙사에서 공간을 200% 활용하는 천재 대학생들의 기발한 아이디어 #자취 #원룸 #기숙사 #꿀팁' 
    },
    { 
        id: 106, 
        title: '무한 리필 고깃집에서 반찬 가져가는 진상 민폐 손님 22탄', 
        tag: '먹방·요리', 
        channel: '숏둥이',
        views: '89만', 
        comments: '450', 
        duration: '0:21', 
        time: '1일 전',
        img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80', 
        description: '무한리필 음식점 가게에서 반찬 가져가는 진상 민폐 손님 #유머 #먹방 #숏둥이 #사이다' 
    },
    { 
        id: 107, 
        title: '이건 하늘이 도왔다! 수상한 하얀 봉투의 정체', 
        tag: '추억·이슈', 
        channel: '미스터리콕',
        views: '75만', 
        comments: '310', 
        duration: '0:33', 
        time: '4일 전',
        img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80', 
        description: '길바닥에 떨어진 수상한 하얀 봉투를 주운 뒤 벌어진 충격적인 이야기 #사건사고 #이슈 #반전' 
    },
    { 
        id: 108, 
        title: '81세 할머니의 눈물겨운 돈가스집 출근 첫날', 
        tag: '휴먼·감동', 
        channel: '따뜻한세상',
        views: '67만', 
        comments: '890', 
        duration: '0:45', 
        time: '4일 전',
        img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80', 
        description: '청년들과 함께 일하며 매일 활력을 찾는 81세 알바 할머니의 인생 이야기 #감동 #휴먼스토리 #할머니' 
    },
    { 
        id: 109, 
        title: '가짜 연기가 진짜가 되는 기상천외한 배우들의 비밀', 
        tag: '영화·드라마', 
        channel: '영화비하인드',
        views: '55만', 
        comments: '240', 
        duration: '0:29', 
        time: '5일 전',
        img: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&auto=format&fit=crop&q=80', 
        description: '영화 촬영장에서 명장면을 만들어낸 기상천외한 배우들의 연기 비하인드 #영화 #배우 #명장면' 
    },
    { 
        id: 110, 
        title: '돈이면 다 되는 줄 아는 금쪽이 엄마의 충격적인 결말', 
        tag: '이슈·사건', 
        channel: '사이다썰',
        views: '48만', 
        comments: '1,560', 
        duration: '0:38', 
        time: '5일 전',
        img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80', 
        description: '학교와 학원에서 갑질하던 학부모의 충격적인 반전 결말 사건 #사이다 #교육 #이슈 #사건' 
    },
];

const fallbackScriptInsights = [
    { id: 1, title: '초반 3초 훅(Hook)으로 이탈률 0% 만드는 오프닝 공식', source: '더우인 1위 분석', tag: '후킹 대본' },
    { id: 2, title: '궁금증 유발형 질문으로 댓글 1000개 유도하는 클로징', source: '인스타 릴스', tag: '인게이지먼트' },
    { id: 3, title: '비포 & 애프터 대조 구조로 몰입감 극대화하는 숏폼 기획', source: '유튜브 쇼츠', tag: '스토리텔링' },
    { id: 4, title: '전문 지식을 초등학생도 이해하게 만드는 비유 대본법', source: '지식 채널', tag: '대본 재창작' },
];

const Home = () => {
    const [stats, setStats] = useState<DashboardStats>({
        total_channels: 0,
        active_channels: 0,
        total_videos: 0,
        downloaded_today: 0
    });
    
    const [netStatus, setNetStatus] = useState<NetworkStatus | null>(null);
    const [isNetFetched, setIsNetFetched] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [channelsList, setChannelsList] = useState<ChannelItem[]>([]);
    const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
    const [galleryVideos, setGalleryVideos] = useState<VideoAssetItem[]>([]);
    const [scriptLabVideos, setScriptLabVideos] = useState<VideoAssetItem[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | '1d' | '3d' | '7d' | '30d'>('ALL');
    const [queueStats, setQueueStats] = useState<QueueStats>({
        total: 0,
        queued: 0,
        uploading: 0,
        completed: 0,
        failed: 0
    });
    const [recentQueueItems, setRecentQueueItems] = useState<any[]>([]);
    const [showNotice, setShowNotice] = useState(true);
    
    // 다중 선택 관리 상태 (Pixeling Style Multi-Selection)
    const [selectedVideoIds, setSelectedVideoIds] = useState<Set<number>>(new Set());
    
    // 단일 영상 상세 및 뷰어 팝업 모달 상태
    const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
    const navigate = useNavigate();

    const fetchNetworkStatus = async (force = false) => {
        try {
            const url = `/resources/network/status?t=${Date.now()}${force ? '&force=true' : ''}`;
            const netRes = await api.get(url).catch(() => null);
            if (netRes?.data) setNetStatus(netRes.data);
        } catch (e) {
            console.error("Error fetching network status:", e);
        } finally {
            setIsNetFetched(true);
        }
    };

    const handleRotateIp = async () => {
        setIsRotating(true);
        try {
            await api.post('/resources/network/rotate', { method: 'soft' });
            toast.success("LTE 프록시 IP 교체 명령 전달됨", {
                description: "네트워크 재설정 중... (새 공인 IP 감지 시 자동 갱신)"
            });
            setTimeout(async () => {
                setIsRotating(false);
                await fetchNetworkStatus(true);
            }, 1200);
        } catch (err: any) {
            setIsRotating(false);
            toast.error("IP 로테이션 실패", {
                description: err.response?.data?.detail || "네트워크 모듈 상태를 확인하세요."
            });
        }
    };

    const displayIp = (ip: string | null | undefined, fallback: string) => {
        if (!ip || ip.trim() === '' || ip.startsWith('오프라인') || ip === 'Unknown' || ip === 'fail' || ip === 'Not Detected') {
            return { text: isNetFetched ? fallback : '조회 중...', isPlaceholder: true };
        }
        return { text: ip, isPlaceholder: false };
    };

    const fetchData = async () => {
        try {
            const [statsRes, channelsRes, categoriesRes, queueStatsRes, queueItemsRes, videosRes, settingsRes] = await Promise.all([
                api.get('/dashboard/stats').catch(() => null),
                api.get('/channels/').catch(() => null),
                api.get('/categories/').catch(() => null),
                api.get('/work-queue/stats').catch(() => null),
                api.get('/work-queue/items?limit=5').catch(() => null),
                api.get('/videos/?mode=video').catch(() => null),
                api.get('/settings/').catch(() => null),
            ]);

            if (statsRes?.data) setStats(statsRes.data);
            if (channelsRes?.data) setChannelsList(channelsRes.data);
            if (categoriesRes?.data && Array.isArray(categoriesRes.data)) setCategoriesList(categoriesRes.data);
            if (queueStatsRes?.data) setQueueStats(queueStatsRes.data);
            if (settingsRes?.data) setSettings(settingsRes.data);
            if (queueItemsRes?.data && Array.isArray(queueItemsRes.data)) {
                setRecentQueueItems(queueItemsRes.data);
            }
            if (videosRes?.data && Array.isArray(videosRes.data)) {
                const rawVideos: VideoAssetItem[] = videosRes.data;
                const withVideo = rawVideos.filter(v => !v.is_script_only);
                const withScript = rawVideos.filter(v => v.extracted_text && v.extracted_text.trim().length > 0);
                
                setGalleryVideos(withVideo);
                setScriptLabVideos(withScript);
            }
            await fetchNetworkStatus();
        } catch (_) { }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    // 쇼츠 카드 선택 토글 함수
    const toggleSelectVideo = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setSelectedVideoIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // 전체 선택 / 해제 토글
    const handleToggleSelectAll = (allIds: number[]) => {
        if (selectedVideoIds.size === allIds.length) {
            setSelectedVideoIds(new Set());
        } else {
            setSelectedVideoIds(new Set(allIds));
        }
    };

    // 현재 필터링된 영상들 일괄 선택/해제 토글
    const handleToggleSelectFiltered = (targetIds: number[]) => {
        const isAllSelected = targetIds.length > 0 && targetIds.every(id => selectedVideoIds.has(id));
        setSelectedVideoIds(prev => {
            const next = new Set(prev);
            if (isAllSelected) {
                targetIds.forEach(id => next.delete(id));
            } else {
                targetIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    // 다중 영상 딸깍 자동 생성으로 이동 (자막 생성 / 더빙)
    const handleLaunchBatchDdalkkak = (tab: 'subtitle' | 'ttsdub' = 'subtitle') => {
        const selectedList = allShorts.filter(s => selectedVideoIds.has(s.id));
        const titles = selectedList.map(s => s.title).join(',');
        const videoUrls = selectedList.map(s => s.videoUrl || s.img).join(',');
        const actualCount = selectedList.length;
        
        toast.success(`선택한 ${actualCount}개 영상으로 딸깍 ${tab === 'subtitle' ? '자막 생성' : '대본+더빙'} 일괄 작업을 시작합니다!`);
        setSelectedVideoIds(new Set());
        navigate(`/ddalkkak?tab=${tab}&batch=true&titles=${encodeURIComponent(titles)}&videoUrls=${encodeURIComponent(videoUrls)}`);
    };

    // 단일 영상 딸깍 자동 생성 이동
    const handleSingleDdalkkak = (item: any, tab: 'subtitle' | 'ttsdub' = 'subtitle') => {
        const title = item.title || '';
        const videoUrl = item.videoUrl || getMediaUrl(item.file_path, settings?.root_download_path) || item.url || item.file_path || '';
        toast.info(`딸깍 ${tab === 'subtitle' ? '자막 자동 생성' : '대본 + 더빙'} 스튜디오로 이동합니다`, {
            description: `영상: "${title}"`
        });
        setSelectedVideo(null);
        navigate(`/ddalkkak?tab=${tab}&batch=true&titles=${encodeURIComponent(title)}&videoUrls=${encodeURIComponent(videoUrl)}`);
    };

    // 1단계: 수집 영상에서 대본 추출 및 AI 재창작으로 이동
    const handleGoToScriptLab = (item: any) => {
        toast.info("대본 추출 및 AI 재창작 스튜디오로 이동합니다", {
            description: `영상: "${item.title}"`
        });
        setSelectedVideo(null);
        navigate(`/script-lab?videoId=${item.id || ''}&title=${encodeURIComponent(item.title || '')}`);
    };

    // 2단계: 씬 커터로 컷팅 & 편집
    const handleGoToSceneCutter = (item: any) => {
        toast.info("씬 커터(다중 슬롯 컷팅)로 이동합니다", {
            description: `영상: "${item.title}"`
        });
        setSelectedVideo(null);
        navigate(`/scene-cutter-pro?videoId=${item.id || ''}`);
    };

    const isLteConnected = !!(netStatus?.monitor?.lte && netStatus.monitor.lte.status === 'Connected');

    // 채널 ID -> 채널 정보 매핑
    const channelMap = useMemo(() => {
        const map: Record<number, any> = {};
        channelsList.forEach(ch => { map[ch.id] = ch; });
        return map;
    }, [channelsList]);

    // 카테고리 ID -> 카테고리 정보 매핑
    const categoryMap = useMemo(() => {
        const map: Record<number, any> = {};
        categoriesList.forEach(cat => { map[cat.id] = cat; });
        return map;
    }, [categoriesList]);

    // 날짜 매칭 헬퍼 함수
    const matchDateFilter = (dateStr?: string, filter: string = 'ALL') => {
        if (filter === 'ALL' || !dateStr) return true;
        const itemDate = new Date(dateStr).getTime();
        if (isNaN(itemDate)) return true;
        const now = Date.now();
        const diffHours = (now - itemDate) / (1000 * 60 * 60);
        if (filter === '1d') return diffHours <= 24;
        if (filter === '3d') return diffHours <= 24 * 3;
        if (filter === '7d') return diffHours <= 24 * 7;
        if (filter === '30d') return diffHours <= 24 * 30;
        return true;
    };

    // 표시할 전체 숏폼 목록 (갤러리 비디오가 있으면 갤러리 영상의 실제 썸네일/스트리밍 주소 매핑)
    const allShorts = useMemo(() => {
        if (galleryVideos.length > 0) {
            return galleryVideos.map((v, idx) => {
                const fallback = fallbackTrendingShorts[idx % fallbackTrendingShorts.length];
                let realThumbUrl = getMediaUrl(v.thumbnail_path, settings?.root_download_path);
                if (!realThumbUrl && v.metadata_json?.thumbnail) {
                    realThumbUrl = getMediaUrl(v.metadata_json.thumbnail, settings?.root_download_path);
                }
                if (!realThumbUrl && v.video_id) {
                    realThumbUrl = `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`;
                }
                if (!realThumbUrl && v.url) {
                    const match = v.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
                    if (match && match[1]) {
                        realThumbUrl = `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
                    }
                }
                const realVideoUrl = getMediaUrl(v.file_path, settings?.root_download_path);
                
                // 실제 카테고리명 계산
                let catName = v.category || '';
                if (!catName && v.channel_id && channelMap[v.channel_id]) {
                    const ch = channelMap[v.channel_id];
                    if (ch.category_id && categoryMap[ch.category_id]) {
                        catName = categoryMap[ch.category_id].name;
                    }
                }
                if (!catName) catName = fallback.tag;

                // 조회수 포맷팅
                const viewCountNum = v.view_count || (v.metadata_json?.view_count ? Number(v.metadata_json.view_count) : 0);
                const viewsStr = viewCountNum > 0 
                    ? (viewCountNum >= 10000 ? `${(viewCountNum / 10000).toFixed(0)}만` : `${viewCountNum}`)
                    : fallback.views;

                const durationSec = v.duration_sec || v.duration || (v.metadata_json?.duration ? Number(v.metadata_json.duration) : 0);
                const durationStr = durationSec > 0 ? `0:${durationSec.toString().padStart(2, '0')}` : fallback.duration;
                const rawDate = v.upload_date || v.created_at || new Date(Date.now() - (idx * 24 * 3600 * 1000)).toISOString();

                return {
                    id: v.id,
                    rank: `#${idx + 1}`,
                    title: v.title || fallback.title,
                    tag: catName,
                    channel: v.metadata_json?.uploader || v.metadata_json?.channel_name || fallback.channel,
                    views: viewsStr,
                    comments: v.metadata_json?.comment_count ? `${v.metadata_json.comment_count}개` : fallback.comments,
                    duration: durationStr,
                    time: v.upload_date ? new Date(v.upload_date).toLocaleDateString() : fallback.time,
                    rawDate,
                    img: realThumbUrl || fallback.img,
                    videoUrl: realVideoUrl || v.url || '',
                    youtubeUrl: v.url || (v.video_id ? `https://www.youtube.com/watch?v=${v.video_id}` : ''),
                    description: v.extracted_text || (v.metadata_json?.description ? v.metadata_json.description.slice(0, 150) : fallback.description),
                    isRealAsset: true,
                    raw: v
                };
            });
        }
        return fallbackTrendingShorts.map((f, idx) => ({
            ...f,
            rank: `#${idx + 1}`,
            videoUrl: '',
            youtubeUrl: '',
            rawDate: new Date(Date.now() - (idx * 24 * 3600 * 1000)).toISOString(),
            isRealAsset: false,
            raw: f
        }));
    }, [galleryVideos, settings, channelMap, categoryMap]);

    // 고유 카테고리 목록 및 개수 집계
    const categoryStats = useMemo(() => {
        const counts: Record<string, number> = {};
        allShorts.forEach(s => {
            const cat = s.tag || '미분류';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [allShorts]);

    // 카테고리 + 날짜 필터링된 쇼츠 목록
    const filteredShorts = useMemo(() => {
        return allShorts.filter(s => {
            const matchCategory = selectedCategory === 'ALL' || s.tag === selectedCategory;
            const matchDate = matchDateFilter(s.rawDate, selectedDateFilter);
            return matchCategory && matchDate;
        });
    }, [allShorts, selectedCategory, selectedDateFilter]);

    const allShortIds = allShorts.map(s => s.id);
    const filteredShortIds = filteredShorts.map(s => s.id);


    return (
        <div className="animate-in fade-in duration-500 pb-20 md:pb-12 px-3 sm:px-6 pt-2.5 sm:pt-4 space-y-4 sm:space-y-5 bg-background text-foreground min-h-screen relative">

            {/* 1. 상단 공지 띠 배너 (컴팩트 슬림형) */}
            {showNotice && (
                <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-blue-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0">파이프라인</span>
                        <p className="truncate font-medium text-[11px] sm:text-xs">
                            [소재 소싱/갤러리] ➔ [대본 추출/AI 재창작] ➔ [⚡ 딸깍 일괄 자동 생성] ➔ [최종 완성본 작업 대기열 스텔스 배포]
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowNotice(false)} 
                        className="text-blue-700/60 hover:text-blue-900 dark:hover:text-blue-100 p-1 text-xs shrink-0 font-bold"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* 2. 히어로 배너: 바이럴루프 원클릭 파이프라인 진입점 (컴팩트 디자인) */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
                <div className="space-y-2 z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <Compass className="w-3 h-3" /> DISCOVERY & CREATIVE HUB
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                        오늘 어디서부터 볼지 먼저 정하고 들어가는 홈
                    </h2>
                    <p className="text-xs text-muted-foreground leading-normal">
                        소재 소싱부터 대본 추출, <strong>딸깍 다중 영상 일괄 생성</strong>, 최종 완성본 배포 대기열까지 단계별로 진행합니다.
                    </p>

                    {/* 빠른 진입 필터 태그 버튼들 */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <button 
                            onClick={() => navigate('/douyin-search')}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <Globe className="w-3.5 h-3.5" /> 더우인/쇼츠 수집
                        </button>
                        <button 
                            onClick={() => navigate('/gallery')}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> 수집 미디어 갤러리 ({stats.total_videos}개)
                        </button>
                        <button 
                            onClick={() => navigate('/ddalkkak')}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-500" /> ⚡ 딸깍 자동 생성
                        </button>
                        <button 
                            onClick={() => navigate('/script-lab')}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> 대본 추출 및 분석
                        </button>
                        <button 
                            onClick={() => navigate('/work-queue')}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 배포 대기열 ({queueStats.queued}건)
                        </button>
                    </div>
                </div>

                {/* 우측 웰컴 박스 (컴팩트형) */}
                <div className="w-full lg:w-64 bg-muted/40 border border-border/70 rounded-xl p-3 flex items-center gap-3 z-10 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground">GoGlobal [PRO] 님 환영합니다</p>
                        <p className="text-[10px] text-muted-foreground">스마트 숏폼 제작을 시작하세요.</p>
                    </div>
                </div>

                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* 3. 🔥 실시간 수집 숏폼 & 레퍼런스 갤러리 캐러셀 (카테고리 + 날짜 필터 & 다중 선택) */}
            <div className="space-y-2.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-rose-500" /> 실시간 트렌딩 쇼츠 ({filteredShorts.length}개)
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                            카테고리 및 수집 기간별로 모아보고, 우측 체크박스로 <strong>다중 선택하여 딸깍 일괄 생성</strong>합니다.
                        </p>
                    </div>

                    {/* 우측 일괄 선택 및 갤러리 이동 툴바 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {(selectedCategory !== 'ALL' || selectedDateFilter !== 'ALL') && (
                            <button 
                                onClick={() => handleToggleSelectFiltered(filteredShortIds)}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <CheckSquare className="w-3 h-3" />
                                {filteredShortIds.length > 0 && filteredShortIds.every(id => selectedVideoIds.has(id))
                                    ? '필터 결과 해제'
                                    : `필터 결과 (${filteredShortIds.length}개) 일괄 선택`}
                            </button>
                        )}
                        <button 
                            onClick={() => handleToggleSelectAll(allShortIds)}
                            className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                            {selectedVideoIds.size === allShortIds.length ? '전체 해제' : '전체 선택'}
                        </button>
                        <span className="text-muted-foreground/60 text-xs">·</span>
                        <Link to="/gallery" className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                            갤러리 더보기 <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

                {/* 🏷️ 통합 스마트 필터 바 (카테고리 탭 + 날짜 퀵 필터 세그먼트) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-card border border-border/70">
                    
                    {/* 카테고리 탭 */}
                    <div className="flex items-center gap-1 overflow-x-auto dashboard-scroll-area select-none pb-0.5 sm:pb-0">
                        <button
                            onClick={() => setSelectedCategory('ALL')}
                            className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1",
                                selectedCategory === 'ALL'
                                    ? "bg-primary text-white shadow-2xs"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span>전체</span>
                            <span className={cn(
                                "px-1 rounded-full text-[9px]",
                                selectedCategory === 'ALL' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {allShorts.length}
                            </span>
                        </button>

                        {Object.entries(categoryStats).map(([catName, count]) => {
                            const isCatSelected = selectedCategory === catName;
                            return (
                                <button
                                    key={catName}
                                    onClick={() => setSelectedCategory(catName)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1",
                                        isCatSelected
                                            ? "bg-primary text-white shadow-2xs"
                                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <span>{catName}</span>
                                    <span className={cn(
                                        "px-1 rounded-full text-[9px]",
                                        isCatSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* 📅 수집 기간 필터 세그먼트 (1일, 3일, 7일, 전체) */}
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg shrink-0 self-start sm:self-auto border border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground px-1.5">📅 기간:</span>
                        {[
                            { id: 'ALL', label: '전체' },
                            { id: '1d', label: '최근 1일' },
                            { id: '3d', label: '최근 3일' },
                            { id: '7d', label: '최근 7일' },
                        ].map((d) => (
                            <button
                                key={d.id}
                                onClick={() => setSelectedDateFilter(d.id as any)}
                                className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
                                    selectedDateFilter === d.id
                                        ? "bg-background text-foreground shadow-2xs border border-border/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>

                </div>

                {/* 9:16 스마트폰 숏폼 가로 스크롤 컨테이너 (컴팩트 230px 높이) */}
                <div className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-0.5 dashboard-scroll-area select-none snap-x">
                    {filteredShorts.length > 0 ? (
                        filteredShorts.map((item) => {
                            const isSelected = selectedVideoIds.has(item.id);
                            return (
                                <div 
                                    key={item.id}
                                    onClick={() => setSelectedVideo(item)}
                                    className={cn(
                                        "w-[135px] sm:w-[150px] h-[235px] sm:h-[250px] shrink-0 rounded-xl bg-slate-900 border overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between p-2 relative group snap-start select-none",
                                        isSelected 
                                            ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" 
                                            : "border-border/80 hover:border-primary/50"
                                    )}
                                >
                                    {/* 배경 미디어 레이어 */}
                                    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
                                        {item.img ? (
                                            <img
                                                src={item.img}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    if (img.src.includes('maxresdefault.jpg')) {
                                                        img.src = img.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
                                                    } else if (img.src.includes('hqdefault.jpg')) {
                                                        img.src = img.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                                                    } else {
                                                        img.style.display = 'none';
                                                    }
                                                }}
                                            />
                                        ) : item.videoUrl ? (
                                            <video
                                                src={item.videoUrl + "#t=0.1"}
                                                className="w-full h-full object-cover"
                                                muted
                                                preload="metadata"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                                                <Play className="w-6 h-6 opacity-30" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/75 pointer-events-none" />
                                    </div>
                                    {/* 상단 랭킹 배지 & 카테고리 태그 & 다중 선택 체크박스 */}
                                    <div className="flex items-center justify-between w-full z-10 gap-1">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <span className="bg-black/75 backdrop-blur-xs text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-white/20 shadow-2xs shrink-0">
                                                {item.rank}
                                            </span>
                                            <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-white/10 truncate">
                                                {item.tag}
                                            </span>
                                        </div>
                                        
                                        {/* 원형 체크박스 토글 */}
                                        <button 
                                            onClick={(e) => toggleSelectVideo(e, item.id)}
                                            className={cn(
                                                "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-150 shadow-sm shrink-0",
                                                isSelected 
                                                    ? "bg-primary border-primary text-white scale-105" 
                                                    : "bg-black/40 border-white/60 hover:bg-black/70 hover:border-white text-transparent group-hover:text-white/60"
                                            )}
                                            title={isSelected ? "선택 해제" : "다중 작업에 추가"}
                                        >
                                            <CheckCircle2 className={cn("w-3.5 h-3.5", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                                        </button>
                                    </div>

                                    {/* 중앙 재생 호버 버튼 */}
                                    <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm border border-white/50 flex items-center justify-center mx-auto opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-200 shadow-md">
                                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                    </div>

                                    {/* 하단 타이틀 & 조회수 & 수집일 */}
                                    <div className="space-y-0.5 z-10">
                                        <h4 className="text-[11px] font-bold text-white line-clamp-2 leading-snug drop-shadow-xs">
                                            {item.title}
                                        </h4>
                                        <div className="flex items-center justify-between text-[9px] text-white/80 font-medium pt-0.5">
                                            <span>{item.views}</span>
                                            <span className="text-emerald-400 font-bold">{item.time}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="w-full py-8 text-center text-xs text-muted-foreground bg-card border border-border/80 rounded-xl">
                            선택하신 조건(카테고리: '{selectedCategory}', 기간: '{selectedDateFilter}')에 해당하는 수집 영상이 없습니다.
                        </div>
                    )}
                </div>
            </div>



            {/* 4. 하단 4열 통합 인텔리전스 워크플로우 위젯 (컴팩트 카드) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                
                {/* 1열: 📁 [1단계] 수집 미디어 갤러리 */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> 수집 미디어 갤러리
                            </h3>
                            <Link to="/gallery" className="text-[11px] font-semibold text-primary hover:underline">
                                전체보기
                            </Link>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground mb-2">
                            최근 크롤링 및 다운로드된 원본 레퍼런스
                        </p>
                        <div className="space-y-1.5">
                            {galleryVideos.length > 0 ? (
                                galleryVideos.slice(0, 4).map((v, idx) => (
                                    <div 
                                        key={v.id} 
                                        onClick={() => handleSingleDdalkkak(v, 'subtitle')}
                                        className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors cursor-pointer group"
                                        title="클릭 시 딸깍 자동 생성으로 이동"
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[11px] font-bold font-mono text-muted-foreground w-3 text-center">{idx + 1}</span>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">{v.title || '(제목 없음)'}</p>
                                                <p className="text-[9.5px] text-muted-foreground">{v.category || '일반'} · 레퍼런스</p>
                                            </div>
                                        </div>
                                        <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 shrink-0">
                                            ⚡ 딸깍
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-[11px] text-muted-foreground space-y-1.5">
                                    <p>수집된 영상이 없습니다.</p>
                                    <Link to="/douyin-search" className="inline-block text-[10px] font-bold text-primary hover:underline">
                                        더우인/쇼츠 수집하러 가기 ➔
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                    <Link to="/gallery" className="mt-2.5 pt-2 border-t border-border/60 text-[11px] font-bold text-center text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                        보관함 전체 ({stats.total_videos}개) 관리 <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* 2열: 📝 [2단계] 대본 추출 및 분석 연구소 */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> 대본 추출 & 분석
                            </h3>
                            <Link to="/script-lab" className="text-[11px] font-semibold text-primary hover:underline">
                                스크립트 랩
                            </Link>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground mb-2">
                            영상에서 추출한 텍스트 & 바이럴 후킹 분석
                        </p>
                        <div className="space-y-1.5">
                            {(scriptLabVideos.length > 0 ? scriptLabVideos : fallbackScriptInsights).slice(0, 4).map((item: any, idx) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => navigate(`/script-writer?topic=${encodeURIComponent(item.title || '')}`)}
                                    className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors cursor-pointer group bg-muted/30"
                                    title="클릭하면 이 대본을 기반으로 AI 쇼츠 대본을 재창작합니다."
                                >
                                    <div className="flex items-start gap-1.5">
                                        <span className="text-[11px] font-bold text-indigo-500 shrink-0 w-3">{idx + 1}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-bold text-foreground truncate group-hover:text-indigo-600 transition-colors">
                                                {item.title}
                                            </p>
                                            <div className="flex items-center justify-between text-[9.5px] text-muted-foreground mt-0.5">
                                                <span>{item.source || 'STT 추출 대본'}</span>
                                                <span className="text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                    ✨ AI 재창작 ➔
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Link to="/script-writer" className="mt-2.5 pt-2 border-t border-border/60 text-[11px] font-bold text-center text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                        새 AI 대본 작성하기 <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* 3열: ⚡ [4단계] 최종 완성본 자동화 배포 대기열 */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-emerald-500" /> 최종 배포 작업 대기열
                            </h3>
                            <Link to="/work-queue" className="text-[11px] font-semibold text-primary hover:underline">
                                대기열 이동
                            </Link>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground mb-2">
                            편집 완료 영상의 다중 소셜 스텔스 업로드
                        </p>
                        <div className="space-y-1.5">
                            {recentQueueItems.length > 0 ? (
                                recentQueueItems.map((item, idx) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => navigate('/work-queue')}
                                        className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[11px] font-bold font-mono text-muted-foreground w-3 text-center">{idx + 1}</span>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-foreground truncate">{item.title || '(제목 없음)'}</p>
                                                <p className="text-[9.5px] text-muted-foreground">
                                                    {item.source_type === 'PIXELING' ? '🎨 픽셀링' : '🎬 렌더링'} · {item.upload_method === 'BROWSER_AUTO' ? '스텔스 자동' : '수동'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                                            {item.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="p-5 text-center text-xs text-muted-foreground">대기 중인 배포 영상이 없습니다.</div>
                            )}
                        </div>
                    </div>
                    <Link to="/work-queue" className="mt-3 pt-2.5 border-t border-border/60 text-xs font-bold text-center text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                        전체 배포 관제 ({queueStats.total}개) <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {/* 4열: 🛡️ LTE 스텔스 보안 네트워크 위젯 */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                <Wifi className="w-4 h-4 text-indigo-500" /> 프록시 보안 격리
                            </h3>
                            <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.2 rounded",
                                isLteConnected ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                            )}>
                                {isLteConnected ? "SECURE" : "UNPROTECTED"}
                            </span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="p-2 bg-muted/40 rounded-xl space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground">LTE 채널 업로드 전용 IP</p>
                                <p className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                    {displayIp(netStatus?.mobile_public_ip, isLteConnected ? '조회 중...' : '미연결').text}
                                </p>
                            </div>
                            <div className="p-2 bg-muted/40 rounded-xl space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground">시스템 일반 IP (Wi-Fi)</p>
                                <p className="font-mono text-xs font-semibold text-foreground/80 truncate">
                                    {displayIp(netStatus?.system_public_ip, '미조회').text}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleRotateIp}
                        disabled={isRotating}
                        className="mt-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-500", isRotating && "animate-spin")} />
                        LTE IP 강제 로테이션
                    </button>
                </div>

            </div>

            {/* 5. 🎯 하단 플로팅 액션 바 (Pixeling Style Floating Action Bar for Batch Ddalkkak) */}
            {selectedVideoIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-lg sm:w-auto bg-card/95 text-card-foreground backdrop-blur-md border border-border rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xl flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center gap-1.5 sm:gap-2 border-r border-border pr-2.5 sm:pr-4 shrink-0">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-white text-[11px] sm:text-xs font-bold flex items-center justify-center">
                            {selectedVideoIds.size}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-foreground">개 선택</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
                        <button 
                            onClick={() => handleLaunchBatchDdalkkak('subtitle')}
                            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[11px] sm:text-xs px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 shadow-md flex-1 sm:flex-initial"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span className="truncate">⚡ 자막 일괄 생성</span>
                        </button>
                        <button 
                            onClick={() => handleLaunchBatchDdalkkak('ttsdub')}
                            className="bg-muted hover:bg-muted/80 active:scale-95 text-foreground font-bold text-[11px] sm:text-xs px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all border border-border flex items-center justify-center gap-1 sm:gap-1.5 flex-1 sm:flex-initial"
                        >
                            <Radio className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">🎙️ 대본+더빙</span>
                        </button>
                    </div>

                    <button 
                        onClick={() => setSelectedVideoIds(new Set())}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-lg shrink-0"
                        title="선택 취소"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 6. 📱 대형 9:16 쇼츠 상세 & 플레이어 팝업 모달 (Pixeling Original Modal Style) */}
            {selectedVideo && (
                <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
                    <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[780px] p-0 bg-card border border-border text-foreground overflow-hidden rounded-2xl flex flex-col md:flex-row shadow-2xl">
                        <DialogHeader className="sr-only">
                            <DialogTitle>{selectedVideo.title || '쇼츠 상세 정보'}</DialogTitle>
                            <DialogDescription>{selectedVideo.description || '선택한 숏폼 영상의 세부 정보 및 딸깍 제작 옵션'}</DialogDescription>
                        </DialogHeader>
                        
                        {/* 좌측: 9:16 비디오 플레이어 영역 */}
                        <div className="w-full md:w-[48%] h-[45%] md:h-full bg-black relative flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-border">
                            {selectedVideo.videoUrl && !selectedVideo.videoUrl.startsWith('http') && selectedVideo.videoUrl.includes('/api/files/stream') ? (
                                <video 
                                    src={selectedVideo.videoUrl} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    playsInline
                                    className="w-full h-full object-contain bg-black"
                                    onError={(e) => {
                                        console.warn("Local video play error, showing fallback view");
                                    }}
                                />
                            ) : selectedVideo.youtubeUrl && (selectedVideo.youtubeUrl.includes('youtube.com') || selectedVideo.youtubeUrl.includes('youtu.be')) ? (
                                <iframe
                                    src={`https://www.youtube.com/embed/${new URL(selectedVideo.youtubeUrl).searchParams.get('v') || selectedVideo.youtubeUrl.split('/').pop()}?autoplay=1&mute=0`}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : selectedVideo.videoUrl && selectedVideo.videoUrl.startsWith('http') ? (
                                <video 
                                    src={selectedVideo.videoUrl} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    playsInline
                                    className="w-full h-full object-contain bg-black"
                                />
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img 
                                        src={selectedVideo.img} 
                                        alt={selectedVideo.title} 
                                        className="w-full h-full object-cover opacity-60 filter blur-xs scale-105" 
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center mb-3 shadow-lg">
                                            <Play className="w-7 h-7 text-white fill-white ml-1" />
                                        </div>
                                        <p className="text-xs font-bold text-white/90">레퍼런스 쇼츠 스트리밍 준비됨</p>
                                        <span className="text-[10px] text-white/60 mt-1">길이: {selectedVideo.duration} · {selectedVideo.views} 조회</span>
                                    </div>
                                </div>
                            )}

                            {/* 상단 퀵 뱃지 */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
                                <span className="bg-primary text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
                                    {selectedVideo.rank} 급상승
                                </span>
                                <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                                    {selectedVideo.tag}
                                </span>
                            </div>
                        </div>

                        {/* 우측: 상세 메타데이터 & 바이럴루프 제작 액션 패널 */}
                        <div className="w-full md:w-[52%] h-[55%] md:h-full p-4 sm:p-6 overflow-y-auto flex flex-col justify-between space-y-4 bg-card text-card-foreground">
                            <div className="space-y-4">
                                
                                {/* 타이틀 및 채널 */}
                                <div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                        <span>채널: <strong className="text-foreground">{selectedVideo.channel || '트렌딩 크리에이터'}</strong></span>
                                        <span>{selectedVideo.time || '1일 전'}</span>
                                    </div>
                                    <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-foreground leading-snug">
                                        {selectedVideo.title}
                                    </h3>
                                </div>

                                {/* 메트릭 4분할 그리드 (Pixeling Metric Cards) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                                        <p className="text-[10px] text-muted-foreground">조회수</p>
                                        <p className="text-xs font-extrabold text-foreground mt-0.5">{selectedVideo.views}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                                        <p className="text-[10px] text-muted-foreground">댓글수</p>
                                        <p className="text-xs font-extrabold text-foreground mt-0.5">{selectedVideo.comments || '450개'}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                                        <p className="text-[10px] text-muted-foreground">영상 길이</p>
                                        <p className="text-xs font-extrabold text-foreground mt-0.5">{selectedVideo.duration}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                                        <p className="text-[10px] text-muted-foreground">상태</p>
                                        <p className="text-xs font-extrabold text-emerald-500 mt-0.5">수집완료</p>
                                    </div>
                                </div>

                                {/* 설명 & 해시태그 박스 */}
                                <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground space-y-1.5">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">영상 설명 및 태그</p>
                                    <p className="leading-relaxed line-clamp-3 text-[11px] text-muted-foreground">
                                        {selectedVideo.description}
                                    </p>
                                </div>

                                {/* 수집 기록 및 성과 분석 */}
                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                                        <span>📊 AI 바이럴 점수 분석</span>
                                        <span className="text-emerald-500">상위 1.2%</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-normal">
                                        초반 3초 시청 유지율 78% 기록. 딸깍 자막 또는 AI 더빙으로 재가공 시 높은 도달률이 예상됩니다.
                                    </p>
                                </div>

                            </div>

                            {/* 하단 바이럴루프 원클릭 제작 액션 버튼 바 */}
                            <div className="space-y-2 pt-2 border-t border-border">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        onClick={() => handleSingleDdalkkak(selectedVideo, 'subtitle')}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md"
                                    >
                                        <Zap className="w-3.5 h-3.5 text-amber-300" /> ⚡ 딸깍 자막 자동 생성
                                    </Button>
                                    <Button 
                                        onClick={() => handleSingleDdalkkak(selectedVideo, 'ttsdub')}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md"
                                    >
                                        <Radio className="w-3.5 h-3.5 text-purple-200" /> 🎙️ 딸깍 대본+더빙
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleGoToScriptLab(selectedVideo)}
                                        className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 대본 추출 & AI 재창작
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleGoToSceneCutter(selectedVideo)}
                                        className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl"
                                    >
                                        <Scissors className="w-3.5 h-3.5 text-amber-400" /> ✂️ 씬 커터로 컷팅
                                    </Button>
                                </div>
                            </div>

                        </div>

                    </DialogContent>
                </Dialog>
            )}

        </div>
    );
};

export default Home;




