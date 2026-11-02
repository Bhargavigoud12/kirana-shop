import { Product, Category, StockLedgerEntry, AppSettings, StockMovementType } from '../types/inventory';
import { localDB } from './db';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, getInitialDemoCatalog } from './seedData';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export class InventoryService {
  /**
   * Initializes database and seeds initial demo data if empty
   */
  async initDatabase(): Promise<{ isFirstTime: boolean }> {
    const existingSettings = await localDB.getById<AppSettings>('settings', 'app_settings');
    const existingProducts = await localDB.getAll<Product>('products');

    if (!existingSettings || existingProducts.length === 0) {
      // Seed categories
      for (const cat of DEFAULT_CATEGORIES) {
        await localDB.put<Category>('categories', cat);
      }

      // Seed default settings
      await localDB.put<AppSettings>('settings', DEFAULT_SETTINGS);

      // Seed catalog with initial opening stock ledger entries
      const { products, ledgerEntries } = getInitialDemoCatalog();

      for (const prod of products) {
        await localDB.put<Product>('products', prod);
      }

      for (const entry of ledgerEntries) {
        await localDB.put<StockLedgerEntry>('stock_ledger', entry);
      }

      return { isFirstTime: true };
    }

    return { isFirstTime: false };
  }

  async getProducts(): Promise<Product[]> {
    return localDB.getAll<Product>('products');
  }

  async getCategories(): Promise<Category[]> {
    return localDB.getAll<Category>('categories');
  }

  async getLedgerEntries(): Promise<StockLedgerEntry[]> {
    const entries = await localDB.getAll<StockLedgerEntry>('stock_ledger');
    // Sort descending by created_at (newest first)
    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getSettings(): Promise<AppSettings> {
    const settings = await localDB.getById<AppSettings>('settings', 'app_settings');
    return settings || DEFAULT_SETTINGS;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated: AppSettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await localDB.put<AppSettings>('settings', updated);
    return updated;
  }

  /**
   * ATOMIC INVARIANT 1:
   * Create Product + Opening Stock Ledger Entry.
   * If openingStock > 0, an OPENING_STOCK entry is committed in the same transaction.
   */
  async createProductWithOpeningStock(
    productData: Omit<Product, 'product_id' | 'current_stock' | 'created_at' | 'updated_at' | 'synced'>,
    openingStock: number = 0,
    userId: string = 'owner_kirana',
    deviceId: string = 'pos_main'
  ): Promise<{ product: Product; ledgerEntry: StockLedgerEntry | null }> {
    const productId = generateUUID();
    const now = new Date().toISOString();
    const safeStock = Math.max(0, Number(openingStock) || 0);

    const newProduct: Product = {
      ...productData,
      product_id: productId,
      current_stock: safeStock,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    let createdLedgerEntry: StockLedgerEntry | null = null;

    if (safeStock > 0) {
      createdLedgerEntry = {
        entry_id: generateUUID(),
        product_id: productId,
        product_name: newProduct.name,
        movement_type: 'OPENING_STOCK',
        quantity_change: safeStock,
        previous_stock: 0,
        new_stock: safeStock,
        reason: 'Initial opening stock registered during product creation',
        bill_id: null,
        supplier_id: null,
        user_id: userId,
        device_id: deviceId,
        created_at: now,
        synced: false,
      };
    }

    // Atomic execution across 'products' and 'stock_ledger'
    await localDB.executeTransaction(['products', 'stock_ledger'], 'readwrite', async (tx) => {
      const prodStore = tx.objectStore('products');
      prodStore.put(newProduct);

      if (createdLedgerEntry) {
        const ledgerStore = tx.objectStore('stock_ledger');
        ledgerStore.put(createdLedgerEntry);
      }
    });

    return { product: newProduct, ledgerEntry: createdLedgerEntry };
  }

  /**
   * ATOMIC INVARIANT 2:
   * Purchase stock arrival.
   * Increments current_stock and writes a PURCHASE stock_ledger entry.
   */
  async addPurchaseStock(
    productId: string,
    quantity: number,
    params?: {
      purchasePrice?: number;
      supplierId?: string;
      newExpiryDate?: string | null;
      reason?: string;
      userId?: string;
      deviceId?: string;
    }
  ): Promise<{ product: Product; ledgerEntry: StockLedgerEntry }> {
    if (quantity <= 0) {
      throw new Error('Purchase quantity must be greater than zero');
    }

    const now = new Date().toISOString();
    let updatedProduct: Product;
    let ledgerEntry: StockLedgerEntry;

    await localDB.executeTransaction(['products', 'stock_ledger'], 'readwrite', async (tx) => {
      const prodStore = tx.objectStore('products');
      const ledgerStore = tx.objectStore('stock_ledger');

      const req = prodStore.get(productId);
      const product = await new Promise<Product>((res, rej) => {
        req.onsuccess = () => {
          if (!req.result) rej(new Error(`Product ${productId} not found`));
          else res(req.result as Product);
        };
        req.onerror = () => rej(req.error);
      });

      const prevStock = product.current_stock;
      const newStock = Math.round((prevStock + quantity) * 1000) / 1000;

      updatedProduct = {
        ...product,
        current_stock: newStock,
        purchase_price: params?.purchasePrice ?? product.purchase_price,
        expiry_date: params?.newExpiryDate !== undefined ? params.newExpiryDate : product.expiry_date,
        updated_at: now,
        synced: false,
      };

      ledgerEntry = {
        entry_id: generateUUID(),
        product_id: productId,
        product_name: product.name,
        movement_type: 'PURCHASE',
        quantity_change: quantity,
        previous_stock: prevStock,
        new_stock: newStock,
        reason: params?.reason?.trim() || 'New stock purchase arrival',
        bill_id: null,
        supplier_id: params?.supplierId || null,
        user_id: params?.userId || 'owner_kirana',
        device_id: params?.deviceId || 'pos_main',
        created_at: now,
        synced: false,
      };

      prodStore.put(updatedProduct);
      ledgerStore.put(ledgerEntry);
    });

    return { product: updatedProduct!, ledgerEntry: ledgerEntry! };
  }

  /**
   * ATOMIC INVARIANT 3:
   * Stock loss due to DAMAGE or EXPIRY.
   * Decrements stock and writes a DAMAGE/EXPIRY stock_ledger entry.
   */
  async recordStockLoss(
    productId: string,
    quantity: number,
    movementType: 'DAMAGE' | 'EXPIRY',
    reason: string,
    userId: string = 'owner_kirana',
    deviceId: string = 'pos_main'
  ): Promise<{ product: Product; ledgerEntry: StockLedgerEntry }> {
    if (quantity <= 0) {
      throw new Error('Quantity removed must be greater than zero');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('A mandatory reason is required to remove damaged or expired stock');
    }

    const now = new Date().toISOString();
    let updatedProduct: Product;
    let ledgerEntry: StockLedgerEntry;

    await localDB.executeTransaction(['products', 'stock_ledger'], 'readwrite', async (tx) => {
      const prodStore = tx.objectStore('products');
      const ledgerStore = tx.objectStore('stock_ledger');

      const req = prodStore.get(productId);
      const product = await new Promise<Product>((res, rej) => {
        req.onsuccess = () => {
          if (!req.result) rej(new Error(`Product ${productId} not found`));
          else res(req.result as Product);
        };
        req.onerror = () => rej(req.error);
      });

      const prevStock = product.current_stock;
      const newStock = Math.max(0, Math.round((prevStock - quantity) * 1000) / 1000);

      updatedProduct = {
        ...product,
        current_stock: newStock,
        updated_at: now,
        synced: false,
      };

      ledgerEntry = {
        entry_id: generateUUID(),
        product_id: productId,
        product_name: product.name,
        movement_type: movementType,
        quantity_change: -quantity,
        previous_stock: prevStock,
        new_stock: newStock,
        reason: reason.trim(),
        bill_id: null,
        supplier_id: null,
        user_id: userId,
        device_id: deviceId,
        created_at: now,
        synced: false,
      };

      prodStore.put(updatedProduct);
      ledgerStore.put(ledgerEntry);
    });

    return { product: updatedProduct!, ledgerEntry: ledgerEntry! };
  }

  /**
   * ATOMIC INVARIANT 4:
   * Manual Stock Correction (Physical Count Audit).
   * Calculates difference (physical - current), sets new stock, writes MANUAL_FIX ledger entry.
   */
  async correctStockWithReason(
    productId: string,
    physicalCount: number,
    reason: string,
    userId: string = 'owner_kirana',
    deviceId: string = 'pos_main'
  ): Promise<{ product: Product; ledgerEntry: StockLedgerEntry }> {
    if (physicalCount < 0) {
      throw new Error('Physical stock count cannot be negative');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('A mandatory explanation/reason is required for manual stock correction');
    }

    const now = new Date().toISOString();
    let updatedProduct: Product;
    let ledgerEntry: StockLedgerEntry;

    await localDB.executeTransaction(['products', 'stock_ledger'], 'readwrite', async (tx) => {
      const prodStore = tx.objectStore('products');
      const ledgerStore = tx.objectStore('stock_ledger');

      const req = prodStore.get(productId);
      const product = await new Promise<Product>((res, rej) => {
        req.onsuccess = () => {
          if (!req.result) rej(new Error(`Product ${productId} not found`));
          else res(req.result as Product);
        };
        req.onerror = () => rej(req.error);
      });

      const prevStock = product.current_stock;
      const roundedPhysical = Math.round(physicalCount * 1000) / 1000;
      const difference = Math.round((roundedPhysical - prevStock) * 1000) / 1000;

      updatedProduct = {
        ...product,
        current_stock: roundedPhysical,
        updated_at: now,
        synced: false,
      };

      ledgerEntry = {
        entry_id: generateUUID(),
        product_id: productId,
        product_name: product.name,
        movement_type: 'MANUAL_FIX',
        quantity_change: difference,
        previous_stock: prevStock,
        new_stock: roundedPhysical,
        reason: reason.trim(),
        bill_id: null,
        supplier_id: null,
        user_id: userId,
        device_id: deviceId,
        created_at: now,
        synced: false,
      };

      prodStore.put(updatedProduct);
      ledgerStore.put(ledgerEntry);
    });

    return { product: updatedProduct!, ledgerEntry: ledgerEntry! };
  }

  /**
   * Updates product metadata (name, aliases, prices, category, threshold, barcode)
   * Does NOT alter current_stock directly.
   */
  async updateProductDetails(
    productId: string,
    updates: Partial<Omit<Product, 'product_id' | 'current_stock' | 'created_at'>>
  ): Promise<Product> {
    const product = await localDB.getById<Product>('products', productId);
    if (!product) throw new Error(`Product ${productId} not found`);

    const updated: Product = {
      ...product,
      ...updates,
      updated_at: new Date().toISOString(),
      synced: false,
    };

    await localDB.put<Product>('products', updated);
    return updated;
  }

  /**
   * Soft-delete / archive or restore a product
   */
  async setProductArchived(productId: string, isArchived: boolean): Promise<Product> {
    return this.updateProductDetails(productId, { is_active: !isArchived });
  }

  /**
   * Resets database back to fresh Indian kirana demo data
   */
  async resetToDemoData(): Promise<void> {
    await localDB.clear('products');
    await localDB.clear('stock_ledger');
    await localDB.clear('categories');
    await localDB.clear('settings');

    for (const cat of DEFAULT_CATEGORIES) {
      await localDB.put<Category>('categories', cat);
    }
    await localDB.put<AppSettings>('settings', DEFAULT_SETTINGS);

    const { products, ledgerEntries } = getInitialDemoCatalog();
    for (const prod of products) {
      await localDB.put<Product>('products', prod);
    }
    for (const entry of ledgerEntries) {
      await localDB.put<StockLedgerEntry>('stock_ledger', entry);
    }
  }
}

export const inventoryService = new InventoryService();
