import React from 'react';
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
    Settings,
    TrendingUp,
    Globe,
    CheckCircle2,
    MousePointerClick,
    Info,
    Eraser,
    Radio,
    Moon,
    Sun
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
    // [UPDATED] Full Synchronization with VLStudio Latest Architecture + Detailed Comprehensive Content
    const detailedGuides: Record<string, { image?: string; titleOverride?: string; overview: string; features: { icon: any; title: string; desc: string; }[]; steps: string[]; }> = {
        // --- 1. Analytics & Insights (분석 & 관제) ---
        dashboard: {
            image: "guide/dashboard.png",
            overview: "ViraLoop Studio의 총괄 관제 센터입니다. 24시간 실시간 감시 중인 채널, 다운로드 수집 현황, 백그라운드 워크플로우 진행 상태 및 최신 활동 타임라인을 한눈에 조망합니다.",
            features: [
                {
                    icon: Activity,
                    title: "실시간 시스템 모니터링",
                    desc: "전체 관리 채널 수, 실시간 추적 중인 레퍼런스 채널, 다운로드 성공률 및 백그라운드 큐 상태를 실시간 카드 지표로 표시합니다."
                },
                {
                    icon: TrendingUp,
                    title: "통합 활동 타임라인",
                    desc: "영상 수집, 자막 추출, 자동 렌더링, 배포 예약 등 시스템의 모든 이벤트가 실시간 스트림으로 기록되며 즉시 해당 작업으로 이동할 수 있습니다."
                }
            ],
            steps: [
                "좌측 사이드바 또는 모바일 하단 메뉴에서 '통합 대시보드'를 선택합니다.",
                "상단 핵심 지표 카드로 오늘의 수집/배포 상태를 점검합니다.",
                "실시간 타임라인에서 최근 완료된 작업이나 경고 알림을 클릭하여 세부 내역을 확인합니다."
            ]
        },
        captain: {
            image: "guide/dashboard.png",
            overview: "내 브랜드 유튜브 채널(Captain)의 세부 성과와 조회수 폭발 지점을 심층 분석하는 전용 대시보드입니다. 구독자 성장 추이와 영상별 성과를 객관적으로 진단합니다.",
            features: [
                {
                    icon: BarChart3,
                    title: "채널 성장 모멘텀 분석",
                    desc: "30일간의 일별 조회수, 구독자 증감, 시청 지속률을 시각화하여 최적의 업로드 주기와 주제를 제시합니다."
                },
                {
                    icon: Globe,
                    title: "경쟁 및 레퍼런스 비교",
                    desc: "동일 분야의 인기 레퍼런스 채널들과의 성장 곡선을 비교하여 내 채널의 경쟁력을 측정합니다."
                }
            ],
            steps: [
                "메뉴에서 '캡틴 대시보드'로 이동합니다.",
                "분석하려는 브랜드 채널 프로필을 상단에서 선택합니다.",
                "조회수 급상승 영상과 이탈 지점을 확인하고 차기 콘텐츠 기획에 반영합니다."
            ]
        },
        keyword: {
            image: "guide/script_lab.png",
            overview: "유튜브와 웹 전반에서 실시간 급상승 중인 트렌드 키워드를 발굴하고, 검색 볼륨과 경쟁 강도를 분석하여 조회수가 보장되는 블루오션 주제를 추천합니다.",
            features: [
                {
                    icon: Search,
                    title: "급상승 키워드 발굴",
                    desc: "핵심 키워드를 입력하면 연관 검색어, Explosive(폭발적 상승) 태그 및 예상 조회수 잠재력을 계산합니다."
                },
                {
                    icon: TrendingUp,
                    title: "경쟁 강도 및 상위 노출 확률",
                    desc: "해당 키워드로 쇼츠나 롱폼 제작 시 상위 노출 및 알고리즘 추천 가능성을 AI가 수치화하여 제공합니다."
                }
            ],
            steps: [
                "메뉴에서 '키워드 탐색기'를 클릭합니다.",
                "관심 분야(예: 'AI 자동화', '재테크', '꿀팁')를 입력하고 검색합니다.",
                "경쟁도가 낮고 성장 잠재력이 높은 키워드를 선택하여 즉시 '대본 번역/작성'으로 보냅니다."
            ]
        },
        reports: {
            image: "guide/dashboard.png",
            overview: "일일 수집 통계, 브랜드 채널 성장 지표, 시스템 리소스 현황 및 글로벌 트렌드 기반 숏폼 훅을 종합 분석하여 제공하는 AI 일일 리포트 센터입니다.",
            features: [
                {
                    icon: FileText,
                    title: "AI 종합 진단 & 숏폼 훅 추천",
                    desc: "매일 수집/제작/배포된 데이터를 분석하여 성과 브리핑과 즉시 활용 가능한 숏폼 타겟 훅(Hook)을 제안합니다."
                },
                {
                    icon: Activity,
                    title: "실시간 하드웨어 헬스 & 자동 조치 (Auto-Fix)",
                    desc: "CPU/메모리/저장소 상태와 좀비 태스크를 모니터링하며, 무응답 태스크나 썸네일 누락 건을 원클릭으로 자동 복구합니다."
                }
            ],
            steps: [
                "메뉴에서 '일일 리포트'로 이동합니다.",
                "상단 '지금 수동 생성'을 눌러 최신 시스템/채널 분석 보고서를 즉시 발행합니다.",
                "리포트 카드를 탭하여 상세 마크다운 보고서와 AI 훅 기획안을 열람합니다."
            ]
        },

        // --- 2. Content Sourcing (콘텐츠 수집 & 보관) ---
        channels_ref: {
            image: "guide/channels.png",
            titleOverride: "레퍼런스 채널 관리",
            overview: "벤치마킹할 글로벌 유튜브/쇼츠 채널을 등록하고 24시간 자동 감시하여 신규 인기 영상을 놓치지 않고 수집합니다.",
            features: [
                {
                    icon: ListVideo,
                    title: "원클릭 채널 등록 & 카테고리화",
                    desc: "채널 URL만 입력하면 프로필과 메타데이터를 자동 인식하며, 분야별 태그로 분류 관리합니다."
                },
                {
                    icon: Activity,
                    title: "자동 수집 파이프라인",
                    desc: "백그라운드 스케줄러가 주기적으로 채널의 신규 업로드를 감지하여 고화질 영상과 자막을 자동 다운로드합니다."
                }
            ],
            steps: [
                "메뉴에서 '레퍼런스 채널'로 이동합니다.",
                "우측 상단 '채널 추가' 버튼을 눌러 모니터링할 채널 URL을 등록합니다.",
                "수집 주기와 필터를 설정하면 갤러리와 스크립트 랩에 자동으로 데이터가 쌓입니다."
            ]
        },
        download: {
            image: "guide/gallery.png",
            overview: "특정 유튜브 영상의 URL을 입력하여 4K 고화질 비디오, 음원, 썸네일, SRT 다국어 자막을 즉시 추출하고 분석 대기열에 추가합니다.",
            features: [
                {
                    icon: Download,
                    title: "무손실 고화질 다운로드",
                    desc: "최대 4K 화질의 MP4 영상과 고음질 오디오, 챕터 정보 및 자막 트랙을 동시에 추출합니다."
                }
            ],
            steps: [
                "메뉴에서 '영상 다운로드'를 선택합니다.",
                "다운로드할 유튜브 영상 URL을 붙여넣고 '다운로드 시작'을 클릭합니다.",
                "추출이 완료되면 '보관함(갤러리)'과 '스크립트 랩'에서 즉시 사용할 수 있습니다."
            ]
        },
        gallery: {
            image: "guide/gallery.png",
            overview: "수집된 모든 영상 자산이 모이는 디지털 라이브러리입니다. 채널 평균 대비 조회수가 폭발한 바이럴 영상을 Viral Score로 즉시 선별합니다.",
            features: [
                {
                    icon: Zap,
                    title: "Viral Score 기반 대박 영상 선별",
                    desc: "채널 평균 대비 조회수 상승률이 높은 아웃라이어 영상을 빨간색 Viral 뱃지로 강조 표시합니다."
                },
                {
                    icon: Play,
                    title: "상세 메타데이터 & 인스턴트 플레이어",
                    desc: "카드를 클릭하면 다이얼로그에서 영상 시청, 태그 분석, 자막 확인 및 컷 편집기로 바로 전달할 수 있습니다."
                }
            ],
            steps: [
                "하단 네비게이션 또는 메뉴에서 '보관함(갤러리)'을 선택합니다.",
                "Viral 필터를 활성화하여 성과가 검증된 소재를 빠르게 필터링합니다.",
                "원하는 영상 카드를 클릭하여 컷 편집기나 스튜디오로 바로 불러옵니다."
            ]
        },
        script_lab: {
            image: "guide/script_lab.png",
            overview: "수천 개의 영상에서 추출된 자막 데이터를 텍스트 검색 엔진으로 구축하여, 원하는 주제의 핵심 대본과 문맥을 초고속으로 탐색하고 복사합니다.",
            features: [
                {
                    icon: FileText,
                    title: "대용량 자막 전문 검색",
                    desc: "데이터베이스 내 모든 자막에서 특정 키워드가 포함된 문장과 전후 맥락을 0.1초 만에 찾아냅니다."
                },
                {
                    icon: Edit,
                    title: "원클릭 대본 각색 연동",
                    desc: "검색된 자막 구간을 클릭하여 '대본 번역/작성' 도구로 바로 보내어 새로운 숏폼 대본으로 재창작합니다."
                }
            ],
            steps: [
                "메뉴에서 '자막 수집 (Script Lab)'을 클릭합니다.",
                "상단 검색창에 찾고자 하는 주제나 문장을 입력합니다.",
                "검색 결과에서 필요한 텍스트를 선택하여 클립보드에 복사하거나 각색 에이전트로 전송합니다."
            ]
        },

        // --- 3. Content Creation & Studio (콘텐츠 제작 & 스튜디오) ---
        studio: {
            image: "guide/dashboard.png",
            titleOverride: "크리에이티브 스튜디오 (Creative Studio)",
            overview: "웹 브라우저에서 바로 동작하는 고성능 멀티트랙 영상 편집기입니다. 타임라인 컷 편집, 자막 스타일링, 배경음악 믹싱 및 일괄 렌더링을 지원합니다.",
            features: [
                {
                    icon: Clapperboard,
                    title: "멀티트랙 타임라인",
                    desc: "비디오, 오디오, 텍스트, 오버레이 트랙을 자유롭게 조합하여 정밀한 타이밍으로 편집합니다."
                },
                {
                    icon: Zap,
                    title: "CapCut 프로젝트 및 MP4 렌더링",
                    desc: "완성된 타임라인을 고화질 MP4로 바로 렌더링하거나, CapCut 데스크톱 프로젝트로 내보내어 2차 가공할 수 있습니다."
                }
            ],
            steps: [
                "메뉴에서 '크리에이티브 스튜디오'를 선택합니다.",
                "보관함에서 영상을 불러와 타임라인에 배치하고 컷 편집을 진행합니다.",
                "'내보내기'를 눌러 렌더링하거나 작업 대기열에 등록합니다."
            ]
        },
        live_studio: {
            image: "guide/dashboard.png",
            titleOverride: "가상 라이브 스튜디오 (Live Studio)",
            overview: "별도의 OBS 설치 없이도 브라우저에서 24시간 씬/레이어/재생목록/위젯을 구성하여 유튜브 및 소셜 플랫폼에 라이브 스트리밍을 송출하는 클라우드 방송국입니다.",
            features: [
                {
                    icon: Radio,
                    title: "24/7 무중단 로파이 & 라이브 스트리밍",
                    desc: "동영상 배경, 텍스트, 로고, 시계 위젯, 음원 플레이리스트를 결합하여 무중단 라이브 방송을 송출합니다."
                },
                {
                    icon: Sparkles,
                    title: "AI Director 모드 & 스마트 장면 전환",
                    desc: "AI가 음원 템포와 시간에 맞춰 자동으로 배경 씬을 크로스페이드 전환하고 새로운 비주얼을 생성합니다."
                }
            ],
            steps: [
                "메뉴에서 '가상 라이브 스튜디오'를 선택합니다.",
                "하단 탭에서 '씬', '레이어', '재생목록', '위젯'을 추가하여 방송 화면을 디자인합니다.",
                "'방송 등록' 버튼을 눌러 스트림 키를 연결하고 실시간 송출을 시작합니다."
            ]
        },
        virtual_studio: {
            image: "guide/dashboard.png",
            titleOverride: "버추얼 스튜디오 (3D Mocap)",
            overview: "웹캠만으로 얼굴 표정과 모션을 실시간 캡처하여 3D VRM 아바타를 조작하고 가상 캐릭터 방송을 제작할 수 있는 버추얼 프로덕션 도구입니다.",
            features: [
                {
                    icon: Wand2,
                    title: "AI 웹캠 모션 캡처 (Neural Mocap)",
                    desc: "별도의 센서 없이 웹캠 영상에서 눈 깜빡임, 입 모양, 고개 각도를 실시간 추적하여 아바타에 매핑합니다."
                }
            ],
            steps: [
                "메뉴에서 '버추얼 스튜디오'로 이동합니다.",
                "보유한 `.vrm` 3D 아바타 파일을 업로드합니다.",
                "모션 캡처 스위치를 켜고 웹캠을 통해 실시간 아바타 모션을 확인합니다."
            ]
        },
        remover: {
            image: "guide/dashboard.png",
            titleOverride: "리무버 편집기 (Object & Watermark Remover)",
            overview: "영상 내의 불필요한 기존 자막, 로고, 워터마크, 특정 인물을 AI 인페인팅 기술로 감쪽같이 제거하고 주변 배경으로 채워 넣습니다.",
            features: [
                {
                    icon: Eraser,
                    title: "AI 스마트 인페인팅",
                    desc: "제거할 영역을 브러시로 칠하면 프레임 간 연속성을 분석하여 흔적 없이 지워줍니다."
                }
            ],
            steps: [
                "메뉴에서 '리무버 편집'을 선택합니다.",
                "영상을 업로드하고 지우고자 하는 워터마크나 자막 위치를 브러시로 마스킹합니다.",
                "'제거 시작'을 누르면 깨끗해진 영상이 갤러리에 저장됩니다."
            ]
        },

        // --- 4. AI Enhancement Tools (AI 오디오 & 자막 도구) ---
        multi_tts: {
            image: "guide/dashboard.png",
            titleOverride: "다국어 목소리 합성 (Multi TTS)",
            overview: "Edge TTS, OpenAI, Google 등 다양한 AI 음성 합성 엔진을 지원하며, 문장별 화자 지정, 감정 스타일, 말하기 속도 조절 및 즐겨찾기 프리셋을 제공합니다.",
            features: [
                {
                    icon: Mic,
                    title: "감정 & 속도 정밀 제어 엔진",
                    desc: "차분한 톤, 뉴스 앵커, 밝고 경쾌한 톤 등 감정 스타일과 배속을 세밀하게 튜닝할 수 있습니다."
                },
                {
                    icon: Sparkles,
                    title: "원클릭 프리셋 & 다국어 지원",
                    desc: "자주 사용하는 한국어, 영어, 일본어 목소리를 즐겨찾기로 등록하여 대본에 일괄 적용합니다."
                }
            ],
            steps: [
                "메뉴에서 '다국어 목소리 합성'을 선택합니다.",
                "대본을 입력하고 문장별 성우와 감정 스타일을 설정합니다.",
                "'미리듣기'로 확인한 뒤 음원 파일로 일괄 저장하여 영상 편집에 사용합니다."
            ]
        },
        subtitle_tool: {
            image: "guide/dashboard.png",
            titleOverride: "자막 생성 및 번역 (Subtitle Converter)",
            overview: "Whisper 고정밀 STT 엔진으로 영상/음성에서 한국어 자막(SRT/VTT)을 자동 생성하고, 대조 모드 및 수동 분절 모드로 외국어 자막까지 완벽하게 번역합니다.",
            features: [
                {
                    icon: Languages,
                    title: "Whisper AI 초정밀 STT",
                    desc: "배경음악이 섞인 오디오에서도 음성만을 분리 인식하여 높은 싱크 정확도의 자막을 추출합니다."
                },
                {
                    icon: Edit,
                    title: "원문-번역 대조 에디터",
                    desc: "타임코드별 원문과 번역문을 나란히 보며 자막 길이와 줄바꿈을 손쉽게 다듬을 수 있습니다."
                }
            ],
            steps: [
                "메뉴에서 '자막 생성 및 번역'을 선택합니다.",
                "영상 또는 음원 파일을 업로드하고 '자막 추출'을 실행합니다.",
                "번역 언어를 지정한 후 결과 에디터에서 다듬어 SRT 파일로 다운로드합니다."
            ]
        },
        silence_remover: {
            image: "guide/dashboard.png",
            titleOverride: "무음 구간 일괄 제거 (Silence Remover)",
            overview: "녹음본이나 영상에서 말이 끊기는 '침묵 구간'을 데시벨 분석으로 감지하여 자동 커팅하고, 노이즈 억제(NR)와 크로스페이드로 매끄러운 숏폼 오디오를 완성합니다.",
            features: [
                {
                    icon: Scissors,
                    title: "데시벨 & 지속시간 기반 스마트 감지",
                    desc: "침묵 기준(-35dB)과 최소 무음 길이(0.3s)를 조절하여 숨소리나 말문 막힘 구간을 깔끔하게 제거합니다."
                },
                {
                    icon: Zap,
                    title: "크로스페이드 & 노이즈 억제",
                    desc: "컷 연결 부위의 틱 노이즈(Pop sound)를 방지하는 크로스페이드와 잡음 제거 필터를 동시 적용합니다."
                }
            ],
            steps: [
                "메뉴에서 '무음 구간 일괄 제거'를 선택합니다.",
                "정리할 오디오나 비디오 파일을 등록합니다.",
                "'⚡ 무음 제거 및 음질 개선 일괄 시작'을 클릭하여 완성본을 다운로드합니다."
            ]
        },
        script_writer: {
            image: "guide/dashboard.png",
            titleOverride: "대본 번역 및 각색 (Script Writer)",
            overview: "해외 우수 숏폼의 대본을 한국 정서에 맞게 자연스럽게 초월 번역하거나, 바이럴 구조(Hook-Body-CTA)를 적용하여 새로운 대본으로 재창작합니다.",
            features: [
                {
                    icon: Edit,
                    title: "바이럴 숏폼 대본 리라이팅",
                    desc: "3초 시선 집중 훅(Hook), 핵심 가치 전달, 구독 유도 CTA 구조로 기존 스크립트를 재구성합니다."
                }
            ],
            steps: [
                "메뉴에서 '대본 번역 및 작성'을 선택합니다.",
                "참고할 원본 대본이나 자막을 불러옵니다.",
                "원하는 톤(전문적, 유머러스, 긴박함)을 선택하고 AI 작성을 실행합니다."
            ]
        },

        // --- 5. Automation & Operations (자동화 & 운영 관리) ---
        work_queue: {
            image: "guide/workflows.png",
            titleOverride: "자동화 작업 대기열 (Work Queue)",
            overview: "제작 완료된 쇼츠/영상의 다채널 배포 스케줄과 백그라운드 렌더링 작업을 관리하는 중앙 대기열입니다. 일괄 승인, 즉시 등록, 상태 모니터링을 지원합니다.",
            features: [
                {
                    icon: Activity,
                    title: "모바일 반응형 대기열 관리",
                    desc: "임시보관, 승인대기, 대기열, 완료, 실패 상태별로 필터링하고 원클릭으로 승인/배포합니다."
                },
                {
                    icon: UploadCloud,
                    title: "영상 첨부 & 다채널 즉시 등록",
                    desc: "대기열 아이템에 직접 렌더링된 영상을 연결하고 원하는 플랫폼(YouTube, TikTok, Instagram)으로 즉시 송출합니다."
                }
            ],
            steps: [
                "하단 메뉴 또는 사이드바에서 '대기열'을 선택합니다.",
                "승인 대기 중인 작업 카드를 확인하고 영상 미리보기를 검토합니다.",
                "'승인' 또는 '즉시 등록'을 눌러 배포를 확정합니다."
            ]
        },
        incubator: {
            image: "guide/channels.png",
            titleOverride: "통합 계정 & 육성 관리 (Incubator & Vault)",
            overview: "구글/유튜브 계정의 안전한 운영을 위해 독립된 브라우저 프로필(iXBrowser/Cloak)과 듀얼 프록시 격리 시스템(LTE/ISP)을 제공하며, 7단계 웜업 프로세스를 자동으로 가동합니다.",
            features: [
                {
                    icon: Shield,
                    title: "스텔스 보안 접속 & 듀얼 프록시 격리",
                    desc: "유튜브 스튜디오 관리자 페이지(`studio.youtube.com`)에 계정별 독립 IP로 안전하게 접속하여 계정 정지를 원천 차단합니다."
                },
                {
                    icon: Sparkles,
                    title: "일괄 웜업 제어 (Bulk Warmup) & 오토 스케줄러",
                    desc: "신규 채널의 신뢰도를 높이기 위해 인간적인 영상 시청, 탐색, 댓글 활동을 백그라운드에서 자동 실행합니다."
                }
            ],
            steps: [
                "하단 메뉴에서 '육성관리'를 선택합니다.",
                "새 구글 계정을 가져오거나 채널 정보를 동기화합니다.",
                "'전체 시작' 또는 '스케줄러 자동 실행'을 눌러 계정 육성 및 보안 접속을 진행합니다."
            ]
        }
    };

    const guideCategories = [
        {
            id: 'analytics',
            title: '분석 & 관제',
            icon: BarChart3,
            guides: [
                { id: 'dashboard', title: '통합 대시보드', difficulty: '초급', time: '3분', key: 'dashboard' },
                { id: 'captain', title: '캡틴 대시보드', difficulty: '중급', time: '5분', key: 'captain' },
                { id: 'keyword', title: '키워드 탐색기', difficulty: '초급', time: '3분', key: 'keyword' },
                { id: 'reports', title: '일일 리포트', difficulty: '초급', time: '3분', key: 'reports' }
            ]
        },
        {
            id: 'sourcing',
            title: '콘텐츠 수집 & 보관',
            icon: Download,
            guides: [
                { id: 'channels_ref', title: '레퍼런스 채널 관리', difficulty: '초급', time: '3분', key: 'channels_ref' },
                { id: 'download', title: '영상 직접 다운로드', difficulty: '초급', time: '2분', key: 'download' },
                { id: 'gallery', title: '보관함 (갤러리)', difficulty: '초급', time: '3분', key: 'gallery' },
                { id: 'script_lab', title: '자막 수집 (Script Lab)', difficulty: '중급', time: '5분', key: 'script_lab' }
            ]
        },
        {
            id: 'creation',
            title: '콘텐츠 제작 & 스튜디오',
            icon: Video,
            guides: [
                { id: 'studio', title: '크리에이티브 스튜디오', difficulty: '중급', time: '10분', key: 'studio' },
                { id: 'live_studio', title: '가상 라이브 스튜디오', difficulty: '고급', time: '15분', key: 'live_studio' },
                { id: 'virtual_studio', title: '버추얼 스튜디오 (Mocap)', difficulty: '고급', time: '15분', key: 'virtual_studio' },
                { id: 'remover', title: '리무버 편집기', difficulty: '중급', time: '5분', key: 'remover' }
            ]
        },
        {
            id: 'ai',
            title: 'AI 오디오 & 자막 도구',
            icon: Sparkles,
            guides: [
                { id: 'multi_tts', title: '다국어 목소리 합성', difficulty: '초급', time: '5분', key: 'multi_tts' },
                { id: 'subtitle_tool', title: '자막 생성 및 번역', difficulty: '초급', time: '5분', key: 'subtitle_tool' },
                { id: 'silence_remover', title: '무음 구간 일괄 제거', difficulty: '초급', time: '3분', key: 'silence_remover' },
                { id: 'script_writer', title: '대본 번역 및 각색', difficulty: '초급', time: '5분', key: 'script_writer' }
            ]
        },
        {
            id: 'operations',
            title: '자동화 & 운영 관리',
            icon: Shield,
            guides: [
                { id: 'work_queue', title: '자동화 작업 대기열', difficulty: '중급', time: '5분', key: 'work_queue' },
                { id: 'incubator', title: '통합 계정 & 육성 관리', difficulty: '고급', time: '10분', key: 'incubator' }
            ]
        }
    ];

    return (
        <div className="container mx-auto p-3 sm:p-6 md:p-8 pb-36 md:pb-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen bg-background text-foreground">
            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">

                {/* Left: Navigation Menu (Sticky) */}
                <div className="lg:col-span-1">
                    <div className="static lg:sticky top-8 space-y-3 sm:space-y-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            <Input
                                placeholder="궁금한 기능을 검색..."
                                className="pl-9 sm:pl-10 h-9 sm:h-12 text-xs sm:text-base shadow-2xs bg-background"
                            />
                        </div>

                        <ScrollArea className="h-auto max-h-[220px] lg:max-h-none lg:h-[calc(100vh-200px)] pr-2 sm:pr-4">
                            <Accordion type="single" collapsible className="space-y-2 sm:space-y-4">
                                {guideCategories.map((cat) => (
                                    <AccordionItem key={cat.id} value={cat.id} className="border border-border rounded-xl px-3 sm:px-4 bg-card shadow-2xs">
                                        <AccordionTrigger className="hover:no-underline py-2.5 sm:py-4">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                                                    <cat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                                </div>
                                                <span className="font-bold text-xs sm:text-base text-card-foreground">{cat.title}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-1 pt-1 pb-2 sm:pb-3">
                                                {cat.guides.map((guide) => (
                                                    <a
                                                        key={guide.id}
                                                        href={`#${guide.key}`}
                                                        className="block p-2 sm:p-2.5 rounded-lg hover:bg-muted/60 border border-transparent transition-all group"
                                                    >
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <span className="font-medium text-xs sm:text-sm text-muted-foreground group-hover:text-primary transition-colors">
                                                                {guide.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2 opacity-70">
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                ⏱ {guide.time}
                                                            </span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                    </div>
                </div>

                {/* Right: Detailed Content Area */}
                <div className="lg:col-span-3 space-y-8 sm:space-y-16">
                    {/* Render each documented section */}
                    {Object.entries(detailedGuides).map(([key, content]) => (
                        <div key={key} id={key} className="scroll-mt-24 group">
                            {/* Card Container */}
                            <Card className="overflow-hidden border-border bg-card shadow-2xs ring-1 ring-border/50">
                                {/* Hero Image Section (Conditional) */}
                                {content.image && (
                                    <div className="aspect-video sm:aspect-[21/9] w-full bg-muted relative overflow-hidden border-b border-border">
                                        <img
                                            src={content.image}
                                            alt={content.titleOverride || key}
                                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                                            onError={(e) => {
                                                // Fallback if image fails
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent flex items-end p-4 sm:p-6 md:p-8">
                                            <div className="text-foreground">
                                                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                                                    <Badge className="bg-primary hover:bg-primary/90 border-0 text-primary-foreground text-[10px] sm:text-xs">가이드</Badge>
                                                    <span className="text-xs sm:text-sm font-medium text-foreground/80 drop-shadow-sm">Step-by-Step</span>
                                                </div>
                                                <h2 className="text-lg sm:text-2xl md:text-3xl font-bold drop-shadow-md">
                                                    {content.titleOverride ||
                                                        // Match title from categories if no override
                                                        guideCategories.flatMap(c => c.guides).find(g => g.key === key)?.title ||
                                                        key}
                                                </h2>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <CardContent className="p-6 md:p-8 space-y-8 bg-card">
                                    {/* Overview */}
                                    <div>
                                        <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-card-foreground">
                                            <Info className="w-5 h-5 text-blue-500" />
                                            개요 (Overview)
                                        </h3>
                                        <p className="text-base md:text-lg leading-relaxed text-muted-foreground bg-accent/30 p-4 rounded-xl border border-border/50">
                                            {content.overview}
                                        </p>
                                    </div>

                                    {/* Features Grid */}
                                    <div>
                                        <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-card-foreground">
                                            <Sparkles className="w-5 h-5 text-purple-500" />
                                            주요 기능 (Key Features)
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {content.features.map((feat, idx) => (
                                                <div key={idx} className="p-4 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors">
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                                                            <feat.icon className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-card-foreground mb-1">{feat.title}</h4>
                                                            <p className="text-sm text-muted-foreground leading-snug">{feat.desc}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Step-by-Step Guide */}
                                    <div>
                                        <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-card-foreground">
                                            <MousePointerClick className="w-5 h-5 text-green-600" />
                                            따라하기 (Step-by-Step)
                                        </h3>
                                        <div className="relative pl-4 space-y-6 border-l-2 border-border ml-2">
                                            {content.steps.map((step, idx) => (
                                                <div key={idx} className="relative pl-6">
                                                    <div className="absolute -left-[33px] top-0 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-sm font-bold text-muted-foreground shadow-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <p className="text-base text-foreground/90 font-medium pt-1">
                                                        {step}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}

                    {/* Placeholder for future sections */}
                    <div className="text-center py-12 bg-accent/30 rounded-2xl border border-dashed border-border/50">
                        <Clapperboard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-muted-foreground">더 많은 가이드가 준비 중입니다</h3>
                        <p className="text-sm text-muted-foreground/70">지속적으로 업데이트됩니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
