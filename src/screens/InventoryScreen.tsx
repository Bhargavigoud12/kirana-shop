import React, { useState } from 'react';
import { Layers, AlertTriangle, Clock, TrendingUp, PlusCircle, MinusCircle, SlidersHorizontal, ArrowDownRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { StockMovementType } from '../types/inventory';

export type InventoryTab = 'all' | 'low_stock' | 'out_of_stock' | 'expiry' | 'ledger';

interface InventoryScreenProps {
  initialTab?: InventoryTab;
  onOpenAddStock?: () => void;
  onOpenRemoveStock?: () => void;
  onOpenCorrectStock?: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  initialTab = 'all',
  onOpenAddStock,
  onOpenRemoveStock,
  onOpenCorrectStock,
}) => {
  const {
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    expiringProducts,
    ledger,
    settings,
    totalInventoryCostValue,
    totalInventoryRetailValue,
  } = useInventory();

  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL');

  // Filtered ledger entries
  const filteredLedger = ledger.filter((entry) => {
    if (ledgerFilter === 'ALL') return true;
    return entry.movement_type === ledgerFilter;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Title & Stock Valuation Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory & Ledger</h2>
          <p className="text-xs text-slate-500">
            Real-time stock control backed by immutable audit ledger
          </p>
        </div>
      </div>

      {/* Stock Valuation Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-2 gap-3 text-center divide-x divide-slate-100">
          <div>
            <span className="text-xs text-slate-500 block">Total Stock Cost</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {settings.currency} {totalInventoryCostValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Retail Sale Value</span>
            <span className="text-base font-bold text-emerald-600 tabular-nums">
              {settings.currency} {totalInventoryRetailValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Stock Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenAddStock}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center shadow-xs transition-colors min-h-[48px] flex flex-col items-center justify-center gap-1"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-xs font-bold leading-tight">+ Purchase</span>
        </button>

        <button
          type="button"
          onClick={onOpenRemoveStock}
          className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-center shadow-xs transition-colors min-h-[48px] flex flex-col items-center justify-center gap-1"
        >
          <MinusCircle className="w-5 h-5" />
          <span className="text-xs font-bold leading-tight">- Damage/Loss</span>
        </button>

        <button
          type="button"
          onClick={onOpenCorrectStock}
          className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-center shadow-xs transition-colors min-h-[48px] flex flex-col items-center justify-center gap-1"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-xs font-bold leading-tight">✏️ Audit Fix</span>
        </button>
      </div>

      {/* Inventory Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Stock ({activeProducts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('low_stock')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
            activeTab === 'low_stock'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock ({lowStockProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('out_of_stock')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'out_of_stock'
              ? 'bg-rose-600 text-white'
              : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          Out of Stock ({outOfStockProducts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expiry')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
            activeTab === 'expiry'
              ? 'bg-rose-600 text-white'
              : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Expiring ({expiringProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
            activeTab === 'ledger'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Ledger Log ({ledger.length})</span>
        </button>
      </div>

      {/* Tab Content 1: Products list (All / Low / Out / Expiry) */}
      {activeTab !== 'ledger' && (
        <div className="space-y-2">
          {(() => {
            let list = activeProducts;
            if (activeTab === 'low_stock') list = lowStockProducts;
            if (activeTab === 'out_of_stock') list = outOfStockProducts;
            if (activeTab === 'expiry') list = expiringProducts;

            if (list.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">
                    {activeTab === 'low_stock' && 'No items currently in low stock!'}
                    {activeTab === 'out_of_stock' && 'No items currently out of stock!'}
                    {activeTab === 'expiry' && `No items expiring within ${settings.expiry_warning_days} days!`}
                    {activeTab === 'all' && 'No products found'}
                  </p>
                  <p className="text-xs text-slate-400">All inventory thresholds are healthy.</p>
                </div>
              );
            }

            return list.map((p) => {
              const isOut = p.current_stock <= 0;
              const isLow = p.current_stock <= p.low_stock_threshold;

              return (
                <div
                  key={p.product_id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{p.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>Threshold: {p.low_stock_threshold} {p.unit}</span>
                      {p.expiry_date && (
                        <>
                          <span>·</span>
                          <span className={activeTab === 'expiry' ? 'text-rose-600 font-bold' : ''}>
                            Exp: {p.expiry_date}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                        isOut
                          ? 'bg-rose-100 text-rose-800'
                          : isLow
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.current_stock} {p.unit}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {settings.currency} {p.purchase_price * p.current_stock}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Tab Content 2: Stock Ledger Timeline (Non-negotiable Audit Invariant) */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          {/* Movement Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {['ALL', 'OPENING_STOCK', 'PURCHASE', 'DAMAGE', 'EXPIRY', 'MANUAL_FIX'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setLedgerFilter(m)}
                className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  ledgerFilter === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredLedger.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                No ledger records match this movement type
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
                });

                return (
                  <div
                    key={entry.entry_id}
                    className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              entry.movement_type === 'PURCHASE' || entry.movement_type === 'OPENING_STOCK'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.movement_type === 'MANUAL_FIX'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {entry.movement_type.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formattedDate} · {formattedTime}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1 truncate">
                          {entry.product_name}
                        </h4>
                      </div>

                      {/* Delta */}
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-extrabold tabular-nums flex items-center justify-end gap-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          <span>
                            {isPositive ? `+${entry.quantity_change}` : entry.quantity_change}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {entry.previous_stock} → {entry.new_stock}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate italic">
                        Reason: {entry.reason}
                      </span>
                      <span className="text-slate-400 shrink-0 font-mono text-[10px]">
                        {entry.user_id}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
