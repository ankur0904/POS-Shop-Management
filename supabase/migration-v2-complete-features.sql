-- =====================================================
-- MIGRATION V2: Complete POS Features
-- - Suppliers Management
-- - Purchase Orders
-- - Restaurant Tables (Optional)
-- - GST Tax System (CGST + SGST)
-- - Enhanced Reporting
-- =====================================================

-- =====================================================
-- STEP 1: Add new columns to existing tables
-- =====================================================

-- Add restaurant mode and GST settings to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS restaurant_mode_enabled BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS default_gst_rate DECIMAL(5, 2) DEFAULT 0;

-- Add GST breakdown to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cgst_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sgst_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS table_id UUID;

-- Update products table to track cost for profit calculation
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2);
-- Copy existing cost to cost_price if exists
UPDATE products SET cost_price = cost WHERE cost IS NOT NULL AND cost_price IS NULL;

-- =====================================================
-- TABLE: suppliers
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  gst_number VARCHAR(15),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id ON suppliers(shop_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(shop_id, name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(shop_id, is_active);

-- =====================================================
-- TABLE: purchases (Purchase Orders)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status_type') THEN
    CREATE TYPE purchase_status_type AS ENUM ('draft', 'ordered', 'received', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_order_number VARCHAR(50) NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  received_date DATE,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  cgst_percentage DECIMAL(5, 2) DEFAULT 0,
  sgst_percentage DECIMAL(5, 2) DEFAULT 0,
  cgst_amount DECIMAL(10, 2) DEFAULT 0 CHECK (cgst_amount >= 0),
  sgst_amount DECIMAL(10, 2) DEFAULT 0 CHECK (sgst_amount >= 0),
  tax_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_cost DECIMAL(10, 2) DEFAULT 0 CHECK (shipping_cost >= 0),
  other_charges DECIMAL(10, 2) DEFAULT 0 CHECK (other_charges >= 0),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status purchase_status_type DEFAULT 'draft',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, purchase_order_number)
);

CREATE INDEX IF NOT EXISTS idx_purchases_shop_id ON purchases(shop_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_order_date ON purchases(shop_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(shop_id, created_at DESC);

-- =====================================================
-- TABLE: purchase_items
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_shop_id ON purchase_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);

-- =====================================================
-- TABLE: restaurant_tables
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status_type') THEN
    CREATE TYPE table_status_type AS ENUM ('available', 'occupied', 'reserved', 'maintenance');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  table_number VARCHAR(20) NOT NULL,
  table_name VARCHAR(100),
  capacity INTEGER DEFAULT 4,
  status table_status_type DEFAULT 'available',
  current_sale_id UUID,
  floor_section VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_shop_id ON restaurant_tables(shop_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_active ON restaurant_tables(shop_id, is_active);

-- Add foreign key to sales table for table_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sales_table_id_fkey'
  ) THEN
    ALTER TABLE sales ADD CONSTRAINT sales_table_id_fkey 
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_table_id ON sales(table_id);

-- =====================================================
-- TABLE: tax_rates (GST Configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  cgst_percentage DECIMAL(5, 2) NOT NULL CHECK (cgst_percentage >= 0),
  sgst_percentage DECIMAL(5, 2) NOT NULL CHECK (sgst_percentage >= 0),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_shop_id ON tax_rates(shop_id);

-- Ensure only one default tax rate per shop
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_rates_default 
  ON tax_rates(shop_id) 
  WHERE is_default = true AND is_active = true;

-- =====================================================
-- FUNCTION: Generate Purchase Order Number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_purchase_order_number(p_shop_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_po_number VARCHAR;
BEGIN
  -- Get count of purchase orders for this shop
  SELECT COUNT(*) + 1 INTO v_count
  FROM purchases
  WHERE shop_id = p_shop_id;
  
  -- Format: PO-YYYYMMDD-0001
  v_po_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
  
  RETURN v_po_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Update Stock on Purchase Receipt
-- =====================================================
CREATE OR REPLACE FUNCTION update_stock_on_purchase_receive()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status changed to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    
    -- Update received_date
    NEW.received_date := CURRENT_DATE;
    
    -- Update stock for all items in this purchase
    UPDATE products p
    SET 
      stock_quantity = stock_quantity + pi.quantity,
      cost_price = pi.unit_cost,
      updated_at = NOW()
    FROM purchase_items pi
    WHERE pi.purchase_id = NEW.id 
      AND pi.product_id = p.id
      AND pi.shop_id = NEW.shop_id;
    
    -- Update received_quantity in purchase_items
    UPDATE purchase_items
    SET received_quantity = quantity
    WHERE purchase_id = NEW.id;
    
    -- Log inventory changes
    INSERT INTO inventory_logs (
      shop_id, product_id, action, quantity_change, 
      quantity_before, quantity_after, user_id, notes
    )
    SELECT 
      NEW.shop_id,
      pi.product_id,
      'restock'::inventory_action_type,
      pi.quantity,
      p.stock_quantity - pi.quantity,
      p.stock_quantity,
      COALESCE(NEW.received_by, NEW.created_by),
      'Purchase Order: ' || NEW.purchase_order_number
    FROM purchase_items pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.purchase_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_on_purchase ON purchases;
CREATE TRIGGER trigger_update_stock_on_purchase
BEFORE UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_purchase_receive();

-- =====================================================
-- FUNCTION: Update Table Status on Sale
-- =====================================================
CREATE OR REPLACE FUNCTION update_table_status_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- When a sale is linked to a table, mark table as occupied
  IF NEW.table_id IS NOT NULL THEN
    UPDATE restaurant_tables
    SET 
      status = 'occupied'::table_status_type,
      current_sale_id = NEW.id,
      updated_at = NOW()
    WHERE id = NEW.table_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_table_status ON sales;
CREATE TRIGGER trigger_update_table_status
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_table_status_on_sale();

-- =====================================================
-- FUNCTION: Free Table on Sale Completion
-- =====================================================
CREATE OR REPLACE FUNCTION free_table_on_sale_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- When a sale is completed and linked to a table, free the table
  IF NEW.status = 'completed' AND NEW.table_id IS NOT NULL THEN
    UPDATE restaurant_tables
    SET 
      status = 'available'::table_status_type,
      current_sale_id = NULL,
      updated_at = NOW()
    WHERE id = NEW.table_id AND current_sale_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_free_table ON sales;
CREATE TRIGGER trigger_free_table
AFTER UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION free_table_on_sale_complete();

-- =====================================================
-- Apply updated_at trigger to new tables
-- =====================================================
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at 
  BEFORE UPDATE ON suppliers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
CREATE TRIGGER update_purchases_updated_at 
  BEFORE UPDATE ON purchases 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_tables_updated_at ON restaurant_tables;
CREATE TRIGGER update_restaurant_tables_updated_at 
  BEFORE UPDATE ON restaurant_tables 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tax_rates_updated_at ON tax_rates;
CREATE TRIGGER update_tax_rates_updated_at 
  BEFORE UPDATE ON tax_rates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: suppliers
-- =====================================================
DROP POLICY IF EXISTS "Users can view shop suppliers" ON suppliers;
CREATE POLICY "Users can view shop suppliers"
ON suppliers FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authorized users can create suppliers" ON suppliers;
CREATE POLICY "Authorized users can create suppliers"
ON suppliers FOR INSERT
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

DROP POLICY IF EXISTS "Authorized users can update suppliers" ON suppliers;
CREATE POLICY "Authorized users can update suppliers"
ON suppliers FOR UPDATE
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

DROP POLICY IF EXISTS "Authorized users can delete suppliers" ON suppliers;
CREATE POLICY "Authorized users can delete suppliers"
ON suppliers FOR DELETE
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
-- RLS POLICIES: purchases
-- =====================================================
DROP POLICY IF EXISTS "Users can view shop purchases" ON purchases;
CREATE POLICY "Users can view shop purchases"
ON purchases FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authorized users can create purchases" ON purchases;
CREATE POLICY "Authorized users can create purchases"
ON purchases FOR INSERT
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

DROP POLICY IF EXISTS "Authorized users can update purchases" ON purchases;
CREATE POLICY "Authorized users can update purchases"
ON purchases FOR UPDATE
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

DROP POLICY IF EXISTS "Authorized users can delete purchases" ON purchases;
CREATE POLICY "Authorized users can delete purchases"
ON purchases FOR DELETE
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
-- RLS POLICIES: purchase_items
-- =====================================================
DROP POLICY IF EXISTS "Users can view shop purchase items" ON purchase_items;
CREATE POLICY "Users can view shop purchase items"
ON purchase_items FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authorized users can manage purchase items" ON purchase_items;
CREATE POLICY "Authorized users can manage purchase items"
ON purchase_items FOR ALL
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
-- RLS POLICIES: restaurant_tables
-- =====================================================
DROP POLICY IF EXISTS "Users can view shop tables" ON restaurant_tables;
CREATE POLICY "Users can view shop tables"
ON restaurant_tables FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authorized users can manage tables" ON restaurant_tables;
CREATE POLICY "Authorized users can manage tables"
ON restaurant_tables FOR ALL
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'cashier')
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: tax_rates
-- =====================================================
DROP POLICY IF EXISTS "Users can view shop tax rates" ON tax_rates;
CREATE POLICY "Users can view shop tax rates"
ON tax_rates FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage tax rates" ON tax_rates;
CREATE POLICY "Admins can manage tax rates"
ON tax_rates FOR ALL
USING (
  shop_id IN (
    SELECT shop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- Insert default GST tax rates for new shops
-- =====================================================
-- This will be handled by the application when a shop is created
-- Common Indian GST rates: 0%, 5%, 12%, 18%, 28%

COMMENT ON TABLE suppliers IS 'Suppliers/Vendors for purchase management';
COMMENT ON TABLE purchases IS 'Purchase orders for inventory procurement';
COMMENT ON TABLE purchase_items IS 'Line items for purchase orders';
COMMENT ON TABLE restaurant_tables IS 'Restaurant table management (optional feature)';
COMMENT ON TABLE tax_rates IS 'GST/Tax configuration with CGST+SGST split';
COMMENT ON COLUMN shops.restaurant_mode_enabled IS 'Enable restaurant table management features';
COMMENT ON COLUMN shops.default_gst_rate IS 'Default GST percentage for this shop';
COMMENT ON COLUMN sales.cgst_amount IS 'Central GST amount';
COMMENT ON COLUMN sales.sgst_amount IS 'State GST amount';
