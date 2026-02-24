-- =====================================================
-- FIX v3: RLS Policies - NO circular dependencies
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================
-- Root cause: shops SELECT references user_roles,
-- and user_roles SELECT references shops = infinite loop.
-- Fix: user_roles SELECT uses ONLY user_id = auth.uid()
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL existing policies on ALL tables
-- =====================================================

-- shops
DROP POLICY IF EXISTS "Users can view their shops" ON shops;
DROP POLICY IF EXISTS "Staff can view assigned shops" ON shops;
DROP POLICY IF EXISTS "Users can create shops" ON shops;
DROP POLICY IF EXISTS "Shop owners can update their shops" ON shops;
DROP POLICY IF EXISTS "Shop owners can delete their shops" ON shops;

-- user_roles
DROP POLICY IF EXISTS "Users can view roles in their shops" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can create roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- categories
DROP POLICY IF EXISTS "Users can view shop categories" ON categories;
DROP POLICY IF EXISTS "Authorized users can create categories" ON categories;
DROP POLICY IF EXISTS "Authorized users can update categories" ON categories;
DROP POLICY IF EXISTS "Authorized users can delete categories" ON categories;

-- products
DROP POLICY IF EXISTS "Users can view shop products" ON products;
DROP POLICY IF EXISTS "Authorized users can create products" ON products;
DROP POLICY IF EXISTS "Authorized users can update products" ON products;
DROP POLICY IF EXISTS "Authorized users can delete products" ON products;

-- inventory_logs
DROP POLICY IF EXISTS "Users can view shop inventory logs" ON inventory_logs;
DROP POLICY IF EXISTS "System can insert inventory logs" ON inventory_logs;

-- sales
DROP POLICY IF EXISTS "Users can view shop sales" ON sales;
DROP POLICY IF EXISTS "Users can create sales" ON sales;
DROP POLICY IF EXISTS "Admins can update sales" ON sales;

-- sale_items
DROP POLICY IF EXISTS "Users can view shop sale items" ON sale_items;
DROP POLICY IF EXISTS "Users can create sale items" ON sale_items;

-- invoices
DROP POLICY IF EXISTS "Users can view shop invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;

-- =====================================================
-- STEP 2: Drop old helper functions (now safe)
-- =====================================================
DROP FUNCTION IF EXISTS is_shop_owner(UUID);
DROP FUNCTION IF EXISTS has_shop_role(UUID, text[]);
DROP FUNCTION IF EXISTS is_shop_member(UUID);

-- =====================================================
-- STEP 3: Recreate shops policies (can reference user_roles)
-- =====================================================
CREATE POLICY "Users can view their shops"
ON shops FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.shop_id = shops.id AND user_roles.user_id = auth.uid())
);

CREATE POLICY "Users can create shops"
ON shops FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Shop owners can update their shops"
ON shops FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Shop owners can delete their shops"
ON shops FOR DELETE
USING (owner_id = auth.uid());

-- =====================================================
-- STEP 4: Recreate user_roles policies
-- CRITICAL: SELECT must NOT reference shops table!
-- This breaks the circular dependency.
-- =====================================================
CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can create roles"
ON user_roles FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM shops WHERE id = user_roles.shop_id AND owner_id = auth.uid())
);

CREATE POLICY "Admins can update roles"
ON user_roles FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = user_roles.shop_id AND owner_id = auth.uid())
);

CREATE POLICY "Admins can delete roles"
ON user_roles FOR DELETE
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = user_roles.shop_id AND owner_id = auth.uid())
);

-- =====================================================
-- STEP 5: Recreate categories policies
-- =====================================================
CREATE POLICY "Users can view shop categories"
ON categories FOR SELECT
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = categories.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = categories.shop_id AND user_id = auth.uid())
);

CREATE POLICY "Authorized users can create categories"
ON categories FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM shops WHERE id = categories.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = categories.shop_id AND user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
);

CREATE POLICY "Authorized users can update categories"
ON categories FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = categories.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = categories.shop_id AND user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
);

CREATE POLICY "Authorized users can delete categories"
ON categories FOR DELETE
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = categories.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = categories.shop_id AND user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
);

-- =====================================================
-- STEP 6: Recreate products policies
-- =====================================================
CREATE POLICY "Users can view shop products"
ON products FOR SELECT
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = products.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = products.shop_id AND user_id = auth.uid())
);

CREATE POLICY "Authorized users can create products"
ON products FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM shops WHERE id = products.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = products.shop_id AND user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
);

CREATE POLICY "Authorized users can update products"
ON products FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = products.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = products.shop_id AND user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
);

CREATE POLICY "Authorized users can delete products"
ON products FOR DELETE
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = products.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = products.shop_id AND user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
);

-- =====================================================
-- STEP 7: Recreate inventory_logs policies
-- =====================================================
CREATE POLICY "Users can view shop inventory logs"
ON inventory_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = inventory_logs.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = inventory_logs.shop_id AND user_id = auth.uid())
);

CREATE POLICY "System can insert inventory logs"
ON inventory_logs FOR INSERT
WITH CHECK (true);

-- =====================================================
-- STEP 8: Recreate sales policies
-- =====================================================
CREATE POLICY "Users can view shop sales"
ON sales FOR SELECT
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = sales.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = sales.shop_id AND user_id = auth.uid())
);

CREATE POLICY "Users can create sales"
ON sales FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM shops WHERE id = sales.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = sales.shop_id AND user_id = auth.uid())
);

CREATE POLICY "Admins can update sales"
ON sales FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = sales.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = sales.shop_id AND user_id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- STEP 9: Recreate sale_items policies
-- =====================================================
CREATE POLICY "Users can view shop sale items"
ON sale_items FOR SELECT
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = sale_items.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = sale_items.shop_id AND user_id = auth.uid())
);

CREATE POLICY "Users can create sale items"
ON sale_items FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM shops WHERE id = sale_items.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = sale_items.shop_id AND user_id = auth.uid())
);

-- =====================================================
-- STEP 10: Recreate invoices policies
-- =====================================================
CREATE POLICY "Users can view shop invoices"
ON invoices FOR SELECT
USING (
  EXISTS (SELECT 1 FROM shops WHERE id = invoices.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = invoices.shop_id AND user_id = auth.uid())
);

CREATE POLICY "Users can create invoices"
ON invoices FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM shops WHERE id = invoices.shop_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE shop_id = invoices.shop_id AND user_id = auth.uid())
);

-- =====================================================
-- STEP 11: Backfill missing admin roles for existing shop owners
-- =====================================================
INSERT INTO user_roles (shop_id, user_id, role)
SELECT s.id, s.owner_id, 'admin'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.shop_id = s.id AND ur.user_id = s.owner_id
);

-- =====================================================
-- DONE! No more circular dependencies.
-- Chain: other tables -> shops -> user_roles -> STOP
-- (user_roles SELECT never queries shops back)
-- =====================================================
