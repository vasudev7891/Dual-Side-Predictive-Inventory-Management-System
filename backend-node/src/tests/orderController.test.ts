import { describe, it, expect } from 'vitest';
import { placeOrderSchema } from '../controllers/orderController';

describe('placeOrderSchema validation', () => {
  const validOrder = {
    supplier_id: '439a3f2a-e274-4b53-8b74-325bdf25b399',
    items: [
      {
        product_id: '1e5e01b3-6c77-47b2-bdcf-884848bc9568',
        qty: 12,
      },
    ],
  };

  it('should successfully validate a correct placeOrder payload', () => {
    const result = placeOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it('should fail validation if supplier_id is missing', () => {
    const invalid = { ...validOrder };
    delete (invalid as any).supplier_id;

    const result = placeOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation if supplier_id is not a valid UUID', () => {
    const invalid = { ...validOrder, supplier_id: 'invalid-id' };
    
    const result = placeOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation if items list is empty', () => {
    const invalid = { ...validOrder, items: [] };
    
    const result = placeOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation if an item quantity is non-positive', () => {
    const invalid = {
      ...validOrder,
      items: [
        {
          product_id: '1e5e01b3-6c77-47b2-bdcf-884848bc9568',
          qty: 0,
        },
      ],
    };
    
    const result = placeOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation if product_id in items is not a valid UUID', () => {
    const invalid = {
      ...validOrder,
      items: [
        {
          product_id: 'invalid-uuid-format',
          qty: 5,
        },
      ],
    };
    
    const result = placeOrderSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
