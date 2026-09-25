import React, { useRef } from 'react';
import {
  FolderArchive,
  Download,
  FolderOpen,
  CheckCircle2,
  FileCode,
  Package,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MovieDramaExportPanelProps {
  onExportAllCapcut: () => void;
  isExportingCapcut: boolean;
  onInstallPortablePack: (file: File) => void;
  isInstallingPack: boolean;
  localDrafts: Array<{ candidateId: string; draftPath: string; title: string }>;
  onRevealFolder: (path: string) => void;
}

export const MovieDramaExportPanel: React.FC<MovieDramaExportPanelProps> = ({
  onExportAllCapcut,
  isExportingCapcut,
  onInstallPortablePack,
  isInstallingPack,
  localDrafts,
  onRevealFolder
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capcutLayers = [
    { title: '1. 상단 제목', desc: '이야기의 핵심을 한 문장으로 정리' },
    { title: '2. 영상 영역', desc: '장면 순서와 세로 9:16 화면 배치' },
    { title: '3. 대사·TTS 자막', desc: '원대사와 AI 음성을 각각 분리 편집' },
    { title: '4. 하단 코멘트', desc: '상황을 이해시키는 리액션 해설' }
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-1 xl:grid-cols-12 items-stretch divide-y xl:divide-y-0 xl:divide-x divide-border">
        {/* 좌측 안내 (7칸) */}
        <div className="xl:col-span-7 p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">완성·내보내기</span>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                CAPCUT PC PRO
              </Badge>
            </div>
            <h3 className="mt-1 text-lg font-bold text-foreground">
              업로드할 MP4가 기본, CapCut 초안은 선택
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              각 이야기 후보의 ‘완성 MP4 만들기’로 즉시 0원 렌더링이 가능하며, 장면이나 문구를 직접 더 정밀하게 다듬고 싶을 때만 CapCut 프로젝트를 내보내세요.
            </p>
          </div>

          {/* 4대 레이어 정보 */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2.5">
            <span className="text-xs font-bold text-foreground block flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span>CapCut에서 자유롭게 바꿀 수 있는 4대 레이어</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {capcutLayers.map(l => (
                <div key={l.title} className="rounded-lg bg-background p-2.5 border border-border/60">
                  <span className="text-xs font-bold text-foreground block">{l.title}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">{l.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 우측 버튼 액션 (5칸) */}
        <div className="xl:col-span-5 p-6 bg-muted/15 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground">초안 및 패키지 관리</h4>

            {/* 후보별 CapCut 초안 일괄 만들기 */}
            <Button
              type="button"
              variant="default"
              disabled={isExportingCapcut}
              onClick={onExportAllCapcut}
              className="w-full h-11 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-xs cursor-pointer"
            >
              <FileCode className="size-4" />
              <span>{isExportingCapcut ? 'CapCut 초안 생성 중...' : '선정된 후보 CapCut 초안 일괄 생성'}</span>
            </Button>

            {/* 다른 PC 이동 패키지 가져오기 */}
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={isInstallingPack}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 rounded-xl font-bold text-xs border border-border bg-background hover:bg-muted gap-2 cursor-pointer shadow-xs"
              >
                <Package className="size-4 text-primary" />
                <span>{isInstallingPack ? '패키지 무결성 확인 및 설치 중...' : '다른 PC의 이동 패키지(ZIP) 가져오기'}</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                disabled={isInstallingPack}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onInstallPortablePack(file);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* 생성된 로컬 초안 목록 */}
          {localDrafts.length > 0 && (
            <div className="pt-3 border-t border-border/60 space-y-2">
              <span className="text-[11px] font-bold text-foreground block">
                생성된 로컬 초안 ({localDrafts.length}개)
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {localDrafts.map(d => (
                  <div
                    key={d.candidateId}
                    className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/80 text-xs"
                  >
                    <span className="truncate max-w-[160px] font-medium text-foreground text-[11px]">
                      {d.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRevealFolder(d.draftPath)}
                      className="h-7 px-2 text-[10px] text-primary hover:underline font-bold gap-1"
                    >
                      <FolderOpen className="size-3" />
                      <span>폴더 열기</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
