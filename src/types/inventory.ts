/**
 * Core Data Models & Types for Munshi Kirana POS & Inventory
 */

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE'
  | 'SALE'
  | 'SALE_RETURN'
  | 'DAMAGE'
  | 'EXPIRY'
  | 'MANUAL_FIX'
  | 'SUPPLIER_RETURN';

export type ProductUnit =
  | 'kg'
  | 'g'
  | 'litre'
  | 'ml'
  | 'packet'
  | 'piece'
  | 'dozen'
  | 'bag'
  | 'carton'
  | 'quintal';

export interface Product {
  product_id: string;
  name: string;
  aliases: string[];
  barcode: string;
  category_id: string;
  unit: ProductUnit;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  low_stock_threshold: number;
  expiry_date: string | null; // ISO YYYY-MM-DD or null
  image_path: string | null;
  is_active: boolean; // false for archived products
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
  synced: boolean;
}

export interface Category {
  category_id: string;
  name: string;
  icon?: string;
}

export interface StockLedgerEntry {
  entry_id: string;
  product_id: string;
  product_name: string;
  movement_type: StockMovementType;
  quantity_change: number; // positive for additions, negative for deductions
  previous_stock: number;
  new_stock: number;
  reason: string;
  bill_id: string | null;
  supplier_id: string | null;
  user_id: string;
  device_id: string;
  created_at: string; // ISO 8601 UTC
  synced: boolean;
}

export interface AppSettings {
  id: string; // singleton 'app_settings'
  store_name: string;
  owner_name: string;
  phone_number: string;
  currency: string;
  language: 'telugu' | 'hindi' | 'english' | 'hinglish';
  expiry_warning_days: number; // Configurable window (default 7 days)
  updated_at: string;
}

// Prepared interfaces for upcoming Phase 2 (Billing & Credit) and Phase 4 (Sync)
export interface Bill {
  bill_id: string;
  bill_number: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_mode: 'cash' | 'upi' | 'card' | 'credit' | 'mixed';
  paid_amount: number;
  credit_amount: number;
  status: 'COMPLETED' | 'CANCELLED';
  created_at: string;
  synced: boolean;
}

export interface BillItem {
  bill_item_id: string;
  bill_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export interface Customer {
  customer_id: string;
  name: string;
  phone: string;
  address: string;
  credit_balance: number;
  credit_limit: number;
  created_at: string;
}

export interface Supplier {
  supplier_id: string;
  name: string;
  phone: string;
  address: string;
  pending_amount: number;
}

export interface SyncQueueItem {
  queue_id: string;
  entity_type: 'product' | 'stock_ledger' | 'bill' | 'customer' | 'supplier';
  entity_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string; // JSON serialized
  created_at: string;
  retry_count: number;
  status: 'PENDING' | 'SYNCING' | 'DONE' | 'FAILED' | 'CONFLICT';
}
