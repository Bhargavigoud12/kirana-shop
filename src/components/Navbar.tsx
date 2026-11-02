import React from 'react';
import { Store, Package, Layers, BarChart3, Settings, AlertTriangle, Clock, Database } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export type NavTab = 'home' | 'products' | 'inventory' | 'reports' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenVoice?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab, onOpenVoice }) => {
  const { settings, lowStockProducts, expiringProducts } = useInventory();

  const lowCount = lowStockProducts.length;
  const expCount = expiringProducts.length;

  return (
    <>
      {/* Top Mobile/Desktop Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-slate-900 truncate">
                  {settings.store_name || 'Munshi Kirana'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Offline-First DB</span>
                <span>·</span>
                <span>{settings.owner_name}</span>
              </p>
            </div>
          </div>

          {/* Quick Alert Counters */}
          <div className="flex items-center gap-2 shrink-0">
            {lowCount > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab('inventory')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
                title={`${lowCount} products low in stock`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{lowCount} Low</span>
              </button>
            )}

            {expCount > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab('inventory')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors"
                title={`${expCount} products expiring within ${settings.expiry_warning_days} days`}
              >
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>{expCount} Expiry</span>
              </button>
            )}

            {onOpenVoice && (
              <button
                type="button"
                onClick={onOpenVoice}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
                title="Open Voice Assistant"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Voice POS</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Settings & Storage"
            >
              <Database className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Bottom Navigation (Mobile + Counter Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
          {/* Home / Counter */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'home' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[11px] mt-1">Home</span>
          </button>

          {/* Products */}
          <button
            type="button"
            onClick={() => onSelectTab('products')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'products' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[11px] mt-1">Products</span>
          </button>

          {/* Inventory */}
          <button
            type="button"
            onClick={() => onSelectTab('inventory')}
            className={`min-h-[48px] flex flex-col items-center justify-center relative transition-colors ${
              activeTab === 'inventory' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[11px] mt-1">Inventory</span>
            {lowCount + expCount > 0 && (
              <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          {/* Reports */}
          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'reports' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[11px] mt-1">Reports</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'settings' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[11px] mt-1">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
};
