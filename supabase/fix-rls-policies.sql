-- FIX: Infinite recursion in RLS policies
-- Run this in Supabase SQL Editor to fix the circular dependency

-- =====================================================
-- DROP OLD POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their shops" ON shops;
DROP POLICY IF EXISTS "Users can view roles in their shops" ON user_roles;

-- =====================================================
-- CREATE FIXED POLICIES
-- =====================================================

-- Shops: Simple policy without circular reference to user_roles
CREATE POLICY "Users can view their shops"
ON shops FOR SELECT
USING (owner_id = auth.uid());

-- User roles: Simple policy without trying to join shops
CREATE POLICY "Users can view roles in their shops"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Now create a separate policy for viewing shops through roles
-- This allows staff to see shops they're assigned to
CREATE POLICY "Staff can view assigned shops"
ON shops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.shop_id = shops.id 
    AND user_roles.user_id = auth.uid()
  )
);
