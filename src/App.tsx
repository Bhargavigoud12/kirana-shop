/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Navbar, NavTab } from './components/Navbar';
import { HomeScreen } from './screens/HomeScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { InventoryScreen, InventoryTab } from './screens/InventoryScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { loading } = useInventory();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [inventorySubTab, setInventorySubTab] = useState<InventoryTab>('all');
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);

  const handleSelectTab = (tab: NavTab, subTab?: InventoryTab) => {
    setActiveTab(tab);
    if (subTab) {
      setInventorySubTab(subTab);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-600 space-y-3">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        <p className="text-sm font-bold text-slate-800">Starting Munshi Offline Engine...</p>
        <p className="text-xs text-slate-400">Loading IndexedDB storage & kirana catalog</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => handleSelectTab(tab)}
        onOpenVoice={() => setIsVoiceOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-20">
        {activeTab === 'home' && (
          <HomeScreen onSelectTab={handleSelectTab} />
        )}
        {activeTab === 'products' && <ProductsScreen />}
        {activeTab === 'inventory' && (
          <InventoryScreen initialTab={inventorySubTab} />
        )}
        {activeTab === 'reports' && <ReportsScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </main>

      {/* Global Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onNavigateTab={handleSelectTab}
      />
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
