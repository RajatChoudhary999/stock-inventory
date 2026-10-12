import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/resources';
import type { DashboardSummary } from '../types';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

function Stat({
  label,
  value,
  subtext,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition duration-200 ${
      highlight ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className={`text-2xl font-extrabold tracking-tight ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>
        {value}
      </div>
      {subtext && <div className="text-[11px] text-slate-400 mt-1 font-medium">{subtext}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    dashboardApi
      .summary()
      .then((r) => setData(r.data.data))
      .catch(() => setError('Could not load dashboard metrics.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time overview of inventory valuation, stock warnings, and sales.</p>
        </div>
        <button
          onClick={loadData}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5"
          title="Refresh metrics"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat
              label="Catalog Items"
              value={String(data.totalProducts)}
              subtext="Active SKUs"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />
            <Stat
              label="Low Stock Alert"
              value={String(data.lowStockCount)}
              subtext={data.lowStockCount > 0 ? 'Requires attention' : 'All levels healthy'}
              highlight={data.lowStockCount > 0}
              icon={
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <Stat
              label="Stock Asset Value"
              value={inr(data.stockValue)}
              subtext="At cost valuation"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            />
            <Stat
              label="Sales Revenue"
              value={inr(data.salesRevenue)}
              subtext={`${data.salesOrders} confirmed orders`}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Top Performing Products (Units Sold)</h2>
              <Link to="/products" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View all inventory →
              </Link>
            </div>
            {data.topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No sales orders recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2 text-right">Units Sold</th>
                      <th className="px-3 py-2 text-right">Gross Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-slate-900">{p.name}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{p.unitsSold}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-700">{inr(Number(p.revenue))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
