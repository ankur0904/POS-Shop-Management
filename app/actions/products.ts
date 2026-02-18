"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Product, Category } from "@/types/database.types";

export async function getProducts(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching products:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createProduct(
  shopId: string,
  productData: Partial<Product>,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...productData,
      shop_id: shopId,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/inventory");
  return { data, error: null };
}

export async function updateProduct(
  productId: string,
  productData: Partial<Product>,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .update(productData)
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/inventory");
  return { data, error: null };
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inventory");
  return { error: null };
}

export async function adjustStock(
  shopId: string,
  productId: string,
  quantityChange: number,
  notes?: string,
) {
  const supabase = await createClient();

  // Get current stock
  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "Product not found" };
  }

  const quantityBefore = product.stock_quantity;
  const quantityAfter = quantityBefore + quantityChange;

  if (quantityAfter < 0) {
    return { error: "Insufficient stock" };
  }

  // Update stock
  const { error: updateError } = await supabase
    .from("products")
    .update({ stock_quantity: quantityAfter })
    .eq("id", productId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Log the adjustment
  const { error: logError } = await supabase.from("inventory_logs").insert({
    shop_id: shopId,
    product_id: productId,
    action: quantityChange > 0 ? "restock" : "adjustment",
    quantity_change: quantityChange,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
    notes,
    user_id: user!.id,
  });

  if (logError) {
    console.error("Error logging inventory change:", logError);
  }

  revalidatePath("/inventory");
  return { error: null };
}

export async function getCategories(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("shop_id", shopId)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createCategory(
  shopId: string,
  categoryData: Partial<Category>,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      ...categoryData,
      shop_id: shopId,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/inventory");
  return { data, error: null };
}

export async function getLowStockProducts(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .lt("stock_quantity", supabase.rpc("low_stock_threshold"))
    .order("stock_quantity");

  if (error) {
    // Fallback query
    const { data: fallbackData } = await supabase
      .from("products")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("stock_quantity");

    return {
      data:
        fallbackData?.filter((p) => p.stock_quantity < p.low_stock_threshold) ||
        [],
      error: null,
    };
  }

  return { data, error: null };
}
