import React from 'react';
import {
  Layers,
  Palette,
  Check,
  Tv,
  Crown,
  Sparkles,
  Film,
  Flame,
  MessageSquare,
  Smartphone,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { TargetArchetype } from '../tabs/OneTakeBatchTab';

interface OneTakeTemplateSectionProps {
  selectedArchetype: TargetArchetype;
  onArchetypeChange: (archetype: TargetArchetype) => void;
  selectedTemplateId: string;
  onTemplateIdChange: (id: string) => void;
}

export interface ArchetypeMeta {
  id: TargetArchetype;
  name: string;
  badge: string;
  icon: any;
  desc: string;
  tagline: string;
}

export const ARCHETYPES: ArchetypeMeta[] = [
  {
    id: 'ssul',
    name: '썰형 커뮤니티',
    badge: '📜 썰 특화',
    icon: MessageSquare,
    desc: '상단 커뮤니티 헤더바, 페페 아바타, 누적 자막 모드, 하단 베플 카드',
    tagline: '직장인·블라인드·네이트판 바이럴 최적화'
  },
  {
    id: 'classic',
    name: '샌드위치 클래식',
    badge: '🥪 샌드위치',
    icon: Monitor,
    desc: '3-Tier 샌드위치 핏, 상하단 시네마틱 레터박스, 중앙 16:9 비디오 핏',
    tagline: '안정적인 정통 유튜브 쇼츠 포맷'
  },
  {
    id: 'instagram',
    name: '인스타 릴스',
    badge: '📱 릴스 공식',
    icon: Smartphone,
    desc: '릴스 헤더/프로필 UI, 공식 인증 파란 뱃지, 실시간 하트/좋아요 카운터',
    tagline: '인스타그램 릴스 & 틱톡 동시 공략'
  },
  {
    id: 'gunlimbo',
    name: '군림보 속보형',
    badge: '🎬 0초 줌 펀치',
    icon: Flame,
    desc: '0초 줌 펀치(시작 0.5초 확대 펀치), 상단 긴급 속보 훅 밴드, 듀얼 타이포',
    tagline: '사건사고·이슈·스릴러 시청 지속률 1위'
  }
];

export const TEMPLATE_PRESETS_BY_ARCHETYPE: Record<TargetArchetype, { id: string; name: string; desc: string; colors: string[] }[]> = {
  ssul: [
    { id: 'ssul-dark-modern', name: '다크 모던 썰', desc: '세련된 차콜 배경 + 화이트 텍스트', colors: ['#121212', '#2A2A2A', '#FFE600'] },
    { id: 'ssul-retro-katalk', name: '레트로 카톡 썰', desc: '옐로우 말풍선 + 카톡 스타일 대화', colors: ['#FEE500', '#3C1E1E', '#FFFFFF'] },
    { id: 'ssul-neon-yellow', name: '네온 옐로우 썰', desc: '하이라이트 형광 옐로우 강조 핏', colors: ['#0A0A0A', '#F5F420', '#FFFFFF'] },
    { id: 'ssul-minimal-white', name: '미니멀 화이트 썰', desc: '깔끔한 종이 질감 클린 썰', colors: ['#F8F9FA', '#212529', '#0D6EFD'] },
  ],
  gunlimbo: [
    { id: 'gunlimbo-cyber-breaking', name: '사이버 브레이킹 속보', desc: '레드 긴급 속보 밴드 + 0초 줌 펀치', colors: ['#EF4444', '#000000', '#FACC15'] },
    { id: 'gunlimbo-case-docu', name: '사건수첩 다큐', desc: '진중한 그레이 레터박스 + 볼드 옐로우', colors: ['#1F2937', '#F59E0B', '#FFFFFF'] },
    { id: 'gunlimbo-golden-docu', name: '골든 다큐멘터리', desc: '고급스러운 골드 액센트 시네마', colors: ['#78350F', '#FDE047', '#FFFFFF'] },
    { id: 'gunlimbo-bloody-crime', name: '블러디 크라임 룩', desc: '충격 실화 폭로 전용 딥 크림슨', colors: ['#7F1D1D', '#F87171', '#000000'] },
  ],
  instagram: [
    { id: 'insta-modern-clean', name: '모던 클린 릴스', desc: '투명 헤더 + 인스타 파란 뱃지 인증', colors: ['#0095F6', '#262626', '#FFFFFF'] },
    { id: 'insta-dark-minimal', name: '다크 미니멀 릴스', desc: '어두운 그라디언트 + 감성 타이포', colors: ['#1A1A1A', '#E1306C', '#FFFFFF'] },
    { id: 'insta-magazine-news', name: '매거진 뉴스 룩', desc: '카드 뉴스 형태의 헤드라인 레이아웃', colors: ['#111827', '#6366F1', '#F3F4F6'] },
    { id: 'insta-vivid-pop', name: '비비드 팝 릴스', desc: '통통 튀는 네온 핑크와 시안 조합', colors: ['#EC4899', '#06B6D4', '#18181B'] },
  ],
  classic: [
    { id: 'classic-cinematic-35mm', name: '시네마틱 35mm 필름', desc: '상하단 레터박스 + 틸오렌지 필름 감성', colors: ['#000000', '#D97706', '#E5E7EB'] },
    { id: 'classic-hollywood', name: '헐리우드 틸오렌지', desc: '할리우드 영화 예고편 스타일 볼드 자막', colors: ['#0F172A', '#38BDF8', '#FB923C'] },
    { id: 'classic-90s-vhs', name: '90s VHS 레트로', desc: '레트로 테이프 질감 + 레트로 폰트', colors: ['#1E1B4B', '#A855F7', '#F43F5E'] },
    { id: 'classic-noir-bw', name: '흑백 필름 느와르', desc: '묵직한 모노크롬 대비와 하얀 자막', colors: ['#000000', '#6B7280', '#FFFFFF'] },
  ]
};

export const OneTakeTemplateSection: React.FC<OneTakeTemplateSectionProps> = ({
  selectedArchetype,
  onArchetypeChange,
  selectedTemplateId,
  onTemplateIdChange
}) => {
  const currentTemplates = TEMPLATE_PRESETS_BY_ARCHETYPE[selectedArchetype] || TEMPLATE_PRESETS_BY_ARCHETYPE.ssul;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">4대 폼팩터 구조 & 템플릿 디자인 공방</span>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
          Four Sovereign Studios
        </Badge>
      </div>

      {/* 1. 4대 폼팩터 독립 주권 선택기 */}
      <div>
        <Label className="text-xs font-bold text-foreground mb-2 block">
          1. 폼팩터 구조 선택 (Form-Factor Paradigm)
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ARCHETYPES.map(arch => {
            const isSelected = selectedArchetype === arch.id;
            const Icon = arch.icon;
            return (
              <div
                key={arch.id}
                onClick={() => {
                  onArchetypeChange(arch.id);
                  const firstTpl = TEMPLATE_PRESETS_BY_ARCHETYPE[arch.id][0]?.id;
                  if (firstTpl) onTemplateIdChange(firstTpl);
                }}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between text-left",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                    : "border-border/80 bg-background/50 hover:bg-muted/30 hover:border-border"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Icon className="w-4 h-4 text-primary" />
                      <span>{arch.name}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mb-2">
                    {arch.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-border/40 text-[10px] text-primary font-medium">
                  {arch.tagline}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 16대 템플릿 디자인 매트릭스 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary" />
            <span>2. {ARCHETYPES.find(a => a.id === selectedArchetype)?.name} 전용 템플릿 디자인</span>
          </Label>
          <span className="text-[10px] text-muted-foreground">타 형식 간섭 0% 완전 격리</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {currentTemplates.map(tpl => {
            const isSelected = selectedTemplateId === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => onTemplateIdChange(tpl.id)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border/80 bg-background/50 hover:bg-muted/30 hover:border-border"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground truncate">{tpl.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mb-2">
                    {tpl.desc}
                  </p>
                </div>

                <div className="flex items-center gap-1 pt-1.5 border-t border-border/40">
                  {tpl.colors.map((c, i) => (
                    <span
                      key={i}
                      className="w-3.5 h-3.5 rounded-full border border-border/80"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OneTakeTemplateSection;
