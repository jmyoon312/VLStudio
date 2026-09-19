
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
    DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Globe, Plus, Trash2, ExternalLink, RefreshCw,
    Camera, Music2, Brain, Link, HelpCircle, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
interface BrowserProfile {
    id: string;
    name: string;
    user_data_dir: string;
    created_at: string;
    tiktok_count: number;
    insta_count: number;
    notebooklm_count: number;
    douyin_count: number;
}

interface SocialAccountsManagerProps {
    profileId?: string; // Optional context if needed
    compact?: boolean;
}

const SocialAccountsManager: React.FC<SocialAccountsManagerProps> = ({ profileId, compact = false }) => {

    const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");
    
    // YouTube Sync Modal State
    const [isSyncOpen, setIsSyncOpen] = useState(false);
    const [syncChannelId, setSyncChannelId] = useState("");
    const [youtubeChannels, setYoutubeChannels] = useState<{channel_id: string, channel_name: string, account_email?: string, owner_profile_id?: string}[]>([]);

    // Douyin Guide Modal State
    const [isDouyinGuideOpen, setIsDouyinGuideOpen] = useState(false);

    // NotebookLM Modal State
    const [isNotebookLMOpen, setIsNotebookLMOpen] = useState(false);
    const [notebookLMEmail, setNotebookLMEmail] = useState("");
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const endpoint = profileId 
                ? `/api/browser-profiles?parent_brand_id=${profileId}` 
                : '/api/browser-profiles';
            const res = await axios.get(endpoint);
            setProfiles(res.data);
        } catch (error) {
            console.error("Failed to fetch profiles:", error);
            toast.error("프로필 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    useEffect(() => {
        if (isSyncOpen) {
            axios.get('/api/youtube/all?registered_only=true')
                .then(res => {
                    const valid = (res.data || []).filter((ch: any) => ch.owner_profile_id || ch.account_email);
                    setYoutubeChannels(valid);
                })
                .catch(err => console.error("Failed to load YouTube channels:", err));
        }
    }, [isSyncOpen]);

    const handleCreateProfile = async () => {
        if (!newProfileName.trim()) return;
        try {
            await axios.post('/api/browser-profiles/', { 
                name: newProfileName,
                parent_brand_id: profileId || null
            });
            toast.success("브라우저 프로필이 생성되었습니다.");
            setNewProfileName("");
            setIsAddOpen(false);
            fetchProfiles();
        } catch (error) {
            toast.error("프로필 생성 실패");
        }
    };

    const handleDeleteProfile = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까? 연결된 소셜 계정 정보도 함께 삭제됩니다.")) return;
        try {
            await axios.delete(`/api/browser-profiles/${id}`);
            toast.success("프로필이 삭제되었습니다.");
            fetchProfiles();
        } catch (error) {
            toast.error("삭제 실패");
        }
    };
    const handleLaunchProfile = async (id: string, name: string) => {
        try {
            await axios.post(`/api/browser-profiles/${id}/launch`);
            toast.success(`${name} 브라우저를 실행했습니다.`);
        } catch (error) {
            console.error("Failed to launch profile:", error);
            toast.error("브라우저 실행 실패: 백인드 서버 연결을 확인하세요.");
        }
    };
    const handleOpenNotebookLMModal = (profileId: string) => {
        setSelectedProfileId(profileId);
        setNotebookLMEmail("");
        setIsNotebookLMOpen(true);
    };

    const handleLinkIntelligence = async () => {
        if (!selectedProfileId || !notebookLMEmail.trim()) return;
        try {
            await axios.post('/api/notebooklm-accounts', { id: notebookLMEmail, browser_profile_id: selectedProfileId });
            toast.success("NotebookLM 계정이 연동되었습니다.");
            setIsNotebookLMOpen(false);
            fetchProfiles();
        } catch (error) {
            toast.error("연동 실패: 이미 등록된 계정이거나 통신 오류입니다.");
        }
    };

    const handleSyncYouTubeChannel = async () => {
        if (!syncChannelId.trim()) return;
        if (!syncChannelId.startsWith('UC') || syncChannelId.length !== 24) {
            toast.error("유효한 유튜브 채널 ID(UC...)를 입력해주세요.");
            return;
        }
        
        try {
            await axios.post('/api/browser-profiles/sync-youtube', { youtube_channel_id: syncChannelId });
            toast.success("유튜브 채널이 프로필로 연동되었습니다.");
            setIsSyncOpen(false);
            setSyncChannelId("");
            fetchProfiles();
        } catch (error: any) {
            if (error.response?.status === 404) {
                toast.error("등록되지 않은 유튜브 채널 ID입니다. (먼저 채널을 위임/등록하세요)");
            } else {
                toast.error("연동 실패: 서버 오류가 발생했습니다.");
            }
        }
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2 text-xs">
                {loading ? (
                    <span className="text-slate-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> 로딩중...</span>
                ) : profiles.length === 0 ? (
                    <span className="text-slate-400">생성된 프로필 없음</span>
                ) : (
                    profiles.map(profile => (
                        <Button 
                            key={profile.id} 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-2 text-[11px] bg-white hover:bg-slate-50"
                            onClick={() => handleLaunchProfile(profile.id, profile.name)}
                            title={`${profile.name} 브라우저 열기`}
                        >
                            <ExternalLink className="w-3 h-3 mr-1 text-slate-400" />
                            {profile.name}
                        </Button>
                    ))
                )}
                
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Plus className="w-3 h-3 mr-1" />
                            추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 빈 브라우저 프로필 생성</DialogTitle>
                            <DialogDescription>예: "게임 채널용", "일상 브랜드용" 등 용도에 맞는 이름을 입력하세요.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input placeholder="프로필 이름 입력..." value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>취소</Button>
                            <Button onClick={handleCreateProfile}>생성</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="space-y-1.5">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                        <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" />
                        소셜 미디어 계정 관리 (Browser Profiles)
                    </h2>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                        틱톡, 인스타그램 등 다중 계정을 위한 브라우저 프로필을 격리 관리합니다.
                    </p>
                    <div className="pt-0.5">
                        <span className="inline-block text-amber-600 dark:text-amber-400 font-medium text-xs border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                            💡 권장: 유튜브 브랜드 채널과 연동하여 동일한 브라우저 환경을 유지하세요.
                        </span>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <div className="grid grid-cols-2 sm:flex items-center gap-2">
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-9 px-3.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs">
                                    <Plus className="w-4 h-4 mr-1.5 shrink-0" />
                                    빈 프로필 생성
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border text-foreground">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground font-bold">새 빈 브라우저 프로필 생성</DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        더우인, 틱톡, 인스타그램, 웨이보 등 독립된 소셜 플랫폼 전용이거나, 등록된 구글 계정과 분리된 새 브라우저 환경을 구축할 때 생성하세요.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Input
                                        placeholder="예: 더우인 수집용 1호, 인스타 부계정용..."
                                        value={newProfileName}
                                        onChange={(e) => setNewProfileName(e.target.value)}
                                        className="bg-muted/50 border-border text-foreground"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>취소</Button>
                                    <Button onClick={handleCreateProfile} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">생성</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isSyncOpen} onOpenChange={setIsSyncOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-9 px-3.5 text-xs font-bold border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 shadow-2xs">
                                    <Link className="w-4 h-4 mr-1.5 shrink-0" />
                                    유튜브 채널 연동
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border text-foreground">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground font-bold">유튜브 채널과 프로필 연동</DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        등록된 구글 계정의 유튜브 브랜드 채널과 동일한 브라우저 쿠키를 사용하도록 연동합니다.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Select value={syncChannelId} onValueChange={setSyncChannelId}>
                                        <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                            <SelectValue placeholder="연동할 유튜브 채널을 선택하세요" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border text-foreground">
                                            {youtubeChannels.length === 0 ? (
                                                <div className="p-3 text-center text-xs text-muted-foreground">
                                                    연동 가능한 등록 구글 채널이 없습니다.<br />(틴캔 보관함에서 먼저 구글 계정 및 채널을 연동하세요)
                                                </div>
                                            ) : (
                                                youtubeChannels.map((ch) => (
                                                    <SelectItem key={ch.channel_id} value={ch.channel_id} className="cursor-pointer">
                                                        <div className="flex items-center justify-between gap-3 w-full">
                                                            <span className="font-semibold text-foreground">{ch.channel_name}</span>
                                                            {ch.account_email && (
                                                                <span className="text-[11px] text-muted-foreground font-mono">({ch.account_email})</span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsSyncOpen(false)}>취소</Button>
                                    <Button onClick={handleSyncYouTubeChannel} disabled={!syncChannelId} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">연동하기</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Dialog open={isDouyinGuideOpen} onOpenChange={setIsDouyinGuideOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground border-border hover:bg-muted/60 shadow-2xs">
                                <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" />
                                더우인(Douyin) 가입 가이드
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-card border-border text-foreground shadow-2xl p-4 sm:p-6">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
                                    <Smartphone className="w-5 h-5 text-primary" />
                                    더우인(Douyin) 웨이보 연동 가입 및 쿠키 수집 가이드
                                </DialogTitle>
                                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                                    현재 더우인은 해외(+82 한국) 전화번호 직접 가입/인증이 차단되었습니다. 따라서 한국 번호 SMS 인증이 원활한 <b>웨이보(Weibo)</b>를 통해 소셜 로그인으로 우회 연동해야 합니다.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-3 space-y-4 text-xs sm:text-sm max-h-[60vh] overflow-y-auto pr-2">
                                <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-1.5">
                                    <h3 className="font-bold text-foreground">1단계: 웨이보(Weibo, 微博) 가입 (한국 번호 지원)</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        • 모바일 앱스토어/구글 플레이에서 <b>'Weibo'</b> (또는 Weibo International) 앱을 설치하거나 모바일 웹(<a href="https://weibo.com" target="_blank" rel="noreferrer" className="text-primary underline">weibo.com</a>)에 접속합니다.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        • 국가번호를 <b>+82 (한국)</b>으로 선택하고 본인 휴대폰 번호(맨 앞자리 0 제외, 예: 1012345678)로 SMS 인증을 받아 웨이보 계정을 생성합니다.
                                    </p>
                                </div>
                                <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-1.5">
                                    <h3 className="font-bold text-foreground">2단계: 더우인(Douyin) 앱에서 웨이보로 연동 로그인</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        • 모바일 더우인(抖音) 앱을 실행합니다. <br />
                                        <span className="text-[11px] text-muted-foreground/80">※ 안드로이드: <a href="https://douyin.com" target="_blank" rel="noreferrer" className="text-primary underline">douyin.com</a> APK 다운로드 / iOS: App Store 국가를 '중국 본토'로 변경 후 '抖音' 설치</span>
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        • 로그인 화면에서 <b>기타 로그인 방식(其他登录方式)</b> ➔ <b>웨이보(微博) 아이콘</b>을 터치합니다.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        • 웨이보 앱 연동 승인 창에서 <b>[동의 및 로그인(授权并登录)]</b>을 누르면 더우인 계정이 즉시 생성되어 자동 로그인됩니다.
                                    </p>
                                </div>
                                <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-1.5">
                                    <h3 className="font-bold text-foreground">3단계: ViraLoop PC 프로필에 더우인 연동 (QR 로그인)</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        1. 상단 <b>[+ 빈 프로필 생성]</b> 버튼을 눌러 "더우인 전용" 프로필을 생성합니다.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        2. 프로필의 <b>[브라우저 열기 (로그인)]</b>를 클릭하여 <b>douyin.com</b>에 접속합니다.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        3. 더우인 웹 화면 우측 상단의 <b>[로그인(登录)]</b> 클릭 후 노출되는 QR 코드를 확인합니다.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        4. 모바일 더우인 앱 상단 <b>QR 스캐너([ — ])</b>로 PC의 QR 코드를 스캔하고 모바일에서 <b>[로그인 확인(确认登录)]</b>을 승인합니다.
                                    </p>
                                </div>
                                <div className="bg-primary/10 border border-primary/25 rounded-xl p-3 text-xs text-foreground/90 space-y-1">
                                    <p className="font-bold text-primary">💡 핵심 팁 & 플랫폼 확장</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        • 한번 연동해둔 프로필은 브라우저를 닫아도 ViraLoop 봇이 쿠키를 자동 활용하여 로그인 상태로 고속 수집을 수행합니다.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        • 웨이보 계정 하나로 더우인뿐만 아니라 샤오홍슈(Xiaohongshu), 콰이쇼우(Kuaishou) 등 중국 주요 플랫폼에 모두 원클릭 로그인할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => setIsDouyinGuideOpen(false)}>닫기</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map(profile => (
                    <Card key={profile.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{profile.name}</CardTitle>
                                    <CardDescription className="text-xs truncate" title={profile.id}>
                                        ID: {profile.id.substring(0, 8)}...
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 -mt-2 -mr-2"
                                    onClick={() => handleDeleteProfile(profile.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Launch Button */}
                            <Button
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => handleLaunchProfile(profile.id, profile.name)}
                            >
                                <span className="flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    브라우저 열기 (로그인)
                                </span>
                            </Button>

                            {/* Linked Accounts Preview */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-semibold text-slate-500">연결된 계정 상태</p>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-indigo-500 hover:text-indigo-700" onClick={() => handleOpenNotebookLMModal(profile.id)}>
                                        <Plus className="w-3 h-3 mr-1" /> 연동 추가
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant={profile.tiktok_count > 0 ? "default" : "secondary"} className={`text-[10px] ${profile.tiktok_count > 0 ? 'bg-black' : 'bg-slate-100 text-slate-600'}`}>
                                        <Music2 className="w-3 h-3 mr-1" />
                                        Music {profile.tiktok_count > 0 ? `(${profile.tiktok_count})` : '미연결'}
                                    </Badge>
                                    <Badge variant={profile.insta_count > 0 ? "default" : "secondary"} className={`text-[10px] ${profile.insta_count > 0 ? 'bg-pink-500' : 'bg-slate-100 text-slate-600'}`}>
                                        <Camera className="w-3 h-3 mr-1" />
                                        Camera {profile.insta_count > 0 ? `(${profile.insta_count})` : '미연결'}
                                    </Badge>
                                    <Badge variant={profile.notebooklm_count > 0 ? "default" : "secondary"} className={`text-[10px] ${profile.notebooklm_count > 0 ? 'bg-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                        <Brain className="w-3 h-3 mr-1" />
                                        NotebookLM {profile.notebooklm_count > 0 ? `(${profile.notebooklm_count})` : '미연결'}
                                    </Badge>
                                    <Badge variant={profile.douyin_count > 0 || profile.id ? "secondary" : "secondary"} className={`text-[10px] ${profile.douyin_count > 0 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        <Smartphone className="w-3 h-3 mr-1" />
                                        Douyin (수집가능)
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {profiles.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border/80 p-6 shadow-xs">
                        <Globe className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                        <p className="text-sm font-medium text-foreground">생성된 브라우저 프로필이 없습니다.</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">소셜 미디어(틱톡, 인스타, 더우인) 계정 격리를 위해 프로필을 생성하세요.</p>
                        <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)} className="text-xs font-bold">
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            첫 프로필 생성하기
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialAccountsManager;
