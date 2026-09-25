import React, { useState } from 'react';
import { Film, Play, CheckCircle2, Download, Sparkles, ExternalLink, ShieldCheck, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export interface SourceCandidate {
  title: string;
  source_url: string;
  duration_sec: number;
  thumbnail_url: string;
  resolution: string;
  clean_zone_score: number;
  vision_notes: string;
  genre: string;
  sub_category?: string;
  movie_title?: string;
  release_year?: string;
  script_draft_60s?: string;
}

interface SourceCandidateCardProps {
  candidate: SourceCandidate;
  presetId?: string;
  presetName?: string;
  onProduceNow?: (candidate: SourceCandidate) => void;
}

export const SourceCandidateCard: React.FC<SourceCandidateCardProps> = ({
  candidate,
  presetId,
  presetName,
  onProduceNow,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSaveToSourcingCenter = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/sourcing-center/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: candidate.title,
          source_url: candidate.source_url,
          video_duration_sec: candidate.duration_sec,
          resolution: candidate.resolution || '1080p',
          thumbnail_url: candidate.thumbnail_url,
          clean_zone_score: candidate.clean_zone_score,
          genre: candidate.genre || '시네마/드라마',
          sub_category: candidate.sub_category || '감동/눈물실화',
          movie_title: candidate.movie_title || '',
          release_year: candidate.release_year || '',
          script_draft_60s: candidate.script_draft_60s || '',
          auto_download: false,
        }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setIsSaved(true);
        toast.success('소싱 센터 원천 영상 보관소에 성공적으로 영구 등록되었습니다!');
      } else {
        toast.error(`저장 실패: ${data.message || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      toast.error(`저장 통신 실패: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyScript = () => {
    if (!candidate.script_draft_60s) return;
    navigator.clipboard.writeText(candidate.script_draft_60s);
    setCopiedScript(true);
    toast.success('60초 대본 초안이 클립보드에 복사되었습니다.');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="w-full bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs hover:border-primary/50 transition-all duration-200">
      <div className="flex flex-col md:flex-row gap-4 p-4">
        {/* 썸네일 & 영상 뱃지 영역 */}
        <div className="relative w-full md:w-56 h-36 rounded-lg overflow-hidden bg-muted flex-shrink-0 group">
          {candidate.thumbnail_url ? (
            <img
              src={candidate.thumbnail_url}
              alt={candidate.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <Film className="w-8 h-8 mb-1" />
              <span className="text-xs">미리보기 없음</span>
            </div>
          )}

          {/* 재생 시간 배지 */}
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[11px] font-mono text-white backdrop-blur-xs">
            {formatDuration(candidate.duration_sec)}
          </div>

          {/* 1080p 해상도 배지 */}
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-blue-600/90 text-[10px] font-bold text-white uppercase tracking-wider">
            {candidate.resolution || '1080P'}
          </div>

          {/* 원본 바로보기 링크 */}
          {candidate.source_url && (
            <a
              href={candidate.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 backdrop-blur-2xs"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-md">
                <Play className="w-3.5 h-3.5 fill-current" />
                원본 확인
              </div>
            </a>
          )}
        </div>

        {/* 본문 메타데이터 및 분석 정보 */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                {candidate.title}
              </h4>
            </div>

            {/* 태그 & 실측 비전 배지 */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-secondary-foreground">
                {candidate.genre}
              </span>
              {candidate.movie_title && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  🎬 {candidate.movie_title} {candidate.release_year ? `(${candidate.release_year})` : ''}
                </span>
              )}
              {/* 비전 클린존 점수 */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                클린존 적합도 {candidate.clean_zone_score}%
              </span>
            </div>

            {/* 비전 실측 코멘트 */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {candidate.vision_notes || '자막 및 로고 간섭이 적어 9:16 쇼츠 변환 시 최적의 몰입감을 제공합니다.'}
            </p>
          </div>

          {/* 액션 버튼 그룹 */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            {/* 60초 대본 초안 토글 */}
            {candidate.script_draft_60s && (
              <button
                type="button"
                onClick={() => setShowScript(!showScript)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground bg-secondary/80 hover:bg-secondary transition-colors"
              >
                {showScript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                60초 대본 초안
              </button>
            )}

            <div className="flex-1" />

            {/* 소싱 센터에 영구 보관 */}
            <button
              type="button"
              onClick={handleSaveToSourcingCenter}
              disabled={isSaved || isSaving}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSaved
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  소싱 보관 완료
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  {isSaving ? '보관 중...' : '📁 소싱 센터 저장'}
                </>
              )}
            </button>

            {/* 지금 바로 제작 */}
            {onProduceNow && (
              <button
                type="button"
                onClick={() => onProduceNow(candidate)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                ⚡ 지금 숏폼 제작
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 60초 대본 아코디언 */}
      {showScript && candidate.script_draft_60s && (
        <div className="bg-muted/40 border-t border-border p-3.5 text-xs text-foreground/90 font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {presetName || '프리셋'} 맞춤형 60초 나레이션 대본 초안:
            </span>
            <button
              type="button"
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {copiedScript ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copiedScript ? '복사됨' : '대본 복사'}
            </button>
          </div>
          <div className="p-2.5 rounded bg-background border border-border/80 text-xs whitespace-pre-wrap leading-relaxed select-text">
            {candidate.script_draft_60s}
          </div>
        </div>
      )}
    </div>
  );
};
