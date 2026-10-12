import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-indigo-700">StockFlow</span>
            <nav className="flex gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              {user?.name} · <span className="text-indigo-600">{user?.role}</span>
            </span>
            <button onClick={handleLogout} className="text-slate-500 hover:text-slate-800">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
