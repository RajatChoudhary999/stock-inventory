import { useEffect, useState } from 'react';
import { productsApi } from '../../api/resources';
import type { MovementReason, Pagination, Product, StockMovement } from '../../types';

interface StockMovementsViewProps {
  product?: Product | null;
  onClose?: () => void;
  isModal?: boolean;
}

export function StockMovementsView({ product, onClose, isModal = false }: StockMovementsViewProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reasonFilter, setReasonFilter] = useState<MovementReason | ''>('');

  const loadMovements = () => {
    setLoading(true);
    setError(null);

    const params: Record<string, unknown> = {
      page,
      limit: 10,
    };
    if (reasonFilter) params.reason = reasonFilter;

    productsApi
      .movements(product?.id, params)
      .then((res) => {
        setMovements(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => setError('Failed to load stock movements.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, page, reasonFilter]);

  const content = (
    <div className="space-y-4">
      {/* Header / Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {product ? `Audit History — ${product.name}` : 'Stock Movement Ledger (All Products)'}
          </h2>
          <p className="text-xs text-slate-500">
            Immutable audit trail of all manual adjustments, sales, purchases, and returns.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <select
            value={reasonFilter}
            onChange={(e) => {
              setPage(1);
              setReasonFilter(e.target.value as any);
            }}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Movement Types</option>
            <option value="ADJUSTMENT">Adjustments</option>
            <option value="SALE">Sales</option>
            <option value="PURCHASE">Purchases</option>
            <option value="RETURN">Returns</option>
            <option value="DAMAGE">Damages</option>
          </select>
          <button
            onClick={loadMovements}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center gap-1"
            title="Refresh Ledger"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-2 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {error}
        </div>
      ) : movements.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <svg className="mx-auto h-9 w-9 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-sm font-medium text-slate-600">No stock movements recorded</p>
          <p className="text-xs text-slate-400 mt-0.5">Movements will appear here automatically whenever stock changes.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-3.5 py-2.5">Date & Time</th>
                {!product && <th className="px-3.5 py-2.5">Product</th>}
                <th className="px-3.5 py-2.5">Type</th>
                <th className="px-3.5 py-2.5 text-right">Delta</th>
                <th className="px-3.5 py-2.5">Logged By</th>
                <th className="px-3.5 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((m) => {
                const isPositive = m.changeQty > 0;
                const formattedDate = new Date(m.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap font-mono">
                      {formattedDate}
                    </td>
                    {!product && (
                      <td className="px-3.5 py-2.5 font-medium text-slate-800">
                        {m.product?.name ?? '—'}
                        <span className="block text-[11px] font-mono text-slate-400">
                          {m.product?.sku}
                        </span>
                      </td>
                    )}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          m.reason === 'ADJUSTMENT'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : m.reason === 'SALE'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : m.reason === 'PURCHASE'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : m.reason === 'RETURN'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {m.reason}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPositive ? `+${m.changeQty}` : m.changeQty}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                      <span className="font-medium text-slate-800">{m.createdBy?.name ?? 'System'}</span>
                      {m.createdBy?.role && (
                        <span className="ml-1.5 text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                          {m.createdBy.role}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 max-w-xs truncate">
                      {m.notes || <span className="text-slate-300 italic">No notes</span>}
                      {m.order && (
                        <span className="block text-[10px] text-indigo-600 font-medium">
                          Ref: {m.order.orderNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs pt-2">
          <span className="text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 border rounded-md disabled:opacity-40 hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 border rounded-md disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto animate-modal-pop">
          <div className="flex justify-end -mt-2 -mr-2 mb-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
