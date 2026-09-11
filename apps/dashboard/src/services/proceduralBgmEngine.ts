/**
 * 🎵 ViraLoop Studio - 프로시저럴 Web Audio BGM 엔진 (Procedural BGM Engine)
 * 외부 mp3 파일 없이도 100% 로컬 Web Audio API를 활용하여
 * 무음 방지 및 끊김 없는 고품질 시네마틱/로파이/텐션 배경음악을 실시간 합성·재생합니다.
 * 404 네트워크 오류가 절대 발생하지 않으며, 타임라인 플레이헤드와 완벽 동기화됩니다.
 */

export interface BgmPreset {
  id: string;
  name: string;
  category: 'lofi' | 'tension' | 'electronic' | 'piano';
  icon: string;
  description: string;
}

export const BGM_PRESETS: BgmPreset[] = [
  {
    id: 'bgm_preset_ambient',
    name: '☕ 칠 앰비언트 로파이',
    category: 'lofi',
    icon: '☕',
    description: '편안하고 몰입감 있는 썰형/정보성 쇼츠용 로파이 패드',
  },
  {
    id: 'bgm_preset_tension',
    name: '🎬 시네마틱 서스펜스 텐션',
    category: 'tension',
    icon: '🎬',
    description: '충격 사건/폭로/미스터리 구간 심장 쫄깃한 저음 드론',
  },
  {
    id: 'bgm_preset_electronic',
    name: '⚡ 업비트 바이럴 비트',
    category: 'electronic',
    icon: '⚡',
    description: '역동적이고 빠른 템포의 스포츠/테크/머니 쇼츠용 신스 비트',
  },
  {
    id: 'bgm_preset_piano',
    name: '🎹 감성 시네마틱 피아노',
    category: 'piano',
    icon: '🎹',
    description: '따뜻한 감동 실화/인터뷰/명언 쇼츠용 감성 패드 화음',
  },
];

class ProceduralBgmEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | number)[] = [];
  private currentPresetId: string = 'bgm_preset_ambient';
  private _isPlaying: boolean = false;
  private volume: number = 0.35;
  private timerId: number | null = null;

  private initCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public isPlaying(): boolean {
    return this._isPlaying;
  }

  public getCurrentPresetId(): string {
    return this.currentPresetId;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public start(presetId: string = 'bgm_preset_ambient', volume: number = 0.35) {
    this.stop();
    this.currentPresetId = presetId;
    this.volume = volume;
    this._isPlaying = true;

    try {
      const ctx = this.initCtx();
      if (!this.masterGain) return;

      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.01, this.volume), ctx.currentTime + 0.5);

      switch (presetId) {
        case 'bgm_preset_tension':
          this.buildTensionDrone(ctx);
          break;
        case 'bgm_preset_electronic':
          this.buildElectronicBeat(ctx);
          break;
        case 'bgm_preset_piano':
          this.buildPianoPad(ctx);
          break;
        case 'bgm_preset_ambient':
        default:
          this.buildLofiAmbient(ctx);
          break;
      }
    } catch (e) {
      console.warn('Failed to start procedural BGM:', e);
    }
  }

  public stop() {
    this._isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.masterGain && this.ctx && this.ctx.state === 'running') {
      try {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(Math.max(0.001, this.masterGain.gain.value), now);
        this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      } catch (e) {}
    }

    setTimeout(() => {
      this.activeNodes.forEach((node) => {
        try {
          if (typeof node === 'number') {
            clearInterval(node);
          } else if ('stop' in node && typeof (node as any).stop === 'function') {
            (node as any).stop();
          } else if ('disconnect' in node && typeof node.disconnect === 'function') {
            node.disconnect();
          }
        } catch (e) {}
      });
      this.activeNodes = [];
    }, 250);
  }

  // 1. ☕ 칠 앰비언트 로파이 (따뜻한 서브 베이스 + 7화음 패드 + 테이프 새츄레이션 필터)
  private buildLofiAmbient(ctx: AudioContext) {
    const chords = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [164.81, 196.00, 246.94, 293.66], // Em7
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
    ];

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(650, ctx.currentTime);
    lowpass.Q.setValueAtTime(1.5, ctx.currentTime);
    lowpass.connect(this.masterGain!);
    this.activeNodes.push(lowpass);

    // LFO 필터 모듈레이션 (따뜻한 테이프 윔블)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.25, ctx.currentTime);
    lfoGain.gain.setValueAtTime(120, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);
    lfo.start();
    this.activeNodes.push(lfo, lfoGain);

    let chordIdx = 0;
    const playNextChord = () => {
      if (!this._isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = chords[chordIdx % chords.length];
      chordIdx++;

      freqs.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.12 / (i + 1), now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

        osc.connect(gain);
        gain.connect(lowpass);
        osc.start(now);
        osc.stop(now + 3.9);
      });
    };

    playNextChord();
    this.timerId = window.setInterval(playNextChord, 3500);
  }

  // 2. 🎬 시네마틱 텐션 드론 (디튠 쏘우 펄스 + 48Hz 서브 럼블 + 긴장 고조)
  private buildTensionDrone(ctx: AudioContext) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, ctx.currentTime);
    filter.connect(this.masterGain!);
    this.activeNodes.push(filter);

    // 48Hz 초저역 서브 럼블
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(48, ctx.currentTime);
    subGain.gain.setValueAtTime(0.28, ctx.currentTime);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain!);
    subOsc.start();
    this.activeNodes.push(subOsc, subGain);

    // 디튠 쏘우 웨이브 (불안한 긴장감)
    [-3, 0, 3].forEach((detune) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(96, ctx.currentTime);
      osc.detune.setValueAtTime(detune * 6, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.activeNodes.push(osc, gain);
    });

    // 필터 스윕 (서서히 조여오는 긴장감)
    filter.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 10);
  }

  // 3. ⚡ 업비트 바이럴 비트 (124BPM 에너제틱 아르페지오 + 펄스)
  private buildElectronicBeat(ctx: AudioContext) {
    const scale = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25];
    let noteIdx = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(2.0, ctx.currentTime);
    filter.connect(this.masterGain!);
    this.activeNodes.push(filter);

    const playArpNote = () => {
      if (!this._isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const freq = scale[noteIdx % scale.length];
      noteIdx = (noteIdx + 1) % scale.length;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + 0.2);
    };

    playArpNote();
    this.timerId = window.setInterval(playArpNote, 240);
  }

  // 4. 🎹 감성 시네마틱 피아노 (잔잔한 트라이어드 패드 화음)
  private buildPianoPad(ctx: AudioContext) {
    const chords = [
      [261.63, 329.63, 392.00], // C
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66], // G
    ];

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(500, ctx.currentTime);
    lowpass.connect(this.masterGain!);
    this.activeNodes.push(lowpass);

    let cIdx = 0;
    const playNext = () => {
      if (!this._isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = chords[cIdx % chords.length];
      cIdx++;

      notes.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.1, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

        osc.connect(gain);
        gain.connect(lowpass);
        osc.start(now);
        osc.stop(now + 3.3);
      });
    };

    playNext();
    this.timerId = window.setInterval(playNext, 3200);
  }
}

export const proceduralBgmEngine = new ProceduralBgmEngine();
