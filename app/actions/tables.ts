"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RestaurantTable, TableStatus } from "@/types/database.types";

export async function getRestaurantTables(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("table_number");

  if (error) {
    console.error("Error fetching tables:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getTableById(tableId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*, current_sale:sales(*)")
    .eq("id", tableId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createRestaurantTable(
  shopId: string,
  tableData: {
    table_number: string;
    table_name?: string;
    capacity?: number;
    floor_section?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({
      ...tableData,
      shop_id: shopId,
      status: "available",
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/tables");
  revalidatePath("/pos");
  return { data, error: null };
}

export async function updateRestaurantTable(
  tableId: string,
  tableData: Partial<{
    table_number: string;
    table_name: string;
    capacity: number;
    floor_section: string;
    notes: string;
  }>
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .update(tableData)
    .eq("id", tableId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/tables");
  revalidatePath("/pos");
  return { data, error: null };
}

export async function updateTableStatus(
  tableId: string,
  status: TableStatus
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .update({ status })
    .eq("id", tableId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/tables");
  revalidatePath("/pos");
  return { data, error: null };
}

export async function deleteRestaurantTable(tableId: string) {
  const supabase = await createClient();

  // Soft delete
  const { error } = await supabase
    .from("restaurant_tables")
    .update({ is_active: false })
    .eq("id", tableId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tables");
  return { error: null };
}

export async function getAvailableTables(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .eq("status", "available")
    .order("table_number");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function assignSaleToTable(saleId: string, tableId: string) {
  const supabase = await createClient();

  // Update sale with table_id
  const { error: saleError } = await supabase
    .from("sales")
    .update({ table_id: tableId })
    .eq("id", saleId);

  if (saleError) {
    return { error: saleError.message };
  }

  // Update table status
  const { error: tableError } = await supabase
    .from("restaurant_tables")
    .update({
      status: "occupied",
      current_sale_id: saleId,
    })
    .eq("id", tableId);

  if (tableError) {
    return { error: tableError.message };
  }

  revalidatePath("/tables");
  revalidatePath("/pos");
  return { error: null };
}

export async function freeTable(tableId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("restaurant_tables")
    .update({
      status: "available",
      current_sale_id: null,
    })
    .eq("id", tableId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tables");
  revalidatePath("/pos");
  return { error: null };
}
