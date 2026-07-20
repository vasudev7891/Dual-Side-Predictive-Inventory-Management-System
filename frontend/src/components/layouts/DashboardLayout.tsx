import React, { useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  LayoutDashboard, 
  Store, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  LogOut, 
  User,
  Menu,
  X,
  Sliders
} from 'lucide-react';

interface DashboardLayoutProps {
  allowedRole?: 'supplier' | 'retailer';
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ allowedRole }) => {
  const { session, profile, loading, initialize, signOut } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-indigo-500"></div>
          <p className="text-sm font-medium tracking-wide text-zinc-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Redirect to Auth if not logged in
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If profile is loaded but role doesn't match the required role for the sub-path
  if (profile && allowedRole && profile.role !== allowedRole) {
    if (profile.role === 'supplier') {
      return <Navigate to="/dashboard/supplier" replace />;
    } else if (profile.role === 'retailer') {
      return <Navigate to="/marketplace" replace />;
    }
  }

  const isSupplier = profile?.role === 'supplier';
  const accentClass = isSupplier ? 'text-violet-400 border-violet-500/20' : 'text-indigo-400 border-indigo-500/20';
  const navHoverClass = isSupplier ? 'hover:bg-violet-950/40 hover:text-violet-300' : 'hover:bg-indigo-950/40 hover:text-indigo-300';
  const activeClass = isSupplier ? 'bg-violet-900/30 text-violet-300 border-l-2 border-violet-500' : 'bg-indigo-900/30 text-indigo-300 border-l-2 border-indigo-500';

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = isSupplier
    ? [
        { name: 'Dashboard', path: '/dashboard/supplier', icon: LayoutDashboard },
        { name: 'Inventory & Upload', path: '/inventory/bulk', icon: Package },
        { name: 'Procurement Advisor', path: '/procurement-analytics', icon: TrendingUp },
        { name: 'Settings', path: '/settings', icon: Sliders },
      ]
    : [
        { name: 'Marketplace', path: '/marketplace', icon: Store },
        { name: 'Smart Restock Cart', path: '/smart-cart', icon: ShoppingCart },
        { name: 'Demand Analytics', path: '/demand-analytics', icon: TrendingUp },
        { name: 'Settings', path: '/settings', icon: Sliders },
      ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-zinc-900 border-r border-zinc-800">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-zinc-800">
          <div className={`p-2 rounded bg-zinc-800 border ${accentClass}`}>
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              IMS Predictive
            </span>
            <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
              {profile?.role} node
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive ? activeClass : `text-zinc-400 ${navHoverClass}`
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Info */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-zinc-200">{profile?.full_name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors border border-transparent hover:border-rose-900/20"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between px-6 bg-zinc-900 border-b border-zinc-800 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-zinc-50 to-zinc-300 bg-clip-text text-transparent">
              {navItems.find((item) => item.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-800 border uppercase tracking-wider ${
              isSupplier ? 'text-violet-400 border-violet-800/30 bg-violet-950/20' : 'text-indigo-400 border-indigo-800/30 bg-indigo-950/20'
            }`}>
              {profile?.role}
            </span>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-zinc-950/80 backdrop-blur-sm">
          <div className="relative flex w-full max-w-xs flex-col bg-zinc-900 border-r border-zinc-800 p-6 animate-slide-in">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-4 top-4 p-1 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-8">
              <Package className={`h-6 w-6 ${accentClass}`} />
              <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                IMS Predictive
              </span>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive ? activeClass : `text-zinc-400 ${navHoverClass}`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-zinc-800 pt-6 mt-auto">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold truncate text-zinc-200">{profile?.full_name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{session.user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors border border-transparent hover:border-rose-900/20"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
