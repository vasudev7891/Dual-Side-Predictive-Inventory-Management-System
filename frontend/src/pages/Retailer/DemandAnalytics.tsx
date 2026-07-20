import React from 'react';
import { 
  TrendingUp, 
  BrainCircuit, 
  AlertTriangle, 
  Package,
  Activity,
  Printer
} from 'lucide-react';
import { useForecast } from '../../hooks/useForecast';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

export const DemandAnalytics: React.FC = () => {
  const { forecasts, loading, error, refetch } = useForecast();

  // Compute aggregate statistics
  const totalItems = forecasts.length;
  const activeStockouts = forecasts.filter(f => f.current_stock === 0).length;
  const criticalStock = forecasts.filter(f => {
    const days = Math.ceil((new Date(f.projected_out_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return f.current_stock > 0 && days <= 7;
  }).length;
  
  const risingDemand = forecasts.filter(f => f.trend === 'rising').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Print PDF Action */}
      {!loading && !error && forecasts.length > 0 && (
        <div className="flex justify-between items-center bg-zinc-900/35 border border-zinc-900 p-4 rounded-2xl print:hidden">
          <span className="text-xs text-zinc-400">Generate a print-ready PDF copy of the demand projections.</span>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-zinc-100 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/30"
          >
            <Printer className="h-4 w-4" />
            Download PDF Report
          </button>
        </div>
      )}

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Monitored SKU Items</span>
            <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-indigo-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-zinc-100">{loading ? '...' : totalItems}</span>
          <p className="text-[10px] text-zinc-550 mt-1">Active items in sales logs</p>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Stockouts</span>
            <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-450">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <span className={`text-2xl font-bold ${activeStockouts > 0 ? 'text-rose-450' : 'text-zinc-100'}`}>
            {loading ? '...' : activeStockouts}
          </span>
          <p className="text-[10px] text-zinc-550 mt-1">Zero inventory quantity</p>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Critical Depletions</span>
            <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-amber-450">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <span className={`text-2xl font-bold ${criticalStock > 0 ? 'text-amber-450' : 'text-zinc-100'}`}>
            {loading ? '...' : criticalStock}
          </span>
          <p className="text-[10px] text-zinc-550 mt-1">Running out in &le; 7 days</p>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Rising Demand Trends</span>
            <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-zinc-100">{loading ? '...' : risingDemand}</span>
          <p className="text-[10px] text-zinc-550 mt-1">Increasing sales velocity</p>
        </div>
      </div>

      {loading ? (
        <div className="p-24 border border-zinc-900 bg-zinc-900/10 rounded-2xl text-center text-xs text-zinc-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-indigo-500 mx-auto mb-3"></div>
          Running time-series inference models...
        </div>
      ) : error ? (
        <div className="p-12 border border-rose-950/20 bg-rose-950/5 rounded-2xl text-center text-xs text-zinc-550 space-y-4">
          <AlertTriangle className="h-8 w-8 text-rose-450 mx-auto" />
          <p>{error}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl font-bold"
          >
            Retry Analytics Ingest
          </button>
        </div>
      ) : forecasts.length === 0 ? (
        <div className="p-16 border border-zinc-900 bg-zinc-900/10 rounded-2xl text-center text-xs text-zinc-500">
          No demand profiles available. Ensure products are registered and sales logs exist.
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-indigo-400" />
            Predictive Daily Demand Projections (14-Day Outlook)
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {forecasts.map((f) => {
              const days = Math.ceil((new Date(f.projected_out_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = days <= 7 || f.current_stock === 0;

              return (
                <div 
                  key={f.sku}
                  className={`rounded-2xl border p-5 glass-panel-retailer flex flex-col justify-between h-80 transition-all ${
                    isUrgent ? 'border-amber-950/40 bg-amber-950/2' : 'border-zinc-900'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100">{f.name}</h4>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{f.sku}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono block">Out Date</span>
                      <span className={`text-xs font-bold ${isUrgent ? 'text-amber-450' : 'text-zinc-300'}`}>
                        {f.projected_out_date}
                      </span>
                    </div>
                  </div>

                  {/* Recharts chart representation */}
                  <div className="h-40 w-full bg-zinc-950/40 border border-zinc-900/60 rounded-xl p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={f.forecast_points} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#3f3f46" 
                          fontSize={8} 
                          tickLine={false}
                          tickFormatter={(str) => str.substring(5)} // Show MM-DD
                        />
                        <YAxis 
                          stroke="#3f3f46" 
                          fontSize={8} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '9px' }}
                          labelClassName="text-zinc-400 font-bold"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="predicted_demand" 
                          stroke={isUrgent ? '#f59e0b' : '#6366f1'} 
                          strokeWidth={2}
                          dot={{ r: 1.5 }}
                          name="Predicted Sales" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-between mt-4 text-[10px] text-zinc-400 border-t border-zinc-900/60 pt-3">
                    <span>Stock: <span className="font-semibold text-zinc-200">{f.current_stock} units</span></span>
                    <span className="font-mono text-zinc-500">Model: {f.model_used}</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                      f.trend === 'rising' ? 'text-rose-400 bg-rose-950/20' : 
                      f.trend === 'falling' ? 'text-emerald-400 bg-emerald-950/20' : 'text-zinc-450 bg-zinc-900'
                    }`}>
                      {f.trend} demand
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
