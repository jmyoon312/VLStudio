/**
 * safeStorage.ts - ViraLoop Studio Resilient Large Payload Storage
 *
 * LocalStorage 5MB 쿼터 초과(QuotaExceededError) 방지 및
 * 3만~10만 자 대용량 대본 및 씬 데이터 영속성 지원을 위한 하이브리드 스토리지.
 * 작은 데이터: LocalStorage + Memory Cache
 * 대용량 데이터 (>40KB 또는 QuotaExceededError 발생 시): IndexedDB 자동 폴백 저장
 */

const IDB_NAME = 'VLStudioStorage';
const IDB_STORE = 'keyval';
const IDB_VERSION = 1;

// In-Memory Synchronous Cache for instant synchronous reads
const memCache = new Map<string, string>();

let idbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (!idbPromise) {
    idbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return idbPromise;
}

async function setIDB(key: string, value: string): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[safeStorage] IndexedDB set error:', err);
  }
}

async function getIDBVal(key: string): Promise<string | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[safeStorage] IndexedDB get error:', err);
    return null;
  }
}

async function removeIDB(key: string): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {}
}

export const safeStorage = {
  /**
   * 동기식 get: 메모리 캐시 확인 후 LocalStorage 확인
   */
  getItem(key: string): string | null {
    if (memCache.has(key)) {
      return memCache.get(key) || null;
    }
    try {
      const val = localStorage.getItem(key);
      if (val) {
        if (val.startsWith('{"__stored_in_idb":true')) {
          // IDB 비동기 복원 진행
          this.getItemAsync(key).then((idbVal) => {
            if (idbVal) memCache.set(key, idbVal);
          });
          return memCache.get(key) || null;
        }
        memCache.set(key, val);
        return val;
      }
    } catch (e) {}
    return null;
  },

  /**
   * 비동기식 get: IndexedDB까지 완벽 조회하여 5만 자 이상 복원
   */
  async getItemAsync(key: string): Promise<string | null> {
    if (memCache.has(key)) {
      return memCache.get(key) || null;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw && !raw.startsWith('{"__stored_in_idb":true')) {
        memCache.set(key, raw);
        return raw;
      }
    } catch (e) {}

    // IndexedDB 조회
    const idbVal = await getIDBVal(key);
    if (idbVal) {
      memCache.set(key, idbVal);
      return idbVal;
    }
    return null;
  },

  /**
   * 안전한 set: QuotaExceededError 예외 시 자동으로 IndexedDB로 폴백
   * 40,000자 이상은 처음부터 IndexedDB에 보관하여 LocalStorage 5MB 한도 보호
   */
  setItem(key: string, value: string): void {
    if (value === undefined || value === null) {
      this.removeItem(key);
      return;
    }

    memCache.set(key, value);

    // 40KB 이상이면 즉시 IndexedDB 비동기 저장 및 LocalStorage에는 포인터만 보관
    if (value.length > 40000) {
      setIDB(key, value);
      try {
        localStorage.setItem(key, JSON.stringify({ __stored_in_idb: true, key, length: value.length }));
      } catch (e) {
        // LocalStorage가 이미 꽉 찬 경우에도 에러를 던지지 않고 메모리+IDB로 안전 보호
      }
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (err: any) {
      console.warn(`[safeStorage] LocalStorage quota exceeded for key "${key}". Auto-fallback to IndexedDB.`);
      setIDB(key, value);
      try {
        localStorage.setItem(key, JSON.stringify({ __stored_in_idb: true, key, length: value.length }));
      } catch (e) {}
    }
  },

  removeItem(key: string): void {
    memCache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch (e) {}
    removeIDB(key);
  },

  clear(): void {
    memCache.clear();
    try {
      localStorage.clear();
    } catch (e) {}
  }
};
