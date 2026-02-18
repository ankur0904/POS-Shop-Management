"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateShopSettings(formData: {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  currency?: string;
}) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's shop (where they are owner or have role)
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("shop_id, role")
      .eq("user_id", user.id)
      .single();

    const { data: ownedShop } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    const shopId = ownedShop?.id || userRole?.shop_id;

    if (!shopId) {
      return { success: false, error: "No shop found" };
    }

    // Only owners and admins can update shop settings
    const isOwner = ownedShop?.id === shopId;
    const isAdmin = userRole?.role === "admin";

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Permission denied" };
    }

    // Update shop
    const { data: updatedShop, error: updateError } = await supabase
      .from("shops")
      .update({
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        tax_id: formData.tax_id,
        currency: formData.currency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shopId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");
    revalidatePath("/pos");
    revalidatePath("/sales");
    return { success: true, data: updatedShop };
  } catch (error) {
    console.error("Error updating shop settings:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateUserPassword(
  currentPassword: string,
  newPassword: string,
) {
  try {
    const supabase = await createClient();

    // Verify current user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating password:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateUserEmail(newEmail: string) {
  try {
    const supabase = await createClient();

    // Verify current user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Update email
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "Verification email sent to new address" };
  } catch (error) {
    console.error("Error updating email:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getShopSettings() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized", data: null };
    }

    // Get user's shop
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("shop_id, role")
      .eq("user_id", user.id)
      .single();

    const { data: ownedShop } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (ownedShop) {
      return { success: true, data: ownedShop };
    }

    if (userRole?.shop_id) {
      const { data: shop } = await supabase
        .from("shops")
        .select("*")
        .eq("id", userRole.shop_id)
        .single();

      return { success: true, data: shop };
    }

    return { success: false, error: "No shop found", data: null };
  } catch (error) {
    console.error("Error fetching shop settings:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: null,
    };
  }
}
