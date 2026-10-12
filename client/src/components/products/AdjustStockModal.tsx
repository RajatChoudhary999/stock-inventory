import { useState, useEffect, FormEvent } from 'react';
import { productsApi } from '../../api/resources';
import { useToast } from '../common/Toast';
import { StockBadge } from '../common/StockBadge';
import type { AdjustStockResponse, Product } from '../../types';

interface AdjustStockModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: AdjustStockResponse) => void;
}

export function AdjustStockModal({ product, isOpen, onClose, onSuccess }: AdjustStockModalProps) {
  const toast = useToast();
  const [type, setType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [reason, setReason] = useState<'ADJUSTMENT' | 'RETURN' | 'DAMAGE'>('ADJUSTMENT');
  const [notes, setNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Reset form when modal opens with a new product
  useEffect(() => {
    if (isOpen) {
      setType('INCREASE');
      setQuantity(1);
      setReason('ADJUSTMENT');
      setNotes('');
      setIsConfirming(false);
      setClientError(null);
      setIdempotencyKey(`adj-${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    }
  }, [isOpen, product.id]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const numQty = typeof quantity === 'number' ? quantity : 0;
  const delta = type === 'INCREASE' ? numQty : -numQty;
  const resultingStock = product.quantityInStock + delta;
  const isInvalid = !numQty || numQty <= 0 || resultingStock < 0;

  const handleReview = (e: FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (!numQty || numQty <= 0) {
      setClientError('Quantity must be greater than zero.');
      return;
    }

    if (resultingStock < 0) {
      setClientError(`Cannot decrease stock below 0. Current stock is ${product.quantityInStock}.`);
      return;
    }

    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setClientError(null);

    try {
      const res = await productsApi.adjustStock(product.id, {
        type,
        quantity: numQty,
        reason,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });

      const data = res.data.data;
      if (data.duplicatePrevented) {
        toast.info(data.message || 'Duplicate adjustment prevented.');
      } else {
        toast.success(
          `Stock updated for ${product.name}: ${data.previousStock} → ${data.newStock} (${delta > 0 ? `+${delta}` : delta})`,
        );
      }
      onSuccess(data);
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.response?.data?.error === 'INSUFFICIENT_STOCK'
          ? 'Insufficient stock to apply this reduction.'
          : 'Failed to adjust stock. Please try again.');
      setClientError(message);
      toast.error(message);
      setIsConfirming(false); // return to edit view
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-modal-pop">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">
              {product.sku}
            </span>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">
              Adjust Stock — {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Current Stock Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <div className="text-xs text-slate-500 font-medium">Current Inventory</div>
              <div className="text-xl font-bold text-slate-900">{product.quantityInStock} units</div>
            </div>
            <StockBadge quantity={product.quantityInStock} reorderLevel={product.reorderLevel} />
          </div>

          {!isConfirming ? (
            /* Adjustment Form View */
            <form onSubmit={handleReview} className="space-y-4">
              {/* Adjustment Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('INCREASE')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium ${
                      type === 'INCREASE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Increase Stock (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('DECREASE')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium ${
                      type === 'DECREASE'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm ring-1 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                    </svg>
                    Decrease Stock (−)
                  </button>
                </div>
              </div>

              {/* Quantity Input & Stepper */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Quantity
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setQuantity(val);
                    }}
                    placeholder="e.g. 5"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                  {/* Quick stepper presets */}
                  {[1, 5, 10].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setQuantity((prev) => (typeof prev === 'number' ? prev + step : step))}
                      className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200"
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Live Preview Box */}
              <div
                className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
                  resultingStock < 0
                    ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                    : 'bg-indigo-50/70 border-indigo-100 text-indigo-900'
                }`}
              >
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
                    Calculated Result
                  </span>
                  <div className="font-semibold text-sm">
                    {product.quantityInStock} →{' '}
                    <span className={resultingStock < 0 ? 'text-rose-600 font-bold' : 'text-indigo-700 font-bold'}>
                      {resultingStock < 0 ? `${resultingStock} (Invalid)` : resultingStock}
                    </span>{' '}
                    units
                  </div>
                </div>
                <div className="text-xs font-mono font-medium px-2 py-1 rounded bg-white/80 border border-slate-200">
                  {delta >= 0 ? `+${delta}` : delta}
                </div>
              </div>

              {/* Reason Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Adjustment Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="ADJUSTMENT">Inventory Count Audit / Routine Correction</option>
                  <option value="DAMAGE">Damaged, Expired, or Lost Goods</option>
                  <option value="RETURN">Customer Return / Supplier Intake</option>
                </select>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Audit Notes <span className="font-normal text-slate-400 lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Physical count verification in warehouse aisle B3"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {clientError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{clientError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInvalid}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Review Adjustment →
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation View */
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200/80">
                <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Confirm Stock Adjustment
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  This action will write an atomic database transaction that updates product stock and logs an
                  immutable audit movement ledger entry.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <span className="font-semibold text-slate-800">{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Adjustment:</span>
                  <span className={`font-bold ${type === 'INCREASE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {type === 'INCREASE' ? `+${numQty}` : `−${numQty}`} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resulting Stock:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {product.quantityInStock} → {resultingStock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reason:</span>
                  <span className="font-medium text-slate-800">
                    {reason === 'ADJUSTMENT'
                      ? 'Inventory Audit'
                      : reason === 'DAMAGE'
                      ? 'Damaged Goods'
                      : 'Customer/Supplier Return'}
                  </span>
                </div>
                {notes && (
                  <div className="pt-2 border-t border-slate-200/80 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Notes:</span> {notes}
                  </div>
                )}
              </div>

              {clientError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
                  {clientError}
                </div>
              )}

              {/* Confirmation Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsConfirming(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  ← Back to Edit
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Applying…
                    </>
                  ) : (
                    'Confirm & Apply'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
