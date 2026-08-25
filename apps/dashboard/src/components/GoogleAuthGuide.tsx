import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';

const GoogleAuthGuide = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs font-bold">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    전체 설정 가이드 (상세 절차)
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[780px] max-h-[85vh] flex flex-col bg-card border-border text-foreground shadow-2xl rounded-2xl">
                <DialogHeader className="border-b border-border/80 pb-3">
                    <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                        <BookOpen className="w-5 h-5 text-primary" />
                        전체 설정 가이드 (필독)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        계정 생성부터 API 키 발급까지의 전체 과정을 상세히 안내합니다.
                        <br />
                        <span className="text-rose-500 font-bold">주의: 구글의 보안 정책(2FA/전화번호 인증)을 피하기 위해 반드시 아래 절차를 따르세요.</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-3 text-foreground">

                    {/* Step 1: Mobile Account Strategy (Critical) */}
                    <div className="bg-primary/10 p-4 sm:p-5 rounded-xl border border-primary/30 space-y-3">
                        <h3 className="font-bold text-base sm:text-lg text-primary flex items-center gap-2">
                            <span className="bg-primary text-white px-2 py-0.5 rounded text-xs font-extrabold">Step 1</span>
                            모바일 계정 생성 및 LTE 연결 (핵심!!)
                        </h3>
                        <div className="text-xs sm:text-sm text-foreground/90 space-y-2">
                            <p>구글은 PC에서 대량의 계정을 생성하거나 로그인할 때 보안 인증(전화번호)을 요구합니다. 이를 피하는 가장 확실한 방법입니다:</p>
                            <ol className="list-decimal list-inside font-bold bg-card/80 p-3.5 rounded-xl border border-border mt-2 space-y-2 text-foreground">
                                <li>핸드폰의 Wi-Fi를 끄고 <span className="text-rose-500 font-extrabold">LTE 데이터</span>를 켭니다.</li>
                                <li>핸드폰에서 구글 계정을 생성합니다. (PC 아님)</li>
                                <li>PC의 랜선을 뽑고, 핸드폰의 <span className="text-rose-500 font-extrabold">핫스팟(테더링)</span>에 PC를 연결합니다.</li>
                                <li>이제 PC와 핸드폰이 <strong className="text-primary">동일한 모바일 IP</strong>를 공유하게 됩니다.</li>
                            </ol>
                            <p className="text-xs text-primary font-medium mt-2">
                                ※ 이 상태에서 PC 로그인을 하면 구글이 "신뢰할 수 있는 기기/네트워크"로 인식하여 추가 인증을 요구하지 않습니다.
                            </p>
                        </div>
                    </div>

                    {/* Step 2: PC Login */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-extrabold">Step 2</span>
                            PC에서 로그인 (설정 브라우저)
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            위의 LTE 연결 상태를 유지한 채, TinCan 마법사의 <strong className="text-foreground">[설정 브라우저 열기]</strong> 버튼을 누릅니다.
                            <br />
                            동일 IP 환경이므로 아이디/비밀번호만 입력하면 바로 로그인됩니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 my-2">
                        <div className="flex-1 h-px bg-border/80" />
                        <span className="text-xs font-bold text-muted-foreground px-2">- 로그인 성공 후 API 키 발급 단계 -</span>
                        <div className="flex-1 h-px bg-border/80" />
                    </div>

                    {/* Step 3: Project */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-extrabold">Step 3</span>
                            구글 클라우드 프로젝트 생성
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            로그인된 설정 브라우저에서 Google Cloud Console에 접속해 새 프로젝트를 만듭니다.
                        </p>
                        <Button variant="link" className="h-auto p-0 text-primary text-xs font-bold" onClick={() => window.open('https://console.cloud.google.com/projectcreate', '_blank')}>
                            프로젝트 생성 페이지 바로가기 <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </div>

                    {/* Step 4: API Enable */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-extrabold">Step 4</span>
                            YouTube Data API 활성화
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            라이브러리에서 <strong className="text-foreground">YouTube Data API v3</strong>를 검색하여 '사용(Enable)' 버튼을 누릅니다.
                        </p>
                        <Button variant="link" className="h-auto p-0 text-primary text-xs font-bold" onClick={() => window.open('https://console.cloud.google.com/apis/library/youtube.googleapis.com', '_blank')}>
                            API 라이브러리 바로가기 <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </div>

                    {/* Step 5: Consent Screen */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-extrabold">Step 5</span>
                            OAuth 동의 화면 구성
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            'OAuth 동의 화면' 메뉴로 이동하여 아래 단계를 따라 설정합니다.
                        </p>

                        <div className="bg-card p-4 rounded-xl border border-border/80 space-y-3">
                            {/* 초기 화면: 사용자 유형 선택 */}
                            <div className="bg-primary/10 p-3.5 rounded-lg border-l-4 border-primary">
                                <p className="text-xs font-bold text-primary mb-1">
                                    🔷 초기 설정 (최초 1회만)
                                </p>
                                <div className="space-y-1 text-xs text-foreground/90">
                                    <p>• <strong className="text-primary">'외부(External)'</strong> 라디오 버튼 선택</p>
                                    <p>• <strong>[만들기]</strong> 버튼 클릭</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        ※ 이미 설정했다면 바로 아래 "프로젝트 구성"으로 이동
                                    </p>
                                </div>
                            </div>

                            {/* 프로젝트 구성 화면 */}
                            <div className="bg-muted/30 p-3.5 rounded-lg border border-border">
                                <p className="text-xs font-bold text-foreground border-b border-border pb-2 mb-2.5">
                                    📝 프로젝트 구성 (4단계 진행)
                                </p>

                                <div className="space-y-2.5">
                                    {/* 1. 앱 정보 */}
                                    <div className="pl-3 border-l-4 border-indigo-500 text-xs">
                                        <p className="font-bold text-foreground mb-0.5">① 앱 정보</p>
                                        <div className="space-y-0.5 text-muted-foreground">
                                            <p>• <strong>앱 이름</strong>: ViraLoop</p>
                                            <p>• <strong>사용자 지원 이메일</strong>: 본인 이메일 선택</p>
                                            <p className="text-[10px] text-muted-foreground/80">→ 나머지는 비워두고 [저장 후 계속] 클릭</p>
                                        </div>
                                    </div>

                                    {/* 2. 대상 */}
                                    <div className="pl-3 border-l-4 border-border text-xs">
                                        <p className="font-bold text-foreground mb-0.5">② 대상</p>
                                        <div className="space-y-0.5 text-muted-foreground">
                                            <p>• <strong className="text-primary">'외부'</strong> 라디오 버튼 확인</p>
                                            <p className="text-[10px] text-muted-foreground/80">→ 변경 없이 [저장 후 계속] 클릭</p>
                                        </div>
                                    </div>

                                    {/* 3. 연락처 정보 */}
                                    <div className="pl-3 border-l-4 border-emerald-500 text-xs">
                                        <p className="font-bold text-foreground mb-0.5">③ 연락처 정보</p>
                                        <div className="space-y-0.5 text-muted-foreground">
                                            <p>• <strong>개발자 연락처 정보</strong>: 본인 이메일 입력</p>
                                            <p className="text-[10px] text-muted-foreground/80">→ [저장 후 계속] 클릭</p>
                                        </div>
                                    </div>

                                    {/* 4. 완료 */}
                                    <div className="pl-3 border-l-4 border-blue-500 text-xs">
                                        <p className="font-bold text-foreground mb-0.5">④ 완료</p>
                                        <div className="space-y-0.5 text-muted-foreground">
                                            <p>• 요약 화면 확인 후 [대시보드로 돌아가기] 클릭</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 테스트 사용자 추가 (필수!) */}
                            <div className="bg-rose-500/10 p-3.5 rounded-lg border-l-4 border-rose-500">
                                <p className="text-xs font-bold text-rose-400 mb-1">
                                    ⚠️ 필수: 테스트 사용자 추가
                                </p>
                                <div className="space-y-1 text-xs text-foreground/90">
                                    <p className="font-bold">대시보드로 돌아온 후 반드시 진행:</p>
                                    <p>1. 'OAuth 동의 화면' 페이지 하단의 <strong>'테스트 사용자'</strong> 섹션 찾기</p>
                                    <p>2. <strong>[+ ADD USERS]</strong> 버튼 클릭</p>
                                    <p>3. <strong className="text-rose-400">본인의 구글 계정 이메일 추가</strong></p>
                                    <p>4. [저장] 클릭</p>
                                    <p className="text-[11px] text-rose-400 mt-1 font-bold bg-card p-2 rounded-lg border border-rose-500/20">
                                        ※ 이 단계를 건너뛰면 API 사용 시 403 Forbidden 에러 발생!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 6: Credentials */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-extrabold">Step 6</span>
                            사용자 인증 정보 만들기
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            '사용자 인증 정보 만들기' &gt; 'OAuth 클라이언트 ID' &gt; <strong className="text-primary">데스크톱 앱</strong> 선택
                        </p>

                        <div className="border border-primary/30 bg-primary/10 p-3.5 rounded-xl space-y-1">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <div className="text-xs text-primary font-bold">
                                        중요: 애플리케이션 유형 선택
                                    </div>
                                    <div className="text-xs text-foreground/80">
                                        <strong>"데스크톱 앱"</strong>을 선택하세요. 리디렉션 URI는 입력하지 않아도 됩니다. ("웹 애플리케이션" 아님)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 7: Download */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            <span className="bg-primary text-white px-2 py-0.5 rounded text-xs font-extrabold">Final</span>
                            JSON 다운로드 및 등록
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            생성된 OAuth ID의 JSON을 다운로드 받아 마법사의 [4단계] 화면에 업로드하세요.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GoogleAuthGuide;

