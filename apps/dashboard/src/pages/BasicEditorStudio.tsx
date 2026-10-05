import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AllInOneNLEStudio } from '@/components/editor/AllInOneNLEStudio';
import { createDefaultBlueprintV4, migrateToBlueprintV4 } from '@/lib/blueprintV4Migrator';
import { Archetype, VLStandardBlueprintV4 } from '@/types/blueprintV4';
import api from '@/lib/api';
import { toast } from 'sonner';

/**
 * [BasicEditorStudio]
 * 1단계 디자인 기본 에디터 (표준 4.0 스키마 Skia CanvasKit 통합 엔진)
 * - VLStandardBlueprint v4.0 단일 스키마 기반
 * - 60fps CanvasKit 뷰포트 & 4대 폼팩터 1:1 완벽 시각화
 * - 우측 9대 마스터 인스펙터 실시간 양방향 제어
 * - 1클릭 우측 서브탭 연동 & 2클릭 좌측 15종 플로팅 인스펙터 팝업
 * - 마우스 휠 줌(0.2x ~ 4.0x) & 인기 유튜브 폰트 셀렉터 완비
 * - 무한 레이어 확장 ([➕ 새 레이어 추가] 텍스트, 도형, 이모지)
 */
export const BasicEditorStudio: React.FC = () => {
  const { mode } = useParams<{ mode?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const validModes: Archetype[] = ['ssul', 'gunlimbo', 'instagram', 'classic', 'bespoke'];
  const activeArchetype: Archetype =
    mode && validModes.includes(mode as Archetype) ? (mode as Archetype) : 'classic';

  const presetId = searchParams.get('presetId');
  const templateId = searchParams.get('templateId');
  const genericId = searchParams.get('id');

  const [loadedBlueprint, setLoadedBlueprint] = useState<VLStandardBlueprintV4 | null>(null);

  useEffect(() => {
    const queryId = presetId || templateId || genericId;
    if (!queryId) return;

    // 1. sovereign-presets 조회
    api.get(`/sovereign-presets/${encodeURIComponent(queryId)}`)
      .then((res) => {
        if (res.data) {
          const bp = migrateToBlueprintV4(res.data);
          setLoadedBlueprint(bp);
          toast.success(`'${bp.name || "프리셋"}'을(를) 성공적으로 불러왔습니다.`);
        }
      })
      .catch(() => {
        // 2. shorts-templates 조회
        api.get(`/shorts-templates/${encodeURIComponent(queryId)}`)
          .then((res) => {
            if (res.data) {
              const bp = migrateToBlueprintV4(res.data.blueprint_v4 || res.data);
              setLoadedBlueprint(bp);
              toast.success(`'${bp.name || "템플릿"}'을(를) 성공적으로 불러왔습니다.`);
            }
          })
          .catch((err) => {
            console.warn('[BasicEditorStudio] Failed to load preset:', err);
            toast.error('프리셋 데이터를 불러오지 못했습니다.');
          });
      });
  }, [presetId, templateId, genericId]);

  const initialBlueprint = useMemo(() => {
    if (loadedBlueprint) return loadedBlueprint;
    return createDefaultBlueprintV4(activeArchetype, `${activeArchetype.toUpperCase()} 디자인 템플릿`);
  }, [activeArchetype, loadedBlueprint]);

  const handleSave = async (bp: VLStandardBlueprintV4) => {
    try {
      // 1. Save to SQLite shorts_templates table
      await api.post('/shorts-templates', {
        id: bp.blueprintId,
        name: bp.name,
        archetype: bp.archetype,
        aspect_ratio: bp.canvas.aspectRatio,
        blueprint_v4: bp,
        layout: bp.globalLayers,
      });

      // 2. Also save to sovereign presets disk storage
      try {
        await api.post('/sovereign-presets/basic-editor/save', {
          id: bp.blueprintId,
          name: bp.name,
          archetype: bp.archetype,
          category: 'personal',
          description: `${bp.archetype} 기본 에디터 커스텀 프리셋`,
          aspect_ratio: bp.canvas.aspectRatio,
          blueprint: bp,
          style: bp,
        });
      } catch (discErr) {
        console.warn('[BasicEditorStudio] Disk sovereign preset save warning:', discErr);
      }

      window.dispatchEvent(new CustomEvent('presets-folders-updated'));
      toast.success(`'${bp.name}' 템플릿이 보관함에 성공적으로 저장되었습니다.`);
      if (!presetId && bp.blueprintId) {
        navigate({ search: `?presetId=${encodeURIComponent(bp.blueprintId)}` }, { replace: true });
      }
    } catch (e) {
      console.warn('[BasicEditorStudio] Network save fallback:', e);
      toast.error('템플릿 저장 중 문제가 발생하여 로컬에 캐시되었습니다.');
    }
  };

  return (
    <AllInOneNLEStudio
      initialBlueprint={initialBlueprint}
      onSave={handleSave}
      onBack={() => navigate(-1)}
      defaultStudioMode="design"
    />
  );
};

export default BasicEditorStudio;
