import React from 'react';
import { ShortsEditorStudio } from '../ShortsEditorStudio';

/**
 * 📜 커뮤니티 썰 독립 전문 편집기 (SsulEditorStudio)
 * - 커뮤니티 모바일 앱 헤더바, 작성자/시간/조회수 메타데이터, 1줄 제목 규격, 자막 누적 시 비디오 물리 슬라이드다운, 페페 밈 전용 NLE 편집기
 * - 타 형식의 UI 노이즈 0% 격리
 */
export const SsulEditorStudio: React.FC = () => {
  return <ShortsEditorStudio sovereignMode="ssul" />;
};

export default SsulEditorStudio;
