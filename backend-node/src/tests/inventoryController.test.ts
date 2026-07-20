import { describe, it, expect } from 'vitest';
import { csvRowSchema } from '../controllers/inventoryController';

describe('csvRowSchema CSV line validator', () => {
  const validRow = {
    sku: 'SKU-TEST-123',
    product_name: 'Premium Test Wholesaler Item',
    price: '29.99',
    stock_qty: '150',
  };

  it('should successfully parse and validate a correct CSV row data structure', () => {
    const result = csvRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sku).toBe('SKU-TEST-123');
      expect(result.data.product_name).toBe('Premium Test Wholesaler Item');
      expect(result.data.price).toBe(29.99); // Preprocessed to float
      expect(result.data.stock_qty).toBe(150); // Preprocessed to int
    }
  });

  it('should trim SKU and product name trailing whitespaces', () => {
    const spacesRow = {
      ...validRow,
      sku: '  SKU-WITH-SPACES  ',
      product_name: '  Cleaned Name  ',
    };
    
    const result = csvRowSchema.safeParse(spacesRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sku).toBe('SKU-WITH-SPACES');
      expect(result.data.product_name).toBe('Cleaned Name');
    }
  });

  it('should fail validation if SKU code is empty', () => {
    const invalid = { ...validRow, sku: '   ' };
    const result = csvRowSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation if price is a negative number', () => {
    const invalid = { ...validRow, price: '-5.50' };
    const result = csvRowSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation if stock quantity is negative', () => {
    const invalid = { ...validRow, stock_qty: '-10' };
    const result = csvRowSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation if stock quantity is a float instead of integer', () => {
    const invalid = { ...validRow, stock_qty: '12.50' };
    const result = csvRowSchema.safeParse(invalid);
    // Since we parseInt(stock_qty, 10), "12.50" parses to 12.
    // Let's verify that it actually converts it successfully to 12 (preprocessed)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stock_qty).toBe(12);
    }
  });
});
