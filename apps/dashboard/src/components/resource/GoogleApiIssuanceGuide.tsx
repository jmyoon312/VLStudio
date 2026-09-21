import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    KeyRound, ExternalLink, Copy, Check, AlertTriangle, ShieldCheck,
    Sparkles, CheckCircle2, HelpCircle, FileJson, ArrowRight, Layers,
    Flame, Download, Terminal, ShieldAlert, Mail
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface GoogleApiIssuanceGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: 'oauth_json' | 'data_api_key' | 'troubleshoot';
}

export const GoogleApiIssuanceGuide: React.FC<GoogleApiIssuanceGuideProps> = ({
    open,
    onOpenChange,
    defaultTab = 'oauth_json'
}) => {
    const { toast } = useToast();
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [tab, setTab] = useState<string>(defaultTab);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(text);
        toast({
            title: "클립보드 복사 완료",
            description: `"${label}" 값이 복사되었습니다. (Ctrl + V로 붙여넣기)`
        });
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-card border-border text-foreground shadow-2xl rounded-2xl p-4 sm:p-6 overflow-hidden">
                {/* Header */}
                <DialogHeader className="border-b border-border pb-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                <KeyRound className="w-4 h-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                                    Google Cloud API 키 & client_secret.json 발급 완벽 가이드
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    초보자도 클릭 몇 번으로 쉽게 따라할 수 있는 단계별 상세 발급 지침서입니다.
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Tabs */}
                <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0 pt-2">
                    <TabsList className="grid grid-cols-3 bg-muted/60 p-1 rounded-xl w-full shrink-0">
                        <TabsTrigger value="oauth_json" className="text-xs font-bold py-1.5 gap-1.5">
                            <FileJson className="w-3.5 h-3.5 text-indigo-500" />
                            OAuth client_secret.json (업로드용)
                        </TabsTrigger>
                        <TabsTrigger value="data_api_key" className="text-xs font-bold py-1.5 gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                            Data API 키 (조회/탐색용)
                        </TabsTrigger>
                        <TabsTrigger value="troubleshoot" className="text-xs font-bold py-1.5 gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
                            자주 묻는 질문 & 403 해결
                        </TabsTrigger>
                    </TabsList>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto pr-1 py-3 text-foreground space-y-4 text-xs sm:text-sm">
                        {/* 1. OAuth2 client_secret.json 발급 5단계 */}
                        <TabsContent value="oauth_json" className="space-y-4 mt-0">
                            {/* 안내 배너 */}
                            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1.5">
                                <div className="flex items-center gap-2 font-bold text-xs text-indigo-800 dark:text-indigo-300">
                                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <span>왜 client_secret.json 파일이 필요한가요?</span>
                                </div>
                                <p className="text-xs text-indigo-900/90 dark:text-indigo-200/80 leading-relaxed">
                                    ViraLoop Studio가 사용자의 YouTube 채널에 안전하게 영상을 업로드하고 통계를 확인하기 위해 Google에서 발급하는 공식 인증 파일입니다. 
                                    아래 <strong>5개 단계</strong>를 순서대로 진행하시면 약 3분 만에 발급받으실 수 있습니다.
                                </p>
                            </div>

                            {/* 5단계 스텝 리스트 */}
                            <div className="space-y-3">
                                {/* Step 1 */}
                                <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-2 py-0.5 text-[10px]">
                                                Step 1
                                            </Badge>
                                            <h4 className="font-bold text-xs sm:text-sm text-foreground">
                                                Google Cloud 콘솔 접속 및 새 프로젝트 생성
                                            </h4>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-border bg-background"
                                            onClick={() => window.open('https://console.cloud.google.com/projectcreate', '_blank')}
                                        >
                                            프로젝트 생성 바로가기 <ExternalLink className="w-3 h-3 text-indigo-500" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1.5 pl-1 leading-relaxed">
                                        <p>1. 위 바로가기 버튼을 눌러 Google Cloud Console 프로젝트 생성 화면으로 이동합니다.</p>
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                                            <span className="text-foreground font-medium">추천 프로젝트 이름:</span>
                                            <code className="text-indigo-600 dark:text-indigo-400 font-bold">viraloop-studio-01</code>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 px-2 text-[10px] ml-auto gap-1"
                                                onClick={() => handleCopy('viraloop-studio-01', '프로젝트 이름')}
                                            >
                                                {copiedKey === 'viraloop-studio-01' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                복사
                                            </Button>
                                        </div>
                                        <p>2. 프로젝트 이름을 입력한 뒤 하단의 <strong>[만들기 (Create)]</strong> 버튼을 클릭합니다.</p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-2 py-0.5 text-[10px]">
                                                Step 2
                                            </Badge>
                                            <h4 className="font-bold text-xs sm:text-sm text-foreground">
                                                YouTube Data API v3 라이브러리 활성화
                                            </h4>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-border bg-background"
                                            onClick={() => window.open('https://console.cloud.google.com/apis/library/youtube.googleapis.com', '_blank')}
                                        >
                                            API 활성화 바로가기 <ExternalLink className="w-3 h-3 text-indigo-500" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1.5 pl-1 leading-relaxed">
                                        <p>1. 상단 바로가기 링크를 클릭하여 <strong>YouTube Data API v3</strong> 라이브러리 페이지로 이동합니다.</p>
                                        <p>2. 화면 중앙의 파란색 <strong>[사용 (Enable)]</strong> 버튼을 클릭합니다. (약 3~5초 소요)</p>
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                            💡 상단에 방금 생성한 프로젝트(viraloop-studio-01)가 올바르게 선택되어 있는지 확인해 주세요.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-2 py-0.5 text-[10px]">
                                                Step 3
                                            </Badge>
                                            <h4 className="font-bold text-xs sm:text-sm text-foreground">
                                                OAuth 동의 화면(Consent Screen) 구성
                                            </h4>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-border bg-background"
                                            onClick={() => window.open('https://console.cloud.google.com/apis/credentials/consent', '_blank')}
                                        >
                                            동의 화면 바로가기 <ExternalLink className="w-3 h-3 text-indigo-500" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1.5 pl-1 leading-relaxed">
                                        <p>1. User Type(사용자 유형)에서 <strong>'외부 (External)'</strong>를 선택하고 [만들기]를 누릅니다.</p>
                                        <div className="space-y-1 p-2.5 rounded-lg bg-muted/50 border border-border text-[11px]">
                                            <div className="flex items-center justify-between">
                                                <span>• 앱 이름: <strong className="text-foreground">ViraLoop Studio</strong></span>
                                                <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={() => handleCopy('ViraLoop Studio', '앱 이름')}>
                                                    {copiedKey === 'ViraLoop Studio' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                    복사
                                                </Button>
                                            </div>
                                            <p>• 사용자 지원 이메일: <strong>본인의 Google 이메일</strong> 선택</p>
                                            <p>• 개발자 연락처 정보: <strong>본인의 Google 이메일</strong> 입력</p>
                                        </div>
                                        <p>2. 하단의 <strong>[저장 후 계속 (Save and Continue)]</strong>을 클릭합니다. (범위 설정 단계는 추가 없이 다음으로 이동)</p>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-rose-600 text-white font-extrabold px-2 py-0.5 text-[10px]">
                                                Step 4 (필수 관문!)
                                            </Badge>
                                            <h4 className="font-bold text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                                                <ShieldAlert className="w-4 h-4 text-rose-600" />
                                                테스트 사용자(Test Users) 등록 (403 에러 방지)
                                            </h4>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-rose-300 dark:border-rose-800 bg-background text-rose-700 dark:text-rose-300"
                                            onClick={() => window.open('https://console.cloud.google.com/apis/credentials/consent', '_blank')}
                                        >
                                            테스트 사용자 관리 <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-rose-900 dark:text-rose-200/90 space-y-1.5 pl-1 leading-relaxed">
                                        <p className="font-semibold">
                                            ⚠️ 가장 중요한 단계입니다! 앱이 '테스트' 상태이므로, 여기에 등록되지 않은 구글 계정으로 로그인 시 <strong>403 Access Denied(접근 거부)</strong> 오류가 발생합니다.
                                        </p>
                                        <div className="p-2.5 rounded-lg bg-background/80 border border-rose-200 dark:border-rose-900/50 space-y-1 text-[11px] text-foreground">
                                            <p>1. '테스트 사용자' 섹션에서 <strong>[+ ADD USERS (사용자 추가)]</strong> 버튼을 누릅니다.</p>
                                            <p>2. ViraLoop Studio에 등록할 <strong>본인의 구글 계정 이메일(Gmail)</strong>을 입력하고 [저장]을 클릭합니다.</p>
                                            <p>3. 하단의 <strong>[저장 후 계속]</strong>을 눌러 요약 화면까지 완료합니다.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 5 */}
                                <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-emerald-600 text-white font-bold px-2 py-0.5 text-[10px]">
                                                Step 5 (최종 완성)
                                            </Badge>
                                            <h4 className="font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                                <Download className="w-4 h-4 text-emerald-600" />
                                                데스크톱 앱 자격 증명 생성 & JSON 다운로드
                                            </h4>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-emerald-300 dark:border-emerald-800 bg-background text-emerald-700 dark:text-emerald-300"
                                            onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                                        >
                                            자격 증명 화면 바로가기 <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-emerald-900 dark:text-emerald-200/90 space-y-1.5 pl-1 leading-relaxed">
                                        <p>1. 화면 상단의 <strong>[+ 사용자 인증 정보 만들기 (+ CREATE CREDENTIALS)]</strong>를 누르고 <strong>[OAuth 클라이언트 ID]</strong>를 선택합니다.</p>
                                        <div className="p-2.5 rounded-lg bg-background/80 border border-emerald-200 dark:border-emerald-900/50 space-y-1 text-[11px] text-foreground">
                                            <p>• 애플리케이션 유형: <strong className="text-emerald-700 dark:text-emerald-300">"데스크톱 앱 (Desktop App)"</strong> 선택 (※ 웹 애플리케이션 아님!)</p>
                                            <div className="flex items-center justify-between">
                                                <span>• 이름: <strong className="text-foreground">ViraLoop Client</strong></span>
                                                <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={() => handleCopy('ViraLoop Client', '클라이언트 이름')}>
                                                    {copiedKey === 'ViraLoop Client' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                    복사
                                                </Button>
                                            </div>
                                        </div>
                                        <p>2. <strong>[만들기 (Create)]</strong>를 누르면 팝업창이 나타납니다.</p>
                                        <p>3. 팝업창 우측의 <strong>[JSON 다운로드 (DOWNLOAD JSON)]</strong> 버튼을 눌러 파일을 PC에 저장합니다.</p>
                                        <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-1 text-[11px] text-foreground">
                                            <p className="font-bold text-indigo-700 dark:text-indigo-300">💡 다운로드 파일 위치 찾기 (폴더 열기 팁):</p>
                                            <p>• 크롬 브라우저 우측 상단 다운로드 목록에서 파일을 누르면 폴더가 열리지 않고 실행을 시도합니다.</p>
                                            <p>• 파일이 저장된 폴더를 열려면 항목 우측의 <strong>📁 (폴더 모양 아이콘)</strong>을 클릭하거나, <strong>Ctrl + J</strong>를 눌러 <strong>[폴더에 표시]</strong>를 클릭하세요.</p>
                                            <p>• 만약 파일명이 영문/숫자(예: <code>6be12...</code>)로 되어 있다면 <code>F2</code>를 눌러 <strong>client_secret.json</strong>으로 이름을 변경하시면 됩니다.</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>다운로드된 파일(예: client_secret_xxxx.json)을 ViraLoop 5단계 등록창에 업로드하면 완료됩니다!</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* 2. 일반 Data API Key 발급 (조회용) */}
                        <TabsContent value="data_api_key" className="space-y-4 mt-0">
                            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
                                <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    <span>일반 API 키(API Key)는 언제 사용하나요?</span>
                                </div>
                                <p className="text-xs text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
                                    YouTube Data API Key는 로그인 없이도 유튜브 인기 급상승 동영상 탐색(Trend Radar), 대본 분석(ScriptLab), 채널 정보 조회를 초고속으로 수행할 때 사용됩니다. 
                                    (동영상 업로드용으로는 1번 탭의 OAuth `client_secret.json`이 사용됩니다.)
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                                        <Badge className="bg-amber-600 text-white font-bold px-2 py-0.5 text-[10px]">1분 완성</Badge>
                                        YouTube Data API Key 즉시 발급 절차
                                    </h4>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1 border-border bg-background"
                                        onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                                    >
                                        콘솔 자격 증명 열기 <ExternalLink className="w-3 h-3 text-amber-500" />
                                    </Button>
                                </div>

                                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed pl-1">
                                    <p>1. Google Cloud Console ➔ <strong>[API 및 서비스] ➔ [사용자 인증 정보]</strong>로 이동합니다.</p>
                                    <p>2. 화면 상단의 <strong>[+ 사용자 인증 정보 만들기]</strong> ➔ <strong>[API 키]</strong>를 클릭합니다.</p>
                                    <p>3. 팝업창에 생성된 키(<code>AIzaSy...</code> 형태)를 복사합니다.</p>
                                    <div className="p-3 rounded-lg bg-muted/60 border border-border space-y-1.5">
                                        <p className="font-bold text-foreground">🔒 보안 권장: 키 제한 설정하기 (선택 사항)</p>
                                        <p className="text-[11px]">
                                            생성된 키를 클릭한 후 <strong>[API 제한사항] ➔ [키 제한]</strong>을 선택하고, <strong>YouTube Data API v3</strong>만 체크하여 저장하면 키 도용을 원천 차단할 수 있습니다.
                                        </p>
                                    </div>
                                    <p>4. 복사한 API 키는 <strong>[환경설정] ➔ [API 키 관리] ➔ [YouTube Data API Key]</strong>에 입력하여 저장하시면 됩니다.</p>
                                </div>
                            </div>
                        </TabsContent>

                        {/* 3. 트러블슈팅 & 자주 묻는 질문 */}
                        <TabsContent value="troubleshoot" className="space-y-3 mt-0">
                            {/* Q1 */}
                            <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-1.5">
                                <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>Q. 로그인 승인 시 "Google에서 확인되지 않은 앱" 경고가 뜹니다.</span>
                                </h4>
                                <div className="text-xs text-muted-foreground pl-5 space-y-1 leading-relaxed">
                                    <p><strong>A. 지극히 정상적인 안내입니다!</strong></p>
                                    <p>
                                        구글에 수천만 원의 공식 심사비를 내지 않고 개인이 직접 만든 비공개 프로젝트이기 때문에 나타나는 기본 보안 화면입니다.
                                    </p>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                        해결법: 화면 좌측 하단의 <strong>[고급 (Advanced)]</strong>을 누른 후, 나타나는 <strong>[ViraLoop Studio(으)로 이동 (안전하지 않음)]</strong> 링크를 클릭하시면 정상 승인됩니다.
                                    </p>
                                </div>
                            </div>

                            {/* Q2 */}
                            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs space-y-1.5">
                                <h4 className="font-bold text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span>Q. "403: access_denied" 또는 "승인 오류"가 발생하며 차단됩니다.</span>
                                </h4>
                                <div className="text-xs text-muted-foreground pl-5 space-y-1 leading-relaxed">
                                    <p>
                                        <strong>A. 99%의 확률로 '테스트 사용자'에 본인 이메일이 등록되지 않은 경우입니다.</strong>
                                    </p>
                                    <p>
                                        Google Cloud Console ➔ <strong>[API 및 서비스] ➔ [OAuth 동의 화면]</strong>으로 이동한 후, 
                                        <strong>'테스트 사용자'</strong> 섹션에 지금 로그인하려는 본인 구글 이메일을 반드시 <strong>[+ ADD USERS]</strong>로 추가하고 저장해 주세요.
                                    </p>
                                </div>
                            </div>

                            {/* Q3 */}
                            <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-1.5">
                                <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span>Q. YouTube API 일일 할당량(Quota 10,000 유닛)이 부족하면 어떻게 하나요?</span>
                                </h4>
                                <div className="text-xs text-muted-foreground pl-5 space-y-1 leading-relaxed">
                                    <p>
                                        <strong>A. Google Cloud에서 프로젝트를 여러 개 생성하시면 됩니다!</strong>
                                    </p>
                                    <p>
                                        구글은 구글 계정 1개당 최대 12~20개의 프로젝트를 무료로 생성할 수 있으며, <strong>각 프로젝트마다 매일 10,000 유닛의 무료 할당량</strong>이 각각 주어집니다.
                                    </p>
                                    <p>
                                        <code>viraloop-01</code>, <code>viraloop-02</code>, <code>viraloop-03</code> 형태로 여러 프로젝트에서 발급받아 ViraLoop에 등록해 두면 시스템이 쿼터를 자동으로 순환하여 무제한 운영이 가능합니다.
                                    </p>
                                </div>
                            </div>

                            {/* Q4 */}
                            <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-1.5">
                                <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                                    <Download className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>Q. JSON 다운로드 후 클릭해도 폴더가 열리지 않거나, 영문+숫자 파일명으로 받아집니다.</span>
                                </h4>
                                <div className="text-xs text-muted-foreground pl-5 space-y-1.5 leading-relaxed">
                                    <p>
                                        <strong>A. 크롬 브라우저 다운로드 팝업은 클릭 시 폴더를 여는 것이 아니라 파일을 열려고 시도하기 때문입니다.</strong>
                                    </p>
                                    <div className="space-y-1 p-2 rounded-lg bg-muted/40 border border-border text-[11px]">
                                        <p>1. <strong>폴더 열기</strong>: 크롬에서 <strong>Ctrl + J</strong>를 누르고 해당 파일 아래의 <strong>[폴더에 표시]</strong>를 누르면 윈도우 탐색기 폴더가 바로 열립니다. (또는 키보드 <code>Win + E</code> ➔ [다운로드] 폴더 직접 이동)</p>
                                        <p>2. <strong>파일명 변경</strong>: 파일명이 <code>client_secret_...json</code>이 아니라 임시 영문숫자(예: <code>6be127bc...</code>)로 되어 있다면, 파일을 선택하고 <strong>F2</strong>를 눌러 <strong>client_secret.json</strong>으로 이름을 변경해 주시면 됩니다.</p>
                                        <p>3. <strong>다시 받기</strong>: 콘솔 창의 '사용자 인증 정보' 목록에서 맨 오른쪽 <strong>⬇️ (다운로드 아이콘)</strong>을 누르면 정상 파일명으로 다시 받을 수도 있습니다.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Q5 */}
                            <div className="p-3.5 rounded-xl border border-blue-200/60 dark:border-blue-800/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs space-y-1.5">
                                <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span>Q. 복구 이메일을 구글 계정에도 등록해야 하나요? 여러 채널에 같은 메일을 써도 되나요?</span>
                                </h4>
                                <div className="text-xs text-muted-foreground pl-5 space-y-2 leading-relaxed">
                                    <p>
                                        <strong>A. 실제 구글 계정 보안 설정에도 반드시 등록되어 있어야 하며, 다계정 운영 시에는 이메일을 분산해야 안전합니다!</strong>
                                    </p>
                                    <div className="space-y-1.5 p-2.5 rounded-lg bg-background/80 border border-border text-[11px]">
                                        <p>
                                            <strong>1. 등록 필수 이유:</strong> ViraLoop는 프록시/LTE 격리망으로 접속하므로 구글이 <em>"본인 확인을 위해 복구 이메일을 입력하세요"</em>라는 보안 챌린지를 종종 표시합니다. 구글 계정에 복구 이메일이 없거나 다르면 계정이 잠기거나 폰 인증이 강제됩니다.
                                        </p>
                                        <p>
                                            <strong>2. 다계정 연좌제(Cluster) 주의:</strong> 모든 구글 계정에 동일한 복구 이메일을 쓰거나 계정끼리 체인(A➔B➔C➔A)으로 묶으면, 구글 AI가 동일인 네트워크로 판정하여 <strong>한 계정 제재 시 전 채널 동반 정지(Shadowban)</strong> 위험이 있습니다.
                                        </p>
                                        <p>
                                            <strong>3. 가장 안전한 운영법 (도메인 포워딩 / 별칭):</strong> 보유 도메인(Dynu DDNS + ForwardEmail 등)의 Catch-all 기능을 쓰거나 Outlook 무료 별칭을 활용하여, <code>ch01@내도메인</code>, <code>ch02@내도메인</code> 형태로 구글에는 독립된 메일로 인식시키고 실제 인증 코드는 본인 메일함 1곳으로 모아 받으시는 것을 권장합니다.
                                        </p>
                                        <p className="text-blue-700 dark:text-blue-300 font-semibold pt-0.5">
                                            💡 등록 방법: 반드시 ViraLoop의 [스텔스 브라우저] 안에서 새 탭을 열고 myaccount.google.com/security 접속 ➔ [복구 이메일]에 등록하세요.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Footer */}
                <DialogFooter className="border-t border-border pt-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>ViraLoop 공식 운영 표준 가이드라인</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 h-8"
                    >
                        확인 및 닫기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default GoogleApiIssuanceGuide;
