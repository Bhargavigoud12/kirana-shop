import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  AlertTriangle,
  Clock,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  SlidersHorizontal,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Calendar,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Product, StockLedgerEntry } from '../types/inventory';
import { StockActionModal, StockModalMode } from '../components/StockActionModal';

export type InventoryTab = 'all' | 'low_stock' | 'out_of_stock' | 'expiry' | 'ledger';

interface InventoryScreenProps {
  initialTab?: InventoryTab;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ initialTab = 'all' }) => {
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

  // Tab State - sync with initialTab prop if it changes
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Search & Filters
  const [productSearch, setProductSearch] = useState<string>('');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL');

  // Modal State
  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<StockModalMode>('PURCHASE');
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);

  const handleOpenAction = (mode: StockModalMode, product?: Product) => {
    setModalMode(mode);
    setTargetProduct(product || null);
    setIsStockModalOpen(true);
  };

  // Filtered Products for "All Items" tab
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return activeProducts.filter((p) => {
      if (!q) return true;
      const nameMatch = p.name.toLowerCase().includes(q);
      const barcodeMatch = (p.barcode || '').toLowerCase().includes(q);
      const aliasMatch = (p.aliases || []).some((a) => a.toLowerCase().includes(q));
      return nameMatch || barcodeMatch || aliasMatch;
    });
  }, [activeProducts, productSearch]);

  // Filtered Ledger entries
  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.toLowerCase().trim();
    return ledger.filter((entry) => {
      // Movement filter
      if (ledgerFilter !== 'ALL' && entry.movement_type !== ledgerFilter) {
        return false;
      }
      // Product search filter
      if (q && !entry.product_name.toLowerCase().includes(q) && !entry.reason.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [ledger, ledgerFilter, ledgerSearch]);

  return (
    <div className="space-y-4 pb-20">
      {/* Title & Valuation Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Inventory Management</h2>
        <p className="text-xs text-slate-500">
          Atomic inventory control with low stock & expiry early-warning alerts
        </p>
      </div>

      {/* Stock Valuation Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-2 gap-3 text-center divide-x divide-slate-100">
          <div>
            <span className="text-xs text-slate-500 block">Total Inventory Cost</span>
            <span className="text-base font-extrabold text-slate-900 tabular-nums">
              {settings.currency} {totalInventoryCostValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Estimated Retail Value</span>
            <span className="text-base font-extrabold text-emerald-600 tabular-nums">
              {settings.currency} {totalInventoryRetailValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons (48px+ touch targets) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleOpenAction('PURCHASE')}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-center shadow-xs transition-all active:scale-[0.98] min-h-[52px] flex flex-col items-center justify-center gap-1"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-xs font-bold leading-tight">+ Purchase</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenAction('REMOVE_STOCK')}
          className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-center shadow-xs transition-all active:scale-[0.98] min-h-[52px] flex flex-col items-center justify-center gap-1"
        >
          <MinusCircle className="w-5 h-5" />
          <span className="text-xs font-bold leading-tight">- Damage/Loss</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenAction('MANUAL_FIX')}
          className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-center shadow-xs transition-all active:scale-[0.98] min-h-[52px] flex flex-col items-center justify-center gap-1"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-xs font-bold leading-tight">✏️ Audit Fix</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Items ({activeProducts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('low_stock')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'low_stock'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock ({lowStockProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('out_of_stock')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'out_of_stock'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Out of Stock ({outOfStockProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expiry')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'expiry'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Expiring ({expiredProducts.length + expiringSoonProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Ledger Log ({ledger.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL ITEMS */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search stock by name, barcode, or alias..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>

          <div className="space-y-2.5">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                No products match "{productSearch}"
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isOut = p.current_stock <= 0;
                const isLow = p.current_stock <= p.low_stock_threshold && !isOut;
                const expInfo = getExpiryInfo(p.expiry_date);

                return (
                  <div
                    key={p.product_id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-all ${
                      isOut
                        ? 'border-rose-300 bg-rose-50/20'
                        : isLow
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.name}</h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>Selling: <strong>{settings.currency} {p.selling_price}</strong></span>
                          <span>·</span>
                          <span>Cost: <strong>{settings.currency} {p.purchase_price}</strong></span>
                          <span>·</span>
                          <span>Threshold: {p.low_stock_threshold} {p.unit}</span>
                          {expInfo && (
                            <>
                              <span>·</span>
                              <span
                                className={`flex items-center gap-1 font-semibold ${
                                  expInfo.isExpired
                                    ? 'text-rose-600'
                                    : expInfo.daysRemaining <= settings.expiry_warning_days
                                    ? 'text-amber-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                <span>{expInfo.label}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stock Pill */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold tabular-nums ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.current_stock} {p.unit}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-0.5 tabular-nums">
                          Value: {settings.currency} {(p.current_stock * p.purchase_price).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Direct Quick Action Triggers */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenAction('PURCHASE', p)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+ Stock</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAction('REMOVE_STOCK', p)}
                        disabled={isOut}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-40"
                      >
                        <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>- Loss</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAction('MANUAL_FIX', p)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                        <span>✏️ Audit Fix</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LOW STOCK (current_stock <= threshold && current_stock > 0) */}
      {activeTab === 'low_stock' && (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span className="font-semibold">
              Showing items below threshold but still in stock (reorder recommended)
            </span>
            <span className="font-extrabold tabular-nums bg-amber-200/80 px-2 py-0.5 rounded-md">
              {lowStockProducts.length} items
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No items in low stock!</p>
              <p className="text-xs text-slate-400">All inventory thresholds are healthy.</p>
            </div>
          ) : (
            lowStockProducts.map((p) => (
              <div
                key={p.product_id}
                className="bg-white rounded-2xl border border-amber-300 bg-amber-50/20 p-4 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-amber-800 mt-0.5 font-medium">
                      Current Stock: <strong className="text-amber-950">{p.current_stock} {p.unit}</strong> · Threshold: {p.low_stock_threshold} {p.unit}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Deficit to threshold: {(p.low_stock_threshold - p.current_stock).toFixed(1)} {p.unit}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 tabular-nums">
                      {p.current_stock} {p.unit}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAction('PURCHASE', p)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Purchase Stock</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: OUT OF STOCK (current_stock <= 0) */}
      {activeTab === 'out_of_stock' && (
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
            <span className="font-semibold">
              Urgent: These items have zero stock and cause lost sales
            </span>
            <span className="font-extrabold tabular-nums bg-rose-200/80 px-2 py-0.5 rounded-md">
              {outOfStockProducts.length} items
            </span>
          </div>

          {outOfStockProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No items out of stock!</p>
              <p className="text-xs text-slate-400">All products have available inventory.</p>
            </div>
          ) : (
            outOfStockProducts.map((p) => (
              <div
                key={p.product_id}
                className="bg-white rounded-2xl border border-rose-300 bg-rose-50/20 p-4 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-rose-700 font-semibold mt-0.5 flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Completely Out of Stock (0 {p.unit})</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Required reorder quantity: at least {p.low_stock_threshold} {p.unit}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 tabular-nums">
                      0 {p.unit}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAction('PURCHASE', p)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Restock Item</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: EXPIRING SOON & EXPIRED (Separated Clearly with Countdown) */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
            <span>
              Configured Alert Window: <strong>≤ {settings.expiry_warning_days} days</strong>
            </span>
            <span className="text-[11px] text-slate-500">Edit in Settings</span>
          </div>

          {/* Section A: Expired Items */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>🚨 Expired Products ({expiredProducts.length})</span>
            </div>

            {expiredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center text-xs text-slate-500">
                Zero products currently expired.
              </div>
            ) : (
              expiredProducts.map((p) => {
                const expInfo = getExpiryInfo(p.expiry_date);
                return (
                  <div
                    key={p.product_id}
                    className="bg-white rounded-2xl border border-rose-300 bg-rose-50/30 p-4 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                        <p className="text-xs font-bold text-rose-700 mt-0.5">
                          {expInfo?.label} (Date: {p.expiry_date})
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Unsold Stock: <strong>{p.current_stock} {p.unit}</strong>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white tabular-nums">
                        Expired
                      </span>
                    </div>

                    <div className="pt-2 border-t border-rose-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAction('REMOVE_STOCK', p)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                        <span>Write Off Expiry</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Section B: Expiring Soon Items */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>⚠️ Expiring Within {settings.expiry_warning_days} Days ({expiringSoonProducts.length})</span>
            </div>

            {expiringSoonProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center text-xs text-slate-500">
                No products nearing expiry in this warning window.
              </div>
            ) : (
              expiringSoonProducts.map((p) => {
                const expInfo = getExpiryInfo(p.expiry_date);
                return (
                  <div
                    key={p.product_id}
                    className="bg-white rounded-2xl border border-amber-300 bg-amber-50/20 p-4 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                        <p className="text-xs font-bold text-amber-800 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{expInfo?.label} · sell first!</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Expiry Date: {p.expiry_date} · Stock: {p.current_stock} {p.unit}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 tabular-nums">
                        {expInfo?.daysRemaining}d left
                      </span>
                    </div>

                    <div className="pt-2 border-t border-amber-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAction('REMOVE_STOCK', p)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                      >
                        Write Off Loss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAction('PURCHASE', p)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Reorder Fresh Batch</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: STOCK LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          {/* Movement Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {['ALL', 'OPENING_STOCK', 'PURCHASE', 'DAMAGE', 'EXPIRY', 'MANUAL_FIX'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setLedgerFilter(m)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 transition-colors ${
                  ledgerFilter === m
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search ledger */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder="Search audit trail by product name or reason..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Ledger Records List */}
          <div className="space-y-2">
            {filteredLedger.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                No ledger records match your filter criteria
              </div>
            ) : (
              filteredLedger.map((entry) => {
                const isPositive = entry.quantity_change > 0;
                const formattedTime = new Date(entry.created_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const formattedDate = new Date(entry.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={entry.entry_id}
                    className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                              entry.movement_type === 'PURCHASE' || entry.movement_type === 'OPENING_STOCK'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.movement_type === 'MANUAL_FIX'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {entry.movement_type.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            <span>{formattedDate} · {formattedTime}</span>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1 truncate">
                          {entry.product_name}
                        </h4>
                      </div>

                      {/* Delta & Balance Math */}
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-extrabold tabular-nums flex items-center justify-end gap-0.5 ${
                            isPositive
                              ? 'text-emerald-600'
                              : entry.quantity_change === 0
                              ? 'text-slate-500'
                              : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : entry.quantity_change < 0 ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : null}
                          <span>
                            {isPositive
                              ? `+${entry.quantity_change}`
                              : `${entry.quantity_change}`}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums block mt-0.5">
                          {entry.previous_stock} → <strong>{entry.new_stock}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Reason & Audit Metadata */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate italic max-w-[70%]">
                        Reason: {entry.reason}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          ● Local (Synced: false)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Stock Action Modal */}
      <StockActionModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setTargetProduct(null);
        }}
        mode={modalMode}
        preselectedProduct={targetProduct}
      />
    </div>
  );
};
