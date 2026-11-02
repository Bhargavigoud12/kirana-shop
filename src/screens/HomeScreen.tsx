import React, { useState } from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Mic,
  AlertOctagon,
  Sparkles,
  Volume2,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  WifiOff,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { AlertBanner } from '../components/AlertBanner';
import { NavTab } from '../components/Navbar';
import { InventoryTab } from './InventoryScreen';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import { billingService } from '../services/billingService';
import { Product } from '../types/inventory';

interface CartItem {
  product: Product;
  quantity: number;
}

interface HomeScreenProps {
  onSelectTab: (tab: NavTab, subTab?: InventoryTab) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTab }) => {
  const {
    activeProducts,
    settings,
    totalSkus,
    totalInventoryCostValue,
    totalInventoryRetailValue,
    lowStockProducts,
    outOfStockProducts,
    expiredProducts,
    expiringSoonProducts,
    refreshData,
  } = useInventory();

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutFeedback, setCheckoutFeedback] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  const totalExpiring = expiredProducts.length + expiringSoonProducts.length;

  // Add item to quick counter bill
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          alert(`Cannot add more than available stock (${product.current_stock} ${product.unit}).`);
          return prev;
        }
        return prev.map((i) =>
          i.product.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (product.current_stock <= 0) {
        alert(`${product.name} is currently out of stock!`);
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.product_id === productId) {
            const newQty = i.quantity + delta;
            if (newQty > i.product.current_stock) {
              alert(`Cannot exceed available stock of ${i.product.current_stock} ${i.product.unit}`);
              return i;
            }
            return { ...i, quantity: newQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.product_id !== productId));
  };

  // Cart total calculations
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.product.selling_price, 0);

  // Quick checkout execution
  const handleCheckout = async (paymentMode: 'cash' | 'upi' | 'credit') => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    setCheckoutFeedback(null);

    try {
      const res = await billingService.createBillWithStockDeduction(
        cart.map((i) => ({
          product: i.product,
          quantity: i.quantity,
        })),
        { paymentMode }
      );

      setCheckoutFeedback(
        `Bill ${res.bill.bill_number} created (₹${res.bill.total} via ${paymentMode.toUpperCase()})! Stock updated.`
      );
      setCart([]);
      await refreshData();
      setTimeout(() => setCheckoutFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Offline Status Indicator (Non-negotiable UX Rule) */}
      <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-200 text-xs font-semibold flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>Offline-ready — data saved on this device</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">IndexedDB Active</span>
      </div>

      {/* Non-blocking Warning Banners (Low Stock, Out of Stock, Expiry) */}
      <AlertBanner onNavigateToInventory={(subTab) => onSelectTab('inventory', subTab)} />

      {/* Kirana Header & Valuation Card */}
      <div className="bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 rounded-3xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
            Counter POS & Inventory
          </span>
          <span className="text-xs text-amber-200 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit Ledger Active</span>
          </span>
        </div>
        <h2 className="text-xl font-black tracking-tight">{settings.store_name}</h2>
        <p className="text-xs text-amber-100/90 mt-1">
          Namaste, {settings.owner_name}! All bills automatically deduct inventory and log audit entries.
        </p>

        {/* Valuation Strip */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-white/15">
          <div>
            <span className="text-[11px] text-amber-200 block">Total Stock Cost</span>
            <span className="text-xl font-extrabold text-white tabular-nums">
              {settings.currency} {totalInventoryCostValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-amber-200 block">Estimated Retail Value</span>
            <span className="text-xl font-extrabold text-emerald-300 tabular-nums">
              {settings.currency} {totalInventoryRetailValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* PRIMARY VOICE ASSISTANT MIC CARD (Core Primary Action) */}
      <div className="bg-gradient-to-b from-white to-amber-50/50 rounded-3xl border-2 border-amber-300 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Voice Counter Assistant
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            <span>Web Speech API</span>
          </span>
        </div>

        {/* Big Mic Button (112px touch target) */}
        <div className="text-center py-1">
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-xl hover:shadow-2xl transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ring-8 ring-amber-100 min-h-[48px]"
          >
            <Mic className="w-12 h-12" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              Tap & Speak
            </span>
          </button>
          <p className="text-xs font-bold text-amber-950 mt-3">
            "Do kilo chawal, ek atta packet, teen Maggi"
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Voice-first POS: create bills, add stock, check low stock, or ask udhaar balance.
          </p>
        </div>

        {/* Quick Voice Chips */}
        <div className="pt-2 border-t border-amber-200/60 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 font-semibold whitespace-nowrap shrink-0 hover:bg-amber-100 transition-colors min-h-[40px]"
          >
            🎙️ "Do kilo chawal, teen Maggi"
          </button>
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 font-semibold whitespace-nowrap shrink-0 hover:bg-amber-100 transition-colors min-h-[40px]"
          >
            📦 "Aaj 10 kilo chawal aaya"
          </button>
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 font-semibold whitespace-nowrap shrink-0 hover:bg-amber-100 transition-colors min-h-[40px]"
          >
            📊 "Aaj ka report sunao"
          </button>
        </div>
      </div>

      {/* QUICK COUNTER BILLING DOCK (Touch Fallback on Home) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-amber-600" />
            <span>Counter Bill & Quick Sale</span>
          </h3>
          <span className="text-xs font-extrabold text-slate-900 tabular-nums">
            {cart.length} items in cart
          </span>
        </div>

        {checkoutFeedback && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{checkoutFeedback}</span>
          </div>
        )}

        {/* Cart Items List */}
        {cart.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
            <p className="text-xs text-slate-500 font-medium">Cart is currently empty.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Speak an order or tap items below to create a customer bill.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.product.product_id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 truncate block">{item.product.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {settings.currency} {item.product.selling_price} / {item.product.unit} · Stock: {item.product.current_stock}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.product.product_id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-extrabold tabular-nums px-1 text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.product.product_id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-bold text-slate-900 tabular-nums">
                      {settings.currency} {item.quantity * item.product.selling_price}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.product.product_id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Strip */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Total Bill Amount:</span>
              <span className="text-lg font-black text-amber-950 tabular-nums">
                {settings.currency} {cartTotal}
              </span>
            </div>

            {/* Checkout Action Buttons (48px+ touch targets) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={isCheckingOut}
                onClick={() => handleCheckout('cash')}
                className="py-3 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] min-h-[48px] flex flex-col items-center justify-center gap-0.5"
              >
                <Banknote className="w-4 h-4" />
                <span>Cash Sale</span>
              </button>

              <button
                type="button"
                disabled={isCheckingOut}
                onClick={() => handleCheckout('upi')}
                className="py-3 px-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] min-h-[48px] flex flex-col items-center justify-center gap-0.5"
              >
                <QrCode className="w-4 h-4" />
                <span>UPI Pay</span>
              </button>

              <button
                type="button"
                disabled={isCheckingOut}
                onClick={() => handleCheckout('credit')}
                className="py-3 px-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] min-h-[48px] flex flex-col items-center justify-center gap-0.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Udhaar</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Product Tap Shelf */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Tap Fast-Moving Item to Add:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activeProducts.slice(0, 7).map((p) => (
              <button
                key={p.product_id}
                type="button"
                onClick={() => handleAddToCart(p)}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left shrink-0 transition-colors min-h-[44px]"
              >
                <span className="font-bold text-xs text-slate-900 block truncate max-w-[120px]">{p.name}</span>
                <span className="text-[10px] text-slate-500 font-semibold tabular-nums">
                  {settings.currency} {p.selling_price} · {p.current_stock} in stock
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Snapshot Metric Tiles */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 px-0.5">
          Inventory Snapshot
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Catalog SKUs */}
          <button
            type="button"
            onClick={() => onSelectTab('products')}
            className="bg-white rounded-2xl p-4 border border-slate-200 text-left shadow-xs hover:border-amber-400 transition-all min-h-[48px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Total Catalog</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">{totalSkus}</div>
            <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span>View Products</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </button>

          {/* Out of Stock Critical Danger Tile */}
          <button
            type="button"
            onClick={() => onSelectTab('inventory', 'out_of_stock')}
            className={`rounded-2xl p-4 border text-left shadow-xs transition-all min-h-[48px] ${
              outOfStockProducts.length > 0
                ? 'bg-rose-50/80 border-rose-300 hover:border-rose-400'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Out of Stock</span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  outOfStockProducts.length > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-black tabular-nums ${
                outOfStockProducts.length > 0 ? 'text-rose-900' : 'text-slate-900'
              }`}
            >
              {outOfStockProducts.length}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span>{outOfStockProducts.length > 0 ? 'Urgent Reorder' : 'All Stocked'}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </button>

          {/* Low Stock Warning Amber Tile */}
          <button
            type="button"
            onClick={() => onSelectTab('inventory', 'low_stock')}
            className={`rounded-2xl p-4 border text-left shadow-xs transition-all min-h-[48px] ${
              lowStockProducts.length > 0
                ? 'bg-amber-50/80 border-amber-300 hover:border-amber-400'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Low Stock</span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  lowStockProducts.length > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-black tabular-nums ${
                lowStockProducts.length > 0 ? 'text-amber-900' : 'text-slate-900'
              }`}
            >
              {lowStockProducts.length}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span>{lowStockProducts.length > 0 ? 'Below Threshold' : 'Stock Healthy'}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </button>

          {/* Expiring Soon Tile */}
          <button
            type="button"
            onClick={() => onSelectTab('inventory', 'expiry')}
            className={`rounded-2xl p-4 border text-left shadow-xs transition-all min-h-[48px] ${
              totalExpiring > 0
                ? 'bg-rose-50/80 border-rose-300 hover:border-rose-400'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Expiring Soon</span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  totalExpiring > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-black tabular-nums ${
                totalExpiring > 0 ? 'text-rose-900' : 'text-slate-900'
              }`}
            >
              {totalExpiring}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span>≤ {settings.expiry_warning_days}d window</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </button>
        </div>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onNavigateTab={onSelectTab}
      />
    </div>
  );
};
