/**
 * Browser-native IndexedDB engine for Munshi Kirana POS
 * Supports local offline persistence and atomic multi-store transactions.
 */

const DB_NAME = 'munshi_kirana_db';
const DB_VERSION = 1;

export type StoreName =
  | 'products'
  | 'categories'
  | 'stock_ledger'
  | 'settings'
  | 'bills'
  | 'bill_items'
  | 'customers'
  | 'suppliers'
  | 'sync_queue';

class MunshiDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported on this device/browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Products Store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'product_id' });
          productStore.createIndex('category_id', 'category_id', { unique: false });
          productStore.createIndex('barcode', 'barcode', { unique: false });
          productStore.createIndex('is_active', 'is_active', { unique: false });
        }

        // Categories Store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'category_id' });
        }

        // Stock Ledger Store (Immutable Audit Log)
        if (!db.objectStoreNames.contains('stock_ledger')) {
          const ledgerStore = db.createObjectStore('stock_ledger', { keyPath: 'entry_id' });
          ledgerStore.createIndex('product_id', 'product_id', { unique: false });
          ledgerStore.createIndex('movement_type', 'movement_type', { unique: false });
          ledgerStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // App Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Prepared stores for upcoming phases
        if (!db.objectStoreNames.contains('bills')) {
          db.createObjectStore('bills', { keyPath: 'bill_id' });
        }
        if (!db.objectStoreNames.contains('bill_items')) {
          db.createObjectStore('bill_items', { keyPath: 'bill_item_id' });
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'customer_id' });
        }
        if (!db.objectStoreNames.contains('suppliers')) {
          db.createObjectStore('suppliers', { keyPath: 'supplier_id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'queue_id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Generic get all items from an object store
   */
  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic get by primary key
   */
  async getById<T>(storeName: StoreName, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as T) || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Put/Insert single item
   */
  async put<T>(storeName: StoreName, item: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete single item by key
   */
  async delete(storeName: StoreName, key: IDBValidKey): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear an entire object store
   */
  async clear(storeName: StoreName): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute an atomic transaction across multiple stores.
   * If any error occurs or reject is called, all changes in the transaction are rolled back.
   */
  async executeTransaction<R>(
    storeNames: StoreName[],
    mode: IDBTransactionMode,
    callback: (tx: IDBTransaction) => Promise<R>
  ): Promise<R> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);

      let resultPromise: Promise<R>;
      try {
        resultPromise = callback(tx);
      } catch (err) {
        tx.abort();
        reject(err);
        return;
      }

      tx.oncomplete = async () => {
        try {
          const res = await resultPromise;
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };

      tx.onerror = () => {
        reject(tx.error);
      };

      tx.onabort = () => {
        reject(new Error('Transaction aborted'));
      };
    });
  }
}

export const localDB = new MunshiDatabase();
