import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Check, Archive, RotateCcw, AlertTriangle, ShieldCheck, Barcode } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Product, ProductUnit } from '../types/inventory';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

const UNIT_OPTIONS: ProductUnit[] = [
  'packet',
  'kg',
  'g',
  'litre',
  'ml',
  'piece',
  'dozen',
  'bag',
  'carton',
  'quintal',
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { categories, createProduct, updateProduct, archiveProduct, settings } = useInventory();

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('packet');
  const [barcode, setBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [openingStock, setOpeningStock] = useState<string>('0');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when editing vs adding
  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategoryId(productToEdit.category_id);
      setUnit(productToEdit.unit);
      setBarcode(productToEdit.barcode || '');
      setPurchasePrice(productToEdit.purchase_price.toString());
      setSellingPrice(productToEdit.selling_price.toString());
      setOpeningStock(productToEdit.current_stock.toString());
      setLowStockThreshold(productToEdit.low_stock_threshold.toString());
      setExpiryDate(productToEdit.expiry_date || '');
      setAliases([...productToEdit.aliases]);
    } else {
      // Default new product values
      setName('');
      setCategoryId(categories[0]?.category_id || 'cat_staples');
      setUnit('packet');
      setBarcode('');
      setPurchasePrice('');
      setSellingPrice('');
      setOpeningStock('0');
      setLowStockThreshold('5');
      setExpiryDate('');
      setAliases([]);
    }
    setAliasInput('');
    setErrorMsg(null);
  }, [productToEdit, categories, isOpen]);

  if (!isOpen) return null;

  // Add Alias tag
  const handleAddAlias = () => {
    const trimmed = aliasInput.trim().toLowerCase();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed]);
      setAliasInput('');
    }
  };

  // Remove Alias tag
  const handleRemoveAlias = (tagToRemove: string) => {
    setAliases(aliases.filter((t) => t !== tagToRemove));
  };

  // Handle enter key in alias input
  const handleAliasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAlias();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Product name is required');
      return;
    }

    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;
    const threshold = parseFloat(lowStockThreshold) || 0;

    if (sPrice < 0 || pPrice < 0) {
      setErrorMsg('Prices cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      if (productToEdit) {
        // Edit existing product metadata
        await updateProduct(productToEdit.product_id, {
          name: name.trim(),
          category_id: categoryId,
          unit,
          barcode: barcode.trim(),
          purchase_price: pPrice,
          selling_price: sPrice,
          low_stock_threshold: threshold,
          expiry_date: expiryDate.trim() || null,
          aliases,
        });
      } else {
        // Create new product with opening stock
        const opStock = Math.max(0, parseFloat(openingStock) || 0);

        await createProduct(
          {
            name: name.trim(),
            category_id: categoryId,
            unit,
            barcode: barcode.trim(),
            purchase_price: pPrice,
            selling_price: sPrice,
            low_stock_threshold: threshold,
            expiry_date: expiryDate.trim() || null,
            image_path: null,
            aliases,
            is_active: true,
          },
          opStock
        );
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!productToEdit) return;
    const confirmText = productToEdit.is_active
      ? `Archive "${productToEdit.name}"? It will be hidden from the active counter catalog, but historical ledger logs remain intact.`
      : `Restore "${productToEdit.name}" to the active catalog?`;

    if (!window.confirm(confirmText)) return;

    try {
      await archiveProduct(productToEdit.product_id, productToEdit.is_active);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change archive status');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {productToEdit ? 'Edit Product Details' : 'Add New Product'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {productToEdit
                ? 'Update prices, aliases, threshold, or archive'
                : 'Enter SKU details and optional opening stock'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sona Masoori Rice 25kg or Maggi 70g"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multilingual Product Aliases (Telugu, Hindi, Hinglish, Nicknames) */}
          <div className="bg-amber-50/50 rounded-2xl p-3.5 border border-amber-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Product Aliases & Regional Names</span>
              </label>
              <span className="text-[10px] text-amber-800 font-medium">Telugu, Hindi & Hinglish</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Add spoken names so shopkeepers and voice search can find this product (e.g. <em>chawal</em>, <em>biyyam</em>, <em>atta</em>, <em>tel</em>).
            </p>

            {/* Tag List */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white rounded-xl border border-amber-200">
              {aliases.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No aliases added yet</span>
              ) : (
                aliases.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(tag)}
                      className="w-4 h-4 rounded-full hover:bg-amber-200 flex items-center justify-center text-amber-800"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Alias Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={handleAliasKeyDown}
                placeholder="Type alias and press Enter (e.g. chawal)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
              <button
                type="button"
                onClick={handleAddAlias}
                className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Barcode Field (User requirement: Manual input with scanning-coming-soon placeholder) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-slate-600" />
                <span>Barcode (EAN / UPC / Code)</span>
              </label>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Scanner coming soon
              </span>
            </div>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode scanning coming soon — or enter numbers manually"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-800 placeholder:text-slate-400 placeholder:font-sans"
            />
          </div>

          {/* Pricing: Purchase & Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Purchase Cost ({settings.currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Selling Price ({settings.currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 tabular-nums"
              />
            </div>
          </div>

          {/* Stock Details: Opening Stock or Read-only Current Stock */}
          {!productToEdit ? (
            <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Opening Stock Quantity ({unit})</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Atomic Ledger
                </span>
              </div>
              <input
                type="number"
                step="any"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900 tabular-nums bg-white"
              />
              <p className="text-[11px] text-emerald-700 mt-1.5 leading-snug">
                If &gt; 0, an <strong>OPENING_STOCK</strong> ledger entry will be atomically created in the same transaction to maintain audit integrity.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Current Stock</span>
                <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {productToEdit.current_stock} {productToEdit.unit}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Current stock cannot be edited directly here to preserve inventory integrity. Use <strong>Inventory &gt; Audit Fix</strong> or <strong>Purchase</strong> to adjust stock.
              </p>
            </div>
          )}

          {/* Low Stock Threshold & Expiry Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Low-Stock Alert Level
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold tabular-nums"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Alerts when ≤ this level</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Warning window: {settings.expiry_warning_days} days
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            {productToEdit ? (
              <button
                type="button"
                onClick={handleToggleArchive}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  productToEdit.is_active
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {productToEdit.is_active ? (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Product</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Product</span>
                  </>
                )}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
              >
                <Check className="w-4 h-4" />
                <span>{productToEdit ? 'Save Changes' : 'Create Product'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
