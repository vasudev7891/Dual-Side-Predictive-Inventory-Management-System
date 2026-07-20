import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../services/supabaseAdmin';
import { z } from 'zod';

export const orderItemSchema = z.object({
  product_id: z.string().uuid('Product ID must be a valid UUID'),
  qty: z.number().int().positive('Quantity must be a positive integer'),
});

export const placeOrderSchema = z.object({
  supplier_id: z.string().uuid('Supplier ID must be a valid UUID'),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least 1 item'),
});

export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const retailerId = req.profile?.id;
    const validationResult = placeOrderSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid order structure.', 
        details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`) 
      });
    }

    if (!retailerId) {
      return res.status(403).json({ error: 'Retailer ID not resolved in profile session.' });
    }

    const { supplier_id, items } = validationResult.data;

    // Call PostgreSQL transactional RPC 'place_order'
    const { data: orderId, error: rpcError } = await supabaseAdmin.rpc('place_order', {
      p_retailer_id: retailerId,
      p_supplier_id: supplier_id,
      p_items: items // PostgreSQL handles JSONB mapping
    });

    if (rpcError) {
      // Check for custom database raise exception details (e.g. stock deficit)
      const isStockConflict = rpcError.message.includes('Insufficient stock') || rpcError.message.includes('not found');
      
      return res.status(isStockConflict ? 409 : 500).json({
        error: isStockConflict ? 'Checkout Conflict' : 'Failed to process checkout transaction.',
        details: rpcError.message
      });
    }

    // Retrieve order detail for confirmation
    const { data: orderData, error: orderFetchError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        status,
        total_amount,
        created_at,
        order_items (
          id,
          product_id,
          qty,
          products (
            sku,
            name,
            price
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderFetchError) {
      return res.status(201).json({
        message: 'Order created successfully, but detailed receipt fetch failed.',
        order_id: orderId
      });
    }

    return res.status(201).json({
      message: 'Order checked out and inventory decremented successfully.',
      order: orderData
    });
  } catch (err: any) {
    return res.status(500).json({ 
      error: 'Checkout processing crashed.', 
      details: err.message 
    });
  }
};

const updateStatusSchema = z.object({
  status: z.enum(['completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status must be either completed or cancelled' })
  })
});

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = req.profile?.id;
    const { id: orderId } = req.params;
    const validationResult = updateStatusSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.errors.map(err => err.message)
      });
    }

    if (!supplierId) {
      return res.status(403).json({ error: 'Supplier ID not resolved in profile session.' });
    }

    const { status } = validationResult.data;

    // Verify order belongs to this supplier
    const { data: order, error: checkError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .eq('supplier_id', supplierId)
      .maybeSingle();

    if (checkError || !order) {
      return res.status(404).json({ error: 'Order not found or access denied.' });
    }

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update order status in database.', details: updateError.message });
    }

    return res.status(200).json({
      message: `Order status successfully updated to '${status}'.`,
      order_id: orderId,
      status
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process status update.', details: err.message });
  }
};
