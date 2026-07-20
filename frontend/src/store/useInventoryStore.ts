import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock_qty: number;
  supplier_id: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

interface InventoryState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: (role: 'supplier' | 'retailer', userId?: string) => Promise<void>;
  setProducts: (products: Product[]) => void;
  updateStock: (productId: string, stockQty: number) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  loading: false,
  error: null,
  setProducts: (products) => set({ products }),
  updateStock: (productId, stockQty) => {
    set({
      products: get().products.map(p => p.id === productId ? { ...p, stock_qty: stockQty } : p)
    });
  },
  fetchProducts: async (role, userId) => {
    set({ loading: true, error: null });
    try {
      let query = supabase.from('products').select(`
        id,
        sku,
        name,
        price,
        stock_qty,
        supplier_id,
        created_at,
        profiles (
          full_name
        )
      `);
      
      if (role === 'supplier' && userId) {
        query = query.eq('supplier_id', userId);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      set({ products: (data as any) || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  }
}));
