import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BookOpen, ExternalLink, AlertTriangle, ShieldCheck, Sparkles,
    Flame, RefreshCw, Zap, CheckCircle2, Eye
} from 'lucide-react';

const GoogleAuthGuide = () => {
    const [activeTab, setActiveTab] = useState("newborn");

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs font-bold shadow-2xs border-border">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    계정 운영 & 웜업 마스터 가이드
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[820px] max-h-[88vh] flex flex-col bg-card border-border text-foreground shadow-2xl rounded-2xl p-4 sm:p-6">
                <DialogHeader className="border-b border-border pb-3">
                    <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        ViraLoop 계정 운영 & YouTube 연동 마스터 가이드
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        신규 계정 4단계 인큐베이팅부터 기존 3단계 인증 채널 즉시 투입, 운영 중 상시 유지 웜업까지의 공식 운영 지침서입니다.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 pt-2">
                    <TabsList className="grid grid-cols-4 bg-muted/70 p-1 rounded-xl w-full h-auto text-xs">
                        <TabsTrigger value="newborn" className="py-2 text-[11px] sm:text-xs font-bold">
                            🌱 신규 4단계 육성
                        </TabsTrigger>
                        <TabsTrigger value="mature" className="py-2 text-[11px] sm:text-xs font-bold">
                            ⚡ 기존 3단계 채널
                        </TabsTrigger>
                        <TabsTrigger value="routine" className="py-2 text-[11px] sm:text-xs font-bold">
                            🛡️ 운영 중 상시 웜업
                        </TabsTrigger>
                        <TabsTrigger value="api_oauth" className="py-2 text-[11px] sm:text-xs font-bold">
                            🔑 API OAuth2 키
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto pr-1 py-3 text-foreground space-y-4 text-xs sm:text-sm">
                        {/* 1. 신규 계정 4단계 인큐베이팅 */}
                        <TabsContent value="newborn" className="space-y-4 mt-0">
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-2">
                                <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 text-sm">
                                    <AlertTriangle className="w-4 h-4" /> 왜 신규 계정은 즉시 채널을 만들면 안 되는가? (0뷰 원인)
                                </h4>
                                <p className="text-xs text-foreground/90 leading-relaxed">
                                    유튜브는 신규 구글 계정이 시청 기록(Watch History)이 0개인 상태에서 즉시 채널을 만들고 영상을 올리면,
                                    구글 봇가드(BotGuard)가 <strong>'대량 생산 자동화 봇'</strong>으로 분류하여 쇼츠 피드 노출을 영구 차단(Zero-View 감옥)합니다.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-indigo-500" /> 신규 계정 4단계 표준 운영 절차 (SOP)
                                </h4>

                                <div className="space-y-2.5">
                                    <div className="p-3.5 bg-card border border-border rounded-xl space-y-1.5 shadow-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-primary text-primary-foreground text-[10px] font-extrabold px-2 py-0.5 rounded">Step 0</span>
                                            <span className="font-bold text-foreground">모바일 LTE 환경에서 구글 계정 생성</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground pl-1">
                                            • 스마트폰 Wi-Fi를 끄고 통신사 LTE 데이터 상태에서 구글 계정을 생성합니다.<br />
                                            • PC와 USB 연결 후 EveryProxy(SOCKS5 127.0.0.1:1080)를 통해 PC CloakBrowser로 계정을 등록합니다.
                                        </p>
                                    </div>

                                    <div className="p-3.5 bg-card border border-border rounded-xl space-y-1.5 shadow-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded">Step 1</span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400">1단계 시드 예열 (Seed Warmup - 3~4분)</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground pl-1">
                                            • 대시보드에서 <strong>[📱 1단계 시드 예열]</strong> 버튼을 1회 클릭합니다.<br />
                                            • 스텔스 브라우저가 다큐/상식/트렌드 영상 3편을 실제 인간처럼 검색·시청하여 시청 기록과 쿠키를 축적합니다.<br />
                                            • 시청 완료 직후 모바일 LTE IP가 자동으로 소프트 로테이션(IP 세탁)됩니다.
                                        </p>
                                    </div>

                                    <div className="p-3.5 bg-card border border-border rounded-xl space-y-1.5 shadow-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded">Step 2</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">브랜드 채널 자동 개설 (인간형 내비게이션)</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground pl-1">
                                            • 시드 예열 완료 시 <strong>[✨ 브랜드 채널 자동 개설]</strong> 버튼이 자동 언락됩니다.<br />
                                            • 원하는 채널명만 입력하면 홈 피드 ➔ 아바타 ➔ 채널 관리 ➔ 생성의 인간형 트래젝토리로 30초 내 안전 개설됩니다.<br />
                                            • 발급된 실제 <code className="font-mono bg-muted px-1 rounded">UC...</code> 채널 ID가 시스템에 자동 바인딩됩니다.
                                        </p>
                                    </div>

                                    <div className="p-3.5 bg-card border border-border rounded-xl space-y-1.5 shadow-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded">Step 3</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">7일 알고리즘 육성 (Stage 1~3) & 쇼츠 제작</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground pl-1">
                                            • <strong>[전략 설정]</strong>에서 채널 DNA 니치를 등록하고 일일 웜업 스케줄을 가동합니다.<br />
                                            • 7일 육성 기간 동안 단계별로 시청 범위와 체류시간이 점진 확장되며, 쇼츠 자동 제작·발행이 완벽하게 안전해집니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* 2. 기존 완성 채널 (3단계 인증 완료) 즉시 투입 */}
                        <TabsContent value="mature" className="space-y-4 mt-0">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl space-y-2">
                                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-sm">
                                    <Zap className="w-4 h-4" /> 이미 유튜브 채널이 있고 3단계 인증을 마친 계정인가요?
                                </h4>
                                <p className="text-xs text-foreground/90 leading-relaxed">
                                    이미 개인 채널/브랜드 채널이 개설되어 있고 전화번호 인증 또는 신분증/영상 인증(3단계 고급 기능)을 완료한 성숙 계정은
                                    <strong> 1단계 시드 예열이나 채널 개설 단계를 거칠 필요 없이 즉시 연동</strong>하여 쇼츠 업로드에 투입할 수 있습니다.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 기존 채널 2가지 즉시 연동 방법
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-4 bg-card border border-border rounded-xl space-y-2 shadow-xs">
                                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-primary" />
                                            방법 1: 계정 등록 시 '기존 완성 채널' 선택
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            [새 계정 등록] 마법사 1단계에서 <strong>"⚡ 기존 완성 채널 (3단계 인증)"</strong> 라디오 버튼을 선택합니다.
                                            로그인 완료 시 브라우저가 스튜디오에서 채널 ID와 이름을 자동으로 수집하여 즉시 활성화합니다.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-card border border-border rounded-xl space-y-2 shadow-xs">
                                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            방법 2: 대시보드에서 '🔍 기존 채널 연동' 클릭
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            이미 등록된 계정이라도 채널 열 우측의 <strong>[🔍 기존 채널 연동 (3단계)]</strong> 버튼을 누르면,
                                            스텔스 세션이 유튜브 스튜디오를 정밀 스카우팅하여 기존 채널을 즉시 바인딩합니다.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
                                    <p className="font-bold text-foreground">💡 3단계 인증 계정 운영 팁:</p>
                                    <p className="text-muted-foreground">
                                        • 3단계 인증 완료 계정은 하루 업로드 한도(최대 50~100개)가 넓지만, 신뢰도 유지를 위해 <strong>업로드 전 프리-웜업</strong>을 항상 켜두는 것을 권장합니다.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        {/* 3. 운영 중 상시 유지 웜업 & 프리-웜업 */}
                        <TabsContent value="routine" className="space-y-4 mt-0">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                                <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-sm">
                                    <Flame className="w-4 h-4" /> 왜 채널 운영 중에도 지속적인 웜업이 필수인가?
                                </h4>
                                <p className="text-xs text-foreground/90 leading-relaxed">
                                    실제 유튜버는 하루에도 유튜브를 켜서 다른 영상을 보고, 댓글을 달고, 피드를 내리다가 자기 영상을 올립니다.<br />
                                    반면 <strong>"오직 영상 올릴 때만 1초 접속해서 영상만 띡 올리고 나가는 계정 (Upload-Only Ghost Bot)"</strong>은
                                    유튜브 AI가 1순위로 블랙리스트에 올립니다. 운영 중 주기적인 소비 엔트로피(시청 활동)가 반드시 병행되어야 합니다.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500" /> ViraLoop의 2대 상시 방어 시스템
                                </h4>

                                <div className="space-y-2.5">
                                    <div className="p-3.5 bg-card border border-border rounded-xl space-y-1.5 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                                <Eye className="w-4 h-4 text-blue-500" /> 1. 업로드 직전 15~30초 프리-웜업 (Pre-Upload Warmup)
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                자동 기본 탑재
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            브라우저 자동 업로드 시, 스튜디오로 바로 뛰어들지 않고 <strong>유튜브 홈 피드에 먼저 머물며 자연스러운 스크롤과 마우스 궤적을 15~30초간 생성</strong>한 후 스튜디오로 이동합니다.
                                            이를 통해 구글 봇 탐지 센서를 100% 무력화합니다.
                                        </p>
                                    </div>

                                    <div className="p-3.5 bg-card border border-border rounded-xl space-y-1.5 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                                <RefreshCw className="w-4 h-4 text-orange-500" /> 2. 주간 상시 유지 순찰 웜업 (Routine Maintenance)
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                권장: 2~3일당 1회
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            영상을 매일 올리지 않더라도, 2~3일에 한 번씩 대시보드의 <strong>[🔥 상시 유지 웜업]</strong>을 가동하여 동종 장르 영상을 3분간 가볍게 소비해 주는 것만으로 채널의 건강도(Health Score)가 최상위로 유지됩니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* 4. YouTube API OAuth2 키 발급 */}
                        <TabsContent value="api_oauth" className="space-y-4 mt-0">
                            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1 text-xs">
                                <p className="font-bold text-foreground">📌 YouTube Data API v3 키가 왜 필요한가요?</p>
                                <p className="text-muted-foreground">
                                    브라우저 자동화 외에 공식 API를 통한 초고속 대량 영상 업로드, 채널 분석 지표 실시간 수집을 위해 필요합니다.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
                                    <div className="font-bold text-xs text-foreground flex items-center justify-between">
                                        <span>Step 1: Google Cloud 프로젝트 생성 & API 활성화</span>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => window.open('https://console.cloud.google.com/projectcreate', '_blank')}>
                                            콘솔 바로가기 <ExternalLink className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Cloud Console에서 새 프로젝트를 생성하고, 라이브러리에서 <strong>YouTube Data API v3</strong>를 검색하여 '사용'을 누릅니다.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
                                    <div className="font-bold text-xs text-foreground">
                                        Step 2: OAuth 동의 화면 설정 (외부 & 테스트 사용자)
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        • 사용자 유형: <strong>'외부(External)'</strong> 선택<br />
                                        • 앱 이름: ViraLoop, 이메일: 본인 계정 입력 후 저장<br />
                                        • <span className="text-rose-500 font-bold">중요!</span> '테스트 사용자'에 <strong>반드시 본인의 구글 이메일을 추가(+ ADD USERS)</strong>해야 403 에러가 나지 않습니다.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
                                    <div className="font-bold text-xs text-foreground">
                                        Step 3: 데스크톱 앱 사용자 인증 정보 JSON 다운로드
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        • '사용자 인증 정보 만들기' ➔ 'OAuth 클라이언트 ID'<br />
                                        • 애플리케이션 유형: <strong>"데스크톱 앱(Desktop App)"</strong> 선택<br />
                                        • 발급된 JSON 파일을 다운로드하여 계정 관리 화면의 [키 업로드]에 등록합니다.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default GoogleAuthGuide;

