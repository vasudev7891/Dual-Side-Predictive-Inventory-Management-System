import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../utils/apiClient';
import {
  Cpu, 
  AlertTriangle, 
  Activity,
  Layers,
  Zap,
  Download
} from 'lucide-react';
import { downloadCSV } from '../../utils/csvHelper';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface OrderLog {
  qty: number;
  created_at: string;
  products: {
    sku: string;
    name: string;
  } | null;
}

interface SKUAnalytics {
  sku: string;
  name: string;
  total_ordered: number;
  projected_14d_demand: number;
  status: 'critical' | 'stable' | 'surplus';
  recommendation: string;
}

export const SupplierProcurement: React.FC = () => {
  const { session } = useAuthStore();
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [skuAnalytics, setSkuAnalytics] = useState<SKUAnalytics[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelUsed, setModelUsed] = useState('');

  const handleExportCSV = () => {
    if (skuAnalytics.length === 0) return;
    const headers = ['SKU', 'Product Name', 'Total Ordered Quantity', '14d Demand Projection', 'Priority Status', 'Recommendation'];
    const rows = skuAnalytics.map(sku => [
      sku.sku,
      sku.name,
      sku.total_ordered,
      sku.projected_14d_demand,
      sku.status,
      sku.recommendation
    ]);
    downloadCSV('procurement_forecasts.csv', headers, rows);
  };

  const fetchProcurementData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      // 1. Fetch B2B analytics from the Node.js Express proxy
      const response = await apiClient.get('/api/analytics/procurement');

      const { forecasts, order_logs, model_used } = response.data;
      const logs = (order_logs as OrderLog[]) || [];
      setOrderLogs(logs);
      setModelUsed(model_used || 'Random Forest Regressor');

      // 2. Aggregate and calculate SKU daily volumes
      const skuMap: Record<string, { name: string; total: number; daily_quantities: Record<string, number> }> = {};
      const datesSet = new Set<string>();

      logs.forEach(log => {
        const product = log.products;
        if (!product) return;

        const sku = product.sku;
        const dateKey = new Date(log.created_at).toISOString().split('T')[0];
        datesSet.add(dateKey);

        if (!skuMap[sku]) {
          skuMap[sku] = {
            name: product.name,
            total: 0,
            daily_quantities: {}
          };
        }

        skuMap[sku].total += log.qty;
        skuMap[sku].daily_quantities[dateKey] = (skuMap[sku].daily_quantities[dateKey] || 0) + log.qty;
      });

      // 3. Generate chronological chart points
      const sortedDates = Array.from(datesSet).sort();
      const timelinePoints = sortedDates.map(d => {
        const point: any = { date: d };
        Object.keys(skuMap).forEach(sku => {
          point[sku] = skuMap[sku].daily_quantities[d] || 0;
        });
        return point;
      });
      setChartData(timelinePoints);

      // 4. Combine with backend ML predictions
      const computedAnalytics: SKUAnalytics[] = (forecasts || []).map((f: any) => {
        const pData = skuMap[f.sku] || { name: f.sku, total: 0 };
        return {
          sku: f.sku,
          name: pData.name,
          total_ordered: pData.total,
          projected_14d_demand: f.projected_14d_demand,
          status: f.production_priority,
          recommendation: f.recommendation
        };
      });

      setSkuAnalytics(computedAnalytics);

    } catch (err: any) {
      console.error('Error fetching procurement details:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6 rounded-2xl glass-panel-supplier border border-violet-900/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-950 bg-violet-950/30 text-violet-400 text-xs font-semibold">
            <Cpu className="h-4 w-4" />
            Wholesale B2B Demand Modeler ({modelUsed})
          </div>
          <h2 className="text-xl font-bold">Factory Procurement Advisor</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Consolidates incoming order quantities across all connected shop retailers. Graphs aggregate market demand over time and provides manufacturing run rate recommendations using RandomForest forecasting to keep warehouse stock optimized.
          </p>
        </div>
        {!loading && skuAnalytics.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="w-full md:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-855 border border-violet-900/30 text-violet-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <Download className="h-4 w-4" />
            Export Forecasts CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-24 border border-zinc-900 bg-zinc-900/10 rounded-2xl text-center text-xs text-zinc-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-violet-500 mx-auto mb-2"></div>
          Aggregating wholesale demand graphs...
        </div>
      ) : orderLogs.length === 0 ? (
        <div className="p-16 border border-zinc-900 bg-zinc-900/10 rounded-2xl text-center text-xs text-zinc-500">
          <AlertTriangle className="h-8 w-8 text-zinc-650 mx-auto mb-3" />
          No retailer orders received yet to calculate procurement curves.
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Area Chart (2/3 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-400" />
              Aggregate Retailer Order Quantities Timeline
            </h3>

            <div className="h-72 bg-zinc-950/35 border border-zinc-900 rounded-2xl p-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#52525b" 
                    fontSize={9} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '10px' }}
                    labelClassName="text-zinc-400 font-bold"
                  />
                  {skuAnalytics.map((sku, index) => (
                    <Area 
                      key={sku.sku}
                      type="monotone" 
                      dataKey={sku.sku} 
                      stroke={index % 2 === 0 ? '#8b5cf6' : '#a78bfa'} 
                      fillOpacity={1} 
                      fill="url(#colorUv)" 
                      strokeWidth={2}
                      name={`${sku.name}`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Production Priorities Advisor (1/3 col) */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-400" />
              Production Priority Advice
            </h3>

            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {skuAnalytics.map((sku) => (
                <div 
                  key={sku.sku}
                  className={`p-4 rounded-xl border bg-zinc-900/40 space-y-2 border-zinc-850`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-zinc-200 line-clamp-1">{sku.name}</h4>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">{sku.sku}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                      sku.status === 'critical' ? 'text-rose-400 bg-rose-950/20 border border-rose-900/30' :
                      sku.status === 'surplus' ? 'text-amber-400 bg-amber-950/20 border border-amber-900/30' :
                      'text-emerald-400 bg-emerald-950/20 border border-emerald-900/30'
                    }`}>
                      {sku.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-450 leading-relaxed">
                    {sku.recommendation}
                  </p>

                  <div className="pt-2 border-t border-zinc-900 flex justify-between text-[10px]">
                    <span className="text-zinc-500">Total Ordered: <span className="font-semibold text-zinc-300">{sku.total_ordered}</span></span>
                    <span className="text-zinc-550 flex items-center gap-1"><Zap className="h-3 w-3 text-violet-400" /> 14d Forecast: <span className="font-semibold text-zinc-300">{sku.projected_14d_demand}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
