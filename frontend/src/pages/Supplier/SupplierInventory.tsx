import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  Package, 
  Upload, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  FileSpreadsheet,
  X,
  Search,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { useToastStore } from '../../store/useToastStore';

interface Product {
  id: string;
  supplier_id: string;
  sku: string;
  name: string;
  price: number;
  stock_qty: number;
  created_at: string;
}

export const SupplierInventory: React.FC = () => {
  const { session } = useAuthStore();
  
  // State variables
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { addToast } = useToastStore();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // CSV upload states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    insertedCount?: number;
    warningCount?: number;
    warnings?: any[];
    error?: string;
  } | null>(null);

  // Fetch product list
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAddModal = () => {
    setEditingProduct(null);
    setSku('');
    setName('');
    setPrice('');
    setStockQty('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setSku(product.sku);
    setName(product.name);
    setPrice(String(product.price));
    setStockQty(String(product.stock_qty));
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Validations
    if (!sku.trim() || !name.trim() || !price || !stockQty) {
      setFormError('All fields are required.');
      return;
    }

    const priceNum = parseFloat(price);
    const qtyNum = parseInt(stockQty, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Price must be a non-negative number.');
      return;
    }
    if (isNaN(qtyNum) || qtyNum < 0) {
      setFormError('Stock quantity must be a non-negative integer.');
      return;
    }

    setFormLoading(true);

    try {
      if (editingProduct) {
        // UPDATE
        const { error } = await supabase
          .from('products')
          .update({
            sku: sku.trim(),
            name: name.trim(),
            price: priceNum,
            stock_qty: qtyNum
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        // INSERT
        // Note: supplier_id is handled by RLS insert checker policy or we can attach it explicitly
        const supplierId = session?.user.id;
        const { error } = await supabase
          .from('products')
          .insert({
            supplier_id: supplierId,
            sku: sku.trim(),
            name: name.trim(),
            price: priceNum,
            stock_qty: qtyNum
          });

        if (error) {
          if (error.message.includes('unique_supplier_id_sku') || error.message.includes('unique')) {
            throw new Error(`A product with SKU "${sku}" already exists in your catalog.`);
          }
          throw error;
        }
      }

      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product catalog.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteProduct = async () => {
    if (!deleteConfirmId) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteConfirmId);

      if (error) throw error;
      addToast('Product successfully deleted.', 'success');
      fetchProducts();
    } catch (err: any) {
      addToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // CSV Drag and Drop
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUploadCsv = async () => {
    if (!csvFile || !session) return;

    setUploadingCsv(true);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const response = await apiClient.post(
          '/api/inventory/bulk',
          { csvString: text }
        );

        setUploadResult({
          success: true,
          insertedCount: response.data.inserted_count,
          warningCount: response.data.warning_count,
          warnings: response.data.warnings
        });
        
        fetchProducts();
        setCsvFile(null);
      } catch (err: any) {
        console.error('CSV upload endpoint failed:', err);
        setUploadResult({
          success: false,
          error: err.response?.data?.error || err.response?.data?.details || 'Failed to process CSV file on backend.'
        });
      } finally {
        setUploadingCsv(false);
      }
    };

    reader.onerror = () => {
      setUploadResult({ success: false, error: 'Failed to read local file.' });
      setUploadingCsv(false);
    };

    reader.readAsText(csvFile);
  };

  const getStockBadge = (qty: number) => {
    if (qty === 0) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/40 border border-rose-900/30 text-rose-400">Out of Stock</span>;
    }
    if (qty < 20) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 border border-amber-900/30 text-amber-400">Low Stock ({qty})</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 border border-emerald-900/30 text-emerald-400">In Stock ({qty})</span>;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top action grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* CSV Upload panel */}
        <div className="md:col-span-1 glass-panel-supplier rounded-2xl p-6 flex flex-col justify-between h-fit">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded bg-violet-950/40 border border-violet-850 text-violet-400">
                <Upload className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-100">CSV Bulk Catalog Upload</h3>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Upload a comma-separated `.csv` file. Existing items with matching SKUs will be updated; new SKUs will be added.
            </p>

            <div className="border border-dashed border-zinc-800 hover:border-violet-900/50 rounded-xl p-4 bg-zinc-900/20 text-center transition-colors cursor-pointer relative group">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleCsvChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="h-8 w-8 text-zinc-500 mx-auto mb-2 group-hover:text-violet-400 transition-colors" />
              <span className="block text-xs font-semibold text-zinc-300">
                {csvFile ? csvFile.name : 'Select catalog CSV file'}
              </span>
              <span className="block text-[10px] text-zinc-650 mt-1">Headers: sku, name, price, stock</span>
            </div>

            {/* Results Output */}
            {uploadResult && (
              <div className={`mt-6 p-4 rounded-xl border text-xs ${
                uploadResult.success 
                  ? 'border-emerald-900/30 bg-emerald-950/10 text-emerald-300' 
                  : 'border-rose-900/30 bg-rose-950/10 text-rose-400'
              }`}>
                <div className="flex items-start gap-2">
                  {uploadResult.success ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">
                      {uploadResult.success ? 'Upload Success!' : 'Upload Failed'}
                    </p>
                    {uploadResult.success && (
                      <p className="mt-1">
                        Upserted <span className="font-bold">{uploadResult.insertedCount}</span> items. 
                        Warnings: {uploadResult.warningCount}.
                      </p>
                    )}
                    {uploadResult.error && <p className="mt-1">{uploadResult.error}</p>}
                  </div>
                </div>

                {/* Warnings lists */}
                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/40 max-h-32 overflow-y-auto space-y-1 text-[10px] text-zinc-500 font-mono">
                    {uploadResult.warnings.map((w, idx) => (
                      <div key={idx}>Row {w.row}: {w.errors.join(', ')}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {csvFile && (
            <button
              onClick={handleUploadCsv}
              disabled={uploadingCsv}
              className="mt-6 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold text-zinc-100 flex items-center justify-center gap-2 shadow-lg shadow-violet-950/20"
            >
              {uploadingCsv ? 'Processing Stream...' : 'Submit Bulk Catalog'}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Product Catalog Grid list */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs placeholder-zinc-550 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-violet-900/30 text-violet-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Product Item
            </button>
          </div>

          {/* Table list */}
          <div className="border border-zinc-850 bg-zinc-900/25 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-xs text-zinc-500">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-violet-500 mx-auto mb-2"></div>
                Loading catalog inventory...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500">
                No items found in inventory catalog.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-400 font-semibold">
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Stock Level</th>
                      <th className="px-6 py-4">Wholesale Price</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850/60">
                    {paginatedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-zinc-350">{product.sku}</td>
                        <td className="px-6 py-4 font-medium text-zinc-200">{product.name}</td>
                        <td className="px-6 py-4">{getStockBadge(product.stock_qty)}</td>
                        <td className="px-6 py-4 font-medium text-zinc-200">${product.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-250 transition-colors"
                              title="Edit item"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-rose-450 hover:text-rose-400 transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="p-4 border-t border-zinc-850 flex justify-center items-center gap-4 text-xs">
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
      </div>

      {/* Catalog Item Modal Form (Add/Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-350"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-violet-400" />
              <h3 className="text-base font-bold">
                {editingProduct ? 'Edit Catalog Item' : 'Add Catalog Item'}
              </h3>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl border border-rose-900/30 bg-rose-950/10 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-sku" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    SKU Code
                  </label>
                  <input
                    id="modal-sku"
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="APPL-001"
                    disabled={editingProduct !== null}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-violet-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="modal-price" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Wholesale Price ($)
                  </label>
                  <input
                    id="modal-price"
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1.50"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-name" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Product Name
                </label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Red Apple Basket"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label htmlFor="modal-stock" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Initial Stock Quantity
                </label>
                <input
                  id="modal-stock"
                  type="number"
                  required
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-xs text-zinc-350"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-bold rounded-xl text-zinc-100 flex items-center gap-2 shadow-lg shadow-violet-950/20"
                >
                  {formLoading ? 'Saving...' : 'Save Catalog Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold">Delete Catalog Item</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Are you sure you want to delete this product from your inventory catalog? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-xs text-zinc-350"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteProduct}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-bold rounded-xl text-zinc-100 shadow-lg shadow-rose-950/20"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
