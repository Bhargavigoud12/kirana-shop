import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Clock,
  Store,
  RotateCcw,
  Check,
  Download,
  Upload,
  Cloud,
  HardDrive,
  Globe,
  MapPin,
  Phone,
  User,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import { backupService } from '../services/backupService';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetDemoData,
    products,
    ledger,
    categories,
    expiringProducts,
    refreshData,
  } = useInventory();
  const { theme, toggleTheme, isDark } = useTheme();

  // Settings State
  const [expiryDays, setExpiryDays] = useState<number>(settings.expiry_warning_days || 7);
  const [storeName, setStoreName] = useState<string>(settings.store_name);
  const [ownerName, setOwnerName] = useState<string>(settings.owner_name);
  const [phone, setPhone] = useState<string>(settings.phone_number);
  const [address, setAddress] = useState<string>('Main Bazaar, Near Clock Tower, Telangana');
  const [language, setLanguage] = useState<'telugu' | 'hindi' | 'english' | 'hinglish'>(
    settings.language || 'hinglish'
  );
  const [currency, setCurrency] = useState<string>(settings.currency || '₹');

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [storageUsage, setStorageUsage] = useState<{ usageMB: string; quotaMB: string }>({
    usageMB: '0.8',
    quotaMB: 'Local Offline',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    backupService.getStorageEstimate().then(setStorageUsage);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        store_name: storeName.trim() || 'Munshi Kirana Store',
        owner_name: ownerName.trim() || 'Kirana Owner',
        phone_number: phone.trim(),
        language,
        currency,
        expiry_warning_days: Math.max(1, Math.min(90, Number(expiryDays) || 7)),
      });
      setSaveStatus('Store profile and preferences saved!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Failed to update profile');
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

  const handleExportBackup = async () => {
    try {
      await backupService.exportBackup();
      setSaveStatus('Complete database JSON backup downloaded!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Backup export failed');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirm = window.confirm(
      `Restore database from "${file.name}"?\n\nWARNING: This will replace all existing products, bills, customers, and stock ledger entries with the contents of the backup file.`
    );
    if (!confirm) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      const res = await backupService.importBackup(text);
      await refreshData();
      setSaveStatus(`Database successfully restored (${res.recordCount} records loaded)!`);
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Backup import failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings & Local Backup</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Shop profile, lighting theme, Indic language preference, offline backup JSON, and database controls
        </p>
      </div>

      {saveStatus && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* High-Contrast Dark Mode Toggle Section */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">High-Contrast Dark Mode</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Better visibility and reduced screen glare in dim shop environments
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] ${
              isDark
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-200" /> : <Moon className="w-4 h-4 text-slate-300" />}
            <span>{isDark ? 'Dark (Active)' : 'Light (Active)'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Tailored for Indian kirana store counters during evening hours or under dim fluorescent lighting.
        </p>
      </section>

      {/* Shop Profile & Language Settings Form */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Kirana Store Profile</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Shop name, address, and primary language</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Shop / Dukaan Name</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Shop Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              placeholder="e.g. Main Road, Beside SBI ATM, Hyderabad"
            />
          </div>

          {/* Language & Currency Preference */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Language Preference</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="hinglish">Hinglish (Mixed)</option>
                <option value="hindi">Hindi (हिंदी)</option>
                <option value="telugu">Telugu (తెలుగు)</option>
                <option value="english">English (Indian)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold tabular-nums"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-md min-h-[48px]"
          >
            Save Shop Profile & Preferences
          </button>
        </form>
      </section>

      {/* Expiry Warning Window Configuration */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Expiry Alert Warning Window</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Threshold in days before expiry date to trigger warnings and alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="number"
            min="1"
            max="90"
            value={expiryDays}
            onChange={(e) => setExpiryDays(parseInt(e.target.value) || 1)}
            className="w-28 px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-extrabold tabular-nums"
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">days before product expiry</span>

          <button
            type="button"
            onClick={async () => {
              await updateSettings({ expiry_warning_days: Number(expiryDays) || 7 });
              setSaveStatus('Expiry warning window updated!');
              setTimeout(() => setSaveStatus(null), 3000);
            }}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold ml-auto min-h-[40px] border border-transparent dark:border-slate-700"
          >
            Update
          </button>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Currently, {expiringProducts.length} items trigger alert banners within this {expiryDays}-day window.
        </p>
      </section>

      {/* Local Database Backup & Restore (JSON Export / Import) */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Local Data Backup & Restore</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download complete offline database backup or restore from previous JSON file
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">Device Storage Estimate:</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Usage: ~{storageUsage.usageMB} MB ({storageUsage.quotaMB})</span>
          </div>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
            ● 100% Offline
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] min-h-[48px] flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          {/* Import Button */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all active:scale-[0.98] min-h-[48px] flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Import JSON Backup</span>
            </button>
          </div>
        </div>
      </section>

      {/* Cloud Sync Coming Soon Card (PDF Requirement) */}
      <section className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-2 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Cloud Sync & Multi-Device Backup</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
            Coming Soon
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Background cloud sync with conflict resolution and multi-device support (owner and helper phones) will be available in the upcoming cloud release. All your local data will sync automatically when cloud is connected.
        </p>
      </section>

      {/* Reset Demo Data */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between gap-3 transition-colors">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reset Demo Catalog</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Restore fresh sample kirana staples, near-expiry dairy items, and initial opening stock ledger entries.
          </p>
        </div>
        <button
          type="button"
          disabled={isResetting}
          onClick={handleResetData}
          className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50 min-h-[44px] border border-transparent dark:border-slate-700"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Demo</span>
        </button>
      </section>
    </div>
  );
};
