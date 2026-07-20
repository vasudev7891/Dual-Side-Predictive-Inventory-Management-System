import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../store/useCartStore';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  AlertTriangle, 
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

export const SmartCart: React.FC = () => {
  const { addToCart } = useCartStore();
  const navigate = useNavigate();

  const { forecasts, loading, error, refetch } = useForecast();

  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [restockQuantities, setRestockQuantities] = useState<Record<string, number>>({});
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [cartConflict, setCartConflict] = useState<string | null>(null);

  useEffect(() => {
    if (forecasts.length > 0) {
      const initialSelection: Record<string, boolean> = {};
      const initialQuantities: Record<string, number> = {};

      forecasts.forEach((f) => {
        const daysToOut = Math.ceil((new Date(f.projected_out_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        initialSelection[f.sku] = daysToOut <= 7 || f.current_stock === 0;
        initialQuantities[f.sku] = f.suggested_restock_qty;
      });

      setSelectedItems(prev => Object.keys(prev).length === 0 ? initialSelection : prev);
      setRestockQuantities(prev => Object.keys(prev).length === 0 ? initialQuantities : prev);
    }
  }, [forecasts]);

  const handleToggleSelect = (sku: string) => {
    setSelectedItems(prev => ({ ...prev, [sku]: !prev[sku] }));
  };

  const handleQuantityChange = (sku: string, qty: number) => {
    setRestockQuantities(prev => ({ ...prev, [sku]: Math.max(1, qty) }));
  };

  const handleToggleExpand = (sku: string) => {
    setExpandedSku(expandedSku === sku ? null : sku);
  };

  const handleGenerateOrder = () => {
    setCartConflict(null);
    const itemsToAdd = forecasts.filter(f => selectedItems[f.sku]);

    if (itemsToAdd.length === 0) {
      setCartConflict('Please select at least one item to restock.');
      return;
    }

    // Let's add them
    let success = true;
    let errorMsg = '';

    // Let's add them
    itemsToAdd.forEach((item) => {
      // If it's the first item, we can clear the cart if there's any active supplier mismatch
      const qty = restockQuantities[item.sku] || item.suggested_restock_qty;
      const result = addToCart({
        id: item.product_id,
        name: item.name,
        sku: item.sku,
        price: item.price || 1.50, // Let's ensure price is returned from backend too!
        supplier_id: item.supplier_id
      }, qty);

      if (!result.success) {
        success = false;
        errorMsg = result.message || '';
      }
    });

    if (success) {
      // Redirect to marketplace where the cart is displayed in the sidebar
      navigate('/marketplace');
    } else {
      setCartConflict(errorMsg);
    }
  };

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising':
        return <span className="flex items-center gap-1 text-rose-450 bg-rose-950/20 border border-rose-900/30 px-2 py-0.5 rounded text-[10px] font-bold"><TrendingUp className="h-3 w-3" /> Rising Demand</span>;
      case 'falling':
        return <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded text-[10px] font-bold"><TrendingDown className="h-3 w-3" /> Falling Demand</span>;
      default:
        return <span className="flex items-center gap-1 text-zinc-400 bg-zinc-900/40 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold">Stable</span>;
    }
  };

  const getUrgencyText = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return <span className="text-rose-450 font-bold">Stockout</span>;
    if (days <= 3) return <span className="text-rose-400 font-semibold">{days} Days</span>;
    if (days <= 7) return <span className="text-amber-450">{days} Days</span>;
    return <span className="text-zinc-400">{days} Days</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-2xl glass-panel-retailer border border-indigo-900/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-950 bg-indigo-950/30 text-indigo-400 text-xs font-semibold">
            <BrainCircuit className="h-4 w-4" />
            Meta Prophet Auto-Restock Cart
          </div>
          <h2 className="text-xl font-bold">AI Smart Restock Generator</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The system analyzes your historical sales patterns (last 90 days), matches weekly seasonality coefficients, and generates an automated shopping cart containing the exact items projected to experience stockouts.
          </p>
        </div>

        {forecasts.length > 0 && (
          <button
            onClick={handleGenerateOrder}
            className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-zinc-100 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/30 transition-all border border-indigo-500/20"
          >
            <ShoppingBag className="h-4 w-4" />
            Generate Restock Order
          </button>
        )}
      </div>

      {cartConflict && (
        <div className="p-4 rounded-xl border border-rose-900/30 bg-rose-950/15 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{cartConflict}</span>
        </div>
      )}

      {loading ? (
        <div className="p-24 border border-zinc-900 bg-zinc-900/10 rounded-2xl text-center text-xs text-zinc-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-indigo-500 mx-auto mb-3"></div>
          Analyzing sales logs & fitting Prophet models...
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
          <HelpCircle className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          No forecasts available. Verify that you have uploaded sales logs history.
        </div>
      ) : (
        <div className="border border-zinc-900 bg-zinc-900/15 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/40 text-zinc-400 font-semibold">
                  <th className="px-6 py-4 w-12 text-center">Include</th>
                  <th className="px-6 py-4">Product Name (SKU)</th>
                  <th className="px-6 py-4 text-center">Current Stock</th>
                  <th className="px-6 py-4 text-center">Time to Depletion</th>
                  <th className="px-6 py-4 text-center">Projected Out Date</th>
                  <th className="px-6 py-4">Demand Trend</th>
                  <th className="px-6 py-4 text-center">Suggested Restock</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {forecasts.map((forecast) => {
                  const isSelected = selectedItems[forecast.sku] || false;
                  const isExpanded = expandedSku === forecast.sku;

                  return (
                    <React.Fragment key={forecast.sku}>
                      <tr className={`hover:bg-zinc-900/20 transition-colors ${isSelected ? 'bg-indigo-950/5' : ''}`}>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(forecast.sku)}
                            className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500/20"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-bold text-zinc-200 block">{forecast.name}</span>
                            <span className="text-[10px] font-mono text-zinc-550 uppercase">{forecast.sku}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-zinc-300">{forecast.current_stock}</td>
                        <td className="px-6 py-4 text-center font-semibold">{getUrgencyText(forecast.projected_out_date)}</td>
                        <td className="px-6 py-4 text-center text-zinc-450">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {forecast.projected_out_date}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getTrendIcon(forecast.trend)}</td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number"
                            value={restockQuantities[forecast.sku] || ''}
                            onChange={(e) => handleQuantityChange(forecast.sku, parseInt(e.target.value, 10))}
                            className="w-20 text-center py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-bold focus:outline-none focus:border-indigo-500"
                            min={1}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleExpand(forecast.sku)}
                            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Chart Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-zinc-900/10 px-8 py-6 border-t border-b border-zinc-900/60">
                            <div className="space-y-4">
                              <div className="flex justify-between items-center text-xs border-b border-zinc-900/40 pb-3">
                                <span className="font-semibold text-zinc-350">
                                  Prophet daily demand projections for the next 14 days
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  Model Engine: {forecast.model_used} | Accuracy confidence: {Math.round(forecast.confidence_score * 100)}%
                                </span>
                              </div>

                              {/* Recharts graph */}
                              <div className="h-48 w-full bg-zinc-950/20 border border-zinc-900/80 rounded-xl p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={forecast.forecast_points} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                                    <XAxis 
                                      dataKey="date" 
                                      stroke="#52525b" 
                                      fontSize={10} 
                                      tickLine={false} 
                                      tickFormatter={(str: string) => str.substring(5)} // Show MM-DD
                                    />
                                    <YAxis 
                                      stroke="#52525b" 
                                      fontSize={10} 
                                      tickLine={false} 
                                      axisLine={false} 
                                    />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '10px' }}
                                      labelClassName="text-zinc-400 font-bold"
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="predicted_demand" 
                                      stroke="#6366f1" 
                                      strokeWidth={2.5} 
                                      dot={{ r: 2 }}
                                      name="Demand Forecast" 
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
