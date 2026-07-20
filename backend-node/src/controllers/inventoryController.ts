import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../services/supabaseAdmin';
import Papa from 'papaparse';
import { z } from 'zod';

// Schema validation for a single CSV row
export const csvRowSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  product_name: z.string().trim().min(1, 'Product Name is required'),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().nonnegative('Price must be a positive number')
  ),
  stock_qty: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().nonnegative('Stock quantity must be a non-negative integer')
  ),
});

export const bulkUploadInventory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { csvString } = req.body;
    const supplierId = req.profile?.id;

    if (!csvString) {
      return res.status(400).json({ error: 'Missing csvString field in request body.' });
    }

    if (!supplierId) {
      return res.status(403).json({ error: 'Supplier ID not resolved in profile session.' });
    }

    // Parse CSV String
    const parseResult = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV Parsing failed.', 
        details: parseResult.errors.map(e => `Row ${e.row}: ${e.message}`) 
      });
    }

    const rows = parseResult.data as Array<any>;
    const productsToUpsert: Array<any> = [];
    const warnings: Array<{ row: number; errors: string[] }> = [];

    // Validate rows
    rows.forEach((row, idx) => {
      // Map potential alternative header names
      const mappedRow = {
        sku: row.sku || row.SKU || '',
        product_name: row.product_name || row.name || row.Product_Name || row.ProductName || '',
        price: row.price || row.base_price || row.Price || 0,
        stock_qty: row.stock_qty || row.current_stock || row.Stock || row.Quantity || 0
      };

      const result = csvRowSchema.safeParse(mappedRow);

      if (!result.success) {
        warnings.push({
          row: idx + 2, // 1-indexed plus header row offset
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        });
      } else {
        productsToUpsert.push({
          supplier_id: supplierId,
          sku: result.data.sku,
          name: result.data.product_name,
          price: result.data.price,
          stock_qty: result.data.stock_qty
        });
      }
    });

    if (productsToUpsert.length === 0) {
      return res.status(400).json({
        error: 'No valid rows found in CSV upload.',
        warnings
      });
    }

    // Execute bulk upsert to database using Supabase Admin
    // OnConflict triggers update on unique key (supplier_id, sku)
    const { error: upsertError } = await supabaseAdmin
      .from('products')
      .upsert(productsToUpsert, {
        onConflict: 'supplier_id,sku'
      });

    if (upsertError) {
      return res.status(500).json({ 
        error: 'Failed to upsert records into inventory database.', 
        details: upsertError.message,
        warnings
      });
    }

    return res.status(200).json({
      message: 'Inventory bulk upload processed successfully.',
      inserted_count: productsToUpsert.length,
      warning_count: warnings.length,
      warnings
    });
  } catch (err: any) {
    return res.status(500).json({ 
      error: 'Failed to process bulk upload stream.', 
      details: err.message 
    });
  }
};
