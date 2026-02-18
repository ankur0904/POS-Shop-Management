'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentShop } from '@/hooks/use-auth'
import { getDashboardStats, getTopSellingProducts, getSalesChartData } from '@/app/actions/analytics'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Package, DollarSign, ShoppingCart } from 'lucide-react'
import { getCurrencySymbol } from '@/lib/utils'
import { AnalyticsSkeleton } from '@/components/loading-skeletons'

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  currencySymbol: string
}

const CustomTooltip = ({ active, payload, label, currencySymbol }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {currencySymbol} {Number(entry.value).toFixed(2)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AnalyticsPage() {
  const { shop } = useCurrentShop()
  const [stats, setStats] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (shop) {
      loadAnalytics()
    }
  }, [shop])

  const loadAnalytics = async () => {
    if (!shop) return

    setLoading(true)
    try {
      const [statsData, productsData, salesChart] = await Promise.all([
        getDashboardStats(shop.id),
        getTopSellingProducts(shop.id, 10),
        getSalesChartData(shop.id, 14),
      ])

      setStats(statsData)
      setTopProducts(productsData.data || [])
      setChartData(salesChart.data || [])
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !shop) {
    return (
      <DashboardLayout>
        <AnalyticsSkeleton />
      </DashboardLayout>
    )
  }

  const topProductsForPie = topProducts.slice(0, 6).map((p) => ({
    name: p.productName,
    value: p.totalQuantity,
  }))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-500 mt-1">Business insights and performance metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getCurrencySymbol(shop.currency)} {stats?.monthRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">{stats?.monthSalesCount || 0} sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
              <ShoppingCart className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getCurrencySymbol(shop.currency)} {stats?.weekRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">{stats?.weekSalesCount || 0} sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getCurrencySymbol(shop.currency)} {stats?.todayRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">{stats?.todaySalesCount || 0} sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg. Sale</CardTitle>
              <Package className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getCurrencySymbol(shop.currency)}{' '}
                {stats?.monthSalesCount
                  ? (stats.monthRevenue / stats.monthSalesCount).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip currencySymbol={getCurrencySymbol(shop.currency)} />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="# of Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products by Quantity */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topProductsForPie}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {topProductsForPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Selling Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No sales data available</p>
              ) : (
                topProducts.map((product, index) => (
                  <div key={product.productId} className="flex items-center gap-4 pb-4 border-b last:border-0">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.productName}</p>
                      <p className="text-sm text-gray-500">{product.productSku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{product.totalQuantity} units</p>
                      <p className="text-sm text-gray-500">
                        {getCurrencySymbol(shop.currency)} {product.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Product (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProducts.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="productName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                  <Tooltip content={<CustomTooltip currencySymbol={getCurrencySymbol(shop.currency)} />} />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#3b82f6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
