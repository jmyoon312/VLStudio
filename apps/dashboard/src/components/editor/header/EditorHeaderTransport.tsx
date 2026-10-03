import React from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { QuickPresetBar } from "./QuickPresetBar";
import { ExportModalTrigger } from "./ExportModalTrigger";
import { createDefaultBlueprintV4, migrateToBlueprintV4 } from "../../../lib/blueprintV4Migrator";
import { PresetLoadModal } from "../../director/PresetLoadModal";
import api from "../../../lib/api";
import { toast } from "sonner";

export interface EditorHeaderTransportProps {
  onBack?: () => void;
  className?: string;
}

/**
 * [EditorHeaderTransport]
 * 상단 마스터 헤더 및 화면비(9:16 ↔ 16:9 ↔ 1:1) 리플로우 제어 바
 */
export const EditorHeaderTransport: React.FC<EditorHeaderTransportProps> = ({
  onBack,
  className = "",
}) => {
  const {
    blueprint,
    setBlueprint,
    dirty,
    saveBlueprint,
    isSaving,
    undo,
    redo,
    canUndo,
    canRedo,
    resetToDefaultArchetype,
  } = useBlueprint();

  // 화면비 전환 및 캔버스 크기 자동 리플로우
  const handleAspectRatioChange = (aspect: "9:16" | "16:9" | "1:1") => {
    const width = aspect === "9:16" ? 1080 : aspect === "16:9" ? 1920 : 1080;
    const height = aspect === "9:16" ? 1920 : aspect === "16:9" ? 1080 : 1080;

    setBlueprint({
      ...blueprint,
      canvas: {
        ...blueprint.canvas,
        width,
        height,
        aspectRatio: aspect,
      },
    });
  };

  const handleArchetypeSwitch = (arch: any) => {
    const isDefaultTemplateName =
      !blueprint.name ||
      blueprint.name === "새 프로젝트" ||
      /^(CLASSIC|INSTA|INSTAGRAM|GUNLIMBO|SSUL|BESPOKE)\s*디자인\s*템플릿$/i.test(blueprint.name);
    const newName = isDefaultTemplateName ? `${arch.toUpperCase()} 디자인 템플릿` : blueprint.name;
    const defaultBp = createDefaultBlueprintV4(arch, newName);
    setBlueprint({
      ...blueprint,
      name: newName,
      archetype: arch,
      canvas: {
        ...blueprint.canvas,
        backgroundColor: defaultBp.canvas.backgroundColor,
      },
      globalLayers: defaultBp.globalLayers,
    });
  };

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editName, setEditName] = React.useState(blueprint.name);

  // 프리셋 보관함 모달 & 다른이름 저장 모달 상태
  const [isPresetVaultOpen, setIsPresetVaultOpen] = React.useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = React.useState(false);
  const [saveAsName, setSaveAsName] = React.useState("");
  const [saveAsCategory, setSaveAsCategory] = React.useState("custom");
  const [isSavingAs, setIsSavingAs] = React.useState(false);

  React.useEffect(() => {
    setEditName(blueprint.name);
  }, [blueprint.name]);

  const handleFinishRename = () => {
    setIsEditingName(false);
    if (editName.trim() && editName.trim() !== blueprint.name) {
      setBlueprint({ ...blueprint, name: editName.trim() });
    }
  };

  const handleSaveAsCustomPreset = async () => {
    const finalName = saveAsName.trim();
    if (!finalName) {
      toast.error("프리셋 이름을 입력해 주세요.");
      return;
    }

    setIsSavingAs(true);
    const newId = `preset_custom_${Date.now()}`;
    const newBp = {
      ...blueprint,
      blueprintId: newId,
      name: finalName,
    };

    try {
      // 1. SQLite shorts_templates table 저장
      await api.post("/shorts-templates", {
        id: newId,
        name: newBp.name,
        archetype: newBp.archetype,
        badge: saveAsCategory,
        aspect_ratio: newBp.canvas.aspectRatio,
        blueprint_v4: newBp,
        layout: newBp.globalLayers,
      });

      // 2. Sovereign Presets 디스크 저장 (PresetLoadModal에서 즉시 검색 및 로드 가능)
      try {
        await api.post("/sovereign-presets/basic-editor/save", {
          id: newId,
          name: newBp.name,
          archetype: newBp.archetype,
          category: saveAsCategory,
          description: `${newBp.archetype} 기본 에디터 커스텀 프리셋`,
          aspect_ratio: newBp.canvas.aspectRatio,
          blueprint: newBp,
          style: newBp,
        });
      } catch (discErr) {
        console.warn("[EditorHeaderTransport] Sovereign preset save warning:", discErr);
      }

      setBlueprint(newBp);
      window.dispatchEvent(new CustomEvent("presets-folders-updated"));
      toast.success(`'${newBp.name}' 나만의 커스텀 프리셋으로 보관함에 저장되었습니다!`);
      setIsSaveAsOpen(false);
    } catch (err) {
      console.error("Failed to save as custom preset:", err);
      toast.error("커스텀 프리셋 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingAs(false);
    }
  };

  return (
    <>
      <header
        className={`h-14 bg-card border-b border-border px-4 flex items-center justify-between select-none z-30 shrink-0 ${className}`}
      >
        {/* 좌측: 뒤로가기 & 프로젝트명 */}
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
              title="대시보드로 돌아가기"
            >
              ←
            </button>
          )}

          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              {isEditingName ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFinishRename();
                    if (e.key === "Escape") {
                      setEditName(blueprint.name);
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  className="font-bold text-sm bg-background border border-primary text-foreground px-1.5 py-0.5 rounded outline-none w-44 shadow-2xs"
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="font-bold text-sm text-foreground tracking-tight hover:text-primary transition-colors flex items-center space-x-1 cursor-pointer group"
                  title="클릭하여 템플릿 이름 수정"
                >
                  <span>{blueprint.name}</span>
                  <span className="text-[10px] text-muted-foreground opacity-50 group-hover:opacity-100">✏️</span>
                </button>
              )}
              {dirty && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="저장되지 않은 변경사항" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {(blueprint?.archetype || "classic").toUpperCase()} • {blueprint?.canvas?.aspectRatio || "9:16"}
            </span>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* 아키타입 스타일 퀵 바 */}
          <QuickPresetBar
            currentArchetype={blueprint?.archetype || "classic"}
            onSelectArchetype={handleArchetypeSwitch}
          />

          <button
            onClick={() => {
              const arch = blueprint?.archetype || "classic";
              resetToDefaultArchetype(arch);
              toast.success(`${arch.toUpperCase()} 표준 레이어로 초기화되었습니다.`);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border text-xs flex items-center space-x-1 cursor-pointer transition-colors"
            title="현재 아키타입의 표준 기본 레이어(헤드라인/자막/쉐이프)로 초기화"
          >
            <span>🔄</span>
            <span className="hidden sm:inline text-[11px] font-medium">초기화</span>
          </button>

          {/* 📂 프리셋 보관함 열기 버튼 */}
          <button
            onClick={() => setIsPresetVaultOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted border border-border text-xs flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs font-semibold"
            title="저장된 프리셋 보관함을 열어 다른 프리셋을 에디터로 불러옵니다"
          >
            <span>📂</span>
            <span className="hidden md:inline text-[11px]">프리셋 보관함</span>
          </button>
        </div>

        {/* 중앙: 화면비 전환 (9:16, 16:9, 1:1) */}
        <div className="flex items-center space-x-1 bg-muted/60 p-1 rounded-xl border border-border">
          {(["9:16", "16:9", "1:1"] as const).map((aspect) => (
            <button
              key={aspect}
              onClick={() => handleAspectRatioChange(aspect)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                blueprint.canvas.aspectRatio === aspect
                  ? "bg-background text-primary border border-border shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {aspect === "9:16" ? "쇼츠 (9:16)" : aspect === "16:9" ? "롱폼 (16:9)" : "피드 (1:1)"}
            </button>
          ))}
        </div>

        {/* 우측: 실행취소/다른이름저장/저장/내보내기 */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-muted/40 p-1 rounded-lg border border-border">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
              title="실행 취소 (Ctrl + Z)"
            >
              ↩
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
              title="다시 실행 (Ctrl + Y)"
            >
              ↪
            </button>
          </div>

          {/* ✨ 다른 이름으로 저장 (새 커스텀 프리셋 생성) */}
          <button
            onClick={() => {
              setSaveAsName(`${blueprint.name} (커스텀)`);
              setIsSaveAsOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer flex items-center space-x-1 shadow-2xs"
            title="현재 수정된 디자인을 새로운 커스텀 프리셋으로 저장하여 보관함에 등록합니다"
          >
            <span>✨</span>
            <span className="hidden sm:inline">다른이름 저장</span>
          </button>

          {/* 💾 기존 템플릿 저장하기 */}
          <button
            onClick={async () => {
              try {
                await saveBlueprint();
                toast.success(`'${blueprint.name}' 저장 완료!`);
              } catch (e) {
                toast.error("저장 중 오류가 발생했습니다.");
              }
            }}
            disabled={isSaving}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
              dirty
                ? "bg-primary/20 text-primary border-primary/50 hover:bg-primary/30 shadow-xs"
                : "bg-muted/60 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <span>{isSaving ? "⏳" : "💾"}</span>
            <span>{isSaving ? "저장 중..." : dirty ? "저장하기" : "저장됨"}</span>
          </button>

          <ExportModalTrigger />
        </div>
      </header>

      {/* 🌟 1. 프리셋 보관함 모달 연동 */}
      {isPresetVaultOpen && (
        <PresetLoadModal
          open={isPresetVaultOpen}
          onOpenChange={setIsPresetVaultOpen}
          activePresetId={blueprint.blueprintId}
          onSelectPreset={(selectedPreset) => {
            const bp = migrateToBlueprintV4(selectedPreset);
            setBlueprint(bp);
            toast.success(`'${bp.name}' 프리셋을 기본 에디터로 불러왔습니다.`);
            setIsPresetVaultOpen(false);
          }}
        />
      )}

      {/* 🌟 2. 다른 이름으로 저장 (커스텀 프리셋 생성) 모달 */}
      {isSaveAsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✨</span>
                <h3 className="text-sm font-bold text-foreground">나만의 커스텀 프리셋으로 저장</h3>
              </div>
              <button
                onClick={() => setIsSaveAsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-medium">
                  새 프리셋 이름
                </label>
                <input
                  type="text"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary font-semibold"
                  placeholder="예: 눈물한가득 (내 커스텀 1호)"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-medium">
                  저장 분류 폴더
                </label>
                <select
                  value={saveAsCategory}
                  onChange={(e) => setSaveAsCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="custom">내 커스텀 프리셋 (Personal)</option>
                  <option value="ssul">커뮤니티 / 썰형 스토리</option>
                  <option value="interview">인터뷰 / 해외 토크쇼</option>
                  <option value="entertainment">연예 / K-POP 정보</option>
                  <option value="ranking">랭킹 / 팩트 체크</option>
                  <option value="knowledge">지식 / 교양 / 비하인드</option>
                </select>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">📌 저장 안내</p>
                <p>• 저장된 프리셋은 프리셋 보관함의 <strong className="text-primary">[내 커스텀]</strong> 탭 및 전체 목록에서 즉시 확인할 수 있습니다.</p>
                <p>• 4대 폼팩터 아키타입({blueprint.archetype})과 캔버스 규격이 보존됩니다.</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsSaveAsOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground cursor-pointer font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveAsCustomPreset}
                disabled={isSavingAs}
                className="px-4 py-1.5 text-xs rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer transition-colors shadow-xs"
              >
                {isSavingAs ? "저장 중..." : "새 프리셋으로 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
