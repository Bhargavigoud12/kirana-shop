import React from 'react';
import { Package, Layers, AlertTriangle, Clock, ArrowRight, TrendingUp, Mic, ShieldCheck } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { AlertBanner } from '../components/AlertBanner';
import { NavTab } from '../components/Navbar';

interface HomeScreenProps {
  onSelectTab: (tab: NavTab) => void;
  onOpenAddProduct?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTab }) => {
  const {
    settings,
    totalSkus,
    totalInventoryCostValue,
    totalInventoryRetailValue,
    lowStockProducts,
    expiringProducts,
    expiredProducts,
  } = useInventory();

  return (
    <div className="space-y-5 pb-20">
      {/* Non-blocking Alert Banners (low stock + configurable expiry days) */}
      <AlertBanner onNavigateToInventory={() => onSelectTab('inventory')} />

      {/* Welcome & Overview Header */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-900 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
            Phase 1 · Offline Inventory
          </span>
          <span className="text-xs text-amber-100 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Auditable Ledger Active</span>
          </span>
        </div>
        <h2 className="text-xl font-bold">{settings.store_name}</h2>
        <p className="text-xs text-amber-200 mt-1">
          Namaste, {settings.owner_name}! All stock changes are recorded locally in IndexedDB.
        </p>

        {/* Valuation Strip */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/15">
          <div>
            <span className="text-[11px] text-amber-200 block">Inventory Value (Cost)</span>
            <span className="text-lg font-bold text-white tabular-nums">
              {settings.currency} {totalInventoryCostValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-amber-200 block">Estimated Retail Value</span>
            <span className="text-lg font-bold text-emerald-300 tabular-nums">
              {settings.currency} {totalInventoryRetailValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Metric Tiles */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Products */}
        <button
          type="button"
          onClick={() => onSelectTab('products')}
          className="bg-white rounded-2xl p-4 border border-slate-200 text-left shadow-xs hover:border-amber-400 transition-all min-h-[48px]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Catalog SKUs</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalSkus}</div>
          <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Browse Catalog</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        {/* Low Stock Warning Tile */}
        <button
          type="button"
          onClick={() => onSelectTab('inventory')}
          className={`rounded-2xl p-4 border text-left shadow-xs transition-all min-h-[48px] ${
            lowStockProducts.length > 0
              ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Low Stock</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                lowStockProducts.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              lowStockProducts.length > 0 ? 'text-amber-900' : 'text-slate-900'
            }`}
          >
            {lowStockProducts.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{lowStockProducts.length > 0 ? 'Reorder Needed' : 'Stock Optimal'}</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        {/* Expiring Soon Tile (Configurable window) */}
        <button
          type="button"
          onClick={() => onSelectTab('inventory')}
          className={`rounded-2xl p-4 border text-left shadow-xs transition-all min-h-[48px] ${
            expiringProducts.length > 0
              ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Expiring Soon</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                expiringProducts.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              expiringProducts.length > 0 ? 'text-rose-900' : 'text-slate-900'
            }`}
          >
            {expiringProducts.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>≤ {settings.expiry_warning_days} days window</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        {/* Stock Ledger Tile */}
        <button
          type="button"
          onClick={() => onSelectTab('inventory')}
          className="bg-white rounded-2xl p-4 border border-slate-200 text-left shadow-xs hover:border-amber-400 transition-all min-h-[48px]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Stock Movements</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">Ledger</div>
          <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Audit Trail</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>
      </div>

      {/* Voice Billing Preview Card (Roadmap Context) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Mic className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Voice Billing & Counter</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Phase 2 & 3
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              In upcoming phases, you will be able to speak directly:
              <span className="italic font-medium text-slate-700 block mt-0.5">
                "Do kilo chawal, ek packet atta, teen Maggi"
              </span>
              Munshi's product catalog currently indexes Telugu, Hindi, and English aliases so every spoken item matches instantly!
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Phase 1 Inventory Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectTab('products')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors min-h-[48px]"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Manage Catalog</p>
              <p className="text-[10px] text-slate-500">Add & edit items, aliases</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('inventory')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors min-h-[48px]"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Stock & Ledger</p>
              <p className="text-[10px] text-slate-500">Audit, purchase & fixes</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
