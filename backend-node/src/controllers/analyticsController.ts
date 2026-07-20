import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../services/supabaseAdmin';
import axios from 'axios';

const PYTHON_ML_SERVICE_URL = process.env.PYTHON_ML_SERVICE_URL;
const INTERNAL_SECRET_TOKEN = process.env.INTERNAL_SECRET_TOKEN;

if (!PYTHON_ML_SERVICE_URL || !INTERNAL_SECRET_TOKEN) {
  console.error(
    'CRITICAL: PYTHON_ML_SERVICE_URL or INTERNAL_SECRET_TOKEN is missing. Please verify they are set in your environment.'
  );
  process.exit(1);
}

export const getRetailerForecast = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const retailerId = req.profile?.id;

    if (!retailerId) {
      return res.status(403).json({ error: 'Retailer ID not resolved in profile session.' });
    }

    // 1. Fetch last 90 days of sales history for this retailer
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: salesHistory, error: fetchError } = await supabaseAdmin
      .from('sales_history')
      .select(`
        qty_sold,
        sold_at,
        product_id,
        products (
          id,
          sku,
          name,
          stock_qty,
          supplier_id,
          price
        )
      `)
      .eq('retailer_id', retailerId)
      .gte('sold_at', ninetyDaysAgo.toISOString());

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to retrieve sales logs.', details: fetchError.message });
    }

    if (!salesHistory || salesHistory.length === 0) {
      return res.status(200).json({ 
        message: 'No sales history logs found to compute ML forecast. Please seed sales history data first.',
        forecasts: [] 
      });
    }

    // 2. Group sales history by SKU
    const groupedData: Record<string, { 
      sku: string; 
      product_id: string; 
      supplier_id: string; 
      price: number; 
      current_stock: number; 
      name: string; 
      sales: { ds: string; y: number }[] 
    }> = {};

    salesHistory.forEach((log: any) => {
      const product = log.products;
      if (!product) return;

      const sku = product.sku;
      if (!groupedData[sku]) {
        groupedData[sku] = {
          sku,
          product_id: product.id,
          supplier_id: product.supplier_id,
          price: parseFloat(product.price),
          name: product.name,
          current_stock: product.stock_qty,
          sales: []
        };
      }

      groupedData[sku].sales.push({
        ds: log.sold_at,
        y: log.qty_sold
      });
    });

    // 3. For each SKU, query the Python microservice for Prophet forecasting
    const forecastPromises = Object.keys(groupedData).map(async (sku) => {
      const pData = groupedData[sku];
      try {
        const response = await axios.post(
          `${PYTHON_ML_SERVICE_URL}/ml/forecast`,
          {
            sku: pData.sku,
            current_stock: pData.current_stock,
            sales_history: pData.sales,
          },
          {
            headers: {
              'Authorization': `Bearer ${INTERNAL_SECRET_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // Avoid long hanging if Render service is waking up
          }
        );
        return {
          sku,
          name: pData.name,
          product_id: pData.product_id,
          supplier_id: pData.supplier_id,
          price: pData.price,
          ...response.data
        };
      } catch (err: any) {
        console.error(`Inference failed for SKU ${sku}:`, err.message);
        // Fallback heuristic model if Python service is offline or fails (moving average)
        const totalSales = pData.sales.reduce((sum, item) => sum + item.y, 0);
        const avgDailySales = pData.sales.length > 0 ? totalSales / pData.sales.length : 1;
        const daysToOut = pData.current_stock / (avgDailySales || 1);
        const projectedOutDate = new Date();
        projectedOutDate.setDate(projectedOutDate.getDate() + Math.max(1, Math.round(daysToOut)));
        
        // Populate fallback forecast points
        const points = [];
        for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + dayOffset);
          points.push({
            date: futureDate.toISOString().split('T')[0],
            predicted_demand: Math.max(0.0, avgDailySales)
          });
        }

        return {
          sku,
          name: pData.name,
          product_id: pData.product_id,
          supplier_id: pData.supplier_id,
          price: pData.price,
          current_stock: pData.current_stock,
          projected_out_date: projectedOutDate.toISOString().split('T')[0],
          suggested_restock_qty: Math.max(50, Math.round(avgDailySales * 14)), // 2-week buffer
          confidence_score: 0.50, // Low confidence for fallback heuristic
          trend: 'stable',
          model_used: "Simple Moving Average (Local Heuristic Fallback)",
          forecast_points: points
        };
      }
    });

    const forecasts = await Promise.all(forecastPromises);

    return res.status(200).json({
      retailer_id: retailerId,
      forecasts
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process retailer analytics.', details: err.message });
  }
};
