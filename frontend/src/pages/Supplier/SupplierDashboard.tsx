import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Package, 
  ShoppingBag, 
  Clock, 
  DollarSign,
  AlertTriangle,
  Download
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { useToastStore } from '../../store/useToastStore';
import { downloadCSV } from '../../utils/csvHelper';

interface Order {
  id: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  retailer_profile: {
    full_name: string | null;
  } | null;
}

export const SupplierDashboard: React.FC = () => {
  const { session } = useAuthStore();
  const { addToast } = useToastStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Catalog count states
  const [catalogCount, setCatalogCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Order ID', 'Retailer Name', 'Amount ($)', 'Order Date', 'Status'];
    const rows = orders.map(o => [
      o.id,
      o.retailer_profile?.full_name || 'Retailer Client',
      Number(o.total_amount).toFixed(2),
      new Date(o.created_at).toLocaleDateString(),
      o.status
    ]);
    downloadCSV('incoming_orders.csv', headers, rows);
  };

  const fetchDashboardData = async () => {
    const supplierId = session?.user?.id;
    if (!supplierId) return;

    setLoading(true);
    try {
      // 1. Fetch received orders
      // In PostgreSQL, profiles!retailer_id maps profiles on orders' retailer_id column
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          retailer_profile:profiles!orders_retailer_id_fkey (
            full_name
          )
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData as unknown as Order[] || []);

      // 2. Fetch Catalog count
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('supplier_id', supplierId);
      
      if (prodError) throw prodError;
      setCatalogCount(prodData?.length || 0);
      setLowStockCount(prodData?.filter(p => p.stock_qty > 0 && p.stock_qty < 20).length || 0);

    } catch (err: any) {
      console.error('Error fetching supplier dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: 'completed' | 'cancelled') => {
    if (!session) return;
    setUpdatingOrderId(orderId);
    try {
      await apiClient.patch(
        `/api/orders/${orderId}/status`,
        { status: newStatus }
      );
      
      // Refresh
      fetchDashboardData();
    } catch (err: any) {
      addToast(`Failed to update status: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Metrics aggregates
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const completedRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 border border-emerald-900/30 text-emerald-400">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/40 border border-rose-900/30 text-rose-450">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 border border-amber-900/30 text-amber-400">Pending</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Completed Revenue</span>
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-violet-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-zinc-100">${completedRevenue.toFixed(2)}</span>
          <p className="text-[10px] text-zinc-550 mt-1">Fulfillments finalized</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-zinc-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending Orders</span>
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-450">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-zinc-100">{pendingOrdersCount}</span>
          <p className="text-[10px] text-zinc-550 mt-1">Awaiting shipping actions</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-zinc-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Catalog SKUs</span>
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-zinc-100">{catalogCount}</span>
          <p className="text-[10px] text-zinc-550 mt-1">Active products managed</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-zinc-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Low Stock Items</span>
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-rose-450">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <span className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-450' : 'text-zinc-100'}`}>
            {lowStockCount}
          </span>
          <p className="text-[10px] text-zinc-550 mt-1">Stock quantity &lt; 20 units</p>
        </div>
      </div>

      {/* Received Orders Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-violet-400" />
            Incoming Retailer Orders
          </h3>
          {orders.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-150 transition-colors text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          )}
        </div>

        <div className="border border-zinc-850 bg-zinc-900/25 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-550">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-violet-500 mx-auto mb-2"></div>
              Retrieving orders log...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-550">
              No orders received yet from retailers.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-400 font-semibold">
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Retailer Name</th>
                    <th className="px-6 py-4 text-center">Amount</th>
                    <th className="px-6 py-4 text-center">Order Date</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/60">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-zinc-400">{order.id.substring(0, 8)}...</td>
                      <td className="px-6 py-4 font-semibold text-zinc-250">
                        {order.retailer_profile?.full_name || 'Retailer Client'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-zinc-200">
                        ${Number(order.total_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center text-zinc-450">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {order.status === 'pending' ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'completed')}
                              disabled={updatingOrderId === order.id}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/30 border border-emerald-900/30 text-emerald-400 font-bold transition-all disabled:opacity-50"
                            >
                              Fulfill
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              disabled={updatingOrderId === order.id}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/30 border border-rose-900/30 text-rose-400 font-bold transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-550 italic">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-850 flex justify-center items-center gap-4 text-xs">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900/60 text-zinc-350 transition-colors"
              >
                Previous
              </button>
              <span className="text-zinc-400">
                Page <span className="text-zinc-200 font-bold">{currentPage}</span> of <span className="text-zinc-200 font-bold">{totalPages}</span>
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900/60 text-zinc-350 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
