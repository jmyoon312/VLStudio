
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
    Chrome, Plus, Trash2, ExternalLink, RefreshCw,
    Instagram, Music2, Brain, Link
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
}

interface SocialAccountsManagerProps {
    profileId?: string; // Optional context if needed
}

const SocialAccountsManager: React.FC<SocialAccountsManagerProps> = () => {
    const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/browser-profiles');
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

    const handleCreateProfile = async () => {
        if (!newProfileName.trim()) return;
        try {
            await axios.post('/api/browser-profiles', { name: newProfileName });
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
            await axios.post('/api/browser-profiles/launch', { id });
            toast.success(`${name} 브라우저를 실행했습니다.`);
        } catch (error) {
            console.error("Failed to launch profile:", error);
            toast.error("브라우저 실행 실패: 백인드 서버 연결을 확인하세요.");
        }
    };
    const handleLinkIntelligence = async (profileId: string) => {
        const email = prompt("연동할 NotebookLM 계정(이메일)을 입력하세요:");
        if (!email) return;
        try {
            await axios.post('/api/notebooklm-accounts', { id: email, browser_profile_id: profileId });
            toast.success("NotebookLM 계정이 연동되었습니다.");
            fetchProfiles();
        } catch (error) {
            toast.error("연동 실패: 이미 등록된 계정이거나 통신 오류입니다.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Chrome className="w-6 h-6 text-blue-500" />
                        소셜 미디어 계정 관리 (Browser Profiles)
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        틱톡, 인스타그램 등 다중 계정을 위한 독립된 브라우저 프로필을 관리합니다.<br />
                        각 프로필은 <b>독립된 쿠키와 로그인 정보</b>를 가집니다.
                    </p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            새 프로필 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 브라우저 프로필 생성</DialogTitle>
                            <DialogDescription>
                                예: "게임 채널용", "일상 브랜드용" 등 용도에 맞는 이름을 입력하세요.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                placeholder="프로필 이름 입력..."
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>취소</Button>
                            <Button onClick={handleCreateProfile}>생성</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-indigo-500 hover:text-indigo-700" onClick={() => handleLinkIntelligence(profile.id)}>
                                        <Plus className="w-3 h-3 mr-1" /> 연동 추가
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant={profile.tiktok_count > 0 ? "default" : "secondary"} className={`text-[10px] ${profile.tiktok_count > 0 ? 'bg-black' : 'bg-slate-100 text-slate-400'}`}>
                                        <Music2 className="w-3 h-3 mr-1" />
                                        TikTok {profile.tiktok_count > 0 ? `(${profile.tiktok_count})` : '미연결'}
                                    </Badge>
                                    <Badge variant={profile.insta_count > 0 ? "default" : "secondary"} className={`text-[10px] ${profile.insta_count > 0 ? 'bg-pink-500' : 'bg-slate-100 text-slate-400'}`}>
                                        <Instagram className="w-3 h-3 mr-1" />
                                        Instagram {profile.insta_count > 0 ? `(${profile.insta_count})` : '미연결'}
                                    </Badge>
                                    <Badge variant={profile.notebooklm_count > 0 ? "default" : "secondary"} className={`text-[10px] ${profile.notebooklm_count > 0 ? 'bg-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Brain className="w-3 h-3 mr-1" />
                                        NotebookLM {profile.notebooklm_count > 0 ? `(${profile.notebooklm_count})` : '미연결'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {profiles.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Chrome className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>생성된 브라우저 프로필이 없습니다.</p>
                        <Button variant="link" onClick={() => setIsAddOpen(true)}>
                            첫 프로필 생성하기
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialAccountsManager;
