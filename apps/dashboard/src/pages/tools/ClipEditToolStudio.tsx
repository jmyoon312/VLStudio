import React from 'react';
import { ShortsProductionStudio } from '../ShortsProductionStudio';

/**
 * ✂️ 클립 분할기 (ClipEditToolStudio)
 * - 롱폼 영상 선택 ➔ AI 주제별 하이라이트 숏폼 클립 일괄 추출
 */
export const ClipEditToolStudio: React.FC = () => {
  return <ShortsProductionStudio fixedToolTab="clipedit" />;
};

export default ClipEditToolStudio;
