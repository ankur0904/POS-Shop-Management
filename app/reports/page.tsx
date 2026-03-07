'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { useCurrentShop } from '@/hooks/use-auth'
import {
  getProfitLossReport,
  getGSTReport,
  getPaymentMethodReport,
  getInventoryValueReport,
  getCashierPerformanceReport,
} from '@/app/actions/analytics'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  CreditCard,
  Package,
  Users,
  Download,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ReportsPage() {
  const { shop, loading: authLoading } = useCurrentShop()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profit-loss')

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // Report data state
  const [profitLossData, setProfitLossData] = useState<any>(null)
  const [gstData, setGstData] = useState<any>(null)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [inventoryData, setInventoryData] = useState<any>(null)
  const [cashierData, setCashierData] = useState<any>(null)

  useEffect(() => {
    if (shop?.id) {
      loadReports()
    }
  }, [shop, startDate, endDate])

  const loadReports = async () => {
    if (!shop?.id) return
    setLoading(true)

    try {
      const [profitLoss, gst, payment, inventory, cashier] = await Promise.all([
        getProfitLossReport(shop.id, startDate, endDate),
        getGSTReport(shop.id, startDate, endDate),
        getPaymentMethodReport(shop.id, 30),
        getInventoryValueReport(shop.id),
        getCashierPerformanceReport(shop.id, startDate, endDate),
      ])

      if (profitLoss.data) setProfitLossData(profitLoss.data)
      if (gst.data) setGstData(gst.data)
      if (payment.data) setPaymentData(payment.data)
      if (inventory.data) setInventoryData(inventory.data)
      if (cashier.data) setCashierData(cashier.data)
    } catch (error: any) {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((row) => Object.values(row).join(','))
    const csv = [headers, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Report exported successfully')
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!shop) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">No shop found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Advanced Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive business analytics and insights</p>
        </div>

        {/* Date Range Picker */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={loadReports} disabled={loading} className="w-full md:w-auto">
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Refresh Reports'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2">
            <TabsTrigger value="profit-loss" className="text-xs md:text-sm">
              Profit & Loss
            </TabsTrigger>
            <TabsTrigger value="gst" className="text-xs md:text-sm">
              GST Report
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-xs md:text-sm">
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs md:text-sm">
              Inventory Value
            </TabsTrigger>
            <TabsTrigger value="cashier" className="text-xs md:text-sm">
              Cashier Performance
            </TabsTrigger>
          </TabsList>

          {/* Profit & Loss Tab */}
          <TabsContent value="profit-loss" className="space-y-4">
            {profitLossData && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(profitLossData.totalRevenue)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Cost</p>
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(profitLossData.totalCost)}
                          </p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Gross Profit</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(profitLossData.totalProfit)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Profit Margin</p>
                          <p className="text-2xl font-bold">
                            {formatPercentage(profitLossData.profitMargin)}
                          </p>
                        </div>
                        <Receipt className="h-8 w-8 text-gray-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profit & Loss Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-gray-600">Total Sales Count:</span>
                        <span className="font-medium">{profitLossData.salesCount}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-gray-600">Total Revenue:</span>
                        <span className="font-medium">{formatCurrency(profitLossData.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(profitLossData.totalCost)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-gray-600">Total Tax:</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(profitLossData.totalTax)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-gray-600">Total Discounts Given:</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(profitLossData.totalDiscount)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold pt-2">
                        <span>Net Profit:</span>
                        <span
                          className={profitLossData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}
                        >
                          {formatCurrency(profitLossData.totalProfit)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* GST Report Tab */}
          <TabsContent value="gst" className="space-y-4">
            {gstData && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div>
                        <p className="text-sm text-gray-600">Total CGST Collected</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(gstData.totalCGST)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div>
                        <p className="text-sm text-gray-600">Total SGST Collected</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(gstData.totalSGST)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div>
                        <p className="text-sm text-gray-600">Total GST</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(gstData.totalGST)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* GST Breakdown Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>GST Breakdown by Rate</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(gstData.breakdown, 'gst_report')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {gstData.breakdown.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No GST data for selected period
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>GST Rate</TableHead>
                              <TableHead>Sales Count</TableHead>
                              <TableHead className="text-right">Taxable Amount</TableHead>
                              <TableHead className="text-right">CGST</TableHead>
                              <TableHead className="text-right">SGST</TableHead>
                              <TableHead className="text-right">Total GST</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gstData.breakdown.map((item: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {item.gstRate}% (CGST {item.cgstRate}% + SGST {item.sgstRate}%)
                                </TableCell>
                                <TableCell>{item.salesCount}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.taxableAmount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.cgstAmount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.sgstAmount)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(item.totalGST)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment" className="space-y-4">
            {paymentData && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Payment Method Distribution</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(paymentData, 'payment_methods')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {paymentData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No payment data for selected period
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Payment Method</TableHead>
                              <TableHead>Transaction Count</TableHead>
                              <TableHead className="text-right">Total Amount</TableHead>
                              <TableHead className="text-right">Percentage</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentData.map((item: any) => {
                              const totalAmount = paymentData.reduce(
                                (sum: number, p: any) => sum + p.amount,
                                0
                              )
                              const percentage = (item.amount / totalAmount) * 100

                              return (
                                <TableRow key={item.method}>
                                  <TableCell className="font-medium capitalize">
                                    {item.method}
                                  </TableCell>
                                  <TableCell>{item.count}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.amount)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatPercentage(percentage)}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Visual Breakdown */}
                      <div className="mt-6 space-y-3">
                        {paymentData.map((item: any) => {
                          const totalAmount = paymentData.reduce(
                            (sum: number, p: any) => sum + p.amount,
                            0
                          )
                          const percentage = (item.amount / totalAmount) * 100

                          return (
                            <div key={item.method} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize font-medium">{item.method}</span>
                                <span className="text-gray-600">{formatPercentage(percentage)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-blue-600 h-2.5 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Inventory Value Tab */}
          <TabsContent value="inventory" className="space-y-4">
            {inventoryData && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Inventory Value</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(inventoryData.totalInventoryValue)}
                          </p>
                        </div>
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Retail Value</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(inventoryData.totalRetailValue)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Potential Profit</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(inventoryData.potentialProfit)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Out of Stock</p>
                          <p className="text-2xl font-bold text-red-600">
                            {inventoryData.outOfStockCount}
                          </p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-gray-600">Total Products:</span>
                        <span className="font-medium">{inventoryData.totalProducts}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-gray-600">Inventory Value (Cost):</span>
                        <span className="font-medium">
                          {formatCurrency(inventoryData.totalInventoryValue)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-gray-600">Retail Value (if all sold):</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(inventoryData.totalRetailValue)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Potential Profit:</span>
                        <span className="text-green-600">
                          {formatCurrency(inventoryData.potentialProfit)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Cashier Performance Tab */}
          <TabsContent value="cashier" className="space-y-4">
            {cashierData && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Cashier Performance</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(cashierData, 'cashier_performance')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {cashierData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No cashier data for selected period
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cashier Name</TableHead>
                            <TableHead>Sales Count</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                            <TableHead className="text-right">Average Sale Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cashierData
                            .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
                            .map((cashier: any) => (
                              <TableRow key={cashier.cashierId}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    {cashier.cashierName}
                                  </div>
                                </TableCell>
                                <TableCell>{cashier.totalSales}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(cashier.totalRevenue)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(cashier.averageSaleValue)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
