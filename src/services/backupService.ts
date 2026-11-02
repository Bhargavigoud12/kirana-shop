import { localDB, StoreName } from './db';

export interface DatabaseBackupPayload {
  version: number;
  timestamp: string;
  app: string;
  data: {
    products: any[];
    categories: any[];
    stock_ledger: any[];
    settings: any[];
    bills: any[];
    bill_items: any[];
    customers: any[];
    suppliers: any[];
  };
}

export class BackupService {
  /**
   * Export entire IndexedDB database into a downloadable JSON backup
   */
  async exportBackup(): Promise<void> {
    const [products, categories, stock_ledger, settings, bills, bill_items, customers, suppliers] =
      await Promise.all([
        localDB.getAll('products'),
        localDB.getAll('categories'),
        localDB.getAll('stock_ledger'),
        localDB.getAll('settings'),
        localDB.getAll('bills'),
        localDB.getAll('bill_items'),
        localDB.getAll('customers'),
        localDB.getAll('suppliers'),
      ]);

    const payload: DatabaseBackupPayload = {
      version: 1,
      timestamp: new Date().toISOString(),
      app: 'Munshi Kirana POS',
      data: {
        products,
        categories,
        stock_ledger,
        settings,
        bills,
        bill_items,
        customers,
        suppliers,
      },
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `munshi_kirana_backup_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import previously exported JSON backup into IndexedDB
   */
  async importBackup(jsonString: string): Promise<{ success: boolean; recordCount: number }> {
    let parsed: DatabaseBackupPayload;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      throw new Error('Invalid JSON backup file. Please select a valid Munshi backup file.');
    }

    if (!parsed.data || !Array.isArray(parsed.data.products) || !Array.isArray(parsed.data.stock_ledger)) {
      throw new Error('Incompatible backup format. Missing products or stock ledger data.');
    }

    // Clear and restore stores
    const storesToRestore: StoreName[] = [
      'products',
      'categories',
      'stock_ledger',
      'settings',
      'bills',
      'bill_items',
      'customers',
      'suppliers',
    ];

    for (const store of storesToRestore) {
      await localDB.clear(store);
      const items = (parsed.data as any)[store];
      if (Array.isArray(items)) {
        for (const item of items) {
          await localDB.put(store, item);
        }
      }
    }

    const totalRecords =
      parsed.data.products.length +
      parsed.data.stock_ledger.length +
      (parsed.data.bills?.length || 0) +
      (parsed.data.customers?.length || 0);

    return { success: true, recordCount: totalRecords };
  }

  /**
   * Get approximate browser storage usage
   */
  async getStorageEstimate(): Promise<{ usageMB: string; quotaMB: string }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usageMB = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
        return { usageMB, quotaMB };
      } catch (e) {
        // Fallback
      }
    }
    return { usageMB: '< 1.5', quotaMB: 'Unlimited Local' };
  }
}

export const backupService = new BackupService();
