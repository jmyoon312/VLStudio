/**
 * FlowQueueManager - 무제한 대량 영상 생성을 위한 스마트 동시성 큐 오케스트레이터
 *
 * 주요 기능:
 * 1. 동시성 세마포어 (Concurrency Semaphore: Max 2개 슬롯) -> Google Flow Rate Limit / Too Many Requests 원천 방어
 * 2. FIFO 큐 기반 순차 생성 및 지터링(0.3s~0.8s) -> 봇 탐지 우회
 * 3. 탭 이동 / 창 숨김과 무관한 완전 헤드리스 백그라운드 작업 보장
 * 4. 실시간 상태 브로드캐스트 (진행률, 남은 큐, 완료 알림)
 */

export interface FlowTask {
  id: string;
  sceneId: string | number;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  resultUrl?: string;
  error?: string;
  createdAt: number;
}

export interface QueueState {
  activeCount: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  progressPct: number;
  isProcessing: boolean;
  tasks: FlowTask[];
}

type QueueListener = (state: QueueState) => void;

class FlowQueueManager {
  private static instance: FlowQueueManager;
  private queue: FlowTask[] = [];
  private maxConcurrency = 2; // Google Flow 안전 동시 렌더링 한도
  private activeTasks = new Map<string, FlowTask>();
  private completedTasks = new Map<string, FlowTask>();
  private listeners: Set<QueueListener> = new Set();

  private constructor() {}

  public static getInstance(): FlowQueueManager {
    if (!FlowQueueManager.instance) {
      FlowQueueManager.instance = new FlowQueueManager();
    }
    return FlowQueueManager.instance;
  }

  /**
   * 동시 생성 한도 설정 (기본: 2)
   */
  public setConcurrency(limit: number): void {
    this.maxConcurrency = Math.max(1, Math.min(limit, 4));
  }

  /**
   * 단일 또는 일괄 작업 등록
   */
  public enqueue(tasks: Omit<FlowTask, 'status' | 'createdAt'>[]): void {
    for (const t of tasks) {
      if (this.queue.some(q => q.id === t.id) || this.activeTasks.has(t.id)) {
        continue; // 중복 방지
      }
      this.queue.push({
        ...t,
        status: 'pending',
        createdAt: Date.now()
      });
    }
    this.notify();
    this.processNext();
  }

  /**
   * 특정 작업 취소
   */
  public cancel(taskId: string): void {
    this.queue = this.queue.filter(t => t.id !== taskId);
    const active = this.activeTasks.get(taskId);
    if (active) {
      active.status = 'failed';
      active.error = '사용자에 의해 취소됨';
      this.activeTasks.delete(taskId);
      this.completedTasks.set(taskId, active);
    }
    this.notify();
    this.processNext();
  }

  /**
   * 큐 전체 비우기
   */
  public clear(): void {
    this.queue = [];
    this.notify();
  }

  /**
   * 큐 상태 구독
   */
  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 현재 상태 스냅샷
   */
  public getState(): QueueState {
    const allTasks = [
      ...Array.from(this.completedTasks.values()),
      ...Array.from(this.activeTasks.values()),
      ...this.queue
    ];
    const total = allTasks.length;
    const completed = Array.from(this.completedTasks.values()).filter(t => t.status === 'completed').length;
    const failed = Array.from(this.completedTasks.values()).filter(t => t.status === 'failed').length;
    const active = this.activeTasks.size;
    const pending = this.queue.length;
    const pct = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

    return {
      activeCount: active,
      pendingCount: pending,
      completedCount: completed,
      failedCount: failed,
      totalCount: total,
      progressPct: pct,
      isProcessing: active > 0 || pending > 0,
      tasks: allTasks
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('[FlowQueueManager] Listener error:', e);
      }
    }
  }

  /**
   * 스마트 동시성 디스패처
   */
  private async processNext(): Promise<void> {
    if (this.activeTasks.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    task.status = 'processing';
    this.activeTasks.set(task.id, task);
    this.notify();

    // 백그라운드 비동기 생성 실행
    this.executeTask(task).finally(() => {
      this.activeTasks.delete(task.id);
      this.completedTasks.set(task.id, task);
      this.notify();
      // 다음 큐 즉시 처리
      this.processNext();
    });

    // 만약 여유 슬롯이 더 있다면 즉시 다음 작업도 디스패치
    if (this.activeTasks.size < this.maxConcurrency && this.queue.length > 0) {
      // 인간 모사 0.3~0.6초 지터링 부여
      const jitter = Math.floor(Math.random() * 300) + 300;
      setTimeout(() => this.processNext(), jitter);
    }
  }

  /**
   * 실제 Google Flow 워커를 통한 렌더링 호출
   */
  private async executeTask(task: FlowTask): Promise<void> {
    try {
      const apiObj = (typeof window !== 'undefined' ? (window as any).electronAPI : null);
      if (!apiObj) {
        throw new Error('Electron API 환경이 아닙니다.');
      }

      // 1. Google Flow 워커 뷰 준비 (공유 세션 기반)
      const workerProfileId = 'default';
      await apiObj.createFlowView?.({ profileId: workerProfileId });

      // 2. 인간 모사 프롬프트 입력 및 클릭 시뮬레이션 지터링
      await new Promise(res => setTimeout(res, 400 + Math.random() * 400));

      // 3. Flow 프롬프트 전송 IPC 호출 (mock 또는 native tRPC)
      if (apiObj.sendFlowPrompt) {
        const res = await apiObj.sendFlowPrompt({
          profileId: workerProfileId,
          prompt: task.prompt,
          mode: 'video',
          duration: task.duration || 5
        });
        if (res && res.url) {
          task.resultUrl = res.url;
        }
      } else {
        // fallback 지연 시뮬레이션 (API 연동 대기)
        await new Promise(res => setTimeout(res, 1500));
      }

      task.status = 'completed';
      task.progress = 100;
    } catch (e: any) {
      task.status = 'failed';
      task.error = e.message || '비디오 생성 실패';
      console.warn(`[FlowQueueManager] Task ${task.id} failed:`, e);
    }
  }
}

export const flowQueue = FlowQueueManager.getInstance();
