import { FormEvent, useEffect, useState } from 'react';
import { productsApi } from '../api/resources';
import { useAuth } from '../auth/AuthContext';
import { StockBadge } from '../components/common/StockBadge';
import { AdjustStockModal } from '../components/products/AdjustStockModal';
import { StockMovementsView } from '../components/products/StockMovementsView';
import type { Pagination, Product } from '../types';

export default function ProductsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Navigation tab: 'products' or 'movements'
  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Modal states
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    productsApi
      .list({ search, page, limit: 10, sort: 'name', order: 'asc' })
      .then((r) => {
        setProducts(r.data.data);
        setPagination(r.data.pagination);
      })
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  };

  // Debounced reload on search/page change.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Inventory & Products</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage SKU catalog, view stock health, and perform auditable stock adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab selector */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'products'
                  ? 'bg-white text-indigo-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catalog
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'movements'
                  ? 'bg-white text-indigo-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Ledger
            </button>
          </div>

          {activeTab === 'products' && canManage && (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg px-3.5 py-2 shadow-sm transition flex items-center gap-1.5"
            >
              {showForm ? 'Cancel' : '+ New Product'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'movements' ? (
        /* Global Movement History Tab */
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <StockMovementsView />
        </div>
      ) : (
        /* Products Catalog Tab */
        <div className="space-y-4">
          {showForm && canManage && (
            <NewProductForm
              onCreated={() => {
                setShowForm(false);
                load();
              }}
            />
          )}

          {/* Search bar & filter toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search products by name or SKU…"
                className="w-full pl-9 pr-8 border border-slate-300 rounded-lg py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={load}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5"
              title="Refresh Catalog"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
              {error}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <svg className="mx-auto h-9 w-9 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="mt-2 text-sm font-semibold text-slate-700">No products match your search</p>
              <p className="text-xs text-slate-400 mt-0.5">Try searching with a different SKU or product keyword.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-center">Stock Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-600 whitespace-nowrap">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {p.name}
                          {p.description && (
                            <span className="block text-[11px] font-normal text-slate-400 truncate max-w-xs">
                              {p.description}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {p.category?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                          ₹{Number(p.unitPrice).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <StockBadge quantity={p.quantityInStock} reorderLevel={p.reorderLevel} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canManage && (
                              <button
                                onClick={() => setAdjustingProduct(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                                title="Perform auditable stock adjustment"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Adjust Stock
                              </button>
                            )}
                            <button
                              onClick={() => setHistoryProduct(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                              title="View audit trail"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2.5 py-1 border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 font-medium"
                >
                  Prev
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <AdjustStockModal
          product={adjustingProduct}
          isOpen={Boolean(adjustingProduct)}
          onClose={() => setAdjustingProduct(null)}
          onSuccess={() => {
            load();
          }}
        />
      )}

      {/* Per-Product Stock Movements Modal */}
      {historyProduct && (
        <StockMovementsView
          product={historyProduct}
          isModal
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </div>
  );
}

function NewProductForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ sku: '', name: '', unitPrice: '', costPrice: '', quantityInStock: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await productsApi.create({
        sku: form.sku,
        name: form.name,
        unitPrice: Number(form.unitPrice),
        costPrice: Number(form.costPrice),
        quantityInStock: Number(form.quantityInStock || 0),
      });
      onCreated();
    } catch {
      setError('Could not create product (SKU may already exist).');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        required={key !== 'quantityInStock'}
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end animate-fade-in">
      {field('sku', 'SKU')}
      {field('name', 'Product Name')}
      {field('unitPrice', 'Unit Price (₹)', 'number')}
      {field('costPrice', 'Cost Price (₹)', 'number')}
      {field('quantityInStock', 'Initial Stock', 'number')}
      {error && <p className="col-span-full text-xs text-rose-600 font-medium">{error}</p>}
      <button
        disabled={saving}
        className="col-span-full md:col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg py-2 shadow-sm transition"
      >
        {saving ? 'Creating…' : 'Save Product'}
      </button>
    </form>
  );
}
