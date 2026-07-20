import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { ToastContainer } from './components/ui/Toast';
import { FullScreenLoader } from './components/ui/FullScreenLoader';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Lazy loaded page components
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Auth = lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

// Retailer Views
const Marketplace = lazy(() => import('./pages/Retailer/Marketplace').then(m => ({ default: m.Marketplace })));
const SmartCart = lazy(() => import('./pages/Retailer/SmartCart').then(m => ({ default: m.SmartCart })));
const DemandAnalytics = lazy(() => import('./pages/Retailer/DemandAnalytics').then(m => ({ default: m.DemandAnalytics })));

// Supplier Views
const SupplierDashboard = lazy(() => import('./pages/Supplier/SupplierDashboard').then(m => ({ default: m.SupplierDashboard })));
const SupplierInventory = lazy(() => import('./pages/Supplier/SupplierInventory').then(m => ({ default: m.SupplierInventory })));
const SupplierProcurement = lazy(() => import('./pages/Supplier/SupplierProcurement').then(m => ({ default: m.SupplierProcurement })));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected Retailer Routes */}
            <Route element={<DashboardLayout allowedRole="retailer" />}>
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/smart-cart" element={<SmartCart />} />
              <Route path="/demand-analytics" element={<DemandAnalytics />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Protected Supplier Routes */}
            <Route element={<DashboardLayout allowedRole="supplier" />}>
              <Route path="/dashboard/supplier" element={<SupplierDashboard />} />
              <Route path="/inventory/bulk" element={<SupplierInventory />} />
              <Route path="/procurement-analytics" element={<SupplierProcurement />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
