import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../services/supabaseAdmin';
import axios from 'axios';

const PYTHON_ML_SERVICE_URL = process.env.PYTHON_ML_SERVICE_URL;
const INTERNAL_SECRET_TOKEN = process.env.INTERNAL_SECRET_TOKEN;

export const getSupplierProcurement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = req.profile?.id;
    if (!supplierId) {
      return res.status(403).json({ error: 'Supplier ID not resolved in profile session.' });
    }

    // 1. Fetch order items for this supplier
    const { data: orderItems, error: fetchError } = await supabaseAdmin
      .from('order_items')
      .select(`
        qty,
        created_at,
        products!inner (
          sku,
          name,
          supplier_id
        )
      `)
      .eq('products.supplier_id', supplierId);

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to retrieve order records.', details: fetchError.message });
    }

    if (!orderItems || orderItems.length === 0) {
      return res.status(200).json({
        forecasts: [],
        order_logs: [],
        model_used: "None (No Order History)"
      });
    }

    // 2. Format logs for Python ML microservice
    const orderHistory = orderItems.map((item: any) => ({
      sku: item.products.sku,
      date: item.created_at,
      qty_ordered: item.qty
    }));

    // 3. Request forecast from Python ML service
    let forecasts = [];
    let modelUsed = "Local Heuristic Fallback";

    try {
      if (!PYTHON_ML_SERVICE_URL || !INTERNAL_SECRET_TOKEN) {
        throw new Error("Missing ML environment configurations");
      }
      const response = await axios.post(
        `${PYTHON_ML_SERVICE_URL}/ml/procurement`,
        { order_history: orderHistory },
        {
          headers: {
            'Authorization': `Bearer ${INTERNAL_SECRET_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      forecasts = response.data.forecasts;
      modelUsed = response.data.model_used;
    } catch (err: any) {
      console.error('Procurement ML call failed, using heuristic fallback:', err.message);
      // Fallback: heuristic calculation
      const skuTotals: Record<string, { sku: string; name: string; total: number; days: Set<string> }> = {};
      orderItems.forEach((item: any) => {
        const prod = item.products;
        const dateKey = new Date(item.created_at).toISOString().split('T')[0];
        if (!skuTotals[prod.sku]) {
          skuTotals[prod.sku] = { sku: prod.sku, name: prod.name, total: 0, days: new Set() };
        }
        skuTotals[prod.sku].total += item.qty;
        skuTotals[prod.sku].days.add(dateKey);
      });

      forecasts = Object.values(skuTotals).map((skuData) => {
        const totalDays = Math.max(1, skuData.days.size);
        const avgDaily = skuData.total / totalDays;
        const projected_14d = Math.round(avgDaily * 14 * 1.1) + 10;
        
        let status = 'stable';
        let recommendation = 'STABLE DEMAND: Maintain current production baseline.';
        if (avgDaily > 15) {
          status = 'critical';
          recommendation = 'HIGH VELOCITY: Demand rate is high. Increase production output.';
        } else if (avgDaily < 3) {
          status = 'surplus';
          recommendation = 'LOW VELOCITY: Demand rate is low. Restrict production to prevent overflow.';
        }

        return {
          sku: skuData.sku,
          projected_14d_demand: projected_14d,
          production_priority: status,
          recommendation
        };
      });
    }

    // Map order items to plain log items format for frontend graphs
    const formattedLogs = orderItems.map((item: any) => ({
      qty: item.qty,
      created_at: item.created_at,
      products: {
        sku: item.products.sku,
        name: item.products.name
      }
    }));

    return res.status(200).json({
      forecasts,
      order_logs: formattedLogs,
      model_used: modelUsed
    });

  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to compute procurement forecast.', details: err.message });
  }
};
