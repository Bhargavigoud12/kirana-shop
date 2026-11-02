import React, { useState } from 'react';
import { Database, Clock, Store, RotateCcw, Check, Sparkles, AlertCircle, Info } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, resetDemoData, products, ledger, categories, expiringProducts } = useInventory();

  const [expiryDays, setExpiryDays] = useState<number>(settings.expiry_warning_days || 7);
  const [storeName, setStoreName] = useState<string>(settings.store_name);
  const [ownerName, setOwnerName] = useState<string>(settings.owner_name);
  const [phone, setPhone] = useState<string>(settings.phone_number);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        expiry_warning_days: Math.max(1, Math.min(90, Number(expiryDays) || 7)),
        store_name: storeName.trim() || 'Munshi Kirana Store',
        owner_name: ownerName.trim() || 'Kirana Owner',
        phone_number: phone.trim(),
      });
      setSaveStatus('Settings updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Failed to update settings');
    }
  };

  const handleResetData = async () => {
    const confirm = window.confirm(
      'Are you sure you want to reset all data back to the default Indian kirana demo catalog? This will restore sample products and initial stock ledger entries.'
    );
    if (!confirm) return;

    setIsResetting(true);
    try {
      await resetDemoData();
      setSaveStatus('Demo data successfully reloaded!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Failed to reset data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings & Database</h2>
        <p className="text-xs text-slate-500">
          Configure local store settings, alert thresholds, and monitor offline IndexedDB storage.
        </p>
      </div>

      {saveStatus && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Expiry Warning Window Configuration (Explicit User Requirement) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Expiry Alert Warning Window</h3>
            <p className="text-xs text-slate-500">
              Days before product expiry to trigger alert banners and highlights
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Warning Window (in Days)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="90"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value) || 1)}
                className="w-32 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              />
              <span className="text-xs text-slate-600 font-medium">days before expiry</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Currently, {expiringProducts.length} items fall within this {expiryDays}-day warning window.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Warning Window</span>
          </button>
        </div>
      </section>

      {/* Store Profile */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Kirana Store Profile</h3>
            <p className="text-xs text-slate-500">Details displayed on counter and bills</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Shop Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              placeholder="e.g. Sri Lakshmi Kirana General Store"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Owner Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                placeholder="Owner name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                placeholder="+91..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Update Store Profile
          </button>
        </form>
      </section>

      {/* Offline Database Status & Health */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Local IndexedDB Database</h3>
            <p className="text-xs text-slate-500">Offline-first local storage status</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 py-2 mb-3">
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
            <span className="text-xs text-slate-500 block">Products</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{products.length}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
            <span className="text-xs text-slate-500 block">Ledger Logs</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{ledger.length}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
            <span className="text-xs text-slate-500 block">Categories</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{categories.length}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
          <p className="flex items-center gap-1 font-semibold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Database Engine: IndexedDB (munshi_kirana_db v1)
          </p>
          <p>Persistence: Fully local, zero network latency. Data remains saved across browser reloads.</p>
        </div>
      </section>

      {/* Demo Data Reset */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Reset Sample Demo Data</h3>
            <p className="text-xs text-slate-500">
              Restore the initial Indian kirana demo catalog (rice, atta, oil, milk, biscuits, salt) and opening stock audit entries.
            </p>
          </div>
          <button
            type="button"
            disabled={isResetting}
            onClick={handleResetData}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </section>
    </div>
  );
};
