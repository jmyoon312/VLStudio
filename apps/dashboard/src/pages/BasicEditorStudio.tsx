import React from 'react';
import { useParams } from 'react-router-dom';
import { ShortsTemplateStudio, LayoutTemplateMode } from './ShortsTemplateStudio';

/**
 * 👑 ViraLoop Sovereign Basic Editor (통합 기본 에디터)
 * - 4대 폼팩터(클래식, 인스타, 군림보, 썰형)를 원클릭 아키타입으로 통합
 * - UniversalCanvasStage 기반의 1:1 에디터 일치 뷰 & 인터랙티브 기즈모
 * - CapCut PC 1클릭 내보내기 & 백엔드 무인 렌더링(/work-queue) 직결
 * - 13대 플로팅 인스펙터, 페페 밈 감정 선택, 레퍼런스 발골기 완비
 */
export const BasicEditorStudio: React.FC = () => {
  const { mode } = useParams<{ mode?: string }>();
  const validModes: LayoutTemplateMode[] = ['classic', 'instagram', 'gunlimbo', 'ssul'];
  const initialMode = mode && validModes.includes(mode as LayoutTemplateMode) ? (mode as LayoutTemplateMode) : undefined;

  return <ShortsTemplateStudio sovereignMode={initialMode} />;
};

export default BasicEditorStudio;
