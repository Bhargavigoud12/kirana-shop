import { Bill, BillItem, Customer, Product, StockLedgerEntry } from '../types/inventory';
import { localDB } from './db';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    customer_id: 'cust_ramesh',
    name: 'Ramesh Sharma',
    phone: '+91 98765 11223',
    address: 'Near Old Water Tank, Main Bazaar',
    credit_balance: 850,
    credit_limit: 3000,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    customer_id: 'cust_suresh',
    name: 'Suresh Kumar',
    phone: '+91 98765 33445',
    address: 'House #42, Gandhi Chowk',
    credit_balance: 420,
    credit_limit: 2000,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    customer_id: 'cust_priya',
    name: 'Priya Reddy',
    phone: '+91 98765 55667',
    address: 'Plot 12, Teachers Colony',
    credit_balance: 0,
    credit_limit: 5000,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

export class BillingService {
  /**
   * Initialize customers store with sample data if empty
   */
  async initCustomers(): Promise<void> {
    const existing = await localDB.getAll<Customer>('customers');
    if (existing.length === 0) {
      for (const c of INITIAL_CUSTOMERS) {
        await localDB.put<Customer>('customers', c);
      }
    }
  }

  async getCustomers(): Promise<Customer[]> {
    await this.initCustomers();
    return localDB.getAll<Customer>('customers');
  }

  async findCustomerByName(nameQuery: string): Promise<Customer | null> {
    const customers = await this.getCustomers();
    const q = nameQuery.toLowerCase().trim();
    return (
      customers.find((c) => c.name.toLowerCase().includes(q)) || null
    );
  }

  async getBills(): Promise<Bill[]> {
    const bills = await localDB.getAll<Bill>('bills');
    return bills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getBillItems(billId: string): Promise<BillItem[]> {
    const allItems = await localDB.getAll<BillItem>('bill_items');
    return allItems.filter((item) => item.bill_id === billId);
  }

  /**
   * ATOMIC INVARIANT:
   * Create Bill + BillItems + Atomic SALE Ledger Entries for each sold product.
   * Decrements current_stock and prevents stock from going below 0.
   */
  async createBillWithStockDeduction(
    items: Array<{
      product: Product;
      quantity: number;
      unitPrice?: number;
    }>,
    params?: {
      customerId?: string | null;
      paymentMode?: 'cash' | 'upi' | 'card' | 'credit';
      discount?: number;
      userId?: string;
      deviceId?: string;
    }
  ): Promise<{ bill: Bill; items: BillItem[]; ledgerEntries: StockLedgerEntry[] }> {
    if (items.length === 0) {
      throw new Error('Cannot create an empty bill. Add at least one item.');
    }

    const now = new Date().toISOString();
    const billId = generateUUID();
    const billNumber = 'BILL-' + Date.now().toString().slice(-6);

    let subtotal = 0;
    const billItems: BillItem[] = [];

    // Pre-validate quantities & stock availability
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error(`Quantity for ${item.product.name} must be greater than zero.`);
      }
      if (item.quantity > item.product.current_stock) {
        throw new Error(
          `Insufficient stock for "${item.product.name}". Available: ${item.product.current_stock} ${item.product.unit}, requested: ${item.quantity} ${item.product.unit}.`
        );
      }
      const price = item.unitPrice ?? item.product.selling_price;
      const lineTotal = Math.round(item.quantity * price * 100) / 100;
      subtotal += lineTotal;

      billItems.push({
        bill_item_id: generateUUID(),
        bill_id: billId,
        product_id: item.product.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit: item.product.unit,
        unit_price: price,
        line_total: lineTotal,
      });
    }

    const discount = params?.discount || 0;
    const total = Math.max(0, subtotal - discount);
    const paymentMode = params?.paymentMode || 'cash';
    const isCredit = paymentMode === 'credit';
    const paidAmount = isCredit ? 0 : total;
    const creditAmount = isCredit ? total : 0;

    const newBill: Bill = {
      bill_id: billId,
      bill_number: billNumber,
      customer_id: params?.customerId || null,
      subtotal,
      discount,
      total,
      payment_mode: paymentMode,
      paid_amount: paidAmount,
      credit_amount: creditAmount,
      status: 'COMPLETED',
      created_at: now,
      synced: false,
    };

    const ledgerEntries: StockLedgerEntry[] = [];

    // Atomic write across: 'bills', 'bill_items', 'products', 'stock_ledger', 'customers'
    await localDB.executeTransaction(
      ['bills', 'bill_items', 'products', 'stock_ledger', 'customers'],
      'readwrite',
      async (tx) => {
        const billStore = tx.objectStore('bills');
        const itemStore = tx.objectStore('bill_items');
        const prodStore = tx.objectStore('products');
        const ledgerStore = tx.objectStore('stock_ledger');
        const custStore = tx.objectStore('customers');

        // 1. Put Bill & Items
        billStore.put(newBill);
        for (const bi of billItems) {
          itemStore.put(bi);
        }

        // 2. Decrement stock for each item & write SALE ledger entry
        for (const bi of billItems) {
          const req = prodStore.get(bi.product_id);
          const product = await new Promise<Product>((res, rej) => {
            req.onsuccess = () => {
              if (!req.result) rej(new Error(`Product ${bi.product_id} not found`));
              else res(req.result as Product);
            };
            req.onerror = () => rej(req.error);
          });

          const prevStock = product.current_stock;
          const newStock = Math.max(0, Math.round((prevStock - bi.quantity) * 1000) / 1000);

          const updatedProd: Product = {
            ...product,
            current_stock: newStock,
            updated_at: now,
            synced: false,
          };
          prodStore.put(updatedProd);

          const ledgerEntry: StockLedgerEntry = {
            entry_id: generateUUID(),
            product_id: bi.product_id,
            product_name: bi.product_name,
            movement_type: 'SALE',
            quantity_change: -bi.quantity,
            previous_stock: prevStock,
            new_stock: newStock,
            reason: `Bill sale ${billNumber}`,
            bill_id: billId,
            supplier_id: null,
            user_id: params?.userId || 'owner_kirana',
            device_id: params?.deviceId || 'pos_main',
            created_at: now,
            synced: false,
          };

          ledgerStore.put(ledgerEntry);
          ledgerEntries.push(ledgerEntry);
        }

        // 3. If credit sale, update customer balance
        if (isCredit && params?.customerId) {
          const cReq = custStore.get(params.customerId);
          const customer = await new Promise<Customer>((res, rej) => {
            cReq.onsuccess = () => res(cReq.result as Customer);
            cReq.onerror = () => rej(cReq.error);
          });
          if (customer) {
            customer.credit_balance = Math.round((customer.credit_balance + creditAmount) * 100) / 100;
            custStore.put(customer);
          }
        }
      }
    );

    return { bill: newBill, items: billItems, ledgerEntries };
  }

  /**
   * Cancel the last completed bill and restore stock atomically with SALE_RETURN entries
   */
  async cancelLastBill(): Promise<{ cancelledBill: Bill; restoredCount: number } | null> {
    const bills = await this.getBills();
    const lastCompleted = bills.find((b) => b.status === 'COMPLETED');
    if (!lastCompleted) return null;

    const items = await this.getBillItems(lastCompleted.bill_id);
    const now = new Date().toISOString();

    await localDB.executeTransaction(
      ['bills', 'products', 'stock_ledger', 'customers'],
      'readwrite',
      async (tx) => {
        const billStore = tx.objectStore('bills');
        const prodStore = tx.objectStore('products');
        const ledgerStore = tx.objectStore('stock_ledger');
        const custStore = tx.objectStore('customers');

        // Mark bill cancelled
        const updatedBill: Bill = {
          ...lastCompleted,
          status: 'CANCELLED',
          synced: false,
        };
        billStore.put(updatedBill);

        // Restore stock for all items
        for (const item of items) {
          const req = prodStore.get(item.product_id);
          const product = await new Promise<Product>((res, rej) => {
            req.onsuccess = () => res(req.result as Product);
            req.onerror = () => rej(req.error);
          });

          if (product) {
            const prevStock = product.current_stock;
            const newStock = Math.round((prevStock + item.quantity) * 1000) / 1000;
            product.current_stock = newStock;
            product.updated_at = now;
            prodStore.put(product);

            const ledgerEntry: StockLedgerEntry = {
              entry_id: generateUUID(),
              product_id: item.product_id,
              product_name: item.product_name,
              movement_type: 'SALE_RETURN',
              quantity_change: item.quantity,
              previous_stock: prevStock,
              new_stock: newStock,
              reason: `Bill cancellation ${lastCompleted.bill_number} return to stock`,
              bill_id: lastCompleted.bill_id,
              supplier_id: null,
              user_id: 'owner_kirana',
              device_id: 'pos_main',
              created_at: now,
              synced: false,
            };
            ledgerStore.put(ledgerEntry);
          }
        }

        // Revert customer credit if needed
        if (lastCompleted.credit_amount > 0 && lastCompleted.customer_id) {
          const cReq = custStore.get(lastCompleted.customer_id);
          const customer = await new Promise<Customer>((res, rej) => {
            cReq.onsuccess = () => res(cReq.result as Customer);
            cReq.onerror = () => rej(cReq.error);
          });
          if (customer) {
            customer.credit_balance = Math.max(0, customer.credit_balance - lastCompleted.credit_amount);
            custStore.put(customer);
          }
        }
      }
    );

    return { cancelledBill: lastCompleted, restoredCount: items.length };
  }

  /**
   * Daily sales summary calculation
   */
  async getTodaySalesSummary(): Promise<{
    dateStr: string;
    totalBills: number;
    totalSales: number;
    cashTotal: number;
    upiTotal: number;
    creditTotal: number;
  }> {
    const bills = await this.getBills();
    const today = new Date().toISOString().split('T')[0];

    const todayBills = bills.filter(
      (b) => b.created_at.startsWith(today) && b.status === 'COMPLETED'
    );

    let totalSales = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let creditTotal = 0;

    for (const b of todayBills) {
      totalSales += b.total;
      if (b.payment_mode === 'cash') cashTotal += b.total;
      else if (b.payment_mode === 'upi') upiTotal += b.total;
      else if (b.payment_mode === 'credit') creditTotal += b.total;
      else cashTotal += b.total;
    }

    return {
      dateStr: today,
      totalBills: todayBills.length,
      totalSales: Math.round(totalSales * 100) / 100,
      cashTotal: Math.round(cashTotal * 100) / 100,
      upiTotal: Math.round(upiTotal * 100) / 100,
      creditTotal: Math.round(creditTotal * 100) / 100,
    };
  }
}

export const billingService = new BillingService();
