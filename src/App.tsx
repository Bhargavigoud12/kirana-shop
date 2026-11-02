/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Navbar, NavTab } from './components/Navbar';
import { HomeScreen } from './screens/HomeScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { ReportsPlaceholderScreen } from './screens/PlaceholderScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { loading } = useInventory();
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-600 space-y-3">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-800">Starting Munshi Offline Database...</p>
        <p className="text-xs text-slate-400">Loading IndexedDB storage and kirana catalog</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header */}
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-20">
        {activeTab === 'home' && <HomeScreen onSelectTab={setActiveTab} />}
        {activeTab === 'products' && <ProductsScreen />}
        {activeTab === 'inventory' && <InventoryScreen />}
        {activeTab === 'reports' && <ReportsPlaceholderScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}
