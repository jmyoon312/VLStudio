/**
 * Google Gemini 3.8 Live Bi-Directional Multimodal Streaming Service.
 * Connects directly to backend WebSocket (/api/agent/live-session) -> Google Gemini 3.8 Live.
 * 
 * Supports:
 * - Real-time 16kHz PCM Microphone audio streaming
 * - Real-time 24kHz PCM Spoken audio playback (Gapless queue)
 * - Real-time Screen / Canvas Frame streaming (JPEG) for live visual coaching
 * - Instant Barge-in / Interruption handling
 */

export interface GeminiLiveCallbacks {
    onReady?: (model: string) => void;
    onUserTranscript?: (text: string, finished: boolean) => void;
    onTranscript?: (text: string) => void;
    onTalkingChange?: (isTalking: boolean) => void;
    onToolCalling?: (toolName: string, args: any, step: any) => void;
    onToolResult?: (toolName: string, result: any, step: any) => void;
    onTurnComplete?: (userText: string, assistantText: string) => void;
    onInterrupted?: () => void;
    onError?: (err: string) => void;
    onClose?: () => void;
}

export class GeminiLiveService {
    private ws: WebSocket | null = null;
    // Unified AudioContext for both Mic input and AI playback (Essential for Mobile/iOS/Android)
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;

    // Audio Playback Queue with Dynamics Compressor (shares this.audioContext)
    private compressorNode: DynamicsCompressorNode | null = null;
    private gainNode: GainNode | null = null;
    private nextPlaybackTime: number = 0;
    private isPlayingAudio: boolean = false;
    private activeAudioNodes: AudioBufferSourceNode[] = [];

    // Screen Stream Interval
    private screenIntervalId: any = null;

    private callbacks: GeminiLiveCallbacks = {};
    private isConnected: boolean = false;

    constructor(callbacks: GeminiLiveCallbacks) {
        this.callbacks = callbacks;
    }

    public async connect(threadId?: string): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                const queryParam = threadId ? `?thread_id=${encodeURIComponent(threadId)}` : '';
                const wsUrl = `${protocol}//${host}/api/agent/live-session${queryParam}`;

                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('🎙️ [GeminiLiveService] WebSocket connected to backend proxy (thread:', threadId, ')');
                    this.isConnected = true;
                };

                this.ws.onmessage = async (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'ready') {
                            this.callbacks.onReady?.(data.model || 'gemini-3.8-live');
                            resolve(true);
                        } else if (data.type === 'user_transcript') {
                            this.callbacks.onUserTranscript?.(data.text, !!data.finished);
                        } else if (data.type === 'transcript') {
                            this.callbacks.onTranscript?.(data.text);
                        } else if (data.type === 'audio_chunk') {
                            await this.enqueuePcmChunk(data.pcm);
                        } else if (data.type === 'tool_calling') {
                            this.callbacks.onToolCalling?.(data.tool_name, data.args, data.step);
                        } else if (data.type === 'tool_result') {
                            this.callbacks.onToolResult?.(data.tool_name, data.result, data.step);
                        } else if (data.type === 'turn_complete') {
                            // Ensure audio context remains active for the next turn
                            if (this.audioContext && this.audioContext.state === 'suspended') {
                                this.audioContext.resume().catch(() => {});
                            }
                            this.callbacks.onTurnComplete?.(data.user_text || '', data.assistant_text || '');
                        } else if (data.type === 'interrupted') {
                            this.clearPlaybackQueue();
                            this.callbacks.onInterrupted?.();
                        } else if (data.type === 'error') {
                            this.callbacks.onError?.(data.message);
                        }
                    } catch (e) {
                        console.warn('[GeminiLiveService] Message parse error:', e);
                    }
                };

                this.ws.onerror = (e) => {
                    console.error('[GeminiLiveService] WebSocket error:', e);
                    this.callbacks.onError?.('Gemini 3.8 Live 연결 실패');
                    resolve(false);
                };

                this.ws.onclose = () => {
                    console.log('[GeminiLiveService] WebSocket closed.');
                    this.cleanup();
                    this.callbacks.onClose?.();
                };
            } catch (err: any) {
                console.error('[GeminiLiveService] Connection error:', err);
                this.callbacks.onError?.(err.message || '연결 실패');
                resolve(false);
            }
        });
    }

    /**
     * Start capturing microphone audio and streaming 16kHz PCM to Gemini.
     * Uses a single unified AudioContext for both Mic and Playback to prevent
     * mobile OS (iOS Safari / Android Chrome) audio session suspension bugs.
     */
    public async startAudioCapture(): Promise<boolean> {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                }
            });

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!this.audioContext || this.audioContext.state === 'closed') {
                try {
                    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
                } catch {
                    this.audioContext = new AudioContextClass();
                }
            }

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Set up audioContext state watcher for auto-recovery on mobile
            this.audioContext.onstatechange = () => {
                if (this.audioContext?.state === 'suspended' && this.isConnected) {
                    this.audioContext.resume().catch(() => {});
                }
            };

            // Setup dynamics compressor & gain node for AI voice output on the SAME AudioContext
            this.compressorNode = this.audioContext.createDynamicsCompressor();
            this.compressorNode.threshold.setValueAtTime(-24, this.audioContext.currentTime);
            this.compressorNode.knee.setValueAtTime(30, this.audioContext.currentTime);
            this.compressorNode.ratio.setValueAtTime(12, this.audioContext.currentTime);
            this.compressorNode.attack.setValueAtTime(0.003, this.audioContext.currentTime);
            this.compressorNode.release.setValueAtTime(0.25, this.audioContext.currentTime);

            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.setValueAtTime(1.4, this.audioContext.currentTime);

            this.compressorNode.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            this.nextPlaybackTime = this.audioContext.currentTime;

            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            // 4096 buffer size gives ~256ms chunk
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

                // Auto-resume if mobile OS suspended the context
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume().catch(() => {});
                }

                const inputData = e.inputBuffer.getChannelData(0);
                const currentSampleRate = this.audioContext?.sampleRate || 16000;

                let pcm16: Int16Array;
                if (currentSampleRate === 16000) {
                    pcm16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]));
                        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                } else {
                    // Safe linear resample down to 16000 for Gemini Live if native sample rate is 44.1k or 48k
                    const ratio = currentSampleRate / 16000;
                    const targetLen = Math.floor(inputData.length / ratio);
                    pcm16 = new Int16Array(targetLen);
                    for (let i = 0; i < targetLen; i++) {
                        const srcIdx = Math.floor(i * ratio);
                        const s = Math.max(-1, Math.min(1, inputData[srcIdx]));
                        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                }

                // Base64 encode PCM binary
                const uint8 = new Uint8Array(pcm16.buffer);
                let binary = '';
                const len = uint8.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(uint8[i]);
                }
                const b64 = window.btoa(binary);

                this.ws.send(JSON.stringify({
                    type: 'audio_pcm',
                    pcm: b64,
                    sampleRate: 16000
                }));
            };

            // Mute microphone loopback to speakers
            const muteGain = this.audioContext.createGain();
            muteGain.gain.value = 0;
            this.sourceNode.connect(this.processor);
            this.processor.connect(muteGain);
            muteGain.connect(this.audioContext.destination);

            return true;
        } catch (err: any) {
            console.error('[GeminiLiveService] Failed to capture microphone:', err);
            this.callbacks.onError?.('마이크 접근 권한이 없거나 지원되지 않습니다.');
            return false;
        }
    }

    /**
     * Playback 24kHz PCM audio chunks streamed from Gemini Live with Dynamics Compression.
     * Decoded directly onto the unified AudioContext.
     */
    private async enqueuePcmChunk(b64Pcm: string) {
        try {
            if (!this.audioContext || this.audioContext.state === 'closed') return;

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const binaryStr = window.atob(b64Pcm);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }

            // Convert Int16 PCM to Float32 for Web Audio Buffer
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
            }

            // Web Audio automatically resamples 24kHz to this.audioContext.sampleRate
            const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
            audioBuffer.copyToChannel(float32, 0);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            if (this.compressorNode) {
                source.connect(this.compressorNode);
            } else {
                source.connect(this.audioContext.destination);
            }

            const currentTime = this.audioContext.currentTime;
            if (this.nextPlaybackTime < currentTime) {
                this.nextPlaybackTime = currentTime;
            }

            source.start(this.nextPlaybackTime);
            this.nextPlaybackTime += audioBuffer.duration;

            this.activeAudioNodes.push(source);
            this.callbacks.onTalkingChange?.(true);

            source.onended = () => {
                const idx = this.activeAudioNodes.indexOf(source);
                if (idx !== -1) {
                    this.activeAudioNodes.splice(idx, 1);
                }
                if (this.activeAudioNodes.length === 0) {
                    this.callbacks.onTalkingChange?.(false);
                }
            };
        } catch (e) {
            console.warn('[GeminiLiveService] Audio decode error:', e);
        }
    }

    /**
     * Instantly clear audio playback queue on barge-in / interruption.
     */
    public clearPlaybackQueue() {
        for (const node of this.activeAudioNodes) {
            try {
                node.stop();
                node.disconnect();
            } catch {}
        }
        this.activeAudioNodes = [];
        this.callbacks.onTalkingChange?.(false);
        if (this.audioContext) {
            this.nextPlaybackTime = this.audioContext.currentTime;
        }
    }

    /**
     * Send user text prompt to Gemini Live.
     */
    public sendText(text: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            type: 'text_prompt',
            text: text
        }));
    }

    /**
     * Capture and stream active Canvas or Screen frames (JPEG) every intervalMs.
     */
    public startScreenStreaming(canvasSelector: string = 'canvas', intervalMs: number = 2000) {
        this.stopScreenStreaming();
        this.screenIntervalId = setInterval(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

            try {
                const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement;
                if (canvas && canvas.width > 0 && canvas.height > 0) {
                    const jpegData = canvas.toDataURL('image/jpeg', 0.65);
                    this.ws.send(JSON.stringify({
                        type: 'screen_frame',
                        jpeg: jpegData
                    }));
                }
            } catch (e) {
                console.warn('[GeminiLiveService] Screen frame capture failed:', e);
            }
        }, intervalMs);
    }

    public stopScreenStreaming() {
        if (this.screenIntervalId) {
            clearInterval(this.screenIntervalId);
            this.screenIntervalId = null;
        }
    }

    public disconnect() {
        this.cleanup();
        if (this.ws) {
            try { this.ws.close(); } catch {}
            this.ws = null;
        }
        this.isConnected = false;
    }

    private cleanup() {
        this.stopScreenStreaming();
        this.clearPlaybackQueue();

        if (this.processor) {
            try { this.processor.disconnect(); } catch {}
            this.processor = null;
        }
        if (this.sourceNode) {
            try { this.sourceNode.disconnect(); } catch {}
            this.sourceNode = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }
        if (this.audioContext) {
            try { this.audioContext.close(); } catch {}
            this.audioContext = null;
        }
    }
}
