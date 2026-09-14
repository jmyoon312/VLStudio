import React from 'react';
import { ShortsEditorStudio } from '../ShortsEditorStudio';

/**
 * 🎬 군림보 속보 독립 전문 편집기 (GunlimboEditorStudio)
 * - 상단 24% 2줄 속보 헤드라인, 24~34% 반전 훅 밴드 박스, Ken Burns 0초 줌인 비디오, 하단 75% 자막 전용 NLE 편집기
 * - 타 형식의 UI 노이즈 0% 격리
 */
export const GunlimboEditorStudio: React.FC = () => {
  return <ShortsEditorStudio sovereignMode="gunlimbo" />;
};

export default GunlimboEditorStudio;
