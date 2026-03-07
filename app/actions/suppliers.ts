"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Supplier, CreateSupplierInput } from "@/types/database.types";

export async function getSuppliers(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching suppliers:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getSupplierById(supplierId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createSupplier(
  shopId: string,
  supplierData: CreateSupplierInput
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      ...supplierData,
      shop_id: shopId,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  return { data, error: null };
}

export async function updateSupplier(
  supplierId: string,
  supplierData: Partial<CreateSupplierInput>
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .update(supplierData)
    .eq("id", supplierId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  return { data, error: null };
}

export async function deleteSupplier(supplierId: string) {
  const supabase = await createClient();

  // Soft delete
  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: false })
    .eq("id", supplierId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/suppliers");
  return { error: null };
}

export async function searchSuppliers(shopId: string, query: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .or(`name.ilike.%${query}%,company_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("name")
    .limit(10);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
