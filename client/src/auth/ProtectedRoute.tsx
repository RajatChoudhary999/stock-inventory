import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { Role } from '../types';

/** Guards routes by authentication and (optionally) role. */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
