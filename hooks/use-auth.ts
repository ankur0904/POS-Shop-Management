"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Shop, UserRole } from "@/types/database.types";
import { useShopStore } from "@/lib/store/shop-store";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { user, loading };
}

export function useCurrentShop() {
  const { currentShop, userRole, setCurrentShop, setUserRole } = useShopStore();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch user's shops if not already loaded
    if (!currentShop) {
      fetchUserShops();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserShops = async () => {
    try {
      setLoading(true);

      console.log("Fetching shops for user:", user!.id);

      // First check if user owns any shops
      const { data: ownedShops, error: shopsError } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (shopsError) {
        console.error("Error fetching shops:", shopsError);
      }

      if (ownedShops && ownedShops.length > 0) {
        console.log("Found owned shop:", ownedShops[0]);
        setCurrentShop(ownedShops[0]);
        setUserRole("admin");
        setLoading(false);
        return;
      }

      // Otherwise check if user has role in any shop
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*, shops(*)")
        .eq("user_id", user!.id)
        .limit(1);

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
      }

      if (userRoles && userRoles.length > 0) {
        console.log("Found user role:", userRoles[0]);
        setCurrentShop(userRoles[0].shops as Shop);
        setUserRole(userRoles[0].role as UserRole);
      } else {
        console.log("No shops or roles found for user");
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching shops:", error);
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      setLoading(true);

      // Check if owner
      if (currentShop!.owner_id === user!.id) {
        setUserRole("admin");
        setLoading(false);
        return;
      }

      // Otherwise fetch role
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("shop_id", currentShop!.id)
        .eq("user_id", user!.id)
        .single();

      if (data) {
        setUserRole(data.role as UserRole);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setLoading(false);
    }
  };

  const refreshShopData = async () => {
    if (!user || !currentShop) return;

    try {
      setLoading(true);

      // Fetch the latest shop data
      const { data: shop, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", currentShop.id)
        .single();

      if (error) {
        console.error("Error refreshing shop:", error);
      } else if (shop) {
        setCurrentShop(shop);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error refreshing shop:", error);
      setLoading(false);
    }
  };

  return {
    shop: currentShop,
    role: userRole,
    loading,
    refreshShop: fetchUserShops,
    refreshShopData,
  };
}
