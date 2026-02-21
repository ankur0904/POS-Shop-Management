"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardStats(shopId: string) {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Today's sales
  const { data: todaySales } = await supabase
    .from("sales")
    .select("total_amount")
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString());

  // Week's sales
  const { data: weekSales } = await supabase
    .from("sales")
    .select("total_amount")
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", weekAgo.toISOString());

  // Month's sales
  const { data: monthSales } = await supabase
    .from("sales")
    .select("total_amount")
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", monthAgo.toISOString());

  // Total products
  const { count: totalProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("is_active", true);

  // Low stock products
  const { data: allProducts } = await supabase
    .from("products")
    .select("stock_quantity, low_stock_threshold")
    .eq("shop_id", shopId)
    .eq("is_active", true);

  const lowStockCount =
    allProducts?.filter((p) => p.stock_quantity < p.low_stock_threshold)
      .length || 0;

  return {
    todayRevenue:
      todaySales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
    todaySalesCount: todaySales?.length || 0,
    weekRevenue:
      weekSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
    weekSalesCount: weekSales?.length || 0,
    monthRevenue:
      monthSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
    monthSalesCount: monthSales?.length || 0,
    totalProducts: totalProducts || 0,
    lowStockCount,
  };
}

export async function getTopSellingProducts(shopId: string, limit = 10) {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("sale_items")
    .select(
      "product_id, product_name, product_sku, quantity, subtotal, product:products(image_url)",
    )
    .eq("shop_id", shopId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error) {
    return { data: null, error: error.message };
  }

  // Aggregate by product
  const productMap = new Map();

  data.forEach((item) => {
    const existing = productMap.get(item.product_id);
    if (existing) {
      existing.totalQuantity += item.quantity;
      existing.totalRevenue += Number(item.subtotal);
    } else {
      productMap.set(item.product_id, {
        productId: item.product_id,
        productName: item.product_name,
        productSku: item.product_sku,
        imageUrl: item.product?.[0]?.image_url,
        totalQuantity: item.quantity,
        totalRevenue: Number(item.subtotal),
      });
    }
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);

  return { data: topProducts, error: null };
}

export async function getSalesChartData(shopId: string, days = 7) {
  const supabase = await createClient();

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("sales")
    .select("total_amount, created_at")
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at");

  if (error) {
    return { data: null, error: error.message };
  }

  // Group by date
  const dateMap = new Map();

  // Initialize all dates with 0
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split("T")[0];
    dateMap.set(dateKey, { date: dateKey, revenue: 0, sales: 0 });
  }

  // Fill in actual data
  data.forEach((sale) => {
    const dateKey = sale.created_at.split("T")[0];
    const existing = dateMap.get(dateKey);
    if (existing) {
      existing.revenue += Number(sale.total_amount);
      existing.sales += 1;
    }
  });

  const chartData = Array.from(dateMap.values()).map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return { data: chartData, error: null };
}

export async function getRecentSales(shopId: string, limit = 5) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("id, invoice_number, total_amount, customer_name, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
