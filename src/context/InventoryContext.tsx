import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Category, StockLedgerEntry, AppSettings } from '../types/inventory';
import { inventoryService } from '../services/inventoryService';
import { DEFAULT_SETTINGS } from '../services/seedData';

interface InventoryContextValue {
  loading: boolean;
  products: Product[];
  categories: Category[];
  ledger: StockLedgerEntry[];
  settings: AppSettings;
  // Computed helpers
  activeProducts: Product[];
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  expiringProducts: Product[];
  expiredProducts: Product[];
  totalInventoryCostValue: number;
  totalInventoryRetailValue: number;
  totalSkus: number;
  // Actions
  refreshData: () => Promise<void>;
  createProduct: (
    data: Omit<Product, 'product_id' | 'current_stock' | 'created_at' | 'updated_at' | 'synced'>,
    openingStock: number
  ) => Promise<{ product: Product; ledgerEntry: StockLedgerEntry | null }>;
  updateProduct: (
    productId: string,
    updates: Partial<Omit<Product, 'product_id' | 'current_stock' | 'created_at'>>
  ) => Promise<Product>;
  archiveProduct: (productId: string, isArchived: boolean) => Promise<Product>;
  addStock: (
    productId: string,
    quantity: number,
    params?: {
      purchasePrice?: number;
      supplierId?: string;
      newExpiryDate?: string | null;
      reason?: string;
    }
  ) => Promise<{ product: Product; ledgerEntry: StockLedgerEntry }>;
  removeStock: (
    productId: string,
    quantity: number,
    movementType: 'DAMAGE' | 'EXPIRY',
    reason: string
  ) => Promise<{ product: Product; ledgerEntry: StockLedgerEntry }>;
  correctStock: (
    productId: string,
    physicalCount: number,
    reason: string
  ) => Promise<{ product: Product; ledgerEntry: StockLedgerEntry }>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings>;
  resetDemoData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const refreshData = useCallback(async () => {
    try {
      const [prods, cats, ledgerEntries, appSettings] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getCategories(),
        inventoryService.getLedgerEntries(),
        inventoryService.getSettings(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setLedger(ledgerEntries);
      setSettings(appSettings);
    } catch (err) {
      console.error('Failed to load inventory data from IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await inventoryService.initDatabase();
        await refreshData();
      } catch (err) {
        console.error('Database initialization failed:', err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [refreshData]);

  // Active products (non-archived)
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.is_active);
  }, [products]);

  // Low stock products: current_stock <= low_stock_threshold
  const lowStockProducts = useMemo(() => {
    return activeProducts.filter((p) => p.current_stock <= p.low_stock_threshold);
  }, [activeProducts]);

  // Out of stock products: current_stock <= 0
  const outOfStockProducts = useMemo(() => {
    return activeProducts.filter((p) => p.current_stock <= 0);
  }, [activeProducts]);

  // Expiring soon products: uses configurable settings.expiry_warning_days
  const { expiringProducts, expiredProducts } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholdDate = new Date();
    thresholdDate.setHours(23, 59, 59, 999);
    thresholdDate.setDate(thresholdDate.getDate() + (settings.expiry_warning_days || 7));

    const expired: Product[] = [];
    const expiring: Product[] = [];

    activeProducts.forEach((p) => {
      if (!p.expiry_date) return;
      const exp = new Date(p.expiry_date + 'T00:00:00');
      if (isNaN(exp.getTime())) return;

      if (exp < today) {
        expired.push(p);
      } else if (exp <= thresholdDate) {
        expiring.push(p);
      }
    });

    return {
      expiredProducts: expired,
      expiringProducts: [...expired, ...expiring],
    };
  }, [activeProducts, settings.expiry_warning_days]);

  // Total inventory valuation at cost price
  const totalInventoryCostValue = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + p.current_stock * p.purchase_price, 0);
  }, [activeProducts]);

  // Total inventory valuation at retail selling price
  const totalInventoryRetailValue = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + p.current_stock * p.selling_price, 0);
  }, [activeProducts]);

  const totalSkus = activeProducts.length;

  // Actions wrapped to auto-refresh local state
  const createProduct = async (
    data: Omit<Product, 'product_id' | 'current_stock' | 'created_at' | 'updated_at' | 'synced'>,
    openingStock: number
  ) => {
    const res = await inventoryService.createProductWithOpeningStock(data, openingStock);
    await refreshData();
    return res;
  };

  const updateProduct = async (
    productId: string,
    updates: Partial<Omit<Product, 'product_id' | 'current_stock' | 'created_at'>>
  ) => {
    const res = await inventoryService.updateProductDetails(productId, updates);
    await refreshData();
    return res;
  };

  const archiveProduct = async (productId: string, isArchived: boolean) => {
    const res = await inventoryService.setProductArchived(productId, isArchived);
    await refreshData();
    return res;
  };

  const addStock = async (
    productId: string,
    quantity: number,
    params?: {
      purchasePrice?: number;
      supplierId?: string;
      newExpiryDate?: string | null;
      reason?: string;
    }
  ) => {
    const res = await inventoryService.addPurchaseStock(productId, quantity, params);
    await refreshData();
    return res;
  };

  const removeStock = async (
    productId: string,
    quantity: number,
    movementType: 'DAMAGE' | 'EXPIRY',
    reason: string
  ) => {
    const res = await inventoryService.recordStockLoss(productId, quantity, movementType, reason);
    await refreshData();
    return res;
  };

  const correctStock = async (productId: string, physicalCount: number, reason: string) => {
    const res = await inventoryService.correctStockWithReason(productId, physicalCount, reason);
    await refreshData();
    return res;
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const res = await inventoryService.updateSettings(updates);
    setSettings(res);
    return res;
  };

  const resetDemoData = async () => {
    await inventoryService.resetToDemoData();
    await refreshData();
  };

  return (
    <InventoryContext.Provider
      value={{
        loading,
        products,
        categories,
        ledger,
        settings,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        expiringProducts,
        expiredProducts,
        totalInventoryCostValue,
        totalInventoryRetailValue,
        totalSkus,
        refreshData,
        createProduct,
        updateProduct,
        archiveProduct,
        addStock,
        removeStock,
        correctStock,
        updateSettings,
        resetDemoData,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
