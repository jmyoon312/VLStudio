import React, { useRef, useEffect } from "react";
import { AudioDSPSpec } from "../../../types/blueprintV4";
import { ScrubInput } from "./ScrubInput";

export interface AudioDuckingInspectorProps {
  audioDSP: AudioDSPSpec;
  onChange: (patch: Partial<AudioDSPSpec>) => void;
  className?: string;
}

/**
 * [AudioDuckingInspector]
 * 프로덕션 하드닝 2.3: 방송 표준 로그 데시벨(-24dB) 오디오 덕킹 설정기
 * V(t) = 10^(gain/20) 곡선 실시간 캔버스 시각화
 */
export const AudioDuckingInspector: React.FC<AudioDuckingInspectorProps> = ({
  audioDSP,
  onChange,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ducking = audioDSP.duckingEnvelope;
  const targetDb = ducking.targetDuckingDb ?? -24.0;
  const attackMs = ducking.attackMs ?? 150;
  const holdMs = ducking.holdMs ?? 150;
  const releaseMs = ducking.releaseMs ?? 300;

  // 로그 게인 값 계산: 10^(gain/20)
  const linearGain = Math.pow(10, targetDb / 20);

  // 실시간 덕킹 엔벨로프 곡선 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 배경 그리드
    ctx.strokeStyle = "rgba(63, 63, 70, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.2);
    ctx.lineTo(w, h * 0.2);
    ctx.moveTo(0, h * 0.8);
    ctx.lineTo(w, h * 0.8);
    ctx.stroke();

    // 덕킹 곡선 계산 (Attack -> Hold -> Release)
    const totalMs = attackMs + holdMs + releaseMs + 400;
    const p1 = (100 / totalMs) * w;
    const p2 = ((100 + attackMs) / totalMs) * w;
    const p3 = ((100 + attackMs + holdMs) / totalMs) * w;
    const p4 = ((100 + attackMs + holdMs + releaseMs) / totalMs) * w;

    const highY = h * 0.2; // 0dB
    const lowY = h * 0.2 + (1.0 - linearGain) * (h * 0.65); // -24dB

    ctx.strokeStyle = "#06b6d4"; // cyan
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, highY);
    ctx.lineTo(p1, highY);

    // 지수형(로그) 어택 곡선
    ctx.bezierCurveTo(p1 + (p2 - p1) * 0.6, highY, p2 - (p2 - p1) * 0.2, lowY, p2, lowY);

    // 홀드 유지 구간
    ctx.lineTo(p3, lowY);

    // 지수형(로그) 릴리즈 곡선
    ctx.bezierCurveTo(p3 + (p4 - p3) * 0.3, lowY, p4 - (p4 - p3) * 0.3, highY, p4, highY);
    ctx.lineTo(w, highY);
    ctx.stroke();

    // 발화 마커 텍스트
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "9px monospace";
    ctx.fillText("0dB (BGM 정상)", 6, highY - 4);
    ctx.fillText(`${targetDb}dB (나레이션 덕킹 감쇄)`, p2, lowY + 14);
  }, [targetDb, attackMs, holdMs, releaseMs, linearGain]);

  const updateDucking = (patch: Partial<typeof ducking>) => {
    onChange({
      duckingEnvelope: {
        ...ducking,
        ...patch,
      },
    });
  };

  return (
    <div className={`space-y-4 p-3 bg-card rounded-xl border border-border ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span>오디오 & 덕킹 (Audio DSP)</span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
          V(t) = 10^(dB/20)
        </span>
      </div>

      {/* 실시간 로그 덕킹 곡선 캔버스 */}
      <div className="bg-muted/40 p-2 rounded-lg border border-border">
        <canvas
          ref={canvasRef}
          width={280}
          height={75}
          className="w-full h-auto block"
        />
        <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-mono">
          <span>어택: {attackMs}ms</span>
          <span>홀드: {holdMs}ms</span>
          <span>릴리즈: {releaseMs}ms</span>
        </div>
      </div>

      {/* 스크럽 인풋 조절 패널 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground font-medium">덕킹 감쇄율 (dB)</span>
          <ScrubInput
            label="dB"
            value={targetDb}
            onChange={(val) => updateDucking({ targetDuckingDb: val })}
            min={-40}
            max={-6}
            step={0.5}
            unit="dB"
            className="w-28"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ScrubInput
            label="어택"
            value={attackMs}
            onChange={(val) => updateDucking({ attackMs: Math.round(val) })}
            min={20}
            max={500}
            step={10}
            unit="ms"
          />
          <ScrubInput
            label="홀드"
            value={holdMs}
            onChange={(val) => updateDucking({ holdMs: Math.round(val) })}
            min={50}
            max={600}
            step={10}
            unit="ms"
          />
          <ScrubInput
            label="릴리즈"
            value={releaseMs}
            onChange={(val) => updateDucking({ releaseMs: Math.round(val) })}
            min={100}
            max={1000}
            step={20}
            unit="ms"
          />
        </div>
      </div>

      {/* 나레이션 보이스 엔진 정보 */}
      <div className="pt-2 border-t border-border text-[11px] text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>TTS 음성 엔진:</span>
          <span className="text-foreground font-mono font-medium">{audioDSP.voiceSignature.engine}</span>
        </div>
        <div className="flex justify-between">
          <span>음성 성향 / 페르소나:</span>
          <span className="text-primary font-mono truncate max-w-[150px]">
            {audioDSP.voiceSignature.role}
          </span>
        </div>
      </div>
    </div>
  );
};
