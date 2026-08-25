import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Flame, Shield, Globe, TrendingUp, Users, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface IncubationGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const IncubationGuide: React.FC<IncubationGuideProps> = ({ open, onOpenChange }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-card border-border text-foreground shadow-2xl rounded-2xl p-4 sm:p-6">
                <DialogHeader className="border-b border-border/80 pb-3 pr-8">
                    <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                        <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0" />
                        <span>YouTube 계정 인큐베이팅 완전 가이드</span>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[calc(90vh-100px)] pr-2 sm:pr-4">
                    <div className="space-y-6 py-2 text-foreground">
                        {/* Overview */}
                        <section className="bg-muted/30 p-4 rounded-xl border border-border/80">
                            <h3 className="text-sm sm:text-base font-bold mb-2 text-foreground flex items-center gap-1.5">
                                📌 개요
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                YouTube 브랜드 채널의 안전하고 효과적인 운영을 위한 종합 인큐베이팅 전략입니다.
                                웜업은 가장 중요한 첫 단계이지만, 지속 가능한 계정 운영을 위해서는 다양한 보안 및 운영 전략이 필요합니다.
                            </p>
                        </section>

                        {/* Core Components */}
                        <section>
                            <h3 className="text-sm sm:text-base font-bold mb-3 text-foreground">핵심 구성 요소</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <ComponentCard
                                    icon={<Flame className="w-5 h-5 text-orange-400" />}
                                    title="웜업 (Warmup)"
                                    importance="10/10"
                                    description="새로운 계정을 인간처럼 활성화"
                                    color="orange"
                                />
                                <ComponentCard
                                    icon={<Globe className="w-5 h-5 text-blue-400" />}
                                    title="IP 로테이션"
                                    importance="9/10"
                                    description="각 채널마다 고유 IP 사용"
                                    color="blue"
                                />
                                <ComponentCard
                                    icon={<Shield className="w-5 h-5 text-emerald-400" />}
                                    title="프로필 격리"
                                    importance="9/10"
                                    description="독립적인 브라우저 프로필"
                                    color="green"
                                />
                                <ComponentCard
                                    icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
                                    title="콘텐츠 전략"
                                    importance="8/10"
                                    description="일관된 업로드 패턴"
                                    color="purple"
                                />
                                <ComponentCard
                                    icon={<Users className="w-5 h-5 text-pink-400" />}
                                    title="참여 패턴"
                                    importance="7/10"
                                    description="자연스러운 참여 활동"
                                    color="pink"
                                />
                                <ComponentCard
                                    icon={<Clock className="w-5 h-5 text-slate-400" />}
                                    title="휴면 관리"
                                    importance="6/10"
                                    description="장기 미사용 계정 재활성화"
                                    color="gray"
                                />
                            </div>
                        </section>

                        {/* Warmup Process */}
                        <section>
                            <h3 className="text-sm sm:text-base font-bold mb-3 text-foreground">웜업 프로세스 (7일)</h3>
                            <div className="space-y-3">
                                <DayCard
                                    day={1}
                                    title="탐색 (Discovery)"
                                    duration="5-10분"
                                    activities={[
                                        "홈 피드 탐색",
                                        "1-2개 영상 시청 (45-90초)",
                                        "검색 시도 (실패 시)",
                                        "❌ 좋아요/댓글/구독 없음"
                                    ]}
                                    goal="초기 시청 기록 생성, 추천 알고리즘 학습 시작"
                                />
                                <DayCard
                                    day={2}
                                    title="관심사 형성 (Interest Building)"
                                    duration="10-15분"
                                    activities={[
                                        "2-3개 영상 시청 (60-240초)",
                                        "첫 좋아요 (50% 확률)",
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
                                        "Shorts 5-7개",
                                        "✅ 커뮤니티 멤버 활동 시작"
                                    ]}
                                    goal="활성 사용자 인식, 커뮤니티 일원 확립"
                                />
                                <DayCard
                                    day={4}
                                    title="심화 탐색 (Deep Dive)"
                                    duration="20-30분"
                                    activities={[
                                        "4-5개 영상 시청 (180-420초)",
                                        "관련 영상 탐색 (30% 확률)",
                                        "좋아요 (80%), 댓글 (60%), 구독 (40%)",
                                        "Shorts 7-10개"
                                    ]}
                                    goal="강력한 관심사 프로필, 높은 참여 신호"
                                />
                                <DayCard
                                    day={5}
                                    title="안정화 (Stabilization)"
                                    duration="15-25분"
                                    activities={[
                                        "3-4개 영상 시청",
                                        "재생목록 탐색",
                                        "일관된 참여 패턴",
                                        "Shorts 5-8개"
                                    ]}
                                    goal="패턴 안정화, 알고리즘 신뢰 강화"
                                />
                                <DayCard
                                    day={6}
                                    title="다양화 (Diversification)"
                                    duration="25-35분"
                                    activities={[
                                        "5-6개 영상 (다양한 카테고리)",
                                        "검색 3-4회 (다른 키워드)",
                                        "커뮤니티 탭 방문",
                                        "Shorts 8-12개"
                                    ]}
                                    goal="다차원적 프로필, 자연스러운 사용자"
                                />
                                <DayCard
                                    day={7}
                                    title="성숙 (Maturation)"
                                    duration="30-45분"
                                    activities={[
                                        "6-8개 영상 (긴 영상 포함, 4-10분)",
                                        "재생목록 생성/추가",
                                        "프로필 설정 확인",
                                        "Shorts 10-15개"
                                    ]}
                                    goal="완전 활성화, 최대 신뢰도, 안전한 운영 준비"
                                />
                            </div>
                        </section>

                        {/* Scientific Basis */}
                        <section>
                            <h3 className="text-sm sm:text-base font-bold mb-3 text-foreground">웜업의 과학적 근거</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

                        {/* Expected Results */}
                        <section>
                            <h3 className="text-sm sm:text-base font-bold mb-3 text-foreground">예상 결과</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ResultCard
                                    period="7일 후"
                                    metrics={[
                                        "계정 신뢰도: 85-95%",
                                        "봇 감지 위험: 5% 이하",
                                        "정지 위험: 거의 없음"
                                    ]}
                                />
                                <ResultCard
                                    period="1개월 후"
                                    metrics={[
                                        "완전 활성화",
                                        "정상 추천 수신",
                                        "안정적인 성장"
                                    ]}
                                />
                                <ResultCard
                                    period="3개월 후"
                                    metrics={[
                                        "성숙한 계정",
                                        "높은 참여율",
                                        "장기 운영 가능"
                                    ]}
                                />
                            </div>
                        </section>

                        {/* Warnings */}
                        <section>
                            <h3 className="text-sm sm:text-base font-bold mb-3 text-foreground">주의사항</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 space-y-2">
                                    <h4 className="font-bold text-rose-400 text-xs sm:text-sm flex items-center gap-1.5">❌ 절대 금지</h4>
                                    <ul className="text-xs text-rose-300/90 space-y-1">
                                        <li>• 웜업 생략 (즉시 차단 위험)</li>
                                        <li>• 같은 IP에서 여러 계정</li>
                                        <li>• 프로필 공유/복사</li>
                                        <li>• <strong>신규 계정 5일 쿨다운 무시</strong></li>
                                    </ul>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                                    <h4 className="font-bold text-amber-400 text-xs sm:text-sm flex items-center gap-1.5">⚠️ 신규 계정 필독</h4>
                                    <p className="text-xs text-amber-300/90 leading-snug">
                                        최근 생성된 계정은 로그인 시 <strong>"5일 후 다시 시도"</strong> 메시지가 뜰 수 있습니다.
                                    </p>
                                    <ul className="text-xs text-amber-300/80 space-y-1 pt-1">
                                        <li>• 현상: 본인 인증 반복 요구</li>
                                        <li>• 대처: 5일간 웜업 일시 중지</li>
                                        <li>• 원인: Google 신규 가입자 보호 정책</li>
                                    </ul>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
                                    <h4 className="font-bold text-emerald-400 text-xs sm:text-sm flex items-center gap-1.5">✅ 권장 사항</h4>
                                    <ul className="text-xs text-emerald-300/90 space-y-1">
                                        <li>• 점진적 활동 증가</li>
                                        <li>• 자연스러운 패턴</li>
                                        <li>• 정기 모니터링</li>
                                        <li>• 백업 전략</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Conclusion */}
                        <section className="bg-primary/10 border border-primary/30 rounded-xl p-4 sm:p-5 space-y-3">
                            <h3 className="text-sm sm:text-base font-bold text-primary">결론</h3>
                            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                                YouTube 계정 인큐베이팅은 <strong>웜업을 중심으로 한 종합적인 전략</strong>입니다.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm pt-1">
                                <div className="bg-card/70 p-3 rounded-lg border border-border/80">
                                    <strong className="text-foreground font-bold">핵심 원칙:</strong>
                                    <ul className="mt-1.5 space-y-1 text-muted-foreground text-xs">
                                        <li>1. 인간처럼 행동 (웜업)</li>
                                        <li>2. 독립성 유지 (IP + 프로필)</li>
                                        <li>3. 일관성 유지 (콘텐츠 + 참여)</li>
                                        <li>4. 점진적 성장 (시간 + 신뢰)</li>
                                    </ul>
                                </div>
                                <div className="bg-card/70 p-3 rounded-lg border border-border/80">
                                    <strong className="text-foreground font-bold">성공의 열쇠:</strong>
                                    <ul className="mt-1.5 space-y-1 text-muted-foreground text-xs">
                                        <li>• 인내심 (7일 웜업 필수)</li>
                                        <li>• 일관성 (매일 24시간 간격)</li>
                                        <li>• 자연스러움 (랜덤 + 확률)</li>
                                        <li>• 모니터링 (로그 + 분석)</li>
                                    </ul>
                                </div>
                            </div>
                        </section>
                    </div>
                </ScrollArea>
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
        <div className={`border rounded-xl p-3 sm:p-3.5 shadow-2xs transition-all ${colorClasses[color]}`}>
            <div className="flex items-start gap-2.5 mb-1.5">
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-foreground truncate">{title}</div>
                    <Badge variant="outline" className="text-[10px] mt-1 font-bold bg-card/60 border-border">중요도: {importance}</Badge>
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        </div>
    );
};

const DayCard = ({ day, title, duration, activities, goal }: any) => {
    return (
        <div className="border border-border/80 bg-card rounded-xl p-3.5 hover:border-orange-500/40 transition-colors shadow-2xs">
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
            <div className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-lg p-2.5">
                <strong className="font-bold">목표:</strong> <span className="text-foreground/90">{goal}</span>
            </div>
        </div>
    );
};

const PrincipleCard = ({ title, description }: any) => {
    return (
        <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <h4 className="font-bold text-xs sm:text-sm text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
};

const ResultCard = ({ period, metrics }: any) => {
    return (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
            <h4 className="font-bold text-emerald-400 text-xs sm:text-sm">{period}</h4>
            <ul className="text-xs text-foreground/90 space-y-1">
                {metrics.map((metric: string, idx: number) => (
                    <li key={idx}>✅ {metric}</li>
                ))}
            </ul>
        </div>
    );
};

export default IncubationGuide;

