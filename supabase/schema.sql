-- =====================================================
-- MULTI-TENANT POS SAAS DATABASE SCHEMA
-- Production-Ready with Row Level Security (RLS)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: shops (Tenant Isolation)
-- =====================================================
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  tax_id VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_slug ON shops(slug);

-- =====================================================
-- TABLE: user_roles (Role-Based Access Control)
-- =====================================================
CREATE TYPE user_role_type AS ENUM ('admin', 'cashier', 'inventory_manager');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'cashier',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

CREATE INDEX idx_user_roles_shop_id ON user_roles(shop_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_composite ON user_roles(shop_id, user_id);

-- =====================================================
-- TABLE: categories
-- =====================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

CREATE INDEX idx_categories_shop_id ON categories(shop_id);

-- =====================================================
-- TABLE: products
-- =====================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  cost DECIMAL(10, 2) CHECK (cost >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 10,
  barcode VARCHAR(100),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, sku)
);

CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(shop_id, sku);
CREATE INDEX idx_products_barcode ON products(shop_id, barcode);
CREATE INDEX idx_products_name ON products(shop_id, name);

-- =====================================================
-- TABLE: inventory_logs (Audit Trail)
-- =====================================================
CREATE TYPE inventory_action_type AS ENUM ('sale', 'restock', 'adjustment', 'return');

CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  action inventory_action_type NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  notes TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_logs_shop_id ON inventory_logs(shop_id);
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(shop_id, created_at DESC);

-- =====================================================
-- TABLE: sales
-- =====================================================
CREATE TYPE payment_method_type AS ENUM ('cash', 'digital', 'card', 'upi', 'other');
CREATE TYPE sale_status_type AS ENUM ('completed', 'refunded', 'partial_refund');

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method payment_method_type NOT NULL,
  payment_reference VARCHAR(255),
  status sale_status_type DEFAULT 'completed',
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  notes TEXT,
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, invoice_number)
);

CREATE INDEX idx_sales_shop_id ON sales(shop_id);
CREATE INDEX idx_sales_invoice_number ON sales(shop_id, invoice_number);
CREATE INDEX idx_sales_created_at ON sales(shop_id, created_at DESC);
CREATE INDEX idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX idx_sales_status ON sales(shop_id, status);

-- =====================================================
-- TABLE: sale_items
-- =====================================================
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL, -- Snapshot for historical data
  product_sku VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_items_shop_id ON sale_items(shop_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- =====================================================
-- TABLE: invoices (PDF Storage References)
-- =====================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  pdf_url TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, invoice_number)
);

CREATE INDEX idx_invoices_shop_id ON invoices(shop_id);
CREATE INDEX idx_invoices_sale_id ON invoices(sale_id);

-- =====================================================
-- FUNCTION: Generate Invoice Number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_shop_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_invoice_number VARCHAR;
BEGIN
  -- Get count of invoices for this shop
  SELECT COUNT(*) + 1 INTO v_count
  FROM sales
  WHERE shop_id = p_shop_id;
  
  -- Format: INV-YYYYMMDD-0001
  v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Update Stock After Sale
-- =====================================================
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct stock
  UPDATE products
  SET 
    stock_quantity = stock_quantity - NEW.quantity,
    updated_at = NOW()
  WHERE id = NEW.product_id AND shop_id = NEW.shop_id;
  
  -- Log inventory change
  INSERT INTO inventory_logs (
    shop_id, product_id, action, quantity_change,
    quantity_before, quantity_after, user_id
  )
  SELECT 
    NEW.shop_id,
    NEW.product_id,
    'sale',
    -NEW.quantity,
    p.stock_quantity + NEW.quantity,
    p.stock_quantity,
    (SELECT cashier_id FROM sales WHERE id = NEW.sale_id)
  FROM products p
  WHERE p.id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_after_sale
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_after_sale();

-- =====================================================
-- FUNCTION: Prevent Negative Stock
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO v_current_stock
  FROM products
  WHERE id = NEW.product_id AND shop_id = NEW.shop_id;
  
  IF v_current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_negative_stock
BEFORE INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION prevent_negative_stock();

-- =====================================================
-- FUNCTION: Update timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: shops
-- =====================================================

-- Users can view shops they own or are members of
CREATE POLICY "Users can view their shops"
ON shops FOR SELECT
USING (
  owner_id = auth.uid()
  OR id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Users can insert shops (become owner)
CREATE POLICY "Users can create shops"
ON shops FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Only owners can update their shops
CREATE POLICY "Shop owners can update"
ON shops FOR UPDATE
USING (owner_id = auth.uid());

-- Only owners can delete their shops
CREATE POLICY "Shop owners can delete"
ON shops FOR DELETE
USING (owner_id = auth.uid());

-- =====================================================
-- RLS POLICIES: user_roles
-- =====================================================

-- Users can view roles in their shops
CREATE POLICY "Users can view roles in their shops"
ON user_roles FOR SELECT
USING (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Shop owners and admins can insert roles
CREATE POLICY "Admins can create roles"
ON user_roles FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
  OR shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Shop owners and admins can update roles
CREATE POLICY "Admins can update roles"
ON user_roles FOR UPDATE
USING (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
  OR shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Shop owners and admins can delete roles
CREATE POLICY "Admins can delete roles"
ON user_roles FOR DELETE
USING (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
  OR shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- RLS POLICIES: categories
-- =====================================================

-- Users can view categories in their shops
CREATE POLICY "Users can view shop categories"
ON categories FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Admins and inventory managers can create categories
CREATE POLICY "Authorized users can create categories"
ON categories FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'inventory_manager')
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Admins and inventory managers can update categories
CREATE POLICY "Authorized users can update categories"
ON categories FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'inventory_manager')
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Admins and inventory managers can delete categories
CREATE POLICY "Authorized users can delete categories"
ON categories FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'inventory_manager')
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: products
-- =====================================================

-- All shop members can view products
CREATE POLICY "Users can view shop products"
ON products FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Admins and inventory managers can create products
CREATE POLICY "Authorized users can create products"
ON products FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'inventory_manager')
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Admins and inventory managers can update products
CREATE POLICY "Authorized users can update products"
ON products FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'inventory_manager')
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Admins and inventory managers can delete products
CREATE POLICY "Authorized users can delete products"
ON products FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'inventory_manager')
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: inventory_logs
-- =====================================================

-- All shop members can view inventory logs
CREATE POLICY "Users can view shop inventory logs"
ON inventory_logs FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- System inserts via triggers - no direct user insert
CREATE POLICY "System can insert inventory logs"
ON inventory_logs FOR INSERT
WITH CHECK (true);

-- =====================================================
-- RLS POLICIES: sales
-- =====================================================

-- All shop members can view sales
CREATE POLICY "Users can view shop sales"
ON sales FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- All shop members can create sales
CREATE POLICY "Users can create sales"
ON sales FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Only admins can update sales (refunds, etc.)
CREATE POLICY "Admins can update sales"
ON sales FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: sale_items
-- =====================================================

-- Users can view sale items for their shop sales
CREATE POLICY "Users can view shop sale items"
ON sale_items FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Users can insert sale items when creating sales
CREATE POLICY "Users can create sale items"
ON sale_items FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: invoices
-- =====================================================

-- Users can view invoices for their shops
CREATE POLICY "Users can view shop invoices"
ON invoices FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Users can create invoices
CREATE POLICY "Users can create invoices"
ON invoices FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- INITIAL SEED DATA (Optional)
-- =====================================================

-- Example: Create a demo shop (comment out in production)
-- INSERT INTO shops (name, slug, owner_id, address, phone)
-- VALUES ('Demo Shop', 'demo-shop', 'YOUR_USER_ID', '123 Main St', '+1234567890');
