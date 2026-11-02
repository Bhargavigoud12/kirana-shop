import React from 'react';
import { Store, Package, Layers, BarChart3, Settings, AlertTriangle, Clock, Database, Sun, Moon } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';

export type NavTab = 'home' | 'products' | 'inventory' | 'reports' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenVoice?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab, onOpenVoice }) => {
  const { settings, lowStockProducts, expiringProducts } = useInventory();
  const { isDark, toggleTheme } = useTheme();

  const lowCount = lowStockProducts.length;
  const expCount = expiringProducts.length;

  return (
    <>
      {/* Top Mobile/Desktop Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs transition-colors duration-150">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {settings.store_name || 'Munshi Kirana'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Offline-First DB</span>
                <span>·</span>
                <span>{settings.owner_name}</span>
              </p>
            </div>
          </div>

          {/* Action & Alert Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* High-Contrast Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to High-Contrast Dark Mode'}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl text-slate-600 dark:text-amber-400 hover:text-slate-900 dark:hover:text-amber-300 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 transition-colors flex items-center justify-center border border-transparent dark:border-slate-700/60"
              title={isDark ? 'Switch to Light Mode' : 'Switch to High-Contrast Dark Mode for Dim Shop'}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400 animate-in spin-in-90 duration-200" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>

            {lowCount > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab('inventory')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                title={`${lowCount} products low in stock`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">{lowCount} Low</span>
                <span className="sm:hidden">{lowCount}</span>
              </button>
            )}

            {expCount > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab('inventory')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                title={`${expCount} products expiring within ${settings.expiry_warning_days} days`}
              >
                <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="hidden sm:inline">{expCount} Expiry</span>
                <span className="sm:hidden">{expCount}</span>
              </button>
            )}

            {onOpenVoice && (
              <button
                type="button"
                onClick={onOpenVoice}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors min-h-[44px]"
                title="Open Voice Assistant"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="hidden xs:inline">Voice POS</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className="p-2 min-h-[44px] min-w-[44px] rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
              title="Settings & Storage"
            >
              <Database className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Bottom Navigation (Mobile + Counter Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg transition-colors duration-150">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
          {/* Home / Counter */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'home'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
              activeTab === 'products'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
              activeTab === 'inventory'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
              activeTab === 'reports'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
              activeTab === 'settings'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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

