import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../store/useCartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    // Clear cart before each test run
    useCartStore.getState().clearCart();
  });

  it('should initialize with an empty cart items list', () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should successfully add a product item to the cart', () => {
    const product = {
      id: 'p-1',
      name: 'Test Product A',
      sku: 'SKU-001',
      price: 15.99,
      supplier_id: 's-1',
    };
    
    const result = useCartStore.getState().addToCart(product, 3);
    expect(result.success).toBe(true);
    
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({
      product_id: 'p-1',
      name: 'Test Product A',
      sku: 'SKU-001',
      price: 15.99,
      qty: 3,
      supplier_id: 's-1',
    });
  });

  it('should allow multi-supplier items in the cart', () => {
    const p1 = { id: 'p-1', name: 'Product A', sku: 'SKU-001', price: 10.0, supplier_id: 's-1' };
    const p2 = { id: 'p-2', name: 'Product B', sku: 'SKU-002', price: 20.0, supplier_id: 's-2' };
    
    // Add first item (s-1)
    const r1 = useCartStore.getState().addToCart(p1, 1);
    expect(r1.success).toBe(true);
    
    // Add second item (s-2)
    const r2 = useCartStore.getState().addToCart(p2, 2);
    expect(r2.success).toBe(true);
    
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.items[0].product_id).toBe('p-1');
    expect(state.items[1].product_id).toBe('p-2');
  });

  it('should remove items correctly upon calling removeFromCart', () => {
    const p = { id: 'p-1', name: 'Product A', sku: 'SKU-001', price: 10.0, supplier_id: 's-1' };
    useCartStore.getState().addToCart(p, 2);
    expect(useCartStore.getState().items).toHaveLength(1);

    useCartStore.getState().removeFromCart('p-1');
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('should update quantity correctly, and remove item if quantity drops to zero', () => {
    const p = { id: 'p-1', name: 'Product A', sku: 'SKU-001', price: 10.0, supplier_id: 's-1' };
    useCartStore.getState().addToCart(p, 5);
    
    // Decrease qty
    useCartStore.getState().updateQty('p-1', 3);
    expect(useCartStore.getState().items[0].qty).toBe(3);

    // Decrease qty to 0 -> should remove product
    useCartStore.getState().updateQty('p-1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
