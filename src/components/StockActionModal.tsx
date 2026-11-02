import React, { useState, useEffect, useMemo } from 'react';
import { X, PlusCircle, MinusCircle, SlidersHorizontal, AlertTriangle, ShieldCheck, Check, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Product, StockMovementType } from '../types/inventory';

export type StockModalMode = 'PURCHASE' | 'REMOVE_STOCK' | 'MANUAL_FIX';

interface StockActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: StockModalMode;
  preselectedProduct?: Product | null;
}

export const StockActionModal: React.FC<StockActionModalProps> = ({
  isOpen,
  onClose,
  mode,
  preselectedProduct,
}) => {
  const { activeProducts, addStock, removeStock, correctStock, settings } = useInventory();

  // Selected product
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');

  // Mode: PURCHASE
  const [purchaseQuantity, setPurchaseQuantity] = useState<string>('');
  const [updatedPurchasePrice, setUpdatedPurchasePrice] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [purchaseReason, setPurchaseReason] = useState<string>('');

  // Mode: REMOVE_STOCK
  const [removeMovementType, setRemoveMovementType] = useState<'DAMAGE' | 'EXPIRY'>('DAMAGE');
  const [removeQuantity, setRemoveQuantity] = useState<string>('');
  const [removeReason, setRemoveReason] = useState<string>('');

  // Mode: MANUAL_FIX
  const [physicalCount, setPhysicalCount] = useState<string>('');
  const [fixReason, setFixReason] = useState<string>('');

  // General states
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize modal state on open or product change
  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct.product_id);
      setUpdatedPurchasePrice(preselectedProduct.purchase_price.toString());
      setPhysicalCount(preselectedProduct.current_stock.toString());
    } else if (activeProducts.length > 0) {
      setSelectedProductId(activeProducts[0].product_id);
      setUpdatedPurchasePrice(activeProducts[0].purchase_price.toString());
      setPhysicalCount(activeProducts[0].current_stock.toString());
    }
    setProductSearch('');
    setPurchaseQuantity('');
    setSupplierName('');
    setPurchaseReason('');
    setRemoveMovementType('DAMAGE');
    setRemoveQuantity('');
    setRemoveReason('');
    setFixReason('');
    setIsConfirming(false);
    setErrorMsg(null);
  }, [isOpen, preselectedProduct, activeProducts, mode]);

  // Current selected product object
  const currentProduct = useMemo(() => {
    return activeProducts.find((p) => p.product_id === selectedProductId) || null;
  }, [activeProducts, selectedProductId]);

  // When changing selected product, sync default fields
  const handleSelectProduct = (p: Product) => {
    setSelectedProductId(p.product_id);
    setUpdatedPurchasePrice(p.purchase_price.toString());
    setPhysicalCount(p.current_stock.toString());
    setErrorMsg(null);
    setIsConfirming(false);
  };

  if (!isOpen) return null;

  // Filtered products list for product search dropdown
  const searchableProducts = activeProducts.filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.aliases && p.aliases.some((a) => a.toLowerCase().includes(q)))
    );
  });

  // Derived math for calculations
  const parsedQty = parseFloat(mode === 'PURCHASE' ? purchaseQuantity : removeQuantity) || 0;
  const parsedPhysical = parseFloat(physicalCount) || 0;
  const currentStock = currentProduct?.current_stock || 0;

  // Difference for manual fix: difference = physical_stock - current_stock
  const calculatedDifference = Math.round((parsedPhysical - currentStock) * 1000) / 1000;

  // Resulting stock for confirmation
  let resultingStock = currentStock;
  if (mode === 'PURCHASE') {
    resultingStock = Math.round((currentStock + parsedQty) * 1000) / 1000;
  } else if (mode === 'REMOVE_STOCK') {
    resultingStock = Math.max(0, Math.round((currentStock - parsedQty) * 1000) / 1000);
  } else if (mode === 'MANUAL_FIX') {
    resultingStock = parsedPhysical;
  }

  // Pre-flight validation before entering confirmation view
  const validateBeforeConfirm = (): boolean => {
    setErrorMsg(null);

    if (!currentProduct) {
      setErrorMsg('Please select a product first');
      return false;
    }

    if (mode === 'PURCHASE') {
      if (parsedQty <= 0) {
        setErrorMsg('Purchase quantity must be greater than 0');
        return false;
      }
      const cost = parseFloat(updatedPurchasePrice);
      if (cost < 0) {
        setErrorMsg('Purchase cost cannot be negative');
        return false;
      }
    } else if (mode === 'REMOVE_STOCK') {
      if (parsedQty <= 0) {
        setErrorMsg('Quantity removed must be greater than 0');
        return false;
      }
      if (parsedQty > currentStock) {
        setErrorMsg(
          `Cannot remove ${parsedQty} ${currentProduct.unit}. Current stock is only ${currentStock} ${currentProduct.unit}. Stock cannot become negative.`
        );
        return false;
      }
      if (!removeReason.trim()) {
        setErrorMsg('A mandatory reason is required to remove damaged or expired stock');
        return false;
      }
    } else if (mode === 'MANUAL_FIX') {
      if (parsedPhysical < 0) {
        setErrorMsg('Physical stock count cannot be negative');
        return false;
      }
      if (!fixReason.trim()) {
        setErrorMsg('A mandatory reason is required for manual stock correction');
        return false;
      }
    }

    return true;
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateBeforeConfirm()) {
      setIsConfirming(true);
    }
  };

  const handleFinalExecute = async () => {
    if (!currentProduct) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (mode === 'PURCHASE') {
        const cost = updatedPurchasePrice ? parseFloat(updatedPurchasePrice) : undefined;
        await addStock(currentProduct.product_id, parsedQty, {
          purchasePrice: cost,
          supplierId: supplierName.trim() || undefined,
          reason: purchaseReason.trim() || `New stock purchase arrival (${supplierName || 'General supplier'})`,
        });
      } else if (mode === 'REMOVE_STOCK') {
        await removeStock(currentProduct.product_id, parsedQty, removeMovementType, removeReason.trim());
      } else if (mode === 'MANUAL_FIX') {
        await correctStock(currentProduct.product_id, parsedPhysical, fixReason.trim());
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Operation failed');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            mode === 'PURCHASE'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
              : mode === 'REMOVE_STOCK'
              ? 'bg-rose-50/70 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100'
              : 'bg-indigo-50/70 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                mode === 'PURCHASE'
                  ? 'bg-emerald-600'
                  : mode === 'REMOVE_STOCK'
                  ? 'bg-rose-600'
                  : 'bg-indigo-600'
              }`}
            >
              {mode === 'PURCHASE' && <PlusCircle className="w-5 h-5" />}
              {mode === 'REMOVE_STOCK' && <MinusCircle className="w-5 h-5" />}
              {mode === 'MANUAL_FIX' && <SlidersHorizontal className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                {mode === 'PURCHASE' && 'Stock In / Purchase Stock'}
                {mode === 'REMOVE_STOCK' && 'Stock Out / Damage & Expiry'}
                {mode === 'MANUAL_FIX' && 'Manual Stock Count Correction'}
              </h3>
              <p className="text-xs opacity-75">
                {mode === 'PURCHASE' && 'Increases stock & creates a PURCHASE ledger entry'}
                {mode === 'REMOVE_STOCK' && 'Deducts stock & creates DAMAGE / EXPIRY ledger entry'}
                {mode === 'MANUAL_FIX' && 'Sets physical count & creates MANUAL_FIX ledger entry'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Selection (Searchable) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Select Product <span className="text-rose-500">*</span>
            </label>
            {preselectedProduct ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{preselectedProduct.name}</h4>
                  <p className="text-xs text-slate-500">
                    Recorded Stock: <span className="font-bold text-slate-800">{preselectedProduct.current_stock} {preselectedProduct.unit}</span>
                  </p>
                </div>
                <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                  {settings.currency} {preselectedProduct.selling_price}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product by name or alias..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const found = activeProducts.find((p) => p.product_id === e.target.value);
                    if (found) handleSelectProduct(found);
                  }}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                >
                  {searchableProducts.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.name} (Stock: {p.current_stock} {p.unit})
                    </option>
                  ))}
                </select>
                {currentProduct && (
                  <p className="text-xs text-slate-500 flex items-center justify-between px-1">
                    <span>
                      Current Recorded Stock: <strong className="text-slate-800">{currentProduct.current_stock} {currentProduct.unit}</strong>
                    </span>
                    <span>Cost: <strong>{settings.currency} {currentProduct.purchase_price}</strong></span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Form Fields: Mode PURCHASE */}
          {mode === 'PURCHASE' && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Purchased Quantity <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={purchaseQuantity}
                      onChange={(e) => {
                        setPurchaseQuantity(e.target.value);
                        setIsConfirming(false);
                      }}
                      placeholder="e.g. 10"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold tabular-nums"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Unit: {currentProduct?.unit}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Purchase Price per Unit ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={updatedPurchasePrice}
                    onChange={(e) => {
                      setUpdatedPurchasePrice(e.target.value);
                      setIsConfirming(false);
                    }}
                    placeholder={currentProduct ? currentProduct.purchase_price.toString() : '0.00'}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Updates product purchase cost</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Supplier / Distributor (Optional)</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => {
                    setSupplierName(e.target.value);
                    setIsConfirming(false);
                  }}
                  placeholder="e.g. Sri Balaji Traders, Hyderabad"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Notes / Invoice Ref (Optional)</label>
                <input
                  type="text"
                  value={purchaseReason}
                  onChange={(e) => {
                    setPurchaseReason(e.target.value);
                    setIsConfirming(false);
                  }}
                  placeholder="e.g. Bill #4812 wholesale delivery"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Form Fields: Mode REMOVE_STOCK */}
          {mode === 'REMOVE_STOCK' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Reason for Stock Deduction <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveMovementType('DAMAGE');
                      setIsConfirming(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      removeMovementType === 'DAMAGE'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>💥 Damaged / Broken</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRemoveMovementType('EXPIRY');
                      setIsConfirming(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      removeMovementType === 'EXPIRY'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>⏰ Expired Stock</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Quantity to Remove ({currentProduct?.unit}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={currentStock}
                  required
                  value={removeQuantity}
                  onChange={(e) => {
                    setRemoveQuantity(e.target.value);
                    setIsConfirming(false);
                  }}
                  placeholder={`Max ${currentStock} ${currentProduct?.unit || ''}`}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold tabular-nums"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Available in stock: {currentStock} {currentProduct?.unit} (cannot go negative)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mandatory Explanation / Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={removeReason}
                  onChange={(e) => {
                    setRemoveReason(e.target.value);
                    setIsConfirming(false);
                  }}
                  placeholder="e.g. 2 packets torn during shelf restock, milk pouch leaking, bread passed sell-by date"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          )}

          {/* Form Fields: Mode MANUAL_FIX (Physical Count Audit) */}
          {mode === 'MANUAL_FIX' && (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Current Recorded Stock</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {currentStock} {currentProduct?.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Audit Verification
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Actual Physical Stock Count <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={physicalCount}
                  onChange={(e) => {
                    setPhysicalCount(e.target.value);
                    setIsConfirming(false);
                  }}
                  placeholder="Enter physical count from shelf"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-extrabold text-indigo-950 tabular-nums"
                />
              </div>

              {/* Calculated Difference Display */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  calculatedDifference === 0
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : calculatedDifference > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {calculatedDifference > 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : calculatedDifference < 0 ? (
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  ) : null}
                  <span className="text-xs font-semibold">
                    Calculated Difference:
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {calculatedDifference > 0 ? `+${calculatedDifference}` : calculatedDifference} {currentProduct?.unit}
                  {calculatedDifference === 0 && ' (No change)'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mandatory Correction Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fixReason}
                  onChange={(e) => {
                    setFixReason(e.target.value);
                    setIsConfirming(false);
                  }}
                  placeholder="e.g. Weekly physical audit miscount, weight moisture loss, supplier bonus pouch"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Confirmation Step Card */}
          {isConfirming && currentProduct && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Please Confirm Stock Ledger Entry:</span>
              </div>

              <div className="bg-white rounded-xl p-3 border border-amber-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <span className="font-bold text-slate-900">{currentProduct.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operation:</span>
                  <span className="font-bold uppercase text-slate-800">
                    {mode === 'PURCHASE' ? 'PURCHASE' : mode === 'REMOVE_STOCK' ? removeMovementType : 'MANUAL_FIX'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Previous Stock:</span>
                  <span className="font-medium text-slate-700 tabular-nums">{currentStock} {currentProduct.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stock Change (Δ):</span>
                  <span
                    className={`font-bold tabular-nums ${
                      mode === 'PURCHASE'
                        ? 'text-emerald-600'
                        : mode === 'REMOVE_STOCK'
                        ? 'text-rose-600'
                        : calculatedDifference >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {mode === 'PURCHASE' && `+${parsedQty} ${currentProduct.unit}`}
                    {mode === 'REMOVE_STOCK' && `-${parsedQty} ${currentProduct.unit}`}
                    {mode === 'MANUAL_FIX' && (calculatedDifference >= 0 ? `+${calculatedDifference}` : `${calculatedDifference}`) + ` ${currentProduct.unit}`}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                  <span className="text-slate-800">New Recorded Stock:</span>
                  <span className="text-slate-900 tabular-nums">{resultingStock} {currentProduct.unit}</span>
                </div>
                {(removeReason || fixReason || purchaseReason) && (
                  <div className="pt-1 text-[11px] text-slate-500 italic">
                    Reason: {removeReason || fixReason || purchaseReason}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            {!isConfirming ? (
              <button
                type="button"
                onClick={handleProceedToConfirm}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] min-h-[44px] ${
                  mode === 'PURCHASE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : mode === 'REMOVE_STOCK'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Review & Confirm
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalExecute}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all active:scale-[0.98] flex items-center gap-1.5 min-h-[44px] ${
                  mode === 'PURCHASE'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : mode === 'REMOVE_STOCK'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-indigo-700 hover:bg-indigo-800'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Commit Ledger Entry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
