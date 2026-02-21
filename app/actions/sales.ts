"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Sale, SaleItem, PaymentMethod } from "@/types/database.types";

export interface CreateSaleData {
  shopId: string;
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
}

export async function createSale(saleData: CreateSaleData) {
  const supabase = await createClient();

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "User not authenticated" };
    }

    // Calculate totals
    const subtotal = saleData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxAmount = saleData.taxAmount || 0;
    const discountAmount = saleData.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Generate invoice number
    const { data: invoiceNumberData } = await supabase.rpc(
      "generate_invoice_number",
      { p_shop_id: saleData.shopId },
    );

    const invoiceNumber = invoiceNumberData || `INV-${Date.now()}`;

    // Check stock availability for all items
    for (const item of saleData.items) {
      const { data: product } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.productId)
        .eq("shop_id", saleData.shopId)
        .single();

      if (!product || product.stock_quantity < item.quantity) {
        return {
          data: null,
          error: `Insufficient stock for ${item.productName}. Available: ${product?.stock_quantity || 0}`,
        };
      }
    }

    // Create sale record
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        shop_id: saleData.shopId,
        invoice_number: invoiceNumber,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_method: saleData.paymentMethod,
        payment_reference: saleData.paymentReference,
        customer_name: saleData.customerName,
        customer_phone: saleData.customerPhone,
        customer_email: saleData.customerEmail,
        notes: saleData.notes,
        cashier_id: user.id,
        status: "completed",
      })
      .select()
      .single();

    if (saleError) {
      return { data: null, error: saleError.message };
    }

    // Create sale items (this will trigger stock update via database trigger)
    const saleItems = saleData.items.map((item) => ({
      shop_id: saleData.shopId,
      sale_id: sale.id,
      product_id: item.productId,
      product_name: item.productName,
      product_sku: item.productSku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.quantity * item.unitPrice,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);

    if (itemsError) {
      // Rollback: delete the sale
      await supabase.from("sales").delete().eq("id", sale.id);
      return { data: null, error: itemsError.message };
    }

    revalidatePath("/pos");
    revalidatePath("/sales");
    revalidatePath("/inventory");

    return { data: sale, error: null };
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return { data: null, error: error.message || "Failed to create sale" };
  }
}

export async function getSales(shopId: string, limit = 50) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getSaleById(saleId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*, product:products(*))")
    .eq("id", saleId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getSalesByDateRange(
  shopId: string,
  startDate: string,
  endDate: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*)")
    .eq("shop_id", shopId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getDailySales(shopId: string) {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from("sales")
    .select("total_amount, payment_method, created_at")
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString());

  if (error) {
    return { data: null, error: error.message };
  }

  const totalRevenue = data.reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0,
  );
  const totalSales = data.length;

  return {
    data: {
      totalRevenue,
      totalSales,
      sales: data,
    },
    error: null,
  };
}
