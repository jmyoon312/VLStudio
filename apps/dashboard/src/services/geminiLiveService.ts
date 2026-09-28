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
    onTranscript?: (text: string) => void;
    onTalkingChange?: (isTalking: boolean) => void;
    onInterrupted?: () => void;
    onError?: (err: string) => void;
    onClose?: () => void;
}

export class GeminiLiveService {
    private ws: WebSocket | null = null;
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;

    // Audio Playback Queue
    private playbackContext: AudioContext | null = null;
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

    public async connect(): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                const wsUrl = `${protocol}//${host}/api/agent/live-session`;

                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('🎙️ [GeminiLiveService] WebSocket connected to backend proxy.');
                    this.isConnected = true;
                };

                this.ws.onmessage = async (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'ready') {
                            this.callbacks.onReady?.(data.model || 'gemini-3.8-live');
                            resolve(true);
                        } else if (data.type === 'transcript') {
                            this.callbacks.onTranscript?.(data.text);
                        } else if (data.type === 'audio_chunk') {
                            await this.enqueuePcmChunk(data.pcm);
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
     */
    public async startAudioCapture(): Promise<boolean> {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000
            });

            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            // 4096 buffer size at 16kHz gives ~256ms chunk
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32Array (-1.0 to 1.0) to Int16Array (PCM 16-bit)
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
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
                    pcm: b64
                }));
            };

            this.sourceNode.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            return true;
        } catch (err: any) {
            console.error('[GeminiLiveService] Failed to capture microphone:', err);
            this.callbacks.onError?.('마이크 접근 권한이 없거나 지원되지 않습니다.');
            return false;
        }
    }

    /**
     * Playback 24kHz PCM audio chunks streamed from Gemini Live.
     */
    private async enqueuePcmChunk(b64Pcm: string) {
        try {
            if (!this.playbackContext || this.playbackContext.state === 'closed') {
                this.playbackContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                    sampleRate: 24000
                });
                this.nextPlaybackTime = this.playbackContext.currentTime;
            }

            if (this.playbackContext.state === 'suspended') {
                await this.playbackContext.resume();
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

            const audioBuffer = this.playbackContext.createBuffer(1, float32.length, 24000);
            audioBuffer.copyToChannel(float32, 0);

            const source = this.playbackContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.playbackContext.destination);

            const currentTime = this.playbackContext.currentTime;
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
        if (this.playbackContext) {
            this.nextPlaybackTime = this.playbackContext.currentTime;
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
        if (this.playbackContext) {
            try { this.playbackContext.close(); } catch {}
            this.playbackContext = null;
        }
    }
}
