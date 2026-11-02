import React, { useState, useMemo } from 'react';
import { Search, Plus, Tag, AlertTriangle, Clock, Layers, Archive } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Product } from '../types/inventory';

interface ProductsScreenProps {
  onOpenAddModal?: () => void;
  onOpenEditModal?: (product: Product) => void;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ onOpenAddModal, onOpenEditModal }) => {
  const { products, categories, settings } = useInventory();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

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
        const barcodeMatch = p.barcode.toLowerCase().includes(q);
        const aliasMatch = p.aliases.some((a) => a.toLowerCase().includes(q));
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
          <h2 className="text-xl font-bold text-slate-900">Product Catalog</h2>
          <p className="text-xs text-slate-500">
            {filteredProducts.length} items shown · Multi-alias indexing active
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors min-h-[48px]"
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
          placeholder="Search by name, barcode, or alias (e.g. chawal, atta, tel)..."
          className="w-full pl-10 pr-4 py-2.5 bg-white text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCat('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            selectedCat === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Active vs Archived Toggle */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>Showing {showArchived ? 'Archived / Hidden' : 'Active'} Items</span>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className="text-amber-700 hover:text-amber-800 font-semibold underline flex items-center gap-1"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>{showArchived ? 'View Active Catalog' : 'View Archived Products'}</span>
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No products match your search</p>
            <p className="text-xs text-slate-400">Try a different keyword or add a new product</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLow = p.current_stock <= p.low_stock_threshold;
            const isOut = p.current_stock <= 0;
            const categoryName = categories.find((c) => c.category_id === p.category_id)?.name || 'General';

            return (
              <div
                key={p.product_id}
                onClick={() => onOpenEditModal && onOpenEditModal(p)}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer hover:border-amber-400 ${
                  isOut
                    ? 'border-rose-300 bg-rose-50/20'
                    : isLow
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-slate-500">{categoryName}</span>
                      {p.barcode && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {p.barcode}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.name}</h3>

                    {/* Regional Aliases Display */}
                    {p.aliases && p.aliases.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <Tag className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="text-[11px] text-slate-500">
                          {p.aliases.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stock & Price Badges */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-slate-900 tabular-nums">
                      {settings.currency} {p.selling_price}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Cost: {settings.currency} {p.purchase_price}
                    </div>

                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                          isOut
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.current_stock} {p.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expiry / Warning Info */}
                {(isLow || p.expiry_date) && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    {isLow ? (
                      <span className="text-amber-700 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Low Stock (Threshold: {p.low_stock_threshold} {p.unit})</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    {p.expiry_date && (
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Expiry: {p.expiry_date}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
