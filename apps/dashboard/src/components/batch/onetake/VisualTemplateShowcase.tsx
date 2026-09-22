import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Clapperboard,
  Swords,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Layers,
  Flame,
  Radio,
  ExternalLink,
  Sliders,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TargetArchetype } from '@/types/preset';

import api from '@/lib/api';

interface VisualTemplateShowcaseProps {
  selectedArchetype: TargetArchetype;
  onArchetypeChange: (archetype: TargetArchetype) => void;
  selectedTemplateId: string;
  onTemplateIdChange: (templateId: string) => void;
}

export interface ConcreteTemplate {
  id: string;
  archetype: TargetArchetype;
  name: string;
  badge: string;
  tagline: string;
  desc: string;
  topBarHeight: string;
  subtitleStyle: string;
  jabStyle: string;
  recommendedAudio: string;
  isCustom?: boolean;
}

export const CONCRETE_TEMPLATES: Record<TargetArchetype, ConcreteTemplate[]> = {
  classic: [
    {
      id: 'classic-standard',
      archetype: 'classic',
      name: '골든 스탠다드 레터박스',
      badge: '스탠다드 1위',
      tagline: '상단 18.3% 블랙 바 + 화이트/옐로우 2줄 훅 타이틀',
      desc: '가장 많은 바이럴을 기록한 정통 쇼츠 규격. 상단 블랙 바와 하단 자막·출처 바의 완벽한 샌드위치 조화.',
      topBarHeight: '18.3%',
      subtitleStyle: '화이트 볼드 (Pretendard)',
      jabStyle: '없음 / 텍스트 타이틀 집중',
      recommendedAudio: '진중한 비트 / 정보 전달 BGM'
    },
    {
      id: 'classic-vitamin-c',
      archetype: 'classic',
      name: '숏비타민c K-POP 레터박스',
      badge: '숏비타민 실측',
      tagline: '상단 블랙 바 + 8.5초 옐로우 잽 훅(22도 틸트)',
      desc: '유튜브 85만 @숏비타민c 실측 DNA. 상단 2단 훅 타이틀과 22도 기울어진 잽 스티커로 시청 지속률 극대화.',
      topBarHeight: '18.3%',
      subtitleStyle: '네온 옐로우 word_pop',
      jabStyle: '22도 기울어진 옐로우 잽',
      recommendedAudio: '경쾌한 팝 / 댄스 숏폼 BGM'
    },
    {
      id: 'classic-dark-cinema',
      archetype: 'classic',
      name: '시네마틱 35mm 다크',
      badge: '영화/서사',
      tagline: '21:9 시네마틱 와이드 바 + 세리프 골드 타이틀',
      desc: '영화 리뷰, 역사 다큐, 심층 서사에 최적화된 아날로그 필름 질감과 앤틱 자막 레이아웃.',
      topBarHeight: '16.0%',
      subtitleStyle: '앤틱 골드 & 블랙 섀도우',
      jabStyle: '없음 / 몰입감 극대화',
      recommendedAudio: '웅장한 오케스트라 / 앰비언트'
    },
    {
      id: 'classic-clean-white',
      archetype: 'classic',
      name: '클린 화이트 보도형',
      badge: '뉴스/팩트',
      tagline: '상단 화이트 바 + 네이비 볼드 타이틀 + 블루 필 자막',
      desc: '경제, 시사, 과학 팩트 전달용 고신뢰도 디자인. 깔끔한 흰색 상단 바와 블루 필 박스 자막.',
      topBarHeight: '18.0%',
      subtitleStyle: '블루 필 박스 + 화이트',
      jabStyle: '단독 속보 배지',
      recommendedAudio: '긴박한 뉴스 테마 / 테크 비트'
    }
  ],

  instagram: [
    {
      id: 'insta-minimal-clean',
      archetype: 'instagram',
      name: '미니멀 프로필 & 베댓',
      badge: 'SNS 추천 1위',
      tagline: '상단 프로필 아바타 + 하단 글래스모피즘 베스트 댓글',
      desc: '인스타그램 릴스 공인 포맷. 계정 브랜딩과 시청자 반응 댓글 카드로 소셜 바이럴 유도.',
      topBarHeight: '8.0%',
      subtitleStyle: '화이트 미니멀 자막',
      jabStyle: '상단 팔로우 버튼',
      recommendedAudio: '로파이 칠 / 감성 비트'
    },
    {
      id: 'insta-dark-gradient',
      archetype: 'instagram',
      name: '다크 퍼플 그라디언트',
      badge: '트렌드 감성',
      tagline: '퍼플-블랙 비네트 + 네온 핑크 하이라이트 인터랙션',
      desc: 'MZ세대 타겟 힙한 무드. 네온 핑크 대제목과 플로팅 하트/댓글 카운터 시각화.',
      topBarHeight: '10.0%',
      subtitleStyle: '네온 핑크 글로우',
      jabStyle: '플로팅 하트 리액션',
      recommendedAudio: '트랩 비트 / R&B 힙합'
    },
    {
      id: 'insta-poll-card',
      archetype: 'instagram',
      name: '투표 & 질문 스티커형',
      badge: '참여 유도',
      tagline: '중앙 영상 위 인터랙티브 투표 스티커 (A vs B)',
      desc: '시청자 댓글 참여를 극대화하는 투표 스티커 UI. 양자택일 딜레마 및 설문형 콘텐츠 최적화.',
      topBarHeight: '8.0%',
      subtitleStyle: '블랙 반투명 필 자막',
      jabStyle: '찬성 vs 반대 투표 카드',
      recommendedAudio: '경쾌한 어쿠스틱 / 재즈 힙합'
    },
    {
      id: 'insta-viral-meme',
      archetype: 'instagram',
      name: '바이럴 팝업 & 릴스 카드',
      badge: 'MZ 바이럴',
      tagline: '톡톡 튀는 이모지 스티커 + 라운드 플로팅 코멘트',
      desc: '인기 릴스 밈 재현. 큼직한 이모지와 둥근 카드형 자막으로 3초 만에 시선 강탈.',
      topBarHeight: '9.0%',
      subtitleStyle: '볼드 라운드 화이트 자막',
      jabStyle: '이모지 팝업 스티커',
      recommendedAudio: '트렌딩 틱톡 BGM'
    }
  ],

  gunlimbo: [
    {
      id: 'gunlimbo-hook-red',
      archetype: 'gunlimbo',
      name: '레드 0초 앰뷸런스 경고',
      badge: '0초 훅 1위',
      tagline: '24% 레드 경고 배너 + 0초 수평 순백 띠 후킹 바',
      desc: '군림보 채널의 상징적인 0초 시청 지속률 락. 강렬한 레드 상단 바와 네온 사이안 폭발 자막.',
      topBarHeight: '24.0%',
      subtitleStyle: '네온 사이안 (#00F0FF)',
      jabStyle: '0초 수평 순백 띠 훅 바',
      recommendedAudio: '사이렌 / 헤비 락 / 덥스텝'
    },
    {
      id: 'gunlimbo-electric-cyan',
      archetype: 'gunlimbo',
      name: '일렉트릭 사이안 게임 훅',
      badge: '게임/하이라이트',
      tagline: '상단 사이안 배너 + 킬스트릭 배지 + 카운트다운 룩',
      desc: 'FPS/롤/배틀로열 슈퍼플레이 전용. 일렉트릭 사이안 배너와 킬스트릭 연출.',
      topBarHeight: '22.0%',
      subtitleStyle: '옐로우 볼드 + 섀도우',
      jabStyle: '킬스트릭 배지',
      recommendedAudio: '하이퍼 게이밍 사운드트랙'
    },
    {
      id: 'gunlimbo-warning-stripe',
      archetype: 'gunlimbo',
      name: '옐로우 사선 스트라이프',
      badge: '위험/주의',
      tagline: '블랙 & 옐로우 사선 경고 스트라이프 밴드',
      desc: '긴급 경고, 충격 주의, 금기 사항 다큐멘터리에 특화된 공사 현장 테이프 스타일 훅 배너.',
      topBarHeight: '20.0%',
      subtitleStyle: '형광 라임 볼드 (#A3E635)',
      jabStyle: '사선 스트라이프 밴드',
      recommendedAudio: '긴장감 서스펜스 BGM'
    },
    {
      id: 'gunlimbo-neon-magenta',
      archetype: 'gunlimbo',
      name: '네온 마젠타 액션',
      badge: '사이버 액션',
      tagline: '사이버펑크 네온 마젠타 배너 + 스피드라인',
      desc: '화려한 액션 클립과 스피드감 연출. 마젠타 그라디언트와 진동 자막 효과.',
      topBarHeight: '22.0%',
      subtitleStyle: '마젠타 팝 글로우 (#FF2E93)',
      jabStyle: '스피드라인 훅',
      recommendedAudio: '신스웨이브 / 사이버펑크'
    }
  ],

  ssul: [
    {
      id: 'ssul-everytime-dark',
      archetype: 'ssul',
      name: '에브리타임 다크 헤더',
      badge: '에타 실측',
      tagline: '빨간 익명 아바타 + 실시간 조회수 메타 + 누적 말풍선',
      desc: '대학생 커뮤니티 썰 대표 포맷. 실제 에브리타임 다크 테마 헤더와 몰입감 높은 텍스트 롤링.',
      topBarHeight: '14.0%',
      subtitleStyle: '단계별 누적 말풍선 (#F59E0B)',
      jabStyle: '우측 페페 리액션 짤방',
      recommendedAudio: '경쾌한 썰 BGM (치킨댄스/뚱이송)'
    },
    {
      id: 'ssul-pepe-humor',
      archetype: 'ssul',
      name: '디시 & 페페 유머 썰',
      badge: '유머/커뮤니티',
      tagline: '디시 갤러리 헤더 + 우측 페페 개구리 짤 리액션',
      desc: '디시인사이드 갤러리 헤더와 리액션 페페 밈. 유머 게시글과 반전 썰 영상의 정석.',
      topBarHeight: '13.0%',
      subtitleStyle: '노란색 하이라이트 텍스트',
      jabStyle: '팝콘 먹는 페페 스티커',
      recommendedAudio: '웃긴 커뮤니티 밈 효과음 팩'
    },
    {
      id: 'ssul-blind-office',
      archetype: 'ssul',
      name: '블라인드 직장인 썰',
      badge: '직장인 공감',
      tagline: '블라인드 기업 인증 배지 + 모던 그레이 카드',
      desc: '직장인 탕비실, 이직, 연봉 썰 전용. 기업 인증 배지와 신뢰도 높은 그레이 톤 카드.',
      topBarHeight: '12.0%',
      subtitleStyle: '모던 화이트 볼드',
      jabStyle: '대기업 인증 마크',
      recommendedAudio: '차분한 카페 로파이 BGM'
    },
    {
      id: 'ssul-nate-pann',
      archetype: 'ssul',
      name: '네이트판 결시친 썰',
      badge: '여성/결시친',
      tagline: '톡톡 핑크 랭킹 1위 배지 + 호흡 긴 정통 서사',
      desc: '네이트판 톡톡 실시간 랭킹 1위 디자인. 가족, 연애, 막장 썰에 최적화된 높은 가독성.',
      topBarHeight: '14.0%',
      subtitleStyle: '나눔고딕 서사 자막',
      jabStyle: '실시간 랭킹 1위 배지',
      recommendedAudio: '드라마틱 감정 서사 BGM'
    }
  ]
};

export const ARCHETYPE_META = [
  { id: 'classic', label: '클래식', icon: Clapperboard, count: 4, badge: '스탠다드' },
  { id: 'instagram', label: '인스타', icon: Smartphone, count: 4, badge: 'SNS 소셜' },
  { id: 'gunlimbo', label: '군림보', icon: Swords, count: 4, badge: '0초 훅밴드' },
  { id: 'ssul', label: '에타·디시', icon: MessageSquare, count: 4, badge: '커뮤니티' },
] as const;

export const VisualTemplateShowcase: React.FC<VisualTemplateShowcaseProps> = ({
  selectedArchetype,
  onArchetypeChange,
  selectedTemplateId,
  onTemplateIdChange,
}) => {
  const [dbTemplates, setDbTemplates] = useState<ConcreteTemplate[]>([]);

  // 🏛️ DB(shorts_templates)와 실시간 동기화: 공방에서 새 템플릿 생성 시 자동 확장
  useEffect(() => {
    const fetchDbTemplates = async () => {
      try {
        const res = await api.get('/channel-dna/templates');
        if (res.data?.items && Array.isArray(res.data.items)) {
          const mapped: ConcreteTemplate[] = res.data.items.map((item: any) => ({
            id: item.id,
            archetype: (item.archetype as TargetArchetype) || 'classic',
            name: item.name,
            badge: item.badge || '공방 등록',
            tagline: item.description || '주권 템플릿 디자인 공방 등록 규격',
            desc: item.description || '템플릿 디자인 공방에서 생성된 영구 9:16 템플릿',
            topBarHeight: item.layout?.headerHeight ? `${item.layout.headerHeight}%` : '18.0%',
            subtitleStyle: item.layout?.subtitleStyle || '화이트 볼드 (Pretendard)',
            jabStyle: item.layout?.jabStyle || '공방 쨉쨉이 연출',
            recommendedAudio: item.layout?.recommendedAudio || '추천 BGM 자동 채택',
            isCustom: true
          }));
          setDbTemplates(mapped);
        }
      } catch (err) {
        console.warn('[VisualTemplateShowcase] Failed to load DB templates:', err);
      }
    };
    fetchDbTemplates();
  }, []);

  const staticTemplates = CONCRETE_TEMPLATES[selectedArchetype] || CONCRETE_TEMPLATES.classic;
  const currentDbTemplates = dbTemplates.filter(t => t.archetype === selectedArchetype);
  const currentTemplates = [
    ...staticTemplates,
    ...currentDbTemplates.filter(d => !staticTemplates.some(s => s.id === d.id))
  ];
  const activeTemplate = currentTemplates.find(t => t.id === selectedTemplateId) || currentTemplates[0];

  return (
    <div className="w-full h-full flex flex-col justify-between bg-card border border-border/80 rounded-2xl p-3 shadow-xs space-y-2 overflow-hidden">
      {/* 1. 상단 타이틀 & 폼팩터 탭 세그먼트 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              4대 폼팩터 & 실물 비주얼 템플릿 선택
            </h4>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 h-5 px-1.5">
            9:16 쇼츠 실물 렌더링 규격
          </Badge>
        </div>

        {/* 4대 폼팩터 세그먼트 탭 버튼 */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted/30 rounded-xl border border-border/60">
          {ARCHETYPE_META.map((meta) => {
            const Icon = meta.icon;
            const isActive = selectedArchetype === meta.id;
            const totalCount = (CONCRETE_TEMPLATES[meta.id]?.length || 0) + (dbTemplates.filter(t => t.archetype === meta.id).length || 0);

            return (
              <button
                key={meta.id}
                type="button"
                data-testid={`archetype-tab-${meta.id}`}
                onClick={() => {
                  onArchetypeChange(meta.id);
                  const firstTpl = currentTemplates.find(t => t.archetype === meta.id) || CONCRETE_TEMPLATES[meta.id]?.[0];
                  if (firstTpl) {
                    onTemplateIdChange(firstTpl.id);
                  }
                }}
                className={cn(
                  "flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{meta.label}</span>
                <span className={cn(
                  "text-[9px] px-1 py-0 rounded font-mono",
                  isActive ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {totalCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 폼팩터 내 실물 9:16 비주얼 그래픽 템플릿 갤러리 (2x2 그리드) */}
      <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto pr-0.5 custom-scrollbar min-h-0">
        {currentTemplates.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;

          return (
            <div
              key={tpl.id}
              onClick={() => onTemplateIdChange(tpl.id)}
              className={cn(
                "rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all relative group text-left",
                isSelected
                  ? "bg-primary/10 border-primary ring-2 ring-primary/60 shadow-xs"
                  : "bg-background border-border/80 hover:border-primary/40 hover:bg-muted/20"
              )}
            >
              {/* 선택 확정 뱃지 */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 z-20 bg-primary text-primary-foreground rounded-full p-0.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}

              {/* 9:16 모바일 스마트폰 세로 비율 완벽 실체화 (폭 105px x 높이 186px = 9:16 정비율) */}
              <div className="w-[105px] h-[186px] mx-auto bg-stone-950 rounded-[14px] overflow-hidden border-2 border-stone-700/80 relative flex flex-col justify-between shadow-md select-none mb-1.5 ring-1 ring-black/40 shrink-0">
                {/* ── 1. 클래식 계열 실물 프리뷰 ── */}
                {selectedArchetype === 'classic' && (
                  <>
                    {tpl.id === 'classic-standard' && (
                      <>
                        <div className="w-full bg-black py-1 px-1.5 text-center border-b border-stone-800">
                          <div className="text-[7.5px] font-black text-white leading-tight">여돌들 중 누가</div>
                          <div className="text-[8px] font-black text-yellow-300 leading-tight">진짜 대식가일까?</div>
                        </div>
                        <div className="flex-1 flex items-center justify-center relative bg-gradient-to-b from-stone-900 via-stone-850 to-stone-900">
                          <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center border border-white/20">
                            <Clapperboard className="w-3 h-3 text-stone-300" />
                          </div>
                        </div>
                        <div className="w-full bg-black py-1 px-1 text-center border-t border-stone-800">
                          <div className="text-[7.5px] font-bold text-white bg-black/80 px-1 py-0.5 rounded mx-auto inline-block border border-white/20">
                            "하루 6끼를 먹는다고요?"
                          </div>
                          <div className="text-[5.5px] text-stone-500 mt-0.5">출처: 유튜브 공식 채널</div>
                        </div>
                      </>
                    )}

                    {tpl.id === 'classic-vitamin-c' && (
                      <>
                        <div className="w-full bg-black py-1 px-1 text-center relative border-b border-stone-800">
                          <div className="text-[8px] font-black text-white">K-POP 레전드 비하인드</div>
                        </div>
                        <div className="flex-1 relative flex items-center justify-center bg-stone-900">
                          <div className="absolute top-1 right-1 bg-yellow-400 text-black text-[6px] font-black px-1 py-0.5 rounded shadow-xs rotate-6">
                            🔥 8.5초 레전드
                          </div>
                          <Clapperboard className="w-3.5 h-3.5 text-yellow-400" />
                        </div>
                        <div className="w-full bg-black py-1 px-1 text-center">
                          <span className="text-[7.5px] font-black text-yellow-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                            실제 방송에서 밝혀진 충격 진실
                          </span>
                        </div>
                      </>
                    )}

                    {tpl.id === 'classic-dark-cinema' && (
                      <>
                        <div className="w-full bg-black py-1.5 px-1 text-center">
                          <span className="text-[7px] font-serif tracking-widest text-amber-400 uppercase">
                            THE UNTOLD STORY
                          </span>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-stone-900/90 relative">
                          <div className="absolute inset-0 bg-radial from-transparent to-black/80 pointer-events-none" />
                          <span className="text-[6.5px] text-stone-400 font-serif italic">35mm Film Aspect</span>
                        </div>
                        <div className="w-full bg-black py-1 px-1 text-center">
                          <span className="text-[7px] font-serif text-stone-200">
                            그는 결국 돌아오지 않았다.
                          </span>
                        </div>
                      </>
                    )}

                    {tpl.id === 'classic-clean-white' && (
                      <>
                        <div className="w-full bg-white py-1 px-1.5 text-center border-b border-stone-200">
                          <span className="text-[8px] font-black text-slate-900">단독 속보: 실시간 팩트</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-slate-800">
                          <span className="text-[6.5px] text-white/70">NEWS FOOTAGE</span>
                        </div>
                        <div className="w-full bg-white py-1 px-1 text-center">
                          <span className="text-[7px] font-bold text-white bg-blue-700 px-1 py-0.5 rounded">
                            정부 공식 브리핑 발표
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ── 2. 인스타그램 계열 실물 프리뷰 ── */}
                {selectedArchetype === 'instagram' && (
                  <>
                    {tpl.id === 'insta-minimal-clean' && (
                      <>
                        <div className="w-full bg-stone-900/95 px-1 py-0.5 flex items-center justify-between border-b border-stone-800">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1px]">
                              <div className="w-full h-full bg-black rounded-full" />
                            </div>
                            <span className="text-[6.5px] font-bold text-white">viralloop</span>
                          </div>
                          <span className="text-[5.5px] bg-blue-500 text-white px-1 rounded-xs">팔로우</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-stone-950 relative">
                          <div className="w-full h-10 mx-1 rounded bg-stone-800/80 flex items-center justify-center border border-stone-700/50">
                            <Smartphone className="w-3 h-3 text-stone-400" />
                          </div>
                          <div className="absolute right-1 top-2 flex flex-col gap-1 items-center text-[5.5px] text-stone-300">
                            <span>❤️ 14k</span>
                            <span>💬 842</span>
                            <span>✈️</span>
                          </div>
                        </div>
                        <div className="w-full bg-stone-900/90 p-1 rounded-b border-t border-stone-800">
                          <div className="text-[6px] text-stone-300 truncate">
                            💬 <strong>best_user:</strong> 진짜 소름돋네 ㅋㅋㅋ
                          </div>
                        </div>
                      </>
                    )}

                    {tpl.id === 'insta-dark-gradient' && (
                      <div className="flex-1 flex flex-col justify-between p-1 bg-gradient-to-b from-purple-950 via-stone-950 to-pink-950">
                        <div className="flex items-center justify-between text-[6.5px] text-pink-400 font-bold">
                          <span>REELS</span>
                          <span>⚡ TRENDING</span>
                        </div>
                        <div className="text-center my-auto">
                          <div className="text-[8px] font-black text-pink-300 drop-shadow-[0_0_4px_rgba(236,72,153,0.8)]">
                            다크 퍼플 바이브
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[6px] text-pink-300 pt-1 border-t border-pink-500/30">
                          <span>❤️ 28.5k</span>
                          <span>🎵 Viral Audio</span>
                        </div>
                      </div>
                    )}

                    {tpl.id === 'insta-poll-card' && (
                      <div className="flex-1 flex flex-col justify-between p-1 bg-stone-900">
                        <div className="text-[6px] text-stone-400 text-center font-bold">인스타 투표 스티커</div>
                        <div className="bg-stone-800/90 border border-stone-700 rounded p-1 text-center space-y-1">
                          <div className="text-[6.5px] font-bold text-white">당신의 선택은?</div>
                          <div className="grid grid-cols-2 gap-0.5 text-[5.5px]">
                            <div className="bg-blue-600/80 text-white rounded p-0.5">찬성 74%</div>
                            <div className="bg-stone-700 text-stone-300 rounded p-0.5">반대 26%</div>
                          </div>
                        </div>
                        <div className="text-[6px] text-stone-400 text-center">💬 참여자 4,200명</div>
                      </div>
                    )}

                    {tpl.id === 'insta-viral-meme' && (
                      <div className="flex-1 flex flex-col justify-between p-1 bg-stone-950">
                        <div className="text-[6.5px] font-bold text-yellow-400 text-center">😱 실화냐? 😱</div>
                        <div className="text-center my-auto text-[7px] font-black text-white bg-black/70 py-1 rounded border border-white/20">
                          "이걸 진짜 본 사람이 있다고?"
                        </div>
                        <div className="bg-stone-800/80 p-0.5 rounded text-[6px] text-stone-300 text-center">
                          🔥 실시간 급상승 1위
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── 3. 군림보 계열 실물 프리뷰 ── */}
                {selectedArchetype === 'gunlimbo' && (
                  <>
                    {tpl.id === 'gunlimbo-hook-red' && (
                      <>
                        <div className="w-full bg-red-600 py-1 px-1 text-center shadow-xs">
                          <div className="text-[7.5px] font-black text-white leading-tight">절대 멈추지 마세요</div>
                          <div className="text-[6px] font-bold text-yellow-200">마지막 1초의 반전</div>
                        </div>
                        <div className="w-full bg-white text-black py-0.2 px-1 text-center text-[5.5px] font-black tracking-widest">
                          ⚠️ 시청 주의 ⚠️
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-stone-900">
                          <Swords className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                        </div>
                        <div className="w-full pb-1 text-center">
                          <span className="text-[8px] font-black text-cyan-400 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                            0초 앰뷸런스 폭발 훅
                          </span>
                        </div>
                      </>
                    )}

                    {tpl.id === 'gunlimbo-electric-cyan' && (
                      <>
                        <div className="w-full bg-cyan-500 py-1 px-1 text-center text-black font-black">
                          <div className="text-[7.5px] leading-tight">🔥 1 vs 5 클러치 상황</div>
                          <div className="text-[5.5px] text-cyan-950 font-mono">PENTAKILL READY</div>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-stone-900">
                          <span className="text-[6.5px] text-cyan-400 font-mono">COUNTDOWN 03:00</span>
                        </div>
                        <div className="w-full pb-1 text-center">
                          <span className="text-[8px] font-black text-yellow-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                            역대급 명장면 탄생
                          </span>
                        </div>
                      </>
                    )}

                    {tpl.id === 'gunlimbo-warning-stripe' && (
                      <>
                        <div className="w-full h-2 bg-amber-400 repeating-linear-gradient flex items-center justify-center">
                          <div className="w-full h-1 bg-black/20" />
                        </div>
                        <div className="w-full bg-black py-1 px-1 text-center border-b border-amber-500/60">
                          <span className="text-[7.5px] font-black text-amber-400">경고: 심약자 시청 금지</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-stone-900">
                          <span className="text-[6px] text-amber-500 font-mono">DANGER ZONE</span>
                        </div>
                        <div className="w-full pb-1 text-center">
                          <span className="text-[7.5px] font-black text-lime-400">
                            끝까지 보면 소름돋는 이유
                          </span>
                        </div>
                      </>
                    )}

                    {tpl.id === 'gunlimbo-neon-magenta' && (
                      <div className="flex-1 flex flex-col justify-between p-1 bg-stone-950 border-t-2 border-pink-500">
                        <div className="bg-gradient-to-r from-pink-600 to-purple-600 py-0.5 rounded text-center text-white text-[7px] font-black">
                          CYBER ACTION
                        </div>
                        <div className="text-center my-auto">
                          <span className="text-[8px] font-black text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.8)]">
                            네온 마젠타 액션
                          </span>
                        </div>
                        <div className="text-center pb-0.5">
                          <span className="text-[6.5px] text-cyan-300 font-bold">SPEED LINE VIBE</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── 4. 썰형 계열 실물 프리뷰 ── */}
                {selectedArchetype === 'ssul' && (
                  <>
                    {tpl.id === 'ssul-everytime-dark' && (
                      <>
                        <div className="w-full bg-stone-900 border-b border-stone-800 p-1 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-600 flex items-center justify-center text-[5.5px] text-white font-bold">
                              익
                            </div>
                            <span className="text-[6.5px] font-bold text-stone-200">익명</span>
                          </div>
                          <span className="text-[5.5px] text-stone-400">조회 1.4만</span>
                        </div>
                        <div className="p-1 text-[7px] font-bold text-white line-clamp-1">
                          후배한테 고백받았는데...
                        </div>
                        <div className="flex-1 px-1 flex flex-col justify-center gap-1">
                          <div className="bg-stone-800/90 p-1 rounded text-[6px] text-stone-300">
                            "선배 진짜 좋아해요..."
                          </div>
                          <div className="bg-amber-500/20 border border-amber-500/30 p-1 rounded text-[6px] text-amber-300 self-end">
                            "어제부터 1일인 거 맞죠?"
                          </div>
                        </div>
                        <div className="w-full text-right p-0.5">
                          <span className="text-[9px]">🐸</span>
                        </div>
                      </>
                    )}

                    {tpl.id === 'ssul-pepe-humor' && (
                      <>
                        <div className="w-full bg-blue-900/40 border-b border-blue-500/30 p-1 flex items-center justify-between">
                          <span className="text-[6.5px] font-black text-blue-400">국내야구 갤러리</span>
                          <span className="text-[5.5px] text-stone-400">[일반]</span>
                        </div>
                        <div className="flex-1 p-1 flex flex-col justify-between">
                          <div className="text-[6.5px] font-bold text-white">
                            형들 이거 내가 잘못한 거냐?
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[6px] text-yellow-300">결과: 손절당함 ㅋㅋㅋ</span>
                            <span className="text-[10px]">🍿🐸</span>
                          </div>
                        </div>
                        <div className="w-full bg-stone-900 p-0.5 text-center text-[5.5px] text-stone-400">
                          댓글 128개 · 추천 489
                        </div>
                      </>
                    )}

                    {tpl.id === 'ssul-blind-office' && (
                      <>
                        <div className="w-full bg-stone-900 border-b border-stone-800 p-1 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-[6.5px] font-black text-emerald-400">블라블라</span>
                            <span className="text-[5.5px] bg-stone-850 px-1 py-0.2 rounded text-stone-300">삼성전자</span>
                          </div>
                          <span className="text-[5.5px] text-stone-400">직장인 인증</span>
                        </div>
                        <div className="flex-1 p-1 flex flex-col justify-center">
                          <div className="bg-stone-850 p-1 rounded border border-stone-700/60 text-[6.5px] font-bold text-white">
                            오늘자 탕비실 대참사 썰 푼다...
                          </div>
                        </div>
                        <div className="w-full bg-stone-900 p-0.5 flex justify-between text-[5.5px] text-stone-400 px-1">
                          <span>👍 842</span>
                          <span>💬 163</span>
                        </div>
                      </>
                    )}

                    {tpl.id === 'ssul-nate-pann' && (
                      <>
                        <div className="w-full bg-pink-950/60 border-b border-pink-500/40 p-1 flex items-center justify-between">
                          <span className="text-[6.5px] font-black text-pink-300">톡톡 랭킹 1위</span>
                          <span className="text-[5.5px] text-pink-400">결시친</span>
                        </div>
                        <div className="p-1 text-[7px] font-bold text-white line-clamp-1">
                          시어머니가 제 결혼반지를...
                        </div>
                        <div className="flex-1 p-1 flex items-center justify-center">
                          <span className="text-[6px] text-stone-300 text-center font-serif">
                            정통 썰 내레이션 자막
                          </span>
                        </div>
                        <div className="w-full bg-pink-950/40 p-0.5 text-center text-[5.5px] text-pink-300">
                          조회 58,000 · 톡커들의 선택
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ── 5. DB(shorts_templates) 등록 커스텀 템플릿 실시간 렌더링 ── */}
                {tpl.isCustom && (
                  <div className="h-full flex flex-col justify-between bg-stone-900/95 p-1.5">
                    <div className="w-full bg-black/70 px-1 py-0.5 rounded text-center border border-white/10">
                      <span className="text-[7.5px] font-black text-amber-300 truncate block">{tpl.name}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-1">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="text-[6.5px] text-stone-300 font-mono">9:16 공방 레이아웃</span>
                      <Badge variant="outline" className="text-[6px] px-1 py-0 text-primary border-primary/40 bg-primary/10">
                        {tpl.badge}
                      </Badge>
                    </div>
                    <div className="w-full bg-black/80 px-1 py-0.5 rounded text-center border border-white/10">
                      <span className="text-[6.5px] text-white truncate block font-bold">{tpl.subtitleStyle}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 템플릿 메타 정보 */}
              <div className="w-full space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className={cn(
                    "text-[11px] font-bold truncate",
                    isSelected ? "text-primary" : "text-foreground group-hover:text-primary transition-colors"
                  )}>
                    {tpl.name}
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-muted/60 text-muted-foreground shrink-0 border-none">
                    {tpl.badge}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {tpl.tagline}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. 선택된 템플릿 세부 사양 요약 인스펙터 바 */}
      {activeTemplate && (
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/80 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-bold text-foreground truncate text-[11.5px]">
                {activeTemplate.name}
              </span>
              <Badge variant="outline" className="text-[9.5px] px-1 py-0 text-primary border-primary/30 shrink-0">
                {activeTemplate.badge}
              </Badge>
            </div>
            <span className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
              <Check className="w-3 h-3" />
              선택 확정됨
            </span>
          </div>

          <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-relaxed">
            {activeTemplate.desc}
          </p>

          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
            <div>
              상단 바: <strong className="text-foreground">{activeTemplate.topBarHeight}</strong>
            </div>
            <div>
              자막: <strong className="text-foreground">{activeTemplate.subtitleStyle}</strong>
            </div>
            <div className="truncate">
              잽/훅: <strong className="text-foreground">{activeTemplate.jabStyle}</strong>
            </div>
            <div className="truncate">
              추천 사운드: <strong className="text-foreground">{activeTemplate.recommendedAudio}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualTemplateShowcase;
