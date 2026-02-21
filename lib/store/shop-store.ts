import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Shop, UserRole } from "@/types/database.types";

interface ShopState {
  currentShop: Shop | null;
  userRole: UserRole | null;
  setCurrentShop: (shop: Shop | null) => void;
  setUserRole: (role: UserRole | null) => void;
  clearShop: () => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      currentShop: null,
      userRole: null,
      setCurrentShop: (shop) => set({ currentShop: shop }),
      setUserRole: (role) => set({ userRole: role }),
      clearShop: () => set({ currentShop: null, userRole: null }),
    }),
    {
      name: "shop-storage",
    },
  ),
);
