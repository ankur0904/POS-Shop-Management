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

// =====================================================
// ADVANCED REPORTING - Profit & Loss
// =====================================================

export async function getProfitLossReport(
  shopId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();

  // Get all sales with items and product costs
  const { data: sales, error } = await supabase
    .from("sales")
    .select(`
      id,
      subtotal,
      tax_amount,
      cgst_amount,
      sgst_amount,
      discount_amount,
      total_amount,
      created_at,
      sale_items (
        quantity,
        unit_price,
        subtotal,
        product:products (
          cost_price
        )
      )
    `)
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) {
    return { data: null, error: error.message };
  }

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  sales?.forEach((sale: any) => {
    totalRevenue += Number(sale.total_amount);
    totalTax += Number(sale.tax_amount || 0);
    totalDiscount += Number(sale.discount_amount || 0);

    sale.sale_items?.forEach((item: any) => {
      const costPrice = item.product?.cost_price || 0;
      const itemCost = costPrice * item.quantity;
      totalCost += itemCost;
    });
  });

  totalProfit = totalRevenue - totalCost - totalTax;

  return {
    data: {
      totalRevenue,
      totalCost,
      totalProfit,
      totalTax,
      totalDiscount,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      salesCount: sales?.length || 0,
    },
    error: null,
  };
}

// =====================================================
// GST Report
// =====================================================

export async function getGSTReport(
  shopId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();

  const { data: sales, error } = await supabase
    .from("sales")
    .select("subtotal, cgst_amount, sgst_amount, cgst_percentage, sgst_percentage, total_amount")
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) {
    return { data: null, error: error.message };
  }

  // Group by GST rate
  const gstBreakdown: any = {};

  sales?.forEach((sale: any) => {
    const gstRate = Number(sale.cgst_percentage || 0) + Number(sale.sgst_percentage || 0);
    const key = gstRate.toString();

    if (!gstBreakdown[key]) {
      gstBreakdown[key] = {
        gstRate,
        cgstRate: Number(sale.cgst_percentage || 0),
        sgstRate: Number(sale.sgst_percentage || 0),
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalGST: 0,
        salesCount: 0,
      };
    }

    gstBreakdown[key].taxableAmount += Number(sale.subtotal || 0);
    gstBreakdown[key].cgstAmount += Number(sale.cgst_amount || 0);
    gstBreakdown[key].sgstAmount += Number(sale.sgst_amount || 0);
    gstBreakdown[key].totalGST += Number(sale.cgst_amount || 0) + Number(sale.sgst_amount || 0);
    gstBreakdown[key].salesCount += 1;
  });

  const breakdown = Object.values(gstBreakdown);
  const totalCGST = breakdown.reduce((sum: number, item: any) => sum + item.cgstAmount, 0);
  const totalSGST = breakdown.reduce((sum: number, item: any) => sum + item.sgstAmount, 0);
  const totalGST = totalCGST + totalSGST;

  return {
    data: {
      breakdown,
      totalCGST,
      totalSGST,
      totalGST,
      totalSales: sales?.length || 0,
    },
    error: null,
  };
}

// =====================================================
// Payment Method Breakdown
// =====================================================

export async function getPaymentMethodReport(shopId: string, days = 30) {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("sales")
    .select("payment_method, total_amount")
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", startDate.toISOString());

  if (error) {
    return { data: null, error: error.message };
  }

  const breakdown: any = {};

  data?.forEach((sale: any) => {
    const method = sale.payment_method;
    if (!breakdown[method]) {
      breakdown[method] = {
        method,
        amount: 0,
        count: 0,
      };
    }
    breakdown[method].amount += Number(sale.total_amount);
    breakdown[method].count += 1;
  });

  return { data: Object.values(breakdown), error: null };
}

// =====================================================
// Inventory Value Report
// =====================================================

export async function getInventoryValueReport(shopId: string) {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("name, sku, stock_quantity, cost_price, price")
    .eq("shop_id", shopId)
    .eq("is_active", true);

  if (error) {
    return { data: null, error: error.message };
  }

  let totalInventoryValue = 0;
  let totalRetailValue = 0;
  let totalProducts = 0;
  let outOfStockCount = 0;

  products?.forEach((product: any) => {
    const costPrice = Number(product.cost_price || 0);
    const price = Number(product.price || 0);
    const quantity = Number(product.stock_quantity || 0);

    totalInventoryValue += costPrice * quantity;
    totalRetailValue += price * quantity;
    totalProducts += 1;

    if (quantity === 0) {
      outOfStockCount += 1;
    }
  });

  const potentialProfit = totalRetailValue - totalInventoryValue;

  return {
    data: {
      totalInventoryValue,
      totalRetailValue,
      potentialProfit,
      totalProducts,
      outOfStockCount,
    },
    error: null,
  };
}

// =====================================================
// Cashier Performance Report
// =====================================================

export async function getCashierPerformanceReport(
  shopId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();

  const { data: sales, error } = await supabase
    .from("sales")
    .select(`
      cashier_id,
      total_amount,
      created_at
    `)
    .eq("shop_id", shopId)
    .eq("status", "completed")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) {
    return { data: null, error: error.message };
  }

  // Get user details
  const cashierIds = [...new Set(sales?.map((s: any) => s.cashier_id))];
  const { data: users } = await supabase.auth.admin.listUsers();

  const cashierMap: any = {};

  sales?.forEach((sale: any) => {
    const cashierId = sale.cashier_id;
    if (!cashierMap[cashierId]) {
      const user = users?.users.find((u) => u.id === cashierId);
      cashierMap[cashierId] = {
        cashierId,
        cashierName: user?.user_metadata?.full_name || user?.email || "Unknown",
        totalSales: 0,
        totalRevenue: 0,
        averageSaleValue: 0,
      };
    }
    cashierMap[cashierId].totalSales += 1;
    cashierMap[cashierId].totalRevenue += Number(sale.total_amount);
  });

  const performance = Object.values(cashierMap).map((c: any) => ({
    ...c,
    averageSaleValue: c.totalRevenue / c.totalSales,
  }));

  return { data: performance, error: null };
}

