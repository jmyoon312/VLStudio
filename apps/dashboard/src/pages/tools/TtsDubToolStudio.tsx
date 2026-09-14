import React from 'react';
import { ShortsProductionStudio } from '../ShortsProductionStudio';

/**
 * 🎙️ 더빙 생성기 (TtsDubToolStudio)
 * - 대본 N개 다중 선택 ➔ 화자 분리 + 고음질 멀티보이스 TTS 일괄 더빙
 */
export const TtsDubToolStudio: React.FC = () => {
  return <ShortsProductionStudio fixedToolTab="ttsdub" />;
};

export default TtsDubToolStudio;
