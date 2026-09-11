import React from 'react';

export type MemeType = 'pepe' | 'irasutoya' | 'custom' | 'none';
export type MemeEmotion = 
  | 'angry' 
  | 'crying' 
  | 'panic' 
  | 'smug' 
  | 'peace' 
  | 'happy' 
  | 'thinking' 
  | 'popcorn' 
  | 'suspicious' 
  | 'shocked';

export interface MemePreset {
  id: MemeEmotion;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

export const MEME_EMOTION_PRESETS: MemePreset[] = [
  { id: 'angry', label: '극대노 / 분노', emoji: '😡', description: '화남, 억울함, 빡침 씬', color: '#EF4444' },
  { id: 'panic', label: '멘붕 / 당황', emoji: '😱', description: '땀 삐질, 어쩔 줄 모름', color: '#F59E0B' },
  { id: 'crying', label: '오열 / 눈물', emoji: '😭', description: '슬픔, 좌절, 눈물 줄줄', color: '#3B82F6' },
  { id: 'smug', label: '비웃음 / 썩소', emoji: '😏', description: '약올림, 승리감, 통쾌함', color: '#10B981' },
  { id: 'thinking', label: '고뇌 / 턱괴기', emoji: '🤔', description: '의문, 고민, 계산 중', color: '#8B5CF6' },
  { id: 'shocked', label: '충격 / 경악', emoji: '⚡', description: '동공지진, 턱 빠짐', color: '#EC4899' },
  { id: 'popcorn', label: '팝콘각 / 구경', emoji: '🍿', description: '꿀잼 관전, 불구경', color: '#F97316' },
  { id: 'suspicious', label: '의심 / 째려보기', emoji: '🧐', description: '의혹 제기, 곁눈질', color: '#64748B' },
  { id: 'happy', label: '환호 / 행복', emoji: '🥳', description: '대박, 만세, 기쁨', color: '#22C55E' },
  { id: 'peace', label: '해탈 / 무념무상', emoji: '🧘', description: '될 대로 돼라, 달관', color: '#06B6D4' },
];

interface MemeAvatarProps {
  type: MemeType;
  emotion: MemeEmotion;
  customUrl?: string;
  aliveMotion?: boolean;
  className?: string;
  size?: number;
}

export const MemeAvatar: React.FC<MemeAvatarProps> = ({
  type,
  emotion,
  customUrl,
  aliveMotion = true,
  className = '',
  size = 140,
}) => {
  if (type === 'none') return null;

  if (type === 'custom' && customUrl) {
    return (
      <div 
        className={`relative inline-block transition-transform duration-300 ${aliveMotion ? 'animate-bounce-subtle' : ''} ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={customUrl} alt="Custom Meme" className="w-full h-full object-contain drop-shadow-md" />
      </div>
    );
  }

  // 페페 더 프로그 (Pepe) 고품질 벡터 일러스트 SVG
  const renderPepe = () => {
    switch (emotion) {
      case 'angry':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
            <rect width="100" height="100" rx="20" fill="#2E7D32" opacity="0.1" />
            <path d="M 20 50 Q 15 25 50 20 Q 85 25 80 50 Q 85 75 50 82 Q 15 75 20 50 Z" fill="#558B2F" stroke="#33691E" strokeWidth="2.5" />
            <ellipse cx="33" cy="35" rx="14" ry="12" fill="#FFF" stroke="#222" strokeWidth="2" />
            <ellipse cx="67" cy="35" rx="14" ry="12" fill="#FFF" stroke="#222" strokeWidth="2" />
            <circle cx="37" cy="37" r="4" fill="#B71C1C" />
            <circle cx="63" cy="37" r="4" fill="#B71C1C" />
            <path d="M 23 32 L 32 36 M 26 39 L 34 37" stroke="#D32F2F" strokeWidth="1.2" />
            <path d="M 77 32 L 68 36 M 74 39 L 66 37" stroke="#D32F2F" strokeWidth="1.2" />
            <path d="M 20 25 L 45 36" stroke="#1B5E20" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 80 25 L 55 36" stroke="#1B5E20" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 25 65 Q 50 50 75 65 Q 50 78 25 65 Z" fill="#C62828" stroke="#222" strokeWidth="2" />
            <path d="M 30 65 L 70 65" stroke="#FFF" strokeWidth="2" strokeDasharray="3,3" />
            <path d="M 82 18 L 86 12 M 86 18 L 82 12 M 79 15 L 89 15" stroke="#E53935" strokeWidth="2" />
          </svg>
        );
      case 'crying':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
            <rect width="100" height="100" rx="20" fill="#1E88E5" opacity="0.1" />
            <path d="M 20 50 Q 15 25 50 20 Q 85 25 80 50 Q 85 75 50 82 Q 15 75 20 50 Z" fill="#689F38" stroke="#33691E" strokeWidth="2.5" />
            <ellipse cx="35" cy="38" rx="13" ry="11" fill="#FFF" stroke="#222" strokeWidth="2" />
            <ellipse cx="65" cy="38" rx="13" ry="11" fill="#FFF" stroke="#222" strokeWidth="2" />
            <ellipse cx="36" cy="42" rx="5" ry="5" fill="#1565C0" />
            <ellipse cx="64" cy="42" rx="5" ry="5" fill="#1565C0" />
            <path d="M 34 46 Q 30 65 28 85" stroke="#42A5F5" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85" />
            <path d="M 66 46 Q 70 65 72 85" stroke="#42A5F5" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85" />
            <path d="M 22 34 Q 34 26 44 32" stroke="#1B5E20" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 78 34 Q 66 26 56 32" stroke="#1B5E20" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 28 72 Q 50 56 72 72 Q 50 63 28 72 Z" fill="#D32F2F" stroke="#222" strokeWidth="2" />
          </svg>
        );
      case 'smug':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
            <rect width="100" height="100" rx="20" fill="#10B981" opacity="0.1" />
            <path d="M 20 50 Q 15 25 50 20 Q 85 25 80 50 Q 85 75 50 82 Q 15 75 20 50 Z" fill="#8BC34A" stroke="#33691E" strokeWidth="2.5" />
            <path d="M 23 38 Q 35 32 46 38" stroke="#222" strokeWidth="3" fill="#FFF" />
            <circle cx="36" cy="37" r="2.5" fill="#222" />
            <path d="M 54 38 Q 65 32 77 38" stroke="#222" strokeWidth="3" fill="#FFF" />
            <circle cx="64" cy="37" r="2.5" fill="#222" />
            <path d="M 28 66 Q 48 64 74 54 Q 68 70 28 66 Z" fill="#558B2F" stroke="#222" strokeWidth="2.5" />
          </svg>
        );
      case 'popcorn':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
            <rect width="100" height="100" rx="20" fill="#F97316" opacity="0.1" />
            <path d="M 20 50 Q 15 25 50 20 Q 85 25 80 50 Q 85 75 50 82 Q 15 75 20 50 Z" fill="#7CB342" stroke="#33691E" strokeWidth="2.5" />
            <ellipse cx="35" cy="38" rx="14" ry="12" fill="#FFF" stroke="#222" strokeWidth="2" />
            <ellipse cx="65" cy="38" rx="14" ry="12" fill="#FFF" stroke="#222" strokeWidth="2" />
            <circle cx="36" cy="38" r="4" fill="#222" />
            <circle cx="64" cy="38" r="4" fill="#222" />
            <rect x="23" y="32" width="23" height="13" rx="3" fill="#EF4444" opacity="0.5" stroke="#222" strokeWidth="1.5" />
            <rect x="54" y="32" width="23" height="13" rx="3" fill="#3B82F6" opacity="0.5" stroke="#222" strokeWidth="1.5" />
            <line x1="46" y1="38" x2="54" y2="38" stroke="#222" strokeWidth="2" />
            <path d="M 40 70 L 43 95 L 57 95 L 60 70 Z" fill="#EF4444" stroke="#222" strokeWidth="1.5" />
            <line x1="47" y1="70" x2="48" y2="95" stroke="#FFF" strokeWidth="2" />
            <line x1="53" y1="70" x2="52" y2="95" stroke="#FFF" strokeWidth="2" />
            <circle cx="45" cy="68" r="4" fill="#FEF08A" stroke="#222" strokeWidth="1" />
            <circle cx="52" cy="67" r="4.5" fill="#FEF08A" stroke="#222" strokeWidth="1" />
            <circle cx="58" cy="69" r="4" fill="#FEF08A" stroke="#222" strokeWidth="1" />
          </svg>
        );
      case 'panic':
      default:
        return (
          <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
            <rect width="100" height="100" rx="20" fill="#F59E0B" opacity="0.1" />
            <path d="M 20 50 Q 15 25 50 20 Q 85 25 80 50 Q 85 75 50 82 Q 15 75 20 50 Z" fill="#7CB342" stroke="#33691E" strokeWidth="2.5" />
            <ellipse cx="35" cy="38" rx="15" ry="15" fill="#FFF" stroke="#222" strokeWidth="2" />
            <ellipse cx="65" cy="38" rx="15" ry="15" fill="#FFF" stroke="#222" strokeWidth="2" />
            <circle cx="37" cy="38" r="3" fill="#222" />
            <circle cx="63" cy="38" r="3" fill="#222" />
            <path d="M 78 28 C 76 25 82 20 82 20 C 82 20 88 25 86 28 C 85 30 79 30 78 28 Z" fill="#29B6F6" />
            <path d="M 20 32 C 18 29 24 24 24 24 C 24 24 30 29 28 32 C 27 34 21 34 20 32 Z" fill="#29B6F6" />
            <path d="M 30 65 Q 40 60 50 67 Q 60 60 70 65" stroke="#222" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        );
    }
  };

  // 이라스토야 (Irasutoya - 일본풍 귀여운 현실 사람 캐릭터)
  const renderIrasutoya = () => {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
        <circle cx="50" cy="50" r="45" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="2" />
        <ellipse cx="50" cy="52" rx="32" ry="30" fill="#FFEDD5" stroke="#EA580C" strokeWidth="1.5" />
        <path d="M 20 48 Q 20 18 50 18 Q 80 18 80 48 Q 72 30 50 32 Q 28 30 20 48 Z" fill="#431407" />
        <circle cx="30" cy="58" r="6" fill="#FCA5A5" opacity="0.6" />
        <circle cx="70" cy="58" r="6" fill="#FCA5A5" opacity="0.6" />
        {emotion === 'angry' ? (
          <>
            <path d="M 30 42 L 42 46" stroke="#431407" strokeWidth="3" strokeLinecap="round" />
            <path d="M 70 42 L 58 46" stroke="#431407" strokeWidth="3" strokeLinecap="round" />
            <circle cx="37" cy="48" r="3.5" fill="#431407" />
            <circle cx="63" cy="48" r="3.5" fill="#431407" />
            <path d="M 40 68 Q 50 58 60 68" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </>
        ) : emotion === 'crying' ? (
          <>
            <path d="M 32 44 Q 38 48 44 45" stroke="#431407" strokeWidth="2.5" fill="none" />
            <path d="M 68 44 Q 62 48 56 45" stroke="#431407" strokeWidth="2.5" fill="none" />
            <circle cx="38" cy="47" r="3" fill="#1E40AF" />
            <circle cx="62" cy="47" r="3" fill="#1E40AF" />
            <path d="M 38 52 Q 36 68 35 78" stroke="#60A5FA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 62 52 Q 64 68 65 78" stroke="#60A5FA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 42 68 Q 50 62 58 68" stroke="#431407" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <circle cx="36" cy="46" r="3.5" fill="#431407" />
            <circle cx="64" cy="46" r="3.5" fill="#431407" />
            <path d="M 42 64 Q 50 72 58 64" stroke="#431407" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
    );
  };

  return (
    <div 
      className={`inline-block select-none transform transition-transform duration-200 ${aliveMotion ? 'hover:scale-105 active:scale-95' : ''} ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {type === 'pepe' ? renderPepe() : renderIrasutoya()}
    </div>
  );
};
