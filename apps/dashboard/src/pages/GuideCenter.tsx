import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen,
    Search,
    Zap,
    Video,
    Workflow,
    ChevronRight,
    Play,
    BarChart3,
    Download,
    Image as ImageIcon,
    Sparkles,
    Clapperboard,
    Scissors,
    Edit,
    Languages,
    Mic,
    Wand2,
    Share2,
    Activity,
    Shield,
    ListVideo,
    UploadCloud,
    FileText,
    LayoutGrid,
    Settings as SettingsIcon,
    TrendingUp,
    Globe,
    CheckCircle2,
    MousePointerClick,
    Info,
    Eraser,
    Radio,
    Moon,
    Sun,
    Layers,
    Users,
    FolderOpen,
    ExternalLink,
    Clock,
    Lock,
    ArrowUp,
    ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

export default function GuideCenter() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGuideKey, setSelectedGuideKey] = useState<string>('work_queue');

    // [2026 최신 ViraLoop Studio 아키텍처 전면 동기화 가이드]
    const detailedGuides: Record<string, {
        category: string;
        badge: string;
        icon: any;
        iconBg: string;
        titleOverride?: string;
        overview: string;
        features: { icon: any; title: string; desc: string; }[];
        steps: string[];
    }> = {
        // --- 1. 쇼츠 자동 배포 관리 ---
        work_queue: {
            category: "핵심 자동화",
            badge: "HOT",
            icon: Layers,
            iconBg: "from-blue-600 to-indigo-600",
            titleOverride: "쇼츠 자동 배포 관리 (Work Queue)",
            overview: "Flow AI 및 픽셀링(Pixeling) 메타 분석 기반으로 제작된 영상의 다채널 배포 스케줄과 백그라운드 렌더링 작업을 관리하는 중앙 대기열입니다. 실시간 다차원 검색, 채널/업로드 방식 세부 필터, 4종 정렬(등록/예약/채널/상태) 및 모바일 반응형 2단 칩 바를 완벽 지원합니다.",
            features: [
                {
                    icon: Search,
                    title: "🔍 실시간 다차원 통합 검색 & 빠른 지우기(X)",
                    desc: "제목, 채널명, 설명, 파일명, ID, 프로젝트 그룹명을 입력 즉시 클라이언트 사이드에서 실시간 필터링하며 X 버튼으로 원클릭 초기화됩니다."
                },
                {
                    icon: TrendingUp,
                    title: "🔀 다기능 정렬 컨트롤 & 방향 원클릭 토글",
                    desc: "등록순, 예약순, 채널순, 상태순 정렬과 오름차순/내림차순(최신순↔과거순) 토글 버튼으로 수많은 배포 항목을 원하는 순서로 즉시 정렬합니다."
                },
                {
                    icon: Activity,
                    title: "🎯 정밀 다채널 & 업로드 방식 세부 필터",
                    desc: "YouTube, TikTok, Instagram 채널별 필터링과 스텔스 자동 / 수동 / 즉시 등록 방식별 필터, 프로젝트 그룹 및 기간 필터를 제공합니다."
                },
                {
                    icon: Zap,
                    title: "픽셀링 메타 자동 파싱 & 1:1 표준 네이밍 매핑",
                    desc: "픽셀링 분석 메타 텍스트를 붙여넣으면 제목, 태그, 캡션, 보이스가 자동 구조화되며 CapCut 프로젝트명과 1:1로 일치되어 혼선이 없습니다."
                }
            ],
            steps: [
                "사이드바 또는 하단 네비게이션 탭에서 '배포관리 (쇼츠 자동 배포 관리)'를 선택합니다.",
                "상단 검색창에 키워드를 입력하거나 채널/방식 필터 및 정렬 버튼으로 원하는 항목을 빠르게 찾습니다.",
                "상단 '픽셀링 제작물 등록' 또는 '개별 영상 등록'으로 배포할 쇼츠를 대기열에 추가합니다.",
                "대기열 카드에서 [승인] 또는 [즉시 등록]을 눌러 다채널 자동 스케줄 송출을 실행합니다."
            ]
        },

        // --- 2. 채널 계정 & 웜업 육성 ---
        incubator: {
            category: "계정 보안 & 육성",
            badge: "PRO",
            icon: Shield,
            iconBg: "from-emerald-600 to-teal-600",
            titleOverride: "채널 계정 & 웜업 육성 (Incubator & Vault)",
            overview: "유튜브 브랜드 계정의 영구적인 안전 운영을 위해 CloakBrowser 및 ixBrowser 듀얼 스텔스 엔진을 지원하며, 안드로이드 스마트폰의 LTE Clean IP와 채널별 1:1 ISP 전용 고정 IP 바인딩, 6대 핵심 지표 미니멀 KPI 카드 및 모바일 전용 3단 계정 카드로 안전하게 육성합니다.",
            features: [
                {
                    icon: Activity,
                    title: "📊 6대 핵심 지표 미니멀 KPI 카드 관제",
                    desc: "전체 채널, 진행 중, 완료됨, 오류 발생, 일시정지, 대기 중 6개 상태를 간결하고 직관적인 미니멀 카드로 실시간 모니터링합니다."
                },
                {
                    icon: Shield,
                    title: "📱 모바일 프리미엄 계정 카드 & 스택형 웜업 제어",
                    desc: "이메일 풀 노출, 채널명 인코딩 정제(뚊 등 깨짐 방지), 스택형 웜업 레이아웃으로 작은 모바일 화면에서도 글자 찌그러짐 없이 완벽한 조작감을 제공합니다."
                },
                {
                    icon: Sparkles,
                    title: "하이브리드 IP 인프라 (LTE 동적 + ISP 전용 고정 IP)",
                    desc: "신규 채널 육성 시에는 스마트폰 LTE Clean IP(비행기모드 자동 리셋)를, 메인 브랜드 채널에는 1:1 전용 ISP 고정 IP(ip:port:user:pass)를 영구 매핑합니다."
                },
                {
                    icon: Lock,
                    title: "🛡️ 스텔스 보안 접속 & 7단계 인간 행동 모사 웜업",
                    desc: "원터치 스텔스 보안 접속으로 관리자 대시보드를 열고, 인간적인 탐색·시청·댓글 알고리즘으로 채널 신뢰도를 극대화합니다."
                }
            ],
            steps: [
                "하단 네비게이션 또는 메뉴에서 '육성관리 (채널 계정 & 웜업 육성)'로 이동합니다.",
                "상단 KPI 카드에서 현재 웜업 진행 상태와 전체 계정 현황을 한눈에 파악합니다.",
                "계정 카드에서 [🛡️ 스텔스 보안 접속]을 눌러 안전하게 유튜브 스튜디오에 접속합니다.",
                "하단 웜업 제어 영역에서 [⚙️ 전략 설정 마법사]를 열거나 [🔥 웜업 시작]을 눌러 자동 육성을 가동합니다."
            ]
        },

        // --- 3. 수집 영상 보관함 ---
        gallery: {
            category: "콘텐츠 보관 & 분석",
            badge: "VIRAL",
            icon: ImageIcon,
            iconBg: "from-amber-600 to-orange-600",
            titleOverride: "수집 영상 보관함 (Viral Gallery)",
            overview: "수집된 모든 숏폼/롱폼 영상을 1080p Full HD 무손실 품질로 보관하고, 바이럴 지수(Velocity Score)와 등급(S/A/B)별로 정렬하여 분석 및 2차 가공(CapCut/AI)으로 즉시 연결합니다.",
            features: [
                {
                    icon: ExternalLink,
                    title: "🔗 유튜브 원본 영상 원클릭 바로가기",
                    desc: "상세 모달 상단의 [🔗 유튜브 원본] 버튼, 카드 호버 툴바의 링크 아이콘을 통해 원본 소스 페이지를 즉시 열어 시청자 반응을 확인합니다."
                },
                {
                    icon: Zap,
                    title: "⚡ '⚡ AI 제작 가능' 상태 뱃지 & 실시간 분석",
                    desc: "다운로드 및 분석이 완료된 영상에 직관적인 제작 가능 뱃지를 부여하여 대기 상태를 한눈에 파악합니다."
                },
                {
                    icon: FolderOpen,
                    title: "📂 하이브리드 스마트 폴더 열기 & 클립보드 복사",
                    desc: "데스크톱 앱에서는 윈도우 탐색기(explorer.exe)를 즉시 열고, 웹/모바일 브라우저에서는 표준 저장 경로를 클립보드에 0.1초 만에 자동 복사합니다."
                },
                {
                    icon: TrendingUp,
                    title: "🎬 1080p Full HD 무손실 표준 다운로드",
                    desc: "수집 시점부터 1080p Full HD(AV1) 최고 화질로 저장되어 별도의 재다운로드 없이 최상의 화질로 제작에 활용됩니다."
                }
            ],
            steps: [
                "메뉴 또는 하단 탭에서 '보관함 (수집 영상 보관함)'을 선택합니다.",
                "상단 필터나 검색창으로 S/A등급 고바이럴 영상을 선별합니다.",
                "카드 클릭 후 모달에서 [🔗 유튜브 원본]을 확인하거나 [폴더 열기]로 파일 경로를 확인합니다.",
                "[⚡ AI 제작 가능] 영상을 기반으로 AI 원클릭 쇼츠 제작 또는 CapCut 프로젝트로 전송합니다."
            ]
        },

        // --- 4. 수집 대본 분석실 ---
        script_lab: {
            category: "대본 분석 & 추출",
            badge: "NEW",
            icon: FileText,
            iconBg: "from-rose-600 to-red-600",
            titleOverride: "수집 대본 분석실 (Script Lab)",
            overview: "수집된 영상의 음성을 Whisper AI로 정밀 추출하고, 3초 후킹 구간/본문/CTA를 구조화 분석하여 AI 리라이팅 및 각색의 기초 데이터를 제공합니다.",
            features: [
                {
                    icon: ExternalLink,
                    title: "🔗 유튜브 원본 영상 대조 링크",
                    desc: "분석 중 원본 영상 링크로 바로 이동하여 실제 영상의 자막 싱크와 연출 톤을 대조 분석할 수 있습니다."
                },
                {
                    icon: Sparkles,
                    title: "🎯 3초 후킹 & CTA 구간 자동 분할",
                    desc: "시청 지속 시간을 좌우하는 도입부 3초 후킹 멘트와 핵심 키워드를 AI가 자동으로 태깅합니다."
                },
                {
                    icon: Wand2,
                    title: "AI 대본 각색실 원클릭 연동",
                    desc: "추출된 원본 대본을 다중 LLM(Claude, Gemini 등) 각색실로 전달하여 바이럴 쇼츠 대본으로 즉시 재생성합니다."
                }
            ],
            steps: [
                "메뉴에서 '수집 대본 분석실'을 선택합니다.",
                "분석할 영상을 선택하고 [대본 추출 시작]을 누릅니다.",
                "추출된 3초 후킹 구간과 본문 텍스트를 검토하고 필요 시 [AI 대본 각색실로 전송]을 누릅니다."
            ]
        },

        // --- 5. Flow AI 비디오 렌더러 ---
        flow2capcut: {
            category: "AI 비디오 & CapCut",
            badge: "AI",
            icon: Clapperboard,
            iconBg: "from-violet-600 to-purple-600",
            titleOverride: "Flow AI 비디오 렌더러 (Flow2CapCut)",
            overview: "Google Flow AI(Veo 3.1) 모델 기반 이미지/비디오 100장 배치 대량 생성 및 ZIP 다운로드 없는 로컬 CapCut 다이렉트 프로젝트 파일 조립(No-ZIP)을 지원합니다. 스마트폰 원격 내보내기를 완벽 지원합니다.",
            features: [
                {
                    icon: Clapperboard,
                    title: "🎬 CapCut No-ZIP 다이렉트 파일시스템 조립",
                    desc: "ZIP 다운로드 및 압축 해제 없이 로컬 CapCut 프로젝트 폴더에 비디오, 멀티트랙 오디오, 자막(SRT), 줌 효과를 직접 조립하여 1초 만에 실행합니다."
                },
                {
                    icon: UploadCloud,
                    title: "📱 스마트폰/원격 웹 브라우저 원터치 내보내기",
                    desc: "외부 브라우저나 스마트폰에서 터치 한 번으로 메인 서버 PC의 CapCut 폴더로 프로젝트를 원격 전송 및 자동 생성합니다."
                },
                {
                    icon: Sparkles,
                    title: "87개 캐릭터 & 스타일 일관성 프리셋",
                    desc: "씬 간 캐릭터와 화풍이 흔들리지 않도록 일관성 프롬프트를 자동으로 주입하여 고품질 숏폼 비디오를 완성합니다."
                }
            ],
            steps: [
                "메뉴에서 'Flow AI 비디오 렌더러'로 이동합니다.",
                "스토리보드에 프롬프트를 입력하고 캐릭터/스타일 프리셋을 선택합니다.",
                "[일괄 생성 시작]으로 Flow AI 이미지/비디오를 렌더링합니다.",
                "[CapCut으로 내보내기] 버튼을 누르면 로컬 CapCut 프로젝트가 즉시 완성되어 열립니다."
            ]
        },

        // --- 6. 통합 대시보드 & 관제 ---
        dashboard: {
            category: "분석 & 관제",
            badge: "LIVE",
            icon: Activity,
            iconBg: "from-indigo-600 to-purple-600",
            titleOverride: "통합 관제 대시보드 (Global Dashboard)",
            overview: "ViraLoop Studio의 총괄 관제 센터입니다. 24시간 실시간 감시 중인 채널, 다운로드 수집 현황, 백그라운드 워크플로우 진행 상태 및 최신 활동 타임라인을 한눈에 조망합니다.",
            features: [
                {
                    icon: Activity,
                    title: "실시간 시스템 지표 & 하드웨어 모니터링",
                    desc: "전체 관리 채널 수, 실시간 추적 중인 레퍼런스 채널, 다운로드 성공률 및 백그라운드 큐 상태를 실시간 카드 지표로 표시합니다."
                },
                {
                    icon: TrendingUp,
                    title: "통합 활동 타임라인 & 실시간 피드",
                    desc: "영상 수집, 자막 추출, 자동 렌더링, 배포 예약 등 시스템의 모든 이벤트가 실시간 스트림으로 기록됩니다."
                }
            ],
            steps: [
                "하단 네비게이션 바에서 '홈' 탭을 선택합니다.",
                "상단 핵심 지표 카드로 오늘의 수집/배포 상태와 시스템 헬스를 점검합니다.",
                "타임라인에서 최근 완료된 작업이나 알림을 탭하여 세부 내역으로 즉시 이동합니다."
            ]
        },

        // --- 7. 타겟 채널 자동 수집 ---
        channels: {
            category: "수집 & 벤치마킹",
            badge: "AUTO",
            icon: ListVideo,
            iconBg: "from-sky-600 to-blue-600",
            titleOverride: "타겟 채널 자동 수집 (Target Channels)",
            overview: "벤치마킹할 글로벌 유튜브/쇼츠 채널을 등록하고 24시간 자동 감시하여 신규 인기 영상을 놓치지 않고 수집합니다. 모바일 최적화 카드 뷰를 완벽 지원합니다.",
            features: [
                {
                    icon: ListVideo,
                    title: "카테고리별 채널 그룹화 & 스케줄 자동 수집",
                    desc: "채널 URL만 입력하면 프로필을 자동 인식하며, 지정된 스캔 주기마다 신규 영상을 자동 다운로드합니다."
                },
                {
                    icon: Scissors,
                    title: "스크립트 전용 모드 지원",
                    desc: "용량 절약을 위해 영상 파일 대신 자막/대본 텍스트만 고속으로 수집하는 모드를 지원합니다."
                }
            ],
            steps: [
                "메뉴에서 '타겟 채널 자동 수집'으로 이동합니다.",
                "카테고리를 선택하고 새 채널 URL을 입력한 뒤 [채널 추가]를 누릅니다.",
                "[즉시 스캔]을 누르거나 자동 다운로드 스위치를 켜두면 신규 영상이 자동 수집됩니다."
            ]
        },

        // --- 8. URL 영상 직접 수집 ---
        direct_download: {
            category: "고속 직접 수집",
            badge: "FAST",
            icon: Download,
            iconBg: "from-blue-600 to-cyan-600",
            titleOverride: "URL 영상 직접 수집 (Direct Download)",
            overview: "유튜브, 틱톡, 인스타그램, 더우인, 콰이쇼우 등 전 세계 15개 이상의 동영상 플랫폼 링크를 붙여넣어 원본 화질로 즉시 일괄 다운로드합니다.",
            features: [
                {
                    icon: Download,
                    title: "다중 URL 일괄 큐 (Batch Queue)",
                    desc: "수십 개의 영상 링크를 줄바꿈으로 입력하여 대기열에 추가하고 순차적으로 고속 일괄 다운로드합니다."
                },
                {
                    icon: Shield,
                    title: "우회 모드 (Bypass Mode) & 브라우저 프로필 연동",
                    desc: "로그인이 필요하거나 차단된 플랫폼 영상도 전용 스텔스 브라우저 엔진으로 우회하여 완벽하게 수집합니다."
                }
            ],
            steps: [
                "메뉴에서 'URL 영상 직접 수집'을 선택합니다.",
                "저장할 카테고리를 선택하고 텍스트 영역에 영상 URL들을 붙여넣습니다.",
                "[즉시 다운로드] 또는 [다운로드 대기열 추가] 후 [일괄 다운로드 시작]을 누릅니다."
            ]
        },

        // --- 9. 더우인 쇼츠 수집 ---
        douyin_studio: {
            category: "멀티모달 팩토리",
            badge: "AI",
            icon: Scissors,
            iconBg: "from-purple-600 to-indigo-600",
            titleOverride: "더우인 쇼츠 수집 (Douyin Search)",
            overview: "수백 개의 중국 숏폼 영상을 동시 다발적으로 분석/편집하는 멀티모달 AI 팩토리입니다. 키워드 확장 수집, AI 매핑, 씬 분할 컷편집을 지원합니다.",
            features: [
                {
                    icon: Sparkles,
                    title: "✨ AI 자동 키워드 확장 & 네트워크 스크래핑",
                    desc: "카테고리와 시드 키워드를 기반으로 AI가 연관 키워드를 자동 확장하여 대량의 인기 쇼츠를 일괄 수집합니다."
                },
                {
                    icon: UploadCloud,
                    title: "모바일 원터치 다중 영상 업로드",
                    desc: "PC 파일 드래그 앤 드롭뿐만 아니라 모바일 터치 한 번으로 스마트폰에 저장된 영상을 대량 업로드할 수 있습니다."
                }
            ],
            steps: [
                "메뉴에서 '더우인 쇼츠 수집'을 선택합니다.",
                "1단계에서 카테고리와 키워드를 선택하고 [대기열로 수집 시작]을 누릅니다.",
                "2단계 AI 매핑에서 대본 번역과 목소리(TTS)를 매핑하고 3단계에서 최종 검수합니다."
            ]
        },

        // --- 10. AI 다국어 목소리 합성 ---
        multi_tts: {
            category: "AI 음성 & 자막",
            badge: "VOICE",
            icon: Mic,
            iconBg: "from-violet-600 to-pink-600",
            titleOverride: "AI 다국어 목소리 합성 (Multi TTS)",
            overview: "Supertonic Local, Qwen3, ElevenLabs, Edge TTS 등 최첨단 다국어 음성 합성 엔진으로 자연스러운 나레이션을 생성하고, 무음 제거 및 자막(SRT) 추출을 원스톱으로 처리합니다.",
            features: [
                {
                    icon: Mic,
                    title: "초고음질 로컬/클라우드 음성 엔진 탑재",
                    desc: "다양한 보이스 프리셋과 속도, 톤, 감정(기쁨/슬픔/분노) 조절을 통해 쇼츠에 최적화된 오디오를 생성합니다."
                },
                {
                    icon: FileText,
                    title: "무음 구간 자동 컷팅 & 초정밀 자막(SRT) 추출",
                    desc: "호흡과 무음 구간을 50ms 단위로 자동 컷팅하여 오디오 밀도를 극대화하고 즉시 자막 파일로 변환합니다."
                }
            ],
            steps: [
                "메뉴에서 'AI 다국어 목소리 합성'으로 이동합니다.",
                "텍스트를 입력하고 원하는 음성 엔진과 목소리, 속도, 감정을 선택한 뒤 [음성 생성 시작]을 누릅니다.",
                "필요 시 2단계에서 [무음 제거 실행]을 거친 뒤, 3단계에서 [자막 추출 및 편집]으로 이동합니다."
            ]
        },

        // --- 11. 작업 환경 설정 ---
        settings: {
            category: "시스템 & 설정",
            badge: "CONFIG",
            icon: SettingsIcon,
            iconBg: "from-slate-700 to-zinc-800",
            titleOverride: "작업 환경 설정 (System Settings)",
            overview: "AI API 키(Gemini, Groq, Claude, OpenAI), 저장소 다운로드 경로, 자동 다운로드 주기, 브라우저 엔진 패치 및 설정 백업/복원을 총괄 관리합니다.",
            features: [
                {
                    icon: SettingsIcon,
                    title: "AI 모델 & 검색 API 다중 키 관리",
                    desc: "LLM 키를 여러 개 등록하면 자동 순환(Round-Robin)하여 레이트 리밋을 방지합니다."
                },
                {
                    icon: FolderOpen,
                    title: "원클릭 설정 백업 & 복원",
                    desc: "현재 모든 설정과 연결 정보를 JSON 파일로 안전하게 내보내고 다른 PC에서 원클릭으로 복원합니다."
                }
            ],
            steps: [
                "메뉴에서 '작업 환경 설정'을 선택합니다.",
                "기본 다운로드 경로와 필요한 API 키들을 입력합니다.",
                "하단의 [설정 저장] 버튼을 눌러 변경사항을 즉시 적용합니다."
            ]
        }
    };

    const guideCategories = [
        {
            id: 'core_ops',
            title: '핵심 자동화 & 대기열',
            icon: Layers,
            guides: [
                { id: 'work_queue', title: '쇼츠 자동 배포 관리 (Work Queue)', time: '3분', key: 'work_queue' },
                { id: 'incubator', title: '채널 계정 & 웜업 육성', time: '5분', key: 'incubator' },
                { id: 'dashboard', title: '통합 관제 대시보드', time: '3분', key: 'dashboard' }
            ]
        },
        {
            id: 'creation',
            title: 'AI 창작 & 비디오 조립',
            icon: Clapperboard,
            guides: [
                { id: 'flow2capcut', title: 'Flow AI 비디오 렌더러 (Flow2CapCut)', time: '5분', key: 'flow2capcut' },
                { id: 'script_lab', title: '수집 대본 분석실 (Script Lab)', time: '3분', key: 'script_lab' }
            ]
        },
        {
            id: 'sourcing',
            title: '콘텐츠 수집 & 보관',
            icon: Download,
            guides: [
                { id: 'gallery', title: '수집 영상 보관함 (Viral Gallery)', time: '3분', key: 'gallery' },
                { id: 'channels', title: '타겟 채널 자동 수집 (Target Channels)', time: '3분', key: 'channels' },
                { id: 'direct_download', title: 'URL 영상 직접 수집 (Direct Download)', time: '2분', key: 'direct_download' },
                { id: 'douyin_studio', title: '더우인 쇼츠 수집 (Douyin Search)', time: '5분', key: 'douyin_studio' }
            ]
        },
        {
            id: 'ai_studio',
            title: 'AI 음성 & 시스템 설정',
            icon: Sparkles,
            guides: [
                { id: 'multi_tts', title: 'AI 다국어 목소리 합성 (Multi TTS)', time: '5분', key: 'multi_tts' },
                { id: 'settings', title: '작업 환경 설정 (Settings)', time: '3분', key: 'settings' }
            ]
        }
    ];


    const handleSelectGuide = (key: string) => {
        setSelectedGuideKey(key);
        const element = document.getElementById(key);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const [showScrollTop, setShowScrollTop] = useState(false);
    const topRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = (e?: any) => {
            const winScroll = window.scrollY || document.documentElement.scrollTop || 0;
            const targetScroll = e?.target?.scrollTop || 0;
            const scrollContainers = document.querySelectorAll('.overflow-y-auto, main');
            let maxInternalScroll = 0;
            scrollContainers.forEach(el => {
                if (el.scrollTop > maxInternalScroll) maxInternalScroll = el.scrollTop;
            });

            const currentScroll = Math.max(winScroll, targetScroll, maxInternalScroll);
            setShowScrollTop(currentScroll > 150);
        };

        // Capture phase to catch scroll from any inner div
        window.addEventListener('scroll', handleScroll, true);
        document.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    const scrollToTop = () => {
        if (topRef.current) {
            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.querySelectorAll('.overflow-y-auto, main').forEach(el => {
            el.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };

    const filteredGuides = Object.entries(detailedGuides).filter(([key, content]) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (content.titleOverride || '').toLowerCase().includes(q) ||
            content.overview.toLowerCase().includes(q) ||
            content.category.toLowerCase().includes(q)
        );
    });

    return (
        <div className="container mx-auto p-3 sm:p-6 md:p-8 pb-44 md:pb-16 max-w-6xl animate-in fade-in duration-300 min-h-screen bg-background text-foreground space-y-4 sm:space-y-6 relative">
            {/* Top Anchor */}
            <div ref={topRef} className="h-0 w-0 pointer-events-none" aria-hidden="true" />
            
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full pb-3 border-b border-border">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
                        <span>사용자 공식 안내서</span>
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        ViraLoop Studio의 모든 최신 기능과 작업 흐름을 한눈에 배우고 활용하세요.
                    </p>
                </div>
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">

                {/* Left: Navigation Menu */}
                <div className="lg:col-span-1">
                    <div className="static lg:sticky top-6 space-y-3 sm:space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="기능 또는 키워드 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 text-xs sm:text-sm shadow-2xs bg-card border-border rounded-xl"
                            />
                        </div>

                        {/* Category Navigation */}
                        <div className="space-y-2">
                            {guideCategories.map((cat) => (
                                <div key={cat.id} className="border border-border rounded-xl p-2 bg-card shadow-2xs">
                                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        <cat.icon className="w-3.5 h-3.5 text-primary" />
                                        <span>{cat.title}</span>
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        {cat.guides.map((guide) => (
                                            <button
                                                key={guide.id}
                                                onClick={() => handleSelectGuide(guide.key)}
                                                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                                                    selectedGuideKey === guide.key 
                                                        ? 'bg-primary text-primary-foreground font-bold shadow-xs' 
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                }`}
                                            >
                                                <span className="truncate">{guide.title}</span>
                                                <span className="text-[10px] opacity-75 shrink-0 ml-1">⏱ {guide.time}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Detailed Content Area */}
                <div className="lg:col-span-3 space-y-6 sm:space-y-10">
                    {filteredGuides.map(([key, content]) => (
                        <div key={key} id={key} className="scroll-mt-20">
                            <Card className="overflow-hidden border border-border bg-card shadow-2xs rounded-2xl ring-1 ring-border/50">
                                
                                {/* Compact Modern Dark Banner Header */}
                                <div className="p-4 sm:p-6 bg-gradient-to-r from-card via-muted/40 to-card border-b border-border/80 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${content.iconBg} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                                            <content.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                                                    {content.category}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-muted-foreground">{content.badge}</span>
                                            </div>
                                            <h2 className="text-base sm:text-xl font-bold text-foreground truncate">
                                                {content.titleOverride || key}
                                            </h2>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 bg-card">
                                    {/* 1. Overview */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                                            <Info className="w-4 h-4 text-blue-500" />
                                            개요 (Overview)
                                        </h3>
                                        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground bg-muted/30 p-3.5 sm:p-4 rounded-xl border border-border/60">
                                            {content.overview}
                                        </p>
                                    </div>

                                    {/* 2. Key Features */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                                            <Sparkles className="w-4 h-4 text-purple-500" />
                                            주요 기능 (Key Features)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                            {content.features.map((feat, idx) => (
                                                <div key={idx} className="p-3.5 sm:p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors space-y-1.5 shadow-2xs">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary shrink-0">
                                                            <feat.icon className="w-4 h-4" />
                                                        </div>
                                                        <h4 className="font-bold text-xs sm:text-sm text-foreground">{feat.title}</h4>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                                                        {feat.desc}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Step-by-Step Guide */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                                            <MousePointerClick className="w-4 h-4 text-emerald-500" />
                                            따라하기 (Step-by-Step)
                                        </h3>
                                        <div className="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-primary/20 ml-2">
                                            {content.steps.map((step, idx) => (
                                                <div key={idx} className="flex items-start gap-3 pl-3">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5 shadow-2xs">
                                                        {idx + 1}
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed pt-0.5">
                                                        {step}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Card Footer Top Button */}
                                        <div className="pt-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={scrollToTop}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1 px-2 rounded-lg hover:bg-muted"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                                <span>맨 위로 이동</span>
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}

                    {filteredGuides.length === 0 && (
                        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border space-y-2">
                            <Search className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                            <h3 className="text-sm font-bold text-foreground">검색 결과가 없습니다</h3>
                            <p className="text-xs text-muted-foreground">다른 키워드로 검색해보세요.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Explicit Mobile Bottom Navigation Clearance Spacer */}
            <div className="h-32 md:hidden shrink-0 pointer-events-none" aria-hidden="true" />

            {/* Floating Back to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-24 sm:bottom-8 right-5 sm:right-8 z-[99999] p-3.5 sm:px-4 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full sm:rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center gap-1.5 border-2 border-white/20 ring-4 ring-indigo-500/30 cursor-pointer animate-in fade-in zoom-in"
                    title="맨 위로 이동"
                    aria-label="맨 위로 이동"
                >
                    <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                    <span className="hidden sm:inline">맨 위로</span>
                </button>
            )}
        </div>
    );
}
