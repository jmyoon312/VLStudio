import React, { useState } from 'react';
import { MeokguriJob } from './types';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  FolderOpen,
  Volume2,
  Clock,
  Layers,
  FileVideo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoPreviewModal } from '@/components/shared/VideoPreviewModal';
import { resolveFileUrl } from '@/utils/fileUrl';

interface MeokguriResultStageProps {
  jobs: MeokguriJob[];
  onRestart: () => void;
  onRefreshJobs: () => void;
}

export const MeokguriResultStage: React.FC<MeokguriResultStageProps> = ({
  jobs,
  onRestart,
  onRefreshJobs
}) => {
  const [selectedJob, setSelectedJob] = useState<MeokguriJob | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const handleOpenPreview = (job: MeokguriJob) => {
    setSelectedJob(job);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-5" data-pixi-meokguri-result-gallery>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-sm font-bold text-foreground">먹구리형 쇼츠 결과 갤러리</h3>
            <p className="text-[11px] text-muted-foreground">
              완성된 ASMR 줌 팝 쇼츠와 CapCut 프로젝트 목록입니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefreshJobs}
            className="h-8 text-xs cursor-pointer"
          >
            새로고침
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onRestart}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>새 작업 시작</span>
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-muted/10 space-y-3">
          <FileVideo className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">아직 생성된 먹구리 쇼츠가 없습니다.</p>
          <Button
            type="button"
            size="sm"
            onClick={onRestart}
            className="h-8 text-xs font-bold"
          >
            첫 먹구리 쇼츠 제작하기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              data-pixi-meokguri-result-card={job.id}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
            >
              {/* 비디오 썸네일 영역 */}
              <div
                className="relative aspect-[9/16] max-h-[260px] w-full bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => handleOpenPreview(job)}
              >
                {job.resultVideoPath ? (
                  <video
                    src={job.resultVideoPath.startsWith('http') ? job.resultVideoPath : resolveFileUrl(`/media/05_Exports/${job.resultVideoPath.split(/[\\/]/).pop()}`)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    loop
                    playsInline
                    onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                    onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                  />
                ) : (
                  <div className="text-center p-4">
                    <FileVideo className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                    <span className="text-[11px] text-muted-foreground">렌더링 진행 중</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                  <span className="p-3 rounded-full bg-primary/90 text-primary-foreground shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current" />
                  </span>
                </div>

                <div className="absolute top-2.5 left-2.5">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] font-mono">
                    +{job.gainBoostDb}dB ASMR
                  </Badge>
                </div>

                <div className="absolute top-2.5 right-2.5">
                  <Badge variant="outline" className="bg-background/80 text-[10px] border-border">
                    {job.zoomPopIntensity}
                  </Badge>
                </div>
              </div>

              {/* 정보 및 액션 */}
              <div className="p-3.5 space-y-2.5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground line-clamp-1">
                    {job.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{job.createdAt}</span>
                    <span>·</span>
                    <span>{job.status === 'completed' ? '완료' : '진행 중'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPreview(job)}
                    className="flex-1 h-8 text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>검수 및 프리뷰</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 비디오 검수 모달 (VideoPreviewModal 직결) */}
      {selectedJob && (
        <VideoPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          sourceType="queue"
          videoData={{
            id: selectedJob.id,
            title: selectedJob.title,
            video_path: selectedJob.resultVideoPath || selectedJob.cleanVideoPath || '',
            status: selectedJob.status,
            channel_name: '먹구리 ASMR',
            subtitles: selectedJob.script?.scenes?.map(sc => sc.narration) || ['먹구리 쇼츠 자막'],
            situation_subtitles: selectedJob.script?.scenes?.map(sc => sc.narration) || [],
            jjap_jjap_i_subtitles: selectedJob.script?.hookJabText ? [selectedJob.script.hookJabText] : ['*바삭바삭*'],
            created_at: selectedJob.createdAt
          }}
          onSelectVideo={() => {
            setIsPreviewOpen(false);
          }}
        />
      )}
    </div>
  );
};
