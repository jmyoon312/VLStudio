import React from 'react';
import { ShortsProductionStudio } from '../ShortsProductionStudio';

/**
 * 📝 자막 생성기 (SubtitleToolStudio)
 * - 영상 N개 다중 선택 ➔ Whisper 싱크 + 쨉쨉이 훅 + SFX 효과음 자막 일괄 생성
 */
export const SubtitleToolStudio: React.FC = () => {
  return <ShortsProductionStudio fixedToolTab="subtitle" />;
};

export default SubtitleToolStudio;
