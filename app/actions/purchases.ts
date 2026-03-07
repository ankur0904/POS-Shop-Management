"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Purchase, CreatePurchaseInput, PurchaseStatus } from "@/types/database.types";

export async function getPurchases(shopId: string, limit = 100) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select("*, purchase_items(*), supplier:suppliers(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching purchases:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getPurchaseById(purchaseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select("*, purchase_items(*, product:products(*)), supplier:suppliers(*)")
    .eq("id", purchaseId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createPurchase(
  shopId: string,
  purchaseData: CreatePurchaseInput
) {
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
    const subtotal = purchaseData.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );

    const cgstAmount = (subtotal * purchaseData.cgst_percentage) / 100;
    const sgstAmount = (subtotal * purchaseData.sgst_percentage) / 100;
    const taxAmount = cgstAmount + sgstAmount;
    const shippingCost = purchaseData.shipping_cost || 0;
    const otherCharges = purchaseData.other_charges || 0;
    const totalAmount = subtotal + taxAmount + shippingCost + otherCharges;

    // Generate purchase order number
    const { data: poNumberData } = await supabase.rpc(
      "generate_purchase_order_number",
      { p_shop_id: shopId }
    );

    const purchaseOrderNumber = poNumberData || `PO-${Date.now()}`;

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        shop_id: shopId,
        supplier_id: purchaseData.supplier_id,
        purchase_order_number: purchaseOrderNumber,
        order_date: purchaseData.order_date,
        expected_delivery_date: purchaseData.expected_delivery_date,
        subtotal,
        cgst_percentage: purchaseData.cgst_percentage,
        sgst_percentage: purchaseData.sgst_percentage,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        other_charges: otherCharges,
        total_amount: totalAmount,
        status: "draft",
        notes: purchaseData.notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (purchaseError) {
      return { data: null, error: purchaseError.message };
    }

    // Get product details for purchase items
    const purchaseItems = await Promise.all(
      purchaseData.items.map(async (item) => {
        const { data: product } = await supabase
          .from("products")
          .select("name, sku")
          .eq("id", item.product_id)
          .single();

        return {
          shop_id: shopId,
          purchase_id: purchase.id,
          product_id: item.product_id,
          product_name: product?.name || "Unknown",
          product_sku: product?.sku || "",
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.quantity * item.unit_cost,
        };
      })
    );

    // Create purchase items
    const { error: itemsError } = await supabase
      .from("purchase_items")
      .insert(purchaseItems);

    if (itemsError) {
      // Rollback: delete the purchase
      await supabase.from("purchases").delete().eq("id", purchase.id);
      return { data: null, error: itemsError.message };
    }

    revalidatePath("/purchases");
    revalidatePath("/inventory");

    return { data: purchase, error: null };
  } catch (error: any) {
    console.error("Error creating purchase:", error);
    return { data: null, error: error.message || "Failed to create purchase" };
  }
}

export async function updatePurchaseStatus(
  purchaseId: string,
  status: PurchaseStatus
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "User not authenticated" };
  }

  const updateData: any = { status };

  // If marking as received, set received_by and received_date
  if (status === "received") {
    updateData.received_by = user.id;
    updateData.received_date = new Date().toISOString().split("T")[0];
  }

  const { data, error } = await supabase
    .from("purchases")
    .update(updateData)
    .eq("id", purchaseId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return { data, error: null };
}

export async function updatePurchase(
  purchaseId: string,
  purchaseData: Partial<CreatePurchaseInput>
) {
  const supabase = await createClient();

  // Only allow updating draft purchases
  const { data: existingPurchase } = await supabase
    .from("purchases")
    .select("status")
    .eq("id", purchaseId)
    .single();

  if (existingPurchase?.status !== "draft") {
    return {
      data: null,
      error: "Only draft purchases can be updated",
    };
  }

  const { data, error } = await supabase
    .from("purchases")
    .update(purchaseData)
    .eq("id", purchaseId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/purchases");
  return { data, error: null };
}

export async function deletePurchase(purchaseId: string) {
  const supabase = await createClient();

  // Only allow deleting draft purchases
  const { data: existingPurchase } = await supabase
    .from("purchases")
    .select("status")
    .eq("id", purchaseId)
    .single();

  if (existingPurchase?.status !== "draft") {
    return {
      error: "Only draft purchases can be deleted",
    };
  }

  const { error } = await supabase
    .from("purchases")
    .update({ status: "cancelled" })
    .eq("id", purchaseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/purchases");
  return { error: null };
}

export async function getPurchasesByDateRange(
  shopId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select("*, purchase_items(*), supplier:suppliers(*)")
    .eq("shop_id", shopId)
    .gte("order_date", startDate)
    .lte("order_date", endDate)
    .order("order_date", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getPurchaseStats(shopId: string) {
  const supabase = await createClient();

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // This month's purchases
  const { data: monthPurchases } = await supabase
    .from("purchases")
    .select("total_amount")
    .eq("shop_id", shopId)
    .gte("order_date", firstDayOfMonth.toISOString().split("T")[0])
    .lte("order_date", lastDayOfMonth.toISOString().split("T")[0]);

  // Pending orders (draft + ordered)
  const { count: pendingCount } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .in("status", ["draft", "ordered"]);

  return {
    monthTotal:
      monthPurchases?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
    pendingOrders: pendingCount || 0,
  };
}
