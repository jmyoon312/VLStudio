import React from 'react';
import { ShortsEditorStudio } from '../ShortsEditorStudio';

/**
 * 🥪 클래식 쇼츠 독립 전문 편집기 (ClassicEditorStudio)
 * - 상·하단 레터박스 바, 2단 대제목, 샌드위치 비디오, 표준 자막 전용 NLE 편집기
 * - 타 형식의 UI 노이즈 0% 격리
 */
export const ClassicEditorStudio: React.FC = () => {
  return <ShortsEditorStudio sovereignMode="classic" />;
};

export default ClassicEditorStudio;
