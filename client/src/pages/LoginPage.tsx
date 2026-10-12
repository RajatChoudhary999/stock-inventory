import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AxiosError } from 'axios';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@stockflow.dev');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message;
      setError(msg ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-indigo-700">StockFlow</h1>
          <p className="text-sm text-slate-500">Inventory & Order Management</p>
        </div>
        {error && <div className="text-sm bg-red-50 text-red-700 rounded-md p-2">{error}</div>}
        <div>
          <label className="text-sm text-slate-600">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-md py-2 text-sm font-medium"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-slate-400">Demo: admin@stockflow.dev / Password123!</p>
      </form>
    </div>
  );
}
