import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../utils/apiClient';

export interface CartItem {
  product_id: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  supplier_id: string;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  addToCart: (product: { id: string; name: string; sku: string; price: number; supplier_id: string }, qty: number) => { success: boolean; message?: string };
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  checkout: (token: string) => Promise<{ success: boolean; error?: string; order?: any }>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,

      addToCart: (product, qty) => {
        const currentItems = get().items;
        
        const existingIndex = currentItems.findIndex(item => item.product_id === product.id);

        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex].qty += qty;
          set({ items: updated });
        } else {
          set({ 
            items: [...currentItems, {
              product_id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              qty,
              supplier_id: product.supplier_id
            }] 
          });
        }

        return { success: true };
      },

      removeFromCart: (productId) => {
        set({ items: get().items.filter(item => item.product_id !== productId) });
      },

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set({
          items: get().items.map(item => 
            item.product_id === productId ? { ...item, qty } : item
          )
        });
      },

      clearCart: () => set({ items: [], error: null }),

      checkout: async (_token: string) => {
        const currentItems = get().items;
        if (currentItems.length === 0) {
          return { success: false, error: 'Cannot checkout an empty cart.' };
        }

        set({ loading: true, error: null });

        const supplierIds = Array.from(new Set(currentItems.map(item => item.supplier_id)));
        const successOrders: any[] = [];
        const failedOrders: { supplier_id: string; error: string }[] = [];

        try {
          for (const sId of supplierIds) {
            const supplierItems = currentItems.filter(item => item.supplier_id === sId);
            const checkoutItems = supplierItems.map(item => ({
              product_id: item.product_id,
              qty: item.qty
            }));

            try {
              const response = await apiClient.post(
                '/api/orders',
                {
                  supplier_id: sId,
                  items: checkoutItems
                }
              );
              successOrders.push(response.data.order);
              
              // Remove successful items from cart local state
              const itemIds = supplierItems.map(x => x.product_id);
              set({ items: get().items.filter(x => !itemIds.includes(x.product_id)) });
            } catch (err: any) {
              const errMsg = err.response?.data?.details || err.response?.data?.error || 'Checkout transaction failed.';
              failedOrders.push({
                supplier_id: sId,
                error: errMsg
              });
            }
          }

          set({ loading: false });

          if (failedOrders.length > 0) {
            const errorList = failedOrders.map(f => f.error).join('; ');
            if (successOrders.length > 0) {
              return { 
                success: false, 
                error: `Partial Success: Checked out ${successOrders.length} order(s), but failed for others: ${errorList}` 
              };
            }
            return { success: false, error: `Checkout failed: ${errorList}` };
          }

          const combinedId = successOrders.map(o => o.id.substring(0, 8)).join(', ');
          return { success: true, order: { id: combinedId, status: 'completed' } };

        } catch (err: any) {
          set({ error: err.message, loading: false });
          return { success: false, error: err.message };
        }
      }
    }),
    {
      name: 'ims-cart-storage',
      partialize: (state) => ({ items: state.items })
    }
  )
);
