import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Flame, Shield, Globe, TrendingUp, Users, Clock, AlertTriangle,
    CheckCircle2, Zap, RefreshCw, Eye, Sparkles, Smartphone, Award
} from 'lucide-react';

interface IncubationGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const IncubationGuide: React.FC<IncubationGuideProps> = ({ open, onOpenChange }) => {
    const [activeTab, setActiveTab] = useState("sop_lifecycle");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-card border-border text-foreground shadow-2xl rounded-2xl p-4 sm:p-6">
                <DialogHeader className="border-b border-border/80 pb-3 pr-8">
                    <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                        <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0" />
                        <span>YouTube 채널 인큐베이팅 & 계정 거버넌스 완전 가이드</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        신규 계정 시드 예열부터 브랜드 채널 개설, 기존 3단계 채널 즉시 투입, 운영 중 상시 유지 웜업까지의 단일 종합 지침서입니다.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 pt-2">
                    <TabsList className="grid grid-cols-4 bg-muted/70 p-1 rounded-xl w-full h-auto text-xs">
                        <TabsTrigger value="sop_lifecycle" className="py-2 text-[11px] sm:text-xs font-bold">
                            🌱 신규 4단계 육성 SOP
                        </TabsTrigger>
                        <TabsTrigger value="mature_fasttrack" className="py-2 text-[11px] sm:text-xs font-bold">
                            ⚡ 기존 3단계 채널 Fast-Track
                        </TabsTrigger>
                        <TabsTrigger value="routine_warmup" className="py-2 text-[11px] sm:text-xs font-bold">
                            🛡️ 운영 중 상시 웜업
                        </TabsTrigger>
                        <TabsTrigger value="day_by_day" className="py-2 text-[11px] sm:text-xs font-bold">
                            🔬 7일 알고리즘 육성
                        </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 h-[calc(90vh-140px)] pr-2 sm:pr-4 mt-3">
                        <div className="space-y-5 py-1 text-foreground">
                            {/* TAB 1: 신규 계정 4단계 육성 SOP */}
                            <TabsContent value="sop_lifecycle" className="space-y-4 mt-0">
                                <section className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-2">
                                    <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 text-xs sm:text-sm">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>왜 신규 계정은 생성 즉시 채널을 만들면 안 되는가? (0뷰 감옥의 메커니즘)</span>
                                    </h4>
                                    <p className="text-xs text-foreground/90 leading-relaxed">
                                        유튜브 알고리즘은 시청 기록(Watch History)과 추천 쿠키가 전혀 없는 구글 계정이 생성되자마자 브랜드 채널을 파고 영상을 올리면,
                                        이를 <strong>'스팸 살포용 일회성 어뷰징 봇'</strong>으로 즉각 규정합니다.
                                        그 결과 채널은 활성화되더라도 쇼츠 피드 노출 알고리즘에서 영구 격리되어 <strong>'조회수 0의 덫'</strong>에 갇히게 됩니다.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-indigo-500" /> 신규 계정 4단계 표준 운영 절차 (SOP)
                                    </h3>

                                    <div className="space-y-3">
                                        {/* Step 0 */}
                                        <div className="p-3.5 sm:p-4 bg-card border border-border rounded-xl space-y-2 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-primary text-primary-foreground text-[10px] font-extrabold px-2 py-0.5 rounded">Step 0</span>
                                                    <span className="font-bold text-foreground text-xs sm:text-sm">모바일 LTE 청정 환경에서 구글 계정 생성</span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] font-mono border-border">연좌제 0% 차단</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                                                • <strong>공폰 또는 테더링 모바일</strong>에서 가정용/공용 Wi-Fi를 끄고, 통신사 순수 LTE 데이터망에서 구글 신규 계정을 생성합니다.<br />
                                                • 기존 계정이 수십 개 얽혀 있는 메인 스마트폰의 로컬 저장소 오염을 방지하기 위해 생성 직후 로그아웃하거나 PC 전용 프로필로 분리 이관합니다.<br />
                                                • EveryProxy(SOCKS5 127.0.0.1:1080) 테더링 프록시를 통해 PC CloakBrowser로 안전하게 등록합니다.
                                            </p>
                                        </div>

                                        {/* Step 1 */}
                                        <div className="p-3.5 sm:p-4 bg-card border border-border rounded-xl space-y-2 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded">Step 1</span>
                                                    <span className="font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm">1단계 시드 예열 (Seed Warmup - 개인 계정 상태)</span>
                                                </div>
                                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">소요 시간: 3~4분</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                                                • 대시보드 계정 목록에서 <strong>[📱 1단계 시드 예열]</strong> 버튼을 클릭합니다.<br />
                                                • 스텔스 브라우저가 아직 채널이 없는 <strong>순수 개인 구글 계정 상태</strong>로 유튜브에 접속하여 홈 피드 탐색, 지식/트렌드 영상 3편을 인간처럼 자연스럽게 완청합니다.<br />
                                                • 시청 직후 정상적인 쿠키와 관심사 가중치가 생성되며, 모바일 LTE IP가 비행기탑승/APN으로 자동 세탁되어 통신사 청정 IP를 재할당받습니다.
                                            </p>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="p-3.5 sm:p-4 bg-card border border-border rounded-xl space-y-2 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded">Step 2</span>
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">브랜드 채널 자동 개설 (인간형 트래젝토리)</span>
                                                </div>
                                                <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px]">자동 완결</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                                                • 시드 예열이 완료되면 비로소 <strong>[✨ 브랜드 채널 자동 개설]</strong> 버튼이 안전하게 활성화됩니다.<br />
                                                • 원하는 채널명만 입력하면 홈 피드 ➔ 우측 상단 아바타 ➔ 계정 전환 / 채널 추가 ➔ 채널 생성의 실제 인간 마우스 궤적으로 안전하게 개설됩니다.<br />
                                                • 생성 완료 후 유튜브 스튜디오에서 고유 식별자(<code className="font-mono bg-muted px-1 rounded">UC...</code> 채널 ID)를 자동 추출하여 시스템에 바인딩합니다.
                                            </p>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="p-3.5 sm:p-4 bg-card border border-border rounded-xl space-y-2 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded">Step 3</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">7일 알고리즘 심화 육성 & 쇼츠 안정적 발행</span>
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">신뢰도 95% 달성</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                                                • [전략 설정]에서 채널의 니치(역사, 유머, 지식 등)를 등록하고 일일 웜업 스케줄을 가동합니다.<br />
                                                • 7일간 점진적으로 체류 시간과 인터랙션(좋아요, 댓글, 구독)을 확장하며 알고리즘 신뢰 점수(Trust Score)를 확보합니다.<br />
                                                • 이제 시스템을 통해 매일 제작되는 쇼츠가 0뷰 페널티 없이 탐색 피드와 추천 알고리즘에 즉각 정상 배포됩니다.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </TabsContent>

                            {/* TAB 2: 기존 3단계 채널 Fast-Track */}
                            <TabsContent value="mature_fasttrack" className="space-y-4 mt-0">
                                <section className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl space-y-2">
                                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-xs sm:text-sm">
                                        <Zap className="w-4 h-4 shrink-0" />
                                        <span>이미 채널이 있고 3단계 고급 인증을 마친 계정인가요?</span>
                                    </h4>
                                    <div className="text-xs text-foreground/90 leading-relaxed">
                                        기존에 직접 운영하던 채널이거나, 전화번호 인증(2단계) 및 신분증/영상 인증(3단계 고급 기능)을 모두 완료한 계정은
                                        <strong> 신규 계정용 1단계 시드 예열이나 브랜드 채널 신규 개설을 거칠 필요가 전혀 없습니다.</strong>
                                        ViraLoop의 Fast-Track 파이프라인을 통해 즉시 <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">MATURE</Badge> 상태로 등록되어 쇼츠 제작·발행에 즉시 투입할 수 있습니다.
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 기존 채널 2가지 즉시 연동 루트
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-4 bg-card border border-border rounded-xl space-y-2 shadow-2xs">
                                            <div className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-primary" />
                                                루트 A: 계정 등록 마법사에서 직접 지정
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                <strong>[새 계정 등록]</strong> 마법사 1단계에서 <strong>"⚡ 기존 완성 채널 (3단계 인증)"</strong> 카드를 선택합니다.
                                                구글 로그인 완료 시 스텔스 브라우저가 유튜브 스튜디오에 접속하여 기존 채널의 ID, 핸들, 로고를 자동 수집하고 상태를 즉시 <code className="font-mono bg-muted px-1 rounded">MATURE</code>로 설정합니다.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-card border border-border rounded-xl space-y-2 shadow-2xs">
                                            <div className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                루트 B: 기존 등록 계정 '🔍 기존 채널 연동' 클릭
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                이미 시스템에 등록된 계정이라도 채널 열 우측의 <strong>[🔍 기존 채널 연동 (3단계)]</strong> 버튼을 한 번 클릭하면,
                                                브라우저가 백그라운드에서 스튜디오 정보를 스카우팅하여 누락된 채널 정보를 자동 연결하고 즉시 활성화 상태로 전환합니다.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3.5 bg-muted/40 rounded-xl border border-border/80 text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                                            <Award className="w-4 h-4 text-amber-500" />
                                            <span>3단계 고급 인증 채널의 메리트:</span>
                                        </div>
                                        <ul className="text-muted-foreground space-y-1 pl-1">
                                            <li>• <strong>하루 업로드 한도 대폭 증가</strong>: 기본 계정(10~15개) 대비 하루 최대 50~100개까지 쇼츠 발행 가능.</li>
                                            <li>• <strong>쇼츠 설명란 외부 링크 활성화</strong>: 고정 댓글 및 설명란 링크 클릭 허용으로 수익화 유입 극대화.</li>
                                            <li>• <strong>주의사항</strong>: 아무리 3단계 계정이라도 '오직 업로드만 하는 행위'는 금물이므로, 아래 <strong>[운영 중 상시 웜업]</strong> 지침을 반드시 준수해야 합니다.</li>
                                        </ul>
                                    </div>
                                </section>
                            </TabsContent>

                            {/* TAB 3: 운영 중 상시 웜업 */}
                            <TabsContent value="routine_warmup" className="space-y-4 mt-0">
                                <section className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs sm:text-sm">
                                        <Flame className="w-4 h-4 shrink-0" />
                                        <span>채널 운영 중에도 웜업이 왜 반드시 필요한가? (활동 비대칭성 감지 봇 방어)</span>
                                    </h4>
                                    <p className="text-xs text-foreground/90 leading-relaxed">
                                        실제 인간 크리에이터는 평소에도 유튜브 앱을 열어 다른 크리에이터 영상을 보고, 피드를 내리고, 댓글을 달다가 자기 영상을 올립니다.<br />
                                        반면 구글 봇 탐지 센서가 가장 손쉽게 적발하는 패턴은 <strong>'평소 시청 엔트로피가 0이다가, 오직 영상 업로드 시점에만 10초 접속해서 비디오만 띡 밀어 넣고 사라지는 계정(Upload-Only Ghost Bot)'</strong>입니다.<br />
                                        이 패턴이 2~3회 누적되면 알고리즘은 채널을 '자동화 공장'으로 낙인찍어 추천 노출을 차단합니다.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-indigo-500" /> ViraLoop의 2중 상시 웜업 보호망
                                    </h3>

                                    <div className="space-y-3">
                                        {/* Pre-upload Warmup */}
                                        <div className="p-3.5 sm:p-4 bg-card border border-border rounded-xl space-y-2 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-4 h-4 text-blue-500 shrink-0" />
                                                    <span className="font-bold text-foreground text-xs sm:text-sm">1. 업로드 직전 15~30초 자동 프리-웜업 (Pre-Upload Warmup)</span>
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">엔진 내장</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                                                • ViraLoop 브라우저 업로더(`browser_uploader.py`)는 영상을 올릴 때 곧바로 스튜디오 URL로 직행하지 않습니다.<br />
                                                • 먼저 <strong>유튜브 메인 홈 피드(`youtube.com`)에 진입하여 15~30초 동안 자연스러운 스크롤과 마우스 배회 모션을 생성</strong>합니다.<br />
                                                • 이 인간형 완충 버퍼(Human Buffer)를 거친 후 스튜디오로 이동함으로써 구글의 실시간 세션 감시 센서를 완벽하게 속입니다.
                                            </p>
                                        </div>

                                        {/* Routine Maintenance Warmup */}
                                        <div className="p-3.5 sm:p-4 bg-card border border-border rounded-xl space-y-2 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <RefreshCw className="w-4 h-4 text-orange-500 shrink-0" />
                                                    <span className="font-bold text-foreground text-xs sm:text-sm">2. 주간 상시 유지 순찰 웜업 (Routine Maintenance)</span>
                                                </div>
                                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]">권장: 2~3일당 1회</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                                                • 영상을 매일 업로드하지 않는 날이라도, 2~3일에 한 번씩 계정 목록의 <strong>[🔥 상시 유지 웜업]</strong>을 가동합니다.<br />
                                                • 동종 니치 영상 2~3편을 3분간 감상하고 건강한 시청 기록을 유지함으로써 채널의 세션 생명력(Account Health)을 최상급으로 방어합니다.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </TabsContent>

                            {/* TAB 4: 7일 알고리즘 육성 프로세스 (기존 정밀 데이터) */}
                            <TabsContent value="day_by_day" className="space-y-4 mt-0">
                                {/* Core Components */}
                                <section>
                                    <h3 className="text-xs sm:text-sm font-bold mb-2.5 text-foreground">인큐베이팅 6대 핵심 구성 요소</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        <ComponentCard
                                            icon={<Flame className="w-4 h-4 text-orange-400" />}
                                            title="웜업 (Warmup)"
                                            importance="10/10"
                                            description="새로운 계정을 인간처럼 활성화"
                                            color="orange"
                                        />
                                        <ComponentCard
                                            icon={<Globe className="w-4 h-4 text-blue-400" />}
                                            title="IP 로테이션"
                                            importance="9/10"
                                            description="모바일 LTE 통신사 고유 IP 사용"
                                            color="blue"
                                        />
                                        <ComponentCard
                                            icon={<Shield className="w-4 h-4 text-emerald-400" />}
                                            title="프로필 격리"
                                            importance="9/10"
                                            description="독립적인 브라우저 프로필 및 스토리지"
                                            color="green"
                                        />
                                        <ComponentCard
                                            icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
                                            title="콘텐츠 전략"
                                            importance="8/10"
                                            description="일관된 업로드 패턴 및 태그 매칭"
                                            color="purple"
                                        />
                                        <ComponentCard
                                            icon={<Users className="w-4 h-4 text-pink-400" />}
                                            title="참여 패턴"
                                            importance="7/10"
                                            description="점진적 좋아요/댓글/구독 인터랙션"
                                            color="pink"
                                        />
                                        <ComponentCard
                                            icon={<Clock className="w-4 h-4 text-slate-400" />}
                                            title="휴면 관리"
                                            importance="6/10"
                                            description="장기 미사용 계정 재활성화"
                                            color="gray"
                                        />
                                    </div>
                                </section>

                                {/* Day 1 ~ 7 Cards */}
                                <section>
                                    <h3 className="text-xs sm:text-sm font-bold mb-2.5 text-foreground">7일 정밀 육성 일일 로드맵</h3>
                                    <div className="space-y-2.5">
                                        <DayCard
                                            day={1}
                                            title="탐색 (Discovery)"
                                            duration="5-10분"
                                            activities={[
                                                "홈 피드 탐색 및 관심 키워드 스캔",
                                                "1-2개 영상 시청 (45-90초 체류)",
                                                "검색 시도 (자연스러운 타이핑 딜레이)",
                                                "❌ 좋아요/댓글/구독 없음 (초기 인위성 배제)"
                                            ]}
                                            goal="초기 시청 기록 생성, 추천 알고리즘 학습 시작"
                                        />
                                        <DayCard
                                            day={2}
                                            title="관심사 형성 (Interest Building)"
                                            duration="10-15분"
                                            activities={[
                                                "2-3개 영상 시청 (60-240초)",
                                                "첫 좋아요 (50% 확률 기반)",
                                                "Shorts 3-5개 시청",
                                                "❌ 아직 댓글/구독 없음"
                                            ]}
                                            goal="관심사 프로필 구축, 추천 정확도 향상"
                                        />
                                        <DayCard
                                            day={3}
                                            title="커뮤니티 참여 (Community Engagement)"
                                            duration="15-20분"
                                            activities={[
                                                "3-4개 영상 시청 (120-300초)",
                                                "좋아요 (70%), 댓글 (50%), 구독 (30%)",
                                                "Shorts 5-7개 연속 시청",
                                                "✅ 정상적인 커뮤니티 활동 멤버 인식 시작"
                                            ]}
                                            goal="활성 사용자 인식, 커뮤니티 일원 확립"
                                        />
                                        <DayCard
                                            day={4}
                                            title="심화 탐색 (Deep Dive)"
                                            duration="20-30분"
                                            activities={[
                                                "4-5개 영상 시청 (180-420초 체류)",
                                                "관련 추천 영상 깊이 파고들기",
                                                "좋아요 (80%), 댓글 (60%), 구독 (40%)",
                                                "Shorts 7-10개 소비"
                                            ]}
                                            goal="강력한 관심사 프로필, 높은 참여 신호 확보"
                                        />
                                        <DayCard
                                            day={5}
                                            title="안정화 (Stabilization)"
                                            duration="15-25분"
                                            activities={[
                                                "3-4개 영상 시청 및 재생목록 탐색",
                                                "일관된 자연 참여 패턴 확립",
                                                "Shorts 5-8개 소비"
                                            ]}
                                            goal="행동 패턴 안정화, 알고리즘 신뢰도 강화"
                                        />
                                        <DayCard
                                            day={6}
                                            title="다양화 (Diversification)"
                                            duration="25-35분"
                                            activities={[
                                                "5-6개 영상 (니치 외 다양한 카테고리 포함)",
                                                "검색 3-4회 (연관 검색어 탐색)",
                                                "커뮤니티 탭 방문 및 투표 참여",
                                                "Shorts 8-12개 소비"
                                            ]}
                                            goal="다차원적 사용자 프로필, 봇 오인 원천 차단"
                                        />
                                        <DayCard
                                            day={7}
                                            title="성숙 (Maturation)"
                                            duration="30-45분"
                                            activities={[
                                                "6-8개 영상 (롱폼 포함, 4-10분 완청)",
                                                "재생목록 생성 및 영상 저장",
                                                "채널 프로필 설정 확인",
                                                "Shorts 10-15개 소비"
                                            ]}
                                            goal="완전 활성화, 최대 신뢰도 달성, 안전한 쇼츠 발행 개시"
                                        />
                                    </div>
                                </section>

                                {/* Scientific Basis */}
                                <section>
                                    <h3 className="text-xs sm:text-sm font-bold mb-2.5 text-foreground">웜업의 3대 과학적 원리</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                        <PrincipleCard
                                            title="1. 점진적 신뢰 구축"
                                            description="인간은 점진적으로 플랫폼에 익숙해집니다. Day 1은 탐색만, Day 2는 첫 좋아요, Day 3는 첫 댓글/구독으로 자연스러운 학습 곡선을 만듭니다."
                                        />
                                        <PrincipleCard
                                            title="2. 행동 패턴 다양성"
                                            description="실제 사용자는 예측 불가능합니다. 랜덤 시청 시간, 확률 기반 참여, 조기 종료 등으로 패턴 인식을 방지합니다."
                                        />
                                        <PrincipleCard
                                            title="3. 시간 분산"
                                            description="봇은 즉각적이지만 인간은 점진적입니다. 24시간 간격, 액션 간 지연, 불규칙한 활동 시간으로 자동화 의심을 감소시킵니다."
                                        />
                                    </div>
                                </section>

                                {/* Warnings */}
                                <section>
                                    <h3 className="text-xs sm:text-sm font-bold mb-2.5 text-foreground">주의사항</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 space-y-1.5">
                                            <h4 className="font-bold text-rose-400 text-xs flex items-center gap-1.5">❌ 절대 금지</h4>
                                            <ul className="text-xs text-rose-300/90 space-y-1">
                                                <li>• 시드 예열 생략 후 즉시 채널 개설</li>
                                                <li>• 동일 고정 가정용 IP에서 다중 계정 생성</li>
                                                <li>• 브라우저 프로필 간 쿠키 복사/공유</li>
                                                <li>• 신규 계정 5일 쿨다운 무시</li>
                                            </ul>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-1.5">
                                            <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">⚠️ 신규 계정 5일 쿨다운</h4>
                                            <p className="text-xs text-amber-300/90 leading-snug">
                                                최근 생성된 계정은 로그인 시 <strong>"5일 후 다시 시도"</strong> 보안 창이 뜰 수 있습니다.
                                            </p>
                                            <ul className="text-xs text-amber-300/80 space-y-0.5 pt-0.5">
                                                <li>• 대처: 무리한 재로그인 중지 후 5일 대기</li>
                                                <li>• 원인: Google 신규 가입자 섀도우 보호 정책</li>
                                            </ul>
                                        </div>
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                                            <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">✅ 권장 수칙</h4>
                                            <ul className="text-xs text-emerald-300/90 space-y-1">
                                                <li>• LTE 테더링 IP 소프트 세탁 필수</li>
                                                <li>• 주 2~3회 상시 유지 웜업 병행</li>
                                                <li>• 매일 정기적인 세션 상태 모니터링</li>
                                                <li>• 채널당 독립적인 고유 니치 설정</li>
                                            </ul>
                                        </div>
                                    </div>
                                </section>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

// Helper Components
const ComponentCard = ({ icon, title, importance, description, color }: any) => {
    const colorClasses: Record<string, string> = {
        orange: "bg-orange-500/10 border-orange-500/25 text-orange-400",
        blue: "bg-blue-500/10 border-blue-500/25 text-blue-400",
        green: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
        purple: "bg-purple-500/10 border-purple-500/25 text-purple-400",
        pink: "bg-pink-500/10 border-pink-500/25 text-pink-400",
        gray: "bg-muted/40 border-border text-muted-foreground"
    };

    return (
        <div className={`border rounded-xl p-3 shadow-2xs transition-all ${colorClasses[color] || colorClasses.gray}`}>
            <div className="flex items-start gap-2.5 mb-1">
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-foreground truncate">{title}</div>
                    <Badge variant="outline" className="text-[10px] mt-0.5 font-bold bg-card/60 border-border">중요도: {importance}</Badge>
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{description}</p>
        </div>
    );
};

const DayCard = ({ day, title, duration, activities, goal }: any) => {
    return (
        <div className="border border-border/80 bg-card rounded-xl p-3 sm:p-3.5 hover:border-orange-500/40 transition-colors shadow-2xs">
            <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Badge className="bg-orange-600 text-white text-[10px] font-extrabold shrink-0">Day {day}</Badge>
                    <span className="font-bold text-xs sm:text-sm text-foreground truncate">{title}</span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">{duration}</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 mb-2.5 pl-1">
                {activities.map((activity: string, idx: number) => (
                    <li key={idx}>• {activity}</li>
                ))}
            </ul>
            <div className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-lg p-2">
                <strong className="font-bold">목표:</strong> <span className="text-foreground/90 ml-1">{goal}</span>
            </div>
        </div>
    );
};

const PrincipleCard = ({ title, description }: any) => {
    return (
        <div className="bg-muted/40 border border-border/80 rounded-xl p-3 space-y-1 shadow-2xs">
            <h4 className="font-bold text-xs sm:text-sm text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
};

export default IncubationGuide;
