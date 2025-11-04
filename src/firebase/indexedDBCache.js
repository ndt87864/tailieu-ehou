/**
 * IndexedDB Cache Service - Tối ưu cache cho dữ liệu lớn
 * Tốc độ: read ~5-20ms, write ~10-50ms
 * Dung lượng: không giới hạn (lên đến GB)
 */

const DB_NAME = 'QuestionManagementCache';
const DB_VERSION = 2;
const STORES = {
  QUESTIONS: 'questions',
  CATEGORIES: 'categories',
  DOCUMENTS: 'documents',
  METADATA: 'metadata'
};

class IndexedDBCache {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  /**
   * Khởi tạo database
   */
  async init() {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Tạo object stores nếu chưa có
        if (!db.objectStoreNames.contains(STORES.QUESTIONS)) {
          const questionsStore = db.createObjectStore(STORES.QUESTIONS, { keyPath: 'documentId' });
          questionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          const categoriesStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'key' });
          categoriesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          const documentsStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'categoryId' });
          documentsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Lấy dữ liệu từ cache
   * @param {string} storeName - Tên store
   * @param {string} key - Key để lấy
   * @param {number} maxAge - Tuổi tối đa của cache (ms), mặc định 15 phút
   */
  async get(storeName, key, maxAge = 15 * 60 * 1000) {
    try {
      await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Kiểm tra tuổi của cache
          const age = Date.now() - result.timestamp;
          if (age > maxAge) {
            // Cache đã hết hạn, xóa và trả về null
            this.delete(storeName, key);
            resolve(null);
            return;
          }

          resolve(result.data);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }

  /**
   * Lưu dữ liệu vào cache
   */
  async set(storeName, key, data) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const record = {
          [storeName === STORES.QUESTIONS ? 'documentId' : 
           storeName === STORES.DOCUMENTS ? 'categoryId' : 'key']: key,
          data: data,
          timestamp: Date.now()
        };

        const request = store.put(record);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB set error:', error);
      return false;
    }
  }

  /**
   * Xóa một key khỏi cache
   */
  async delete(storeName, key) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB delete error:', error);
      return false;
    }
  }

  /**
   * Xóa toàn bộ cache trong một store
   */
  async clearStore(storeName) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      return false;
    }
  }

  /**
   * Xóa tất cả cache
   */
  async clearAll() {
    try {
      await Promise.all([
        this.clearStore(STORES.QUESTIONS),
        this.clearStore(STORES.CATEGORIES),
        this.clearStore(STORES.DOCUMENTS),
        this.clearStore(STORES.METADATA)
      ]);
      return true;
    } catch (error) {
      console.error('IndexedDB clearAll error:', error);
      return false;
    }
  }

  /**
   * Kiểm tra xem cache có tồn tại và còn hạn không
   */
  async has(storeName, key, maxAge = 15 * 60 * 1000) {
    const data = await this.get(storeName, key, maxAge);
    return data !== null;
  }

  /**
   * Lấy nhiều keys cùng lúc
   */
  async getMultiple(storeName, keys, maxAge = 15 * 60 * 1000) {
    const results = await Promise.all(
      keys.map(key => this.get(storeName, key, maxAge))
    );
    
    return results.reduce((acc, data, index) => {
      acc[keys[index]] = data;
      return acc;
    }, {});
  }
}

// Export singleton instance
export const cacheDB = new IndexedDBCache();

// Export constants
export { STORES };
