import React from 'react';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface AlertBannerProps {
  onNavigateToInventory: (filterTab?: 'low_stock' | 'expiry') => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onNavigateToInventory }) => {
  const { lowStockProducts, expiringProducts, expiredProducts, settings } = useInventory();

  if (lowStockProducts.length === 0 && expiringProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {/* Low Stock Banner */}
      {lowStockProducts.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900 truncate">
                {lowStockProducts.length} items low or out of stock!
              </p>
              <p className="text-xs text-amber-700 truncate">
                {lowStockProducts.slice(0, 2).map((p) => p.name).join(', ')}
                {lowStockProducts.length > 2 ? ` +${lowStockProducts.length - 2} more` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToInventory('low_stock')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 transition-colors"
          >
            <span>Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expiry Banner (Driven by configurable settings.expiry_warning_days) */}
      {expiringProducts.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-900 truncate">
                {expiredProducts.length > 0 ? `${expiredProducts.length} expired & ` : ''}
                {expiringProducts.length} items near expiry
              </p>
              <p className="text-xs text-rose-700 truncate">
                Warning window: {settings.expiry_warning_days} days (Sell or return soon)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToInventory('expiry')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 transition-colors"
          >
            <span>Inspect</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
