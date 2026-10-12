import { FormEvent, useEffect, useState } from 'react';
import { ordersApi, productsApi } from '../api/resources';
import type { Order, Product } from '../types';
import { AxiosError } from 'axios';

const statusColor: Record<string, string> = {
  CONFIRMED: 'bg-blue-50 text-blue-700',
  FULFILLED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  PENDING: 'bg-amber-50 text-amber-700',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    ordersApi
      .list({ page: 1, limit: 20 })
      .then((r) => setOrders(r.data.data))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Orders</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md px-3 py-1.5"
        >
          {showForm ? 'Close' : '+ New sale'}
        </button>
      </div>

      {showForm && <NewOrderForm onCreated={() => { setShowForm(false); load(); }} />}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-400 text-sm">No orders yet.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Order #</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-3 py-2">{o.type}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">₹{Number(o.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-slate-500">{o.createdBy?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewOrderForm({ onCreated }: { onCreated: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    productsApi.list({ limit: 100, sort: 'name', order: 'asc' }).then((r) => setProducts(r.data.data));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await ordersApi.create({
        type: 'SALE',
        customerName: customerName || undefined,
        items: [{ productId: Number(productId), quantity: Number(quantity) }],
      });
      onCreated();
    } catch (err) {
      const res = (err as AxiosError<{ error?: string; message?: string }>).response?.data;
      setError(res?.error === 'INSUFFICIENT_STOCK' ? 'Not enough stock for this product.' : res?.message ?? 'Order failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
      <div>
        <label className="text-xs text-slate-500">Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(Number(e.target.value))}
          required
          className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">Select…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (stock {p.quantityInStock})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
          required
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">Customer (optional)</label>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
        />
      </div>
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
      <button disabled={saving} className="bg-indigo-600 text-white text-sm rounded-md py-1.5">
        {saving ? 'Recording…' : 'Record sale'}
      </button>
    </form>
  );
}
