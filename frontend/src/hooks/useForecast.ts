import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../utils/apiClient';

export interface ForecastPoint {
  date: string;
  predicted_demand: number;
}

export interface Forecast {
  sku: string;
  name: string;
  current_stock: number;
  projected_out_date: string;
  suggested_restock_qty: number;
  confidence_score: number;
  trend: 'rising' | 'falling' | 'stable';
  model_used: string;
  forecast_points: ForecastPoint[];
  supplier_id: string;
  product_id: string;
  price: number;
}

export const useForecast = () => {
  const { session } = useAuthStore();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecasts = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/analytics/forecast');
      setForecasts(response.data.forecasts || []);
    } catch (err: any) {
      console.error('Failed to retrieve demand analytics:', err);
      setError(
        err.response?.data?.details || 
        err.response?.data?.error || 
        'Analytics service is waking up or offline.'
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  return { forecasts, loading, error, refetch: fetchForecasts };
};
