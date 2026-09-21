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
    Mail, ExternalLink, Copy, Check, AlertTriangle, ShieldCheck,
    Sparkles, CheckCircle2, HelpCircle, ArrowRight, ShieldAlert,
    Lock, Inbox, Globe, RefreshCw
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface RecoveryEmailGuideModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentEmail?: string;
    currentRecoveryEmail?: string;
}

export const RecoveryEmailGuideModal: React.FC<RecoveryEmailGuideModalProps> = ({
    open,
    onOpenChange,
    currentEmail = '',
    currentRecoveryEmail = ''
}) => {
    const { toast } = useToast();
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('steps');

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        toast({
            title: "클립보드 복사 완료",
            description: `"${label}" 값이 복사되었습니다.`
        });
        setTimeout(() => setCopiedText(null), 2000);
    };

    // Auto-generate suggested forward email based on current email or default
    const emailUserPart = currentEmail ? currentEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') : 'ch01';
    const suggestedRecoveryEmail = `rec.${emailUserPart}@gogloo.gleeze.com`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-card border-border text-foreground shadow-2xl rounded-2xl p-4 sm:p-6 overflow-hidden">
                {/* Header */}
                <DialogHeader className="border-b border-border pb-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                                    Google 복구 이메일 등록 & 다계정 연좌제 방지 완벽 가이드
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    계정 정지(연좌제)를 0%로 차단하고 본인 확인 챌린지를 안전하게 통과하는 4단계 실전 가이드
                                </DialogDescription>
                            </div>
                        </div>
                        <Badge variant="outline" className="hidden sm:flex border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[11px] font-bold">
                            ForwardEmail 100% 연동
                        </Badge>
                    </div>
                </DialogHeader>

                {/* Tabs Navigation */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 mt-3">
                    <TabsList className="grid grid-cols-3 bg-muted p-1 rounded-xl shrink-0">
                        <TabsTrigger value="steps" className="text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            1. 구글 실제 등록 4단계
                        </TabsTrigger>
                        <TabsTrigger value="principle" className="text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            2. 왜 이 방법을 써야 하는가?
                        </TabsTrigger>
                        <TabsTrigger value="faq" className="text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground">
                            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                            3. 자주 묻는 질문 (FAQ)
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto pr-1 mt-3 text-xs space-y-4">
                        {/* TAB 1: 4-Step Registration Guide */}
                        <TabsContent value="steps" className="m-0 space-y-3">
                            {/* Security Warning Banner */}
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-foreground flex items-start gap-2.5">
                                <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold text-destructive text-xs">
                                        🚨 절대 개인 일반 크롬 브라우저로 접속하지 마세요!
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        개인 브라우저에서 복구 이메일을 설정하면 실제 공인 IP와 브라우저 지문이 구글에 노출되어 모든 채널이 연좌제로 묶입니다.
                                        반드시 아래 안내처럼 <strong>ViraLoop Studio의 [보안 접속(스텔스 창)]</strong>을 통해서만 진행하세요.
                                    </p>
                                </div>
                            </div>

                            {/* Step 1 */}
                            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
                                        <span>ViraLoop에서 [보안 접속] 버튼 클릭 (스텔스 브라우저 실행)</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">스텔스 격리</Badge>
                                </div>
                                <p className="text-muted-foreground leading-relaxed pl-7">
                                    대시보드 또는 틴캔 보관함에서 해당 계정의 <strong>[보안 접속]</strong> 버튼을 누르면, 영구 바인딩된 LTE 프록시와 전용 프로필 환경으로 안전하게 브라우저 창이 열립니다.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
                                        <span>Google 계정 관리 - [보안] 메뉴로 이동</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopy("https://myaccount.google.com/security", "구글 보안 설정 주소")}
                                        className="h-6 text-[10px] px-2 gap-1 bg-card"
                                    >
                                        {copiedText === "https://myaccount.google.com/security" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        주소 복사
                                    </Button>
                                </div>
                                <p className="text-muted-foreground leading-relaxed pl-7">
                                    열린 스텔스 창 주소창에 <code className="bg-background px-1.5 py-0.5 rounded text-foreground font-mono">https://myaccount.google.com/security</code>를 입력하거나, 우측 상단 프로필 아이콘 ➔ <strong>[Google 계정 관리] ➔ 좌측 [보안]</strong> 메뉴를 누릅니다.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">3</span>
                                        <span>"Google 로그인 방법" 섹션의 [복구 이메일] 클릭</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">비밀번호 확인 필요</Badge>
                                </div>
                                <p className="text-muted-foreground leading-relaxed pl-7">
                                    보안 탭 스크롤을 살짝 내리면 <strong>"Google에 로그인하는 방법"</strong> 섹션이 있습니다. 여기서 <strong>[복구 이메일(Recovery email)]</strong>을 클릭하고 계정 비밀번호를 한 번 더 입력합니다.
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">4</span>
                                        <span>고유 포워딩 이메일 입력 & 6자리 인증코드 확인</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopy(suggestedRecoveryEmail, "추천 복구 이메일")}
                                        className="h-6 text-[10px] px-2 gap-1 bg-card text-primary font-bold"
                                    >
                                        {copiedText === suggestedRecoveryEmail ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        추천 이메일 복사
                                    </Button>
                                </div>
                                <div className="pl-7 space-y-2">
                                    <p className="text-muted-foreground leading-relaxed">
                                        구글 복구 이메일 입력창에 아래와 같은 <strong>ForwardEmail 포워딩 주소</strong>를 입력합니다:
                                    </p>
                                    <div className="p-2.5 bg-card border border-border rounded-lg flex items-center justify-between">
                                        <div className="font-mono text-foreground font-bold text-xs">
                                            {suggestedRecoveryEmail}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            (원하시는 영문숫자@gogloo.gleeze.com)
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-foreground leading-relaxed">
                                        📬 <strong>인증 메일 수신처</strong>: 구글이 발송한 <strong>6자리 인증번호 메일</strong>은 ForwardEmail 인프라를 통해 대표님의 실제 메일함(<strong>jmyoon312@gmail.com</strong>)으로 0.5초 만에 자동 전달됩니다. 대표님 메일함을 열어 번호를 확인 후 구글 창에 입력하시면 등록 완료됩니다!
                                    </div>
                                </div>
                            </div>

                            {/* Step 5 */}
                            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">5</span>
                                        <span>ViraLoop Studio "복구 이메일" 란에도 입력 후 [저장]</span>
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">최종 완료</Badge>
                                </div>
                                <p className="text-muted-foreground leading-relaxed pl-7">
                                    구글에 등록한 동일한 이메일 주소를 ViraLoop의 "복구 이메일" 입력란에 적어두시면, 추후 새로운 IP/LTE 환경에서 구글이 "본인 확인: 복구 이메일 입력" 챌린지를 걸어올 때 ViraLoop 엔진이 이를 자동으로 입력하여 통과합니다.
                                </p>
                            </div>
                        </TabsContent>

                        {/* TAB 2: Principle & Anti-Association */}
                        <TabsContent value="principle" className="m-0 space-y-3">
                            <div className="p-3.5 bg-card border border-border rounded-xl space-y-3">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-destructive" />
                                    다계정 연좌제(Sybil Attack / Clustering)의 무서운 함정
                                </h4>
                                <p className="text-muted-foreground leading-relaxed">
                                    많은 유튜브 크리에이터들이 여러 채널을 운영할 때 관리의 편의를 위해 <strong>모든 서브 계정의 복구 이메일로 본인의 개인 Gmail(`daesungtd.a30@gmail.com`)</strong>을 똑같이 입력합니다.
                                </p>
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-foreground space-y-1.5">
                                    <p className="font-bold text-destructive">❌ 구글 AI의 군집 분석(Cluster Detection) 원리</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        IP나 브라우저를 아무리 완벽하게 숨겨도, <strong>"복구 이메일이 동일하다"</strong>는 사실 하나만으로 구글 보안 AI는 이 계정들을 100% 동일 인물의 계정 그룹으로 묶어버립니다. 그 결과 1개 채널에 경고가 들어가면 다른 모든 채널이 연쇄 정지(연좌제)를 당하게 됩니다.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 bg-card border border-border rounded-xl space-y-3">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    ViraLoop의 ForwardEmail 무제한 격리 솔루션
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                                    <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-1">
                                        <Globe className="w-4 h-4 mx-auto text-indigo-500" />
                                        <p className="font-bold text-foreground text-[11px]">1. 고유 도메인</p>
                                        <p className="text-[10px] text-muted-foreground">gogloo.gleeze.com 기반 무제한 가상 주소 생성</p>
                                    </div>
                                    <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-1">
                                        <Lock className="w-4 h-4 mx-auto text-emerald-500" />
                                        <p className="font-bold text-foreground text-[11px]">2. 완벽한 직교 격리</p>
                                        <p className="text-[10px] text-muted-foreground">구글 시점에서는 100개 채널이 모두 다른 복구 메일</p>
                                    </div>
                                    <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-1">
                                        <Inbox className="w-4 h-4 mx-auto text-primary" />
                                        <p className="font-bold text-foreground text-[11px]">3. 단일함 통합 수신</p>
                                        <p className="text-[10px] text-muted-foreground">인증 메일은 대표님 실제 Gmail로 단일 자동 전달</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-muted/40 border border-border rounded-lg font-mono text-[11px] text-center text-foreground space-y-1">
                                    <p className="text-muted-foreground text-[10px]">전체 이메일 포워딩 라우팅 흐름</p>
                                    <div className="flex items-center justify-center gap-1.5 font-bold flex-wrap">
                                        <span className="bg-card px-2 py-1 rounded border border-border">구글 보안 인증 발송</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                        <span className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">ch01@gogloo.gleeze.com</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">jmyoon312@gmail.com 수신</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* TAB 3: FAQ & Troubleshooting */}
                        <TabsContent value="faq" className="m-0 space-y-3">
                            <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
                                <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                                    Q. 구글에서 보낸 6자리 인증번호 메일이 안 와요!
                                </p>
                                <p className="text-muted-foreground leading-relaxed pl-5 text-[11px]">
                                    1) 대표님 Gmail의 <strong>[스팸함]</strong> 또는 <strong>[전체보관함]</strong>을 확인해주세요.<br />
                                    2) ForwardEmail.net 대시보드에서 도메인 MX 레코드가 정상인지 확인하세요. (이미 DNS 전파 완료 검증됨)<br />
                                    3) 이메일 주소의 오탈자(예: <code className="bg-muted px-1 rounded">gogloo.gleeze.com</code>)를 확인해주세요.
                                </p>
                            </div>

                            <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
                                <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                                    Q. 복구 이메일의 앞부분 아이디는 제 마음대로 지어도 되나요?
                                </p>
                                <p className="text-muted-foreground leading-relaxed pl-5 text-[11px]">
                                    <strong>네, 100% 자유롭게 지으셔도 됩니다!</strong><br />
                                    ForwardEmail의 TXT 레코드가 <code className="bg-muted px-1 rounded font-mono">forward-email=jmyoon312@gmail.com</code> (Catch-all)로 등록되어 있으므로, <code className="bg-muted px-1 rounded font-mono">ch01@...</code>, <code className="bg-muted px-1 rounded font-mono">news312@...</code> 등 앞자리가 무엇이든 모두 대표님 메일함으로 자동 전달됩니다.
                                </p>
                            </div>

                            <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
                                <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                                    Q. 이미 다른 개인 이메일이 복구 이메일로 등록되어 있어요.
                                </p>
                                <p className="text-muted-foreground leading-relaxed pl-5 text-[11px]">
                                    ViraLoop의 <strong>[보안 접속]</strong>을 열고 <code className="bg-muted px-1 rounded font-mono">myaccount.google.com/security</code>에 들어가신 뒤, 기존 복구 이메일 옆의 <strong>연필(수정) 아이콘</strong>을 눌러 새 포워딩 주소(예: <code className="bg-muted px-1 rounded font-mono">ch3125@gogloo.gleeze.com</code>)로 변경하시면 됩니다.
                                </p>
                            </div>

                            <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
                                <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                                    Q. ViraLoop에 복구 이메일을 꼭 적어야 하는 이유는 무엇인가요?
                                </p>
                                <p className="text-muted-foreground leading-relaxed pl-5 text-[11px]">
                                    LTE 모바일 IP가 변경되거나 다른 지역 IP로 접속할 때, 구글이 "비정상 로그인 시도"로 의심하여 <strong>"보안을 위해 계정에 등록된 복구 이메일을 입력하세요"</strong>라는 챌린지 화면을 띄웁니다. ViraLoop에 복구 이메일을 등록해 두면 자동 로그인 스크립트가 이를 자동으로 타이핑하여 사람의 개입 없이 0초 만에 통과합니다.
                                </p>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Footer */}
                <DialogFooter className="border-t border-border pt-3 mt-3 flex items-center justify-between sm:justify-between shrink-0">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>다계정 연좌제 0% 차단 보안 체계 가동 중</span>
                    </div>
                    <Button 
                        onClick={() => onOpenChange(false)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-4"
                    >
                        확인 완료
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
