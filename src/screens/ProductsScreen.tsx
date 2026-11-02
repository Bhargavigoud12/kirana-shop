import React, { useState, useMemo } from 'react';
import { Search, Plus, Tag, AlertTriangle, Clock, Layers, Archive, Edit3, Barcode } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Product } from '../types/inventory';
import { ProductFormModal } from '../components/ProductFormModal';

export const ProductsScreen: React.FC = () => {
  const { products, categories, settings } = useInventory();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      // Archive filter
      if (!showArchived && !p.is_active) return false;
      if (showArchived && p.is_active) return false;

      // Category filter
      if (selectedCat !== 'all' && p.category_id !== selectedCat) return false;

      // Query filter: matches name, barcode, or any alias
      if (q) {
        const nameMatch = p.name.toLowerCase().includes(q);
        const barcodeMatch = (p.barcode || '').toLowerCase().includes(q);
        const aliasMatch = (p.aliases || []).some((a) => a.toLowerCase().includes(q));
        if (!nameMatch && !barcodeMatch && !aliasMatch) return false;
      }

      return true;
    });
  }, [products, search, selectedCat, showArchived]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Product Catalog</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredProducts.length} items shown · Multi-alias indexing active
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] min-h-[48px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search Input with multilingual hint */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, barcode, or alias (e.g. chawal, atta, tel, biyyam)..."
          className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCat('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            selectedCat === 'all'
              ? 'bg-slate-900 dark:bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All Categories ({products.filter((p) => (showArchived ? !p.is_active : p.is_active)).length})
        </button>
        {categories.map((c) => {
          const count = products.filter(
            (p) => p.category_id === c.category_id && (showArchived ? !p.is_active : p.is_active)
          ).length;
          return (
            <button
              key={c.category_id}
              type="button"
              onClick={() => setSelectedCat(c.category_id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedCat === c.category_id
                  ? 'bg-slate-900 dark:bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Active vs Archived Toggle */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span>Showing {showArchived ? 'Archived (Hidden)' : 'Active Counter'} Products</span>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold underline flex items-center gap-1"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>{showArchived ? 'Switch to Active Catalog' : 'View Archived Products'}</span>
        </button>
      </div>

      {/* Product Cards List */}
      <div className="space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              {showArchived ? 'No archived products' : 'No products found'}
            </p>
            <p className="text-xs text-slate-400">
              {search
                ? `No matching items for "${search}". Try another keyword or alias.`
                : 'Tap "Add Product" to create your first kirana item.'}
            </p>
            {!showArchived && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            )}
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLow = p.current_stock <= p.low_stock_threshold;
            const isOut = p.current_stock <= 0;
            const categoryName = categories.find((c) => c.category_id === p.category_id)?.name || 'General';

            return (
              <div
                key={p.product_id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-xs transition-all ${
                  !p.is_active
                    ? 'opacity-65 bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                    : isOut
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/30'
                    : isLow
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{categoryName}</span>
                      {p.barcode ? (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Barcode className="w-3 h-3 text-slate-400" />
                            <span>{p.barcode}</span>
                          </span>
                        </>
                      ) : null}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{p.name}</h3>

                    {/* Regional Aliases Display */}
                    {p.aliases && p.aliases.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <Tag className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">
                          {p.aliases.join(', ')}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">No aliases defined</div>
                    )}
                  </div>

                  {/* Stock & Price Badges */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {settings.currency} {p.selling_price}
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      Cost: {settings.currency} {p.purchase_price}
                    </div>

                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                          !p.is_active
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : isOut
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-transparent dark:border-rose-800'
                            : isLow
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-transparent dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800'
                        }`}
                      >
                        {p.current_stock} {p.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Info & Edit Trigger */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3">
                    {p.is_active && isLow ? (
                      <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Threshold: {p.low_stock_threshold} {p.unit}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Unit: {p.unit}</span>
                    )}

                    {p.expiry_date && (
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Exp: {p.expiry_date}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(p)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors min-h-[36px] border border-transparent dark:border-slate-700"
                  >
                    <Edit3 className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />
    </div>
  );
};
