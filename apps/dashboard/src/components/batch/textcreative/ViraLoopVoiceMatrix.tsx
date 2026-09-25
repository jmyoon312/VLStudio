import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Play,
  Square,
  Search,
  Sparkles,
  Volume2,
  Check,
  Globe,
  Smile,
  Users,
  Flame,
  Radio,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

export type VoiceCategory = 'recommended' | 'male' | 'female' | 'humor' | 'global';

export interface ViraLoopVoice {
  id: string;
  name: string;
  category: VoiceCategory[];
  gender: '남성' | '여성' | '키즈' | '글로벌';
  tag: string;
  desc: string;
  recommendedRate: number;
  sampleText: string;
  previewUrl?: string;
}

export const VIRALOOP_16_VOICES: ViraLoopVoice[] = [
  // 1. 민준 (1.25x 쇼츠 속보)
  {
    id: 'M1',
    name: '민준',
    category: ['recommended', 'male'],
    gender: '남성',
    tag: '⚡ 1.25x 속보·풍자',
    desc: '시청 지속률 극대화, 뇌전구 스타일 속사포',
    recommendedRate: 1.25,
    sampleText: '오늘 전해드릴 소식은 정말 충격적입니다. 끝까지 확인해보시죠.'
  },
  // 2. 서연 (표준 아나운서)
  {
    id: 'F1',
    name: '서연',
    category: ['recommended', 'female'],
    gender: '여성',
    tag: '🎙️ 표준 아나운서',
    desc: '가장 신뢰감 있고 또렷한 국민 표준 스토리텔러',
    recommendedRate: 1.15,
    sampleText: '엄마의 마지막 도시락에는 따뜻한 편지가 한 장 들어있었습니다.'
  },
  // 3. 도현 (진중한 썰형)
  {
    id: 'M2',
    name: '도현',
    category: ['male'],
    gender: '남성',
    tag: '🎭 썰형 전문',
    desc: '커뮤니티 썰, 야담, 차분하고 덤덤한 현실 중저음 톤',
    recommendedRate: 1.1,
    sampleText: '그날 이후 제 인생은 완전히 달라지기 시작했습니다.'
  },
  // 4. 준서 (코믹 유머)
  {
    id: 'M3',
    name: '준서',
    category: ['male', 'humor'],
    gender: '남성',
    tag: '🤣 코믹·유머',
    desc: '캐주얼하고 능청스러운 티키타카 개그 톤',
    recommendedRate: 1.2,
    sampleText: '아니 이게 말이 됩니까? 진짜 어이가 없어서 웃음만 나오네요.'
  },
  // 5. 영호 (중후함 다큐)
  {
    id: 'M4',
    name: '영호',
    category: ['male'],
    gender: '남성',
    tag: '📰 군림보 다큐',
    desc: '중후하고 단호한 팩트 체크 및 시사 다큐',
    recommendedRate: 1.1,
    sampleText: '공식 발표된 실제 통계 자료에 따르면 상황은 매우 심각합니다.'
  },
  // 6. 지우 (밝은 청년)
  {
    id: 'F2',
    name: '지우',
    category: ['female'],
    gender: '여성',
    tag: '✨ 밝은 브이로그',
    desc: '산뜻하고 감성적인 20대 여성 일상 브이로그 및 쇼츠 톤',
    recommendedRate: 1.15,
    sampleText: '오늘 하루도 정말 고생 많으셨어요. 편안한 저녁 보내세요.'
  },
  // 7. 수진 (차분 지식)
  {
    id: 'F3',
    name: '수진',
    category: ['female'],
    gender: '여성',
    tag: '🌸 지식·북리뷰',
    desc: '편안하고 지적인 교양 콘텐츠 및 심리 분석',
    recommendedRate: 1.1,
    sampleText: '우리가 미처 알지 못했던 뇌 과학의 놀라운 비밀을 알아봅니다.'
  },
  // 8. 은영 (다정한 일상)
  {
    id: 'F4',
    name: '은영',
    category: ['female', 'humor'],
    gender: '여성',
    tag: '👵 다정한 일상',
    desc: '정겹고 포근한 어머니/이모님, 인생 명언, 구수한 야담',
    recommendedRate: 1.05,
    sampleText: '아이고 내 새끼 왔는가, 밥은 든든하게 챙겨 먹고 댕기냐.'
  },
  // 9. 필재 (사이다 실화)
  {
    id: 'system_piljae_shorts',
    name: '필재',
    category: ['recommended', 'male'],
    gender: '남성',
    tag: '🔥 사이다 반전',
    desc: '통쾌하고 직관적인 인과응보 사이다 실화 전개',
    recommendedRate: 1.2,
    sampleText: '그렇게 무시하던 상대에게 상상도 못한 참교육이 시작되었습니다.'
  },
  // 10. 지훈 (초고속 밈)
  {
    id: 'system_jihoon_meme',
    name: '지훈',
    category: ['recommended', 'male'],
    gender: '남성',
    tag: '🚀 초고속 밈 템포',
    desc: 'MZ 밈, 숏폼 알고리즘을 뚫는 쾌속 발화',
    recommendedRate: 1.3,
    sampleText: '3초 안에 결론부터 말씀드립니다. 지금 바로 확인하세요.'
  },
  // 11. 코코로 여성 (로컬 뉴럴)
  {
    id: 'ko_female_1',
    name: '코코로 여성',
    category: ['female'],
    gender: '여성',
    tag: '🎯 로컬 뉴럴',
    desc: '자연스러운 뉴럴 합성 한국어 여성 보이스',
    recommendedRate: 1.1,
    sampleText: '진짜 솔직히 말해서 이거 한번 써보면 다른 건 못 씁니다.'
  },
  // 12. 코코로 남성 (로컬 뉴럴)
  {
    id: 'ko_male_1',
    name: '코코로 남성',
    category: ['male'],
    gender: '남성',
    tag: '🎯 로컬 뉴럴',
    desc: '차분하고 정돈된 로컬 뉴럴 남성 음색',
    recommendedRate: 1.1,
    sampleText: '안녕하세요, 오늘 전해드릴 내용은 매우 특별합니다.'
  },
  // 13. Supertone 키즈 룬
  {
    id: 'supertone-kids-loon',
    name: '키즈 룬',
    category: ['humor'],
    gender: '키즈',
    tag: '🐣 Supertone 키즈',
    desc: '깜찍하고 생동감 넘치는 어린이 동화 및 애니메이션',
    recommendedRate: 1.1,
    sampleText: '와, 신기한 마법의 숲으로 다 같이 모험을 떠나볼까요!'
  },
  // 14. 글로벌 Adam
  {
    id: 'am_adam',
    name: 'Adam (글로벌)',
    category: ['global'],
    gender: '글로벌',
    tag: '🇺🇸 English Native',
    desc: '글로벌 쇼츠 및 해외 타겟 고품질 영어 내레이션',
    recommendedRate: 1.2,
    sampleText: 'This single discovery changed everything we knew about the universe.'
  },
  // 15. 글로벌 Sarah
  {
    id: 'af_sarah',
    name: 'Sarah (글로벌)',
    category: ['global'],
    gender: '글로벌',
    tag: '🇺🇸 English Female',
    desc: '자연스러운 영어 여성 원어민 나레이션',
    recommendedRate: 1.15,
    sampleText: 'Welcome back to the channel. Today we have something truly amazing.'
  },
  // 16. 글로벌 Yuki
  {
    id: 'jf_alpha',
    name: 'Yuki (글로벌)',
    category: ['global'],
    gender: '글로벌',
    tag: '🇯🇵 Japanese Anime',
    desc: '일본 숏폼 및 애니메이션 서사형 감성 음성',
    recommendedRate: 1.15,
    sampleText: 'この秘密を知った時、誰もが信じられませんでした。'
  }
];

interface ViraLoopVoiceMatrixProps {
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string, rate: number) => void;
  voiceRate: number;
  onVoiceRateChange: (rate: number) => void;
  voicePitch: number;
  onVoicePitchChange: (pitch: number) => void;
}

export const ViraLoopVoiceMatrix: React.FC<ViraLoopVoiceMatrixProps> = ({
  selectedVoiceId,
  onSelectVoice,
  voiceRate,
  onVoiceRateChange,
  voicePitch,
  onVoicePitchChange
}) => {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<VoiceCategory>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // 음성 합성 실시간 미리듣기 (Web Speech API 또는 Audio Element 하이브리드)
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handlePlayPreview = (voice: ViraLoopVoice, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingVoiceId === voice.id) {
      // 멈춤
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setPlayingVoiceId(null);
      return;
    }

    setPlayingVoiceId(voice.id);

    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(voice.sampleText);

      // 언어 설정
      if (voice.id.startsWith('ja-')) {
        utterance.lang = 'ja-JP';
      } else if (voice.id.startsWith('en-')) {
        utterance.lang = 'en-US';
      } else {
        utterance.lang = 'ko-KR';
      }

      utterance.rate = voiceRate;
      utterance.pitch = 1.0 + voicePitch * 0.05;

      utterance.onend = () => {
        setPlayingVoiceId(null);
      };

      utterance.onerror = () => {
        setPlayingVoiceId(null);
      };

      synthRef.current.speak(utterance);
    } else {
      // 브라우저 TTS 미지원 시 2초 모의 재생
      setTimeout(() => {
        setPlayingVoiceId(null);
      }, 2000);
    }
  };

  const categories: { id: VoiceCategory; label: string; icon: string }[] = [
    { id: 'recommended', label: '🎙️ 쇼츠 추천', icon: '⚡' },
    { id: 'male', label: '👔 남성 성우', icon: '👔' },
    { id: 'female', label: '👗 여성 성우', icon: '👗' },
    { id: 'humor', label: '🤣 유머·사투리', icon: '🤣' },
    { id: 'global', label: '🌐 글로벌', icon: '🌐' }
  ];

  // 필터링된 음성 목록
  const filteredVoices = VIRALOOP_16_VOICES.filter(voice => {
    const matchesCategory =
      activeCategory === 'recommended'
        ? voice.category.includes('recommended')
        : voice.category.includes(activeCategory);

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesSearch =
      voice.name.toLowerCase().includes(q) ||
      voice.tag.toLowerCase().includes(q) ||
      voice.desc.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const currentVoice =
    VIRALOOP_16_VOICES.find(v => v.id === selectedVoiceId) || VIRALOOP_16_VOICES[0];

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/[0.03] p-3.5 shadow-xs">
      {/* 1. 상단 타이틀 & 현재 선택 음성 뱃지 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>ViraLoop 16종 전역 음성 매트릭스</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30 font-bold">
                PRO TTS
              </Badge>
            </h4>
            <p className="text-[10px] text-muted-foreground">
              선택됨: <b className="text-primary">{currentVoice.name}</b> ({currentVoice.tag}) · 배속: <b className="text-foreground">{voiceRate}x</b>
            </p>
          </div>
        </div>

        {/* 배속 고속 스위처 */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[10px] text-muted-foreground mr-1">배속:</span>
          {[1.0, 1.1, 1.2, 1.25, 1.3].map(rate => (
            <button
              key={rate}
              type="button"
              onClick={() => onVoiceRateChange(rate)}
              className={cn(
                'px-1.5 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer',
                voiceRate === rate
                  ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                  : 'border-border bg-background hover:bg-muted text-muted-foreground'
              )}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* 2. 5대 카테고리 탭 & 검색 바 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer',
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 음성 검색 인풋 */}
        <div className="relative min-w-[140px] max-w-[200px] w-full sm:w-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="성우 이름, 스타일 검색..."
            className="h-7 pl-8 text-[11px] bg-background border-border"
          />
        </div>
      </div>

      {/* 3. 16종 음성 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
        {filteredVoices.map(voice => {
          const isSelected = voice.id === selectedVoiceId;
          const isPlaying = playingVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice.id, voice.recommendedRate)}
              className={cn(
                'group relative rounded-lg border p-2.5 transition cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-xs',
                isSelected
                  ? 'border-primary bg-background ring-1.5 ring-primary/80'
                  : 'border-border bg-background/60 hover:bg-background hover:border-primary/40'
              )}
            >
              <div>
                {/* 상단: 성우명, 성별 뱃지, 미리듣기 버튼 */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">{voice.name}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 bg-muted/60 text-muted-foreground border-border shrink-0">
                      {voice.gender}
                    </Badge>
                  </div>

                  {/* 원클릭 미리듣기 버튼 */}
                  <button
                    type="button"
                    onClick={e => handlePlayPreview(voice, e)}
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center transition cursor-pointer shrink-0',
                      isPlaying
                        ? 'bg-primary text-primary-foreground animate-pulse'
                        : 'bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary'
                    )}
                    title="미리듣기"
                  >
                    {isPlaying ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
                  </button>
                </div>

                {/* 태그 및 설명 */}
                <span className="text-[9px] font-mono text-primary font-bold block truncate">
                  {voice.tag}
                </span>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {voice.desc}
                </p>
              </div>

              {/* 하단 선택 완료 뱃지 */}
              <div className="pt-1.5 mt-1.5 border-t border-border/40 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                <span>권장 {voice.recommendedRate}x</span>
                {isSelected ? (
                  <span className="text-primary font-bold flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> 적용됨
                  </span>
                ) : (
                  <span className="group-hover:text-foreground">선택</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
