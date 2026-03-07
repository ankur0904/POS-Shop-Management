// Database Types - Auto-generated from Supabase Schema

export type UserRole = "admin" | "cashier" | "inventory_manager";
export type InventoryAction = "sale" | "restock" | "adjustment" | "return";
export type PaymentMethod = "cash" | "digital" | "card" | "upi" | "other";
export type SaleStatus = "completed" | "refunded" | "partial_refund";
export type PurchaseStatus = "draft" | "ordered" | "received" | "cancelled";
export type TableStatus = "available" | "occupied" | "reserved" | "maintenance";

export interface Shop {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  currency: string;
  logo_url?: string;
  is_active: boolean;
  restaurant_mode_enabled: boolean;
  gst_number?: string;
  default_gst_rate: number;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  shop_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id?: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  cost_price?: number;
  stock_quantity: number;
  low_stock_threshold: number;
  barcode?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryLog {
  id: string;
  shop_id: string;
  product_id: string;
  action: InventoryAction;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  notes?: string;
  user_id: string;
  created_at: string;
}

export interface Sale {
  id: string;
  shop_id: string;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  cgst_percentage: number;
  sgst_percentage: number;
  cgst_amount: number;
  sgst_amount: number;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  status: SaleStatus;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  table_id?: string;
  cashier_id: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  shop_id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  shop_id: string;
  sale_id: string;
  invoice_number: string;
  pdf_url?: string;
  storage_path?: string;
  created_at: string;
}

// Extended types with relations
export interface ProductWithCategory extends Product {
  category?: Category;
}

export interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
}

export interface SaleWithDetails extends Sale {
  sale_items: (SaleItem & { product: Product })[];
}

// =====================================================
// NEW TYPES FOR V2 FEATURES
// =====================================================

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  shop_id: string;
  supplier_id?: string;
  purchase_order_number: string;
  order_date: string;
  expected_delivery_date?: string;
  received_date?: string;
  subtotal: number;
  cgst_percentage: number;
  sgst_percentage: number;
  cgst_amount: number;
  sgst_amount: number;
  tax_amount: number;
  shipping_cost: number;
  other_charges: number;
  total_amount: number;
  status: PurchaseStatus;
  notes?: string;
  created_by: string;
  received_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  shop_id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  received_quantity: number;
  created_at: string;
}

export interface RestaurantTable {
  id: string;
  shop_id: string;
  table_number: string;
  table_name?: string;
  capacity: number;
  status: TableStatus;
  current_sale_id?: string;
  floor_section?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  id: string;
  shop_id: string;
  name: string;
  rate: number;
  cgst_percentage: number;
  sgst_percentage: number;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Extended types with relations for new features
export interface PurchaseWithItems extends Purchase {
  purchase_items: PurchaseItem[];
  supplier?: Supplier;
}

export interface PurchaseWithDetails extends Purchase {
  purchase_items: (PurchaseItem & { product: Product })[];
  supplier?: Supplier;
}

export interface SaleWithTable extends Sale {
  restaurant_table?: RestaurantTable;
}

// =====================================================
// INPUT TYPES FOR FORMS
// =====================================================

export interface CreateSupplierInput {
  name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  notes?: string;
}

export interface CreatePurchaseInput {
  supplier_id?: string;
  order_date: string;
  expected_delivery_date?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_cost: number;
  }>;
  cgst_percentage: number;
  sgst_percentage: number;
  shipping_cost?: number;
  other_charges?: number;
  notes?: string;
}

export interface CreateTaxRateInput {
  name: string;
  rate: number;
  description?: string;
  is_default?: boolean;
}

