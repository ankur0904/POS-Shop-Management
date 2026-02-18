// Database Types - Auto-generated from Supabase Schema

export type UserRole = "admin" | "cashier" | "inventory_manager";
export type InventoryAction = "sale" | "restock" | "adjustment" | "return";
export type PaymentMethod = "cash" | "digital" | "card" | "upi" | "other";
export type SaleStatus = "completed" | "refunded" | "partial_refund";

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
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  status: SaleStatus;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
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
