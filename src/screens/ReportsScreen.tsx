import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  User,
  Package,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { billingService } from '../services/billingService';
import { Bill, BillItem, Customer, Product, StockLedgerEntry } from '../types/inventory';
import {
  exportSalesReportCsv,
  exportProductsReportCsv,
  exportStockLedgerCsv,
  exportCustomerUdhaarCsv,
  exportExpiryReportCsv,
} from '../services/csvExport';

type DateRangeFilter = 'today' | 'week' | 'month' | 'custom';

export const ReportsScreen: React.FC = () => {
  const {
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    expiredProducts,
    expiringSoonProducts,
    ledger,
    settings,
    totalInventoryCostValue,
    totalInventoryRetailValue,
    getExpiryInfo,
  } = useInventory();

  const [dateRange, setDateRange] = useState<DateRangeFilter>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [bills, setBills] = useState<Bill[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [allBills, allCusts] = await Promise.all([
        billingService.getBills(),
        billingService.getCustomers(),
      ]);
      setBills(allBills);
      setCustomers(allCusts);

      // Fetch items for all bills
      const itemsList: BillItem[] = [];
      for (const b of allBills) {
        const bi = await billingService.getBillItems(b.bill_id);
        itemsList.push(...bi);
      }
      setBillItems(itemsList);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Filter bills based on selected date range
  const { filteredBills, filteredItems } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const fBills = bills.filter((b) => {
      // Rule: Exclude cancelled bills from sales and profit calculations
      if (b.status === 'CANCELLED') return false;

      const billDate = new Date(b.created_at);

      if (dateRange === 'today') {
        return b.created_at.startsWith(todayStr);
      } else if (dateRange === 'week') {
        return billDate >= startOfWeek;
      } else if (dateRange === 'month') {
        return billDate >= startOfMonth;
      } else if (dateRange === 'custom') {
        const s = new Date(customStartDate + 'T00:00:00');
        const e = new Date(customEndDate + 'T23:59:59');
        return billDate >= s && billDate <= e;
      }
      return true;
    });

    const billIds = new Set(fBills.map((b) => b.bill_id));
    const fItems = billItems.filter((item) => billIds.has(item.bill_id));

    return { filteredBills: fBills, filteredItems: fItems };
  }, [bills, billItems, dateRange, customStartDate, customEndDate]);

  // Metric 1 & 2: Total Sales & Bill Count
  const totalSales = useMemo(() => {
    return filteredBills.reduce((sum, b) => sum + b.total, 0);
  }, [filteredBills]);

  const numberOfBills = filteredBills.length;

  // Metric 3: Payment Split
  const paymentSplit = useMemo(() => {
    const split = { cash: 0, upi: 0, card: 0, credit: 0, mixed: 0 };
    filteredBills.forEach((b) => {
      if (b.payment_mode === 'cash') split.cash += b.total;
      else if (b.payment_mode === 'upi') split.upi += b.total;
      else if (b.payment_mode === 'card') split.card += b.total;
      else if (b.payment_mode === 'credit') split.credit += b.total;
      else split.mixed += b.total;
    });
    return split;
  }, [filteredBills]);

  // Metric 4: Profit Estimate (selling_price - purchase_price for sold items)
  const estimatedProfit = useMemo(() => {
    let profit = 0;
    const prodMap = new Map(activeProducts.map((p) => [p.product_id, p]));

    filteredItems.forEach((item) => {
      const prod = prodMap.get(item.product_id);
      const cost = prod ? prod.purchase_price : 0;
      const profitPerUnit = item.unit_price - cost;
      profit += profitPerUnit * item.quantity;
    });
    return Math.round(profit * 100) / 100;
  }, [filteredItems, activeProducts]);

  // Metric 5: Top Selling Products
  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { product_id: string; name: string; quantity: number; revenue: number; unit: string }>();

    filteredItems.forEach((item) => {
      const existing = map.get(item.product_id);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.line_total;
      } else {
        map.set(item.product_id, {
          product_id: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          revenue: item.line_total,
          unit: item.unit,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredItems]);

  // Metric 6 & 10: Slow-Moving and Dead Stock Products
  const { slowMovingProducts, deadStockProducts } = useMemo(() => {
    const soldProductIds = new Set(filteredItems.map((item) => item.product_id));
    const dead: Product[] = [];
    const slow: Array<{ product: Product; qtySold: number }> = [];

    const soldQtyMap = new Map<string, number>();
    filteredItems.forEach((i) => {
      soldQtyMap.set(i.product_id, (soldQtyMap.get(i.product_id) || 0) + i.quantity);
    });

    activeProducts.forEach((p) => {
      if (!soldProductIds.has(p.product_id)) {
        dead.push(p);
      } else {
        const soldQty = soldQtyMap.get(p.product_id) || 0;
        if (soldQty <= 2) {
          slow.push({ product: p, qtySold: soldQty });
        }
      }
    });

    return {
      slowMovingProducts: slow.slice(0, 5),
      deadStockProducts: dead,
    };
  }, [filteredItems, activeProducts]);

  // Metric 11: Outstanding Customer Udhaar
  const { totalOutstandingUdhaar, customersWithCredit } = useMemo(() => {
    const withCredit = customers.filter((c) => c.credit_balance > 0);
    const total = withCredit.reduce((sum, c) => sum + c.credit_balance, 0);
    return {
      totalOutstandingUdhaar: Math.round(total * 100) / 100,
      customersWithCredit: withCredit.sort((a, b) => b.credit_balance - a.credit_balance),
    };
  }, [customers]);

  // Metric 12: Stock Movement Summary from Ledger
  const stockMovementSummary = useMemo(() => {
    const summary = {
      PURCHASE: { count: 0, qty: 0 },
      SALE: { count: 0, qty: 0 },
      SALE_RETURN: { count: 0, qty: 0 },
      DAMAGE: { count: 0, qty: 0 },
      EXPIRY: { count: 0, qty: 0 },
      MANUAL_FIX: { count: 0, qty: 0 },
    };

    ledger.forEach((entry) => {
      const type = entry.movement_type as keyof typeof summary;
      if (summary[type]) {
        summary[type].count += 1;
        summary[type].qty += Math.abs(entry.quantity_change);
      }
    });

    return summary;
  }, [ledger]);

  return (
    <div className="space-y-5 pb-20">
      {/* Title & CSV Export Quick Bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500">
            Offline sales summaries, profit margins, dead stock, and audit CSV exports
          </p>
        </div>

        <button
          type="button"
          onClick={loadReportData}
          title="Refresh Report Data"
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Date Range Selector Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs space-y-2">
        <div className="flex items-center gap-1">
          {(['today', 'week', 'month', 'custom'] as DateRangeFilter[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDateRange(tab)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors capitalize ${
                dateRange === tab
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'today' && 'Today'}
              {tab === 'week' && 'This Week'}
              {tab === 'month' && 'This Month'}
              {tab === 'custom' && 'Custom Date'}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {dateRange === 'custom' && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary KPI Row: Sales, Bills, Profit */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block truncate">Total Sales</span>
          <div className="text-lg font-black text-slate-900 tabular-nums mt-0.5 truncate">
            {settings.currency} {totalSales.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
            {numberOfBills} completed bills
          </span>
        </div>

        {/* Estimated Profit */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block truncate">Est. Profit</span>
          <div className="text-lg font-black text-emerald-600 tabular-nums mt-0.5 truncate">
            {settings.currency} {estimatedProfit.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 truncate">
            {totalSales > 0 ? `${((estimatedProfit / totalSales) * 100).toFixed(0)}% margin` : '0% margin'}
          </span>
        </div>

        {/* Customer Udhaar */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block truncate">Total Udhaar</span>
          <div className="text-lg font-black text-amber-900 tabular-nums mt-0.5 truncate">
            {settings.currency} {totalOutstandingUdhaar.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-700 block mt-1 truncate">
            {customersWithCredit.length} debtors
          </span>
        </div>
      </div>

      {/* Payment Split Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
          <span>Payment Mode Breakdown</span>
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Cash</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums block mt-0.5">
              {settings.currency} {paymentSplit.cash.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">UPI</span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums block mt-0.5">
              {settings.currency} {paymentSplit.upi.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Card</span>
            <span className="text-sm font-bold text-indigo-600 tabular-nums block mt-0.5">
              {settings.currency} {paymentSplit.card.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Udhaar</span>
            <span className="text-sm font-bold text-amber-800 tabular-nums block mt-0.5">
              {settings.currency} {paymentSplit.credit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Top-Selling Products */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Top-Selling Products (by Revenue)</span>
          </h3>
          <span className="text-[11px] text-slate-400">Selected period</span>
        </div>

        {topSellingProducts.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2 text-center">
            No sales recorded in this date range. Create a bill via Voice or Counter to populate.
          </p>
        ) : (
          <div className="space-y-2">
            {topSellingProducts.map((p, idx) => (
              <div
                key={p.product_id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-900 truncate">{p.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-slate-900 tabular-nums block">
                    {settings.currency} {p.revenue}
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {p.quantity} {p.unit} sold
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dead Stock & Slow Moving Products */}
      <div className="grid grid-cols-2 gap-3">
        {/* Dead Stock */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Dead Stock ({deadStockProducts.length})</span>
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Zero sales in selected period</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
            {deadStockProducts.length === 0 ? (
              <p className="text-xs text-emerald-600 italic">No dead stock!</p>
            ) : (
              deadStockProducts.slice(0, 4).map((p) => (
                <div key={p.product_id} className="p-2 rounded-xl bg-slate-50 text-xs truncate">
                  <span className="font-semibold text-slate-800 block truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-400">Stock: {p.current_stock} {p.unit}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Slow Moving */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Slow Moving ({slowMovingProducts.length})</span>
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">≤ 2 units sold</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
            {slowMovingProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">None identified</p>
            ) : (
              slowMovingProducts.map(({ product, qtySold }) => (
                <div key={product.product_id} className="p-2 rounded-xl bg-slate-50 text-xs truncate">
                  <span className="font-semibold text-slate-800 block truncate">{product.name}</span>
                  <span className="text-[10px] text-slate-400">{qtySold} sold · Stock: {product.current_stock}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Outstanding Customer Udhaar Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-700" />
            <span>Customer Udhaar (Khata) Balance</span>
          </h3>
          <span className="text-xs font-bold text-amber-900 tabular-nums">
            Total: {settings.currency} {totalOutstandingUdhaar}
          </span>
        </div>

        <div className="space-y-1.5">
          {customersWithCredit.map((c) => (
            <div
              key={c.customer_id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
            >
              <div>
                <h4 className="font-bold text-slate-900">{c.name}</h4>
                <p className="text-[10px] text-slate-500">{c.phone} · Limit: {settings.currency} {c.credit_limit}</p>
              </div>
              <span className="font-extrabold text-amber-900 tabular-nums text-sm">
                {settings.currency} {c.credit_balance}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Movement Summary from Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Stock Ledger Movement Breakdown</span>
          </h3>
          <span className="text-[11px] text-slate-400">{ledger.length} total entries</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Purchases</span>
            <span className="text-sm font-extrabold text-emerald-950 tabular-nums">
              +{stockMovementSummary.PURCHASE.qty} units
            </span>
            <span className="text-[10px] text-emerald-600 block">({stockMovementSummary.PURCHASE.count} batches)</span>
          </div>

          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
            <span className="text-[10px] font-bold uppercase text-indigo-800 block">Sales</span>
            <span className="text-sm font-extrabold text-indigo-950 tabular-nums">
              -{stockMovementSummary.SALE.qty} units
            </span>
            <span className="text-[10px] text-indigo-600 block">({stockMovementSummary.SALE.count} sales)</span>
          </div>

          <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
            <span className="text-[10px] font-bold uppercase text-rose-800 block">Damage/Loss</span>
            <span className="text-sm font-extrabold text-rose-950 tabular-nums">
              -{stockMovementSummary.DAMAGE.qty + stockMovementSummary.EXPIRY.qty} units
            </span>
            <span className="text-[10px] text-rose-600 block">
              ({stockMovementSummary.DAMAGE.count + stockMovementSummary.EXPIRY.count} logs)
            </span>
          </div>
        </div>
      </div>

      {/* CSV EXPORT SECTION (Download offline reports) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold">Export Offline CSV Reports</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded">
            Browser Download
          </span>
        </div>
        <p className="text-xs text-slate-300">
          Download structured CSV reports directly to your phone or PC. No internet connection required.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => exportSalesReportCsv(filteredBills)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Sales Report</span>
          </button>

          <button
            type="button"
            onClick={() => exportProductsReportCsv(activeProducts)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Product Stock</span>
          </button>

          <button
            type="button"
            onClick={() => exportStockLedgerCsv(ledger)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Stock Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => exportCustomerUdhaarCsv(customers)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Customer Udhaar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const allExp = [...expiredProducts, ...expiringSoonProducts].map((p) => {
                const info = getExpiryInfo(p.expiry_date);
                return {
                  name: p.name,
                  current_stock: p.current_stock,
                  unit: p.unit,
                  expiry_date: p.expiry_date,
                  daysRemaining: info?.daysRemaining || 0,
                  isExpired: info?.isExpired || false,
                };
              });
              exportExpiryReportCsv(allExp);
            }}
            className="p-2.5 col-span-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Expiry & Perishables Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
