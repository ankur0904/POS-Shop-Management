"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TaxRate, CreateTaxRateInput } from "@/types/database.types";

export async function getTaxRates(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tax_rates")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("rate", { ascending: false });

  if (error) {
    console.error("Error fetching tax rates:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getDefaultTaxRate(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tax_rates")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .eq("is_default", true)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    console.error("Error fetching default tax rate:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createTaxRate(
  shopId: string,
  taxRateData: CreateTaxRateInput
) {
  const supabase = await createClient();

  // Calculate CGST and SGST from total rate
  const totalRate = taxRateData.rate;
  const cgstPercentage = totalRate / 2;
  const sgstPercentage = totalRate / 2;

  const { data, error } = await supabase
    .from("tax_rates")
    .insert({
      shop_id: shopId,
      name: taxRateData.name,
      rate: totalRate,
      cgst_percentage: cgstPercentage,
      sgst_percentage: sgstPercentage,
      description: taxRateData.description,
      is_default: taxRateData.is_default || false,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/pos");
  return { data, error: null };
}

export async function updateTaxRate(
  taxRateId: string,
  taxRateData: Partial<CreateTaxRateInput>
) {
  const supabase = await createClient();

  const updateData: any = {};

  if (taxRateData.name) updateData.name = taxRateData.name;
  if (taxRateData.description !== undefined)
    updateData.description = taxRateData.description;
  if (taxRateData.is_default !== undefined)
    updateData.is_default = taxRateData.is_default;

  if (taxRateData.rate !== undefined) {
    updateData.rate = taxRateData.rate;
    updateData.cgst_percentage = taxRateData.rate / 2;
    updateData.sgst_percentage = taxRateData.rate / 2;
  }

  const { data, error } = await supabase
    .from("tax_rates")
    .update(updateData)
    .eq("id", taxRateId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/pos");
  return { data, error: null };
}

export async function deleteTaxRate(taxRateId: string) {
  const supabase = await createClient();

  // Soft delete
  const { error } = await supabase
    .from("tax_rates")
    .update({ is_active: false })
    .eq("id", taxRateId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/pos");
  return { error: null };
}

export async function setDefaultTaxRate(taxRateId: string, shopId: string) {
  const supabase = await createClient();

  // First, remove default from all other tax rates
  await supabase
    .from("tax_rates")
    .update({ is_default: false })
    .eq("shop_id", shopId);

  // Then set the new default
  const { data, error } = await supabase
    .from("tax_rates")
    .update({ is_default: true })
    .eq("id", taxRateId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/pos");
  return { data, error: null };
}

// Helper function to initialize default Indian GST rates for a new shop
export async function initializeDefaultGSTRates(shopId: string) {
  const supabase = await createClient();

  const defaultRates = [
    { name: "GST 0%", rate: 0, description: "Tax Exempt" },
    { name: "GST 5%", rate: 5, description: "Common for essential goods" },
    { name: "GST 12%", rate: 12, description: "Standard rate for many items" },
    { name: "GST 18%", rate: 18, description: "Most common GST rate", is_default: true },
    { name: "GST 28%", rate: 28, description: "Luxury and sin goods" },
  ];

  const taxRates = defaultRates.map((rate) => ({
    shop_id: shopId,
    name: rate.name,
    rate: rate.rate,
    cgst_percentage: rate.rate / 2,
    sgst_percentage: rate.rate / 2,
    description: rate.description,
    is_default: rate.is_default || false,
  }));

  const { error } = await supabase.from("tax_rates").insert(taxRates);

  if (error) {
    console.error("Error initializing default GST rates:", error);
    return { error: error.message };
  }

  return { error: null };
}
