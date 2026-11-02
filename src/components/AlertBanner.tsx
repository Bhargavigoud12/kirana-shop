import React from 'react';
import { AlertTriangle, Clock, ArrowRight, AlertOctagon } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { InventoryTab } from '../screens/InventoryScreen';

interface AlertBannerProps {
  onNavigateToInventory: (filterTab: InventoryTab) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onNavigateToInventory }) => {
  const { lowStockProducts, outOfStockProducts, expiredProducts, expiringSoonProducts, settings } = useInventory();

  const hasLowStock = lowStockProducts.length > 0;
  const hasOutOfStock = outOfStockProducts.length > 0;
  const totalExpiring = expiredProducts.length + expiringSoonProducts.length;

  if (!hasLowStock && !hasOutOfStock && totalExpiring === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {/* 1. Out of Stock Critical Danger Banner */}
      {hasOutOfStock && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-3 shadow-xs animate-in fade-in transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-950 dark:text-rose-200 truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                <span>{outOfStockProducts.length} items completely OUT OF STOCK!</span>
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 truncate mt-0.5">
                {outOfStockProducts.slice(0, 2).map((p) => p.name).join(', ')}
                {outOfStockProducts.length > 2 ? ` +${outOfStockProducts.length - 2} more` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToInventory('out_of_stock')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition-all active:scale-[0.98] min-h-[38px]"
          >
            <span>Restock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Low Stock Warning Amber Banner */}
      {hasLowStock && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 shadow-xs animate-in fade-in transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-950 dark:text-amber-200 truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>{lowStockProducts.length} items running low on stock</span>
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 truncate mt-0.5">
                {lowStockProducts.slice(0, 2).map((p) => p.name).join(', ')}
                {lowStockProducts.length > 2 ? ` +${lowStockProducts.length - 2} more` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToInventory('low_stock')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-all active:scale-[0.98] min-h-[38px]"
          >
            <span>Review Low</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Expiry Warning Banner (Separating Expired vs Expiring Soon) */}
      {totalExpiring > 0 && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-xs animate-in fade-in transition-colors ${
            expiredProducts.length > 0
              ? 'bg-rose-50/80 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
              : 'bg-amber-50/80 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${
                expiredProducts.length > 0 ? 'bg-rose-600' : 'bg-amber-600'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p
                className={`text-xs font-bold truncate flex items-center gap-1.5 ${
                  expiredProducts.length > 0 ? 'text-rose-950 dark:text-rose-200' : 'text-amber-950 dark:text-amber-200'
                }`}
              >
                {expiredProducts.length > 0 && (
                  <span className="font-extrabold text-rose-700 dark:text-rose-300">
                    {expiredProducts.length} Expired
                  </span>
                )}
                {expiredProducts.length > 0 && expiringSoonProducts.length > 0 && ' & '}
                {expiringSoonProducts.length > 0 && (
                  <span>{expiringSoonProducts.length} Expiring Soon</span>
                )}
              </p>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  expiredProducts.length > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-amber-800 dark:text-amber-400'
                }`}
              >
                Window: ≤ {settings.expiry_warning_days} days · Sell or return to supplier soon
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToInventory('expiry')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-bold shrink-0 transition-all active:scale-[0.98] min-h-[38px] ${
              expiredProducts.length > 0
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <span>Inspect Expiry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
