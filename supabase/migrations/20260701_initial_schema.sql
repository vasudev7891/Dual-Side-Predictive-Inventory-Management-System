-- ====================================================================
-- Milestone 1: Initial DDL Schema & Row Level Security (RLS) Policies
-- Project: Dual-Sided Predictive Demand Forecasting & B2B Inventory System
-- ====================================================================

-- 1. Enums and Extentions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('supplier', 'retailer');
    END IF;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    stock_qty INT DEFAULT 0 CHECK (stock_qty >= 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0.00),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supplier_id, sku)
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    retailer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    supplier_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0.00),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    qty INT NOT NULL CHECK (qty > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sales History Table
CREATE TABLE IF NOT EXISTS sales_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    retailer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sold_at TIMESTAMPTZ DEFAULT NOW(),
    qty_sold INT NOT NULL CHECK (qty_sold > 0)
);

-- ====================================================================
-- Performance Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_retailer ON orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_retailer_product ON sales_history(retailer_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_sold_at ON sales_history(sold_at);

-- ====================================================================
-- Row Level Security (RLS) Configurations
-- ====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow authenticated users to read profiles"
    ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to insert their own profile"
    ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
    ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Products Policies
CREATE POLICY "Allow authenticated users to view products catalog"
    ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow suppliers to manage their own products"
    ON products FOR ALL TO authenticated
    USING (
        auth.uid() = supplier_id 
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supplier'
        )
    );

-- Orders Policies
CREATE POLICY "Allow users to read their own placed/received orders"
    ON orders FOR SELECT TO authenticated
    USING (auth.uid() = retailer_id OR auth.uid() = supplier_id);

-- Order Items Policies
CREATE POLICY "Allow users to read order items of their own orders"
    ON order_items FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.retailer_id = auth.uid() OR orders.supplier_id = auth.uid())
        )
    );

-- Sales History Policies
CREATE POLICY "Allow retailers to manage their own sales history"
    ON sales_history FOR ALL TO authenticated
    USING (
        auth.uid() = retailer_id
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'retailer'
        )
    );

-- ====================================================================
-- Transaction Store Stored Procedures
-- ====================================================================

-- Function to place a concurrent-safe order
CREATE OR REPLACE FUNCTION place_order(
    p_retailer_id UUID,
    p_supplier_id UUID,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_stock INT;
    v_price DECIMAL(10,2);
    v_total DECIMAL(10,2) := 0.00;
BEGIN
    -- 1. Create the order row with total 0 initially
    INSERT INTO orders (retailer_id, supplier_id, status, total_amount)
    VALUES (p_retailer_id, p_supplier_id, 'pending', 0.00)
    RETURNING id INTO v_order_id;

    -- 2. Process each product item in array
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, qty INT) LOOP
        -- Fetch and Lock row
        SELECT stock_qty, price INTO v_stock, v_price
        FROM products
        WHERE id = v_item.product_id AND supplier_id = p_supplier_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found or does not belong to supplier', v_item.product_id;
        END IF;

        -- Verify stock availability
        IF v_stock < v_item.qty THEN
            RAISE EXCEPTION 'Insufficient stock for product. ID: %, Requested: %, Available: %', v_item.product_id, v_item.qty, v_stock;
        END IF;

        -- Deduct inventory stock
        UPDATE products
        SET stock_qty = stock_qty - v_item.qty
        WHERE id = v_item.product_id;

        -- Add order item row
        INSERT INTO order_items (order_id, product_id, qty)
        VALUES (v_order_id, v_item.product_id, v_item.qty);

        -- Add value to total amount
        v_total := v_total + (v_price * v_item.qty);
    END LOOP;

    -- 3. Update the final order total amount
    UPDATE orders
    SET total_amount = v_total
    WHERE id = v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
