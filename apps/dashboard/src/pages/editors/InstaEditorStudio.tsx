import React from 'react';
import { ShortsEditorStudio } from '../ShortsEditorStudio';

/**
 * 📱 인스타 릴스 독립 전문 편집기 (InstaEditorStudio)
 * - 원형 프로필 아바타, 릴스 계정 프리셋, 중앙 프레임 홀, 하단 바이럴 베댓 카드 전용 NLE 편집기
 * - 타 형식의 UI 노이즈 0% 격리
 */
export const InstaEditorStudio: React.FC = () => {
  return <ShortsEditorStudio sovereignMode="instagram" />;
};

export default InstaEditorStudio;
