'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentShop } from '@/hooks/use-auth'
import { getDashboardStats, getRecentSales, getSalesChartData } from '@/app/actions/analytics'
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { getCurrencySymbol } from '@/lib/utils'
import { DashboardSkeleton } from '@/components/loading-skeletons'

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

export default function DashboardPage() {
  const { shop } = useCurrentShop()
  const [stats, setStats] = useState<any>(null)
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (shop) {
      loadData()
    }
  }, [shop])

  const loadData = async () => {
    if (!shop) return

    setLoading(true)
    try {
      const [statsData, salesData, chartDataResult] = await Promise.all([
        getDashboardStats(shop.id),
        getRecentSales(shop.id, 5),
        getSalesChartData(shop.id, 7),
      ])

      setStats(statsData)
      setRecentSales(salesData.data || [])
      setChartData(chartDataResult.data || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !shop) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your business overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Today's Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {getCurrencySymbol(shop.currency)} {stats?.todayRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.todaySalesCount || 0} sales today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                This Week
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {getCurrencySymbol(shop.currency)} {stats?.weekRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.weekSalesCount || 0} sales this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats?.totalProducts || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Active products</p>
            </CardContent>
          </Card>

          <Card className={stats?.lowStockCount > 0 ? 'border-orange-200 bg-orange-50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Low Stock Alert
              </CardTitle>
              <AlertTriangle
                className={`h-4 w-4 ${stats?.lowStockCount > 0 ? 'text-orange-500' : 'text-gray-400'}`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats?.lowStockCount || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Products running low</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Sales Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip currencySymbol={getCurrencySymbol(shop.currency)} />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
                {recentSales.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No recent sales</p>
                ) : (
                  recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between pb-3 sm:pb-4 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{sale.invoice_number}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {sale.customer_name || 'Walk-in Customer'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">
                          {getCurrencySymbol(shop.currency)} {Number(sale.total_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
