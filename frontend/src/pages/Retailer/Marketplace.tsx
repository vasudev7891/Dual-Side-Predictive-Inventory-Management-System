import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { 
  Store, 
  ShoppingCart, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  CreditCard,
  Plus,
  Minus
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock_qty: number;
  supplier_id: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

export const Marketplace: React.FC = () => {
  const { session } = useAuthStore();
  const { items: cartItems, addToCart, removeFromCart, updateQty, clearCart, checkout, loading: checkoutLoading, error: checkoutError } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [lastUpdatedProductId, setLastUpdatedProductId] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Fetch all active products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, sku, name, price, stock_qty, supplier_id,
          profiles:supplier_id (
            full_name
          )
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data as unknown as Product[] || []);
      
      // Initialize quantities selectors to 1
      const initialQtys: Record<string, number> = {};
      (data || []).forEach(p => {
        initialQtys[p.id] = 1;
      });
      setQuantities(initialQtys);
    } catch (err: any) {
      console.error('Failed to load marketplace catalog:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Listen for realtime product updates via WebSockets
  useSupabaseRealtime<Product>('products', 'UPDATE', (payload) => {
    const updated = payload.new as Product;
    if (!updated || !updated.id) return;

    setProducts(current => 
      current.map(p => p.id === updated.id ? { ...p, stock_qty: updated.stock_qty } : p)
    );
    
    // Trigger visual pulse animation on updated card
    setLastUpdatedProductId(updated.id);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setLastUpdatedProductId(null), 2000);
  });

  const handleQtyChange = (productId: string, val: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const maxQty = product.stock_qty;
    const safeVal = Math.max(1, Math.min(maxQty, val));
    setQuantities(prev => ({ ...prev, [productId]: safeVal }));
  };

  const handleAddToCart = (product: Product) => {
    setCartError(null);
    const qty = quantities[product.id] || 1;
    
    if (product.stock_qty <= 0) {
      setCartError('This item is currently out of stock.');
      return;
    }

    const result = addToCart({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      supplier_id: product.supplier_id
    }, qty);

    if (!result.success) {
      setCartError(result.message || 'Failed to add to cart.');
    }
  };

  const handleCheckout = async () => {
    if (!session) return;
    setCartError(null);
    setCheckoutSuccess(null);

    const result = await checkout(session.access_token);
    if (result.success) {
      setCheckoutSuccess(result.order);
      // Fetch latest stock amounts
      fetchProducts();
    }
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Group cart items by supplier_id
  const groupedCartItems = cartItems.reduce((acc, item) => {
    const sId = item.supplier_id;
    if (!acc[sId]) acc[sId] = [];
    acc[sId].push(item);
    return acc;
  }, {} as Record<string, typeof cartItems>);

  const getSupplierName = (supplierId: string) => {
    const prod = products.find(p => p.supplier_id === supplierId);
    return prod?.profiles?.full_name || `Wholesale Supplier (${supplierId.substring(0, 4)})`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Marketplace Grid (3/4 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {cartError && (
            <div className="p-4 rounded-xl border border-rose-900/30 bg-rose-950/15 text-rose-450 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {cartError}
              </span>
              <button onClick={() => setCartError(null)} className="text-rose-500 hover:text-rose-400 font-bold">Dismiss</button>
            </div>
          )}

          {checkoutSuccess && (
            <div className="p-5 rounded-2xl border border-emerald-950/30 bg-emerald-950/15 text-emerald-300 text-xs space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-sm">Order Placed Successfully!</span>
              </div>
              <p>Receipt ID: <span className="font-mono text-zinc-200">{checkoutSuccess.id}</span>. Stock levels decremented concurrently.</p>
              <button 
                onClick={() => setCheckoutSuccess(null)} 
                className="px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-850/30 hover:bg-emerald-900/50 text-[10px] uppercase font-bold tracking-wider"
              >
                Close Notification
              </button>
            </div>
          )}

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {loading ? (
              Array(6).fill(0).map((_, idx) => (
                <div key={idx} className="h-48 rounded-2xl bg-zinc-900/30 border border-zinc-900 animate-pulse"></div>
              ))
            ) : products.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-zinc-550">
                The supplier catalog is empty.
              </div>
            ) : (
              paginatedProducts.map((product) => {
                const isUpdated = lastUpdatedProductId === product.id;
                const isOutOfStock = product.stock_qty <= 0;
                const isLowStock = product.stock_qty > 0 && product.stock_qty < 20;

                let borderStyle = 'border-zinc-900/80';
                if (isUpdated) {
                  borderStyle = 'border-indigo-500 ring-2 ring-indigo-500/20';
                } else if (isOutOfStock) {
                  borderStyle = 'border-rose-950/40 bg-rose-950/5';
                } else if (isLowStock) {
                  borderStyle = 'border-amber-950/40';
                }

                return (
                  <div 
                    key={product.id}
                    className={`rounded-2xl border p-5 glass-panel-retailer flex flex-col justify-between h-56 transition-all duration-300 ${borderStyle}`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-[10px] font-mono text-zinc-500 truncate" title="SKU Code">{product.sku}</span>
                        {isUpdated && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-sm text-zinc-100 line-clamp-1">{product.name}</h4>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Supplier: <span className="font-semibold text-zinc-300">{product.profiles?.full_name || 'Wholesale Agent'}</span>
                      </p>
                    </div>

                    <div className="mt-4 space-y-4">
                      {/* Price & Stock status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-zinc-200">${product.price.toFixed(2)}</span>
                        
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-950/40 border border-rose-900/30 text-rose-450">Out of Stock</span>
                        ) : isLowStock ? (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950/40 border border-amber-900/30 text-amber-400 ${isUpdated ? 'animate-pulse' : ''}`}>
                            Low Stock ({product.stock_qty})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/40 border border-emerald-900/30 text-emerald-400">
                            In Stock ({product.stock_qty})
                          </span>
                        )}
                      </div>

                      {/* Quantity Selector & Action */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 overflow-hidden">
                          <button
                            onClick={() => handleQtyChange(product.id, (quantities[product.id] || 1) - 1)}
                            disabled={isOutOfStock}
                            className="p-1 text-zinc-450 hover:bg-zinc-900 rounded disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-3 text-xs font-semibold w-8 text-center text-zinc-200">
                            {isOutOfStock ? 0 : (quantities[product.id] || 1)}
                          </span>
                          <button
                            onClick={() => handleQtyChange(product.id, (quantities[product.id] || 1) + 1)}
                            disabled={isOutOfStock}
                            className="p-1 text-zinc-450 hover:bg-zinc-900 rounded disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-[11px] font-bold text-zinc-100 transition-colors shadow shadow-indigo-950/40"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {totalPages > 1 && (
              <div className="col-span-full mt-6 flex justify-center items-center gap-4 text-xs">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900/60 text-zinc-350 transition-colors"
                >
                  Previous
                </button>
                <span className="text-zinc-400">
                  Page <span className="text-zinc-200 font-bold">{currentPage}</span> of <span className="text-zinc-200 font-bold">{totalPages}</span>
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900/60 text-zinc-350 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Shopping Cart Sidebar (1/4 col) */}
        <div className="lg:col-span-1">
          <div className="glass-panel-retailer rounded-2xl p-6 flex flex-col justify-between h-[calc(100vh-12rem)] sticky top-6">
            <div className="space-y-4 overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-zinc-250">Retailer Cart</h3>
                </div>
                {cartItems.length > 0 && (
                  <button 
                    onClick={clearCart} 
                    className="text-[10px] text-zinc-500 hover:text-zinc-350"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <Store className="h-8 w-8 text-zinc-650 mb-2" />
                    <p className="text-xs text-zinc-550">Your order cart is empty.</p>
                  </div>
                ) : (
                  Object.keys(groupedCartItems).map((sId) => (
                    <div key={sId} className="space-y-2 border-b border-zinc-900/40 pb-3 last:border-0 last:pb-0">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                        {getSupplierName(sId)}
                      </span>
                      
                      <div className="space-y-2">
                        {groupedCartItems[sId].map((item) => (
                          <div key={item.product_id} className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <p className="font-bold text-xs text-zinc-200 line-clamp-1">{item.name}</p>
                                <span className="text-[9px] font-mono text-zinc-500 uppercase">{item.sku}</span>
                              </div>
                              <button
                                onClick={() => removeFromCart(item.product_id)}
                                className="text-zinc-500 hover:text-rose-450 p-0.5 rounded transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-zinc-350">${(item.price * item.qty).toFixed(2)}</span>
                              
                              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800/80 rounded p-0.5">
                                <button 
                                  onClick={() => updateQty(item.product_id, item.qty - 1)}
                                  className="p-0.5 text-zinc-400 hover:bg-zinc-900"
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <span className="text-[10px] font-semibold w-5 text-center">{item.qty}</span>
                                <button 
                                  onClick={() => updateQty(item.product_id, item.qty + 1)}
                                  className="p-0.5 text-zinc-400 hover:bg-zinc-900"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cart checkout footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-zinc-900 pt-4 shrink-0 space-y-4">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-500">Order Subtotal</span>
                  <span className="text-zinc-200 text-sm font-bold">${cartTotal.toFixed(2)}</span>
                </div>
                
                {checkoutError && (
                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-400 text-[10px] leading-relaxed">
                    <div className="flex gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>{checkoutError}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-zinc-100 flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/30"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {checkoutLoading ? 'Executing Lock...' : 'Checkout Safe Order'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
